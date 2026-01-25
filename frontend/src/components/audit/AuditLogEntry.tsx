import { AuditLogEntry as AuditLogEntryType } from '../../api/client';

interface AuditLogEntryProps {
  entry: AuditLogEntryType;
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  pets: 'Pet',
  pet_vaccinations: 'Vaccination',
  pet_medications: 'Medication',
  pet_conditions: 'Condition',
  pet_allergies: 'Allergy',
  pet_vets: 'Veterinarian',
  pet_emergency_contacts: 'Emergency Contact',
};

const ACTION_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  create: {
    label: 'Added',
    color: 'text-green-600 bg-green-50',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    ),
  },
  update: {
    label: 'Updated',
    color: 'text-blue-600 bg-blue-50',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  delete: {
    label: 'Removed',
    color: 'text-red-600 bg-red-50',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    ),
  },
};

export function AuditLogEntry({ entry }: AuditLogEntryProps) {
  const entityLabel = ENTITY_TYPE_LABELS[entry.entity_type] || entry.entity_type;
  const actionConfig = ACTION_CONFIG[entry.action] || ACTION_CONFIG.update;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRecordName = () => {
    const values = entry.new_values || entry.old_values;
    if (!values) return null;

    // Try common name fields
    return values.name || values.clinic_name || values.allergen || null;
  };

  const recordName = getRecordName();

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const renderChanges = () => {
    if (entry.action === 'create' && entry.new_values) {
      return (
        <div className="mt-2 text-xs text-gray-500">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {Object.entries(entry.new_values)
              .filter(([key]) => !['id', 'pet_id', 'created_at', 'updated_at'].includes(key))
              .slice(0, 6)
              .map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span>
                  <span className="text-gray-700">{formatValue(value)}</span>
                </div>
              ))}
          </div>
        </div>
      );
    }

    if (entry.action === 'update' && entry.changed_fields && entry.old_values && entry.new_values) {
      return (
        <div className="mt-2 text-xs space-y-1">
          {entry.changed_fields.map((field) => (
            <div key={field} className="flex items-center gap-2">
              <span className="font-medium text-gray-500 capitalize">{field.replace(/_/g, ' ')}:</span>
              <span className="text-red-500 line-through">{formatValue(entry.old_values![field])}</span>
              <span className="text-gray-400">→</span>
              <span className="text-green-600">{formatValue(entry.new_values![field])}</span>
            </div>
          ))}
        </div>
      );
    }

    if (entry.action === 'delete' && entry.old_values) {
      return (
        <div className="mt-2 text-xs text-gray-500">
          <span className="text-red-500">Deleted record</span>
          {recordName && <span>: {recordName}</span>}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="py-4 border-b border-gray-100 last:border-0">
      <div className="flex items-start gap-3">
        {/* Action icon */}
        <div className={`p-2 rounded-full ${actionConfig.color}`}>
          {actionConfig.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-medium ${actionConfig.color.split(' ')[0]}`}>
              {actionConfig.label}
            </span>
            <span className="text-gray-900">{entityLabel}</span>
            {recordName && (
              <span className="text-gray-500">"{recordName}"</span>
            )}
            {entry.source === 'pdf_import' && (
              <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                PDF Import
              </span>
            )}
          </div>

          <div className="mt-1 text-xs text-gray-500 flex items-center gap-2">
            <span>{formatDate(entry.created_at)}</span>
            {entry.changed_by_name && (
              <>
                <span>•</span>
                <span>by {entry.changed_by_name}</span>
              </>
            )}
          </div>

          {renderChanges()}
        </div>
      </div>
    </div>
  );
}
