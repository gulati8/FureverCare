import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
import { queryOne } from '../db/pool.js';

export function requirePermission(permission: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const adminId = req.impersonatedBy || req.userId;
    if (!adminId) {
      res.status(403).json({ error: 'Authentication required' });
      return;
    }

    const row = await queryOne<{ id: number }>(
      'SELECT id FROM admin_permissions WHERE user_id = $1 AND permission = $2',
      [adminId, permission]
    );

    if (!row) {
      res.status(403).json({ error: `Missing permission: ${permission}` });
      return;
    }

    next();
  };
}
