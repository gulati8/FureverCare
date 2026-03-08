import { logCreate } from './audit-logger.js';
import {
  classifyAndExtractDocument,
  mapExtractionToHealthRecord,
  generateExtractedItemsSummary,
  ClassifyAndExtractResult,
} from './document-classifier.js';
import {
  getDocumentUploadById,
  updateDocumentUploadStatus,
  updateDocumentClassification,
  DocumentUpload,
} from '../models/document-upload.js';
import {
  createDocumentExtractionWithItems,
  getDocumentExtractionWithItems,
  updateDocumentExtractionItemStatus,
  updateDocumentExtractionStatus,
  DocumentExtraction,
  DocumentExtractionItem,
  RecordType,
} from '../models/document-extraction.js';
import {
  createPetVaccination,
  createPetMedication,
  updatePetMedication,
  findPetMedicationByName,
  createPetCondition,
  updatePetCondition,
  findDuplicateConditions,
  createPetAllergy,
  createPetVet,
  updatePetVet,
  findDuplicateVets,
  createPetEmergencyContact,
} from '../models/health-records.js';
import { config } from '../config/index.js';

export interface ProcessingResult {
  upload: DocumentUpload;
  extraction?: DocumentExtraction;
  items?: DocumentExtractionItem[];
  classification?: {
    detectedType: string;
    confidence: number;
    explanation: string;
  };
  summary?: string;
  error?: string;
}

export async function processDocumentUpload(uploadId: number): Promise<ProcessingResult> {
  const upload = await getDocumentUploadById(uploadId);
  if (!upload) {
    throw new Error('Document upload not found');
  }

  if (upload.status === 'processing' || upload.status === 'classifying') {
    throw new Error('Document is already being processed');
  }

  // Mark as classifying
  await updateDocumentUploadStatus(uploadId, 'classifying');

  try {
    // Check if Claude API key is configured
    if (!config.claude.apiKey) {
      throw new Error('Claude API key not configured');
    }

    // Classify and extract data using Claude
    const result = await classifyAndExtractDocument(upload.file_path, upload.media_type);

    // Update classification
    await updateDocumentClassification(
      uploadId,
      result.classification.documentType,
      result.classification.confidence,
      result.classification.explanation
    );

    // Mark as processing (extraction phase)
    await updateDocumentUploadStatus(uploadId, 'processing');

    // Create extraction record with items
    const items = result.extraction.items.map((item) => ({
      recordType: item.recordType,
      extractedData: mapExtractionToHealthRecord(item.recordType, item.data),
      confidenceScore: item.confidence,
    }));

    const { extraction, items: createdItems } = await createDocumentExtractionWithItems(
      {
        documentUploadId: uploadId,
        rawExtraction: {
          classification: result.classification,
          extraction: result.extraction.rawResponse,
        },
        mappedData: { items: result.extraction.items },
        extractionModel: result.extraction.model,
        tokensUsed: result.classification.tokensUsed + result.extraction.tokensUsed,
      },
      items
    );

    // Mark as pending_review — user must review extracted items before completing
    await updateDocumentUploadStatus(uploadId, 'pending_review');

    const summary = generateExtractedItemsSummary(result.extraction.summary.byCategory);

    return {
      upload: (await getDocumentUploadById(uploadId))!,
      extraction,
      items: createdItems,
      classification: {
        detectedType: result.classification.documentType,
        confidence: result.classification.confidence,
        explanation: result.classification.explanation,
      },
      summary,
    };
  } catch (error: any) {
    // Mark as failed
    await updateDocumentUploadStatus(uploadId, 'failed', error.message);
    return {
      upload: (await getDocumentUploadById(uploadId))!,
      error: error.message,
    };
  }
}

export interface ApprovalResult {
  approved: {
    itemId: number;
    recordType: string;
    createdRecordId: number;
    action: 'created' | 'updated';
  }[];
  rejected: number[];
  errors: { itemId: number; error: string }[];
}

