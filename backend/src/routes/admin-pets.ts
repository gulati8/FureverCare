import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { validate } from '../middleware/validate.js';
import {
  findAllPetsWithPagination,
  findPetByIdWithDetails,
  PetsFilterOptions,
} from '../models/admin.js';

const router = Router();

// ============ Validation Schemas ============

const getPetsQuerySchema = z.object({
  limit: z.string().optional().transform((val) => parseInt(val || '25')),
  offset: z.string().optional().transform((val) => parseInt(val || '0')),
  sortBy: z.enum(['id', 'name', 'species', 'created_at', 'owner_name', 'share_count']).optional().default('id'),
  sortOrder: z.enum(['ASC', 'DESC']).optional().default('DESC'),
  search: z.string().optional(),
  species: z.string().optional(),
  createdAfter: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  createdBefore: z.string().optional().transform((val) => val ? new Date(val) : undefined),
});

// ============ Routes ============

// GET /api/admin/pets - Get all pets with pagination and filters
router.get('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const params = getPetsQuerySchema.parse(req.query);

    const options: PetsFilterOptions = {
      limit: params.limit,
      offset: params.offset,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      search: params.search,
      species: params.species,
      createdAfter: params.createdAfter,
      createdBefore: params.createdBefore,
    };

    const result = await findAllPetsWithPagination(options);
    res.json(result);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
      return;
    }
    console.error('Error fetching pets:', error);
    res.status(500).json({ error: 'Failed to fetch pets' });
  }
});

// GET /api/admin/pets/:id - Get pet by ID with full details
router.get('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.id);

    if (isNaN(petId)) {
      res.status(400).json({ error: 'Invalid pet ID' });
      return;
    }

    const pet = await findPetByIdWithDetails(petId);

    if (!pet) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }

    res.json(pet);
  } catch (error) {
    console.error('Error fetching pet:', error);
    res.status(500).json({ error: 'Failed to fetch pet' });
  }
});

export default router;
