import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import { prisma } from '../db/prisma.js';

export interface ShareToken {
  id: number;
  pet_id: number;
  token: string;
  label: string | null;
  pin_hash: string | null;
  expires_at: Date | null;
  created_by: number;
  created_at: Date;
  access_count: number;
  last_accessed_at: Date | null;
  is_active: boolean;
}

export interface CreateShareTokenInput {
  pet_id: number;
  created_by: number;
  label?: string;
  pin?: string;
  expires_in_hours?: number;
}

export interface ShareTokenPublic {
  id: number;
  token: string;
  label: string | null;
  has_pin: boolean;
  expires_at: Date | null;
  created_at: Date;
  access_count: number;
  last_accessed_at: Date | null;
  is_active: boolean;
  is_expired: boolean;
}

export async function createShareToken(input: CreateShareTokenInput): Promise<ShareToken> {
  const token = nanoid(32);
  const pinHash = input.pin ? await bcrypt.hash(input.pin, 10) : null;

  let expiresAt: Date | null = null;
  if (input.expires_in_hours) {
    expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + input.expires_in_hours);
  }

  const result = await prisma.share_tokens.create({
    data: {
      pet_id: input.pet_id,
      token,
      label: input.label || null,
      pin_hash: pinHash,
      expires_at: expiresAt,
      created_by: input.created_by,
    },
  });

  return result as ShareToken;
}

export async function findShareTokenByToken(token: string): Promise<ShareToken | null> {
  return prisma.share_tokens.findUnique({
    where: {
      token,
    },
  }) as Promise<ShareToken | null>;
}

export async function findShareTokenById(id: number): Promise<ShareToken | null> {
  return prisma.share_tokens.findUnique({
    where: {
      id,
    },
  }) as Promise<ShareToken | null>;
}

export async function findShareTokensByPetId(petId: number): Promise<ShareToken[]> {
  return prisma.share_tokens.findMany({
    where: {
      pet_id: petId,
    },
    orderBy: {
      created_at: 'desc',
    },
  }) as Promise<ShareToken[]>;
}

export async function updateShareTokenAccess(token: string): Promise<void> {
  await prisma.share_tokens.updateMany({
    where: {
      token,
    },
    data: {
      access_count: {
        increment: 1,
      },
      last_accessed_at: new Date(),
    },
  });
}

export async function deactivateShareToken(id: number, userId: number): Promise<boolean> {
  const result = await prisma.share_tokens.updateMany({
    where: {
      id,
      created_by: userId,
    },
    data: {
      is_active: false,
    },
  });
  return result.count > 0;
}

export async function deleteShareToken(id: number, userId: number): Promise<boolean> {
  const result = await prisma.share_tokens.deleteMany({
    where: {
      id,
      created_by: userId,
    },
  });
  return result.count > 0;
}

export async function verifyShareTokenPin(token: string, pin: string): Promise<boolean> {
  const shareToken = await findShareTokenByToken(token);
  if (!shareToken || !shareToken.pin_hash) {
    return false;
  }
  return bcrypt.compare(pin, shareToken.pin_hash);
}

export function isShareTokenExpired(shareToken: ShareToken): boolean {
  if (!shareToken.expires_at) return false;
  return new Date() > new Date(shareToken.expires_at);
}

export function isShareTokenValid(shareToken: ShareToken): boolean {
  return shareToken.is_active && !isShareTokenExpired(shareToken);
}

export function toPublicShareToken(shareToken: ShareToken): ShareTokenPublic {
  return {
    id: shareToken.id,
    token: shareToken.token,
    label: shareToken.label,
    has_pin: shareToken.pin_hash !== null,
    expires_at: shareToken.expires_at,
    created_at: shareToken.created_at,
    access_count: shareToken.access_count,
    last_accessed_at: shareToken.last_accessed_at,
    is_active: shareToken.is_active,
    is_expired: isShareTokenExpired(shareToken),
  };
}
