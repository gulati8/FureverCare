import { useState } from 'react';
import { PdfExtractionItem, DocumentExtractionItem, RecordType, DuplicateInfo, MergeAction, FieldDiff } from '../../api/client';
import { ConfidenceBadge } from './ConfidenceBadge';
import { FieldEditor } from './FieldEditor';

interface ExtractionItemCardProps {
  item: PdfExtractionItem | DocumentExtractionItem;
  isSelected: boolean;
  onToggleSelect: () => void;
  onModify: (modifiedData: Record<string, any>) => void;
  /** @deprecated Use duplicateInfo instead */
  duplicateOf?: string;
  duplicateInfo?: DuplicateInfo;
  /** Current merge action for duplicate items */
  mergeAction?: MergeAction;
  /** Callback when user picks a merge action */
  onMergeActionChange?: (action: MergeAction) => void;
  /** Per-field overrides for Phase 4 cherry-pick merge */
  fieldOverrides?: Record<string, 'existing' | 'imported'>;
  /** Callback for Phase 4 per-field override changes */
  onFieldOverrideChange?: (field: string, choice: 'existing' | 'imported') => void;
}

const RECORD_TYPE_CONFIG: Record<RecordType, { label: string; icon: string }> = {
  vaccination: { label: 'Vaccination', icon: '💉' },
  medication: { label: 'Medication', icon: '💊' },
  condition: { label: 'Condition', icon: '🩺' },
  allergy: { label: 'Allergy', icon: '⚠️' },
  vet: { label: 'Veterinarian', icon: '👨‍⚕️' },
  emergency_contact: { label: 'Emergency Contact', icon: '📞' },
};

function getConfidenceColor(score: number | null, isDuplicate: boolean): string {
  if (isDuplicate) return 'bg-amber-50 border-amber-300';
  if (score === null) return 'bg-gray-50 border-gray-200';
  if (score >= 0.8) return 'bg-green-50 border-green-200';
  if (score >= 0.5) return 'bg-yellow-50 border-yellow-200';
  return 'bg-red-50 border-red-200';
}

