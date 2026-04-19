import path from 'path';
import type { Response } from 'express';
import { storage } from './storage.js';

const PHOTO_CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
};

export function getAuthenticatedPetPhotoPath(
  petId: number,
  photoUrl: string | null
): string | null {
  if (!photoUrl) {
    return null;
  }

  return `/api/pets/${petId}/photo`;
}

export function getPublicPetPhotoPath(
  shareId: string,
  photoUrl: string | null
): string | null {
  if (!photoUrl) {
    return null;
  }

  return `/api/public/card/${shareId}/photo`;
}

export function withAuthenticatedPetPhoto<
  T extends { id: number; photo_url: string | null },
>(pet: T): T {
  return {
    ...pet,
    photo_url: getAuthenticatedPetPhotoPath(pet.id, pet.photo_url),
  };
}

export function withPublicPetPhoto<
  T extends { share_id: string; photo_url: string | null },
>(pet: T): T {
  return {
    ...pet,
    photo_url: getPublicPetPhotoPath(pet.share_id, pet.photo_url),
  };
}

function getPhotoContentType(photoUrl: string): string {
  const key = storage.extractKey(photoUrl);
  const ext = path.extname(key).toLowerCase();
  return PHOTO_CONTENT_TYPES[ext] || 'application/octet-stream';
}

export async function streamPetPhoto(
  res: Response,
  photoUrl: string,
  cacheControl: string = 'private, max-age=300'
): Promise<void> {
  const key = storage.extractKey(photoUrl);
  const buffer = await storage.download(key, 'photos');

  res.setHeader('Content-Type', getPhotoContentType(photoUrl));
  res.setHeader('Cache-Control', cacheControl);
  res.send(buffer);
}
