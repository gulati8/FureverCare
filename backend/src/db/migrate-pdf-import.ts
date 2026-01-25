import { pool } from './pool.js';

const migration = `
-- PDF uploads table - stores uploaded PDF files and processing status
CREATE TABLE IF NOT EXISTS pdf_uploads (
  id SERIAL PRIMARY KEY,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  uploaded_by INTEGER NOT NULL REFERENCES users(id),
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- pending, processing, completed, failed
  document_type VARCHAR(100),  -- vaccination_record, visit_summary, lab_results, prescription, other
  processing_started_at TIMESTAMP WITH TIME ZONE,
  processing_completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- PDF extractions table - stores AI-extracted data before user validation
CREATE TABLE IF NOT EXISTS pdf_extractions (
  id SERIAL PRIMARY KEY,
  pdf_upload_id INTEGER NOT NULL REFERENCES pdf_uploads(id) ON DELETE CASCADE,
  raw_extraction JSONB,  -- Raw response from Claude
  mapped_data JSONB,  -- Structured data mapped to our schema
  extraction_model VARCHAR(100),  -- Model used for extraction
  tokens_used INTEGER,
  status VARCHAR(50) NOT NULL DEFAULT 'pending_review',  -- pending_review, approved, rejected, partially_approved
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- PDF extraction items table - individual extracted items for granular approval
CREATE TABLE IF NOT EXISTS pdf_extraction_items (
  id SERIAL PRIMARY KEY,
  extraction_id INTEGER NOT NULL REFERENCES pdf_extractions(id) ON DELETE CASCADE,
  record_type VARCHAR(50) NOT NULL,  -- vaccination, medication, condition, allergy, vet, emergency_contact
  extracted_data JSONB NOT NULL,  -- The extracted field values
  confidence_score DECIMAL(3,2),  -- 0.00 to 1.00
  user_modified_data JSONB,  -- User's modifications before approval
  status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- pending, approved, rejected, modified
  created_record_id INTEGER,  -- ID of the created record after approval
  created_record_type VARCHAR(50),  -- Table name of the created record
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit log table - comprehensive change tracking
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(100) NOT NULL,  -- pets, pet_vaccinations, pet_medications, etc.
  entity_id INTEGER NOT NULL,
  action VARCHAR(50) NOT NULL,  -- create, update, delete
  changed_by INTEGER REFERENCES users(id),
  source VARCHAR(50) NOT NULL DEFAULT 'manual',  -- manual, pdf_import
  source_pdf_upload_id INTEGER REFERENCES pdf_uploads(id),
  old_values JSONB,  -- Previous values (for update/delete)
  new_values JSONB,  -- New values (for create/update)
  changed_fields TEXT[],  -- Array of field names that changed
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pdf_uploads_pet_id ON pdf_uploads(pet_id);
CREATE INDEX IF NOT EXISTS idx_pdf_uploads_uploaded_by ON pdf_uploads(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_pdf_uploads_status ON pdf_uploads(status);
CREATE INDEX IF NOT EXISTS idx_pdf_extractions_pdf_upload_id ON pdf_extractions(pdf_upload_id);
CREATE INDEX IF NOT EXISTS idx_pdf_extractions_status ON pdf_extractions(status);
CREATE INDEX IF NOT EXISTS idx_pdf_extraction_items_extraction_id ON pdf_extraction_items(extraction_id);
CREATE INDEX IF NOT EXISTS idx_pdf_extraction_items_status ON pdf_extraction_items(status);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_by ON audit_log(changed_by);
CREATE INDEX IF NOT EXISTS idx_audit_log_source ON audit_log(source);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
`;

async function migrate() {
  console.log('Running PDF import migration...');
  try {
    await pool.query(migration);
    console.log('PDF import migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate();
