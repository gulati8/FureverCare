import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url: process.env.DATABASE_URL || 'postgresql://furevercare:furevercare_dev@localhost:5432/furevercare',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production',
    expiresIn: '7d',
  },

  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:5173',
  },

  claude: {
    apiKey: process.env.CLAUDE_API_KEY || '',
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
    maxTokens: parseInt(process.env.CLAUDE_MAX_TOKENS || '4096', 10),
  },

  pdfUpload: {
    maxSizeMB: parseInt(process.env.PDF_MAX_SIZE_MB || '20', 10),
    uploadDir: process.env.PDF_UPLOAD_DIR || 'uploads/pdfs',
    allowedMimeTypes: ['application/pdf'],
  },

  email: {
    provider: (process.env.EMAIL_PROVIDER || 'console') as 'ses' | 'smtp' | 'console',
    ses: {
      region: process.env.AWS_SES_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
    smtp: {
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '1025', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    },
    fromAddress: process.env.EMAIL_FROM_ADDRESS || 'noreply@furevercare.pet',
    fromName: process.env.EMAIL_FROM_NAME || 'FureverCare',
  },

  passwordReset: {
    tokenExpiryMinutes: parseInt(process.env.PASSWORD_RESET_EXPIRY_MINUTES || '60', 10),
  },

  imageUpload: {
    maxSizeMB: parseInt(process.env.IMAGE_MAX_SIZE_MB || '10', 10),
    uploadDir: process.env.IMAGE_UPLOAD_DIR || 'uploads/images',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  },

  documentUpload: {
    maxSizeMB: parseInt(process.env.DOCUMENT_MAX_SIZE_MB || '20', 10),
    uploadDir: process.env.DOCUMENT_UPLOAD_DIR || 'uploads/documents',
    allowedMimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ],
  },

  storage: {
    provider: (process.env.STORAGE_PROVIDER || 'local') as 'local' | 's3',
    s3: {
      bucket: process.env.S3_BUCKET || 'furevercare-uploads-dev',
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
    local: {
      baseDir: process.env.UPLOAD_BASE_DIR || 'uploads',
    },
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  },

  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production',
};
