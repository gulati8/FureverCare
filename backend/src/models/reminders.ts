import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma.js';

type PrismaClientLike = typeof prisma | Prisma.TransactionClient;

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

function isReminderEnabled(reminder: ReminderConfigFields): boolean {
  return reminder.reminder_enabled && Boolean(reminder.reminder_next_due_date);
}

function startOfUtcDay(value: string | Date): Date {
  const date = typeof value === 'string' ? new Date(`${value}T00:00:00.000Z`) : value;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
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
  client: PrismaClientLike,
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
    await client.pet_reminder_rules.deleteMany({
      where: {
        record_type: recordType,
        record_id: recordId,
      },
    });
    return null;
  }

  const channel = reminder.reminder_channel ?? 'email';
  const existing = await client.pet_reminder_rules.findFirst({
    where: {
      record_type: recordType,
      record_id: recordId,
      channel,
    },
  });

  const payload = {
    pet_id: petId,
    record_type: recordType,
    record_id: recordId,
    channel,
    lead_time_value: reminder.reminder_lead_time_value!,
    lead_time_unit: reminder.reminder_lead_time_unit!,
    next_due_date: reminder.reminder_next_due_date!,
    recurrence_value: reminder.reminder_recurrence_value,
    recurrence_unit: reminder.reminder_recurrence_unit,
    is_enabled: true,
    updated_by_user_id: userId ?? null,
    updated_at: new Date(),
  };

  const result = existing
    ? await client.pet_reminder_rules.update({
        where: {
          id: existing.id,
        },
        data: payload,
      })
    : await client.pet_reminder_rules.create({
        data: {
          ...payload,
          created_by_user_id: userId ?? null,
        },
      });

  return {
    id: result.id,
    pet_id: result.pet_id,
    record_type: result.record_type as ReminderRecordType,
    record_id: result.record_id,
    channel: result.channel as ReminderChannel,
    lead_time_value: result.lead_time_value,
    lead_time_unit: result.lead_time_unit as ReminderLeadTimeUnit,
    next_due_date: result.next_due_date,
    recurrence_value: result.recurrence_value,
    recurrence_unit: result.recurrence_unit as ReminderRecurrenceUnit | null,
    is_enabled: result.is_enabled,
    created_by_user_id: result.created_by_user_id,
    updated_by_user_id: result.updated_by_user_id,
    created_at: result.created_at ?? new Date(),
    updated_at: result.updated_at ?? new Date(),
  };
}

export async function deleteReminderRuleForRecord(
  client: PrismaClientLike,
  recordType: ReminderRecordType,
  recordId: number
): Promise<void> {
  await client.pet_reminder_rules.deleteMany({
    where: {
      record_type: recordType,
      record_id: recordId,
    },
  });
}

