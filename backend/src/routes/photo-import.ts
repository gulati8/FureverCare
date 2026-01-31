import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { uploadImage } from '../middleware/upload.js';
import { storage } from '../services/storage.js';
import { userHasPetAccess, userCanEditPet } from '../models/pet-owners.js';
import { findPetById } from '../models/pet.js';
import {
  createImageUpload,
  getImageUploadById,
  getImageUploadsByPetId,
  deleteImageUpload,
  ImageUpload,
} from '../models/image-upload.js';
import {
  getImageExtractionWithItems,
  updateImageExtractionItemData,
} from '../models/image-extraction.js';
import {
  processImageUpload,
  approveImageExtractionItems,
  rejectImageExtractionItems,
} from '../services/image-processor.js';
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

// POST /api/pets/:petId/photo-import/upload - Upload an image
router.post('/:petId/photo-import/upload', authenticate, pdfUploadRateLimit, uploadImage.single('image'), async (req: AuthRequest, res: Response) => {
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
      type: 'images',
      petId,
      originalFilename: req.file.originalname,
      mimeType: req.file.mimetype,
    });

    // Create image upload record
    const imageUpload = await createImageUpload({
      petId,
      uploadedBy: req.userId!,
      filename: uploadResult.key,
      originalFilename: req.file.originalname,
      filePath: uploadResult.filePath,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      documentType: req.body.documentType,
    });

    res.status(201).json(imageUpload);
  } catch (error: any) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: error.message || 'Upload failed' });
  }
});

// GET /api/pets/:petId/photo-import/uploads - List all uploads for a pet
router.get('/:petId/photo-import/uploads', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.petId);

    const hasAccess = await userHasPetAccess(petId, req.userId!);
    if (!hasAccess) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }

    const uploads = await getImageUploadsByPetId(petId);
    res.json(uploads);
  } catch (error) {
    console.error('Error fetching image uploads:', error);
    res.status(500).json({ error: 'Failed to fetch uploads' });
  }
});

// GET /api/pets/:petId/photo-import/uploads/:id - Get a specific upload
router.get('/:petId/photo-import/uploads/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.petId);
    const uploadId = parseInt(req.params.id);

    const hasAccess = await userHasPetAccess(petId, req.userId!);
    if (!hasAccess) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }

    const upload = await getImageUploadById(uploadId);
    if (!upload || upload.pet_id !== petId) {
      res.status(404).json({ error: 'Upload not found' });
      return;
    }

    res.json(upload);
  } catch (error) {
    console.error('Error fetching image upload:', error);
    res.status(500).json({ error: 'Failed to fetch upload' });
  }
});

// DELETE /api/pets/:petId/photo-import/uploads/:id - Delete an upload
router.delete('/:petId/photo-import/uploads/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.petId);
    const uploadId = parseInt(req.params.id);

    if (!await verifyPetEditAccess(petId, req.userId!, res)) {
      return;
    }

    const upload = await getImageUploadById(uploadId);
    if (!upload || upload.pet_id !== petId) {
      res.status(404).json({ error: 'Upload not found' });
      return;
    }

    // Delete from storage
    try {
      const key = storage.extractKey(upload.file_path);
      await storage.delete(key, 'images');
    } catch (err) {
      console.error('Failed to delete image file:', err);
    }

    await deleteImageUpload(uploadId, petId);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting image upload:', error);
    res.status(500).json({ error: 'Failed to delete upload' });
  }
});

// POST /api/pets/:petId/photo-import/uploads/:id/process - Process an uploaded image
router.post('/:petId/photo-import/uploads/:id/process', authenticate, claudeRateLimit, async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.petId);
    const uploadId = parseInt(req.params.id);

    if (!await verifyPetEditAccess(petId, req.userId!, res)) {
      return;
    }

    const upload = await getImageUploadById(uploadId);
    if (!upload || upload.pet_id !== petId) {
      res.status(404).json({ error: 'Upload not found' });
      return;
    }

    // Check if already processed
    if (upload.status === 'completed') {
      const extraction = await getImageExtractionWithItems(uploadId);
      res.json({
        upload,
        extraction: extraction?.extraction,
        items: extraction?.items,
      });
      return;
    }

    const result = await processImageUpload(uploadId);

    if (result.error) {
      res.status(500).json({
        error: result.error,
        upload: result.upload,
      });
      return;
    }

    res.json({
      upload: result.upload,
      extraction: result.extraction,
      items: result.items,
    });
  } catch (error: any) {
    console.error('Error processing image:', error);
    res.status(500).json({ error: error.message || 'Processing failed' });
  }
});

// GET /api/pets/:petId/photo-import/uploads/:id/extraction - Get extraction results
router.get('/:petId/photo-import/uploads/:id/extraction', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.petId);
    const uploadId = parseInt(req.params.id);

    const hasAccess = await userHasPetAccess(petId, req.userId!);
    if (!hasAccess) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }

    const upload = await getImageUploadById(uploadId);
    if (!upload || upload.pet_id !== petId) {
      res.status(404).json({ error: 'Upload not found' });
      return;
    }

    const extraction = await getImageExtractionWithItems(uploadId);
    if (!extraction) {
      res.status(404).json({ error: 'No extraction found. Please process the image first.' });
      return;
    }

    res.json(extraction);
  } catch (error) {
    console.error('Error fetching extraction:', error);
    res.status(500).json({ error: 'Failed to fetch extraction' });
  }
});

// POST /api/pets/:petId/photo-import/uploads/:id/extraction/approve - Approve extraction items
router.post('/:petId/photo-import/uploads/:id/extraction/approve', authenticate, async (req: AuthRequest, res: Response) => {
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

    const upload = await getImageUploadById(uploadId);
    if (!upload || upload.pet_id !== petId) {
      res.status(404).json({ error: 'Upload not found' });
      return;
    }

    const metadata = extractRequestMetadata(req);
    const result = await approveImageExtractionItems(uploadId, petId, itemIds, req.userId!, {
      ipAddress: metadata.ipAddress || undefined,
      userAgent: metadata.userAgent || undefined,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error approving extraction items:', error);
    res.status(500).json({ error: error.message || 'Approval failed' });
  }
});

// POST /api/pets/:petId/photo-import/uploads/:id/extraction/reject - Reject extraction items
router.post('/:petId/photo-import/uploads/:id/extraction/reject', authenticate, async (req: AuthRequest, res: Response) => {
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

    const upload = await getImageUploadById(uploadId);
    if (!upload || upload.pet_id !== petId) {
      res.status(404).json({ error: 'Upload not found' });
      return;
    }

    const extraction = await getImageExtractionWithItems(uploadId);
    if (!extraction) {
      res.status(404).json({ error: 'No extraction found' });
      return;
    }

    const rejected = await rejectImageExtractionItems(extraction.extraction.id, itemIds, req.userId!);
    res.json({ rejected });
  } catch (error: any) {
    console.error('Error rejecting extraction items:', error);
    res.status(500).json({ error: error.message || 'Rejection failed' });
  }
});

// PATCH /api/pets/:petId/photo-import/extraction-items/:itemId - Edit an extraction item
router.patch('/:petId/photo-import/extraction-items/:itemId', authenticate, async (req: AuthRequest, res: Response) => {
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

    const updatedItem = await updateImageExtractionItemData(itemId, modifiedData);
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
