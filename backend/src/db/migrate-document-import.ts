import { pool } from './pool.js';

const migration = `
-- Document uploads table - unified storage for all document types (PDFs and images)
CREATE TABLE IF NOT EXISTS document_uploads (
  id SERIAL PRIMARY KEY,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  uploaded_by INTEGER NOT NULL REFERENCES users(id),
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  media_type VARCHAR(20) NOT NULL,  -- 'pdf' or 'image'
  status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- pending, classifying, processing, completed, failed
  detected_type VARCHAR(100),  -- medication_label, vet_visit_summary, lab_results, vaccination_record, receipt, insurance_form, pet_id, medical_history, prescription, other
  classification_confidence INTEGER,  -- 0-100
  classification_explanation TEXT,
  processing_started_at TIMESTAMP WITH TIME ZONE,
  processing_completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Document extractions table - stores AI-extracted data before user validation
CREATE TABLE IF NOT EXISTS document_extractions (
  id SERIAL PRIMARY KEY,
  document_upload_id INTEGER NOT NULL REFERENCES document_uploads(id) ON DELETE CASCADE,
  raw_extraction JSONB,  -- Raw response from Claude (includes classification and extraction)
  mapped_data JSONB,  -- Structured data mapped to our schema
  extraction_model VARCHAR(100),  -- Model used for extraction
  tokens_used INTEGER,
  status VARCHAR(50) NOT NULL DEFAULT 'pending_review',  -- pending_review, approved, rejected, partially_approved
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Document extraction items table - individual extracted items for granular approval
CREATE TABLE IF NOT EXISTS document_extraction_items (
  id SERIAL PRIMARY KEY,
  extraction_id INTEGER NOT NULL REFERENCES document_extractions(id) ON DELETE CASCADE,
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

-- Update audit_log comment to include document_import as valid source
DO $$
BEGIN
  COMMENT ON COLUMN audit_log.source IS 'Source of change: manual, pdf_import, image_import, or document_import';
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_uploads_pet_id ON document_uploads(pet_id);
CREATE INDEX IF NOT EXISTS idx_document_uploads_uploaded_by ON document_uploads(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_document_uploads_status ON document_uploads(status);
CREATE INDEX IF NOT EXISTS idx_document_uploads_detected_type ON document_uploads(detected_type);
CREATE INDEX IF NOT EXISTS idx_document_uploads_media_type ON document_uploads(media_type);
CREATE INDEX IF NOT EXISTS idx_document_extractions_document_upload_id ON document_extractions(document_upload_id);
CREATE INDEX IF NOT EXISTS idx_document_extractions_status ON document_extractions(status);
CREATE INDEX IF NOT EXISTS idx_document_extraction_items_extraction_id ON document_extraction_items(extraction_id);
CREATE INDEX IF NOT EXISTS idx_document_extraction_items_status ON document_extraction_items(status);
`;

async function migrate() {
  console.log('Running document import migration...');
  try {
    await pool.query(migration);
    console.log('Document import migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate();
