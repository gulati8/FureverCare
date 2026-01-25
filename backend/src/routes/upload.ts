import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { nanoid } from 'nanoid';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { findPetById, updatePet } from '../models/pet.js';

const router = Router();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for local storage
// In production, swap this for S3 storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${nanoid()}${ext}`;
    cb(null, filename);
  },
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Upload pet photo
router.post('/pet/:petId/photo', authenticate, upload.single('photo'), async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.petId);
    const pet = await findPetById(petId);

    if (!pet) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }

    // Check ownership (will be updated for multiple owners later)
    if (pet.user_id !== req.userId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    // Delete old photo if exists
    if (pet.photo_url) {
      const oldFilename = pet.photo_url.split('/').pop();
      if (oldFilename) {
        const oldPath = path.join(uploadsDir, oldFilename);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
    }

    // Generate URL for the uploaded file
    const photoUrl = `/uploads/${req.file.filename}`;

    // Update pet with new photo URL
    const updatedPet = await updatePet(petId, req.userId!, { photo_url: photoUrl });

    res.json({
      photo_url: photoUrl,
      pet: updatedPet,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Delete pet photo
router.delete('/pet/:petId/photo', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.petId);
    const pet = await findPetById(petId);

    if (!pet) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }

    if (pet.user_id !== req.userId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    if (pet.photo_url) {
      const filename = pet.photo_url.split('/').pop();
      if (filename) {
        const filePath = path.join(uploadsDir, filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }

    await updatePet(petId, req.userId!, { photo_url: '' });

    res.status(204).send();
  } catch (error) {
    console.error('Delete photo error:', error);
    res.status(500).json({ error: 'Delete failed' });
  }
});

export default router;
