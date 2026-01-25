import { pool } from './pool.js';

const migration = `
-- Pet owners junction table (for shared access)
CREATE TABLE IF NOT EXISTS pet_owners (
  id SERIAL PRIMARY KEY,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'viewer',  -- 'owner' (original), 'editor', 'viewer'
  invited_by INTEGER REFERENCES users(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(pet_id, user_id)
);

-- Pet invitations table
CREATE TABLE IF NOT EXISTS pet_invitations (
  id SERIAL PRIMARY KEY,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'viewer',
  invite_code VARCHAR(32) UNIQUE NOT NULL,
  invited_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pet_owners_pet_id ON pet_owners(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_owners_user_id ON pet_owners(user_id);
CREATE INDEX IF NOT EXISTS idx_pet_invitations_invite_code ON pet_invitations(invite_code);
CREATE INDEX IF NOT EXISTS idx_pet_invitations_email ON pet_invitations(email);

-- Migrate existing pets to pet_owners table (original owners)
INSERT INTO pet_owners (pet_id, user_id, role, accepted_at)
SELECT id, user_id, 'owner', created_at
FROM pets
WHERE NOT EXISTS (
  SELECT 1 FROM pet_owners WHERE pet_owners.pet_id = pets.id AND pet_owners.user_id = pets.user_id
);
`;

async function migrate() {
  console.log('Running pet owners migration...');
  try {
    await pool.query(migration);
    console.log('Pet owners migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate();
