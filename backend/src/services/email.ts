import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { config } from '../config/index.js';

const sesClient = new SESClient({
  region: config.email.ses.region,
  credentials: config.email.ses.accessKeyId && config.email.ses.secretAccessKey
    ? {
        accessKeyId: config.email.ses.accessKeyId,
        secretAccessKey: config.email.ses.secretAccessKey,
      }
    : undefined,
});

export interface SendEmailParams {
  to: string;
  subject: string;
  textBody: string;
  htmlBody?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const { to, subject, textBody, htmlBody } = params;

  if (config.isDevelopment && !config.email.ses.accessKeyId) {
    console.log('=== DEV MODE: Email would be sent ===');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${textBody}`);
    console.log('=====================================');
    return true;
  }

  try {
    const command = new SendEmailCommand({
      Source: `${config.email.fromName} <${config.email.fromAddress}>`,
      Destination: {
        ToAddresses: [to],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Text: {
            Data: textBody,
            Charset: 'UTF-8',
          },
          ...(htmlBody && {
            Html: {
              Data: htmlBody,
              Charset: 'UTF-8',
            },
          }),
        },
      },
    });

    await sesClient.send(command);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

export function generatePasswordResetEmail(resetUrl: string, userName: string): { subject: string; textBody: string; htmlBody: string } {
  const subject = 'Reset Your FureverCare Password';

  const textBody = `Hi ${userName},

You requested to reset your password for your FureverCare account.

Click the link below to reset your password:
${resetUrl}

This link will expire in ${config.passwordReset.tokenExpiryMinutes} minutes.

If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.

Best regards,
The FureverCare Team`;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">FureverCare</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <h2 style="color: #1f2937; margin-top: 0;">Reset Your Password</h2>

    <p>Hi ${userName},</p>

    <p>You requested to reset your password for your FureverCare account.</p>

    <p style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Reset Password</a>
    </p>

    <p style="color: #6b7280; font-size: 14px;">This link will expire in ${config.passwordReset.tokenExpiryMinutes} minutes.</p>

    <p style="color: #6b7280; font-size: 14px;">If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
      &copy; ${new Date().getFullYear()} FureverCare. Keeping your pets' health information safe.
    </p>
  </div>
</body>
</html>`;

  return { subject, textBody, htmlBody };
}
