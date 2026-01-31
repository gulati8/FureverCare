import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { pool, query, queryOne } from '../db/pool.js';
import { config } from '../config/index.js';

export interface User {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  phone: string | null;
  is_admin: boolean;
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
