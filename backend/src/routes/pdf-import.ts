import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { nanoid } from 'nanoid';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { userHasPetAccess, userCanEditPet } from '../models/pet-owners.js';
import { findPetById } from '../models/pet.js';
import {
  createPdfUpload,
  getPdfUploadById,
  getPdfUploadsByPetId,
  deletePdfUpload,
  PdfUpload,
} from '../models/pdf-upload.js';
import {
  getExtractionWithItems,
  updateExtractionItemData,
} from '../models/pdf-extraction.js';
import {
  processPdfUpload,
  approveExtractionItems,
  rejectExtractionItems,
} from '../services/pdf-processor.js';
import { extractRequestMetadata } from '../services/audit-logger.js';
import { claudeRateLimit, pdfUploadRateLimit } from '../middleware/rate-limit-claude.js';
import { config } from '../config/index.js';

const router = Router();

// Ensure PDF uploads directory exists
const pdfUploadsDir = path.join(process.cwd(), config.pdfUpload.uploadDir);
if (!fs.existsSync(pdfUploadsDir)) {
  fs.mkdirSync(pdfUploadsDir, { recursive: true });
}

// Configure multer for PDF storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, pdfUploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${nanoid()}${ext}`;
    cb(null, filename);
  },
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (config.pdfUpload.allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF files are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.pdfUpload.maxSizeMB * 1024 * 1024,
  },
});

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

// POST /api/pets/:petId/pdf-import/upload - Upload a PDF
router.post('/:petId/pdf-import/upload', authenticate, pdfUploadRateLimit, upload.single('pdf'), async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.petId);

    if (!await verifyPetEditAccess(petId, req.userId!, res)) {
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    // Create PDF upload record
    const pdfUpload = await createPdfUpload({
      petId,
      uploadedBy: req.userId!,
      filename: req.file.filename,
      originalFilename: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      documentType: req.body.documentType,
    });

    res.status(201).json(pdfUpload);
  } catch (error: any) {
    console.error('PDF upload error:', error);
    res.status(500).json({ error: error.message || 'Upload failed' });
  }
});

// GET /api/pets/:petId/pdf-import/uploads - List all uploads for a pet
router.get('/:petId/pdf-import/uploads', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.petId);

    const hasAccess = await userHasPetAccess(petId, req.userId!);
    if (!hasAccess) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }

    const uploads = await getPdfUploadsByPetId(petId);
    res.json(uploads);
  } catch (error) {
    console.error('Error fetching PDF uploads:', error);
    res.status(500).json({ error: 'Failed to fetch uploads' });
  }
});

// GET /api/pets/:petId/pdf-import/uploads/:id - Get a specific upload
router.get('/:petId/pdf-import/uploads/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.petId);
    const uploadId = parseInt(req.params.id);

    const hasAccess = await userHasPetAccess(petId, req.userId!);
    if (!hasAccess) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }

    const upload = await getPdfUploadById(uploadId);
    if (!upload || upload.pet_id !== petId) {
      res.status(404).json({ error: 'Upload not found' });
      return;
    }

    res.json(upload);
  } catch (error) {
    console.error('Error fetching PDF upload:', error);
    res.status(500).json({ error: 'Failed to fetch upload' });
  }
});

// DELETE /api/pets/:petId/pdf-import/uploads/:id - Delete an upload
router.delete('/:petId/pdf-import/uploads/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.petId);
    const uploadId = parseInt(req.params.id);

    if (!await verifyPetEditAccess(petId, req.userId!, res)) {
      return;
    }

    const upload = await getPdfUploadById(uploadId);
    if (!upload || upload.pet_id !== petId) {
      res.status(404).json({ error: 'Upload not found' });
      return;
    }

    // Delete the file
    if (fs.existsSync(upload.file_path)) {
      fs.unlinkSync(upload.file_path);
    }

    await deletePdfUpload(uploadId, petId);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting PDF upload:', error);
    res.status(500).json({ error: 'Failed to delete upload' });
  }
});

// POST /api/pets/:petId/pdf-import/uploads/:id/process - Process an uploaded PDF
router.post('/:petId/pdf-import/uploads/:id/process', authenticate, claudeRateLimit, async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.petId);
    const uploadId = parseInt(req.params.id);

    if (!await verifyPetEditAccess(petId, req.userId!, res)) {
      return;
    }

    const upload = await getPdfUploadById(uploadId);
    if (!upload || upload.pet_id !== petId) {
      res.status(404).json({ error: 'Upload not found' });
      return;
    }

    // Check if already processed
    if (upload.status === 'completed') {
      const extraction = await getExtractionWithItems(uploadId);
      res.json({
        upload,
        extraction: extraction?.extraction,
        items: extraction?.items,
      });
      return;
    }

    const result = await processPdfUpload(uploadId);

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
    console.error('Error processing PDF:', error);
    res.status(500).json({ error: error.message || 'Processing failed' });
  }
});

// GET /api/pets/:petId/pdf-import/uploads/:id/extraction - Get extraction results
router.get('/:petId/pdf-import/uploads/:id/extraction', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.petId);
    const uploadId = parseInt(req.params.id);

    const hasAccess = await userHasPetAccess(petId, req.userId!);
    if (!hasAccess) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }

    const upload = await getPdfUploadById(uploadId);
    if (!upload || upload.pet_id !== petId) {
      res.status(404).json({ error: 'Upload not found' });
      return;
    }

    const extraction = await getExtractionWithItems(uploadId);
    if (!extraction) {
      res.status(404).json({ error: 'No extraction found. Please process the PDF first.' });
      return;
    }

    res.json(extraction);
  } catch (error) {
    console.error('Error fetching extraction:', error);
    res.status(500).json({ error: 'Failed to fetch extraction' });
  }
});

// POST /api/pets/:petId/pdf-import/uploads/:id/extraction/approve - Approve extraction items
router.post('/:petId/pdf-import/uploads/:id/extraction/approve', authenticate, async (req: AuthRequest, res: Response) => {
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

    const upload = await getPdfUploadById(uploadId);
    if (!upload || upload.pet_id !== petId) {
      res.status(404).json({ error: 'Upload not found' });
      return;
    }

    const metadata = extractRequestMetadata(req);
    const result = await approveExtractionItems(uploadId, petId, itemIds, req.userId!, {
      ipAddress: metadata.ipAddress || undefined,
      userAgent: metadata.userAgent || undefined,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error approving extraction items:', error);
    res.status(500).json({ error: error.message || 'Approval failed' });
  }
});

// POST /api/pets/:petId/pdf-import/uploads/:id/extraction/reject - Reject extraction items
router.post('/:petId/pdf-import/uploads/:id/extraction/reject', authenticate, async (req: AuthRequest, res: Response) => {
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

    const upload = await getPdfUploadById(uploadId);
    if (!upload || upload.pet_id !== petId) {
      res.status(404).json({ error: 'Upload not found' });
      return;
    }

    const extraction = await getExtractionWithItems(uploadId);
    if (!extraction) {
      res.status(404).json({ error: 'No extraction found' });
      return;
    }

    const rejected = await rejectExtractionItems(extraction.extraction.id, itemIds, req.userId!);
    res.json({ rejected });
  } catch (error: any) {
    console.error('Error rejecting extraction items:', error);
    res.status(500).json({ error: error.message || 'Rejection failed' });
  }
});

// PATCH /api/pets/:petId/pdf-import/extraction-items/:itemId - Edit an extraction item
router.patch('/:petId/pdf-import/extraction-items/:itemId', authenticate, async (req: AuthRequest, res: Response) => {
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

    const updatedItem = await updateExtractionItemData(itemId, modifiedData);
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
