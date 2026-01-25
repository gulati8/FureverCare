import rateLimit from 'express-rate-limit';
import { AuthRequest } from './auth.js';

// Rate limiter for Claude API calls (PDF processing)
// 10 requests per minute per user
export const claudeRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per window
  keyGenerator: (req: AuthRequest) => {
    // Use user ID for rate limiting (requires authentication)
    return `claude:${req.userId || req.ip}`;
  },
  message: {
    error: 'Too many PDF processing requests. Please wait a moment before trying again.',
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    res.status(429).json({
      error: 'Too many PDF processing requests. Please wait a moment before trying again.',
      retryAfter: Math.ceil((options.windowMs - (Date.now() % options.windowMs)) / 1000),
    });
  },
});

// More lenient rate limit for uploads (not API-bound)
// 20 uploads per minute per user
export const pdfUploadRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (req: AuthRequest) => {
    return `pdf-upload:${req.userId || req.ip}`;
  },
  message: {
    error: 'Too many uploads. Please wait a moment before uploading more files.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
