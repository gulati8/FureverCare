import { query, queryOne } from '../db/pool.js';
import { cacheGet, cacheSet, cacheDelete } from '../db/redis.js';

export interface EmailTemplate {
  id: number;
  email_type: string;
  brevo_template_id: number;
  description: string | null;
  updated_at: Date;
  updated_by: number | null;
}

export async function getAllEmailTemplates(): Promise<EmailTemplate[]> {
  return query<EmailTemplate>(
    'SELECT * FROM email_templates ORDER BY email_type'
  );
}

export async function getEmailTemplateByType(emailType: string): Promise<EmailTemplate | null> {
  return queryOne<EmailTemplate>(
    'SELECT * FROM email_templates WHERE email_type = $1',
    [emailType]
  );
}

export async function upsertEmailTemplate(
  emailType: string,
  brevoTemplateId: number,
  description: string | null,
  updatedBy: number
): Promise<EmailTemplate> {
  const row = await queryOne<EmailTemplate>(
    `INSERT INTO email_templates (email_type, brevo_template_id, description, updated_at, updated_by)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4)
     ON CONFLICT (email_type) DO UPDATE SET
       brevo_template_id = EXCLUDED.brevo_template_id,
       description = EXCLUDED.description,
       updated_at = CURRENT_TIMESTAMP,
       updated_by = EXCLUDED.updated_by
     RETURNING *`,
    [emailType, brevoTemplateId, description, updatedBy]
  );
  await cacheDelete('email_template:' + emailType);
  return row!;
}

export async function deleteEmailTemplate(emailType: string): Promise<void> {
  await query(
    'DELETE FROM email_templates WHERE email_type = $1',
    [emailType]
  );
  await cacheDelete('email_template:' + emailType);
}

export async function getTemplateId(emailType: string): Promise<number> {
  const cached = await cacheGet<number>('email_template:' + emailType);
  if (cached !== null) {
    return cached;
  }

  const row = await queryOne<EmailTemplate>(
    'SELECT * FROM email_templates WHERE email_type = $1',
    [emailType]
  );

  if (!row) {
    throw new Error(`Email template not configured for type: ${emailType}`);
  }

  if (row.brevo_template_id === 0) {
    throw new Error(`Email template ID not set for type: ${emailType}. Configure it in the admin panel.`);
  }

  await cacheSet('email_template:' + emailType, row.brevo_template_id, 300);
  return row.brevo_template_id;
}
