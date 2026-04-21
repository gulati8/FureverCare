import { prisma } from '../db/prisma.js';
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
  return prisma.email_templates.findMany({
    orderBy: {
      email_type: 'asc',
    },
  }) as Promise<EmailTemplate[]>;
}

export async function getEmailTemplateByType(emailType: string): Promise<EmailTemplate | null> {
  return prisma.email_templates.findUnique({
    where: {
      email_type: emailType,
    },
  }) as Promise<EmailTemplate | null>;
}

export async function upsertEmailTemplate(
  emailType: string,
  brevoTemplateId: number,
  description: string | null,
  updatedBy: number
): Promise<EmailTemplate> {
  const row = await prisma.email_templates.upsert({
    where: {
      email_type: emailType,
    },
    create: {
      email_type: emailType,
      brevo_template_id: brevoTemplateId,
      description,
      updated_by: updatedBy,
      updated_at: new Date(),
    },
    update: {
      brevo_template_id: brevoTemplateId,
      description,
      updated_by: updatedBy,
      updated_at: new Date(),
    },
  });
  await cacheDelete('email_template:' + emailType);
  return row as EmailTemplate;
}

export async function deleteEmailTemplate(emailType: string): Promise<void> {
  await prisma.email_templates.deleteMany({
    where: {
      email_type: emailType,
    },
  });
  await cacheDelete('email_template:' + emailType);
}

export async function getTemplateId(emailType: string): Promise<number> {
  const cached = await cacheGet<number>('email_template:' + emailType);
  if (cached !== null) {
    return cached;
  }

  const row = await prisma.email_templates.findUnique({
    where: {
      email_type: emailType,
    },
  });

  if (!row) {
    throw new Error(`Email template not configured for type: ${emailType}`);
  }

  if (row.brevo_template_id === 0) {
    throw new Error(`Email template ID not set for type: ${emailType}. Configure it in the admin panel.`);
  }

  await cacheSet('email_template:' + emailType, row.brevo_template_id, 300);
  return row.brevo_template_id;
}
