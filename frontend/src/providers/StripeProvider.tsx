import { loadStripe, Stripe } from '@stripe/stripe-js';
import { billingApi } from '../api/billing';

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripePromise(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = billingApi.getStripeConfig().then((config) =>
      loadStripe(config.publishableKey)
    );
  }
  return stripePromise;
}
