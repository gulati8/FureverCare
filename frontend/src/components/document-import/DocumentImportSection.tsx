import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  API_URL,
  documentsApi,
  DocumentUpload,
  DocumentClassification,
} from '../../api/client';
import { DocumentUploadZone } from './DocumentUploadZone';
import { ClassificationConfirmation } from './ClassificationConfirmation';
import { DocumentExtractionReview } from './DocumentExtractionReview';
import { ImageReviewForm } from './ImageReviewForm';

interface DocumentImportSectionProps {
  petId: number;
  onImportComplete?: () => void;
}

type ViewState = 'upload' | 'classifying' | 'confirm' | 'processing' | 'review' | 'image_review';
type FilterType = 'all' | 'pdf' | 'image';

interface UploadState {
  upload: DocumentUpload;
  classification?: DocumentClassification;
}

export function DocumentImportSection({ petId, onImportComplete }: DocumentImportSectionProps) {
  const { token } = useAuth();
  const [viewState, setViewState] = useState<ViewState>('upload');
  const [currentUpload, setCurrentUpload] = useState<UploadState | null>(null);
  const [uploads, setUploads] = useState<DocumentUpload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exifDateTaken, setExifDateTaken] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    loadUploads();
  }, [petId, token]);

  const loadUploads = async () => {
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await documentsApi.listUploads(petId, token);
      setUploads(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load uploads');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadComplete = async (result: any) => {
    setError(null);

    if (result.media_type === 'image') {
      // Image: skip AI, go to image review
      setCurrentUpload({ upload: result.upload });
      setExifDateTaken(result.exif_date_taken || null);
      setViewState('image_review');
    } else {
      // PDF: use upload_id from response to get the upload object
      const upload = result.upload || result;
      setCurrentUpload({ upload });
      setViewState('classifying');

      try {
        const classifyResult = await documentsApi.classifyUpload(petId, upload.id, token!);
        setCurrentUpload({
          upload: classifyResult.upload,
          classification: classifyResult.classification,
        });
        setViewState('confirm');
      } catch (err: any) {
        setError(err.message || 'Failed to classify document');
        setViewState('upload');
        setCurrentUpload(null);
        loadUploads();
      }
    }
  };

  const handleConfirmImport = async () => {
    if (!currentUpload || !token) return;

    setViewState('processing');
    setError(null);

    try {
      // Process the document for full extraction
      const result = await documentsApi.processUpload(petId, currentUpload.upload.id, token);
      setCurrentUpload({
        upload: result.upload,
        classification: currentUpload.classification,
      });
      setViewState('review');
    } catch (err: any) {
      setError(err.message || 'Failed to process document');
      setViewState('confirm');
    }
  };

  const handleCancelImport = async () => {
    if (!currentUpload || !token) return;

    try {
      // Delete the upload
      await documentsApi.deleteUpload(petId, currentUpload.upload.id, token);
    } catch (err) {
      console.error('Failed to delete upload:', err);
    }

    setCurrentUpload(null);
    setViewState('upload');
    loadUploads();
  };

  const handleBackToUploads = () => {
    setCurrentUpload(null);
    setViewState('upload');
    loadUploads();
  };

  const handleApprovalComplete = () => {
    setCurrentUpload(null);
    setViewState('upload');
    loadUploads();
    onImportComplete?.();
  };

  const handleUploadSelect = (upload: DocumentUpload) => {
    if (upload.file_type === 'image' && (upload.status === 'pending_review' || upload.status === 'completed')) {
      setCurrentUpload({ upload });
      setExifDateTaken(null);
      setViewState('image_review');
    } else if (upload.status === 'completed') {
      setCurrentUpload({ upload });
      setViewState('review');
    }
  };

  const handleUploadDeleted = async (uploadId: number) => {
    if (!token) return;

    try {
      await documentsApi.deleteUpload(petId, uploadId, token);
      setUploads((prev) => prev.filter((u) => u.id !== uploadId));
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  const handleProcessUpload = async (upload: DocumentUpload) => {
    if (!token) return;

    setCurrentUpload({ upload });
    setViewState('classifying');

    try {
      const result = await documentsApi.classifyUpload(petId, upload.id, token);
      setCurrentUpload({
        upload: result.upload,
        classification: result.classification,
      });
      setViewState('confirm');
    } catch (err: any) {
      setError(err.message || 'Failed to classify document');
      setViewState('upload');
      setCurrentUpload(null);
      loadUploads();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg className="animate-spin h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  // Image review state
  if (viewState === 'image_review' && currentUpload) {
    return (
      <ImageReviewForm
        petId={petId}
        upload={currentUpload.upload}
        exifDateTaken={exifDateTaken}
        onSave={() => {
          setCurrentUpload(null);
          setViewState('upload');
          loadUploads();
          onImportComplete?.();
        }}
        onCancel={handleBackToUploads}
      />
    );
  }

  // Review state
  if (viewState === 'review' && currentUpload) {
    return (
      <DocumentExtractionReview
        petId={petId}
        upload={currentUpload.upload}
        onBack={handleBackToUploads}
        onApprovalComplete={handleApprovalComplete}
      />
    );
  }

  // Classifying state
  if (viewState === 'classifying') {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <svg className="animate-spin h-12 w-12 text-blue-500 mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-gray-600">Analyzing document...</p>
        <p className="text-sm text-gray-400 mt-1">This may take a few seconds</p>
      </div>
    );
  }

  // Processing state
  if (viewState === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <svg className="animate-spin h-12 w-12 text-blue-500 mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-gray-600">Extracting health information...</p>
        <p className="text-sm text-gray-400 mt-1">AI is reading your document</p>
      </div>
    );
  }

  // Confirmation state
  if (viewState === 'confirm' && currentUpload?.classification) {
    return (
      <div className="space-y-6">
        <ClassificationConfirmation
          upload={currentUpload.upload}
          classification={currentUpload.classification}
          onConfirm={handleConfirmImport}
          onCancel={handleCancelImport}
        />
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>
    );
  }

  // Default upload state
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 flex items-center gap-2">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
          Import Documents
        </h3>
        <p className="mt-1 text-sm text-blue-700">
          Upload veterinary documents, vaccination cards, medication labels, or photos of health
          records. We'll automatically detect the document type and extract the information.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Upload zone */}
      <DocumentUploadZone petId={petId} onUploadComplete={handleUploadComplete} />

      {/* Previous uploads */}
      {uploads.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900">Previous Uploads</h4>
            <div className="flex gap-1">
              {(['all', 'pdf', 'image'] as FilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    filter === f
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'pdf' ? 'Documents' : 'Images'}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            {uploads
              .filter((u) => filter === 'all' || u.file_type === filter)
              .map((upload) => (
                <DocumentUploadItem
                  key={upload.id}
                  upload={upload}
                  onSelect={() => handleUploadSelect(upload)}
                  onDelete={() => handleUploadDeleted(upload.id)}
                  onProcess={() => handleProcessUpload(upload)}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Upload list item component
function DocumentUploadItem({
  upload,
  onSelect,
  onDelete,
  onProcess,
}: {
  upload: DocumentUpload;
  onSelect: () => void;
  onDelete: () => void;
  onProcess: () => void;
}) {
  const { token } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [newFilename, setNewFilename] = useState(upload.original_filename);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [currentFilename, setCurrentFilename] = useState(upload.original_filename);
  const [thumbnailError, setThumbnailError] = useState(false);

  const getDocumentUrl = (u: DocumentUpload) => {
    return `${API_URL}/api/pets/${u.pet_id}/documents/uploads/${u.id}/file`;
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-700',
    classifying: 'bg-blue-100 text-blue-700',
    classified: 'bg-yellow-100 text-yellow-700',
    processing: 'bg-blue-100 text-blue-700',
    pending_review: 'bg-purple-100 text-purple-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  };

  const statusLabels: Record<string, string> = {
    pending: 'Pending',
    classifying: 'Analyzing...',
    classified: 'Ready to import',
    processing: 'Processing...',
    pending_review: 'Needs Review',
    completed: 'Completed',
    failed: 'Failed',
  };

  const canReview = upload.status === 'completed' || upload.status === 'pending_review';
  const canProcess = upload.status === 'pending' || upload.status === 'classified';

  const handleStartEdit = () => {
    setIsEditing(true);
    setNewFilename(currentFilename);
    setRenameError(null);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setNewFilename(currentFilename);
    setRenameError(null);
  };

  const handleSaveEdit = async () => {
    if (!token) return;

    const trimmedFilename = newFilename.trim();
    if (!trimmedFilename) {
      setRenameError('Filename cannot be empty');
      return;
    }

    if (trimmedFilename.length > 255) {
      setRenameError('Filename must be 255 characters or less');
      return;
    }

    setIsRenaming(true);
    setRenameError(null);

    try {
      await documentsApi.renameUpload(upload.pet_id, upload.id, trimmedFilename, token);
      setCurrentFilename(trimmedFilename);
      setIsEditing(false);
    } catch (err: any) {
      setRenameError(err.message || 'Failed to rename');
    } finally {
      setIsRenaming(false);
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 w-10 h-10 rounded flex items-center justify-center overflow-hidden">
            {upload.file_type === 'pdf' ? (
              <svg className="w-9 h-9" viewBox="0 0 40 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 4C4 2.9 4.9 2 6 2H24L36 14V40C36 41.1 35.1 42 34 42H6C4.9 42 4 41.1 4 40V4Z" fill="white" stroke="#B91C1C" strokeWidth="2"/>
                <path d="M24 2V14H36" fill="#FEE2E2" stroke="#B91C1C" strokeWidth="2" strokeLinejoin="round"/>
                <rect x="2" y="24" width="28" height="14" rx="2" fill="#B91C1C"/>
                <text x="16" y="35" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="Arial, Helvetica, sans-serif">PDF</text>
              </svg>
            ) : !thumbnailError ? (
              <img
                src={getDocumentUrl(upload)}
                alt={currentFilename}
                className="h-10 w-10 object-cover rounded"
                onError={() => setThumbnailError(true)}
              />
            ) : (
              <svg className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newFilename}
                  onChange={(e) => setNewFilename(e.target.value)}
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isRenaming}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveEdit();
                    } else if (e.key === 'Escape') {
                      handleCancelEdit();
                    }
                  }}
                  autoFocus
                />
                <button
                  onClick={handleSaveEdit}
                  disabled={isRenaming}
                  className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50"
                  title="Save"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={isRenaming}
                  className="p-1 text-gray-600 hover:text-gray-700 disabled:opacity-50"
                  title="Cancel"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <a
                  href={getDocumentUrl(upload)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-blue-700 truncate hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {currentFilename}
                </a>
                <button
                  onClick={handleStartEdit}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title="Rename"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>
            )}
            <p className="text-xs text-gray-500">
              {new Date(upload.created_at).toLocaleDateString()}
              {upload.user_tag && (
                <> &middot; {upload.user_tag}</>
              )}
              {!upload.user_tag && upload.detected_document_type && (
                <> &middot; {upload.detected_document_type.replace(/_/g, ' ')}</>
              )}
            </p>
          </div>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[upload.status] || 'bg-gray-100 text-gray-700'}`}>
            {statusLabels[upload.status] || upload.status}
          </span>
        </div>
        <div className="flex items-center gap-2 ml-3">
          {canReview && (
            <button
              onClick={onSelect}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Review
            </button>
          )}
          {canProcess && (
            <button
              onClick={onProcess}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Process
            </button>
          )}
          <button
            onClick={onDelete}
            className="text-sm text-red-600 hover:text-red-700"
          >
            Delete
          </button>
        </div>
      </div>
      {renameError && (
        <div className="px-3 pb-3">
          <p className="text-xs text-red-600">{renameError}</p>
        </div>
      )}
    </div>
  );
}
