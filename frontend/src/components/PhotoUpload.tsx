import { useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { API_URL } from '../api/client';

interface Props {
  petId: number;
  currentPhotoUrl: string | null;
  onPhotoUpdated: (photoUrl: string | null) => void;
}

export default function PhotoUpload({ petId, currentPhotoUrl, onPhotoUpdated }: Props) {
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

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
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
            accept="image/jpeg,image/png,image/gif,image/webp"
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

      {error && <p className="error-text mt-2">{error}</p>}
    </div>
  );
}
