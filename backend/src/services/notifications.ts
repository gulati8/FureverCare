import { email, type SendEmailResult } from './email.js';

export const NOTIFICATION_TYPES = {
  PASSWORD_RESET: 'password_reset',
  PET_INVITATION: 'pet_invitation',
  VACCINATION_REMINDER: 'vaccination_reminder',
  MEDICATION_REMINDER: 'medication_reminder',
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];
export type NotificationChannel = 'email';

export interface NotificationPayload {
  to: string;
  notificationType: NotificationType;
  params: Record<string, string | number | boolean>;
  channels?: NotificationChannel[];
}

export interface NotificationSendResult {
  channel: NotificationChannel;
  success: boolean;
  messageId?: string;
  error?: string;
}

function assertSupportedChannels(channels: NotificationChannel[]) {
  for (const channel of channels) {
    if (channel !== 'email') {
      throw new Error(`Unsupported notification channel: ${channel}`);
    }
  }
}

export const notifications = {
  async send({
    to,
    notificationType,
    params,
    channels = ['email'],
  }: NotificationPayload): Promise<NotificationSendResult[]> {
    assertSupportedChannels(channels);

    const results: NotificationSendResult[] = [];

    for (const channel of channels) {
      if (channel === 'email') {
        const result: SendEmailResult = await email.send({
          to,
          emailType: notificationType,
          params,
        });

        results.push({
          channel,
          success: result.success,
          messageId: result.messageId,
          error: result.error,
        });
      }
    }

    return results;
  },
};

export function buildPasswordResetNotification(
  resetUrl: string,
  userName: string,
  expiryMinutes: number
) {
  return {
    notificationType: NOTIFICATION_TYPES.PASSWORD_RESET,
    params: { userName, resetUrl, expiryMinutes },
  };
}

export function buildPetInvitationNotification(
  inviterName: string,
  petName: string,
  petPhotoUrl: string,
  inviteUrl: string,
  role: string
) {
  return {
    notificationType: NOTIFICATION_TYPES.PET_INVITATION,
    params: { inviterName, petName, petPhotoUrl, inviteUrl, role },
  };
}

export function buildVaccinationReminderNotification(
  userName: string,
  petName: string,
  vaccineName: string,
  dueDate: string,
  manageUrl: string
) {
  return {
    notificationType: NOTIFICATION_TYPES.VACCINATION_REMINDER,
    params: {
      userName,
      petName,
      vaccineName,
      dueDate,
      manageUrl,
    },
  };
}

export function buildMedicationReminderNotification(
  userName: string,
  petName: string,
  medicationName: string,
  dueDate: string,
  manageUrl: string
) {
  return {
    notificationType: NOTIFICATION_TYPES.MEDICATION_REMINDER,
    params: {
      userName,
      petName,
      medicationName,
      dueDate,
      manageUrl,
    },
  };
}
