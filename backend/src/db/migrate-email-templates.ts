import { pool } from './pool.js';

const migration = `
-- Email templates table for Brevo template ID mappings
CREATE TABLE IF NOT EXISTS email_templates (
  id SERIAL PRIMARY KEY,
  email_type VARCHAR(100) UNIQUE NOT NULL,
  brevo_template_id INTEGER NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER REFERENCES users(id)
);

-- Index for fast lookup by email_type
CREATE INDEX IF NOT EXISTS idx_email_templates_email_type ON email_templates(email_type);

-- Seed known email types with placeholder template IDs (0 = needs configuration)
INSERT INTO email_templates (email_type, brevo_template_id, description) VALUES
  ('password_reset', 0, 'Password reset email sent when user requests to reset their password'),
  ('pet_invitation', 0, 'Invitation email sent when a pet owner invites someone to share access')
ON CONFLICT (email_type) DO NOTHING;
`;

async function migrate() {
  console.log('Running email templates migration...');
  try {
    await pool.query(migration);
    console.log('Email templates migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate();
