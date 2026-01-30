import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { userHasPetAccess, userIsPetOwner } from '../models/pet-owners.js';
import {
  createShareToken,
  findShareTokensByPetId,
  findShareTokenById,
  deactivateShareToken,
  deleteShareToken,
  toPublicShareToken,
} from '../models/share-tokens.js';

const router = Router();

// Validation schemas
const createShareTokenSchema = z.object({
  label: z.string().max(100).optional(),
  pin: z.string().min(4).max(20).optional(),
  expires_in_hours: z.number().int().positive().max(8760).optional(), // max 1 year
});

// GET /pets/:petId/share-tokens - List all share tokens for a pet
router.get('/pets/:petId/share-tokens', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.petId);

    // Verify user has access to this pet
    const hasAccess = await userHasPetAccess(petId, req.userId!);
    if (!hasAccess) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }

    const tokens = await findShareTokensByPetId(petId);
    res.json(tokens.map(toPublicShareToken));
  } catch (error) {
    console.error('Error fetching share tokens:', error);
    res.status(500).json({ error: 'Failed to fetch share tokens' });
  }
});

// POST /pets/:petId/share-tokens - Create a new share token
router.post('/pets/:petId/share-tokens', authenticate, validate(createShareTokenSchema), async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.petId);

    // Only owners can create share tokens
    const isOwner = await userIsPetOwner(petId, req.userId!);
    if (!isOwner) {
      res.status(403).json({ error: 'Only pet owners can create share tokens' });
      return;
    }

    const { label, pin, expires_in_hours } = req.body;

    const token = await createShareToken({
      pet_id: petId,
      created_by: req.userId!,
      label,
      pin,
      expires_in_hours,
    });

    res.status(201).json(toPublicShareToken(token));
  } catch (error) {
    console.error('Error creating share token:', error);
    res.status(500).json({ error: 'Failed to create share token' });
  }
});

// DELETE /pets/:petId/share-tokens/:tokenId - Deactivate a share token
router.delete('/pets/:petId/share-tokens/:tokenId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.petId);
    const tokenId = parseInt(req.params.tokenId);

    // Verify the token belongs to this pet and user owns it
    const token = await findShareTokenById(tokenId);
    if (!token || token.pet_id !== petId) {
      res.status(404).json({ error: 'Share token not found' });
      return;
    }

    const deleted = await deleteShareToken(tokenId, req.userId!);
    if (!deleted) {
      res.status(403).json({ error: 'Not authorized to delete this token' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting share token:', error);
    res.status(500).json({ error: 'Failed to delete share token' });
  }
});

// PATCH /pets/:petId/share-tokens/:tokenId/deactivate - Deactivate without deleting
router.patch('/pets/:petId/share-tokens/:tokenId/deactivate', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.petId);
    const tokenId = parseInt(req.params.tokenId);

    // Verify the token belongs to this pet
    const token = await findShareTokenById(tokenId);
    if (!token || token.pet_id !== petId) {
      res.status(404).json({ error: 'Share token not found' });
      return;
    }

    const deactivated = await deactivateShareToken(tokenId, req.userId!);
    if (!deactivated) {
      res.status(403).json({ error: 'Not authorized to deactivate this token' });
      return;
    }

    const updated = await findShareTokenById(tokenId);
    res.json(toPublicShareToken(updated!));
  } catch (error) {
    console.error('Error deactivating share token:', error);
    res.status(500).json({ error: 'Failed to deactivate share token' });
  }
});

export default router;
