import { pool } from './pool.js';

const migration = `
-- Add age column to pets table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pets' AND column_name = 'age'
  ) THEN
    ALTER TABLE pets ADD COLUMN age INTEGER;
  END IF;
END $$;
`;

async function migrate() {
  console.log('Running pet-age migration...');
  try {
    await pool.query(migration);
    console.log('pet-age migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate();
