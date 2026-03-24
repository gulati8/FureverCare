import { redis } from '../db/redis.js';
import { query, queryOne } from '../db/pool.js';
import { findUserById } from '../models/user.js';

const IMPERSONATION_TTL = 300; // 5 minutes

interface ImpersonationSession {
  id: number;
  admin_id: number;
  target_user_id: number;
  started_at: string;
  ended_at: string | null;
  ended_reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
}

interface RedisImpersonationData {
  targetUserId: number;
  sessionId: number;
  startedAt: string;
}

export async function startImpersonation(
  adminId: number,
  targetUserId: number,
  ipAddress: string | null,
  userAgent: string | null
): Promise<{ sessionId: number }> {
  // Check target exists and is not admin
  const targetUser = await findUserById(targetUserId);
  if (!targetUser) {
    throw new Error('User not found');
  }
  if (targetUser.is_admin) {
    throw new Error('Cannot impersonate admin users');
  }

  // Check not already impersonating
  const existing = await redis.get(`impersonate:${adminId}`);
  if (existing) {
    throw new Error('Already impersonating a user. Stop current session first.');
  }

  // Create session record
  const rows = await query<ImpersonationSession>(
    `INSERT INTO impersonation_sessions (admin_id, target_user_id, ip_address, user_agent)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [adminId, targetUserId, ipAddress, userAgent]
  );
  const session = rows[0];

  // Set Redis key with TTL
  const data: RedisImpersonationData = {
    targetUserId,
    sessionId: session.id,
    startedAt: session.started_at,
  };
  await redis.setex(`impersonate:${adminId}`, IMPERSONATION_TTL, JSON.stringify(data));

  return { sessionId: session.id };
}

export async function stopImpersonation(adminId: number): Promise<void> {
  // Get session info from Redis before deleting
  const data = await redis.get(`impersonate:${adminId}`);
  await redis.del(`impersonate:${adminId}`);

  if (data) {
    const { sessionId } = JSON.parse(data) as RedisImpersonationData;
    await query(
      `UPDATE impersonation_sessions SET ended_at = NOW(), ended_reason = 'manual'
       WHERE id = $1 AND ended_at IS NULL`,
      [sessionId]
    );
  } else {
    // Redis key already expired, close any open sessions
    await query(
      `UPDATE impersonation_sessions SET ended_at = NOW(), ended_reason = 'manual'
       WHERE admin_id = $1 AND ended_at IS NULL`,
      [adminId]
    );
  }
}

export async function getImpersonationStatus(adminId: number): Promise<{
  active: boolean;
  targetUser?: { id: number; name: string; email: string };
  sessionId?: number;
  startedAt?: string;
} | null> {
  const data = await redis.get(`impersonate:${adminId}`);
  if (!data) {
    // Clean up any stale DB sessions
    await cleanupExpiredSessions(adminId);
    return { active: false };
  }

  const { targetUserId, sessionId, startedAt } = JSON.parse(data) as RedisImpersonationData;
  const targetUser = await findUserById(targetUserId);

  if (!targetUser) {
    await redis.del(`impersonate:${adminId}`);
    return { active: false };
  }

  return {
    active: true,
    targetUser: { id: targetUser.id, name: targetUser.name, email: targetUser.email },
    sessionId,
    startedAt,
  };
}

export async function cleanupExpiredSessions(adminId: number): Promise<void> {
  await query(
    `UPDATE impersonation_sessions SET ended_at = NOW(), ended_reason = 'timeout'
     WHERE admin_id = $1 AND ended_at IS NULL`,
    [adminId]
  );
}
