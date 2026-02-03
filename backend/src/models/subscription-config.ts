import { query, queryOne } from '../db/pool.js';

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
  const result = await queryOne<ConfigRow>(
    'SELECT * FROM subscription_config WHERE key = $1',
    [key]
  );
  return result ? (result.value as T) : null;
}

export async function setConfig<T>(key: string, value: T, updatedBy: number): Promise<void> {
  await query(
    `INSERT INTO subscription_config (key, value, updated_by, updated_at)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
     ON CONFLICT (key) DO UPDATE SET
       value = EXCLUDED.value,
       updated_by = EXCLUDED.updated_by,
       updated_at = CURRENT_TIMESTAMP`,
    [key, JSON.stringify(value), updatedBy]
  );
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
