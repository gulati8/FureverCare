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
  createPetCondition,
  createPetAllergy,
  createPetVet,
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

    // Mark as completed
    await updateDocumentUploadStatus(uploadId, 'completed');

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

      switch (item.record_type) {
        case 'vaccination':
          createdRecord = await createPetVaccination(petId, dataToSave as any);
          recordType = 'pet_vaccinations';
          break;

        case 'medication':
          createdRecord = await createPetMedication(petId, dataToSave as any);
          recordType = 'pet_medications';
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

      // Update extraction item status
      await updateDocumentExtractionItemStatus(item.id, 'approved', createdRecord.id, recordType);

      // Log audit entry
      await logCreate(recordType, createdRecord.id, dataToSave, userId, {
        source: 'document_import',
        sourceDocumentUploadId: documentUploadId,
        ipAddress: options?.ipAddress,
        userAgent: options?.userAgent,
      });

      result.approved.push({
        itemId: item.id,
        recordType,
        createdRecordId: createdRecord.id,
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
