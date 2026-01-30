import { pool } from './pool.js';

const migrations = `
-- Share tokens table for time-limited and PIN-protected sharing
CREATE TABLE IF NOT EXISTS share_tokens (
  id SERIAL PRIMARY KEY,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  token VARCHAR(32) UNIQUE NOT NULL,
  label VARCHAR(100),
  pin_hash VARCHAR(255),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_share_tokens_pet_id ON share_tokens(pet_id);
CREATE INDEX IF NOT EXISTS idx_share_tokens_token ON share_tokens(token);
CREATE INDEX IF NOT EXISTS idx_share_tokens_expires_at ON share_tokens(expires_at);
`;

async function migrate() {
  console.log('Running share tokens migration...');
  try {
    await pool.query(migrations);
    console.log('Share tokens migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate();
