import { storage } from './storage.js';
const DEFAULT_PHOTO_URL_TTL_SECONDS = 60 * 60;

export async function signPetPhotoUrl(
  photoUrl: string | null,
  expiresInSeconds: number = DEFAULT_PHOTO_URL_TTL_SECONDS
): Promise<string | null> {
  if (!photoUrl) {
    return null;
  }

  if (!storage.isS3()) {
    return photoUrl;
  }

  if (!photoUrl.includes('amazonaws.com')) {
    return photoUrl;
  }

  const key = storage.extractKey(photoUrl);
  return storage.getSignedUrl(key, 'photos', expiresInSeconds);
}

export async function withSignedPetPhoto<
  T extends { photo_url: string | null },
>(pet: T, expiresInSeconds?: number): Promise<T> {
  return {
    ...pet,
    photo_url: await signPetPhotoUrl(pet.photo_url, expiresInSeconds),
  };
}

export async function withSignedPetPhotos<
  T extends { photo_url: string | null },
>(pets: T[], expiresInSeconds?: number): Promise<T[]> {
  return Promise.all(
    pets.map((pet) => withSignedPetPhoto(pet, expiresInSeconds))
  );
}
