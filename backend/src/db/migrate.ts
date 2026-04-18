import { pool } from './pool.js';

const migrations = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Pets table
CREATE TABLE IF NOT EXISTS pets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  share_id VARCHAR(21) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  species VARCHAR(50) NOT NULL,
  breed VARCHAR(100),
  date_of_birth DATE,
  weight_kg DECIMAL(5,2),
  sex VARCHAR(20),
  microchip_id VARCHAR(100),
  photo_url TEXT,
  special_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Primary veterinarian info
CREATE TABLE IF NOT EXISTS pet_vets (
  id SERIAL PRIMARY KEY,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  clinic_name VARCHAR(255) NOT NULL,
  vet_name VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  is_primary BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Medical conditions
CREATE TABLE IF NOT EXISTS pet_conditions (
  id SERIAL PRIMARY KEY,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  diagnosed_date DATE,
  notes TEXT,
  severity VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Allergies
CREATE TABLE IF NOT EXISTS pet_allergies (
  id SERIAL PRIMARY KEY,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  allergen VARCHAR(255) NOT NULL,
  reaction TEXT,
  severity VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Medications
CREATE TABLE IF NOT EXISTS pet_medications (
  id SERIAL PRIMARY KEY,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  dosage VARCHAR(100),
  frequency VARCHAR(100),
  start_date DATE,
  end_date DATE,
  prescribing_vet VARCHAR(255),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Vaccinations
CREATE TABLE IF NOT EXISTS pet_vaccinations (
  id SERIAL PRIMARY KEY,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  administered_date DATE NOT NULL,
  expiration_date DATE,
  administered_by VARCHAR(255),
  lot_number VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Emergency contacts (additional contacts beyond owner)
CREATE TABLE IF NOT EXISTS pet_emergency_contacts (
  id SERIAL PRIMARY KEY,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  relationship VARCHAR(100),
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Reminder rules
CREATE TABLE IF NOT EXISTS pet_reminder_rules (
  id SERIAL PRIMARY KEY,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  record_type VARCHAR(20) NOT NULL,
  record_id INTEGER NOT NULL,
  channel VARCHAR(20) NOT NULL DEFAULT 'email',
  lead_time_value INTEGER NOT NULL,
  lead_time_unit VARCHAR(20) NOT NULL,
  next_due_date DATE NOT NULL,
  recurrence_value INTEGER,
  recurrence_unit VARCHAR(20),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pet_reminder_rules_record_type_check CHECK (record_type IN ('vaccination', 'medication')),
  CONSTRAINT pet_reminder_rules_channel_check CHECK (channel IN ('email')),
  CONSTRAINT pet_reminder_rules_lead_time_value_check CHECK (lead_time_value > 0),
  CONSTRAINT pet_reminder_rules_lead_time_unit_check CHECK (lead_time_unit IN ('days', 'weeks')),
  CONSTRAINT pet_reminder_rules_recurrence_value_check CHECK (recurrence_value IS NULL OR recurrence_value > 0),
  CONSTRAINT pet_reminder_rules_recurrence_unit_check CHECK (
    recurrence_unit IS NULL OR recurrence_unit IN ('months', 'years')
  ),
  CONSTRAINT pet_reminder_rules_recurrence_pair_check CHECK (
    (recurrence_value IS NULL AND recurrence_unit IS NULL) OR
    (recurrence_value IS NOT NULL AND recurrence_unit IS NOT NULL)
  ),
  CONSTRAINT pet_reminder_rules_unique_record_channel UNIQUE (record_type, record_id, channel)
);

-- Reminder notification history
CREATE TABLE IF NOT EXISTS pet_reminder_notifications (
  id SERIAL PRIMARY KEY,
  reminder_rule_id INTEGER NOT NULL REFERENCES pet_reminder_rules(id) ON DELETE CASCADE,
  recipient_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  record_type VARCHAR(20) NOT NULL,
  record_id INTEGER NOT NULL,
  due_date DATE NOT NULL,
  channel VARCHAR(20) NOT NULL DEFAULT 'email',
  status VARCHAR(20) NOT NULL DEFAULT 'queued',
  queued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  provider_message_id TEXT,
  error_message TEXT,
  CONSTRAINT pet_reminder_notifications_record_type_check CHECK (record_type IN ('vaccination', 'medication')),
  CONSTRAINT pet_reminder_notifications_channel_check CHECK (channel IN ('email')),
  CONSTRAINT pet_reminder_notifications_status_check CHECK (status IN ('queued', 'sent', 'failed')),
  CONSTRAINT pet_reminder_notifications_unique_send UNIQUE (
    reminder_rule_id,
    recipient_user_id,
    due_date,
    channel
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets(user_id);
CREATE INDEX IF NOT EXISTS idx_pets_share_id ON pets(share_id);
CREATE INDEX IF NOT EXISTS idx_pet_conditions_pet_id ON pet_conditions(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_allergies_pet_id ON pet_allergies(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_medications_pet_id ON pet_medications(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_pet_id ON pet_vaccinations(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_vets_pet_id ON pet_vets(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_emergency_contacts_pet_id ON pet_emergency_contacts(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_reminder_rules_pet_id ON pet_reminder_rules(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_reminder_rules_due_scan
  ON pet_reminder_rules(is_enabled, next_due_date, record_type, channel);
CREATE INDEX IF NOT EXISTS idx_pet_reminder_notifications_rule_id
  ON pet_reminder_notifications(reminder_rule_id);
CREATE INDEX IF NOT EXISTS idx_pet_reminder_notifications_status
  ON pet_reminder_notifications(status, queued_at);
`;

async function migrate() {
  console.log('Running database migrations...');
  try {
    await pool.query(migrations);
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate();
