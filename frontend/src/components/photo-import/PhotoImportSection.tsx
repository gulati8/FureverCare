import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { photoImportApi, ImageUpload } from '../../api/client';
import { ImageUploadZone } from './ImageUploadZone';
import { ImageUploadList } from './ImageUploadList';
import { ImageExtractionReview } from './ImageExtractionReview';

interface PhotoImportSectionProps {
  petId: number;
}

type ViewState = 'list' | 'review';

export function PhotoImportSection({ petId }: PhotoImportSectionProps) {
  const { token } = useAuth();
  const [uploads, setUploads] = useState<ImageUpload[]>([]);
  const [selectedUpload, setSelectedUpload] = useState<ImageUpload | null>(null);
  const [viewState, setViewState] = useState<ViewState>('list');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUploads();
  }, [petId, token]);

  const loadUploads = async () => {
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await photoImportApi.listUploads(petId, token);
      setUploads(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load uploads');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadComplete = (upload: ImageUpload) => {
    setUploads((prev) => [upload, ...prev]);
  };

  const handleUploadDeleted = (uploadId: number) => {
    setUploads((prev) => prev.filter((u) => u.id !== uploadId));
  };

  const handleProcessingComplete = (upload: ImageUpload) => {
    setUploads((prev) => prev.map((u) => (u.id === upload.id ? upload : u)));
    // Auto-navigate to review if processing succeeded
    if (upload.status === 'completed') {
      setSelectedUpload(upload);
      setViewState('review');
    }
  };

  const handleUploadSelect = (upload: ImageUpload) => {
    setSelectedUpload(upload);
    setViewState('review');
  };

  const handleBackToList = () => {
    setViewState('list');
    setSelectedUpload(null);
    loadUploads(); // Refresh the list
  };

  const handleApprovalComplete = () => {
    loadUploads();
    setViewState('list');
    setSelectedUpload(null);
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

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
        <button onClick={loadUploads} className="mt-2 text-sm text-red-600 hover:text-red-700 underline">
          Try again
        </button>
      </div>
    );
  }

  if (viewState === 'review' && selectedUpload) {
    return (
      <ImageExtractionReview
        petId={petId}
        upload={selectedUpload}
        onBack={handleBackToList}
        onApprovalComplete={handleApprovalComplete}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 flex items-center gap-2">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Photo-to-Data Import
        </h3>
        <p className="mt-1 text-sm text-blue-700">
          Take a photo of vaccination cards, medication labels, or pet ID tags.
          We'll use AI to extract the information and add it to your pet's health records.
        </p>
      </div>

      <ImageUploadZone petId={petId} onUploadComplete={handleUploadComplete} />

      {uploads.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Previous Uploads</h4>
          <ImageUploadList
            petId={petId}
            uploads={uploads}
            onUploadSelect={handleUploadSelect}
            onUploadDeleted={handleUploadDeleted}
            onProcessingComplete={handleProcessingComplete}
          />
        </div>
      )}
    </div>
  );
}
