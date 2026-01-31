/**
 * Migration script to move existing local uploads to S3
 *
 * Usage:
 *   DRY_RUN=true npx tsx src/scripts/migrate-uploads-to-s3.ts  # Preview changes
 *   npx tsx src/scripts/migrate-uploads-to-s3.ts               # Run migration
 *
 * Prerequisites:
 *   - S3 bucket must be created and configured
 *   - AWS credentials must be set in environment
 *   - STORAGE_PROVIDER should be 's3' in env
 */

import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../config/index.js';
import { pool } from '../db/pool.js';

async function query(text: string, params?: any[]): Promise<{ rows: any[] }> {
  return pool.query(text, params);
}

const DRY_RUN = process.env.DRY_RUN === 'true';

// S3 client
const s3 = new S3Client({
  region: config.storage.s3.region,
  credentials: {
    accessKeyId: config.storage.s3.accessKeyId,
    secretAccessKey: config.storage.s3.secretAccessKey,
  },
});

interface MigrationResult {
  success: number;
  skipped: number;
  failed: number;
  errors: { path: string; error: string }[];
}

async function checkS3Exists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({
      Bucket: config.storage.s3.bucket,
      Key: key,
    }));
    return true;
  } catch {
    return false;
  }
}

async function uploadToS3(localPath: string, s3Key: string, mimeType: string): Promise<void> {
  const buffer = await fs.promises.readFile(localPath);

  await s3.send(new PutObjectCommand({
    Bucket: config.storage.s3.bucket,
    Key: s3Key,
    Body: buffer,
    ContentType: mimeType,
  }));
}

function getS3Url(key: string): string {
  return `https://${config.storage.s3.bucket}.s3.${config.storage.s3.region}.amazonaws.com/${key}`;
}

async function migratePetPhotos(): Promise<MigrationResult> {
  console.log('\n=== Migrating Pet Photos ===');
  const result: MigrationResult = { success: 0, skipped: 0, failed: 0, errors: [] };

  const { rows: pets } = await query(
    `SELECT id, photo_url FROM pets WHERE photo_url IS NOT NULL AND photo_url != '' AND photo_url NOT LIKE 'https://%'`
  );

  console.log(`Found ${pets.length} pet photos to migrate`);

  for (const pet of pets) {
    const localUrl = pet.photo_url as string;
    const filename = localUrl.split('/').pop();
    if (!filename) {
      result.skipped++;
      continue;
    }

    const localPath = path.join(process.cwd(), 'uploads', filename);
    const s3Key = `photos/${pet.id}/${filename}`;

    if (!fs.existsSync(localPath)) {
      console.log(`  [SKIP] File not found: ${localPath}`);
      result.skipped++;
      continue;
    }

    const exists = await checkS3Exists(s3Key);
    if (exists) {
      console.log(`  [SKIP] Already in S3: ${s3Key}`);
      result.skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`  [DRY-RUN] Would migrate: ${localPath} -> ${s3Key}`);
      result.success++;
      continue;
    }

    try {
      await uploadToS3(localPath, s3Key, 'image/jpeg');
      const newUrl = getS3Url(s3Key);
      await query(`UPDATE pets SET photo_url = $1 WHERE id = $2`, [newUrl, pet.id]);
      console.log(`  [OK] ${localPath} -> ${s3Key}`);
      result.success++;
    } catch (err: any) {
      console.log(`  [FAIL] ${localPath}: ${err.message}`);
      result.failed++;
      result.errors.push({ path: localPath, error: err.message });
    }
  }

  return result;
}

async function migratePdfUploads(): Promise<MigrationResult> {
  console.log('\n=== Migrating PDF Uploads ===');
  const result: MigrationResult = { success: 0, skipped: 0, failed: 0, errors: [] };

  const { rows: uploads } = await query(
    `SELECT id, pet_id, file_path, mime_type FROM pdf_uploads WHERE file_path NOT LIKE 'pdfs/%'`
  );

  console.log(`Found ${uploads.length} PDF uploads to migrate`);

  for (const upload of uploads) {
    const localPath = upload.file_path as string;
    const filename = path.basename(localPath);
    const s3Key = `pdfs/${upload.pet_id}/${filename}`;

    if (!fs.existsSync(localPath)) {
      console.log(`  [SKIP] File not found: ${localPath}`);
      result.skipped++;
      continue;
    }

    const exists = await checkS3Exists(s3Key);
    if (exists) {
      console.log(`  [SKIP] Already in S3: ${s3Key}`);
      result.skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`  [DRY-RUN] Would migrate: ${localPath} -> ${s3Key}`);
      result.success++;
      continue;
    }

    try {
      await uploadToS3(localPath, s3Key, upload.mime_type || 'application/pdf');
      await query(`UPDATE pdf_uploads SET file_path = $1 WHERE id = $2`, [s3Key, upload.id]);
      console.log(`  [OK] ${localPath} -> ${s3Key}`);
      result.success++;
    } catch (err: any) {
      console.log(`  [FAIL] ${localPath}: ${err.message}`);
      result.failed++;
      result.errors.push({ path: localPath, error: err.message });
    }
  }

  return result;
}

