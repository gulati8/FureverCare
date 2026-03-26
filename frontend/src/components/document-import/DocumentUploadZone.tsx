import { useState, useCallback, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { documentsApi } from '../../api/client';

interface DocumentUploadZoneProps {
  petId: number;
  onUploadComplete: (result: any) => void;
  disabled?: boolean;
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'image/tiff',
  'image/bmp',
  'image/x-ms-bmp',
];
const ACCEPTED_EXTENSIONS = [
  '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp',
  '.heic', '.heif', '.tiff', '.tif', '.bmp',
];

function isValidFile(file: File): boolean {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  return ACCEPTED_TYPES.includes(file.type) || ACCEPTED_EXTENSIONS.includes(ext);
}

function generateGroupId(): string {
  return crypto.randomUUID();
}

export function DocumentUploadZone({ petId, onUploadComplete, disabled }: DocumentUploadZoneProps) {
  const { token } = useAuth();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Multi-file grouping dialog state
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);
  const [groupMode, setGroupMode] = useState<'one' | 'separate'>('one');
  const groupNameRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    const files = Array.from(e.dataTransfer.files).filter(isValidFile);
    if (files.length === 0) {
      setError('Please drop PDF or image files (JPEG, PNG, WebP, GIF, HEIC, TIFF, or BMP)');
      return;
    }

    processSelectedFiles(files);
  }, [token, petId, disabled]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(isValidFile);
    if (files.length === 0) {
      setError('Please select PDF or image files');
      return;
    }

    processSelectedFiles(files);
    e.target.value = '';
  };

  const processSelectedFiles = (files: File[]) => {
    setError(null);

    // Split PDFs from images — PDFs are always standalone
    const imageFiles = files.filter(f => !f.type.includes('pdf') && !f.name.toLowerCase().endsWith('.pdf'));
    const pdfFiles = files.filter(f => f.type.includes('pdf') || f.name.toLowerCase().endsWith('.pdf'));

    if (imageFiles.length === 0 && pdfFiles.length > 0) {
      // All PDFs — upload each as separate document, no grouping dialog
      uploadFiles(pdfFiles);
    } else if (imageFiles.length === 1 && pdfFiles.length === 0) {
      // Single image — upload directly
      uploadFiles(imageFiles);
    } else if (imageFiles.length > 1 && pdfFiles.length === 0) {
      // Multiple images only — show grouping dialog
      setPendingFiles(imageFiles);
      setGroupMode('one');
      const firstName = imageFiles[0].name.replace(/\.[^/.]+$/, '');
      setTimeout(() => { if (groupNameRef.current) groupNameRef.current.value = firstName; }, 0);
    } else {
      // Mix of images and PDFs — upload PDFs separately, show grouping dialog for images
      uploadFiles(pdfFiles);
      if (imageFiles.length === 1) {
        uploadFiles(imageFiles);
      } else if (imageFiles.length > 1) {
        setPendingFiles(imageFiles);
        setGroupMode('one');
        const firstName = imageFiles[0].name.replace(/\.[^/.]+$/, '');
        setTimeout(() => { if (groupNameRef.current) groupNameRef.current.value = firstName; }, 0);
      }
    }
  };

  const handleGroupConfirm = () => {
    if (!pendingFiles) return;
    if (groupMode === 'one') {
      const name = groupNameRef.current?.value?.trim() || pendingFiles[0].name;
      uploadFiles(pendingFiles, { documentGroupId: generateGroupId(), groupName: name });
    } else {
      uploadFiles(pendingFiles);
    }
    setPendingFiles(null);
  };

  const handleGroupCancel = () => {
    setPendingFiles(null);
  };

  const uploadFiles = async (files: File[], groupOptions?: { documentGroupId: string; groupName: string }) => {
    if (!token) return;

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    const total = files.length;
    let completed = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const opts = groupOptions
          ? { documentGroupId: groupOptions.documentGroupId, pageNumber: i + 1, groupName: groupOptions.groupName }
          : undefined;

        await documentsApi.upload(petId, file, token, opts);
        completed++;
        setUploadProgress(Math.round((completed / total) * 100));
      }

      onUploadComplete({ count: files.length, grouped: !!groupOptions });
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const isDisabled = disabled || isUploading;

  return (
    <div className="space-y-4">
      {/* Multi-file grouping dialog */}
      {pendingFiles && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <p className="font-medium text-gray-900 mb-3">
            {pendingFiles.length} files selected
          </p>

          {/* File preview thumbnails */}
          <div className="flex flex-wrap gap-2 mb-4">
            {pendingFiles.slice(0, 8).map((file, i) => (
              <div key={i} className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center text-xs text-gray-500 overflow-hidden">
                {file.type.startsWith('image/') ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 18h12a2 2 0 002-2V6l-4-4H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
            ))}
            {pendingFiles.length > 8 && (
              <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                +{pendingFiles.length - 8}
              </div>
            )}
          </div>

          {/* Radio options */}
          <div className="space-y-3 mb-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="groupMode"
                checked={groupMode === 'one'}
                onChange={() => setGroupMode('one')}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Upload as one document ({pendingFiles.length} pages)
                </p>
                <p className="text-xs text-gray-500">
                  Combine into a single multi-page document that gets scanned together.
                </p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="groupMode"
                checked={groupMode === 'separate'}
                onChange={() => setGroupMode('separate')}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Upload as {pendingFiles.length} separate documents
                </p>
                <p className="text-xs text-gray-500">
                  Each file is its own document.
                </p>
              </div>
            </label>
          </div>

          {/* Group name input (only when grouping) */}
          {groupMode === 'one' && (
            <div className="mb-4">
              <label className="block text-sm text-gray-700 mb-1">Document name</label>
              <input
                type="text"
                ref={groupNameRef}
                placeholder="e.g., Wednesday ER Visit Notes"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                maxLength={255}
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={handleGroupCancel}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleGroupConfirm}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Upload
            </button>
          </div>
        </div>
      )}

      {/* Upload zone */}
      {!pendingFiles && (
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
                  <span>Upload documents</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,image/tiff,image/bmp,.heic,.heif,.tiff,.tif,.bmp"
                    onChange={handleFileSelect}
                    className="sr-only"
                    disabled={isDisabled}
                  />
                </label>
                {' '}or drag and drop
              </p>
              <p className="mt-1 text-xs text-gray-500">
                PDFs and images (JPEG, PNG, WebP, GIF, HEIC, TIFF, BMP) up to 20MB
              </p>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}
