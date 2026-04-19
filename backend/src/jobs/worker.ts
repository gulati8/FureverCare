import { Worker } from 'bullmq';
import { config } from '../config/index.js';
import { deliverReminderNotification, processDueReminders } from './process-reminders.js';
import {
  closeReminderQueues,
  createWorkerConnection,
  ensureReminderSchedule,
  type NotificationDeliveryJob,
  type ReminderProcessingJob,
} from '../services/reminder-scheduler.js';

async function main() {
  await ensureReminderSchedule();

  const reminderWorkerConnection = createWorkerConnection();
  const notificationWorkerConnection = createWorkerConnection();

  const reminderWorker = new Worker<ReminderProcessingJob>(
    'reminders',
    async (job) => {
      if (job.name !== 'process-reminders') {
        throw new Error(`Unsupported reminder job: ${job.name}`);
      }

      return processDueReminders(job.data);
    },
    {
      connection: reminderWorkerConnection,
      concurrency: config.reminders.workerConcurrency,
    }
  );

  const notificationWorker = new Worker<NotificationDeliveryJob>(
    'notifications',
    async (job) => {
      if (job.name !== 'send-notification') {
        throw new Error(`Unsupported notification job: ${job.name}`);
      }

      return deliverReminderNotification(job.data.notificationId, job);
    },
    {
      connection: notificationWorkerConnection,
      concurrency: config.reminders.notificationConcurrency,
    }
  );

  const shutdown = async (signal: string) => {
    console.log(`Shutting down reminder worker (${signal})...`);
    await Promise.all([
      reminderWorker.close(),
      notificationWorker.close(),
      reminderWorkerConnection.quit(),
      notificationWorkerConnection.quit(),
      closeReminderQueues(),
    ]);
    process.exit(0);
  };

  reminderWorker.on('completed', (job) => {
    console.log(`Reminder job completed: ${job.id}`);
  });

  reminderWorker.on('failed', (job, error) => {
    console.error(`Reminder job failed: ${job?.id}`, error);
  });

  notificationWorker.on('failed', (job, error) => {
    console.error(`Notification job failed: ${job?.id}`, error);
  });

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  console.log('Reminder worker started');
}

main().catch(async (error) => {
  console.error('Failed to start reminder worker:', error);
  await closeReminderQueues();
  process.exit(1);
});