async function migrateImageUploads(): Promise<MigrationResult> {
  console.log('\n=== Migrating Image Uploads ===');
  const result: MigrationResult = { success: 0, skipped: 0, failed: 0, errors: [] };

  const { rows: uploads } = await query(
    `SELECT id, pet_id, file_path, mime_type FROM image_uploads WHERE file_path NOT LIKE 'images/%'`
  );

  console.log(`Found ${uploads.length} image uploads to migrate`);

  for (const upload of uploads) {
    const localPath = upload.file_path as string;
    const filename = path.basename(localPath);
    const s3Key = `images/${upload.pet_id}/${filename}`;

    if (!fs.existsSync(localPath)) {
      console.log(`  [SKIP] File not found: ${localPath}`);
      result.skipped++;
      continue;
    }

    const exists = await checkS3Exists(s3Key);
    if (exists) {
      console.log(`  [SKIP] Already in S3: ${s3Key}`);
      result.skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`  [DRY-RUN] Would migrate: ${localPath} -> ${s3Key}`);
      result.success++;
      continue;
    }

    try {
      await uploadToS3(localPath, s3Key, upload.mime_type || 'image/jpeg');
      await query(`UPDATE image_uploads SET file_path = $1 WHERE id = $2`, [s3Key, upload.id]);
      console.log(`  [OK] ${localPath} -> ${s3Key}`);
      result.success++;
    } catch (err: any) {
      console.log(`  [FAIL] ${localPath}: ${err.message}`);
      result.failed++;
      result.errors.push({ path: localPath, error: err.message });
    }
  }

  return result;
}

async function migrateDocumentUploads(): Promise<MigrationResult> {
  console.log('\n=== Migrating Document Uploads ===');
  const result: MigrationResult = { success: 0, skipped: 0, failed: 0, errors: [] };

  const { rows: uploads } = await query(
    `SELECT id, pet_id, file_path, mime_type FROM document_uploads WHERE file_path NOT LIKE 'documents/%'`
  );

  console.log(`Found ${uploads.length} document uploads to migrate`);

  for (const upload of uploads) {
    const localPath = upload.file_path as string;
    const filename = path.basename(localPath);
    const s3Key = `documents/${upload.pet_id}/${filename}`;

    if (!fs.existsSync(localPath)) {
      console.log(`  [SKIP] File not found: ${localPath}`);
      result.skipped++;
      continue;
    }

    const exists = await checkS3Exists(s3Key);
    if (exists) {
      console.log(`  [SKIP] Already in S3: ${s3Key}`);
      result.skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`  [DRY-RUN] Would migrate: ${localPath} -> ${s3Key}`);
      result.success++;
      continue;
    }

    try {
      await uploadToS3(localPath, s3Key, upload.mime_type || 'application/octet-stream');
      await query(`UPDATE document_uploads SET file_path = $1 WHERE id = $2`, [s3Key, upload.id]);
      console.log(`  [OK] ${localPath} -> ${s3Key}`);
      result.success++;
    } catch (err: any) {
      console.log(`  [FAIL] ${localPath}: ${err.message}`);
      result.failed++;
      result.errors.push({ path: localPath, error: err.message });
    }
  }

  return result;
}

async function main() {
  console.log('S3 Upload Migration Script');
  console.log('==========================');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes will be made)' : 'LIVE'}`);
  console.log(`Bucket: ${config.storage.s3.bucket}`);
  console.log(`Region: ${config.storage.s3.region}`);

  if (!config.storage.s3.accessKeyId || !config.storage.s3.secretAccessKey) {
    console.error('\nError: AWS credentials not configured');
    process.exit(1);
  }

  const results = {
    photos: await migratePetPhotos(),
    pdfs: await migratePdfUploads(),
    images: await migrateImageUploads(),
    documents: await migrateDocumentUploads(),
  };

  console.log('\n=== Summary ===');
  let totalSuccess = 0, totalSkipped = 0, totalFailed = 0;

  for (const [type, result] of Object.entries(results)) {
    console.log(`${type}: ${result.success} migrated, ${result.skipped} skipped, ${result.failed} failed`);
    totalSuccess += result.success;
    totalSkipped += result.skipped;
    totalFailed += result.failed;
  }

  console.log(`\nTotal: ${totalSuccess} migrated, ${totalSkipped} skipped, ${totalFailed} failed`);

  if (totalFailed > 0) {
    console.log('\nFailed files:');
    for (const [type, result] of Object.entries(results)) {
      for (const err of result.errors) {
        console.log(`  [${type}] ${err.path}: ${err.error}`);
      }
    }
  }

  if (DRY_RUN && totalSuccess > 0) {
    console.log('\nRun without DRY_RUN=true to perform the actual migration.');
  }

  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