export async function approveDocumentExtractionItems(
  documentUploadId: number,
  petId: number,
  itemIds: number[],
  userId: number,
  options?: {
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<ApprovalResult> {
  const result: ApprovalResult = {
    approved: [],
    rejected: [],
    errors: [],
  };

  const extractionData = await getDocumentExtractionWithItems(documentUploadId);
  if (!extractionData) {
    throw new Error('Extraction not found');
  }

  // Filter items to only include requested IDs
  const itemsToApprove = extractionData.items.filter((item) => itemIds.includes(item.id));

  for (const item of itemsToApprove) {
    try {
      // Use modified data if available, otherwise use extracted data
      const dataToSave = item.user_modified_data || item.extracted_data;

      // Create the health record based on type
      let createdRecord: any;
      let recordType: string;
      let action: 'created' | 'updated' = 'created';

      switch (item.record_type) {
        case 'vaccination':
          createdRecord = await createPetVaccination(petId, dataToSave as any);
          recordType = 'pet_vaccinations';
          break;

        case 'medication': {
          // Check for existing medication by name (case-insensitive)
          const match = dataToSave.name
            ? await findPetMedicationByName(petId, dataToSave.name)
            : null;

          if (match) {
            const existingMed = match.medication;
            // Merge: update existing record with new non-null fields
            const updates: Record<string, any> = {};
            const fields = ['dosage', 'frequency', 'start_date', 'start_date_precision', 'end_date', 'end_date_precision', 'prescribing_vet', 'notes', 'is_active', 'show_on_card'] as const;
            for (const field of fields) {
              if (dataToSave[field] !== undefined && dataToSave[field] !== null) {
                updates[field] = dataToSave[field];
              }
            }
            const updated = await updatePetMedication(existingMed.id, petId, updates, {
              userId,
              source: 'document_import' as any,
              ipAddress: options?.ipAddress,
              userAgent: options?.userAgent,
            });
            createdRecord = updated ?? existingMed;
            action = 'updated';
          } else {
            createdRecord = await createPetMedication(petId, dataToSave as any);
          }
          recordType = 'pet_medications';
          break;
        }

        case 'condition': {
          // Auto-dedup: check for existing condition by name
          const matches = dataToSave.name
            ? await findDuplicateConditions(petId, dataToSave.name)
            : [];

          if (matches.length > 0) {
            const existingCondition = matches[0].condition;
            // Merge: update existing record with new non-null fields
            const updates: Record<string, any> = {};
            const fields = ['diagnosed_date', 'diagnosed_date_precision', 'notes', 'severity', 'show_on_card'] as const;
            for (const field of fields) {
              if (dataToSave[field] !== undefined && dataToSave[field] !== null) {
                updates[field] = dataToSave[field];
              }
            }
            const updated = await updatePetCondition(existingCondition.id, petId, updates, {
              userId,
              source: 'document_import' as any,
              ipAddress: options?.ipAddress,
              userAgent: options?.userAgent,
            });
            createdRecord = updated ?? existingCondition;
            action = 'updated';
          } else {
            createdRecord = await createPetCondition(petId, dataToSave as any);
          }
          recordType = 'pet_conditions';
          break;
        }

        case 'allergy':
          createdRecord = await createPetAllergy(petId, dataToSave as any);
          recordType = 'pet_allergies';
          break;

        case 'vet': {
          // Auto-dedup: check for existing vet by clinic_name + vet_name
          const matches = dataToSave.clinic_name
            ? await findDuplicateVets(petId, dataToSave.clinic_name, dataToSave.vet_name)
            : [];

          if (matches.length > 0) {
            const existingVet = matches[0].vet;
            // Merge: update existing record with new non-null fields
            const updates: Record<string, any> = {};
            const fields = ['vet_name', 'phone', 'email', 'address', 'is_primary'] as const;
            for (const field of fields) {
              if (dataToSave[field] !== undefined && dataToSave[field] !== null) {
                updates[field] = dataToSave[field];
              }
            }
            const updated = await updatePetVet(existingVet.id, petId, updates, {
              userId,
              source: 'document_import' as any,
              ipAddress: options?.ipAddress,
              userAgent: options?.userAgent,
            });
            createdRecord = updated ?? existingVet;
            action = 'updated';
          } else {
            createdRecord = await createPetVet(petId, dataToSave as any);
          }
          recordType = 'pet_vets';
          break;
        }

        case 'emergency_contact':
          createdRecord = await createPetEmergencyContact(petId, dataToSave as any);
          recordType = 'pet_emergency_contacts';
          break;

        default:
          throw new Error(`Unknown record type: ${item.record_type}`);
      }

      // Update extraction item status
      await updateDocumentExtractionItemStatus(item.id, 'approved', createdRecord.id, recordType);

      // Log audit entry
      if (action === 'created') {
        await logCreate(recordType, createdRecord.id, dataToSave, userId, {
          source: 'document_import',
          sourceDocumentUploadId: documentUploadId,
          ipAddress: options?.ipAddress,
          userAgent: options?.userAgent,
        });
      }

      result.approved.push({
        itemId: item.id,
        recordType,
        createdRecordId: createdRecord.id,
        action,
      });
    } catch (error: any) {
      result.errors.push({
        itemId: item.id,
        error: error.message,
      });
    }
  }

  // Update extraction status based on results
  const allItems = extractionData.items;
  const approvedCount = allItems.filter(
    (i) => i.status === 'approved' || result.approved.some((a) => a.itemId === i.id)
  ).length;
  const totalCount = allItems.length;

  let extractionStatus: 'approved' | 'partially_approved' | 'pending_review';
  if (approvedCount === totalCount) {
    extractionStatus = 'approved';
  } else if (approvedCount > 0) {
    extractionStatus = 'partially_approved';
  } else {
    extractionStatus = 'pending_review';
  }

  await updateDocumentExtractionStatus(extractionData.extraction.id, extractionStatus, userId);

  return result;
}

export interface MergeItem {
  itemId: number;
  action: 'smart_merge' | 'skip' | 'create_new';
  fieldOverrides?: Record<string, 'existing' | 'imported'>;
}

export interface MergeApprovalResult {
  processed: {
    itemId: number;
    action: 'smart_merge' | 'skip' | 'create_new';
    recordType: string;
    recordId?: number;
    result: 'updated' | 'created' | 'skipped';
  }[];
  errors: { itemId: number; error: string }[];
}

export async function approveMergeDocumentExtractionItems(
  documentUploadId: number,
  petId: number,
  mergeItems: MergeItem[],
  userId: number,
  options?: {
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<MergeApprovalResult> {
  const result: MergeApprovalResult = {
    processed: [],
    errors: [],
  };

  const extractionData = await getDocumentExtractionWithItems(documentUploadId);
  if (!extractionData) {
    throw new Error('Extraction not found');
  }

  for (const mergeItem of mergeItems) {
    const item = extractionData.items.find((i) => i.id === mergeItem.itemId);
    if (!item) {
      result.errors.push({ itemId: mergeItem.itemId, error: 'Item not found' });
      continue;
    }

    try {
      const dataToSave = item.user_modified_data || item.extracted_data;

      if (mergeItem.action === 'skip') {
        await updateDocumentExtractionItemStatus(item.id, 'rejected');
        result.processed.push({
          itemId: item.id,
          action: 'skip',
          recordType: item.record_type,
          result: 'skipped',
        });
        continue;
      }

      if (mergeItem.action === 'create_new') {
        // Force-create a new record even if a duplicate exists
        let createdRecord: any;
        let recordType: string;

        switch (item.record_type) {
          case 'medication':
            createdRecord = await createPetMedication(petId, dataToSave as any);
            recordType = 'pet_medications';
            break;
          case 'vaccination':
            createdRecord = await createPetVaccination(petId, dataToSave as any);
            recordType = 'pet_vaccinations';
            break;
          case 'condition':
            createdRecord = await createPetCondition(petId, dataToSave as any);
            recordType = 'pet_conditions';
            break;
          case 'allergy':
            createdRecord = await createPetAllergy(petId, dataToSave as any);
            recordType = 'pet_allergies';
            break;
          case 'vet':
            createdRecord = await createPetVet(petId, dataToSave as any);
            recordType = 'pet_vets';
            break;
          case 'emergency_contact':
            createdRecord = await createPetEmergencyContact(petId, dataToSave as any);
            recordType = 'pet_emergency_contacts';
            break;
          default:
            throw new Error(`Unknown record type: ${item.record_type}`);
        }

        await updateDocumentExtractionItemStatus(item.id, 'approved', createdRecord.id, recordType);
        await logCreate(recordType, createdRecord.id, dataToSave, userId, {
          source: 'document_import',
          sourceDocumentUploadId: documentUploadId,
          ipAddress: options?.ipAddress,
          userAgent: options?.userAgent,
        });

        result.processed.push({
          itemId: item.id,
          action: 'create_new',
          recordType,
          recordId: createdRecord.id,
          result: 'created',
        });
        continue;
      }

      // smart_merge: Update existing record with imported fields, respecting fieldOverrides
      if (item.record_type === 'medication' && dataToSave.name) {
        const match = await findPetMedicationByName(petId, dataToSave.name);
        if (match) {
          const existingMed = match.medication;
          const updates: Record<string, any> = {};
          const fields = ['dosage', 'frequency', 'start_date', 'start_date_precision', 'end_date', 'end_date_precision', 'prescribing_vet', 'notes', 'is_active', 'show_on_card'] as const;

          for (const field of fields) {
            if (mergeItem.fieldOverrides && mergeItem.fieldOverrides[field]) {
              // Phase 4: user explicitly chose which value to keep
              if (mergeItem.fieldOverrides[field] === 'imported' && dataToSave[field] !== undefined && dataToSave[field] !== null) {
                updates[field] = dataToSave[field];
              }
              // If 'existing', we simply don't update that field
            } else {
              // Default smart merge: use imported if non-null
              if (dataToSave[field] !== undefined && dataToSave[field] !== null) {
                updates[field] = dataToSave[field];
              }
            }
          }

          if (Object.keys(updates).length > 0) {
            await updatePetMedication(existingMed.id, petId, updates, {
              userId,
              source: 'document_import' as any,
              ipAddress: options?.ipAddress,
              userAgent: options?.userAgent,
            });
          }

          await updateDocumentExtractionItemStatus(item.id, 'approved', existingMed.id, 'pet_medications');
          result.processed.push({
            itemId: item.id,
            action: 'smart_merge',
            recordType: 'pet_medications',
            recordId: existingMed.id,
            result: 'updated',
          });
        } else {
          // No existing record found — create new
          const createdRecord = await createPetMedication(petId, dataToSave as any);
          await updateDocumentExtractionItemStatus(item.id, 'approved', createdRecord.id, 'pet_medications');
          await logCreate('pet_medications', createdRecord.id, dataToSave, userId, {
            source: 'document_import',
            sourceDocumentUploadId: documentUploadId,
            ipAddress: options?.ipAddress,
            userAgent: options?.userAgent,
          });
          result.processed.push({
            itemId: item.id,
            action: 'smart_merge',
            recordType: 'pet_medications',
            recordId: createdRecord.id,
            result: 'created',
          });
        }
      } else if (item.record_type === 'condition' && dataToSave.name) {
        const matches = await findDuplicateConditions(petId, dataToSave.name);
        if (matches.length > 0) {
          const existingCondition = matches[0].condition;
          const updates: Record<string, any> = {};
          const fields = ['diagnosed_date', 'diagnosed_date_precision', 'notes', 'severity', 'show_on_card'] as const;

          for (const field of fields) {
            if (mergeItem.fieldOverrides && mergeItem.fieldOverrides[field]) {
              if (mergeItem.fieldOverrides[field] === 'imported' && dataToSave[field] !== undefined && dataToSave[field] !== null) {
                updates[field] = dataToSave[field];
              }
            } else {
              if (dataToSave[field] !== undefined && dataToSave[field] !== null) {
                updates[field] = dataToSave[field];
              }
            }
          }

          if (Object.keys(updates).length > 0) {
            await updatePetCondition(existingCondition.id, petId, updates, {
              userId,
              source: 'document_import' as any,
              ipAddress: options?.ipAddress,
              userAgent: options?.userAgent,
            });
          }

          await updateDocumentExtractionItemStatus(item.id, 'approved', existingCondition.id, 'pet_conditions');
          result.processed.push({
            itemId: item.id,
            action: 'smart_merge',
            recordType: 'pet_conditions',
            recordId: existingCondition.id,
            result: 'updated',
          });
        } else {
          // No existing record found — create new
          const createdRecord = await createPetCondition(petId, dataToSave as any);
          await updateDocumentExtractionItemStatus(item.id, 'approved', createdRecord.id, 'pet_conditions');
          await logCreate('pet_conditions', createdRecord.id, dataToSave, userId, {
            source: 'document_import',
            sourceDocumentUploadId: documentUploadId,
            ipAddress: options?.ipAddress,
            userAgent: options?.userAgent,
          });
          result.processed.push({
            itemId: item.id,
            action: 'smart_merge',
            recordType: 'pet_conditions',
            recordId: createdRecord.id,
            result: 'created',
          });
        }
      } else if (item.record_type === 'vet' && dataToSave.clinic_name) {
        const matches = await findDuplicateVets(petId, dataToSave.clinic_name, dataToSave.vet_name);
        if (matches.length > 0) {
          const existingVet = matches[0].vet;
          const updates: Record<string, any> = {};
          const fields = ['vet_name', 'phone', 'email', 'address', 'is_primary'] as const;

          for (const field of fields) {
            if (mergeItem.fieldOverrides && mergeItem.fieldOverrides[field]) {
              if (mergeItem.fieldOverrides[field] === 'imported' && dataToSave[field] !== undefined && dataToSave[field] !== null) {
                updates[field] = dataToSave[field];
              }
            } else {
              if (dataToSave[field] !== undefined && dataToSave[field] !== null) {
                updates[field] = dataToSave[field];
              }
            }
          }

          if (Object.keys(updates).length > 0) {
            await updatePetVet(existingVet.id, petId, updates, {
              userId,
              source: 'document_import' as any,
              ipAddress: options?.ipAddress,
              userAgent: options?.userAgent,
            });
          }

          await updateDocumentExtractionItemStatus(item.id, 'approved', existingVet.id, 'pet_vets');
          result.processed.push({
            itemId: item.id,
            action: 'smart_merge',
            recordType: 'pet_vets',
            recordId: existingVet.id,
            result: 'updated',
          });
        } else {
          // No existing record found — create new
          const createdRecord = await createPetVet(petId, dataToSave as any);
          await updateDocumentExtractionItemStatus(item.id, 'approved', createdRecord.id, 'pet_vets');
          await logCreate('pet_vets', createdRecord.id, dataToSave, userId, {
            source: 'document_import',
            sourceDocumentUploadId: documentUploadId,
            ipAddress: options?.ipAddress,
            userAgent: options?.userAgent,
          });
          result.processed.push({
            itemId: item.id,
            action: 'smart_merge',
            recordType: 'pet_vets',
            recordId: createdRecord.id,
            result: 'created',
          });
        }
      } else {
        // Smart merge is only supported for medications, conditions, and vets
        throw new Error(`Smart merge is not supported for ${item.record_type}`);
      }
    } catch (error: any) {
      result.errors.push({ itemId: mergeItem.itemId, error: error.message });
    }
  }

  // Update extraction status
  const allItems = extractionData.items;
  const processedIds = new Set(result.processed.map((p) => p.itemId));
  const approvedCount = allItems.filter(
    (i) => i.status === 'approved' || (processedIds.has(i.id) && result.processed.find((p) => p.itemId === i.id)?.result !== 'skipped')
  ).length;
  const totalCount = allItems.length;

  let extractionStatus: 'approved' | 'partially_approved' | 'pending_review';
  if (approvedCount === totalCount) {
    extractionStatus = 'approved';
  } else if (approvedCount > 0) {
    extractionStatus = 'partially_approved';
  } else {
    extractionStatus = 'pending_review';
  }

  await updateDocumentExtractionStatus(extractionData.extraction.id, extractionStatus, userId);

  return result;
}

export async function rejectDocumentExtractionItems(
  extractionId: number,
  itemIds: number[],
  userId: number
): Promise<number[]> {
  const rejected: number[] = [];

  for (const itemId of itemIds) {
    await updateDocumentExtractionItemStatus(itemId, 'rejected');
    rejected.push(itemId);
  }

  // Update extraction status
  await updateDocumentExtractionStatus(extractionId, 'partially_approved', userId);

  return rejected;
}
