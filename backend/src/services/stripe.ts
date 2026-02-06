import Stripe from 'stripe';
import { config } from '../config/index.js';

const stripe = config.stripe.secretKey
  ? new Stripe(config.stripe.secretKey)
  : null;

/**
 * Check if Stripe is configured
 */
export function isStripeConfigured(): boolean {
  return stripe !== null;
}

function getStripe(): Stripe {
  if (!stripe) {
    throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY environment variable.');
  }
  return stripe;
}

/**
 * Create a new Stripe customer
 * @param email - Customer email address
 * @param name - Customer name
 * @returns The Stripe customer ID
 */
export async function createCustomer(email: string, name: string): Promise<string> {
  const customer = await getStripe().customers.create({
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

  const session = await getStripe().checkout.sessions.create(sessionParams);

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
  const session = await getStripe().billingPortal.sessions.create({
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
  await getStripe().subscriptions.cancel(subscriptionId);
}

/**
 * Get a Stripe subscription by ID
 * @param subscriptionId - Stripe subscription ID
 * @returns The Stripe subscription object
 */
export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  return await getStripe().subscriptions.retrieve(subscriptionId);
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
  return getStripe().webhooks.constructEvent(
    payload,
    signature,
    config.stripe.webhookSecret
  );
}

/**
 * Create a subscription with payment_behavior: 'default_incomplete'
 * Returns the subscription ID and client secret for the Payment Element.
 * For trials, returns a SetupIntent client secret instead.
 */
export async function createSubscriptionWithPaymentIntent(
  customerId: string,
  priceId: string,
  trialDays?: number
): Promise<{ subscriptionId: string; clientSecret: string }> {
  const params: Stripe.SubscriptionCreateParams = {
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    payment_settings: {
      save_default_payment_method: 'on_subscription',
    },
    expand: ['latest_invoice.payment_intent', 'pending_setup_intent'],
  };

  if (trialDays && trialDays > 0) {
    params.trial_period_days = trialDays;
  }

  const subscription = await getStripe().subscriptions.create(params);

  let clientSecret: string;

  if (subscription.status === 'trialing') {
    // For trials, use the pending SetupIntent to collect payment method
    const setupIntent = subscription.pending_setup_intent as Stripe.SetupIntent | null;
    if (!setupIntent?.client_secret) {
      throw new Error('No SetupIntent client secret for trial subscription');
    }
    clientSecret = setupIntent.client_secret;
  } else {
    // For immediate payment, use the PaymentIntent from the latest invoice
    const invoice = subscription.latest_invoice as Stripe.Invoice;
    const paymentIntent = (invoice as any).payment_intent as Stripe.PaymentIntent;
    if (!paymentIntent?.client_secret) {
      throw new Error('No PaymentIntent client secret for subscription');
    }
    clientSecret = paymentIntent.client_secret;
  }

  return { subscriptionId: subscription.id, clientSecret };
}

/**
 * List all payment methods for a customer
 */
export async function listPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
  const methods = await getStripe().paymentMethods.list({
    customer: customerId,
  });
  return methods.data;
}

/**
 * Get the customer's default payment method ID
 */
export async function getCustomerDefaultPaymentMethod(customerId: string): Promise<string | null> {
  const customer = await getStripe().customers.retrieve(customerId) as Stripe.Customer;
  if (customer.deleted) return null;
  const defaultPm = customer.invoice_settings?.default_payment_method;
  if (typeof defaultPm === 'string') return defaultPm;
  if (defaultPm && typeof defaultPm === 'object') return defaultPm.id;
  return null;
}

/**
 * Create a SetupIntent for adding a payment method without immediate payment
 */
export async function createSetupIntent(customerId: string): Promise<{ clientSecret: string }> {
  const setupIntent = await getStripe().setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
  });

  if (!setupIntent.client_secret) {
    throw new Error('Failed to create SetupIntent: no client secret returned');
  }

  return { clientSecret: setupIntent.client_secret };
}

/**
 * Detach (remove) a payment method from a customer
 */
export async function detachPaymentMethod(paymentMethodId: string): Promise<void> {
  await getStripe().paymentMethods.detach(paymentMethodId);
}

/**
 * Set a customer's default payment method
 */
export async function setDefaultPaymentMethod(
  customerId: string,
  paymentMethodId: string
): Promise<void> {
  await getStripe().customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });
}

// Export the stripe instance for advanced use cases (may be null if not configured)
export { stripe };
