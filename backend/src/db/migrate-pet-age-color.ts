import { pool } from './pool.js';

const migration = `
-- Add age and color_markings to pets
ALTER TABLE pets ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE pets ADD COLUMN IF NOT EXISTS color_markings VARCHAR(255);
`;

async function migrate() {
  console.log('Running pet age and color_markings migration...');
  try {
    await pool.query(migration);
    console.log('Pet age and color_markings migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate();
