import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { uploadDocument } from '../middleware/upload.js';
import { requireFeature } from '../middleware/subscription.js';
import { storage } from '../services/storage.js';
import { userHasPetAccess, userCanEditPet } from '../models/pet-owners.js';
import { findPetById } from '../models/pet.js';
import { optimizeImage, replaceExtension, isOptimizableImage } from '../services/image-optimizer.js';
import {
  createDocumentUpload,
  getDocumentUploadById,
  getDocumentUploadsByPetId,
  deleteDocumentUpload,
  updateDocumentUploadFilename,
  getMediaTypeFromMime,
  DocumentUpload,
} from '../models/document-upload.js';
import {
  getDocumentExtractionWithItems,
  updateDocumentExtractionItemData,
} from '../models/document-extraction.js';
import {
  processDocumentUpload,
  approveDocumentExtractionItems,
  rejectDocumentExtractionItems,
  approveMergeDocumentExtractionItems,
} from '../services/document-processor.js';
import {
  findPetMedicationByName,
  findDuplicateConditions,
  findDuplicateVets,
  PetMedication,
  PetCondition,
  PetVet,
} from '../models/health-records.js';
import { generateExtractedItemsSummary } from '../services/document-classifier.js';
import { extractRequestMetadata } from '../services/audit-logger.js';
import { claudeRateLimit, pdfUploadRateLimit } from '../middleware/rate-limit-claude.js';
import { config } from '../config/index.js';

const router = Router();

// Helper to verify pet edit access
async function verifyPetEditAccess(petId: number, userId: number, res: Response): Promise<boolean> {
  const pet = await findPetById(petId);
  if (!pet) {
    res.status(404).json({ error: 'Pet not found' });
    return false;
  }

  const canEdit = await userCanEditPet(petId, userId);
  if (!canEdit) {
    res.status(403).json({ error: 'Not authorized to edit this pet' });
    return false;
  }

  return true;
}

// POST /api/pets/:petId/documents/upload - Upload and process a document (unified endpoint)
router.post('/:petId/documents/upload', authenticate, requireFeature('upload'), pdfUploadRateLimit, claudeRateLimit, uploadDocument.single('document'), async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.petId);

    if (!await verifyPetEditAccess(petId, req.userId!, res)) {
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    // Optimize images before storage (skip PDFs)
    let fileBuffer = req.file.buffer;
    let fileMimeType = req.file.mimetype;
    let fileName = req.file.originalname;
    let fileSize = req.file.size;

    if (isOptimizableImage(req.file.mimetype)) {
      const optimized = await optimizeImage(req.file.buffer, req.file.mimetype);
      fileBuffer = optimized.buffer;
      fileSize = optimized.buffer.length;
      if (optimized.mimeType !== req.file.mimetype) {
        fileName = replaceExtension(req.file.originalname, optimized.extension);
      }
      fileMimeType = optimized.mimeType;
    }

    // Upload to storage
    const uploadResult = await storage.upload(fileBuffer, {
      type: 'documents',
      petId,
      originalFilename: fileName,
      mimeType: fileMimeType,
    });

    // Create document upload record
    const documentUpload = await createDocumentUpload({
      petId,
      uploadedBy: req.userId!,
      filename: uploadResult.key,
      originalFilename: req.file.originalname,
      filePath: uploadResult.filePath,
      fileSize,
      mimeType: fileMimeType,
      mediaType: getMediaTypeFromMime(fileMimeType),
    });

    // Process the document (classify and extract)
    const result = await processDocumentUpload(documentUpload.id);

    if (result.error) {
      // Return error but include partial results
      res.status(500).json({
        error: result.error,
        upload: result.upload,
        detected_type: result.classification?.detectedType || null,
        confidence: result.classification?.confidence || 0,
        explanation: result.classification?.explanation || result.error,
      });
      return;
    }

    // Build response
    const extractedItems = result.items?.map((item) => ({
      id: item.id,
      record_type: item.record_type,
      data: item.extracted_data,
      confidence: item.confidence_score,
      status: item.status,
    })) || [];

    // Build category summary
    const byCategory: Record<string, number> = {
      medications: 0,
      vaccinations: 0,
      conditions: 0,
      allergies: 0,
      vets: 0,
      emergency_contacts: 0,
    };

    for (const item of extractedItems) {
      switch (item.record_type) {
        case 'medication':
          byCategory.medications++;
          break;
        case 'vaccination':
          byCategory.vaccinations++;
          break;
        case 'condition':
          byCategory.conditions++;
          break;
        case 'allergy':
          byCategory.allergies++;
          break;
        case 'vet':
          byCategory.vets++;
          break;
        case 'emergency_contact':
          byCategory.emergency_contacts++;
          break;
      }
    }

    res.status(201).json({
      upload_id: result.upload.id,
      detected_type: result.classification?.detectedType || 'other',
      confidence: result.classification?.confidence || 0,
      explanation: result.classification?.explanation || '',
      extracted_items: extractedItems,
      summary: generateExtractedItemsSummary(byCategory),
      extraction_id: result.extraction?.id,
    });
  } catch (error: any) {
    console.error('Document upload error:', error);
    res.status(500).json({ error: error.message || 'Upload failed' });
  }
});

