import { pool } from './pool.js';

const migration = `
-- Add date precision columns to health record tables
-- Precision values: 'day' (full date), 'month' (year+month only), 'year' (year only)
-- Default to 'day' so existing records are unaffected

ALTER TABLE pet_conditions ADD COLUMN IF NOT EXISTS diagnosed_date_precision VARCHAR(10) DEFAULT 'day';
ALTER TABLE pet_medications ADD COLUMN IF NOT EXISTS start_date_precision VARCHAR(10) DEFAULT 'day';
ALTER TABLE pet_medications ADD COLUMN IF NOT EXISTS end_date_precision VARCHAR(10) DEFAULT 'day';
ALTER TABLE pet_vaccinations ADD COLUMN IF NOT EXISTS administered_date_precision VARCHAR(10) DEFAULT 'day';
ALTER TABLE pet_vaccinations ADD COLUMN IF NOT EXISTS expiration_date_precision VARCHAR(10) DEFAULT 'day';
`;

async function migrate() {
  console.log('Running date precision migration...');
  try {
    await pool.query(migration);
    console.log('Date precision migration completed successfully');
  } catch (error) {
    console.error('Date precision migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate();
