import { useState, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { photoImportApi, ImageUpload, ImageDocumentType } from '../../api/client';

interface ImageUploadZoneProps {
  petId: number;
  onUploadComplete: (upload: ImageUpload) => void;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function ImageUploadZone({ petId, onUploadComplete }: ImageUploadZoneProps) {
  const { token } = useAuth();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<ImageDocumentType>('other');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(f => ACCEPTED_TYPES.includes(f.type));

    if (!imageFile) {
      setError('Please drop an image file (JPEG, PNG, WebP, or GIF)');
      return;
    }

    await uploadFile(imageFile);
  }, [token, petId, documentType]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Please select an image file (JPEG, PNG, WebP, or GIF)');
      return;
    }

    await uploadFile(file);
    e.target.value = ''; // Reset input
  };

  const uploadFile = async (file: File) => {
    if (!token) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    setIsUploading(true);
    setError(null);

    try {
      const upload = await photoImportApi.upload(petId, file, token, documentType);
      setPreviewUrl(null);
      onUploadComplete(upload);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Document type selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          What type of document is this?
        </label>
        <select
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value as ImageDocumentType)}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="vaccination_card">Vaccination Card</option>
          <option value="medication_label">Medication Label</option>
          <option value="pet_id_tag">Pet ID Tag / Microchip Card</option>
          <option value="medical_record">Medical Record / Document</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Upload zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
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
              <label className="text-blue-600 hover:text-blue-500 cursor-pointer">
                <span>Take a photo or upload an image</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="sr-only"
                  disabled={isUploading}
                />
              </label>
              {' '}or drag and drop
            </p>
            <p className="mt-1 text-xs text-gray-500">JPEG, PNG, WebP, or GIF up to 10MB</p>
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
