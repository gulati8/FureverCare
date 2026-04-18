import { pool } from './pool.js';

const migration = `
-- Add standalone reminder rules and delivery history
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

CREATE INDEX IF NOT EXISTS idx_pet_reminder_rules_pet_id ON pet_reminder_rules(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_reminder_rules_due_scan
  ON pet_reminder_rules(is_enabled, next_due_date, record_type, channel);

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

CREATE INDEX IF NOT EXISTS idx_pet_reminder_notifications_rule_id
  ON pet_reminder_notifications(reminder_rule_id);
CREATE INDEX IF NOT EXISTS idx_pet_reminder_notifications_status
  ON pet_reminder_notifications(status, queued_at);
`;

async function migrate() {
  console.log('Running reminders migration...');
  try {
    await pool.query(migration);
    console.log('Reminders migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate();
