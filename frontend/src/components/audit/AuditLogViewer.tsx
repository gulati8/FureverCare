import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { auditApi, AuditLogEntry as AuditLogEntryType } from '../../api/client';
import { AuditLogEntry } from './AuditLogEntry';

interface AuditLogViewerProps {
  petId: number;
}

const ENTITY_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'pets', label: 'Pet Profile' },
  { value: 'pet_vaccinations', label: 'Vaccinations' },
  { value: 'pet_medications', label: 'Medications' },
  { value: 'pet_conditions', label: 'Conditions' },
  { value: 'pet_allergies', label: 'Allergies' },
  { value: 'pet_vets', label: 'Veterinarians' },
  { value: 'pet_emergency_contacts', label: 'Emergency Contacts' },
];

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'create', label: 'Added' },
  { value: 'update', label: 'Updated' },
  { value: 'delete', label: 'Removed' },
];

export function AuditLogViewer({ petId }: AuditLogViewerProps) {
  const { token } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntryType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  // Filters
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');

  const LIMIT = 20;

  useEffect(() => {
    loadLogs(true);
  }, [petId, entityType, action]);

  const loadLogs = async (reset = false) => {
    if (!token) return;

    setIsLoading(true);
    setError(null);

    const newOffset = reset ? 0 : offset;

    try {
      const response = await auditApi.getAuditLog(petId, token, {
        limit: LIMIT,
        offset: newOffset,
        entityType: entityType || undefined,
        action: action || undefined,
      });

      if (reset) {
        setLogs(response.logs);
      } else {
        setLogs((prev) => [...prev, ...response.logs]);
      }

      setTotal(response.pagination.total);
      setHasMore(response.pagination.hasMore);
      setOffset(newOffset + response.logs.length);
    } catch (err: any) {
      setError(err.message || 'Failed to load audit log');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMore = () => {
    loadLogs(false);
  };

  if (error && logs.length === 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Record Type</label>
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className="block w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
          >
            {ENTITY_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Action</label>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="block w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
          >
            {ACTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1" />

        <div className="text-sm text-gray-500">
          {total} total {total === 1 ? 'entry' : 'entries'}
        </div>
      </div>

      {/* Log entries */}
      {isLoading && logs.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <svg className="animate-spin h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="mt-2">No changes recorded yet</p>
          <p className="text-sm mt-1">Changes to your pet's records will appear here</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {logs.map((entry) => (
            <AuditLogEntry key={entry.id} entry={entry} />
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="text-center">
          <button
            onClick={loadMore}
            disabled={isLoading}
            className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
