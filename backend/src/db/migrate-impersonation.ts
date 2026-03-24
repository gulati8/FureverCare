import { pool } from './pool.js';

const migration = `
-- RBAC permissions table
CREATE TABLE IF NOT EXISTS admin_permissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission VARCHAR(50) NOT NULL,
  granted_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, permission)
);
CREATE INDEX IF NOT EXISTS idx_admin_permissions_user ON admin_permissions(user_id);

-- Extend audit_log with impersonation tracking
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS impersonated_by INTEGER REFERENCES users(id);

-- Impersonation session history (queryable)
CREATE TABLE IF NOT EXISTS impersonation_sessions (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES users(id),
  target_user_id INTEGER NOT NULL REFERENCES users(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  ended_reason VARCHAR(50),
  ip_address VARCHAR(45),
  user_agent TEXT
);
CREATE INDEX IF NOT EXISTS idx_impersonation_sessions_admin ON impersonation_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_sessions_active ON impersonation_sessions(admin_id) WHERE ended_at IS NULL;

-- Seed: grant can_impersonate to all existing admins
INSERT INTO admin_permissions (user_id, permission)
SELECT id, 'can_impersonate' FROM users WHERE is_admin = true
ON CONFLICT DO NOTHING;
`;

async function migrate() {
  console.log('Running impersonation migration...');
  try {
    await pool.query(migration);
    console.log('Impersonation migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate();