export async function getReminderRecipients(petId: number): Promise<ReminderRecipient[]> {
  const owners = await prisma.pet_owners.findMany({
    where: {
      pet_id: petId,
      accepted_at: {
        not: null,
      },
      role: {
        in: ['owner', 'editor'],
      },
    },
    include: {
      users_pet_owners_user_idTousers: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
    orderBy: [
      {
        role: 'asc',
      },
      {
        accepted_at: 'asc',
      },
    ],
  });

  return owners
    .sort((a, b) => {
      if (a.role === b.role) {
        return (a.accepted_at?.getTime() ?? 0) - (b.accepted_at?.getTime() ?? 0);
      }
      return a.role === 'owner' ? -1 : 1;
    })
    .map((owner) => ({
      user_id: owner.users_pet_owners_user_idTousers.id,
      user_email: owner.users_pet_owners_user_idTousers.email,
      user_name: owner.users_pet_owners_user_idTousers.name,
      role: owner.role as 'owner' | 'editor',
    }));
}

export async function getDueReminderRules(processingDate: string): Promise<ReminderProcessingRule[]> {
  const processingDay = startOfUtcDay(processingDate);
  const rules = await prisma.pet_reminder_rules.findMany({
    where: {
      is_enabled: true,
    },
    include: {
      pets: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [
      {
        next_due_date: 'asc',
      },
      {
        id: 'asc',
      },
    ],
  });

  const dueRules: ReminderProcessingRule[] = [];

  for (const rule of rules) {
    const dueDate = startOfUtcDay(rule.next_due_date);
    const leadDays =
      rule.lead_time_unit === 'weeks'
        ? rule.lead_time_value * 7
        : rule.lead_time_value;
    const firstSendDate = addDays(dueDate, -leadDays);

    if (processingDay < firstSendDate || processingDay > dueDate) {
      continue;
    }

    let recordName: string | null = null;

    if (rule.record_type === 'vaccination') {
      const vaccination = await prisma.pet_vaccinations.findFirst({
        where: {
          id: rule.record_id,
          pet_id: rule.pet_id,
        },
        select: {
          name: true,
        },
      });
      recordName = vaccination?.name ?? null;
    } else if (rule.record_type === 'medication') {
      const medication = await prisma.pet_medications.findFirst({
        where: {
          id: rule.record_id,
          pet_id: rule.pet_id,
          is_active: true,
        },
        select: {
          name: true,
        },
      });
      recordName = medication?.name ?? null;
    }

    if (!recordName) {
      continue;
    }

    dueRules.push({
      id: rule.id,
      pet_id: rule.pet_id,
      record_type: rule.record_type as ReminderRecordType,
      record_id: rule.record_id,
      channel: rule.channel as ReminderChannel,
      lead_time_value: rule.lead_time_value,
      lead_time_unit: rule.lead_time_unit as ReminderLeadTimeUnit,
      next_due_date: rule.next_due_date,
      recurrence_value: rule.recurrence_value,
      recurrence_unit: rule.recurrence_unit as ReminderRecurrenceUnit | null,
      is_enabled: rule.is_enabled,
      created_by_user_id: rule.created_by_user_id,
      updated_by_user_id: rule.updated_by_user_id,
      created_at: rule.created_at ?? new Date(),
      updated_at: rule.updated_at ?? new Date(),
      pet_name: rule.pets.name,
      record_name: recordName,
    });
  }

  return dueRules;
}

export async function queueReminderNotifications(
  client: PrismaClientLike,
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
    try {
      const created = await client.pet_reminder_notifications.create({
        data: {
          reminder_rule_id: rule.id,
          recipient_user_id: recipient.user_id,
          pet_id: rule.pet_id,
          record_type: rule.record_type,
          record_id: rule.record_id,
          due_date: rule.next_due_date,
          channel: rule.channel,
          status: 'queued',
        },
      });

      inserted.push({
        id: created.id,
        reminder_rule_id: created.reminder_rule_id,
        recipient_user_id: created.recipient_user_id,
        pet_id: created.pet_id,
        record_type: created.record_type as ReminderRecordType,
        record_id: created.record_id,
        due_date: created.due_date,
        channel: created.channel as ReminderChannel,
        status: created.status as ReminderNotificationStatus,
        queued_at: created.queued_at ?? new Date(),
        sent_at: created.sent_at,
        failed_at: created.failed_at,
        provider_message_id: created.provider_message_id,
        error_message: created.error_message,
      });
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2002'
      ) {
        throw error;
      }
    }
  }

  return inserted;
}

export async function advanceMedicationReminderRule(
  client: PrismaClientLike,
  ruleId: number,
  expectedDueDate: Date
): Promise<ReminderRule | null> {
  const rule = await client.pet_reminder_rules.findFirst({
    where: {
      id: ruleId,
      next_due_date: expectedDueDate,
      record_type: 'medication',
      recurrence_value: {
        not: null,
      },
      recurrence_unit: {
        not: null,
      },
    },
  });

  if (!rule || !rule.recurrence_value || !rule.recurrence_unit) {
    return null;
  }

  const nextDueDate = new Date(rule.next_due_date);
  if (rule.recurrence_unit === 'months') {
    nextDueDate.setUTCMonth(nextDueDate.getUTCMonth() + rule.recurrence_value);
  } else if (rule.recurrence_unit === 'years') {
    nextDueDate.setUTCFullYear(nextDueDate.getUTCFullYear() + rule.recurrence_value);
  }

  const updated = await client.pet_reminder_rules.update({
    where: {
      id: rule.id,
    },
    data: {
      next_due_date: nextDueDate,
      updated_at: new Date(),
    },
  });

  return {
    id: updated.id,
    pet_id: updated.pet_id,
    record_type: updated.record_type as ReminderRecordType,
    record_id: updated.record_id,
    channel: updated.channel as ReminderChannel,
    lead_time_value: updated.lead_time_value,
    lead_time_unit: updated.lead_time_unit as ReminderLeadTimeUnit,
    next_due_date: updated.next_due_date,
    recurrence_value: updated.recurrence_value,
    recurrence_unit: updated.recurrence_unit as ReminderRecurrenceUnit | null,
    is_enabled: updated.is_enabled,
    created_by_user_id: updated.created_by_user_id,
    updated_by_user_id: updated.updated_by_user_id,
    created_at: updated.created_at ?? new Date(),
    updated_at: updated.updated_at ?? new Date(),
  };
}

