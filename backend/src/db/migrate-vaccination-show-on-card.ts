import { pool } from './pool.js';

const migration = `
-- Add show_on_card to pet_vaccinations
ALTER TABLE pet_vaccinations ADD COLUMN IF NOT EXISTS show_on_card BOOLEAN NOT NULL DEFAULT false;
`;

async function migrate() {
  console.log('Running vaccination show_on_card migration...');
  try {
    await pool.query(migration);
    console.log('Vaccination show_on_card migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate();
