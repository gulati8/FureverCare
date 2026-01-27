import { pool } from './pool.js';

const migration = `
DO $$
BEGIN
  -- Add is_fixed column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pets' AND column_name = 'is_fixed'
  ) THEN
    ALTER TABLE pets ADD COLUMN is_fixed BOOLEAN DEFAULT FALSE;
  END IF;

  -- Migrate existing data: neutered_male -> male + is_fixed=true
  UPDATE pets SET sex = 'male', is_fixed = TRUE WHERE sex = 'neutered_male';

  -- Migrate existing data: spayed_female -> female + is_fixed=true
  UPDATE pets SET sex = 'female', is_fixed = TRUE WHERE sex = 'spayed_female';
END $$;
`;

async function migrate() {
  console.log('Running sex-fixed migration...');
  try {
    await pool.query(migration);
    console.log('sex-fixed migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate();