export async function getQueuedReminderNotifications(): Promise<ReminderNotification[]> {
  const notifications = await prisma.pet_reminder_notifications.findMany({
    where: {
      status: 'queued',
      sent_at: null,
    },
    orderBy: [
      {
        queued_at: 'asc',
      },
      {
        id: 'asc',
      },
    ],
  });

  return notifications.map((notification) => ({
    id: notification.id,
    reminder_rule_id: notification.reminder_rule_id,
    recipient_user_id: notification.recipient_user_id,
    pet_id: notification.pet_id,
    record_type: notification.record_type as ReminderRecordType,
    record_id: notification.record_id,
    due_date: notification.due_date,
    channel: notification.channel as ReminderChannel,
    status: notification.status as ReminderNotificationStatus,
    queued_at: notification.queued_at ?? new Date(),
    sent_at: notification.sent_at,
    failed_at: notification.failed_at,
    provider_message_id: notification.provider_message_id,
    error_message: notification.error_message,
  }));
}

export async function getReminderNotificationById(
  id: number
): Promise<ReminderNotificationWithContext | null> {
  const notification = await prisma.pet_reminder_notifications.findUnique({
    where: {
      id,
    },
    include: {
      users: {
        select: {
          email: true,
          name: true,
        },
      },
      pets: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!notification) {
    return null;
  }

  let recordName: string | null = null;
  if (notification.record_type === 'vaccination') {
    const vaccination = await prisma.pet_vaccinations.findUnique({
      where: {
        id: notification.record_id,
      },
      select: {
        name: true,
      },
    });
    recordName = vaccination?.name ?? null;
  } else if (notification.record_type === 'medication') {
    const medication = await prisma.pet_medications.findUnique({
      where: {
        id: notification.record_id,
      },
      select: {
        name: true,
      },
    });
    recordName = medication?.name ?? null;
  }

  return {
    id: notification.id,
    reminder_rule_id: notification.reminder_rule_id,
    recipient_user_id: notification.recipient_user_id,
    pet_id: notification.pet_id,
    record_type: notification.record_type as ReminderRecordType,
    record_id: notification.record_id,
    due_date: notification.due_date,
    channel: notification.channel as ReminderChannel,
    status: notification.status as ReminderNotificationStatus,
    queued_at: notification.queued_at ?? new Date(),
    sent_at: notification.sent_at,
    failed_at: notification.failed_at,
    provider_message_id: notification.provider_message_id,
    error_message: notification.error_message,
    recipient_email: notification.users.email,
    recipient_name: notification.users.name,
    pet_name: notification.pets.name,
    record_name: recordName ?? 'Record',
  };
}

export async function markReminderNotificationSent(
  id: number,
  providerMessageId: string | null
): Promise<void> {
  await prisma.pet_reminder_notifications.updateMany({
    where: {
      id,
    },
    data: {
      status: 'sent',
      sent_at: new Date(),
      failed_at: null,
      error_message: null,
      provider_message_id: providerMessageId,
    },
  });
}

export async function markReminderNotificationFailed(
  id: number,
  errorMessage: string
): Promise<void> {
  await prisma.pet_reminder_notifications.updateMany({
    where: {
      id,
    },
    data: {
      status: 'failed',
      failed_at: new Date(),
      error_message: errorMessage,
    },
  });
}
