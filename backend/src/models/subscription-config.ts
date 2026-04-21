import { prisma } from '../db/prisma.js';

export interface SubscriptionPricing {
  monthly_price_cents: number;
  annual_price_cents: number;
  currency: string;
}

export interface SubscriptionTrial {
  trial_days: number;
  require_card: boolean;
}

export interface StripeConfig {
  price_id_monthly: string;
  price_id_annual: string;
  webhook_secret: string;
}

interface ConfigRow {
  key: string;
  value: any;
  updated_by: number | null;
  updated_at: Date;
}

export async function getConfig<T>(key: string): Promise<T | null> {
  const result = await prisma.subscription_config.findUnique({
    where: {
      key,
    },
  });
  return result ? (result.value as T) : null;
}

export async function setConfig<T>(key: string, value: T, updatedBy: number): Promise<void> {
  await prisma.subscription_config.upsert({
    where: {
      key,
    },
    create: {
      key,
      value: value as object,
      updated_by: updatedBy,
      updated_at: new Date(),
    },
    update: {
      value: value as object,
      updated_by: updatedBy,
      updated_at: new Date(),
    },
  });
}

export async function getPricing(): Promise<SubscriptionPricing> {
  const pricing = await getConfig<SubscriptionPricing>('pricing');
  return pricing || {
    monthly_price_cents: 999,
    annual_price_cents: 9999,
    currency: 'usd',
  };
}

export async function getTrialConfig(): Promise<SubscriptionTrial> {
  const trial = await getConfig<SubscriptionTrial>('trial');
  return trial || {
    trial_days: 14,
    require_card: false,
  };
}

export async function getStripeConfig(): Promise<StripeConfig> {
  const stripe = await getConfig<StripeConfig>('stripe');
  return stripe || {
    price_id_monthly: '',
    price_id_annual: '',
    webhook_secret: '',
  };
}
