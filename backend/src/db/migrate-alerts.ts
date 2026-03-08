import { pool } from './pool.js';

const migration = `
-- Add is_active and show_on_card to pet_conditions
ALTER TABLE pet_conditions ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE pet_conditions ADD COLUMN IF NOT EXISTS show_on_card BOOLEAN NOT NULL DEFAULT false;

-- Add show_on_card to pet_medications
ALTER TABLE pet_medications ADD COLUMN IF NOT EXISTS show_on_card BOOLEAN NOT NULL DEFAULT false;

-- Create pet_alerts table for custom owner-entered alerts
CREATE TABLE IF NOT EXISTS pet_alerts (
  id SERIAL PRIMARY KEY,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  alert_text VARCHAR(200) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pet_alerts_pet_id ON pet_alerts(pet_id);
`;

async function migrate() {
  console.log('Running alerts migration...');
  try {
    await pool.query(migration);
    console.log('Alerts migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate();
