import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { photoImportApi, ImageUpload } from '../../api/client';
import { ProcessingStatus } from '../pdf-import/ProcessingStatus';
import { API_URL } from '../../api/client';

interface ImageUploadListProps {
  petId: number;
  uploads: ImageUpload[];
  onUploadSelect: (upload: ImageUpload) => void;
  onUploadDeleted: (uploadId: number) => void;
  onProcessingComplete: (upload: ImageUpload) => void;
}

export function ImageUploadList({
  petId,
  uploads,
  onUploadSelect,
  onUploadDeleted,
  onProcessingComplete,
}: ImageUploadListProps) {
  const { token } = useAuth();
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDocType = (type: string | null) => {
    if (!type) return 'Unknown';
    return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const getImageUrl = (upload: ImageUpload) => {
    // The file_path is the full server path, we need to convert it to a URL
    // Assuming the uploads are served from /uploads/ directory
    return `${API_URL}/uploads/images/${upload.filename}`;
  };

  const handleProcess = async (upload: ImageUpload) => {
    if (!token) return;

    setProcessingIds(prev => new Set(prev).add(upload.id));

    try {
      const result = await photoImportApi.processUpload(petId, upload.id, token);
      onProcessingComplete(result.upload);
    } catch (err) {
      console.error('Processing failed:', err);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(upload.id);
        return next;
      });
    }
  };

  const handleDelete = async (uploadId: number) => {
    if (!token || !confirm('Are you sure you want to delete this upload?')) return;

    setDeletingIds(prev => new Set(prev).add(uploadId));

    try {
      await photoImportApi.deleteUpload(petId, uploadId, token);
      onUploadDeleted(uploadId);
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete upload');
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(uploadId);
        return next;
      });
    }
  };

  if (uploads.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No photo uploads yet</p>
        <p className="text-sm mt-1">Take a photo of a pet document or label to get started</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {uploads.map((upload) => (
        <div key={upload.id} className="py-4 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <img
                src={getImageUrl(upload)}
                alt={upload.original_filename}
                className="h-12 w-12 object-cover rounded-lg flex-shrink-0"
                onError={(e) => {
                  // Fallback to a placeholder if image fails to load
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="%239CA3AF"%3E%3Cpath stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"%3E%3C/path%3E%3C/svg%3E';
                }}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {upload.original_filename}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(upload.file_size)} • {formatDocType(upload.document_type)} • {formatDate(upload.created_at)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 ml-4">
            <ProcessingStatus status={upload.status} errorMessage={upload.error_message} />

            <div className="flex items-center gap-2">
              {upload.status === 'pending' && (
                <button
                  onClick={() => handleProcess(upload)}
                  disabled={processingIds.has(upload.id)}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {processingIds.has(upload.id) ? 'Processing...' : 'Extract Data'}
                </button>
              )}

              {upload.status === 'completed' && (
                <button
                  onClick={() => onUploadSelect(upload)}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Review
                </button>
              )}

              {upload.status === 'failed' && (
                <button
                  onClick={() => handleProcess(upload)}
                  disabled={processingIds.has(upload.id)}
                  className="px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
                >
                  Retry
                </button>
              )}

              <button
                onClick={() => handleDelete(upload.id)}
                disabled={deletingIds.has(upload.id)}
                className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-50"
                title="Delete"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
