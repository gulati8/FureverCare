import Stripe from 'stripe';
import { config } from '../config/index.js';

const stripe = new Stripe(config.stripe.secretKey);

/**
 * Create a new Stripe customer
 * @param email - Customer email address
 * @param name - Customer name
 * @returns The Stripe customer ID
 */
export async function createCustomer(email: string, name: string): Promise<string> {
  const customer = await stripe.customers.create({
    email,
    name,
  });
  return customer.id;
}

/**
 * Create a Stripe Checkout session for subscription
 * @param customerId - Stripe customer ID
 * @param priceId - Stripe price ID for the subscription
 * @param successUrl - URL to redirect on successful payment
 * @param cancelUrl - URL to redirect on cancelled payment
 * @param trialDays - Optional number of trial days
 * @returns The checkout session URL
 */
export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
  trialDays?: number
): Promise<string> {
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    mode: 'subscription',
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
  };

  if (trialDays && trialDays > 0) {
    sessionParams.subscription_data = {
      trial_period_days: trialDays,
    };
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  if (!session.url) {
    throw new Error('Failed to create checkout session: no URL returned');
  }

  return session.url;
}

/**
 * Create a Stripe Customer Portal session
 * @param customerId - Stripe customer ID
 * @param returnUrl - URL to return to after portal session
 * @returns The portal session URL
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session.url;
}

/**
 * Cancel a Stripe subscription
 * @param subscriptionId - Stripe subscription ID
 */
export async function cancelSubscription(subscriptionId: string): Promise<void> {
  await stripe.subscriptions.cancel(subscriptionId);
}

/**
 * Get a Stripe subscription by ID
 * @param subscriptionId - Stripe subscription ID
 * @returns The Stripe subscription object
 */
export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * Construct and verify a Stripe webhook event
 * @param payload - Raw request body
 * @param signature - Stripe signature header
 * @returns The verified Stripe event
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    config.stripe.webhookSecret
  );
}

// Export the stripe instance for advanced use cases
export { stripe };
