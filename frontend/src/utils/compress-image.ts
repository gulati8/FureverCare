import imageCompression from 'browser-image-compression';

const COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: 'image/jpeg' as const,
};

function isHeic(file: File): boolean {
  return (
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    /\.heic$/i.test(file.name) ||
    /\.heif$/i.test(file.name)
  );
}

async function convertHeicToJpeg(file: File): Promise<File> {
  const heic2any = (await import('heic2any')).default;
  const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
  const resultBlob = Array.isArray(blob) ? blob[0] : blob;
  const name = file.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg');
  return new File([resultBlob], name, { type: 'image/jpeg' });
}

function isImage(file: File): boolean {
  return file.type.startsWith('image/') || isHeic(file);
}

/**
 * Compress an image file client-side before upload.
 * Returns the original file unchanged for non-image files (e.g. PDFs).
 */
export async function compressImage(file: File): Promise<File> {
  if (!isImage(file)) return file;

  let input = file;

  // HEIC files need conversion before compression
  if (isHeic(file)) {
    input = await convertHeicToJpeg(file);
  }

  const compressed = await imageCompression(input, COMPRESSION_OPTIONS);

  // Only use compressed version if it's actually smaller
  if (compressed.size >= input.size) return input;

  return new File([compressed], compressed.name, { type: compressed.type });
}
