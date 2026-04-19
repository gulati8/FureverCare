import type { PoolClient } from 'pg';
import { query, queryOne } from '../db/pool.js';

export type ReminderRecordType = 'vaccination' | 'medication';
export type ReminderChannel = 'email';
export type ReminderLeadTimeUnit = 'days' | 'weeks';
export type ReminderRecurrenceUnit = 'months' | 'years';
export type ReminderNotificationStatus = 'queued' | 'sent' | 'failed';

export interface ReminderConfigFields {
  reminder_enabled: boolean;
  reminder_channel: ReminderChannel | null;
  reminder_lead_time_value: number | null;
  reminder_lead_time_unit: ReminderLeadTimeUnit | null;
  reminder_next_due_date: Date | null;
  reminder_recurrence_value: number | null;
  reminder_recurrence_unit: ReminderRecurrenceUnit | null;
}

export interface ReminderRule {
  id: number;
  pet_id: number;
  record_type: ReminderRecordType;
  record_id: number;
  channel: ReminderChannel;
  lead_time_value: number;
  lead_time_unit: ReminderLeadTimeUnit;
  next_due_date: Date;
  recurrence_value: number | null;
  recurrence_unit: ReminderRecurrenceUnit | null;
  is_enabled: boolean;
  created_by_user_id: number | null;
  updated_by_user_id: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface ReminderNotification {
  id: number;
  reminder_rule_id: number;
  recipient_user_id: number;
  pet_id: number;
  record_type: ReminderRecordType;
  record_id: number;
  due_date: Date;
  channel: ReminderChannel;
  status: ReminderNotificationStatus;
  queued_at: Date;
  sent_at: Date | null;
  failed_at: Date | null;
  provider_message_id: string | null;
  error_message: string | null;
}

export interface ReminderRecipient {
  user_id: number;
  user_email: string;
  user_name: string;
  role: 'owner' | 'editor';
}

export interface ReminderProcessingRule extends ReminderRule {
  pet_name: string;
  record_name: string;
}

export interface ReminderNotificationWithContext extends ReminderNotification {
  recipient_email: string;
  recipient_name: string;
  pet_name: string;
  record_name: string;
}

function mapQueryOne<T>(result: { rows: T[] }): T | null {
  return result.rows[0] ?? null;
}

function isReminderEnabled(reminder: ReminderConfigFields): boolean {
  return reminder.reminder_enabled && Boolean(reminder.reminder_next_due_date);
}

export function getReminderSelectColumns(alias: string = 'rr'): string {
  return `
    COALESCE(${alias}.is_enabled, false) AS reminder_enabled,
    ${alias}.channel AS reminder_channel,
    ${alias}.lead_time_value AS reminder_lead_time_value,
    ${alias}.lead_time_unit AS reminder_lead_time_unit,
    ${alias}.next_due_date AS reminder_next_due_date,
    ${alias}.recurrence_value AS reminder_recurrence_value,
    ${alias}.recurrence_unit AS reminder_recurrence_unit
  `;
}

export async function upsertReminderRuleForRecord(
  client: PoolClient,
  {
    petId,
    recordType,
    recordId,
    reminder,
    userId,
  }: {
    petId: number;
    recordType: ReminderRecordType;
    recordId: number;
    reminder: ReminderConfigFields;
    userId?: number;
  }
): Promise<ReminderRule | null> {
  if (!isReminderEnabled(reminder)) {
    await client.query(
      'DELETE FROM pet_reminder_rules WHERE record_type = $1 AND record_id = $2',
      [recordType, recordId]
    );
    return null;
  }

  const channel = reminder.reminder_channel ?? 'email';
  const result = await client.query<ReminderRule>(
    `INSERT INTO pet_reminder_rules (
       pet_id,
       record_type,
       record_id,
       channel,
       lead_time_value,
       lead_time_unit,
       next_due_date,
       recurrence_value,
       recurrence_unit,
       is_enabled,
       created_by_user_id,
       updated_by_user_id
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10, $10)
     ON CONFLICT (record_type, record_id, channel)
     DO UPDATE SET
       pet_id = EXCLUDED.pet_id,
       lead_time_value = EXCLUDED.lead_time_value,
       lead_time_unit = EXCLUDED.lead_time_unit,
       next_due_date = EXCLUDED.next_due_date,
       recurrence_value = EXCLUDED.recurrence_value,
       recurrence_unit = EXCLUDED.recurrence_unit,
       is_enabled = true,
       updated_by_user_id = EXCLUDED.updated_by_user_id,
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [
      petId,
      recordType,
      recordId,
      channel,
      reminder.reminder_lead_time_value,
      reminder.reminder_lead_time_unit,
      reminder.reminder_next_due_date,
      reminder.reminder_recurrence_value,
      reminder.reminder_recurrence_unit,
      userId ?? null,
    ]
  );

  return mapQueryOne(result);
}

export async function deleteReminderRuleForRecord(
  client: PoolClient,
  recordType: ReminderRecordType,
  recordId: number
): Promise<void> {
  await client.query(
    'DELETE FROM pet_reminder_rules WHERE record_type = $1 AND record_id = $2',
    [recordType, recordId]
  );
}

export async function getReminderRecipients(petId: number): Promise<ReminderRecipient[]> {
  return query<ReminderRecipient>(
    `SELECT u.id AS user_id, u.email AS user_email, u.name AS user_name, po.role
     FROM pet_owners po
     JOIN users u ON u.id = po.user_id
     WHERE po.pet_id = $1
       AND po.accepted_at IS NOT NULL
       AND po.role IN ('owner', 'editor')
     ORDER BY po.role = 'owner' DESC, po.accepted_at ASC`,
    [petId]
  );
}

export async function getDueReminderRules(processingDate: string): Promise<ReminderProcessingRule[]> {
  return query<ReminderProcessingRule>(
    `SELECT rr.*, p.name AS pet_name,
            CASE
              WHEN rr.record_type = 'vaccination' THEN v.name
              WHEN rr.record_type = 'medication' THEN m.name
            END AS record_name
     FROM pet_reminder_rules rr
     JOIN pets p ON p.id = rr.pet_id
     LEFT JOIN pet_vaccinations v
       ON rr.record_type = 'vaccination'
      AND v.id = rr.record_id
      AND v.pet_id = rr.pet_id
     LEFT JOIN pet_medications m
       ON rr.record_type = 'medication'
      AND m.id = rr.record_id
      AND m.pet_id = rr.pet_id
      AND m.is_active = true
     WHERE rr.is_enabled = true
       AND $1::date BETWEEN
         (
           rr.next_due_date
           - (
               CASE
                 WHEN rr.lead_time_unit = 'weeks' THEN rr.lead_time_value * 7
                 ELSE rr.lead_time_value
               END * INTERVAL '1 day'
             )
         )::date
         AND rr.next_due_date
       AND (
         (rr.record_type = 'vaccination' AND v.id IS NOT NULL)
         OR
         (rr.record_type = 'medication' AND m.id IS NOT NULL)
       )
     ORDER BY rr.next_due_date ASC, rr.id ASC`,
    [processingDate]
  );
}

export async function queueReminderNotifications(
  client: PoolClient,
  {
    rule,
    recipients,
  }: {
    rule: ReminderProcessingRule;
    recipients: ReminderRecipient[];
  }
): Promise<ReminderNotification[]> {
  const inserted: ReminderNotification[] = [];

  for (const recipient of recipients) {
    const result = await client.query<ReminderNotification>(
      `INSERT INTO pet_reminder_notifications (
         reminder_rule_id,
         recipient_user_id,
         pet_id,
         record_type,
         record_id,
         due_date,
         channel,
         status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'queued')
       ON CONFLICT (reminder_rule_id, recipient_user_id, due_date, channel) DO NOTHING
       RETURNING *`,
      [
        rule.id,
        recipient.user_id,
        rule.pet_id,
        rule.record_type,
        rule.record_id,
        rule.next_due_date,
        rule.channel,
      ]
    );

    if (result.rows[0]) {
      inserted.push(result.rows[0]);
    }
  }

  return inserted;
}

export async function advanceMedicationReminderRule(
  client: PoolClient,
  ruleId: number,
  expectedDueDate: Date
): Promise<ReminderRule | null> {
  const result = await client.query<ReminderRule>(
    `UPDATE pet_reminder_rules
     SET next_due_date = CASE
           WHEN recurrence_unit = 'months' THEN (next_due_date + make_interval(months => recurrence_value))::date
           WHEN recurrence_unit = 'years' THEN (next_due_date + make_interval(years => recurrence_value))::date
           ELSE next_due_date
         END,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
       AND next_due_date = $2
       AND record_type = 'medication'
       AND recurrence_value IS NOT NULL
       AND recurrence_unit IS NOT NULL
     RETURNING *`,
    [ruleId, expectedDueDate]
  );

  return mapQueryOne(result);
}

export async function getQueuedReminderNotifications(): Promise<ReminderNotification[]> {
  return query<ReminderNotification>(
    `SELECT *
     FROM pet_reminder_notifications
     WHERE status = 'queued'
       AND sent_at IS NULL
     ORDER BY queued_at ASC, id ASC`
  );
}

export async function getReminderNotificationById(
  id: number
): Promise<ReminderNotificationWithContext | null> {
  return queryOne<ReminderNotificationWithContext>(
    `SELECT rn.*, u.email AS recipient_email, u.name AS recipient_name, p.name AS pet_name,
            CASE
              WHEN rn.record_type = 'vaccination' THEN v.name
              WHEN rn.record_type = 'medication' THEN m.name
            END AS record_name
     FROM pet_reminder_notifications rn
     JOIN users u ON u.id = rn.recipient_user_id
     JOIN pets p ON p.id = rn.pet_id
     LEFT JOIN pet_vaccinations v
       ON rn.record_type = 'vaccination'
      AND v.id = rn.record_id
     LEFT JOIN pet_medications m
       ON rn.record_type = 'medication'
      AND m.id = rn.record_id
     WHERE rn.id = $1`,
    [id]
  );
}

export async function markReminderNotificationSent(
  id: number,
  providerMessageId: string | null
): Promise<void> {
  await query(
    `UPDATE pet_reminder_notifications
     SET status = 'sent',
         sent_at = CURRENT_TIMESTAMP,
         failed_at = NULL,
         error_message = NULL,
         provider_message_id = $2
     WHERE id = $1`,
    [id, providerMessageId]
  );
}

export async function markReminderNotificationFailed(
  id: number,
  errorMessage: string
): Promise<void> {
  await query(
    `UPDATE pet_reminder_notifications
     SET status = 'failed',
         failed_at = CURRENT_TIMESTAMP,
         error_message = $2
     WHERE id = $1`,
    [id, errorMessage]
  );
}
