import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { requirePermission } from '../middleware/require-permission.js';
import {
  startImpersonation,
  stopImpersonation,
  getImpersonationStatus,
} from '../services/impersonation.js';
import { extractRequestMetadata } from '../services/audit-logger.js';

const router = Router();

// POST /api/admin/impersonation/:userId - Start impersonating a user
router.post(
  '/:userId',
  authenticate,
  requireAdmin,
  requirePermission('can_impersonate'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const targetUserId = parseInt(req.params.userId, 10);
      if (isNaN(targetUserId)) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      const { ipAddress, userAgent } = extractRequestMetadata(req);
      const { sessionId } = await startImpersonation(
        req.userId!,
        targetUserId,
        ipAddress,
        userAgent
      );

      res.json({ success: true, sessionId });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start impersonation';
      const status = message.includes('not found') ? 404
        : message.includes('admin') ? 403
        : message.includes('Already') ? 409
        : 500;
      res.status(status).json({ error: message });
    }
  }
);

// POST /api/admin/impersonation/stop - Stop impersonating
// Note: requireAdmin is NOT used here because during impersonation req.isAdmin is false.
// We verify via req.impersonatedBy which is only set by the auth middleware after Redis validation.
router.post(
  '/stop',
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.impersonatedBy) {
        res.status(400).json({ error: 'Not currently impersonating anyone' });
        return;
      }

      await stopImpersonation(req.impersonatedBy);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to stop impersonation' });
    }
  }
);

// GET /api/admin/impersonation/status - Check impersonation status
router.get(
  '/status',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const status = await getImpersonationStatus(req.userId!);
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get impersonation status' });
    }
  }
);

export default router;
