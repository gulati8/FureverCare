import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import { query, queryOne } from '../db/pool.js';

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

  const result = await queryOne<ShareToken>(
    `INSERT INTO share_tokens (pet_id, token, label, pin_hash, expires_at, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [input.pet_id, token, input.label || null, pinHash, expiresAt, input.created_by]
  );

  return result!;
}

export async function findShareTokenByToken(token: string): Promise<ShareToken | null> {
  return queryOne<ShareToken>('SELECT * FROM share_tokens WHERE token = $1', [token]);
}

export async function findShareTokenById(id: number): Promise<ShareToken | null> {
  return queryOne<ShareToken>('SELECT * FROM share_tokens WHERE id = $1', [id]);
}

export async function findShareTokensByPetId(petId: number): Promise<ShareToken[]> {
  return query<ShareToken>(
    'SELECT * FROM share_tokens WHERE pet_id = $1 ORDER BY created_at DESC',
    [petId]
  );
}

export async function updateShareTokenAccess(token: string): Promise<void> {
  await queryOne(
    `UPDATE share_tokens
     SET access_count = access_count + 1, last_accessed_at = CURRENT_TIMESTAMP
     WHERE token = $1`,
    [token]
  );
}

export async function deactivateShareToken(id: number, userId: number): Promise<boolean> {
  const result = await queryOne<ShareToken>(
    `UPDATE share_tokens SET is_active = false
     WHERE id = $1 AND created_by = $2
     RETURNING *`,
    [id, userId]
  );
  return result !== null;
}

export async function deleteShareToken(id: number, userId: number): Promise<boolean> {
  const result = await queryOne<{ id: number }>(
    'DELETE FROM share_tokens WHERE id = $1 AND created_by = $2 RETURNING id',
    [id, userId]
  );
  return result !== null;
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
