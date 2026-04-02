import { pool } from './pool.js';

const migration = `
-- Add soft-delete support to document tables
ALTER TABLE document_uploads ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE document_extractions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE document_extraction_items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Index to efficiently filter out deleted documents
CREATE INDEX IF NOT EXISTS idx_document_uploads_deleted_at ON document_uploads(deleted_at);
`;

async function migrate() {
  console.log('Running soft-delete migration...');
  try {
    await pool.query(migration);
    console.log('Soft-delete migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate();
