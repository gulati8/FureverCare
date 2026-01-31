import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { uploadPhoto } from '../middleware/upload.js';
import { storage } from '../services/storage.js';
import { findPetById, updatePet } from '../models/pet.js';

const router = Router();

// Upload pet photo
router.post('/pet/:petId/photo', authenticate, uploadPhoto.single('photo'), async (req: AuthRequest, res: Response) => {
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
      try {
        const oldKey = storage.extractKey(pet.photo_url);
        await storage.delete(oldKey, 'photos');
      } catch (err) {
        // Log but don't fail if old photo deletion fails
        console.error('Failed to delete old photo:', err);
      }
    }

    // Upload new photo using storage adapter
    const result = await storage.upload(req.file.buffer, {
      type: 'photos',
      petId,
      originalFilename: req.file.originalname,
      mimeType: req.file.mimetype,
    });

    // Update pet with new photo URL
    const updatedPet = await updatePet(petId, req.userId!, { photo_url: result.url });

    res.json({
      photo_url: result.url,
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
      try {
        const key = storage.extractKey(pet.photo_url);
        await storage.delete(key, 'photos');
      } catch (err) {
        console.error('Failed to delete photo file:', err);
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
