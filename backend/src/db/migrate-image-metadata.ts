import { pool } from './pool.js';

const migration = `
-- Add image metadata columns to document_uploads
ALTER TABLE document_uploads ADD COLUMN IF NOT EXISTS user_tag VARCHAR(100);
ALTER TABLE document_uploads ADD COLUMN IF NOT EXISTS user_description TEXT;
ALTER TABLE document_uploads ADD COLUMN IF NOT EXISTS date_taken TIMESTAMP WITH TIME ZONE;
ALTER TABLE document_uploads ADD COLUMN IF NOT EXISTS body_area VARCHAR(100);
`;

async function migrate() {
  console.log('Running image metadata migration...');
  try {
    await pool.query(migration);
    console.log('Image metadata migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate();
