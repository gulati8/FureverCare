import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { requireFeature } from '../middleware/subscription.js';
import { findPetById } from '../models/pet.js';
import { findUserByEmail } from '../models/user.js';
import {
  userIsPetOwner,
  userHasPetAccess,
  getPetOwners,
  removePetOwner,
  updatePetOwnerRole,
  createPetInvitation,
  getPetInvitations,
  getInvitationByCode,
  acceptInvitation,
  deleteInvitation,
  PetRole,
} from '../models/pet-owners.js';

const router = Router();

// Validation schemas
const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['editor', 'viewer']).default('viewer'),
});

const updateRoleSchema = z.object({
  role: z.enum(['editor', 'viewer']),
});

// GET /owners/pets/:petId - Get all owners/shared users for a pet
router.get('/pets/:petId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.petId);

    // Check if user has access to this pet
    const hasAccess = await userHasPetAccess(petId, req.userId!);
    if (!hasAccess) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }

    const owners = await getPetOwners(petId);
    const invitations = await getPetInvitations(petId);

    // Only show invitations to owner
    const isOwner = await userIsPetOwner(petId, req.userId!);

    res.json({
      owners,
      invitations: isOwner ? invitations : [],
      isOwner,
    });
  } catch (error) {
    console.error('Error fetching pet owners:', error);
    res.status(500).json({ error: 'Failed to fetch pet owners' });
  }
});

// POST /owners/pets/:petId/invite - Invite someone to share pet access
router.post('/pets/:petId/invite', authenticate, requireFeature('shared_ownership'), validate(inviteSchema), async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.petId);
    const { email, role } = req.body;

    // Only owner can invite
    const isOwner = await userIsPetOwner(petId, req.userId!);
    if (!isOwner) {
      res.status(403).json({ error: 'Only the pet owner can invite others' });
      return;
    }

    // Check if email is already a shared user
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      const hasAccess = await userHasPetAccess(petId, existingUser.id);
      if (hasAccess) {
        res.status(400).json({ error: 'This user already has access to this pet' });
        return;
      }
    }

    const pet = await findPetById(petId);
    const invitation = await createPetInvitation(petId, email, role as PetRole, req.userId!);

    // In a real app, you'd send an email here
    // For now, we return the invite code that can be shared manually
    const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invite/${invitation.invite_code}`;

    res.status(201).json({
      invitation,
      inviteUrl,
      message: `Invitation created. Share this link with ${email}: ${inviteUrl}`,
    });
  } catch (error) {
    console.error('Error creating invitation:', error);
    res.status(500).json({ error: 'Failed to create invitation' });
  }
});

// DELETE /owners/pets/:petId/invite/:invitationId - Cancel an invitation
router.delete('/pets/:petId/invite/:invitationId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.petId);
    const invitationId = parseInt(req.params.invitationId);

    const isOwner = await userIsPetOwner(petId, req.userId!);
    if (!isOwner) {
      res.status(403).json({ error: 'Only the pet owner can cancel invitations' });
      return;
    }

    await deleteInvitation(invitationId, petId);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting invitation:', error);
    res.status(500).json({ error: 'Failed to delete invitation' });
  }
});

// POST /owners/accept/:inviteCode - Accept an invitation
router.post('/accept/:inviteCode', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { inviteCode } = req.params;

    const invitation = await getInvitationByCode(inviteCode);
    if (!invitation) {
      res.status(404).json({ error: 'Invalid or expired invitation' });
      return;
    }

    const success = await acceptInvitation(inviteCode, req.userId!);
    if (!success) {
      res.status(400).json({ error: 'Failed to accept invitation' });
      return;
    }

    const pet = await findPetById(invitation.pet_id);

    res.json({
      message: 'Invitation accepted',
      pet,
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(500).json({ error: 'Failed to accept invitation' });
  }
});

// GET /owners/invite/:inviteCode - Get invitation details (for preview before accepting)
router.get('/invite/:inviteCode', async (req, res: Response) => {
  try {
    const { inviteCode } = req.params;

    const invitation = await getInvitationByCode(inviteCode);
    if (!invitation) {
      res.status(404).json({ error: 'Invalid or expired invitation' });
      return;
    }

    const pet = await findPetById(invitation.pet_id);

    res.json({
      petName: pet?.name,
      role: invitation.role,
      expiresAt: invitation.expires_at,
    });
  } catch (error) {
    console.error('Error fetching invitation:', error);
    res.status(500).json({ error: 'Failed to fetch invitation' });
  }
});

// PATCH /owners/pets/:petId/users/:userId - Update a shared user's role
router.patch('/pets/:petId/users/:userId', authenticate, validate(updateRoleSchema), async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.petId);
    const targetUserId = parseInt(req.params.userId);
    const { role } = req.body;

    const success = await updatePetOwnerRole(petId, targetUserId, role as PetRole, req.userId!);
    if (!success) {
      res.status(403).json({ error: 'Not authorized to update role' });
      return;
    }

    res.json({ message: 'Role updated' });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// DELETE /owners/pets/:petId/users/:userId - Remove a shared user
router.delete('/pets/:petId/users/:userId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.petId);
    const targetUserId = parseInt(req.params.userId);

    const success = await removePetOwner(petId, targetUserId, req.userId!);
    if (!success) {
      res.status(403).json({ error: 'Not authorized to remove user' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error removing user:', error);
    res.status(500).json({ error: 'Failed to remove user' });
  }
});

// DELETE /owners/pets/:petId/leave - Leave a shared pet (remove self)
router.delete('/pets/:petId/leave', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.petId);

    // Cannot leave if you're the owner
    const isOwner = await userIsPetOwner(petId, req.userId!);
    if (isOwner) {
      res.status(400).json({ error: 'Owner cannot leave their own pet. Transfer ownership or delete the pet instead.' });
      return;
    }

    // Check if user has access
    const hasAccess = await userHasPetAccess(petId, req.userId!);
    if (!hasAccess) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }

    // Remove self
    await removePetOwner(petId, req.userId!, req.userId!);

    res.status(204).send();
  } catch (error) {
    console.error('Error leaving pet:', error);
    res.status(500).json({ error: 'Failed to leave pet' });
  }
});

export default router;
