import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { pool, query, queryOne } from '../db/pool.js';
import { config } from '../config/index.js';

export type SubscriptionStatus = 'free' | 'trialing' | 'active' | 'past_due' | 'canceled';
export type SubscriptionTier = 'free' | 'premium';

export interface User {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  phone: string | null;
  is_admin: boolean;
  stripe_customer_id: string | null;
  subscription_status: SubscriptionStatus;
  subscription_tier: SubscriptionTier;
  subscription_current_period_end: Date | null;
  subscription_stripe_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const passwordHash = await bcrypt.hash(input.password, 12);

  const result = await queryOne<User>(
    `INSERT INTO users (email, password_hash, name, phone)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.email.toLowerCase(), passwordHash, input.name, input.phone || null]
  );

  return result!;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  return queryOne<User>(
    'SELECT * FROM users WHERE email = $1',
    [email.toLowerCase()]
  );
}

export async function findUserById(id: number): Promise<User | null> {
  return queryOne<User>(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
}

export async function verifyPassword(user: User, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.password_hash);
}

export async function updateUser(id: number, updates: Partial<Pick<User, 'name' | 'phone'>>): Promise<User | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (updates.name !== undefined) {
    fields.push(`name = $${paramCount++}`);
    values.push(updates.name);
  }
  if (updates.phone !== undefined) {
    fields.push(`phone = $${paramCount++}`);
    values.push(updates.phone);
  }

  if (fields.length === 0) return findUserById(id);

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  return queryOne<User>(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    values
  );
}

// Password reset functions

export interface PasswordResetToken {
  id: number;
  user_id: number;
  token: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
}

export async function createPasswordResetToken(userId: number): Promise<string> {
  // Invalidate any existing unused tokens for this user
  await query(
    `UPDATE password_reset_tokens
     SET used_at = CURRENT_TIMESTAMP
     WHERE user_id = $1 AND used_at IS NULL`,
    [userId]
  );

  // Generate a secure random token
  const token = crypto.randomBytes(32).toString('hex');

  // Calculate expiry time
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + config.passwordReset.tokenExpiryMinutes);

  await query(
    `INSERT INTO password_reset_tokens (user_id, token, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, token, expiresAt]
  );

  return token;
}

export async function findValidPasswordResetToken(token: string): Promise<PasswordResetToken | null> {
  return queryOne<PasswordResetToken>(
    `SELECT * FROM password_reset_tokens
     WHERE token = $1
       AND expires_at > CURRENT_TIMESTAMP
       AND used_at IS NULL`,
    [token]
  );
}

export async function usePasswordResetToken(token: string): Promise<boolean> {
  const result = await pool.query(
    `UPDATE password_reset_tokens
     SET used_at = CURRENT_TIMESTAMP
     WHERE token = $1
       AND expires_at > CURRENT_TIMESTAMP
       AND used_at IS NULL`,
    [token]
  );

  return (result.rowCount ?? 0) > 0;
}

export async function updateUserPassword(userId: number, newPassword: string): Promise<boolean> {
  const passwordHash = await bcrypt.hash(newPassword, 12);

  const result = await pool.query(
    `UPDATE users
     SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [passwordHash, userId]
  );

  return (result.rowCount ?? 0) > 0;
}

// Subscription-related functions

export interface SubscriptionUpdates {
  stripe_customer_id?: string;
  subscription_status?: SubscriptionStatus;
  subscription_tier?: SubscriptionTier;
  subscription_current_period_end?: Date | null;
  subscription_stripe_id?: string | null;
}

export interface SubscriptionInfo {
  subscription_status: SubscriptionStatus;
  subscription_tier: SubscriptionTier;
  subscription_current_period_end: Date | null;
  subscription_stripe_id: string | null;
  stripe_customer_id: string | null;
}

export async function updateSubscription(userId: number, updates: SubscriptionUpdates): Promise<User> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (updates.stripe_customer_id !== undefined) {
    fields.push(`stripe_customer_id = $${paramCount++}`);
    values.push(updates.stripe_customer_id);
  }
  if (updates.subscription_status !== undefined) {
    fields.push(`subscription_status = $${paramCount++}`);
    values.push(updates.subscription_status);
  }
  if (updates.subscription_tier !== undefined) {
    fields.push(`subscription_tier = $${paramCount++}`);
    values.push(updates.subscription_tier);
  }
  if (updates.subscription_current_period_end !== undefined) {
    fields.push(`subscription_current_period_end = $${paramCount++}`);
    values.push(updates.subscription_current_period_end);
  }
  if (updates.subscription_stripe_id !== undefined) {
    fields.push(`subscription_stripe_id = $${paramCount++}`);
    values.push(updates.subscription_stripe_id);
  }

  if (fields.length === 0) {
    const user = await findUserById(userId);
    if (!user) throw new Error('User not found');
    return user;
  }

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(userId);

  const result = await queryOne<User>(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    values
  );

  if (!result) throw new Error('User not found');
  return result;
}

export async function findUserByStripeCustomerId(stripeCustomerId: string): Promise<User | null> {
  return queryOne<User>(
    'SELECT * FROM users WHERE stripe_customer_id = $1',
    [stripeCustomerId]
  );
}

export async function getUserSubscriptionInfo(userId: number): Promise<SubscriptionInfo> {
  const result = await queryOne<SubscriptionInfo>(
    `SELECT subscription_status, subscription_tier, subscription_current_period_end,
            subscription_stripe_id, stripe_customer_id
     FROM users WHERE id = $1`,
    [userId]
  );

  if (!result) {
    return {
      subscription_status: 'free',
      subscription_tier: 'free',
      subscription_current_period_end: null,
      subscription_stripe_id: null,
      stripe_customer_id: null,
    };
  }

  return result;
}

const FREE_TIER_PET_LIMIT = 1;
const PREMIUM_FEATURES = ['upload', 'timeline', 'shared_ownership'];

export async function canUserAddPet(userId: number): Promise<{allowed: boolean, reason?: string, petCount: number, limit: number}> {
  const user = await findUserById(userId);
  if (!user) {
    return { allowed: false, reason: 'User not found', petCount: 0, limit: 0 };
  }

  // Premium users have unlimited pets
  if (user.subscription_tier === 'premium') {
    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM pets WHERE user_id = $1`,
      [userId]
    );
    const petCount = parseInt(countResult?.count || '0', 10);
    return { allowed: true, petCount, limit: Infinity };
  }

  // Free tier users have a pet limit
  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM pets WHERE user_id = $1`,
    [userId]
  );
  const petCount = parseInt(countResult?.count || '0', 10);

  if (petCount >= FREE_TIER_PET_LIMIT) {
    return {
      allowed: false,
      reason: `Free tier limited to ${FREE_TIER_PET_LIMIT} pet. Upgrade to premium for unlimited pets.`,
      petCount,
      limit: FREE_TIER_PET_LIMIT,
    };
  }

  return { allowed: true, petCount, limit: FREE_TIER_PET_LIMIT };
}

export async function canUserUseFeature(userId: number, feature: string): Promise<boolean> {
  // If not a premium feature, allow all users
  if (!PREMIUM_FEATURES.includes(feature)) {
    return true;
  }

  const user = await findUserById(userId);
  if (!user) {
    return false;
  }

  // Premium tier users can use all features
  return user.subscription_tier === 'premium';
}