// GET /api/pets/:petId/documents/uploads - List all document uploads for a pet
router.get('/:petId/documents/uploads', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.petId);

    const hasAccess = await userHasPetAccess(petId, req.userId!);
    if (!hasAccess) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }

    const uploads = await getDocumentUploadsByPetId(petId);
    res.json(uploads);
  } catch (error) {
    console.error('Error fetching document uploads:', error);
    res.status(500).json({ error: 'Failed to fetch uploads' });
  }
});

// GET /api/pets/:petId/documents/uploads/:id - Get a specific document upload
router.get('/:petId/documents/uploads/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.petId);
    const uploadId = parseInt(req.params.id);

    const hasAccess = await userHasPetAccess(petId, req.userId!);
    if (!hasAccess) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }

    const upload = await getDocumentUploadById(uploadId);
    if (!upload || upload.pet_id !== petId) {
      res.status(404).json({ error: 'Upload not found' });
      return;
    }

    res.json(upload);
  } catch (error) {
    console.error('Error fetching document upload:', error);
    res.status(500).json({ error: 'Failed to fetch upload' });
  }
});

// GET /api/pets/:petId/documents/uploads/:id/file - Redirect to the actual file
router.get('/:petId/documents/uploads/:id/file', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.petId);
    const uploadId = parseInt(req.params.id);

    const hasAccess = await userHasPetAccess(petId, req.userId!);
    if (!hasAccess) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }

    const upload = await getDocumentUploadById(uploadId);
    if (!upload || upload.pet_id !== petId) {
      res.status(404).json({ error: 'Upload not found' });
      return;
    }

    const url = storage.getUrl(upload.filename, 'documents');
    res.redirect(url);
  } catch (error) {
    console.error('Error serving document file:', error);
    res.status(500).json({ error: 'Failed to serve file' });
  }
});

// DELETE /api/pets/:petId/documents/uploads/:id - Delete a document upload
router.delete('/:petId/documents/uploads/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.petId);
    const uploadId = parseInt(req.params.id);

    if (!await verifyPetEditAccess(petId, req.userId!, res)) {
      return;
    }

    const upload = await getDocumentUploadById(uploadId);
    if (!upload || upload.pet_id !== petId) {
      res.status(404).json({ error: 'Upload not found' });
      return;
    }

    // Delete from storage
    try {
      const key = storage.extractKey(upload.file_path);
      await storage.delete(key, 'documents');
    } catch (err) {
      console.error('Failed to delete document file:', err);
    }

    await deleteDocumentUpload(uploadId, petId);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting document upload:', error);
    res.status(500).json({ error: 'Failed to delete upload' });
  }
});

// GET /api/pets/:petId/documents/uploads/:id/extraction - Get extraction results
router.get('/:petId/documents/uploads/:id/extraction', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.petId);
    const uploadId = parseInt(req.params.id);

    const hasAccess = await userHasPetAccess(petId, req.userId!);
    if (!hasAccess) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }

    const upload = await getDocumentUploadById(uploadId);
    if (!upload || upload.pet_id !== petId) {
      res.status(404).json({ error: 'Upload not found' });
      return;
    }

    const extraction = await getDocumentExtractionWithItems(uploadId);
    if (!extraction) {
      res.status(404).json({ error: 'No extraction found. Please process the document first.' });
      return;
    }

    res.json({
      ...extraction,
      classification: {
        detected_type: upload.detected_type,
        confidence: upload.classification_confidence,
        explanation: upload.classification_explanation,
      },
    });
  } catch (error) {
    console.error('Error fetching extraction:', error);
    res.status(500).json({ error: 'Failed to fetch extraction' });
  }
});

