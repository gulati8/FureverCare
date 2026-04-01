import { pool } from './pool.js';

const migration = `
-- Add color_markings column to pets table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pets' AND column_name = 'color_markings'
  ) THEN
    ALTER TABLE pets ADD COLUMN color_markings TEXT;
  END IF;
END $$;
`;

async function migrate() {
  console.log('Running color-markings migration...');
  try {
    await pool.query(migration);
    console.log('color-markings migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate();
