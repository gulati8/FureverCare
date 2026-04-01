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
type ViewMode = 'grid' | 'list';
type FilterStatus = 'all' | 'stored' | 'review' | 'imported';

interface DisplayItem {
  type: 'group' | 'standalone';
  groupId: string | null;
  groupName: string | null;
  pages: DocumentUpload[];
  status: string;
  primaryUpload: DocumentUpload;
}

function getFilterCategory(status: string): 'stored' | 'review' | 'imported' {
  if (status === 'uploaded') return 'stored';
  if (['pending', 'processing', 'pending_review'].includes(status)) return 'review';
  return 'imported'; // completed, failed
}

export function DocumentImportSection({ petId, onImportComplete, navigateToUploadId, highlightItemId, onNavigationHandled }: DocumentImportSectionProps) {
  const { token } = useAuth();
  const [viewState, setViewState] = useState<ViewState>('library');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try { return (localStorage.getItem('fc-doc-view-mode') as ViewMode) || 'list'; } catch { return 'list'; }
  });
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [currentUpload, setCurrentUpload] = useState<DocumentUpload | null>(null);
  const [uploads, setUploads] = useState<DocumentUpload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanningIds, setScanningIds] = useState<Set<number>>(new Set());
  const [batchScanning, setBatchScanning] = useState(false);
  const [activeHighlightItemId, setActiveHighlightItemId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

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

    items.sort((a, b) => new Date(b.primaryUpload.created_at).getTime() - new Date(a.primaryUpload.created_at).getTime());
    return items;
  }, [uploads]);

  // Filter counts
  const counts = useMemo(() => {
    const c = { stored: 0, review: 0, imported: 0 };
    for (const item of displayItems) {
      c[getFilterCategory(item.status)]++;
    }
    return c;
  }, [displayItems]);

  const filteredItems = useMemo(() => {
    if (filter === 'all') return displayItems;
    return displayItems.filter(item => getFilterCategory(item.status) === filter);
  }, [displayItems, filter]);

  // Show filter bar when 4+ documents or 2+ status categories
  const statusCategories = new Set(displayItems.map(d => getFilterCategory(d.status)));
  const showFilters = displayItems.length >= 4 || statusCategories.size >= 2;
  const showViewToggle = displayItems.length > 0;

  const storedItems = displayItems.filter(d => d.status === 'uploaded');

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
      setError(err.message || 'Failed to find health records');
      await loadUploads();
    } finally {
      setScanningIds(prev => { const n = new Set(prev); n.delete(uploadId); return n; });
    }
  };

  const handleBatchScan = async () => {
    if (!token) return;
    setBatchScanning(true);
    setError(null);
    const uploadIds = storedItems.map(item => item.primaryUpload.id);
    try {
      await documentsApi.batchProcess(petId, uploadIds, token);
      await loadUploads();
    } catch (err: any) {
      setError(err.message || 'Batch processing failed');
    } finally {
      setBatchScanning(false);
    }
  };

  const handleAddPage = async (item: DisplayItem) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,image/tiff,image/bmp,.heic,.heif,.tiff,.tif,.bmp';
    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length === 0 || !token) return;

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

  const handleReorderPages = async (groupId: string, pageOrder: number[]) => {
    if (!token) return;

    // Optimistic local update — reorder uploads in state without refetching
    setUploads(prev => {
      const updated = [...prev];
      for (let i = 0; i < pageOrder.length; i++) {
        const idx = updated.findIndex(u => u.id === pageOrder[i]);
        if (idx !== -1) {
          updated[idx] = { ...updated[idx], page_number: i + 1 };
        }
      }
      return updated;
    });

    // Persist to backend in background
    try {
      await documentsApi.reorderGroup(petId, groupId, pageOrder, token);
    } catch (err: any) {
      setError(err.message || 'Failed to reorder pages');
      await loadUploads(); // Revert on error
    }
  };

  const handleDeleteDocument = async (item: DisplayItem) => {
    if (!token) return;
    const uploadIdsToDelete = item.type === 'group'
      ? item.pages.map(p => p.id)
      : [item.primaryUpload.id];
    setError(null);
    try {
      for (const uploadId of uploadIdsToDelete) {
        await documentsApi.deleteUpload(petId, uploadId, token);
      }
      setUploads(prev => prev.filter(u => !uploadIdsToDelete.includes(u.id)));
    } catch (err: any) {
      setError(err.message || 'Failed to delete document');
    } finally {
      setDeletingId(null);
    }
  };

  const getDocumentUrl = (u: DocumentUpload) =>
    `${API_URL}/api/pets/${u.pet_id}/documents/uploads/${u.id}/file`;

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

  // Library view
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'var(--font-heading, inherit)' }}>
          Documents
          {displayItems.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-400">{displayItems.length} total</span>
          )}
        </h3>
        <div className="flex items-center gap-3">
          {/* Batch action */}
          {storedItems.length > 1 && (
            <button
              onClick={handleBatchScan}
              disabled={batchScanning}
              className="px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors"
              style={{
                background: 'var(--color-steel-light, #E8F0F8)',
                borderColor: 'var(--color-steel, #4A7FB5)',
                color: 'var(--color-steel-dark, #3A6A9A)',
              }}
            >
              {batchScanning ? 'Finding...' : `Find Records in All (${storedItems.length})`}
            </button>
          )}
          {/* View toggle */}
          {showViewToggle && (
            <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--color-surface-200, #E2E5E9)' }}>
              <button
                onClick={() => { setViewMode('grid'); try { localStorage.setItem('fc-doc-view-mode', 'grid'); } catch {} }}
                className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1 transition-colors ${
                  viewMode === 'grid' ? 'bg-white text-gray-900 shadow-sm' : 'bg-gray-50 text-gray-400 hover:text-gray-600'
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
                </svg>
                Grid
              </button>
              <button
                onClick={() => { setViewMode('list'); try { localStorage.setItem('fc-doc-view-mode', 'list'); } catch {} }}
                className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1 transition-colors ${
                  viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'bg-gray-50 text-gray-400 hover:text-gray-600'
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                  <circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/>
                </svg>
                List
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Upload zone */}
      <DocumentUploadZone petId={petId} onUploadComplete={handleUploadComplete} />

      {/* Filter pills */}
      {showFilters && (
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'stored', 'review', 'imported'] as FilterStatus[]).map(f => {
            const count = f === 'all' ? displayItems.length : counts[f];
            if (f !== 'all' && count === 0) return null;
            const isActive = filter === f;
            const labels: Record<FilterStatus, string> = { all: 'All', stored: 'Stored', review: 'Needs Review', imported: 'Imported' };
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${
                  isActive
                    ? 'text-white border-transparent'
                    : 'bg-white text-gray-500 hover:text-gray-700'
                }`}
                style={isActive ? {
                  background: 'var(--color-navy, #1B2A4A)',
                  borderColor: 'var(--color-navy, #1B2A4A)',
                } : {
                  borderColor: 'var(--color-surface-200, #E2E5E9)',
                }}
              >
                {labels[f]}
                {f !== 'all' && count > 0 && (
                  <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-white/20' : 'text-white'
                  }`} style={!isActive ? { background: 'var(--color-coral, #E07A5F)' } : undefined}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Document library */}
      {filteredItems.length === 0 && displayItems.length === 0 && (
        <div className="text-center py-10">
          <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <h4 className="mt-2 text-sm font-semibold text-gray-900">No documents yet</h4>
          <p className="mt-1 text-sm text-gray-500">Upload vet records, prescriptions, or photos to keep them safe and organized.</p>
        </div>
      )}

      {filteredItems.length === 0 && displayItems.length > 0 && (
        <p className="text-sm text-gray-500 text-center py-6">No documents match this filter.</p>
      )}

      {/* Grid view */}
      {viewMode === 'grid' && filteredItems.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filteredItems.map(item => (
            <GridCard
              key={item.type === 'group' ? `g-${item.groupId}` : `s-${item.primaryUpload.id}`}
              item={item}
              getDocumentUrl={getDocumentUrl}
              isScanning={scanningIds.has(item.primaryUpload.id) || batchScanning}
              onScan={() => handleScanDocument(item)}
              onSelect={() => handleUploadSelect(item.primaryUpload)}
              onReorder={(pageOrder) => item.groupId ? handleReorderPages(item.groupId, pageOrder) : undefined}
              onDelete={() => handleDeleteDocument(item)}
              isDeleting={deletingId === item.primaryUpload.id}
              showDeleteConfirm={deletingId === item.primaryUpload.id}
              onDeleteConfirm={() => setDeletingId(item.primaryUpload.id)}
              onDeleteCancel={() => setDeletingId(null)}
            />
          ))}
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' && filteredItems.length > 0 && (
        <div className="space-y-1.5">
          {filteredItems.map(item => (
            <ListCard
              key={item.type === 'group' ? `g-${item.groupId}` : `s-${item.primaryUpload.id}`}
              item={item}
              getDocumentUrl={getDocumentUrl}
              isScanning={scanningIds.has(item.primaryUpload.id) || batchScanning}
              onScan={() => handleScanDocument(item)}
              onSelect={() => handleUploadSelect(item.primaryUpload)}
              onAddPage={() => handleAddPage(item)}
              onReorder={(pageOrder) => item.groupId ? handleReorderPages(item.groupId, pageOrder) : undefined}
              onDelete={() => handleDeleteDocument(item)}
              isDeleting={deletingId === item.primaryUpload.id}
              showDeleteConfirm={deletingId === item.primaryUpload.id}
              onDeleteConfirm={() => setDeletingId(item.primaryUpload.id)}
              onDeleteCancel={() => setDeletingId(null)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Status helpers
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  uploaded: { bg: 'bg-gray-100', text: 'text-gray-600' },
  pending: { bg: 'bg-blue-50', text: 'text-blue-700' },
  processing: { bg: 'bg-blue-50', text: 'text-blue-700' },
  pending_review: { bg: 'bg-amber-50', text: 'text-amber-700' },
  completed: { bg: 'bg-green-50', text: 'text-green-700' },
  failed: { bg: 'bg-red-50', text: 'text-red-700' },
};

const STATUS_LABELS: Record<string, string> = {
  uploaded: 'Stored',
  pending: 'Processing...',
  processing: 'Processing...',
  pending_review: 'Needs Review',
  completed: 'Imported',
  failed: 'Failed',
};

const STATUS_DOT_COLORS: Record<string, string> = {
  uploaded: 'bg-gray-400',
  pending: 'bg-blue-400',
  processing: 'bg-blue-400',
  pending_review: 'bg-amber-400',
  completed: 'bg-green-500',
  failed: 'bg-red-500',
};

// Grid card component
function GridCard({
  item,
  getDocumentUrl,
  isScanning,
  onScan,
  onSelect,
  onReorder,
  onDelete,
  isDeleting,
  showDeleteConfirm,
  onDeleteConfirm,
  onDeleteCancel,
}: {
  item: DisplayItem;
  getDocumentUrl: (u: DocumentUpload) => string;
  isScanning: boolean;
  onScan: () => void;
  onSelect: () => void;
  onReorder: (pageOrder: number[]) => void;
  onDelete: () => void;
  isDeleting: boolean;
  showDeleteConfirm: boolean;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}) {
  const upload = item.primaryUpload;
  const isStored = upload.status === 'uploaded';
  const isFailed = upload.status === 'failed';
  const canReview = upload.status === 'pending_review';
  const canView = upload.status === 'completed';
  const isProcessing = ['pending', 'processing'].includes(upload.status);
  const isImage = upload.mime_type?.startsWith('image/');
  const isGroup = item.type === 'group' && item.pages.length > 1;
  const [lightboxPage, setLightboxPage] = useState<DocumentUpload | null>(null);

  const handleClick = () => {
    if (canReview || canView) onSelect();
    else if (isGroup) setLightboxPage(item.pages[0]); // Open page viewer for groups
    else if (isImage) window.open(getDocumentUrl(upload), '_blank'); // Open standalone image
  };

  return (
    <>
      <div
        className={`rounded-lg border overflow-hidden bg-white transition-all cursor-pointer hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5`}
        style={{ borderColor: 'var(--color-surface-200, #E2E5E9)' }}
        onClick={handleClick}
      >
        {/* Thumbnail */}
        <div className="aspect-square bg-gray-100 relative flex items-center justify-center overflow-hidden">
          {isImage ? (
            <img
              src={getDocumentUrl(upload)}
              alt={upload.original_filename}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <svg className="w-12 h-12 text-red-300" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 2h8l6 6v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z"/>
            </svg>
          )}

          {/* Status badge overlay */}
          {isStored && (
            <span className="absolute top-1.5 right-1.5 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-white/85 text-gray-500">
              Stored
            </span>
          )}
          {upload.status === 'pending_review' && upload.pending_items && (
            <span className="absolute top-1.5 right-1.5 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50/90 text-amber-700 border border-amber-200">
              {upload.pending_items} pending
            </span>
          )}
          {(isProcessing || isScanning) && (
            <span className="absolute top-1.5 right-1.5 text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50/90 text-blue-700 animate-pulse">
              Processing...
            </span>
          )}

          {/* Multi-page badge */}
          {isGroup && (
            <span className="absolute bottom-1.5 left-1.5 text-[10px] font-bold px-2 py-0.5 rounded bg-black/60 text-white">
              {item.pages.length} pages
            </span>
          )}

          {/* Delete button — top-left corner */}
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteConfirm(); }}
            disabled={isDeleting}
            className="absolute top-1.5 left-1.5 bg-white/85 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded p-1 transition-colors disabled:opacity-50"
            title="Delete document"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>

          {/* Delete confirmation overlay */}
          {showDeleteConfirm && (
            <div
              className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center gap-2 p-2"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-xs font-semibold text-gray-800 text-center">Delete this document?</p>
              <div className="flex gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  disabled={isDeleting}
                  className="text-xs font-semibold px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {isDeleting ? 'Deleting...' : 'Yes'}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteCancel(); }}
                  disabled={isDeleting}
                  className="text-xs font-semibold px-3 py-1 rounded border text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  style={{ borderColor: 'var(--color-surface-200, #E2E5E9)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="p-2.5">
          <p className="text-xs font-semibold text-gray-900 truncate">
            {item.groupName || upload.original_filename}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT_COLORS[upload.status] || 'bg-gray-400'}`} />
            <span className="text-[11px] text-gray-500">
              {isScanning ? 'Processing...' : STATUS_LABELS[upload.status] || upload.status}
            </span>
            <span className="text-[11px] text-gray-400">
              {new Date(upload.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          </div>

          {/* Action button */}
          {(isStored || isFailed) && (
            <button
              onClick={(e) => { e.stopPropagation(); onScan(); }}
              disabled={isScanning}
              className="mt-2 w-full text-xs font-semibold py-1.5 rounded border transition-colors disabled:opacity-50"
              style={{
                background: 'var(--color-steel-light, #E8F0F8)',
                borderColor: 'var(--color-steel, #4A7FB5)',
                color: 'var(--color-steel-dark, #3A6A9A)',
              }}
            >
              {isScanning ? 'Finding...' : isFailed ? 'Retry' : 'Find Health Records'}
            </button>
          )}
        </div>
      </div>

      {/* Page lightbox for grid cards */}
      {lightboxPage && (
        <PageLightbox
          pages={item.pages}
          currentPage={lightboxPage}
          getDocumentUrl={getDocumentUrl}
          onClose={() => setLightboxPage(null)}
          onNavigate={setLightboxPage}
          onReorder={onReorder}
        />
      )}
    </>
  );
}

// List card component
function ListCard({
  item,
  getDocumentUrl,
  isScanning,
  onScan,
  onSelect,
  onAddPage,
  onReorder,
  onDelete,
  isDeleting,
  showDeleteConfirm,
  onDeleteConfirm,
  onDeleteCancel,
}: {
  item: DisplayItem;
  getDocumentUrl: (u: DocumentUpload) => string;
  isScanning: boolean;
  onScan: () => void;
  onSelect: () => void;
  onAddPage: () => void;
  onReorder: (pageOrder: number[]) => void;
  onDelete: () => void;
  isDeleting: boolean;
  showDeleteConfirm: boolean;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}) {
  const upload = item.primaryUpload;
  const isStored = upload.status === 'uploaded';
  const isFailed = upload.status === 'failed';
  const canReview = upload.status === 'pending_review';
  const canView = upload.status === 'completed';
  const isProcessing = ['pending', 'processing'].includes(upload.status);
  const isImage = upload.mime_type?.startsWith('image/');
  const isGroup = item.type === 'group' && item.pages.length > 1;

  const [metadataExpanded, setMetadataExpanded] = useState(false);
  const [pagesExpanded, setPagesExpanded] = useState(false);
  const [lightboxPage, setLightboxPage] = useState<DocumentUpload | null>(null);

  const handleMovePage = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= item.pages.length) return;
    const newPages = [...item.pages];
    const [moved] = newPages.splice(fromIdx, 1);
    newPages.splice(toIdx, 0, moved);
    onReorder(newPages.map(p => p.id));
  };

  return (
    <div
      className="rounded-lg border bg-white transition-colors"
      style={{ borderColor: 'var(--color-surface-200, #E2E5E9)' }}
    >
      <div className="flex items-center gap-3 p-3">
        {/* Thumbnail */}
        <div className="w-11 h-11 rounded-md overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center">
          {isImage ? (
            <img
              src={getDocumentUrl(upload)}
              alt={upload.original_filename}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <svg className="w-6 h-6 text-red-300" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 2h8l6 6v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z"/>
            </svg>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          {/* For standalone docs: link to file. For groups: just a label (no single file to link to) */}
          {isGroup ? (
            <span className="text-sm font-semibold text-gray-900 truncate block">
              {item.groupName || upload.original_filename}
            </span>
          ) : (
            <a
              href={getDocumentUrl(upload)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-gray-900 truncate block hover:text-blue-700 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {upload.original_filename}
            </a>
          )}
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[upload.status]?.bg || 'bg-gray-100'} ${STATUS_COLORS[upload.status]?.text || 'text-gray-600'} ${(isProcessing || isScanning) ? 'animate-pulse' : ''}`}>
              {isScanning ? 'Processing...' : upload.status === 'pending_review' && upload.pending_items
                ? `${upload.pending_items} pending`
                : STATUS_LABELS[upload.status] || upload.status}
            </span>
            {isGroup && (
              <span className="text-[11px] text-gray-400">{item.pages.length} pages</span>
            )}
            {upload.user_tag && (
              <span className="text-[11px] text-gray-400">{upload.user_tag}</span>
            )}
            <span className="text-[11px] text-gray-400">
              {new Date(upload.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isGroup && (
            <button
              onClick={() => setPagesExpanded(!pagesExpanded)}
              className="text-xs font-semibold px-3 py-1.5 rounded-md border text-gray-500 hover:bg-gray-50 transition-colors"
              style={{ borderColor: 'var(--color-surface-200, #E2E5E9)' }}
            >
              {pagesExpanded ? 'Hide Pages' : 'View Pages'}
            </button>
          )}
          {(isStored || isFailed) && (
            <button
              onClick={onScan}
              disabled={isScanning}
              className="text-xs font-semibold px-3 py-1.5 rounded-md border transition-colors disabled:opacity-50"
              style={{
                background: 'var(--color-steel-light, #E8F0F8)',
                borderColor: 'var(--color-steel, #4A7FB5)',
                color: 'var(--color-steel-dark, #3A6A9A)',
              }}
            >
              {isScanning ? 'Finding...' : isFailed ? 'Retry' : 'Find Health Records'}
            </button>
          )}
          {canReview && (
            <button
              onClick={onSelect}
              className="text-xs font-semibold px-3 py-1.5 rounded-md border transition-colors"
              style={{
                background: 'var(--color-steel-light, #E8F0F8)',
                borderColor: 'var(--color-steel, #4A7FB5)',
                color: 'var(--color-steel-dark, #3A6A9A)',
              }}
            >
              Review
            </button>
          )}
          {canView && (
            <button
              onClick={onSelect}
              className="text-xs font-semibold px-3 py-1.5 rounded-md border text-gray-500 hover:bg-gray-50 transition-colors"
              style={{ borderColor: 'var(--color-surface-200, #E2E5E9)' }}
            >
              View
            </button>
          )}
          {showDeleteConfirm ? (
            <>
              <span className="text-sm text-gray-500">Sure?</span>
              <button
                onClick={onDelete}
                disabled={isDeleting}
                className="text-red-600 hover:text-red-800 text-sm font-semibold disabled:opacity-50"
              >
                {isDeleting ? '...' : 'Yes'}
              </button>
              <button
                onClick={onDeleteCancel}
                disabled={isDeleting}
                className="text-gray-600 hover:text-gray-800 text-sm disabled:opacity-50"
              >
                No
              </button>
            </>
          ) : (
            <button
              onClick={onDeleteConfirm}
              disabled={isDeleting}
              className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Expanded page viewer with arrow-based reorder */}
      {isGroup && pagesExpanded && (
        <div className="px-3 pb-3 border-t" style={{ borderColor: 'var(--color-surface-100, #F1F3F5)' }}>
          <div className="flex items-start gap-2 overflow-x-auto pt-3 pb-1">
            {item.pages.map((page, idx) => (
              <div key={page.id} className="flex-shrink-0 flex flex-col items-center" style={{ width: '100px' }}>
                {/* Thumbnail — click to view */}
                <div
                  className="w-full bg-gray-100 cursor-pointer relative rounded-md overflow-hidden border hover:border-blue-400 hover:shadow-md transition-all"
                  style={{ height: '80px', borderColor: 'var(--color-surface-200, #E2E5E9)' }}
                  onClick={() => setLightboxPage(page)}
                >
                  <img
                    src={getDocumentUrl(page)}
                    alt={`Page ${idx + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <span className="absolute top-0.5 left-0.5 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                    {idx + 1}
                  </span>
                </div>
                {/* Reorder arrows */}
                <div className="flex items-center gap-1 mt-1">
                  <button
                    onClick={() => handleMovePage(idx, idx - 1)}
                    disabled={idx === 0}
                    className="p-0.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                    title="Move left"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="text-[10px] text-gray-400 tabular-nums">{idx + 1}/{item.pages.length}</span>
                  <button
                    onClick={() => handleMovePage(idx, idx + 1)}
                    disabled={idx === item.pages.length - 1}
                    className="p-0.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                    title="Move right"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
            {/* Add page button */}
            {isStored && (
              <div className="flex-shrink-0">
                <button
                  onClick={onAddPage}
                  className="rounded-md border-2 border-dashed flex flex-col items-center justify-center text-gray-300 hover:border-blue-400 hover:text-blue-500 transition-colors"
                  style={{ borderColor: 'var(--color-surface-300, #CED4DA)', width: '100px', height: '80px' }}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 4v16m8-8H4"/></svg>
                  <span className="text-[10px] font-medium mt-0.5">Add Page</span>
                </button>
              </div>
            )}
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5">Use arrows to reorder &middot; Click to view full size</p>
        </div>
      )}

      {/* Page lightbox */}
      {lightboxPage && (
        <PageLightbox
          pages={item.pages}
          currentPage={lightboxPage}
          getDocumentUrl={getDocumentUrl}
          onClose={() => setLightboxPage(null)}
          onNavigate={setLightboxPage}
          onReorder={onReorder}
        />
      )}

      {/* Inline metadata for stored standalone images */}
      {isStored && isImage && !isGroup && (
        <div className="px-3 pb-3">
          <button
            onClick={() => setMetadataExpanded(!metadataExpanded)}
            className="text-[11px] text-gray-400 hover:text-gray-600 flex items-center gap-1"
          >
            <svg className={`h-3 w-3 transition-transform ${metadataExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Add details (optional)
          </button>
          {metadataExpanded && (
            <InlineMetadataForm petId={upload.pet_id} uploadId={upload.id} upload={upload} />
          )}
        </div>
      )}
    </div>
  );
}

// Shared page lightbox with navigation and reorder
function PageLightbox({
  pages,
  currentPage,
  getDocumentUrl,
  onClose,
  onNavigate,
  onReorder,
}: {
  pages: DocumentUpload[];
  currentPage: DocumentUpload;
  getDocumentUrl: (u: DocumentUpload) => string;
  onClose: () => void;
  onNavigate: (page: DocumentUpload) => void;
  onReorder: (pageOrder: number[]) => void;
}) {
  const currentIdx = pages.findIndex(p => p.id === currentPage.id);

  const handleMovePage = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= pages.length) return;
    const newPages = [...pages];
    const [moved] = newPages.splice(fromIdx, 1);
    newPages.splice(toIdx, 0, moved);
    onReorder(newPages.map(p => p.id));
    // Navigate to the moved page's new position
    onNavigate(moved);
  };

  return (
    <div
      className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-3 right-3 z-10 bg-white/90 rounded-full p-1.5 text-gray-600 hover:text-gray-900 shadow-sm">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        {pages.length > 1 && (
          <>
            {currentIdx > 0 && (
              <button onClick={() => onNavigate(pages[currentIdx - 1])} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 bg-white/90 rounded-full p-2 text-gray-600 hover:text-gray-900 shadow-md">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
            )}
            {currentIdx < pages.length - 1 && (
              <button onClick={() => onNavigate(pages[currentIdx + 1])} className="absolute right-3 top-1/2 -translate-y-1/2 z-10 bg-white/90 rounded-full p-2 text-gray-600 hover:text-gray-900 shadow-md">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            )}
          </>
        )}

        <div className="flex items-center justify-center bg-gray-900 max-h-[75vh]">
          <img src={getDocumentUrl(currentPage)} alt={currentPage.original_filename} className="max-w-full max-h-[75vh] object-contain" />
        </div>

        <div className="p-3 border-t flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">
              {pages.length > 1 ? `Page ${currentIdx + 1} of ${pages.length}` : currentPage.original_filename}
            </span>
            {pages.length > 1 && (
              <>
                <span className="text-xs text-gray-400">{currentPage.original_filename}</span>
                <div className="flex items-center gap-1 border-l pl-3" style={{ borderColor: 'var(--color-surface-200, #E2E5E9)' }}>
                  <button
                    onClick={() => handleMovePage(currentIdx, currentIdx - 1)}
                    disabled={currentIdx === 0}
                    className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                    title="Move page earlier"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="text-[11px] text-gray-500 font-medium">Move</span>
                  <button
                    onClick={() => handleMovePage(currentIdx, currentIdx + 1)}
                    disabled={currentIdx === pages.length - 1}
                    className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                    title="Move page later"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </>
            )}
          </div>
          <a href={getDocumentUrl(currentPage)} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
            Open full size
          </a>
        </div>
      </div>
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
    } catch { /* metadata is optional */ }
    finally { setSaving(false); }
  };

  return (
    <div className="mt-2 space-y-2">
      <div>
        <label className="block text-[11px] text-gray-500 mb-1">Tag</label>
        <div className="flex flex-wrap gap-1 mb-1">
          {tagSuggestions.map(tag => (
            <button key={tag} onClick={() => setUserTag(tag)} className={`px-2 py-0.5 text-[11px] rounded-full border transition-colors ${userTag === tag ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}>
              {tag}
            </button>
          ))}
        </div>
        <input type="text" value={userTag} onChange={(e) => setUserTag(e.target.value)} placeholder="Custom tag..." className="w-full border border-gray-200 rounded px-2 py-1 text-xs" />
      </div>
      <div>
        <label className="block text-[11px] text-gray-500 mb-1">Note</label>
        <input type="text" value={userDescription} onChange={(e) => setUserDescription(e.target.value)} placeholder="Brief description..." className="w-full border border-gray-200 rounded px-2 py-1 text-xs" />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-[11px] text-gray-500 mb-1">Date taken</label>
          <input type="date" value={dateTaken} onChange={(e) => setDateTaken(e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1 text-xs" />
        </div>
        <div className="flex-1">
          <label className="block text-[11px] text-gray-500 mb-1">Body area</label>
          <input type="text" value={bodyArea} onChange={(e) => setBodyArea(e.target.value)} placeholder="e.g., Left hip" className="w-full border border-gray-200 rounded px-2 py-1 text-xs" />
        </div>
      </div>
      <button onClick={handleSave} disabled={saving} className="px-3 py-1 text-xs font-semibold text-white rounded disabled:opacity-50" style={{ background: 'var(--color-steel, #4A7FB5)' }}>
        {saved ? 'Saved!' : saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  );
}
