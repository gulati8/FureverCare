import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import {
  getAnalyticsOverview,
  getActivityMetrics,
  getHealthInsights,
} from '../models/admin.js';

const router = Router();

// ============ Validation Schemas ============

const getActivityQuerySchema = z.object({
  days: z.string().optional().transform((val) => parseInt(val || '30')),
});

// ============ Routes ============

// GET /api/admin/analytics/overview - Get overview analytics
router.get('/overview', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const overview = await getAnalyticsOverview();
    res.json(overview);
  } catch (error) {
    console.error('Error fetching analytics overview:', error);
    res.status(500).json({ error: 'Failed to fetch analytics overview' });
  }
});

// GET /api/admin/analytics/activity - Get activity metrics
router.get('/activity', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const params = getActivityQuerySchema.parse(req.query);
    const metrics = await getActivityMetrics(params.days);
    res.json(metrics);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
      return;
    }
    console.error('Error fetching activity metrics:', error);
    res.status(500).json({ error: 'Failed to fetch activity metrics' });
  }
});

// GET /api/admin/analytics/health-insights - Get health insights
router.get('/health-insights', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const insights = await getHealthInsights();
    res.json(insights);
  } catch (error) {
    console.error('Error fetching health insights:', error);
    res.status(500).json({ error: 'Failed to fetch health insights' });
  }
});

export default router;
