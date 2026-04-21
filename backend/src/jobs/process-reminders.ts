import type { Job } from 'bullmq';
import { config } from '../config/index.js';
import { prisma } from '../db/prisma.js';
import {
  advanceMedicationReminderRule,
  getDueReminderRules,
  getQueuedReminderNotifications,
  getReminderNotificationById,
  getReminderRecipients,
  markReminderNotificationFailed,
  markReminderNotificationSent,
  queueReminderNotifications,
} from '../models/reminders.js';
import {
  buildMedicationReminderNotification,
  buildVaccinationReminderNotification,
  notifications,
} from '../services/notifications.js';
import {
  enqueueNotificationDelivery,
  type NotificationDeliveryJob,
  type ReminderProcessingJob,
} from '../services/reminder-scheduler.js';

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function toIsoDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getProcessingDate(jobData?: ReminderProcessingJob): string {
  if (jobData?.processingDate) {
    return jobData.processingDate;
  }

  return toIsoDateString(new Date());
}

async function enqueueExistingQueuedNotifications() {
  const pendingNotifications = await getQueuedReminderNotifications();

  for (const notification of pendingNotifications) {
    await enqueueNotificationDelivery(notification.id);
  }
}

export async function processDueReminders(
  jobData?: ReminderProcessingJob
): Promise<{ processedRules: number; queuedNotifications: number }> {
  await enqueueExistingQueuedNotifications();

  const processingDate = getProcessingDate(jobData);
  const dueRules = await getDueReminderRules(processingDate);

  let queuedNotifications = 0;

  for (const rule of dueRules) {
    const recipients = await getReminderRecipients(rule.pet_id);
    if (recipients.length === 0) {
      continue;
    }

    const insertedNotifications = await prisma.$transaction(async (client) => {
      const created = await queueReminderNotifications(client, {
        rule,
        recipients,
      });

      if (
        created.length > 0 &&
        rule.record_type === 'medication' &&
        rule.recurrence_value !== null &&
        rule.recurrence_unit !== null
      ) {
        await advanceMedicationReminderRule(
          client,
          rule.id,
          rule.next_due_date
        );
      }

      return created;
    });

    queuedNotifications += insertedNotifications.length;

    for (const notification of insertedNotifications) {
      await enqueueNotificationDelivery(notification.id);
    }
  }

  return {
    processedRules: dueRules.length,
    queuedNotifications,
  };
}

export async function deliverReminderNotification(
  notificationId: number,
  job?: Job<NotificationDeliveryJob>
) {
  const notification = await getReminderNotificationById(notificationId);
  if (!notification) {
    return { skipped: true };
  }

  const manageUrl = `${config.frontend.url}/pets/${notification.pet_id}/health`;
  const dueDate = formatDate(notification.due_date);

  const payload =
    notification.record_type === 'vaccination'
      ? buildVaccinationReminderNotification(
          notification.recipient_name,
          notification.pet_name,
          notification.record_name,
          dueDate,
          manageUrl
        )
      : buildMedicationReminderNotification(
          notification.recipient_name,
          notification.pet_name,
          notification.record_name,
          dueDate,
          manageUrl
        );

  try {
    const [result] = await notifications.send({
      to: notification.recipient_email,
      ...payload,
    });

    if (!result.success) {
      throw new Error(result.error || 'Notification send failed');
    }

    await markReminderNotificationSent(
      notification.id,
      result.messageId ?? null
    );

    return {
      sent: true,
      notificationId: notification.id,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown reminder delivery error';

    const maxAttempts = job?.opts.attempts ?? 1;
    const nextAttempt = (job?.attemptsMade ?? 0) + 1;
    if (nextAttempt >= maxAttempts) {
      await markReminderNotificationFailed(notification.id, message);
    }

    throw error;
  }
}
