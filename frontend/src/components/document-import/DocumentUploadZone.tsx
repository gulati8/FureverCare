import { useState, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { documentsApi } from '../../api/client';
import { compressImage } from '../../utils/compress-image';

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
  const [pendingPdfs, setPendingPdfs] = useState<File[]>([]); // PDFs that will upload alongside grouped images
  const [groupMode, setGroupMode] = useState<'one' | 'separate'>('one');
  const groupNameRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Memoize preview URLs to avoid re-creating on every render
  const previewUrls = useMemo(() => {
    if (!pendingFiles) return [];
    return pendingFiles.map(f => URL.createObjectURL(f));
  }, [pendingFiles]);

  const movePage = (fromIdx: number, toIdx: number) => {
    if (!pendingFiles || toIdx < 0 || toIdx >= pendingFiles.length) return;
    const reordered = [...pendingFiles];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    setPendingFiles(reordered);
  };

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
    } else if (imageFiles.length >= 1) {
      // Multiple images, or images + PDFs — show grouping dialog
      // Stash PDFs to upload alongside when user confirms
      setPendingFiles(imageFiles);
      setPendingPdfs(pdfFiles);
      setGroupMode(imageFiles.length > 1 ? 'one' : 'separate');
      const firstName = imageFiles[0].name.replace(/\.[^/.]+$/, '');
      setTimeout(() => { if (groupNameRef.current) groupNameRef.current.value = firstName; }, 0);
    }
  };

  const handleGroupConfirm = () => {
    if (!pendingFiles) return;

    // Collect all files to upload: images (grouped or separate) + any stashed PDFs
    const allFiles: File[] = [];
    const allOpts: (undefined | { documentGroupId: string; pageNumber: number; groupName: string })[] = [];

    if (groupMode === 'one' && pendingFiles.length > 1) {
      const groupId = generateGroupId();
      const name = groupNameRef.current?.value?.trim() || pendingFiles[0].name;
      for (let i = 0; i < pendingFiles.length; i++) {
        allFiles.push(pendingFiles[i]);
        allOpts.push({ documentGroupId: groupId, pageNumber: i + 1, groupName: name });
      }
    } else {
      for (const file of pendingFiles) {
        allFiles.push(file);
        allOpts.push(undefined);
      }
    }

    // Add stashed PDFs as separate documents
    for (const pdf of pendingPdfs) {
      allFiles.push(pdf);
      allOpts.push(undefined);
    }

    uploadFilesWithOpts(allFiles, allOpts);
    setPendingFiles(null);
    setPendingPdfs([]);
  };

  const handleGroupCancel = () => {
    setPendingFiles(null);
    setPendingPdfs([]);
  };

  const uploadFiles = async (files: File[], groupOptions?: { documentGroupId: string; groupName: string }) => {
    const opts = files.map((_, i) =>
      groupOptions ? { documentGroupId: groupOptions.documentGroupId, pageNumber: i + 1, groupName: groupOptions.groupName } : undefined
    );
    return uploadFilesWithOpts(files, opts);
  };

  const uploadFilesWithOpts = async (
    files: File[],
    perFileOpts: (undefined | { documentGroupId: string; pageNumber: number; groupName: string })[]
  ) => {
    if (!token) return;

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    const total = files.length;
    let completed = 0;
    let hasGrouped = false;

    try {
      for (let i = 0; i < files.length; i++) {
        const compressed = await compressImage(files[i]);
        const opts = perFileOpts[i];
        if (opts) hasGrouped = true;

        await documentsApi.upload(petId, compressed, token, opts);
        completed++;
        setUploadProgress(Math.round((completed / total) * 100));
      }

      onUploadComplete({ count: files.length, grouped: hasGrouped });
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
        <div className="bg-white border border-surface-200 rounded-lg p-5 shadow-sm">
          <p className="font-medium text-navy mb-3">
            {pendingFiles.length + pendingPdfs.length} files selected
          </p>

          {/* PDF info banner */}
          {pendingPdfs.length > 0 && (
            <div className="mb-4 bg-surface border border-surface-200 rounded-md px-3 py-2.5 flex items-start gap-2.5">
              <svg className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 2h8l6 6v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z"/>
              </svg>
              <div>
                <p className="text-sm text-surface-700">
                  {pendingPdfs.length === 1
                    ? <><span className="font-medium">{pendingPdfs[0].name}</span> will upload as a separate document.</>
                    : <><span className="font-medium">{pendingPdfs.length} PDFs</span> will each upload as separate documents.</>
                  }
                </p>
              </div>
            </div>
          )}

          {/* Image grouping options */}
          {pendingFiles.length > 1 && <p className="text-xs text-surface-500 mb-2">{pendingFiles.length} images:</p>}

          {/* Radio options (only when 2+ images — 1 image doesn't need grouping choice) */}
          {pendingFiles.length > 1 && (
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
                  <p className="text-sm font-medium text-navy">
                    Upload as one document ({pendingFiles.length} pages)
                  </p>
                  <p className="text-xs text-surface-500">
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
                  <p className="text-sm font-medium text-navy">
                    Upload as {pendingFiles.length} separate documents
                  </p>
                  <p className="text-xs text-surface-500">
                    Each file is its own document.
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Page order & name (only when grouping as one document) */}
          {groupMode === 'one' && (
            <>
              <div className="mb-4">
                <label className="block text-sm text-surface-700 mb-1">Document name</label>
                <input
                  type="text"
                  ref={groupNameRef}
                  placeholder="e.g., Wednesday ER Visit Notes"
                  className="w-full border border-surface-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  maxLength={255}
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm text-surface-700 mb-2">Page order</label>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {pendingFiles.map((file, idx) => (
                    <div key={previewUrls[idx]} className="flex-shrink-0 flex flex-col items-center" style={{ width: '88px' }}>
                      <div className="relative w-20 h-20 rounded-md overflow-hidden bg-surface-100 border border-surface-200">
                        <img
                          src={previewUrls[idx]}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-0.5 left-0.5 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                          {idx + 1}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <button
                          type="button"
                          onClick={() => movePage(idx, idx - 1)}
                          disabled={idx === 0}
                          className="p-0.5 rounded text-surface-400 hover:text-surface-700 hover:bg-surface-100 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-surface-400"
                          title="Move left"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <span className="text-[10px] text-surface-400 tabular-nums">{idx + 1}/{pendingFiles.length}</span>
                        <button
                          type="button"
                          onClick={() => movePage(idx, idx + 1)}
                          disabled={idx === pendingFiles.length - 1}
                          className="p-0.5 rounded text-surface-400 hover:text-surface-700 hover:bg-surface-100 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-surface-400"
                          title="Move right"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Static thumbnails when uploading as separate documents */}
          {groupMode === 'separate' && (
            <div className="flex flex-wrap gap-2 mb-4">
              {pendingFiles.slice(0, 8).map((file, i) => (
                <div key={i} className="w-12 h-12 rounded bg-surface-100 flex items-center justify-center text-xs text-surface-500 overflow-hidden">
                  <img
                    src={previewUrls[i]}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
              {pendingFiles.length > 8 && (
                <div className="w-12 h-12 rounded bg-surface-100 flex items-center justify-center text-xs text-surface-500">
                  +{pendingFiles.length - 8}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={handleGroupCancel}
              className="px-4 py-2 text-sm text-surface-700 bg-white border border-surface-300 rounded-md hover:bg-surface"
            >
              Cancel
            </button>
            <button
              onClick={handleGroupConfirm}
              className="px-4 py-2 text-sm text-white bg-info rounded-md hover:bg-info"
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
            ${isDragOver ? 'border-info bg-info-light' : 'border-surface-300 hover:border-surface-400'}
            ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          {isUploading ? (
            <div className="flex flex-col items-center">
              <svg className="animate-spin h-10 w-10 text-info mb-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-surface-600">Uploading...</p>
              <div className="w-48 h-2 bg-surface-200 rounded-full mt-2">
                <div
                  className="h-full bg-info rounded-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <svg className="mx-auto h-12 w-12 text-surface-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m0 0v4a4 4 0 004 4h24a4 4 0 004-4V24M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4-4m4-12h8m-4-4v8"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="mt-2 text-sm text-surface-600">
                <label className={`text-info hover:text-info ${isDisabled ? '' : 'cursor-pointer'}`}>
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
              <p className="mt-1 text-xs text-surface-500">
                PDFs and images (JPEG, PNG, WebP, GIF, HEIC, TIFF, BMP) — images are compressed automatically
              </p>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="bg-danger-light border border-danger-light rounded-md p-3">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}
    </div>
  );
}
