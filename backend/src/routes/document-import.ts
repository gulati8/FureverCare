import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { uploadDocument } from '../middleware/upload.js';
import { requireFeature } from '../middleware/subscription.js';
import { storage } from '../services/storage.js';
import { userHasPetAccess, userCanEditPet } from '../models/pet-owners.js';
import { findPetById } from '../models/pet.js';
import {
  createDocumentUpload,
  getDocumentUploadById,
  getDocumentUploadsByPetId,
  deleteDocumentUpload,
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
} from '../services/document-processor.js';
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

    // Upload to storage
    const uploadResult = await storage.upload(req.file.buffer, {
      type: 'documents',
      petId,
      originalFilename: req.file.originalname,
      mimeType: req.file.mimetype,
    });

    // Create document upload record
    const documentUpload = await createDocumentUpload({
      petId,
      uploadedBy: req.userId!,
      filename: uploadResult.key,
      originalFilename: req.file.originalname,
      filePath: uploadResult.filePath,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      mediaType: getMediaTypeFromMime(req.file.mimetype),
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

export default router;
