import { pool } from './pool.js';

const migration = `
-- Add is_admin column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- Create partial index for admin users (only indexes rows where is_admin is true)
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin) WHERE is_admin = true;
`;

async function migrate() {
  console.log('Running admin role migration...');
  try {
    await pool.query(migration);
    console.log('Admin role migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate();
