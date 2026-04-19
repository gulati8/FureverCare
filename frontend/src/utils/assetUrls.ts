import { API_URL } from '../api/client';

export function resolveAssetUrl(url: string | null): string | null {
  if (!url) {
    return null;
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  return `${API_URL}${url}`;
}
