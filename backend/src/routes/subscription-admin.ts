import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { validate } from '../middleware/validate.js';
import {
  getPricing,
  getTrialConfig,
  getStripeConfig,
  setConfig,
  SubscriptionPricing,
  SubscriptionTrial,
  StripeConfig,
} from '../models/subscription-config.js';

const router = Router();

const pricingSchema = z.object({
  monthly_price_cents: z.number().int().positive(),
  annual_price_cents: z.number().int().positive(),
  currency: z.string().min(3).max(3),
});

const trialSchema = z.object({
  trial_days: z.number().int().min(0),
  require_card: z.boolean(),
});

const stripeSchema = z.object({
  price_id_monthly: z.string(),
  price_id_annual: z.string(),
  webhook_secret: z.string(),
});

// GET /subscription-admin/config - Get all subscription config
router.get('/config', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const [pricing, trial, stripe] = await Promise.all([
      getPricing(),
      getTrialConfig(),
      getStripeConfig(),
    ]);

    res.json({
      pricing,
      trial,
      stripe: {
        ...stripe,
        // Mask the webhook secret for security
        webhook_secret: stripe.webhook_secret ? '****' + stripe.webhook_secret.slice(-4) : '',
      },
    });
  } catch (error) {
    console.error('Error fetching subscription config:', error);
    res.status(500).json({ error: 'Failed to fetch subscription config' });
  }
});

// PUT /subscription-admin/pricing - Update pricing config
router.put('/pricing', authenticate, requireAdmin, validate(pricingSchema), async (req: AuthRequest, res: Response) => {
  try {
    const pricing: SubscriptionPricing = req.body;
    await setConfig('pricing', pricing, req.userId!);

    res.json({ message: 'Pricing updated successfully', pricing });
  } catch (error) {
    console.error('Error updating pricing:', error);
    res.status(500).json({ error: 'Failed to update pricing' });
  }
});

// PUT /subscription-admin/trial - Update trial config
router.put('/trial', authenticate, requireAdmin, validate(trialSchema), async (req: AuthRequest, res: Response) => {
  try {
    const trial: SubscriptionTrial = req.body;
    await setConfig('trial', trial, req.userId!);

    res.json({ message: 'Trial config updated successfully', trial });
  } catch (error) {
    console.error('Error updating trial config:', error);
    res.status(500).json({ error: 'Failed to update trial config' });
  }
});

// PUT /subscription-admin/stripe - Update Stripe config
router.put('/stripe', authenticate, requireAdmin, validate(stripeSchema), async (req: AuthRequest, res: Response) => {
  try {
    const stripeConfig: StripeConfig = req.body;
    await setConfig('stripe', stripeConfig, req.userId!);

    res.json({
      message: 'Stripe config updated successfully',
      stripe: {
        ...stripeConfig,
        // Mask the webhook secret for security
        webhook_secret: stripeConfig.webhook_secret ? '****' + stripeConfig.webhook_secret.slice(-4) : '',
      },
    });
  } catch (error) {
    console.error('Error updating Stripe config:', error);
    res.status(500).json({ error: 'Failed to update Stripe config' });
  }
});

export default router;
