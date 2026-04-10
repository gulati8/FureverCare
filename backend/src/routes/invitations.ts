import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { getPendingInvitationsForEmail } from '../models/pet-owners.js';

const router = Router();

// GET /api/invitations - Get pending invitations for the authenticated user
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const invitations = await getPendingInvitationsForEmail(req.user!.email);
    res.json(invitations);
  } catch (error) {
    console.error('Error fetching pending invitations:', error);
    res.status(500).json({ error: 'Failed to fetch pending invitations' });
  }
});

export default router;
