import { pool } from './pool.js';

const migration = `
-- Admin-configurable subscription settings
CREATE TABLE IF NOT EXISTS subscription_config (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER REFERENCES users(id)
);

-- Seed initial config
INSERT INTO subscription_config (key, value) VALUES
  ('pricing', '{"monthly_price_cents": 999, "annual_price_cents": 9999, "currency": "usd"}'),
  ('trial', '{"trial_days": 14, "require_card": false}'),
  ('stripe', '{"price_id_monthly": "", "price_id_annual": "", "webhook_secret": ""}')
ON CONFLICT (key) DO NOTHING;

-- User subscription state columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50) DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_stripe_id VARCHAR(255);

-- Indexes for subscription queries
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_subscription_config_key ON subscription_config(key);
`;

async function migrate() {
  console.log('Running subscriptions migration...');
  try {
    await pool.query(migration);
    console.log('Subscriptions migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate();
