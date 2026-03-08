import { useState, useEffect } from 'react';
import { petsApi } from '../api/client';

interface SourceDocumentLinkProps {
  petId: number;
  recordType: string;
  recordId: number;
  onNavigateToDocuments?: () => void;
}

export default function SourceDocumentLink({ petId, recordType, recordId, onNavigateToDocuments }: SourceDocumentLinkProps) {
  const [source, setSource] = useState<{ source: string; upload_id: number | null; filename: string | null } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('furevercare_token');
    if (!token) return;

    petsApi.getRecordSource(petId, recordType, recordId, token)
      .then(setSource)
      .catch(() => {
        // Silently fail — show nothing if source lookup fails
      });
  }, [petId, recordType, recordId]);

  if (!source || source.source === 'manual' || !source.upload_id) {
    return null;
  }

  const filename = source.filename || 'document';

  return (
    <button
      type="button"
      onClick={() => onNavigateToDocuments?.()}
      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline mt-0.5"
      title={`Imported from ${filename}`}
    >
      <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
      <span className="truncate max-w-[180px]">Imported from {filename}</span>
    </button>
  );
}
