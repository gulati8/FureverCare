import { extractPetDataFromImage, mapExtractionToHealthRecord, ImageExtractionResult } from './claude.js';
import { logCreate } from './audit-logger.js';
import {
  createImageUpload,
  getImageUploadById,
  updateImageUploadStatus,
  updateImageUploadDocumentType,
  CreateImageUploadInput,
  ImageUpload,
  ImageDocumentType,
} from '../models/image-upload.js';
import {
  createImageExtractionWithItems,
  getImageExtractionWithItems,
  updateImageExtractionItemData,
  updateImageExtractionItemStatus,
  updateImageExtractionStatus,
  getImageExtractionItemById,
  ImageExtraction,
  ImageExtractionItem,
  RecordType,
} from '../models/image-extraction.js';
import {
  createPetVaccination,
  createPetMedication,
  createPetCondition,
  createPetAllergy,
  createPetVet,
  createPetEmergencyContact,
} from '../models/health-records.js';
import { config } from '../config/index.js';

export interface ImageProcessingResult {
  upload: ImageUpload;
  extraction?: ImageExtraction;
  items?: ImageExtractionItem[];
  error?: string;
}

export async function processImageUpload(uploadId: number): Promise<ImageProcessingResult> {
  const upload = await getImageUploadById(uploadId);
  if (!upload) {
    throw new Error('Image upload not found');
  }

  if (upload.status === 'processing') {
    throw new Error('Image is already being processed');
  }

  // Mark as processing
  await updateImageUploadStatus(uploadId, 'processing');

  try {
    // Check if Claude API key is configured
    if (!config.claude.apiKey) {
      throw new Error('Claude API key not configured');
    }

    // Extract data using Claude
    const extractionResult = await extractPetDataFromImage(upload.file_path);

    // Update document type if detected
    if (extractionResult.documentType) {
      await updateImageUploadDocumentType(uploadId, extractionResult.documentType as ImageDocumentType);
    }

    // Create extraction record with items
    const items = extractionResult.items.map((item) => ({
      recordType: item.recordType as RecordType,
      extractedData: mapExtractionToHealthRecord(item.recordType as RecordType, item.data),
      confidenceScore: item.confidence,
    }));

    const { extraction, items: createdItems } = await createImageExtractionWithItems(
      {
        imageUploadId: uploadId,
        rawExtraction: extractionResult.rawResponse,
        mappedData: { items: extractionResult.items },
        extractionModel: extractionResult.model,
        tokensUsed: extractionResult.tokensUsed,
      },
      items
    );

    // Mark as completed
    await updateImageUploadStatus(uploadId, 'completed');

    return {
      upload: (await getImageUploadById(uploadId))!,
      extraction,
      items: createdItems,
    };
  } catch (error: any) {
    // Mark as failed
    await updateImageUploadStatus(uploadId, 'failed', error.message);
    return {
      upload: (await getImageUploadById(uploadId))!,
      error: error.message,
    };
  }
}

export interface ImageApprovalResult {
  approved: {
    itemId: number;
    recordType: string;
    createdRecordId: number;
  }[];
  rejected: number[];
  errors: { itemId: number; error: string }[];
}

export async function approveImageExtractionItems(
  imageUploadId: number,
  petId: number,
  itemIds: number[],
  userId: number,
  options?: {
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<ImageApprovalResult> {
  const result: ImageApprovalResult = {
    approved: [],
    rejected: [],
    errors: [],
  };

  const extractionData = await getImageExtractionWithItems(imageUploadId);
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
      await updateImageExtractionItemStatus(item.id, 'approved', createdRecord.id, recordType);

      // Log audit entry
      await logCreate(recordType, createdRecord.id, dataToSave, userId, {
        source: 'image_import',
        sourceImageUploadId: imageUploadId,
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

  await updateImageExtractionStatus(extractionData.extraction.id, extractionStatus, userId);

  return result;
}

export async function rejectImageExtractionItems(
  extractionId: number,
  itemIds: number[],
  userId: number
): Promise<number[]> {
  const rejected: number[] = [];

  for (const itemId of itemIds) {
    await updateImageExtractionItemStatus(itemId, 'rejected');
    rejected.push(itemId);
  }

  // Update extraction status
  await updateImageExtractionStatus(extractionId, 'partially_approved', userId);

  return rejected;
}

export async function modifyImageExtractionItem(
  itemId: number,
  modifiedData: Record<string, any>
): Promise<ImageExtractionItem | null> {
  return updateImageExtractionItemData(itemId, modifiedData);
}