const SEVERITY_OPTIONS = [
  { value: 'mild', label: 'Mild' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' },
];

const ALLERGY_SEVERITY_OPTIONS = [
  ...SEVERITY_OPTIONS,
  { value: 'life-threatening', label: 'Life-threatening' },
];

function formatFieldValue(value: any): string {
  if (value === null || value === undefined) return '(empty)';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

/** Phase 1: Build change summary text from field diffs */
function buildChangeSummary(fieldDiffs: FieldDiff[]): string {
  if (fieldDiffs.length === 0) return 'No field changes detected.';

  const parts = fieldDiffs.map((diff) => {
    const existing = formatFieldValue(diff.existingValue);
    const imported = formatFieldValue(diff.importedValue);
    if (existing === '(empty)') {
      return `add ${diff.label.toLowerCase()}: ${imported}`;
    }
    return `${diff.label.toLowerCase()}: ${existing} -> ${imported}`;
  });

  return 'Will update ' + parts.join(', ');
}

export function ExtractionItemCard({
  item,
  isSelected,
  onToggleSelect,
  onModify,
  duplicateOf,
  duplicateInfo,
  mergeAction,
  onMergeActionChange,
  fieldOverrides,
  onFieldOverrideChange,
}: ExtractionItemCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showComparison, setShowComparison] = useState(false);

  const config = RECORD_TYPE_CONFIG[item.record_type];
  const currentData = item.user_modified_data || item.extracted_data;
  const isDuplicate = !!(duplicateInfo || duplicateOf);

  const handleFieldChange = (key: string, value: any) => {
    const newData = { ...currentData, [key]: value };
    onModify(newData);
  };

  const isFieldModified = (key: string) => {
    if (!item.user_modified_data) return false;
    return JSON.stringify(item.extracted_data[key]) !== JSON.stringify(item.user_modified_data[key]);
  };

  const renderFields = () => {
    switch (item.record_type) {
      case 'vaccination':
        return (
          <>
            <FieldEditor label="Vaccine Name" value={currentData.name} fieldKey="name" onChange={handleFieldChange} isModified={isFieldModified('name')} />
            <FieldEditor label="Date Administered" value={currentData.administered_date} fieldKey="administered_date" type="date" onChange={handleFieldChange} isModified={isFieldModified('administered_date')} />
            <FieldEditor label="Expiration Date" value={currentData.expiration_date} fieldKey="expiration_date" type="date" onChange={handleFieldChange} isModified={isFieldModified('expiration_date')} />
            <FieldEditor label="Administered By" value={currentData.administered_by} fieldKey="administered_by" onChange={handleFieldChange} isModified={isFieldModified('administered_by')} />
            <FieldEditor label="Lot Number" value={currentData.lot_number} fieldKey="lot_number" onChange={handleFieldChange} isModified={isFieldModified('lot_number')} />
          </>
        );

      case 'medication':
        return (
          <>
            <FieldEditor label="Medication Name" value={currentData.name} fieldKey="name" onChange={handleFieldChange} isModified={isFieldModified('name')} />
            <FieldEditor label="Dosage" value={currentData.dosage} fieldKey="dosage" onChange={handleFieldChange} isModified={isFieldModified('dosage')} />
            <FieldEditor label="Frequency" value={currentData.frequency} fieldKey="frequency" onChange={handleFieldChange} isModified={isFieldModified('frequency')} />
            <FieldEditor label="Start Date" value={currentData.start_date} fieldKey="start_date" type="date" onChange={handleFieldChange} isModified={isFieldModified('start_date')} />
            <FieldEditor label="End Date" value={currentData.end_date} fieldKey="end_date" type="date" onChange={handleFieldChange} isModified={isFieldModified('end_date')} />
            <FieldEditor label="Prescribing Vet" value={currentData.prescribing_vet} fieldKey="prescribing_vet" onChange={handleFieldChange} isModified={isFieldModified('prescribing_vet')} />
            <FieldEditor label="Notes" value={currentData.notes} fieldKey="notes" onChange={handleFieldChange} isModified={isFieldModified('notes')} />
            <FieldEditor label="Active" value={currentData.is_active} fieldKey="is_active" type="boolean" onChange={handleFieldChange} isModified={isFieldModified('is_active')} />
          </>
        );

      case 'condition':
        return (
          <>
            <FieldEditor label="Condition Name" value={currentData.name} fieldKey="name" onChange={handleFieldChange} isModified={isFieldModified('name')} />
            <FieldEditor label="Diagnosed Date" value={currentData.diagnosed_date} fieldKey="diagnosed_date" type="date" onChange={handleFieldChange} isModified={isFieldModified('diagnosed_date')} />
            <FieldEditor label="Severity" value={currentData.severity} fieldKey="severity" type="select" options={SEVERITY_OPTIONS} onChange={handleFieldChange} isModified={isFieldModified('severity')} />
            <FieldEditor label="Notes" value={currentData.notes} fieldKey="notes" onChange={handleFieldChange} isModified={isFieldModified('notes')} />
          </>
        );

      case 'allergy':
        return (
          <>
            <FieldEditor label="Allergen" value={currentData.allergen} fieldKey="allergen" onChange={handleFieldChange} isModified={isFieldModified('allergen')} />
            <FieldEditor label="Reaction" value={currentData.reaction} fieldKey="reaction" onChange={handleFieldChange} isModified={isFieldModified('reaction')} />
            <FieldEditor label="Severity" value={currentData.severity} fieldKey="severity" type="select" options={ALLERGY_SEVERITY_OPTIONS} onChange={handleFieldChange} isModified={isFieldModified('severity')} />
          </>
        );

      case 'vet':
        return (
          <>
            <FieldEditor label="Clinic Name" value={currentData.clinic_name} fieldKey="clinic_name" onChange={handleFieldChange} isModified={isFieldModified('clinic_name')} />
            <FieldEditor label="Vet Name" value={currentData.vet_name} fieldKey="vet_name" onChange={handleFieldChange} isModified={isFieldModified('vet_name')} />
            <FieldEditor label="Phone" value={currentData.phone} fieldKey="phone" onChange={handleFieldChange} isModified={isFieldModified('phone')} />
            <FieldEditor label="Email" value={currentData.email} fieldKey="email" onChange={handleFieldChange} isModified={isFieldModified('email')} />
            <FieldEditor label="Address" value={currentData.address} fieldKey="address" onChange={handleFieldChange} isModified={isFieldModified('address')} />
          </>
        );

      case 'emergency_contact':
        return (
          <>
            <FieldEditor label="Name" value={currentData.name} fieldKey="name" onChange={handleFieldChange} isModified={isFieldModified('name')} />
            <FieldEditor label="Relationship" value={currentData.relationship} fieldKey="relationship" onChange={handleFieldChange} isModified={isFieldModified('relationship')} />
            <FieldEditor label="Phone" value={currentData.phone} fieldKey="phone" onChange={handleFieldChange} isModified={isFieldModified('phone')} />
            <FieldEditor label="Email" value={currentData.email} fieldKey="email" onChange={handleFieldChange} isModified={isFieldModified('email')} />
            <FieldEditor label="Primary Contact" value={currentData.is_primary} fieldKey="is_primary" type="boolean" onChange={handleFieldChange} isModified={isFieldModified('is_primary')} />
          </>
        );

      default:
        return null;
    }
  };

  const getMainValue = () => {
    switch (item.record_type) {
      case 'vaccination':
      case 'medication':
      case 'condition':
        return currentData.name;
      case 'allergy':
        return currentData.allergen;
      case 'vet':
        return currentData.clinic_name;
      case 'emergency_contact':
        return currentData.name;
      default:
        return 'Unknown';
    }
  };

  const statusBadge = () => {
    switch (item.status) {
      case 'approved':
        return <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Approved</span>;
      case 'rejected':
        return <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">Rejected</span>;
      case 'modified':
        return <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Modified</span>;
      default:
        return null;
    }
  };

  const isDisabled = item.status === 'approved' || item.status === 'rejected';
  const cardColor = getConfidenceColor(item.confidence_score, isDuplicate && !isDisabled);

  /** Phase 3: Render side-by-side comparison table */
  const renderComparison = () => {
    if (!duplicateInfo) return null;

    const allFields = [
      { field: 'dosage', label: 'Dosage' },
      { field: 'frequency', label: 'Frequency' },
      { field: 'start_date', label: 'Start Date' },
      { field: 'end_date', label: 'End Date' },
      { field: 'prescribing_vet', label: 'Prescribing Vet' },
      { field: 'notes', label: 'Notes' },
      { field: 'is_active', label: 'Active' },
    ];

    return (
      <div className="mx-3 mb-3">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-amber-200">
              <th className="text-left py-2 px-2 text-gray-600 font-medium w-1/4">Field</th>
              <th className="text-left py-2 px-2 text-gray-600 font-medium w-5/16">Existing</th>
              <th className="text-left py-2 px-2 text-gray-600 font-medium w-5/16">Imported</th>
              {onFieldOverrideChange && mergeAction === 'smart_merge' && (
                <th className="text-center py-2 px-2 text-gray-600 font-medium w-3/16">Keep</th>
              )}
            </tr>
          </thead>
          <tbody>
            {allFields.map(({ field, label }) => {
              const existingVal = duplicateInfo.existingData[field];
              const importedVal = currentData[field];
              const existingStr = formatFieldValue(existingVal);
              const importedStr = formatFieldValue(importedVal);
              const hasChange = existingStr !== importedStr;
              const currentOverride = fieldOverrides?.[field];

              return (
                <tr key={field} className={`border-b border-gray-100 ${hasChange ? 'bg-amber-50/50' : ''}`}>
                  <td className="py-2 px-2 text-gray-700 font-medium">{label}</td>
                  <td className={`py-2 px-2 ${hasChange ? 'text-red-700' : 'text-gray-600'}`}>
                    {existingStr}
                  </td>
                  <td className={`py-2 px-2 ${hasChange ? 'text-green-700 font-medium' : 'text-gray-600'}`}>
                    {importedStr}
                  </td>
                  {/* Phase 4: Per-field radio controls */}
                  {onFieldOverrideChange && mergeAction === 'smart_merge' && hasChange && (
                    <td className="py-2 px-2 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            name={`field-${item.id}-${field}`}
                            checked={currentOverride === 'existing'}
                            onChange={() => onFieldOverrideChange(field, 'existing')}
                            className="text-amber-600 focus:ring-amber-500"
                          />
                          <span className="text-xs text-gray-600">Existing</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            name={`field-${item.id}-${field}`}
                            checked={currentOverride !== 'existing'}
                            onChange={() => onFieldOverrideChange(field, 'imported')}
                            className="text-green-600 focus:ring-green-500"
                          />
                          <span className="text-xs text-gray-600">Imported</span>
                        </label>
                      </div>
                    </td>
                  )}
                  {onFieldOverrideChange && mergeAction === 'smart_merge' && !hasChange && (
                    <td className="py-2 px-2 text-center text-xs text-gray-400">
                      Same
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className={`rounded-lg border ${cardColor} overflow-hidden ${isDisabled ? 'opacity-60' : ''}`}>
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          {/* Non-duplicate items keep the checkbox; duplicate items don't get a checkbox */}
          {!isDisabled && !isDuplicate && (
            <input
              type="checkbox"
              checked={isSelected}
              onClick={(e) => e.stopPropagation()}
              onChange={() => onToggleSelect()}
              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
          )}
          {/* Duplicate badge indicator */}
          {isDuplicate && !isDisabled && (
            <span className="flex-shrink-0 w-4 h-4 rounded bg-amber-400 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01" />
              </svg>
            </span>
          )}
          <span className="text-xl">{config.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 uppercase">{config.label}</span>
              {isDuplicate && !isDisabled && (
                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-medium">Duplicate</span>
              )}
              {statusBadge()}
              {mergeAction && !isDisabled && (
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                  mergeAction === 'smart_merge' ? 'bg-blue-100 text-blue-800' :
                  mergeAction === 'skip' ? 'bg-gray-100 text-gray-700' :
                  'bg-purple-100 text-purple-800'
                }`}>
                  {mergeAction === 'smart_merge' ? 'Merge' :
                   mergeAction === 'skip' ? 'Skip' : 'Create New'}
                </span>
              )}
            </div>
            <p className="font-medium text-gray-900">{getMainValue()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ConfidenceBadge score={item.confidence_score} />
          <svg
            className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Duplicate banner with change summary (Phase 1) */}
      {isDuplicate && !isDisabled && (
        <div className="mx-3 mb-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span>
              Existing medication found: <strong>{duplicateInfo?.existingName || duplicateOf}</strong>
            </span>
          </div>
          {/* Phase 1: Change summary */}
          {duplicateInfo && duplicateInfo.fieldDiffs.length > 0 && (
            <p className="mt-1 ml-6 text-xs text-amber-700">
              {buildChangeSummary(duplicateInfo.fieldDiffs)}
            </p>
          )}
          {duplicateInfo && duplicateInfo.fieldDiffs.length === 0 && (
            <p className="mt-1 ml-6 text-xs text-amber-600">
              No field changes detected - records appear identical.
            </p>
          )}
        </div>
      )}

      {/* Phase 2: Three action buttons for duplicate items */}
      {isDuplicate && !isDisabled && onMergeActionChange && (
        <div className="mx-3 mb-2 flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onMergeActionChange('smart_merge'); }}
            className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              mergeAction === 'smart_merge'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-700'
            }`}
          >
            Approve (Smart Merge)
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onMergeActionChange('skip'); }}
            className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              mergeAction === 'skip'
                ? 'bg-gray-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Skip / Keep Existing
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onMergeActionChange('create_new'); }}
            className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              mergeAction === 'create_new'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-purple-50 hover:text-purple-700'
            }`}
          >
            Create New
          </button>
        </div>
      )}

      {/* Phase 3: Review changes toggle for duplicates */}
      {isDuplicate && !isDisabled && duplicateInfo && (
        <div className="mx-3 mb-2">
          <button
            onClick={(e) => { e.stopPropagation(); setShowComparison(!showComparison); }}
            className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 font-medium"
          >
            <svg
              className={`h-3.5 w-3.5 transition-transform ${showComparison ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {showComparison ? 'Hide comparison' : 'Review changes'}
          </button>
        </div>
      )}

      {/* Phase 3 & 4: Side-by-side comparison with per-field controls */}
      {showComparison && duplicateInfo && renderComparison()}

      {/* Expanded content (field editors for non-duplicates, or duplicates that chose create_new) */}
      {isExpanded && (!isDuplicate || isDisabled || mergeAction === 'create_new') && (
        <div className="px-3 pb-3 bg-white/50">
          {renderFields()}
        </div>
      )}
    </div>
  );
}