// POST /api/pets/:petId/documents/uploads/:id/extraction/check-duplicates - Check for duplicate medications
router.post('/:petId/documents/uploads/:id/extraction/check-duplicates', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.petId);
    const uploadId = parseInt(req.params.id);

    const hasAccess = await userHasPetAccess(petId, req.userId!);
    if (!hasAccess) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }

    const upload = await getDocumentUploadById(uploadId);
    if (!upload || upload.pet_id !== petId) {
      res.status(404).json({ error: 'Upload not found' });
      return;
    }

    const extraction = await getDocumentExtractionWithItems(uploadId);
    if (!extraction) {
      res.status(404).json({ error: 'No extraction found' });
      return;
    }

    // Field diff configurations for each record type
    const MEDICATION_DIFF_FIELDS = ['dosage', 'frequency', 'start_date', 'end_date', 'prescribing_vet', 'notes', 'is_active'] as const;
    const CONDITION_DIFF_FIELDS = ['diagnosed_date', 'notes', 'severity'] as const;
    const VET_DIFF_FIELDS = ['vet_name', 'phone', 'email', 'address', 'is_primary'] as const;

    const FIELD_LABELS: Record<string, string> = {
      // Medication fields
      dosage: 'Dosage',
      frequency: 'Frequency',
      start_date: 'Start date',
      end_date: 'End date',
      prescribing_vet: 'Prescribing vet',
      notes: 'Notes',
      is_active: 'Active status',
      // Condition fields
      diagnosed_date: 'Diagnosed date',
      severity: 'Severity',
      // Vet fields
      vet_name: 'Veterinarian',
      phone: 'Phone',
      email: 'Email',
      address: 'Address',
      is_primary: 'Primary vet',
    };

    const duplicates: Record<number, {
      existingId: number;
      existingName: string;
      existingData: Partial<PetMedication | PetCondition | PetVet>;
      fieldDiffs: Array<{ field: string; label: string; existingValue: any; importedValue: any }>;
      matchScore: number;
    }> = {};

    for (const item of extraction.items) {
      const data = item.user_modified_data || item.extracted_data;

      // Check medications
      if (item.record_type === 'medication' && data.name) {
        const match = await findPetMedicationByName(petId, data.name);
        if (match) {
          const existing = match.medication;
          const fieldDiffs: Array<{ field: string; label: string; existingValue: any; importedValue: any }> = [];

          for (const field of MEDICATION_DIFF_FIELDS) {
            const importedValue = data[field];
            const existingValue = existing[field];

            // Only include fields where the imported value is non-null and differs from existing
            if (importedValue !== undefined && importedValue !== null) {
              const existingNorm = existingValue === undefined ? null : existingValue;
              const importedNorm = importedValue === undefined ? null : importedValue;
              // Normalize dates for comparison
              const existingStr = existingNorm instanceof Date ? existingNorm.toISOString().split('T')[0] : String(existingNorm ?? '');
              const importedStr = String(importedNorm ?? '');
              if (existingStr !== importedStr) {
                fieldDiffs.push({
                  field,
                  label: FIELD_LABELS[field] || field,
                  existingValue: existingNorm instanceof Date ? existingNorm.toISOString().split('T')[0] : existingNorm,
                  importedValue: importedNorm,
                });
              }
            }
          }

          duplicates[item.id] = {
            existingId: existing.id,
            existingName: existing.name,
            existingData: {
              name: existing.name,
              dosage: existing.dosage,
              frequency: existing.frequency,
              start_date: existing.start_date,
              end_date: existing.end_date,
              prescribing_vet: existing.prescribing_vet,
              notes: existing.notes,
              is_active: existing.is_active,
            },
            fieldDiffs,
            matchScore: match.score,
          };
        }
      }

      // Check conditions
      if (item.record_type === 'condition' && data.name) {
        const matches = await findDuplicateConditions(petId, data.name);
        if (matches.length > 0) {
          // Take the best match (highest score)
          const bestMatch = matches[0];
          const existing = bestMatch.condition;
          const fieldDiffs: Array<{ field: string; label: string; existingValue: any; importedValue: any }> = [];

          for (const field of CONDITION_DIFF_FIELDS) {
            const importedValue = data[field];
            const existingValue = existing[field];

            if (importedValue !== undefined && importedValue !== null) {
              const existingNorm = existingValue === undefined ? null : existingValue;
              const importedNorm = importedValue === undefined ? null : importedValue;
              const existingStr = existingNorm instanceof Date ? existingNorm.toISOString().split('T')[0] : String(existingNorm ?? '');
              const importedStr = String(importedNorm ?? '');
              if (existingStr !== importedStr) {
                fieldDiffs.push({
                  field,
                  label: FIELD_LABELS[field] || field,
                  existingValue: existingNorm instanceof Date ? existingNorm.toISOString().split('T')[0] : existingNorm,
                  importedValue: importedNorm,
                });
              }
            }
          }

          duplicates[item.id] = {
            existingId: existing.id,
            existingName: existing.name,
            existingData: {
              name: existing.name,
              diagnosed_date: existing.diagnosed_date,
              notes: existing.notes,
              severity: existing.severity,
            },
            fieldDiffs,
            matchScore: bestMatch.score,
          };
        }
      }

      // Check vets
      if (item.record_type === 'vet' && data.clinic_name) {
        const matches = await findDuplicateVets(petId, data.clinic_name, data.vet_name);
        if (matches.length > 0) {
          // Take the best match (highest score)
          const bestMatch = matches[0];
          const existing = bestMatch.vet;
          const fieldDiffs: Array<{ field: string; label: string; existingValue: any; importedValue: any }> = [];

          for (const field of VET_DIFF_FIELDS) {
            const importedValue = data[field];
            const existingValue = existing[field];

            if (importedValue !== undefined && importedValue !== null) {
              const existingNorm = existingValue === undefined ? null : existingValue;
              const importedNorm = importedValue === undefined ? null : importedValue;
              const existingStr = String(existingNorm ?? '');
              const importedStr = String(importedNorm ?? '');
              if (existingStr !== importedStr) {
                fieldDiffs.push({
                  field,
                  label: FIELD_LABELS[field] || field,
                  existingValue: existingNorm,
                  importedValue: importedNorm,
                });
              }
            }
          }

          duplicates[item.id] = {
            existingId: existing.id,
            existingName: existing.clinic_name,
            existingData: {
              clinic_name: existing.clinic_name,
              vet_name: existing.vet_name,
              phone: existing.phone,
              email: existing.email,
              address: existing.address,
              is_primary: existing.is_primary,
            },
            fieldDiffs,
            matchScore: bestMatch.score,
          };
        }
      }
    }

    res.json({ duplicates });
  } catch (error: any) {
    console.error('Error checking duplicates:', error);
    res.status(500).json({ error: error.message || 'Duplicate check failed' });
  }
});

