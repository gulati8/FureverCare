import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { config } from './config/index.js';
import authRoutes from './routes/auth.js';
import petRoutes from './routes/pets.js';
import publicRoutes from './routes/public.js';
import uploadRoutes from './routes/upload.js';
import ownersRoutes from './routes/owners.js';
import pdfImportRoutes from './routes/pdf-import.js';
import photoImportRoutes from './routes/photo-import.js';
import documentImportRoutes from './routes/document-import.js';
import auditRoutes from './routes/audit.js';
import shareTokenRoutes from './routes/share-tokens.js';
import cmsRoutes from './routes/cms.js';
import adminUsersRoutes from './routes/admin-users.js';
import adminPetsRoutes from './routes/admin-pets.js';
import adminAnalyticsRoutes from './routes/admin-analytics.js';
import billingRoutes from './routes/billing.js';
import subscriptionAdminRoutes from './routes/subscription-admin.js';
import stripeWebhookRoutes from './routes/stripe-webhook.js';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.frontend.url,
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.isProduction ? 500 : 10000, // higher limit in dev
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// Stripe webhook route (must be before body parsing - needs raw body)
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhookRoutes);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Static files (uploads)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Apple Pay domain verification
app.use('/.well-known', express.static(path.join(process.cwd(), '.well-known')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/pets', pdfImportRoutes);    // PDF import routes under /api/pets/:petId/pdf-import
app.use('/api/pets', photoImportRoutes);  // Photo import routes under /api/pets/:petId/photo-import
app.use('/api/pets', documentImportRoutes); // Unified document import routes under /api/pets/:petId/documents
app.use('/api/pets', auditRoutes);        // Audit routes under /api/pets/:petId/audit
app.use('/api/public', publicRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/owners', ownersRoutes);
app.use('/api', shareTokenRoutes);  // Share token routes under /api/pets/:petId/share-tokens
app.use('/api/cms', cmsRoutes);     // CMS routes under /api/cms
app.use('/api/admin/users', adminUsersRoutes);  // Admin users routes
app.use('/api/admin/pets', adminPetsRoutes);    // Admin pets routes
app.use('/api/admin/analytics', adminAnalyticsRoutes);  // Admin analytics routes
app.use('/api/billing', billingRoutes);  // Billing routes under /api/billing
app.use('/api/admin/subscription', subscriptionAdminRoutes);  // Subscription admin routes

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(config.port, () => {
  console.log(`FureverCare API running on port ${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
});

export default app;
