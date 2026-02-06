import { api } from './client';

// Types
export interface SubscriptionInfo {
  status: 'free' | 'trialing' | 'active' | 'past_due' | 'canceled';
  tier: 'free' | 'premium';
  currentPeriodEnd: string | null;
}

export interface PricingConfig {
  monthly_price_cents: number;
  annual_price_cents: number;
  currency: string;
}

export interface TrialConfig {
  trial_days: number;
  require_card: boolean;
}

export interface CheckoutResponse {
  url: string;
}

export interface PortalResponse {
  url: string;
}

export interface StripeConfig {
  publishableKey: string;
}

export interface CreateSubscriptionResponse {
  subscriptionId: string;
  clientSecret: string;
}

export interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  paypal?: {
    email: string;
  };
  isDefault: boolean;
}

export interface SetupIntentResponse {
  clientSecret: string;
}

// Billing API
export const billingApi = {
  // Get current user's subscription info (authenticated)
  getSubscription: (token: string): Promise<SubscriptionInfo> =>
    api.get<SubscriptionInfo>('/api/billing/subscription', token),

  // Get pricing configuration (public, no auth)
  getPricing: (): Promise<PricingConfig> =>
    api.get<PricingConfig>('/api/billing/pricing'),

  // Get trial configuration (public, no auth)
  getTrialConfig: (): Promise<TrialConfig> =>
    api.get<TrialConfig>('/api/billing/trial-config'),

  // Create a Stripe checkout session (authenticated)
  createCheckout: (token: string, priceId: string, interval: 'monthly' | 'annual'): Promise<CheckoutResponse> =>
    api.post<CheckoutResponse>('/api/billing/checkout', { priceId, interval }, token),

  // Create a Stripe customer portal session (authenticated)
  createPortal: (token: string): Promise<PortalResponse> =>
    api.post<PortalResponse>('/api/billing/portal', {}, token),

  // Cancel subscription (authenticated)
  cancelSubscription: (token: string): Promise<void> =>
    api.delete<void>('/api/billing/subscription', token),

  // Get Stripe publishable key (public)
  getStripeConfig: (): Promise<StripeConfig> =>
    api.get<StripeConfig>('/api/billing/config'),

  // Create subscription with embedded payment (authenticated)
  createSubscription: (token: string, interval: 'monthly' | 'annual'): Promise<CreateSubscriptionResponse> =>
    api.post<CreateSubscriptionResponse>('/api/billing/subscribe', { interval }, token),

  // List saved payment methods (authenticated)
  getPaymentMethods: (token: string): Promise<PaymentMethod[]> =>
    api.get<PaymentMethod[]>('/api/billing/payment-methods', token),

  // Create SetupIntent for adding a new payment method (authenticated)
  createSetupIntent: (token: string): Promise<SetupIntentResponse> =>
    api.post<SetupIntentResponse>('/api/billing/payment-methods', {}, token),

  // Remove a payment method (authenticated)
  removePaymentMethod: (token: string, id: string): Promise<void> =>
    api.delete<void>(`/api/billing/payment-methods/${id}`, token),

  // Set default payment method (authenticated)
  setDefaultPaymentMethod: (token: string, id: string): Promise<void> =>
    api.put<void>(`/api/billing/payment-methods/${id}/default`, {}, token),
};
