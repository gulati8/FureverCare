import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  API_URL,
  documentsApi,
  DocumentUpload,
} from '../../api/client';
import { DocumentUploadZone } from './DocumentUploadZone';
import { DocumentExtractionReview } from './DocumentExtractionReview';

interface DocumentImportSectionProps {
  petId: number;
  onImportComplete?: () => void;
  navigateToUploadId?: number | null;
  highlightItemId?: number | null;
  onNavigationHandled?: () => void;
}

type ViewState = 'library' | 'review';

interface DisplayItem {
  type: 'group' | 'standalone';
  groupId: string | null;
  groupName: string | null;
  pages: DocumentUpload[];
  status: string;
  primaryUpload: DocumentUpload;
}

export function DocumentImportSection({ petId, onImportComplete, navigateToUploadId, highlightItemId, onNavigationHandled }: DocumentImportSectionProps) {
  const { token } = useAuth();
  const [viewState, setViewState] = useState<ViewState>('library');
  const [currentUpload, setCurrentUpload] = useState<DocumentUpload | null>(null);
  const [uploads, setUploads] = useState<DocumentUpload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanningIds, setScanningIds] = useState<Set<number>>(new Set());
  const [selectedForScan, setSelectedForScan] = useState<Set<string>>(new Set()); // keys are "group:ID" or "standalone:ID"
  const [batchScanning, setBatchScanning] = useState(false);
  const [activeHighlightItemId, setActiveHighlightItemId] = useState<number | null>(null);
  const [completedExpanded, setCompletedExpanded] = useState(false);

  useEffect(() => {
    loadUploads();
  }, [petId, token]);

  // Navigate to a specific upload's review when requested
  useEffect(() => {
    if (navigateToUploadId && uploads.length > 0 && viewState === 'library') {
      const upload = uploads.find(u => u.id === navigateToUploadId);
      if (upload) {
        setCurrentUpload(upload);
        setActiveHighlightItemId(highlightItemId ?? null);
        setViewState('review');
        onNavigationHandled?.();
      }
    }
  }, [navigateToUploadId, uploads, viewState]);

  // Group uploads by document_group_id for display
  const displayItems = useMemo((): DisplayItem[] => {
    const groups = new Map<string, DocumentUpload[]>();
    const standalone: DocumentUpload[] = [];

    for (const upload of uploads) {
      if (upload.document_group_id) {
        const group = groups.get(upload.document_group_id) || [];
        group.push(upload);
        groups.set(upload.document_group_id, group);
      } else {
        standalone.push(upload);
      }
    }

    // Sort pages within each group
    for (const pages of groups.values()) {
      pages.sort((a, b) => a.page_number - b.page_number);
    }

    const items: DisplayItem[] = [
      ...Array.from(groups.entries()).map(([groupId, pages]) => ({
        type: 'group' as const,
        groupId,
        groupName: pages[0].group_name || pages[0].original_filename,
        pages,
        status: pages[0].status,
        primaryUpload: pages.find(p => p.page_number === 1) || pages[0],
      })),
      ...standalone.map(u => ({
        type: 'standalone' as const,
        groupId: null,
        groupName: null,
        pages: [u],
        status: u.status,
        primaryUpload: u,
      })),
    ];

    // Sort by most recent first
    items.sort((a, b) => new Date(b.primaryUpload.created_at).getTime() - new Date(a.primaryUpload.created_at).getTime());
    return items;
  }, [uploads]);

  const readyToScan = displayItems.filter(d => d.status === 'uploaded');
  const needsReview = displayItems.filter(d =>
    ['pending', 'classifying', 'processing', 'pending_review'].includes(d.status)
  );
  const completed = displayItems.filter(d =>
    ['completed', 'failed'].includes(d.status)
  );

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

  const handleUploadComplete = async () => {
    setError(null);
    await loadUploads();
    // Stay on library view — upload is done
  };

  const handleBackToLibrary = () => {
    setCurrentUpload(null);
    setActiveHighlightItemId(null);
    setViewState('library');
    loadUploads();
  };

  const handleApprovalComplete = () => {
    setCurrentUpload(null);
    setViewState('library');
    loadUploads();
    onImportComplete?.();
  };

  const handleUploadSelect = (upload: DocumentUpload) => {
    if (upload.status !== 'pending_review' && upload.status !== 'completed') return;
    setCurrentUpload(upload);
    setViewState('review');
  };

  const getItemKey = (item: DisplayItem): string => {
    return item.type === 'group' ? `group:${item.groupId}` : `standalone:${item.primaryUpload.id}`;
  };

  const handleScanDocument = async (item: DisplayItem) => {
    if (!token) return;
    const uploadId = item.primaryUpload.id;
    setScanningIds(prev => new Set(prev).add(uploadId));
    setError(null);
    try {
      const result = await documentsApi.processUpload(petId, uploadId, token);
      await loadUploads();
      if (result.extracted_items?.length > 0) {
        setCurrentUpload(result.upload);
        setViewState('review');
      }
    } catch (err: any) {
      setError(err.message || 'Scan failed');
      await loadUploads();
    } finally {
      setScanningIds(prev => { const n = new Set(prev); n.delete(uploadId); return n; });
    }
  };

  const handleBatchScan = async () => {
    if (!token) return;
    setBatchScanning(true);
    setError(null);

    // Get upload IDs from selected items (or all ready-to-scan if none selected)
    const targetItems = selectedForScan.size > 0
      ? readyToScan.filter(item => selectedForScan.has(getItemKey(item)))
      : readyToScan;

    const uploadIds = targetItems.map(item => item.primaryUpload.id);

    try {
      await documentsApi.batchProcess(petId, uploadIds, token);
      await loadUploads();
      setSelectedForScan(new Set());
    } catch (err: any) {
      setError(err.message || 'Batch scan failed');
    } finally {
      setBatchScanning(false);
    }
  };

  const toggleSelection = (key: string) => {
    setSelectedForScan(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleAddPage = async (item: DisplayItem) => {
    // Create a file input and trigger it
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,image/tiff,image/bmp,.heic,.heif,.tiff,.tif,.bmp';
    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length === 0 || !token) return;

      // Determine group ID and next page number
      const groupId = item.groupId || crypto.randomUUID();
      const maxPage = Math.max(...item.pages.map(p => p.page_number), 0);

      setError(null);
      setScanningIds(prev => new Set(prev).add(item.primaryUpload.id));

      try {
        for (let i = 0; i < files.length; i++) {
          await documentsApi.upload(petId, files[i], token, {
            documentGroupId: groupId,
            pageNumber: maxPage + i + 1,
            groupName: item.groupName || item.primaryUpload.original_filename,
          });
        }
        await loadUploads();
      } catch (err: any) {
        setError(err.message || 'Failed to add page');
      } finally {
        setScanningIds(prev => { const n = new Set(prev); n.delete(item.primaryUpload.id); return n; });
      }
    };
    input.click();
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

  // Review state
  if (viewState === 'review' && currentUpload) {
    return (
      <DocumentExtractionReview
        petId={petId}
        upload={currentUpload}
        onBack={handleBackToLibrary}
        onApprovalComplete={handleApprovalComplete}
        highlightItemId={activeHighlightItemId}
      />
    );
  }

  // Library view (default)
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 flex items-center gap-2">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Documents
        </h3>
        <p className="mt-1 text-sm text-blue-700">
          Store vet documents and photos. Optionally scan them to automatically extract health records.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Upload zone */}
      <DocumentUploadZone petId={petId} onUploadComplete={handleUploadComplete} />

      {/* Ready to Scan */}
      {readyToScan.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-900">Ready to Scan ({readyToScan.length})</h4>
            <button
              onClick={handleBatchScan}
              disabled={batchScanning}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {batchScanning ? 'Scanning...' : selectedForScan.size > 0
                ? `Scan Selected (${selectedForScan.size})`
                : `Scan All (${readyToScan.length})`}
            </button>
          </div>
          <div className="space-y-2">
            {readyToScan.map((item) => (
              <DocumentCard
                key={getItemKey(item)}
                item={item}
                isScanning={scanningIds.has(item.primaryUpload.id) || batchScanning}
                isSelected={selectedForScan.has(getItemKey(item))}
                onToggleSelect={() => toggleSelection(getItemKey(item))}
                onScan={() => handleScanDocument(item)}
                onAddPage={() => handleAddPage(item)}
                showCheckbox={readyToScan.length > 1}
              />
            ))}
          </div>
        </div>
      )}

      {/* Needs Review */}
      {needsReview.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">Needs Review ({needsReview.length})</h4>
          <div className="space-y-2">
            {needsReview.map((item) => (
              <DocumentCard
                key={getItemKey(item)}
                item={item}
                onSelect={() => handleUploadSelect(item.primaryUpload)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div>
          <button
            onClick={() => setCompletedExpanded(!completedExpanded)}
            className="flex items-center gap-2 text-sm font-medium text-gray-900 hover:text-gray-700 mb-2"
          >
            <svg
              className={`h-4 w-4 transition-transform ${completedExpanded ? 'rotate-90' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Completed ({completed.length})
          </button>
          {completedExpanded && (
            <div className="space-y-2">
              {completed.map((item) => (
                <DocumentCard
                  key={getItemKey(item)}
                  item={item}
                  onSelect={() => handleUploadSelect(item.primaryUpload)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Unified document card component - handles both standalone and grouped documents
function DocumentCard({
  item,
  isScanning,
  isSelected,
  onToggleSelect,
  onScan,
  onSelect,
  onAddPage,
  showCheckbox,
}: {
  item: DisplayItem;
  isScanning?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onScan?: () => void;
  onSelect?: () => void;
  onAddPage?: () => void;
  showCheckbox?: boolean;
}) {
  const { token } = useAuth();
  const upload = item.primaryUpload;
  const [isEditing, setIsEditing] = useState(false);
  const [newFilename, setNewFilename] = useState(upload.original_filename);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [currentFilename, setCurrentFilename] = useState(
    item.type === 'group' ? (item.groupName || upload.original_filename) : upload.original_filename
  );
  const [thumbnailError, setThumbnailError] = useState(false);
  const [metadataExpanded, setMetadataExpanded] = useState(false);

  const getDocumentUrl = (u: DocumentUpload) => {
    return `${API_URL}/api/pets/${u.pet_id}/documents/uploads/${u.id}/file`;
  };

  const statusColors: Record<string, string> = {
    uploaded: 'bg-gray-100 text-gray-600',
    pending: 'bg-blue-100 text-blue-700',
    classifying: 'bg-blue-100 text-blue-700',
    processing: 'bg-blue-100 text-blue-700',
    pending_review: 'bg-purple-100 text-purple-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  };

  const statusLabels: Record<string, string> = {
    uploaded: 'Stored',
    pending: 'Scanning...',
    classifying: 'Scanning...',
    processing: 'Scanning...',
    pending_review: 'Needs review',
    completed: 'Imported',
    failed: 'Failed',
  };

  const isProcessing = ['pending', 'classifying', 'processing'].includes(upload.status);
  const canReview = upload.status === 'pending_review';
  const canView = upload.status === 'completed';
  const isStored = upload.status === 'uploaded';
  const isFailed = upload.status === 'failed';

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
    if (!trimmedFilename || trimmedFilename.length > 255) {
      setRenameError(trimmedFilename ? 'Max 255 characters' : 'Name required');
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
          {/* Checkbox for batch selection */}
          {showCheckbox && onToggleSelect && (
            <input
              type="checkbox"
              checked={isSelected || false}
              onChange={onToggleSelect}
              className="h-4 w-4 text-blue-600 rounded border-gray-300"
            />
          )}

          {/* Thumbnail */}
          <div className="flex-shrink-0 w-10 h-10 rounded flex items-center justify-center overflow-hidden">
            {upload.file_type === 'pdf' || upload.mime_type === 'application/pdf' ? (
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

          {/* File info */}
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
                    if (e.key === 'Enter') handleSaveEdit();
                    else if (e.key === 'Escape') handleCancelEdit();
                  }}
                  autoFocus
                />
                <button onClick={handleSaveEdit} disabled={isRenaming} className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50" title="Save">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </button>
                <button onClick={handleCancelEdit} disabled={isRenaming} className="p-1 text-gray-600 hover:text-gray-700 disabled:opacity-50" title="Cancel">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
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
                <button onClick={handleStartEdit} className="p-1 text-gray-400 hover:text-gray-600" title="Rename">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
              </div>
            )}
            <p className="text-xs text-gray-500">
              {item.type === 'group' && <>{item.pages.length} pages &middot; </>}
              {new Date(upload.created_at).toLocaleDateString()}
              {upload.user_tag && <> &middot; {upload.user_tag}</>}
              {!upload.user_tag && upload.detected_document_type && <> &middot; {upload.detected_document_type.replace(/_/g, ' ')}</>}
            </p>
          </div>

          {/* Status badges */}
          {upload.status === 'pending_review' && (upload.pending_items || upload.approved_items || upload.rejected_items) ? (
            <div className="flex items-center gap-1.5">
              {!!upload.pending_items && (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                  {upload.pending_items} pending
                </span>
              )}
              {!!upload.approved_items && (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                  {upload.approved_items} approved
                </span>
              )}
            </div>
          ) : (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[upload.status] || 'bg-gray-100 text-gray-700'} ${isProcessing || isScanning ? 'animate-pulse' : ''}`}>
              {isScanning ? 'Scanning...' : statusLabels[upload.status] || upload.status}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 ml-3">
          {(isStored || isFailed) && onScan && (
            <button
              onClick={onScan}
              disabled={isScanning}
              className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 disabled:opacity-50"
            >
              {isScanning ? 'Scanning...' : isFailed ? 'Retry Scan' : 'Scan for Records'}
            </button>
          )}
          {canReview && (
            <button onClick={onSelect} className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100">
              Review
            </button>
          )}
          {canView && (
            <button onClick={onSelect} className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100">
              View
            </button>
          )}
        </div>
      </div>

      {/* Multi-page thumbnail strip */}
      {item.type === 'group' && item.pages.length > 1 && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {item.pages.map((page, i) => (
              <a
                key={page.id}
                href={getDocumentUrl(page)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 w-10 h-10 rounded border border-gray-200 overflow-hidden hover:border-blue-400 transition-colors relative"
                title={`Page ${page.page_number}`}
              >
                <img
                  src={getDocumentUrl(page)}
                  alt={`Page ${page.page_number}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <span className="absolute bottom-0 right-0 text-[9px] bg-black/50 text-white px-1 rounded-tl">
                  {page.page_number}
                </span>
              </a>
            ))}
            {isStored && onAddPage && (
              <button
                onClick={onAddPage}
                className="flex-shrink-0 w-10 h-10 rounded border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
                title="Add page"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Inline metadata for stored images */}
      {isStored && upload.mime_type?.startsWith('image/') && item.type === 'standalone' && (
        <div className="px-3 pb-3">
          <button
            onClick={() => setMetadataExpanded(!metadataExpanded)}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <svg className={`h-3 w-3 transition-transform ${metadataExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Add details (optional)
          </button>
          {metadataExpanded && (
            <InlineMetadataForm petId={item.primaryUpload.pet_id} uploadId={upload.id} upload={upload} />
          )}
        </div>
      )}

      {renameError && (
        <div className="px-3 pb-3">
          <p className="text-xs text-red-600">{renameError}</p>
        </div>
      )}
    </div>
  );
}

// Inline metadata form for images
function InlineMetadataForm({ petId, uploadId, upload }: { petId: number; uploadId: number; upload: DocumentUpload }) {
  const { token } = useAuth();
  const [userTag, setUserTag] = useState(upload.user_tag || '');
  const [userDescription, setUserDescription] = useState(upload.user_description || '');
  const [dateTaken, setDateTaken] = useState(upload.date_taken ? upload.date_taken.split('T')[0] : '');
  const [bodyArea, setBodyArea] = useState(upload.body_area || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const tagSuggestions = ['X-ray', 'Lab result', 'Wound photo', 'Teeth/Dental', 'Vaccination card', 'Medication label', 'Weight record', 'Skin condition', 'Before/After', 'Other'];

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      await documentsApi.saveImageMetadata(petId, uploadId, {
        userTag: userTag || undefined,
        userDescription: userDescription || undefined,
        dateTaken: dateTaken || undefined,
        bodyArea: bodyArea || undefined,
      }, token);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // Silently fail — metadata is optional
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-2 space-y-2">
      <div>
        <label className="block text-xs text-gray-600 mb-1">Tag</label>
        <div className="flex flex-wrap gap-1 mb-1">
          {tagSuggestions.map(tag => (
            <button
              key={tag}
              onClick={() => setUserTag(tag)}
              className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                userTag === tag ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={userTag}
          onChange={(e) => setUserTag(e.target.value)}
          placeholder="Custom tag..."
          className="w-full border border-gray-200 rounded px-2 py-1 text-xs"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-600 mb-1">Note</label>
        <input
          type="text"
          value={userDescription}
          onChange={(e) => setUserDescription(e.target.value)}
          placeholder="Brief description..."
          className="w-full border border-gray-200 rounded px-2 py-1 text-xs"
        />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-xs text-gray-600 mb-1">Date taken</label>
          <input
            type="date"
            value={dateTaken}
            onChange={(e) => setDateTaken(e.target.value)}
            className="w-full border border-gray-200 rounded px-2 py-1 text-xs"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-gray-600 mb-1">Body area</label>
          <input
            type="text"
            value={bodyArea}
            onChange={(e) => setBodyArea(e.target.value)}
            placeholder="e.g., Left hip"
            className="w-full border border-gray-200 rounded px-2 py-1 text-xs"
          />
        </div>
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {saved ? 'Saved!' : saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  );
}
