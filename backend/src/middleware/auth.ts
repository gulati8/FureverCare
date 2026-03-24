import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { findUserById, User } from '../models/user.js';
import { redis } from '../db/redis.js';

export interface AuthRequest extends Request {
  user?: User;
  userId?: number;
  isAdmin?: boolean;
  impersonatedBy?: number;
  impersonatingUser?: User;
}

export interface JWTPayload {
  userId: number;
  email: string;
  isAdmin?: boolean;
}

export function generateToken(user: User): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    isAdmin: user.is_admin,
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, config.jwt.secret) as JWTPayload;
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);

    const user = await findUserById(payload.userId);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.user = user;
    req.userId = user.id;
    req.isAdmin = user.is_admin;

    // Check for active impersonation session
    if (user.is_admin) {
      const impersonationData = await redis.get(`impersonate:${user.id}`);
      if (impersonationData) {
        const { targetUserId } = JSON.parse(impersonationData);
        const targetUser = await findUserById(targetUserId);

        if (targetUser && !targetUser.is_admin) {
          req.impersonatedBy = user.id;
          req.impersonatingUser = user;
          req.user = targetUser;
          req.userId = targetUser.id;
          req.isAdmin = false;

          // Refresh TTL (5 min inactivity timeout)
          await redis.expire(`impersonate:${user.id}`, 300);

          // Set header so frontend knows impersonation is active
          res.setHeader('X-Impersonating', JSON.stringify({
            userId: targetUser.id,
            name: targetUser.name,
            email: targetUser.email,
            adminId: user.id,
          }));
        } else {
          // Target invalid (deleted or became admin) — clean up
          await redis.del(`impersonate:${user.id}`);
        }
      }
    }

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  authenticate(req, res, next);
}
