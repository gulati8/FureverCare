import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { constructWebhookEvent } from '../services/stripe.js';
import {
  updateSubscription,
  findUserByStripeCustomerId,
} from '../models/user.js';

const router = Router();

// POST /webhooks/stripe - Stripe webhook handler
// Note: This route must be registered BEFORE express.json() middleware
// or use express.raw() for this specific route
router.post(
  '/',
  async (req: Request, res: Response) => {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      res.status(400).json({ error: 'Missing stripe-signature header' });
      return;
    }

    let event: Stripe.Event;

    try {
      event = constructWebhookEvent(req.body, signature);
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      res.status(400).json({ error: 'Webhook signature verification failed' });
      return;
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          await handleCheckoutCompleted(session);
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionUpdated(subscription);
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionDeleted(subscription);
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          await handlePaymentFailed(invoice);
          break;
        }

        case 'invoice.paid': {
          const invoice = event.data.object as Stripe.Invoice;
          await handleInvoicePaid(invoice);
          break;
        }

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
);

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  const user = await findUserByStripeCustomerId(customerId);
  if (!user) {
    console.error(`No user found for Stripe customer: ${customerId}`);
    return;
  }

  // Determine if this is a trial or active subscription
  // If the subscription has a trial end date in the future, it's trialing
  const status = session.status === 'complete' ? 'trialing' : 'active';

  await updateSubscription(user.id, {
    subscription_stripe_id: subscriptionId,
    subscription_status: status,
    subscription_tier: 'premium',
  });

  console.log(`Checkout completed for user ${user.id}, subscription: ${subscriptionId}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const customerId = subscription.customer as string;

  const user = await findUserByStripeCustomerId(customerId);
  if (!user) {
    console.error(`No user found for Stripe customer: ${customerId}`);
    return;
  }

  // Skip DB update for incomplete status — wait for payment confirmation
  if (subscription.status === 'incomplete') {
    console.log(`Subscription ${subscription.id} is incomplete, skipping DB update (waiting for payment)`);
    return;
  }

  // Map Stripe status to our status
  let status: 'trialing' | 'active' | 'past_due' | 'canceled';
  switch (subscription.status) {
    case 'trialing':
      status = 'trialing';
      break;
    case 'active':
      status = 'active';
      break;
    case 'past_due':
      status = 'past_due';
      break;
    case 'canceled':
    case 'unpaid':
    case 'incomplete_expired':
      status = 'canceled';
      break;
    default:
      status = 'active';
  }

  // Set tier based on status
  const tier = status === 'canceled' ? 'free' : 'premium';

  // Get the current period end date
  // Use type assertion since Stripe types may vary by version
  const subscriptionAny = subscription as any;
  const periodEnd = subscriptionAny.current_period_end
    ? new Date(subscriptionAny.current_period_end * 1000)
    : null;

  await updateSubscription(user.id, {
    subscription_status: status,
    subscription_tier: tier,
    subscription_current_period_end: periodEnd,
    subscription_stripe_id: subscription.id,
  });

  console.log(`Subscription updated for user ${user.id}: status=${status}, tier=${tier}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const customerId = subscription.customer as string;

  const user = await findUserByStripeCustomerId(customerId);
  if (!user) {
    console.error(`No user found for Stripe customer: ${customerId}`);
    return;
  }

  await updateSubscription(user.id, {
    subscription_status: 'canceled',
    subscription_tier: 'free',
    subscription_stripe_id: null,
    subscription_current_period_end: null,
  });

  console.log(`Subscription deleted for user ${user.id}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string;

  const user = await findUserByStripeCustomerId(customerId);
  if (!user) {
    console.error(`No user found for Stripe customer: ${customerId}`);
    return;
  }

  await updateSubscription(user.id, {
    subscription_status: 'past_due',
  });

  console.log(`Payment failed for user ${user.id}`);
}

async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string;

  const user = await findUserByStripeCustomerId(customerId);
  if (!user) {
    console.error(`No user found for Stripe customer: ${customerId}`);
    return;
  }

  console.log(`Invoice paid for user ${user.id}, invoice: ${invoice.id}`);
}

export default router;
