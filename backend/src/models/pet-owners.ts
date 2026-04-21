import { nanoid } from 'nanoid';
import { prisma } from '../db/prisma.js';

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
  const count = await prisma.pet_owners.count({
    where: {
      pet_id: petId,
      user_id: userId,
      accepted_at: {
        not: null,
      },
    },
  });
  return count > 0;
}

// Check if user can edit pet (owner or editor role)
export async function userCanEditPet(petId: number, userId: number): Promise<boolean> {
  const count = await prisma.pet_owners.count({
    where: {
      pet_id: petId,
      user_id: userId,
      role: {
        in: ['owner', 'editor'],
      },
      accepted_at: {
        not: null,
      },
    },
  });
  return count > 0;
}

// Check if user is the original owner
export async function userIsPetOwner(petId: number, userId: number): Promise<boolean> {
  const count = await prisma.pet_owners.count({
    where: {
      pet_id: petId,
      user_id: userId,
      role: 'owner',
      accepted_at: {
        not: null,
      },
    },
  });
  return count > 0;
}

// Get user's role for a pet
export async function getUserPetRole(petId: number, userId: number): Promise<PetRole | null> {
  const result = await prisma.pet_owners.findFirst({
    where: {
      pet_id: petId,
      user_id: userId,
      accepted_at: {
        not: null,
      },
    },
    select: {
      role: true,
    },
  });
  return (result?.role as PetRole | undefined) || null;
}

// Get all owners/shared users for a pet
export async function getPetOwners(petId: number): Promise<PetOwnerWithUser[]> {
  const owners = await prisma.pet_owners.findMany({
    where: {
      pet_id: petId,
      accepted_at: {
        not: null,
      },
    },
    include: {
      users_pet_owners_user_idTousers: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  return owners
    .map((owner) => ({
      ...owner,
      user_name: owner.users_pet_owners_user_idTousers.name,
      user_email: owner.users_pet_owners_user_idTousers.email,
    }))
    .sort((a, b) => {
      if (a.role === 'owner' && b.role !== 'owner') {
        return -1;
      }
      if (a.role !== 'owner' && b.role === 'owner') {
        return 1;
      }
      return a.accepted_at!.getTime() - b.accepted_at!.getTime();
    }) as PetOwnerWithUser[];
}

// Add a new owner/shared user directly (used when creating pet)
export async function addPetOwner(petId: number, userId: number, role: PetRole, invitedBy?: number): Promise<PetOwner> {
  const result = await prisma.pet_owners.create({
    data: {
      pet_id: petId,
      user_id: userId,
      role,
      invited_by: invitedBy || null,
      accepted_at: new Date(),
    },
  });
  return result as PetOwner;
}

// Remove a shared user (cannot remove original owner)
export async function removePetOwner(petId: number, userIdToRemove: number, requestingUserId: number): Promise<boolean> {
  // Check if requesting user is the owner
  const isOwner = await userIsPetOwner(petId, requestingUserId);
  if (!isOwner) return false;

  // Cannot remove the original owner
  const targetIsOwner = await userIsPetOwner(petId, userIdToRemove);
  if (targetIsOwner) return false;

  const result = await prisma.pet_owners.deleteMany({
    where: {
      pet_id: petId,
      user_id: userIdToRemove,
    },
  });
  return result.count > 0;
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

  const result = await prisma.pet_owners.updateMany({
    where: {
      pet_id: petId,
      user_id: targetUserId,
    },
    data: {
      role: newRole,
    },
  });
  return result.count > 0;
}

// Create an invitation
export async function createPetInvitation(petId: number, email: string, role: PetRole, invitedBy: number): Promise<PetInvitation> {
  const inviteCode = nanoid(32);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiration

  // Delete any existing pending invitations for this email and pet
  await prisma.pet_invitations.deleteMany({
    where: {
      pet_id: petId,
      email: email.toLowerCase(),
      accepted_at: null,
    },
  });

  const result = await prisma.pet_invitations.create({
    data: {
      pet_id: petId,
      email: email.toLowerCase(),
      role,
      invite_code: inviteCode,
      invited_by: invitedBy,
      expires_at: expiresAt,
    },
  });
  return result as PetInvitation;
}

// Get pending invitations for a pet
export async function getPetInvitations(petId: number): Promise<PetInvitation[]> {
  return prisma.pet_invitations.findMany({
    where: {
      pet_id: petId,
      accepted_at: null,
      expires_at: {
        gt: new Date(),
      },
    },
    orderBy: {
      created_at: 'desc',
    },
  }) as Promise<PetInvitation[]>;
}

// Get invitation by code
export async function getInvitationByCode(inviteCode: string): Promise<PetInvitation | null> {
  return prisma.pet_invitations.findFirst({
    where: {
      invite_code: inviteCode,
      accepted_at: null,
      expires_at: {
        gt: new Date(),
      },
    },
  }) as Promise<PetInvitation | null>;
}

// Accept an invitation
export async function acceptInvitation(inviteCode: string, userId: number): Promise<boolean> {
  const invitation = await getInvitationByCode(inviteCode);
  if (!invitation) return false;

  // Check if user already has access
  const hasAccess = await userHasPetAccess(invitation.pet_id, userId);
  if (hasAccess) {
    // Mark invitation as accepted anyway
    await prisma.pet_invitations.update({
      where: {
        id: invitation.id,
      },
      data: {
        accepted_at: new Date(),
      },
    });
    return true;
  }

  // Add user as pet owner
  await addPetOwner(invitation.pet_id, userId, invitation.role, invitation.invited_by);

  // Mark invitation as accepted
  await prisma.pet_invitations.update({
    where: {
      id: invitation.id,
    },
    data: {
      accepted_at: new Date(),
    },
  });

  return true;
}

// Delete/cancel an invitation
export async function deleteInvitation(invitationId: number, petId: number): Promise<boolean> {
  const result = await prisma.pet_invitations.deleteMany({
    where: {
      id: invitationId,
      pet_id: petId,
    },
  });
  return result.count > 0;
}

export interface PendingInvitationForUser {
  id: number;
  pet_id: number;
  pet_name: string;
  inviter_name: string;
  role: PetRole;
  invite_code: string;
  expires_at: Date;
  created_at: Date;
}

// Get pending invitations for a user by their email address
export async function getPendingInvitationsForEmail(email: string): Promise<PendingInvitationForUser[]> {
  const invitations = await prisma.pet_invitations.findMany({
    where: {
      email: email.toLowerCase(),
      accepted_at: null,
      expires_at: {
        gt: new Date(),
      },
    },
    include: {
      pets: {
        select: {
          name: true,
        },
      },
      users: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      created_at: 'desc',
    },
  });

  return invitations.map((invitation) => ({
    id: invitation.id,
    pet_id: invitation.pet_id,
    pet_name: invitation.pets.name,
    inviter_name: invitation.users.name,
    role: invitation.role as PetRole,
    invite_code: invitation.invite_code,
    expires_at: invitation.expires_at,
    created_at: invitation.created_at!,
  }));
}

// Get all pets a user has access to (replaces the old findPetsByUserId)
export async function getPetsForUser(userId: number): Promise<number[]> {
  const results = await prisma.pet_owners.findMany({
    where: {
      user_id: userId,
      accepted_at: {
        not: null,
      },
    },
    select: {
      pet_id: true,
    },
  });
  return results.map((result) => result.pet_id);
}
