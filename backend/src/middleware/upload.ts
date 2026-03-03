import multer from 'multer';
import { config } from '../config/index.js';

// Use memory storage so we can pass buffer to storage adapter
const memoryStorage = multer.memoryStorage();

// File filter for images only (uses config for allowed types)
const imageFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (config.imageUpload.allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(
      'Invalid file type. Supported image formats: JPEG, PNG, GIF, WebP, HEIC, TIFF, and BMP.'
    ));
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

// File filter for documents (PDFs + images, uses config)
const documentFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (config.documentUpload.allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(
      'Invalid file type. Supported formats: PDF, JPEG, PNG, WebP, GIF, HEIC, TIFF, and BMP.'
    ));
  }
};

// Pet photo upload - 10MB, images only
export const uploadPhoto = multer({
  storage: memoryStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: config.imageUpload.maxSizeMB * 1024 * 1024,
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
