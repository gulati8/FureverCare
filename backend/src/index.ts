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
import auditRoutes from './routes/audit.js';
import shareTokenRoutes from './routes/share-tokens.js';

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

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Static files (uploads)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/pets', pdfImportRoutes);  // PDF import routes under /api/pets/:petId/pdf-import
app.use('/api/pets', auditRoutes);       // Audit routes under /api/pets/:petId/audit
app.use('/api/public', publicRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/owners', ownersRoutes);
app.use('/api', shareTokenRoutes);  // Share token routes under /api/pets/:petId/share-tokens

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
