import { Queue, type JobsOptions } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../config/index.js';

export interface ReminderProcessingJob {
  trigger: 'scheduler' | 'manual';
  processingDate?: string;
}

export interface NotificationDeliveryJob {
  notificationId: number;
}

function createQueueConnection() {
  return new IORedis(config.redis.url, {
    maxRetriesPerRequest: null,
  });
}

const reminderQueueConnection = createQueueConnection();
const notificationQueueConnection = createQueueConnection();

export const remindersQueue = new Queue<ReminderProcessingJob>(
  'reminders',
  {
    connection: reminderQueueConnection,
  }
);

export const notificationsQueue = new Queue<NotificationDeliveryJob>(
  'notifications',
  {
    connection: notificationQueueConnection,
  }
);

export function createWorkerConnection() {
  return createQueueConnection();
}

export async function ensureReminderSchedule() {
  await remindersQueue.upsertJobScheduler(
    'daily-reminder-scan',
    {
      pattern: config.reminders.processCron,
      tz: config.reminders.timezone,
    },
    {
      name: 'process-reminders',
      data: {
        trigger: 'scheduler',
      },
      opts: {
        removeOnComplete: 10,
        removeOnFail: false,
      },
    }
  );
}

export async function enqueueNotificationDelivery(
  notificationId: number,
  opts: JobsOptions = {}
) {
  await notificationsQueue.add(
    'send-notification',
    { notificationId },
    {
      jobId: `notification-${notificationId}`,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 60_000,
      },
      removeOnComplete: 200,
      removeOnFail: false,
      ...opts,
    }
  );
}

export async function closeReminderQueues() {
  await Promise.all([
    remindersQueue.close(),
    notificationsQueue.close(),
    reminderQueueConnection.quit(),
    notificationQueueConnection.quit(),
  ]);
}