// POST /api/pets/:petId/documents/uploads/:id/extraction/approve - Approve extraction items
router.post('/:petId/documents/uploads/:id/extraction/approve', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.petId);
    const uploadId = parseInt(req.params.id);
    const { itemIds } = req.body;

    if (!await verifyPetEditAccess(petId, req.userId!, res)) {
      return;
    }

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      res.status(400).json({ error: 'itemIds array is required' });
      return;
    }

    const upload = await getDocumentUploadById(uploadId);
    if (!upload || upload.pet_id !== petId) {
      res.status(404).json({ error: 'Upload not found' });
      return;
    }

    const metadata = extractRequestMetadata(req);
    const result = await approveDocumentExtractionItems(uploadId, petId, itemIds, req.userId!, {
      ipAddress: metadata.ipAddress || undefined,
      userAgent: metadata.userAgent || undefined,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error approving extraction items:', error);
    res.status(500).json({ error: error.message || 'Approval failed' });
  }
});

// POST /api/pets/:petId/documents/uploads/:id/extraction/approve-merge - Approve with per-item merge strategies
router.post('/:petId/documents/uploads/:id/extraction/approve-merge', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.petId);
    const uploadId = parseInt(req.params.id);
    const { items } = req.body;

    if (!await verifyPetEditAccess(petId, req.userId!, res)) {
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'items array is required' });
      return;
    }

    // Validate each item has required fields
    for (const item of items) {
      if (!item.itemId || !['smart_merge', 'skip', 'create_new'].includes(item.action)) {
        res.status(400).json({ error: 'Each item must have itemId and action (smart_merge | skip | create_new)' });
        return;
      }
    }

    const upload = await getDocumentUploadById(uploadId);
    if (!upload || upload.pet_id !== petId) {
      res.status(404).json({ error: 'Upload not found' });
      return;
    }

    const metadata = extractRequestMetadata(req);
    const result = await approveMergeDocumentExtractionItems(uploadId, petId, items, req.userId!, {
      ipAddress: metadata.ipAddress || undefined,
      userAgent: metadata.userAgent || undefined,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error processing merge approval:', error);
    res.status(500).json({ error: error.message || 'Merge approval failed' });
  }
});

