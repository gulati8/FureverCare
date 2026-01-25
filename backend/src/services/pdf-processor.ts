import { extractPetDataFromPdf, mapExtractionToHealthRecord, ExtractionResult } from './claude.js';
import { logCreate } from './audit-logger.js';
import {
  createPdfUpload,
  getPdfUploadById,
  updatePdfUploadStatus,
  updatePdfUploadDocumentType,
  CreatePdfUploadInput,
  PdfUpload,
  DocumentType,
} from '../models/pdf-upload.js';
import {
  createExtractionWithItems,
  getExtractionWithItems,
  updateExtractionItemData,
  updateExtractionItemStatus,
  updateExtractionStatus,
  getExtractionItemById,
  PdfExtraction,
  PdfExtractionItem,
  RecordType,
} from '../models/pdf-extraction.js';
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
  upload: PdfUpload;
  extraction?: PdfExtraction;
  items?: PdfExtractionItem[];
  error?: string;
}

export async function processPdfUpload(uploadId: number): Promise<ProcessingResult> {
  const upload = await getPdfUploadById(uploadId);
  if (!upload) {
    throw new Error('PDF upload not found');
  }

  if (upload.status === 'processing') {
    throw new Error('PDF is already being processed');
  }

  // Mark as processing
  await updatePdfUploadStatus(uploadId, 'processing');

  try {
    // Check if Claude API key is configured
    if (!config.claude.apiKey) {
      throw new Error('Claude API key not configured');
    }

    // Extract data using Claude
    const extractionResult = await extractPetDataFromPdf(upload.file_path);

    // Update document type if detected
    if (extractionResult.documentType) {
      await updatePdfUploadDocumentType(uploadId, extractionResult.documentType as DocumentType);
    }

    // Create extraction record with items
    const items = extractionResult.items.map((item) => ({
      recordType: item.recordType,
      extractedData: mapExtractionToHealthRecord(item.recordType, item.data),
      confidenceScore: item.confidence,
    }));

    const { extraction, items: createdItems } = await createExtractionWithItems(
      {
        pdfUploadId: uploadId,
        rawExtraction: extractionResult.rawResponse,
        mappedData: { items: extractionResult.items },
        extractionModel: extractionResult.model,
        tokensUsed: extractionResult.tokensUsed,
      },
      items
    );

    // Mark as completed
    await updatePdfUploadStatus(uploadId, 'completed');

    return {
      upload: (await getPdfUploadById(uploadId))!,
      extraction,
      items: createdItems,
    };
  } catch (error: any) {
    // Mark as failed
    await updatePdfUploadStatus(uploadId, 'failed', error.message);
    return {
      upload: (await getPdfUploadById(uploadId))!,
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

export async function approveExtractionItems(
  pdfUploadId: number,
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

  const extractionData = await getExtractionWithItems(pdfUploadId);
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
      await updateExtractionItemStatus(item.id, 'approved', createdRecord.id, recordType);

      // Log audit entry
      await logCreate(recordType, createdRecord.id, dataToSave, userId, {
        source: 'pdf_import',
        sourcePdfUploadId: pdfUploadId,
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

  await updateExtractionStatus(extractionData.extraction.id, extractionStatus, userId);

  return result;
}

export async function rejectExtractionItems(
  extractionId: number,
  itemIds: number[],
  userId: number
): Promise<number[]> {
  const rejected: number[] = [];

  for (const itemId of itemIds) {
    await updateExtractionItemStatus(itemId, 'rejected');
    rejected.push(itemId);
  }

  // Update extraction status
  await updateExtractionStatus(extractionId, 'partially_approved', userId);

  return rejected;
}

export async function modifyExtractionItem(
  itemId: number,
  modifiedData: Record<string, any>
): Promise<PdfExtractionItem | null> {
  return updateExtractionItemData(itemId, modifiedData);
}
