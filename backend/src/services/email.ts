import { BrevoClient } from '@getbrevo/brevo';
import { config } from '../config/index.js';
import { getTemplateId } from '../models/email-templates.js';

export interface SendEmailParams {
  to: string;
  emailType: string;
  params: Record<string, string | number | boolean>;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface EmailProvider {
  send(params: SendEmailParams): Promise<SendEmailResult>;
}

export const EMAIL_TYPES = {
  PASSWORD_RESET: 'password_reset',
  PET_INVITATION: 'pet_invitation',
} as const;

class ConsoleEmailProvider implements EmailProvider {
  async send(params: SendEmailParams): Promise<SendEmailResult> {
    const { to, emailType, params: emailParams } = params;

    console.log('=== CONSOLE EMAIL PROVIDER ===');
    console.log(`To: ${to}`);
    console.log(`Email Type: ${emailType}`);
    console.log('Params:', emailParams);
    console.log('=============================');

    return { success: true, messageId: `console-${Date.now()}` };
  }
}

class BrevoEmailProvider implements EmailProvider {
  private client: BrevoClient;

  constructor() {
    this.client = new BrevoClient({ apiKey: config.email.brevoApiKey });
  }

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    const { to, emailType, params: emailParams } = params;

    try {
      const templateId = await getTemplateId(emailType);

      const response = await this.client.transactionalEmails.sendTransacEmail({
        sender: {
          name: config.email.fromName,
          email: config.email.fromAddress,
        },
        to: [{ email: to }],
        templateId,
        params: emailParams,
      });

      return { success: true, messageId: response.messageId };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Brevo send failed:', message);
      return { success: false, error: message };
    }
  }
}

function createEmailProvider(): EmailProvider {
  if (config.email.brevoApiKey) {
    return new BrevoEmailProvider();
  }
  console.log('No BREVO_API_KEY configured — falling back to console email provider');
  return new ConsoleEmailProvider();
}

const emailProvider = createEmailProvider();

export const email = {
  async send(params: SendEmailParams): Promise<SendEmailResult> {
    return emailProvider.send(params);
  },

  isConfigured(): boolean {
    return Boolean(config.email.brevoApiKey);
  },
};

export function buildPasswordResetParams(
  resetUrl: string,
  userName: string,
  expiryMinutes: number
): { emailType: string; params: Record<string, string | number | boolean> } {
  return {
    emailType: EMAIL_TYPES.PASSWORD_RESET,
    params: { userName, resetUrl, expiryMinutes },
  };
}

export function buildPetInvitationParams(
  inviterName: string,
  petName: string,
  petPhotoUrl: string,
  inviteUrl: string,
  role: string
): { emailType: string; params: Record<string, string | number | boolean> } {
  return {
    emailType: EMAIL_TYPES.PET_INVITATION,
    params: { inviterName, petName, petPhotoUrl, inviteUrl, role },
  };
}
