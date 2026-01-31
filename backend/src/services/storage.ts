import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import { config } from '../config/index.js';

export type StorageType = 'photos' | 'pdfs' | 'images' | 'documents';

export interface UploadResult {
  key: string;      // S3 key or local filename
  url: string;      // Full URL for frontend
  filePath: string; // Key for S3, full path for local
}

export interface UploadOptions {
  type: StorageType;
  petId?: number;
  originalFilename: string;
  mimeType: string;
}

// Storage provider interface
interface StorageProvider {
  upload(buffer: Buffer, options: UploadOptions): Promise<UploadResult>;
  delete(key: string, type: StorageType): Promise<void>;
  download(key: string, type: StorageType): Promise<Buffer>;
  getUrl(key: string, type: StorageType): string;
}

// Local filesystem storage provider
class LocalStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  private getDir(type: StorageType): string {
    const typeDir = type === 'photos' ? '' : type;
    const dir = path.join(process.cwd(), this.baseDir, typeDir);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  async upload(buffer: Buffer, options: UploadOptions): Promise<UploadResult> {
    const ext = path.extname(options.originalFilename);
    const filename = `${nanoid()}${ext}`;
    const dir = this.getDir(options.type);
    const filePath = path.join(dir, filename);

    await fs.promises.writeFile(filePath, buffer);

    const urlPath = options.type === 'photos'
      ? `/uploads/${filename}`
      : `/uploads/${options.type}/${filename}`;

    return {
      key: filename,
      url: urlPath,
      filePath: filePath,
    };
  }

  async delete(key: string, type: StorageType): Promise<void> {
    const dir = this.getDir(type);
    const filePath = path.join(dir, key);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }

  async download(keyOrPath: string, type: StorageType): Promise<Buffer> {
    // If it's a full path (legacy), use it directly
    if (path.isAbsolute(keyOrPath)) {
      return fs.promises.readFile(keyOrPath);
    }
    // Otherwise construct path from key
    const dir = this.getDir(type);
    const filePath = path.join(dir, keyOrPath);
    return fs.promises.readFile(filePath);
  }

  getUrl(key: string, type: StorageType): string {
    return type === 'photos'
      ? `/uploads/${key}`
      : `/uploads/${type}/${key}`;
  }
}

// S3 storage provider
class S3StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;
  private region: string;

  constructor() {
    this.bucket = config.storage.s3.bucket;
    this.region = config.storage.s3.region;
    this.client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: config.storage.s3.accessKeyId,
        secretAccessKey: config.storage.s3.secretAccessKey,
      },
    });
  }

  private getKey(type: StorageType, petId: number | undefined, filename: string): string {
    const ext = path.extname(filename);
    const uniqueFilename = `${nanoid()}${ext}`;
    if (petId) {
      return `${type}/${petId}/${uniqueFilename}`;
    }
    return `${type}/${uniqueFilename}`;
  }

  async upload(buffer: Buffer, options: UploadOptions): Promise<UploadResult> {
    const key = this.getKey(options.type, options.petId, options.originalFilename);

    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: options.mimeType,
    }));

    const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;

    return {
      key,
      url,
      filePath: key, // For S3, filePath is the key
    };
  }

  async delete(key: string, type: StorageType): Promise<void> {
    await this.client.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }));
  }

  async download(key: string, type: StorageType): Promise<Buffer> {
    const response = await this.client.send(new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }));

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  getUrl(key: string, type: StorageType): string {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }
}

// Create the appropriate provider based on config
function createStorageProvider(): StorageProvider {
  if (config.storage.provider === 's3') {
    console.log('Using S3 storage provider');
    return new S3StorageProvider();
  }
  console.log('Using local storage provider');
  return new LocalStorageProvider(config.storage.local.baseDir);
}

// Singleton storage instance
const storageProvider = createStorageProvider();

// Export storage adapter
export const storage = {
  async upload(buffer: Buffer, options: UploadOptions): Promise<UploadResult> {
    return storageProvider.upload(buffer, options);
  },

  async delete(key: string, type: StorageType): Promise<void> {
    return storageProvider.delete(key, type);
  },

  async download(keyOrPath: string, type: StorageType): Promise<Buffer> {
    return storageProvider.download(keyOrPath, type);
  },

  getUrl(key: string, type: StorageType): string {
    return storageProvider.getUrl(key, type);
  },

  // Helper to extract key from URL or path (for deletion)
  extractKey(urlOrPath: string): string {
    // S3 URL: https://bucket.s3.region.amazonaws.com/photos/123/abc.jpg
    if (urlOrPath.includes('s3.') && urlOrPath.includes('amazonaws.com')) {
      const url = new URL(urlOrPath);
      return url.pathname.slice(1); // Remove leading /
    }
    // Local URL: /uploads/abc.jpg or /uploads/pdfs/abc.pdf
    if (urlOrPath.startsWith('/uploads/')) {
      const parts = urlOrPath.replace('/uploads/', '').split('/');
      return parts[parts.length - 1]; // Return just the filename
    }
    // Absolute path: extract filename
    return path.basename(urlOrPath);
  },

  // Check if we're using S3
  isS3(): boolean {
    return config.storage.provider === 's3';
  },
};
