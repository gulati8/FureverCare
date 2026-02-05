import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { validate } from '../middleware/validate.js';
import {
  findAllUsersWithPagination,
  findUserByIdWithStats,
  findUserPets,
  UsersFilterOptions,
} from '../models/admin.js';

const router = Router();

// ============ Validation Schemas ============

const getUsersQuerySchema = z.object({
  limit: z.string().optional().transform((val) => parseInt(val || '25')),
  offset: z.string().optional().transform((val) => parseInt(val || '0')),
  sortBy: z.enum(['id', 'name', 'email', 'is_admin', 'subscription_status', 'subscription_tier', 'created_at', 'owned_pet_count', 'shared_pet_count']).optional().default('id'),
  sortOrder: z.enum(['ASC', 'DESC']).optional().default('DESC'),
  search: z.string().optional(),
  isAdmin: z.string().optional().transform((val) => val === 'true' ? true : val === 'false' ? false : undefined),
  createdAfter: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  createdBefore: z.string().optional().transform((val) => val ? new Date(val) : undefined),
});

// ============ Routes ============

// GET /api/admin/users - Get all users with pagination and filters
router.get('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const params = getUsersQuerySchema.parse(req.query);

    const options: UsersFilterOptions = {
      limit: params.limit,
      offset: params.offset,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      search: params.search,
      isAdmin: params.isAdmin,
      createdAfter: params.createdAfter,
      createdBefore: params.createdBefore,
    };

    const result = await findAllUsersWithPagination(options);
    res.json(result);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
      return;
    }
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/admin/users/:id - Get user by ID with stats
router.get('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    const user = await findUserByIdWithStats(userId);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// GET /api/admin/users/:id/pets - Get user's pets
router.get('/:id/pets', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    const pets = await findUserPets(userId);
    res.json(pets);
  } catch (error) {
    console.error('Error fetching user pets:', error);
    res.status(500).json({ error: 'Failed to fetch user pets' });
  }
});

export default router;
