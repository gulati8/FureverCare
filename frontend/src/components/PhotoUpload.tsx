import { useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { API_URL } from '../api/client';

interface Props {
  petId: number;
  currentPhotoUrl: string | null;
  onPhotoUpdated: (photoUrl: string | null) => void;
  /** Compact mode: clickable avatar with camera overlay, no buttons */
  compact?: boolean;
  /** Species for default emoji in compact mode */
  species?: string;
}

export default function PhotoUpload({ petId, currentPhotoUrl, onPhotoUpdated, compact, species }: Props) {
  const { token } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFullPhotoUrl = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${API_URL}${url}`;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    // Validate file type (check MIME type with extension fallback for HEIC)
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'image/heic', 'image/heif', 'image/tiff', 'image/bmp', 'image/x-ms-bmp',
    ];
    const allowedExtensions = [
      '.jpg', '.jpeg', '.png', '.gif', '.webp',
      '.heic', '.heif', '.tiff', '.tif', '.bmp',
    ];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(ext)) {
      setError('Please select a valid image file (JPEG, PNG, GIF, WebP, HEIC, TIFF, or BMP)');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('photo', file);

      const response = await fetch(`${API_URL}/api/upload/pet/${petId}/photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      const data = await response.json();
      onPhotoUpdated(data.photo_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeletePhoto = async () => {
    if (!token || !currentPhotoUrl) return;
    if (!confirm('Are you sure you want to delete this photo?')) return;

    setIsUploading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/upload/pet/${petId}/photo`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      onPhotoUpdated(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setIsUploading(false);
    }
  };

  const defaultEmoji = species === 'dog' ? '🐕' : species === 'cat' ? '🐈' : '🐾';
  const fileAccept = "image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif,image/tiff,image/bmp,.heic,.heif,.tiff,.tif,.bmp";

  if (compact) {
    return (
      <label className="relative cursor-pointer group flex-shrink-0">
        <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center overflow-hidden">
          {currentPhotoUrl ? (
            <img src={getFullPhotoUrl(currentPhotoUrl)!} alt="Pet photo" className="w-20 h-20 rounded-full object-cover" />
          ) : (
            <span className="text-4xl">{defaultEmoji}</span>
          )}
        </div>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 rounded-full flex items-center justify-center transition-colors">
          {isUploading ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          ) : (
            <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={fileAccept}
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />
        {error && <p className="error-text text-xs mt-1 absolute -bottom-5 left-0 right-0 text-center">{error}</p>}
      </label>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center overflow-hidden">
          {currentPhotoUrl ? (
            <img
              src={getFullPhotoUrl(currentPhotoUrl)!}
              alt="Pet photo"
              className="w-24 h-24 rounded-full object-cover"
            />
          ) : (
            <span className="text-4xl">🐾</span>
          )}
        </div>

        {isUploading && (
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <label className="btn-secondary text-sm cursor-pointer">
          {currentPhotoUrl ? 'Change' : 'Upload'} Photo
          <input
            ref={fileInputRef}
            type="file"
            accept={fileAccept}
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />
        </label>

        {currentPhotoUrl && (
          <button
            onClick={handleDeletePhoto}
            disabled={isUploading}
            className="btn text-sm text-red-600 hover:bg-red-50"
          >
            Remove
          </button>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP, GIF, HEIC, TIFF, BMP up to 10MB</p>

      {error && <p className="error-text mt-2">{error}</p>}
    </div>
  );
}
