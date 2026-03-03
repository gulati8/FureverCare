/**
 * Unit tests for the image-optimizer service
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import sharp from 'sharp';
import {
  optimizeImage,
  replaceExtension,
  isOptimizableImage,
} from '../services/image-optimizer';

// Helper to create a test image buffer
async function createTestImage(
  width: number,
  height: number,
  format: 'jpeg' | 'png' | 'webp' | 'gif' | 'tiff' = 'jpeg'
): Promise<Buffer> {
  const pipeline = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 255, g: 0, b: 0 },
    },
  });

  switch (format) {
    case 'png':
      return pipeline.png().toBuffer();
    case 'webp':
      return pipeline.webp().toBuffer();
    case 'gif':
      return pipeline.gif().toBuffer();
    case 'tiff':
      return pipeline.tiff().toBuffer();
    default:
      return pipeline.jpeg().toBuffer();
  }
}

describe('isOptimizableImage', () => {
  test('returns true for JPEG', () => {
    assert.strictEqual(isOptimizableImage('image/jpeg'), true);
  });

  test('returns true for PNG', () => {
    assert.strictEqual(isOptimizableImage('image/png'), true);
  });

  test('returns true for WebP', () => {
    assert.strictEqual(isOptimizableImage('image/webp'), true);
  });

  test('returns true for GIF', () => {
    assert.strictEqual(isOptimizableImage('image/gif'), true);
  });

  test('returns true for HEIC', () => {
    assert.strictEqual(isOptimizableImage('image/heic'), true);
  });

  test('returns true for HEIF', () => {
    assert.strictEqual(isOptimizableImage('image/heif'), true);
  });

  test('returns true for TIFF', () => {
    assert.strictEqual(isOptimizableImage('image/tiff'), true);
  });

  test('returns true for BMP', () => {
    assert.strictEqual(isOptimizableImage('image/bmp'), true);
  });

  test('returns true for x-ms-bmp', () => {
    assert.strictEqual(isOptimizableImage('image/x-ms-bmp'), true);
  });

  test('returns false for PDF', () => {
    assert.strictEqual(isOptimizableImage('application/pdf'), false);
  });

  test('returns false for text', () => {
    assert.strictEqual(isOptimizableImage('text/plain'), false);
  });
});

describe('optimizeImage', () => {
  test('compresses a JPEG image', async () => {
    const input = await createTestImage(800, 600, 'jpeg');
    const result = await optimizeImage(input, 'image/jpeg');

    assert.strictEqual(result.mimeType, 'image/jpeg');
    assert.strictEqual(result.extension, '.jpg');

    // Verify output is a valid image
    const metadata = await sharp(result.buffer).metadata();
    assert.strictEqual(metadata.format, 'jpeg');
    assert.ok(metadata.width! <= 1920);
    assert.ok(metadata.height! <= 1920);
  });

  test('resizes a large JPEG to fit within 1920px', async () => {
    const input = await createTestImage(3000, 2000, 'jpeg');
    const result = await optimizeImage(input, 'image/jpeg');

    const metadata = await sharp(result.buffer).metadata();
    assert.strictEqual(metadata.width, 1920);
    // Aspect ratio should be maintained
    assert.strictEqual(metadata.height, 1280);
  });

  test('does not enlarge a small image', async () => {
    const input = await createTestImage(200, 150, 'jpeg');
    const result = await optimizeImage(input, 'image/jpeg');

    const metadata = await sharp(result.buffer).metadata();
    assert.strictEqual(metadata.width, 200);
    assert.strictEqual(metadata.height, 150);
  });

  test('keeps PNG format', async () => {
    const input = await createTestImage(800, 600, 'png');
    const result = await optimizeImage(input, 'image/png');

    assert.strictEqual(result.mimeType, 'image/png');
    assert.strictEqual(result.extension, '.png');

    const metadata = await sharp(result.buffer).metadata();
    assert.strictEqual(metadata.format, 'png');
  });

  test('keeps WebP format', async () => {
    const input = await createTestImage(800, 600, 'webp');
    const result = await optimizeImage(input, 'image/webp');

    assert.strictEqual(result.mimeType, 'image/webp');
    assert.strictEqual(result.extension, '.webp');

    const metadata = await sharp(result.buffer).metadata();
    assert.strictEqual(metadata.format, 'webp');
  });

  test('keeps GIF format', async () => {
    const input = await createTestImage(800, 600, 'gif');
    const result = await optimizeImage(input, 'image/gif');

    assert.strictEqual(result.mimeType, 'image/gif');
    assert.strictEqual(result.extension, '.gif');

    const metadata = await sharp(result.buffer).metadata();
    assert.strictEqual(metadata.format, 'gif');
  });

  test('converts TIFF to JPEG', async () => {
    const input = await createTestImage(800, 600, 'tiff');
    const result = await optimizeImage(input, 'image/tiff');

    assert.strictEqual(result.mimeType, 'image/jpeg');
    assert.strictEqual(result.extension, '.jpg');

    const metadata = await sharp(result.buffer).metadata();
    assert.strictEqual(metadata.format, 'jpeg');
  });

  test('passes through non-image types unchanged', async () => {
    const input = Buffer.from('fake pdf content');
    const result = await optimizeImage(input, 'application/pdf');

    assert.strictEqual(result.mimeType, 'application/pdf');
    assert.strictEqual(result.extension, '.pdf');
    assert.deepStrictEqual(result.buffer, input);
  });
});

describe('replaceExtension', () => {
  test('replaces .heic with .jpg', () => {
    assert.strictEqual(replaceExtension('photo.heic', '.jpg'), 'photo.jpg');
  });

  test('replaces .HEIC with .jpg (preserves name case)', () => {
    assert.strictEqual(replaceExtension('Photo.HEIC', '.jpg'), 'Photo.jpg');
  });

  test('replaces .tiff with .jpg', () => {
    assert.strictEqual(replaceExtension('scan.tiff', '.jpg'), 'scan.jpg');
  });

  test('replaces .bmp with .jpg', () => {
    assert.strictEqual(replaceExtension('image.bmp', '.jpg'), 'image.jpg');
  });

  test('handles filenames with multiple dots', () => {
    assert.strictEqual(replaceExtension('my.photo.heic', '.jpg'), 'my.photo.jpg');
  });

  test('handles filenames with no extension', () => {
    assert.strictEqual(replaceExtension('photo', '.jpg'), 'photo.jpg');
  });
});
