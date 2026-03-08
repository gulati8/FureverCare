import { pool } from './pool.js';

const migration = `
-- Add show_on_card to pet_allergies
-- Default: life-threatening and severe allergies show on card, others don't
ALTER TABLE pet_allergies ADD COLUMN IF NOT EXISTS show_on_card BOOLEAN NOT NULL DEFAULT false;

-- Set existing life-threatening and severe allergies to show on card by default
UPDATE pet_allergies SET show_on_card = true WHERE severity IN ('life-threatening', 'severe') AND show_on_card = false;
`;

async function migrate() {
  console.log('Running allergy show_on_card migration...');
  try {
    await pool.query(migration);
    console.log('Allergy show_on_card migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate();
