import multer from 'multer';
import { config } from '../config/index.js';

// Use memory storage so we can pass buffer to storage adapter
const memoryStorage = multer.memoryStorage();

// File filter for images only
const imageFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
  }
};

// File filter for PDFs only
const pdfFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (config.pdfUpload.allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF files are allowed.'));
  }
};

// File filter for documents (PDFs + images)
const documentFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPEG, PNG, WebP, and GIF files are allowed.'));
  }
};

// Pet photo upload - 5MB, images only
export const uploadPhoto = multer({
  storage: memoryStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// PDF upload - configurable size, PDFs only
export const uploadPdf = multer({
  storage: memoryStorage,
  fileFilter: pdfFilter,
  limits: {
    fileSize: config.pdfUpload.maxSizeMB * 1024 * 1024,
  },
});

// Image upload for extraction - configurable size, images only
export const uploadImage = multer({
  storage: memoryStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: config.imageUpload.maxSizeMB * 1024 * 1024,
  },
});

// Document upload - max of PDF/image size, PDFs + images
export const uploadDocument = multer({
  storage: memoryStorage,
  fileFilter: documentFilter,
  limits: {
    fileSize: Math.max(config.pdfUpload.maxSizeMB, config.imageUpload.maxSizeMB) * 1024 * 1024,
  },
});
