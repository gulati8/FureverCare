import { pool } from './pool.js';

const migration = `
-- Add document grouping columns to document_uploads for multi-page documents
ALTER TABLE document_uploads ADD COLUMN IF NOT EXISTS document_group_id UUID DEFAULT NULL;
ALTER TABLE document_uploads ADD COLUMN IF NOT EXISTS page_number INTEGER DEFAULT 1;
ALTER TABLE document_uploads ADD COLUMN IF NOT EXISTS group_name VARCHAR(255) DEFAULT NULL;

-- Index for efficient group lookups
CREATE INDEX IF NOT EXISTS idx_document_uploads_group_id ON document_uploads(document_group_id) WHERE document_group_id IS NOT NULL;
`;

async function migrate() {
  console.log('Running document groups migration...');
  try {
    await pool.query(migration);
    console.log('Document groups migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate();
