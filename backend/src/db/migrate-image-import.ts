import { pool } from './pool.js';

const migration = `
-- Image uploads table - stores uploaded image files and processing status
CREATE TABLE IF NOT EXISTS image_uploads (
  id SERIAL PRIMARY KEY,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  uploaded_by INTEGER NOT NULL REFERENCES users(id),
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- pending, processing, completed, failed
  document_type VARCHAR(100),  -- vaccination_card, medication_label, pet_id_tag, medical_record, other
  processing_started_at TIMESTAMP WITH TIME ZONE,
  processing_completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Image extractions table - stores AI-extracted data before user validation
CREATE TABLE IF NOT EXISTS image_extractions (
  id SERIAL PRIMARY KEY,
  image_upload_id INTEGER NOT NULL REFERENCES image_uploads(id) ON DELETE CASCADE,
  raw_extraction JSONB,  -- Raw response from Claude
  mapped_data JSONB,  -- Structured data mapped to our schema
  extraction_model VARCHAR(100),  -- Model used for extraction
  tokens_used INTEGER,
  status VARCHAR(50) NOT NULL DEFAULT 'pending_review',  -- pending_review, approved, rejected, partially_approved
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Image extraction items table - individual extracted items for granular approval
CREATE TABLE IF NOT EXISTS image_extraction_items (
  id SERIAL PRIMARY KEY,
  extraction_id INTEGER NOT NULL REFERENCES image_extractions(id) ON DELETE CASCADE,
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

-- Add source column to audit_log if it doesn't have image_import value
DO $$
BEGIN
  -- The source column already exists, just add a comment noting image_import is a valid value
  COMMENT ON COLUMN audit_log.source IS 'Source of change: manual, pdf_import, or image_import';
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_image_uploads_pet_id ON image_uploads(pet_id);
CREATE INDEX IF NOT EXISTS idx_image_uploads_uploaded_by ON image_uploads(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_image_uploads_status ON image_uploads(status);
CREATE INDEX IF NOT EXISTS idx_image_extractions_image_upload_id ON image_extractions(image_upload_id);
CREATE INDEX IF NOT EXISTS idx_image_extractions_status ON image_extractions(status);
CREATE INDEX IF NOT EXISTS idx_image_extraction_items_extraction_id ON image_extraction_items(extraction_id);
CREATE INDEX IF NOT EXISTS idx_image_extraction_items_status ON image_extraction_items(status);
`;

async function migrate() {
  console.log('Running image import migration...');
  try {
    await pool.query(migration);
    console.log('Image import migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate();
