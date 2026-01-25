import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { pdfImportApi, PdfUpload } from '../../api/client';
import { ProcessingStatus } from './ProcessingStatus';

interface PdfUploadListProps {
  petId: number;
  uploads: PdfUpload[];
  onUploadSelect: (upload: PdfUpload) => void;
  onUploadDeleted: (uploadId: number) => void;
  onProcessingComplete: (upload: PdfUpload) => void;
}

export function PdfUploadList({
  petId,
  uploads,
  onUploadSelect,
  onUploadDeleted,
  onProcessingComplete,
}: PdfUploadListProps) {
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

  const handleProcess = async (upload: PdfUpload) => {
    if (!token) return;

    setProcessingIds(prev => new Set(prev).add(upload.id));

    try {
      const result = await pdfImportApi.processUpload(petId, upload.id, token);
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
      await pdfImportApi.deleteUpload(petId, uploadId, token);
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
        <p>No PDF uploads yet</p>
        <p className="text-sm mt-1">Upload a veterinary document to get started</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {uploads.map((upload) => (
        <div key={upload.id} className="py-4 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <svg className="h-8 w-8 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
              </svg>
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
                  {processingIds.has(upload.id) ? 'Processing...' : 'Process'}
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