// POST /api/pets/:petId/documents/uploads/:id/extraction/reject - Reject extraction items
router.post('/:petId/documents/uploads/:id/extraction/reject', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.petId);
    const uploadId = parseInt(req.params.id);
    const { itemIds } = req.body;

    if (!await verifyPetEditAccess(petId, req.userId!, res)) {
      return;
    }

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      res.status(400).json({ error: 'itemIds array is required' });
      return;
    }

    const upload = await getDocumentUploadById(uploadId);
    if (!upload || upload.pet_id !== petId) {
      res.status(404).json({ error: 'Upload not found' });
      return;
    }

    const extraction = await getDocumentExtractionWithItems(uploadId);
    if (!extraction) {
      res.status(404).json({ error: 'No extraction found' });
      return;
    }

    const rejected = await rejectDocumentExtractionItems(extraction.extraction.id, itemIds, req.userId!);
    res.json({ rejected });
  } catch (error: any) {
    console.error('Error rejecting extraction items:', error);
    res.status(500).json({ error: error.message || 'Rejection failed' });
  }
});

// PATCH /api/pets/:petId/documents/extraction-items/:itemId - Edit an extraction item
router.patch('/:petId/documents/extraction-items/:itemId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.petId);
    const itemId = parseInt(req.params.itemId);
    const { modifiedData } = req.body;

    if (!await verifyPetEditAccess(petId, req.userId!, res)) {
      return;
    }

    if (!modifiedData || typeof modifiedData !== 'object') {
      res.status(400).json({ error: 'modifiedData object is required' });
      return;
    }

    const updatedItem = await updateDocumentExtractionItemData(itemId, modifiedData);
    if (!updatedItem) {
      res.status(404).json({ error: 'Extraction item not found' });
      return;
    }

    res.json(updatedItem);
  } catch (error: any) {
    console.error('Error updating extraction item:', error);
    res.status(500).json({ error: error.message || 'Update failed' });
  }
});

// PATCH /api/pets/:petId/documents/uploads/:id/rename - Rename a document upload
router.patch('/:petId/documents/uploads/:id/rename', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.petId);
    const uploadId = parseInt(req.params.id);
    const { filename } = req.body;

    if (!await verifyPetEditAccess(petId, req.userId!, res)) {
      return;
    }

    if (!filename || typeof filename !== 'string' || filename.trim().length === 0) {
      res.status(400).json({ error: 'filename is required and must be non-empty' });
      return;
    }

    if (filename.length > 255) {
      res.status(400).json({ error: 'filename must be 255 characters or less' });
      return;
    }

    const upload = await getDocumentUploadById(uploadId);
    if (!upload || upload.pet_id !== petId) {
      res.status(404).json({ error: 'Upload not found' });
      return;
    }

    const updatedUpload = await updateDocumentUploadFilename(uploadId, petId, filename.trim());
    if (!updatedUpload) {
      res.status(404).json({ error: 'Failed to update filename' });
      return;
    }

    res.json(updatedUpload);
  } catch (error: any) {
    console.error('Error renaming document upload:', error);
    res.status(500).json({ error: error.message || 'Rename failed' });
  }
});

export default router;
