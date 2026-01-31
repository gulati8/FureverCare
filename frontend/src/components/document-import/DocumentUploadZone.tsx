import { useState, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { documentsApi, DocumentUpload } from '../../api/client';

interface DocumentUploadZoneProps {
  petId: number;
  onUploadComplete: (upload: DocumentUpload) => void;
  disabled?: boolean;
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

export function DocumentUploadZone({ petId, onUploadComplete, disabled }: DocumentUploadZoneProps) {
  const { token } = useAuth();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    const validFile = files.find(f => ACCEPTED_TYPES.includes(f.type));

    if (!validFile) {
      setError('Please drop a PDF or image file (JPEG, PNG, WebP, GIF)');
      return;
    }

    await uploadFile(validFile);
  }, [token, petId, disabled]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Please select a PDF or image file (JPEG, PNG, WebP, GIF)');
      return;
    }

    await uploadFile(file);
    e.target.value = '';
  };

  const uploadFile = async (file: File) => {
    if (!token) return;

    // Show preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    // Simulate progress (since fetch doesn't provide progress)
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90));
    }, 200);

    try {
      const upload = await documentsApi.upload(petId, file, token);
      clearInterval(progressInterval);
      setUploadProgress(100);
      setPreviewUrl(null);
      onUploadComplete(upload);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
      setPreviewUrl(null);
    } finally {
      clearInterval(progressInterval);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const isDisabled = disabled || isUploading;

  return (
    <div className="space-y-4">
      {/* Upload zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200
          ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        {isUploading ? (
          <div className="flex flex-col items-center">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Preview"
                className="h-24 w-24 object-cover rounded-lg mb-3 opacity-50"
              />
            )}
            <svg className="animate-spin h-10 w-10 text-blue-500 mb-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-gray-600">Uploading...</p>
            <div className="w-48 h-2 bg-gray-200 rounded-full mt-2">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path
                d="M28 8H12a4 4 0 00-4 4v20m0 0v4a4 4 0 004 4h24a4 4 0 004-4V24M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4-4m4-12h8m-4-4v8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-600">
              <label className={`text-blue-600 hover:text-blue-500 ${isDisabled ? '' : 'cursor-pointer'}`}>
                <span>Upload a document</span>
                <input
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleFileSelect}
                  className="sr-only"
                  disabled={isDisabled}
                />
              </label>
              {' '}or drag and drop
            </p>
            <p className="mt-1 text-xs text-gray-500">
              PDFs and images (JPEG, PNG, WebP, GIF) up to 20MB
            </p>
            <p className="mt-2 text-xs text-gray-400">
              We'll automatically detect what type of document it is
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}
