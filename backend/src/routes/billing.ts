import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  findUserById,
  updateSubscription,
  getUserSubscriptionInfo,
} from '../models/user.js';
import {
  getPricing,
  getTrialConfig,
  getStripeConfig,
} from '../models/subscription-config.js';
import {
  createCustomer,
  createCheckoutSession,
  createPortalSession,
  cancelSubscription,
} from '../services/stripe.js';
import { config } from '../config/index.js';

const router = Router();

const checkoutSchema = z.object({
  interval: z.enum(['monthly', 'annual']),
});

// GET /billing/subscription - Get current user's subscription status
router.get('/subscription', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const info = await getUserSubscriptionInfo(req.userId!);
    // Transform to frontend expected format
    res.json({
      status: info.subscription_status,
      tier: info.subscription_tier,
      currentPeriodEnd: info.subscription_current_period_end,
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// GET /billing/pricing - Get pricing config (public, no auth)
router.get('/pricing', async (req, res: Response) => {
  try {
    const pricing = await getPricing();
    res.json(pricing);
  } catch (error) {
    console.error('Error fetching pricing:', error);
    res.status(500).json({ error: 'Failed to fetch pricing' });
  }
});

// GET /billing/trial-config - Get trial config (public, no auth)
router.get('/trial-config', async (req, res: Response) => {
  try {
    const trialConfig = await getTrialConfig();
    res.json(trialConfig);
  } catch (error) {
    console.error('Error fetching trial config:', error);
    res.status(500).json({ error: 'Failed to fetch trial config' });
  }
});

// POST /billing/checkout - Create Stripe Checkout session
router.post('/checkout', authenticate, validate(checkoutSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { interval } = req.body;
    const user = await findUserById(req.userId!);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // If user has no stripe_customer_id, create one
    let stripeCustomerId = user.stripe_customer_id;
    if (!stripeCustomerId) {
      stripeCustomerId = await createCustomer(user.email, user.name);
      await updateSubscription(user.id, { stripe_customer_id: stripeCustomerId });
    }

    // Get pricing config to get the price ID based on interval
    const stripeConfig = await getStripeConfig();
    const priceId = interval === 'monthly'
      ? stripeConfig.price_id_monthly
      : stripeConfig.price_id_annual;

    if (!priceId) {
      res.status(400).json({ error: `No price ID configured for ${interval} billing` });
      return;
    }

    // Get trial config for trial days
    const trialConfig = await getTrialConfig();
    const trialDays = trialConfig.trial_days;

    // Create checkout session
    const successUrl = `${config.frontend.url}/dashboard?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${config.frontend.url}/billing/cancel`;

    const url = await createCheckoutSession(
      stripeCustomerId,
      priceId,
      successUrl,
      cancelUrl,
      trialDays
    );

    res.json({ url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// POST /billing/portal - Create Customer Portal session
router.post('/portal', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await findUserById(req.userId!);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (!user.stripe_customer_id) {
      res.status(400).json({ error: 'No subscription found' });
      return;
    }

    const returnUrl = `${config.frontend.url}/settings/billing`;
    const url = await createPortalSession(user.stripe_customer_id, returnUrl);

    res.json({ url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// DELETE /billing/subscription - Cancel subscription
router.delete('/subscription', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await findUserById(req.userId!);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (!user.subscription_stripe_id) {
      res.status(400).json({ error: 'No active subscription to cancel' });
      return;
    }

    await cancelSubscription(user.subscription_stripe_id);

    // Update local subscription status
    await updateSubscription(user.id, {
      subscription_status: 'canceled',
      subscription_tier: 'free',
    });

    res.json({ message: 'Subscription cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

export default router;
