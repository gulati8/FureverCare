import sharp from 'sharp';
import path from 'path';
import exifReader from 'exif-reader';

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

export interface ImageMetadata {
  dateTaken: string | null;
  width: number | null;
  height: number | null;
}

/**
 * Extract image metadata (EXIF date, dimensions) from an image buffer.
 */
export async function extractImageMetadata(buffer: Buffer): Promise<ImageMetadata> {
  try {
    const metadata = await sharp(buffer).metadata();
    let dateTaken: string | null = null;

    if (metadata.exif) {
      try {
        const exif = exifReader(metadata.exif);
        const dateOriginal: unknown = exif?.Photo?.DateTimeOriginal ?? exif?.Image?.DateTime;
        if (dateOriginal instanceof Date) {
          dateTaken = dateOriginal.toISOString();
        } else if (typeof dateOriginal === 'string') {
          // Image.DateTime may be a string like "2024:01:15 10:30:00"
          const parsed = new Date(dateOriginal.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3'));
          if (!isNaN(parsed.getTime())) {
            dateTaken = parsed.toISOString();
          }
        }
      } catch {
        // EXIF parsing failed — not all images have valid EXIF
      }
    }

    return {
      dateTaken,
      width: metadata.width ?? null,
      height: metadata.height ?? null,
    };
  } catch {
    return { dateTaken: null, width: null, height: null };
  }
}

/**
 * Replace the file extension in a filename.
 * e.g. replaceExtension('photo.heic', '.jpg') → 'photo.jpg'
 */
export function replaceExtension(filename: string, newExtension: string): string {
  const parsed = path.parse(filename);
  return `${parsed.name}${newExtension}`;
}
