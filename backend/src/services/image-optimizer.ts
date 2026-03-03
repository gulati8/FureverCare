import sharp from 'sharp';
import path from 'path';

const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 80;

// MIME types that should be converted to JPEG
const CONVERT_TO_JPEG: Set<string> = new Set([
  'image/heic',
  'image/heif',
  'image/tiff',
  'image/bmp',
  'image/x-ms-bmp',
]);

// Image MIME types we optimize (resize/compress) but keep in their original format
const KEEP_FORMAT: Set<string> = new Set([
  'image/png',
  'image/webp',
  'image/gif',
]);

export interface OptimizeResult {
  buffer: Buffer;
  mimeType: string;
  extension: string;
}

/**
 * Returns true if the given MIME type is an image type we can optimize.
 */
export function isOptimizableImage(mimeType: string): boolean {
  return (
    mimeType === 'image/jpeg' ||
    CONVERT_TO_JPEG.has(mimeType) ||
    KEEP_FORMAT.has(mimeType)
  );
}

/**
 * Optimize an image buffer: auto-rotate, resize to fit within MAX_DIMENSION,
 * and convert HEIC/TIFF/BMP to JPEG. JPEGs are re-compressed. PNG/WebP/GIF
 * are resized but kept in their original format.
 */
export async function optimizeImage(
  buffer: Buffer,
  mimeType: string
): Promise<OptimizeResult> {
  // If not an optimizable image, return as-is
  if (!isOptimizableImage(mimeType)) {
    const ext = mimeType === 'application/pdf' ? '.pdf' : '';
    return { buffer, mimeType, extension: ext };
  }

  let pipeline = sharp(buffer).rotate(); // auto-rotate using EXIF

  // Resize to fit within max dimensions, preserving aspect ratio
  pipeline = pipeline.resize(MAX_DIMENSION, MAX_DIMENSION, {
    fit: 'inside',
    withoutEnlargement: true,
  });

  if (CONVERT_TO_JPEG.has(mimeType) || mimeType === 'image/jpeg') {
    // Convert to JPEG
    pipeline = pipeline.jpeg({ quality: JPEG_QUALITY });
    const outputBuffer = await pipeline.toBuffer();
    return { buffer: outputBuffer, mimeType: 'image/jpeg', extension: '.jpg' };
  }

  if (mimeType === 'image/png') {
    pipeline = pipeline.png();
    const outputBuffer = await pipeline.toBuffer();
    return { buffer: outputBuffer, mimeType: 'image/png', extension: '.png' };
  }

  if (mimeType === 'image/webp') {
    pipeline = pipeline.webp({ quality: JPEG_QUALITY });
    const outputBuffer = await pipeline.toBuffer();
    return { buffer: outputBuffer, mimeType: 'image/webp', extension: '.webp' };
  }

  if (mimeType === 'image/gif') {
    // GIF: just resize, keep format
    pipeline = pipeline.gif();
    const outputBuffer = await pipeline.toBuffer();
    return { buffer: outputBuffer, mimeType: 'image/gif', extension: '.gif' };
  }

  // Fallback: shouldn't reach here, but convert to JPEG
  pipeline = pipeline.jpeg({ quality: JPEG_QUALITY });
  const outputBuffer = await pipeline.toBuffer();
  return { buffer: outputBuffer, mimeType: 'image/jpeg', extension: '.jpg' };
}

/**
 * Replace the file extension in a filename.
 * e.g. replaceExtension('photo.heic', '.jpg') → 'photo.jpg'
 */
export function replaceExtension(filename: string, newExtension: string): string {
  const parsed = path.parse(filename);
  return `${parsed.name}${newExtension}`;
}
