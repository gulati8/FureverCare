import { pool } from './pool.js';

const migration = `
-- Add weight_unit column to pets table
-- Existing values are assumed to be in kg
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pets' AND column_name = 'weight_unit'
  ) THEN
    ALTER TABLE pets ADD COLUMN weight_unit VARCHAR(3) DEFAULT 'kg';
  END IF;
END $$;
`;

async function migrate() {
  console.log('Running weight-units migration...');
  try {
    await pool.query(migration);
    console.log('weight-units migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate();
