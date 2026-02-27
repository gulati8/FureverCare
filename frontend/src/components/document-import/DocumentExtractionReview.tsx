import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  documentsApi,
  DocumentUpload,
  DocumentExtractionWithItems,
  DuplicateInfo,
  MergeAction,
  MergeItem,
} from '../../api/client';
import { ExtractionItemCard } from '../pdf-import/ExtractionItemCard';

interface DocumentExtractionReviewProps {
  petId: number;
  upload: DocumentUpload;
  onBack: () => void;
  onApprovalComplete: () => void;
}

export function DocumentExtractionReview({
  petId,
  upload,
  onBack,
  onApprovalComplete,
}: DocumentExtractionReviewProps) {
  const { token } = useAuth();
  const [extraction, setExtraction] = useState<DocumentExtractionWithItems | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<Record<number, DuplicateInfo>>({});

  // Phase 2: Per-item merge actions for duplicate items
  const [mergeActions, setMergeActions] = useState<Record<number, MergeAction>>({});

  // Phase 4: Per-field overrides for each duplicate item
  const [fieldOverrides, setFieldOverrides] = useState<Record<number, Record<string, 'existing' | 'imported'>>>({});

  useEffect(() => {
    loadExtraction();
  }, [upload.id]);

  const loadExtraction = async () => {
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await documentsApi.getExtraction(petId, upload.id, token);
      setExtraction(data);

      // Check for duplicate medications
      let dupResult: Record<number, DuplicateInfo> = {};
      try {
        const result = await documentsApi.checkDuplicates(petId, upload.id, token);
        dupResult = result.duplicates;
        setDuplicates(dupResult);
      } catch {
        // Non-critical - don't block the review if check fails
      }

      // Pre-select only NON-duplicate pending items
      const pendingIds = data.items
        .filter((item) => (item.status === 'pending' || item.status === 'modified') && !dupResult[item.id])
        .map((item) => item.id);
      setSelectedIds(new Set(pendingIds));

      // Initialize merge actions: duplicates start with no action selected (not pre-checked)
      // The user must explicitly choose an action for each duplicate
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
    // Only select non-duplicate pending items
    const pendingIds = extraction.items
      .filter((item) => (item.status === 'pending' || item.status === 'modified') && !duplicates[item.id])
      .map((item) => item.id);
    setSelectedIds(new Set(pendingIds));
  };

  const selectNone = () => {
    setSelectedIds(new Set());
  };

  const handleMergeActionChange = (itemId: number, action: MergeAction) => {
    setMergeActions((prev) => ({ ...prev, [itemId]: action }));
  };

  const handleFieldOverrideChange = (itemId: number, field: string, choice: 'existing' | 'imported') => {
    setFieldOverrides((prev) => ({
      ...prev,
      [itemId]: { ...(prev[itemId] || {}), [field]: choice },
    }));
  };

  const handleModifyItem = async (itemId: number, modifiedData: Record<string, any>) => {
    if (!token || !extraction) return;

    try {
      const updatedItem = await documentsApi.editItem(petId, itemId, modifiedData, token);

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
    if (!token) return;

    // Gather non-duplicate selected items
    const nonDuplicateIds = Array.from(selectedIds).filter((id) => !duplicates[id]);

    // Gather duplicate items that have a merge action set
    const duplicateMergeItems: MergeItem[] = [];
    for (const [itemIdStr, action] of Object.entries(mergeActions)) {
      const itemId = parseInt(itemIdStr);
      duplicateMergeItems.push({
        itemId,
        action,
        fieldOverrides: fieldOverrides[itemId],
      });
    }

    if (nonDuplicateIds.length === 0 && duplicateMergeItems.length === 0) return;

    setIsApproving(true);
    setError(null);

    try {
      const parts: string[] = [];
      let totalProcessed = 0;

      // Process non-duplicate items via normal approve
      if (nonDuplicateIds.length > 0) {
        const result = await documentsApi.approveItems(
          petId,
          upload.id,
          nonDuplicateIds,
          token
        );

        if (result.errors.length > 0) {
          setError(
            `Some items failed to approve: ${result.errors.map((e) => e.error).join(', ')}`
          );
        }

        if (result.approved.length > 0) {
          const created = result.approved.filter((a) => a.action !== 'updated').length;
          const updated = result.approved.filter((a) => a.action === 'updated').length;
          if (created > 0) parts.push(`${created} created`);
          if (updated > 0) parts.push(`${updated} updated`);
          totalProcessed += result.approved.length;
        }
      }

      // Process duplicate items via approve-merge
      if (duplicateMergeItems.length > 0) {
        const mergeResult = await documentsApi.approveMerge(
          petId,
          upload.id,
          duplicateMergeItems,
          token
        );

        if (mergeResult.errors.length > 0) {
          const existing = error || '';
          setError(
            (existing ? existing + ' ' : '') +
            `Merge errors: ${mergeResult.errors.map((e) => e.error).join(', ')}`
          );
        }

        const merged = mergeResult.processed.filter((p) => p.result === 'updated').length;
        const created = mergeResult.processed.filter((p) => p.result === 'created').length;
        const skipped = mergeResult.processed.filter((p) => p.result === 'skipped').length;
        if (merged > 0) parts.push(`${merged} merged with existing`);
        if (created > 0) parts.push(`${created} created as new`);
        if (skipped > 0) parts.push(`${skipped} skipped`);
        totalProcessed += mergeResult.processed.length;
      }

      // Reload extraction to get updated statuses
      await loadExtraction();

      // Clear merge actions for processed items
      setMergeActions({});
      setFieldOverrides({});

      if (totalProcessed > 0) {
        alert(`Successfully processed ${totalProcessed} record(s): ${parts.join(', ')}.`);
      }

      // Check if all items are now processed
      const updatedExtraction = await documentsApi.getExtraction(petId, upload.id, token);
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

    if (
      !confirm(
        "Are you sure you want to reject the selected items? They will not be added to your pet's records."
      )
    ) {
      return;
    }

    setIsRejecting(true);
    setError(null);

    try {
      await documentsApi.rejectItems(petId, upload.id, Array.from(selectedIds), token);
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
        <p className="text-sm text-gray-400 mt-1">
          Try uploading a clearer document or a different file format.
        </p>
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

  // Count items ready to process
  const nonDuplicateSelectedCount = Array.from(selectedIds).filter((id) => !duplicates[id]).length;
  const duplicateWithActionCount = Object.keys(mergeActions).length;
  const totalReadyCount = nonDuplicateSelectedCount + duplicateWithActionCount;

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
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-amber-400"></span>
          Duplicate
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
            {pendingItems.map((item) => {
              const dupInfo = duplicates[item.id];
              const isDuplicate = !!dupInfo;

              return (
                <ExtractionItemCard
                  key={item.id}
                  item={item}
                  isSelected={selectedIds.has(item.id)}
                  onToggleSelect={() => toggleItemSelection(item.id)}
                  onModify={(data) => handleModifyItem(item.id, data)}
                  duplicateOf={dupInfo?.existingName}
                  duplicateInfo={dupInfo}
                  mergeAction={isDuplicate ? mergeActions[item.id] : undefined}
                  onMergeActionChange={isDuplicate ? (action) => handleMergeActionChange(item.id, action) : undefined}
                  fieldOverrides={isDuplicate ? fieldOverrides[item.id] : undefined}
                  onFieldOverrideChange={isDuplicate ? (field, choice) => handleFieldOverrideChange(item.id, field, choice) : undefined}
                />
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleApprove}
              disabled={totalReadyCount === 0 || isApproving}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isApproving ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Process Selected ({totalReadyCount})
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
