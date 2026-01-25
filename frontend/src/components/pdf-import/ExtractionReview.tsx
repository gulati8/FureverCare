import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { pdfImportApi, PdfUpload, ExtractionWithItems } from '../../api/client';
import { ExtractionItemCard } from './ExtractionItemCard';

interface ExtractionReviewProps {
  petId: number;
  upload: PdfUpload;
  onBack: () => void;
  onApprovalComplete: () => void;
}

export function ExtractionReview({ petId, upload, onBack, onApprovalComplete }: ExtractionReviewProps) {
  const { token } = useAuth();
  const [extraction, setExtraction] = useState<ExtractionWithItems | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadExtraction();
  }, [upload.id]);

  const loadExtraction = async () => {
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await pdfImportApi.getExtraction(petId, upload.id, token);
      setExtraction(data);

      // Pre-select all pending items
      const pendingIds = data.items
        .filter((item) => item.status === 'pending' || item.status === 'modified')
        .map((item) => item.id);
      setSelectedIds(new Set(pendingIds));
    } catch (err: any) {
      setError(err.message || 'Failed to load extraction');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleItemSelection = (itemId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (!extraction) return;
    const pendingIds = extraction.items
      .filter((item) => item.status === 'pending' || item.status === 'modified')
      .map((item) => item.id);
    setSelectedIds(new Set(pendingIds));
  };

  const selectNone = () => {
    setSelectedIds(new Set());
  };

  const handleModifyItem = async (itemId: number, modifiedData: Record<string, any>) => {
    if (!token || !extraction) return;

    try {
      const updatedItem = await pdfImportApi.editItem(petId, itemId, modifiedData, token);

      // Update local state
      setExtraction((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((item) =>
            item.id === itemId ? updatedItem : item
          ),
        };
      });
    } catch (err: any) {
      console.error('Failed to modify item:', err);
      alert(`Failed to save changes: ${err.message}`);
    }
  };

  const handleApprove = async () => {
    if (!token || selectedIds.size === 0) return;

    setIsApproving(true);
    setError(null);

    try {
      const result = await pdfImportApi.approveItems(petId, upload.id, Array.from(selectedIds), token);

      if (result.errors.length > 0) {
        setError(`Some items failed to approve: ${result.errors.map((e) => e.error).join(', ')}`);
      }

      // Reload extraction to get updated statuses
      await loadExtraction();

      if (result.approved.length > 0) {
        alert(`Successfully added ${result.approved.length} record(s) to your pet's health profile!`);
      }

      // Check if all items are now processed
      const updatedExtraction = await pdfImportApi.getExtraction(petId, upload.id, token);
      const pendingItems = updatedExtraction.items.filter(
        (item) => item.status === 'pending' || item.status === 'modified'
      );

      if (pendingItems.length === 0) {
        onApprovalComplete();
      }
    } catch (err: any) {
      setError(err.message || 'Approval failed');
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!token || selectedIds.size === 0) return;

    if (!confirm('Are you sure you want to reject the selected items? They will not be added to your pet\'s records.')) {
      return;
    }

    setIsRejecting(true);
    setError(null);

    try {
      await pdfImportApi.rejectItems(petId, upload.id, Array.from(selectedIds), token);
      await loadExtraction();
      setSelectedIds(new Set());
    } catch (err: any) {
      setError(err.message || 'Rejection failed');
    } finally {
      setIsRejecting(false);
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

  if (error && !extraction) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
        <button onClick={onBack} className="mt-2 text-sm text-red-600 hover:text-red-700 underline">
          Go back
        </button>
      </div>
    );
  }

  if (!extraction || extraction.items.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No data was extracted from this document.</p>
        <button onClick={onBack} className="mt-4 text-blue-600 hover:text-blue-700">
          Go back
        </button>
      </div>
    );
  }

  const pendingItems = extraction.items.filter(
    (item) => item.status === 'pending' || item.status === 'modified'
  );
  const processedItems = extraction.items.filter(
    (item) => item.status === 'approved' || item.status === 'rejected'
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={onBack}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to uploads
          </button>
          <h3 className="mt-2 text-lg font-medium text-gray-900">
            Review Extracted Data
          </h3>
          <p className="text-sm text-gray-500">
            From: {upload.original_filename}
          </p>
        </div>
      </div>

      {/* Confidence legend */}
      <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-4 text-xs">
        <span className="text-gray-500">Confidence:</span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-green-500"></span>
          High (80%+)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-yellow-500"></span>
          Medium (50-80%)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-500"></span>
          Low (&lt;50%)
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Pending items */}
      {pendingItems.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">
              Items to Review ({pendingItems.length})
            </h4>
            <div className="flex items-center gap-2 text-sm">
              <button onClick={selectAll} className="text-blue-600 hover:text-blue-700">
                Select all
              </button>
              <span className="text-gray-300">|</span>
              <button onClick={selectNone} className="text-blue-600 hover:text-blue-700">
                Select none
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {pendingItems.map((item) => (
              <ExtractionItemCard
                key={item.id}
                item={item}
                isSelected={selectedIds.has(item.id)}
                onToggleSelect={() => toggleItemSelection(item.id)}
                onModify={(data) => handleModifyItem(item.id, data)}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleApprove}
              disabled={selectedIds.size === 0 || isApproving}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isApproving ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Approving...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Approve Selected ({selectedIds.size})
                </>
              )}
            </button>

            <button
              onClick={handleReject}
              disabled={selectedIds.size === 0 || isRejecting}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isRejecting ? 'Rejecting...' : `Reject Selected (${selectedIds.size})`}
            </button>
          </div>
        </div>
      )}

      {/* Processed items */}
      {processedItems.length > 0 && (
        <div className="mt-8">
          <h4 className="font-medium text-gray-900 mb-3">
            Already Processed ({processedItems.length})
          </h4>
          <div className="space-y-3 opacity-75">
            {processedItems.map((item) => (
              <ExtractionItemCard
                key={item.id}
                item={item}
                isSelected={false}
                onToggleSelect={() => {}}
                onModify={() => {}}
              />
            ))}
          </div>
        </div>
      )}

      {/* All done */}
      {pendingItems.length === 0 && processedItems.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <svg className="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-green-900">All items processed!</h3>
          <p className="text-sm text-green-600 mt-1">
            The extracted data has been reviewed and added to your pet's records.
          </p>
          <button
            onClick={onBack}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Back to uploads
          </button>
        </div>
      )}
    </div>
  );
}
