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
};
