import { nanoid } from 'nanoid';
import { query, queryOne } from '../db/pool.js';

export type PetRole = 'owner' | 'editor' | 'viewer';

export interface PetOwner {
  id: number;
  pet_id: number;
  user_id: number;
  role: PetRole;
  invited_by: number | null;
  invited_at: Date;
  accepted_at: Date | null;
}

export interface PetOwnerWithUser extends PetOwner {
  user_name: string;
  user_email: string;
}

export interface PetInvitation {
  id: number;
  pet_id: number;
  email: string;
  role: PetRole;
  invite_code: string;
  invited_by: number;
  created_at: Date;
  expires_at: Date;
  accepted_at: Date | null;
}

// Check if user has access to pet (any role)
export async function userHasPetAccess(petId: number, userId: number): Promise<boolean> {
  const result = await queryOne<{ count: string }>(
    'SELECT COUNT(*) as count FROM pet_owners WHERE pet_id = $1 AND user_id = $2 AND accepted_at IS NOT NULL',
    [petId, userId]
  );
  return result !== null && parseInt(result.count) > 0;
}

// Check if user can edit pet (owner or editor role)
export async function userCanEditPet(petId: number, userId: number): Promise<boolean> {
  const result = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM pet_owners
     WHERE pet_id = $1 AND user_id = $2 AND role IN ('owner', 'editor') AND accepted_at IS NOT NULL`,
    [petId, userId]
  );
  return result !== null && parseInt(result.count) > 0;
}

// Check if user is the original owner
export async function userIsPetOwner(petId: number, userId: number): Promise<boolean> {
  const result = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM pet_owners
     WHERE pet_id = $1 AND user_id = $2 AND role = 'owner' AND accepted_at IS NOT NULL`,
    [petId, userId]
  );
  return result !== null && parseInt(result.count) > 0;
}

// Get user's role for a pet
export async function getUserPetRole(petId: number, userId: number): Promise<PetRole | null> {
  const result = await queryOne<{ role: PetRole }>(
    'SELECT role FROM pet_owners WHERE pet_id = $1 AND user_id = $2 AND accepted_at IS NOT NULL',
    [petId, userId]
  );
  return result?.role || null;
}

// Get all owners/shared users for a pet
export async function getPetOwners(petId: number): Promise<PetOwnerWithUser[]> {
  return query<PetOwnerWithUser>(
    `SELECT po.*, u.name as user_name, u.email as user_email
     FROM pet_owners po
     JOIN users u ON u.id = po.user_id
     WHERE po.pet_id = $1 AND po.accepted_at IS NOT NULL
     ORDER BY po.role = 'owner' DESC, po.accepted_at ASC`,
    [petId]
  );
}

// Add a new owner/shared user directly (used when creating pet)
export async function addPetOwner(petId: number, userId: number, role: PetRole, invitedBy?: number): Promise<PetOwner> {
  const result = await queryOne<PetOwner>(
    `INSERT INTO pet_owners (pet_id, user_id, role, invited_by, accepted_at)
     VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
     RETURNING *`,
    [petId, userId, role, invitedBy || null]
  );
  return result!;
}

// Remove a shared user (cannot remove original owner)
export async function removePetOwner(petId: number, userIdToRemove: number, requestingUserId: number): Promise<boolean> {
  // Check if requesting user is the owner
  const isOwner = await userIsPetOwner(petId, requestingUserId);
  if (!isOwner) return false;

  // Cannot remove the original owner
  const targetIsOwner = await userIsPetOwner(petId, userIdToRemove);
  if (targetIsOwner) return false;

  await query(
    'DELETE FROM pet_owners WHERE pet_id = $1 AND user_id = $2',
    [petId, userIdToRemove]
  );
  return true;
}

// Update a shared user's role
export async function updatePetOwnerRole(petId: number, targetUserId: number, newRole: PetRole, requestingUserId: number): Promise<boolean> {
  // Only owner can change roles
  const isOwner = await userIsPetOwner(petId, requestingUserId);
  if (!isOwner) return false;

  // Cannot change original owner's role
  if (newRole !== 'owner') {
    const targetIsOwner = await userIsPetOwner(petId, targetUserId);
    if (targetIsOwner) return false;
  }

  await query(
    'UPDATE pet_owners SET role = $1 WHERE pet_id = $2 AND user_id = $3',
    [newRole, petId, targetUserId]
  );
  return true;
}

// Create an invitation
export async function createPetInvitation(petId: number, email: string, role: PetRole, invitedBy: number): Promise<PetInvitation> {
  const inviteCode = nanoid(32);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiration

  // Delete any existing pending invitations for this email and pet
  await query(
    'DELETE FROM pet_invitations WHERE pet_id = $1 AND email = $2 AND accepted_at IS NULL',
    [petId, email.toLowerCase()]
  );

  const result = await queryOne<PetInvitation>(
    `INSERT INTO pet_invitations (pet_id, email, role, invite_code, invited_by, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [petId, email.toLowerCase(), role, inviteCode, invitedBy, expiresAt]
  );
  return result!;
}

// Get pending invitations for a pet
export async function getPetInvitations(petId: number): Promise<PetInvitation[]> {
  return query<PetInvitation>(
    `SELECT * FROM pet_invitations
     WHERE pet_id = $1 AND accepted_at IS NULL AND expires_at > CURRENT_TIMESTAMP
     ORDER BY created_at DESC`,
    [petId]
  );
}

// Get invitation by code
export async function getInvitationByCode(inviteCode: string): Promise<PetInvitation | null> {
  return queryOne<PetInvitation>(
    `SELECT * FROM pet_invitations
     WHERE invite_code = $1 AND accepted_at IS NULL AND expires_at > CURRENT_TIMESTAMP`,
    [inviteCode]
  );
}

// Accept an invitation
export async function acceptInvitation(inviteCode: string, userId: number): Promise<boolean> {
  const invitation = await getInvitationByCode(inviteCode);
  if (!invitation) return false;

  // Check if user already has access
  const hasAccess = await userHasPetAccess(invitation.pet_id, userId);
  if (hasAccess) {
    // Mark invitation as accepted anyway
    await query(
      'UPDATE pet_invitations SET accepted_at = CURRENT_TIMESTAMP WHERE id = $1',
      [invitation.id]
    );
    return true;
  }

  // Add user as pet owner
  await addPetOwner(invitation.pet_id, userId, invitation.role, invitation.invited_by);

  // Mark invitation as accepted
  await query(
    'UPDATE pet_invitations SET accepted_at = CURRENT_TIMESTAMP WHERE id = $1',
    [invitation.id]
  );

  return true;
}

// Delete/cancel an invitation
export async function deleteInvitation(invitationId: number, petId: number): Promise<boolean> {
  await query(
    'DELETE FROM pet_invitations WHERE id = $1 AND pet_id = $2',
    [invitationId, petId]
  );
  return true;
}

// Get all pets a user has access to (replaces the old findPetsByUserId)
export async function getPetsForUser(userId: number): Promise<number[]> {
  const results = await query<{ pet_id: number }>(
    'SELECT pet_id FROM pet_owners WHERE user_id = $1 AND accepted_at IS NOT NULL',
    [userId]
  );
  return results.map(r => r.pet_id);
}
