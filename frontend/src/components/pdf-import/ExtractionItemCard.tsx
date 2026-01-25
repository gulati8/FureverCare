import { useState } from 'react';
import { PdfExtractionItem, RecordType } from '../../api/client';
import { ConfidenceBadge } from './ConfidenceBadge';
import { FieldEditor } from './FieldEditor';

interface ExtractionItemCardProps {
  item: PdfExtractionItem;
  isSelected: boolean;
  onToggleSelect: () => void;
  onModify: (modifiedData: Record<string, any>) => void;
}

const RECORD_TYPE_CONFIG: Record<RecordType, { label: string; icon: string }> = {
  vaccination: { label: 'Vaccination', icon: '💉' },
  medication: { label: 'Medication', icon: '💊' },
  condition: { label: 'Condition', icon: '🩺' },
  allergy: { label: 'Allergy', icon: '⚠️' },
  vet: { label: 'Veterinarian', icon: '👨‍⚕️' },
  emergency_contact: { label: 'Emergency Contact', icon: '📞' },
};

// Get card color based on confidence score
function getConfidenceColor(score: number | null): string {
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

export function ExtractionItemCard({
  item,
  isSelected,
  onToggleSelect,
  onModify,
}: ExtractionItemCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const config = RECORD_TYPE_CONFIG[item.record_type];
  const currentData = item.user_modified_data || item.extracted_data;

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
            <FieldEditor label="Primary Vet" value={currentData.is_primary} fieldKey="is_primary" type="boolean" onChange={handleFieldChange} isModified={isFieldModified('is_primary')} />
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
  const cardColor = getConfidenceColor(item.confidence_score);

  return (
    <div className={`rounded-lg border ${cardColor} overflow-hidden ${isDisabled ? 'opacity-60' : ''}`}>
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          {!isDisabled && (
            <input
              type="checkbox"
              checked={isSelected}
              onClick={(e) => e.stopPropagation()}
              onChange={() => onToggleSelect()}
              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
          )}
          <span className="text-xl">{config.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 uppercase">{config.label}</span>
              {statusBadge()}
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

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-3 pb-3 bg-white/50">
          {renderFields()}
        </div>
      )}
    </div>
  );
}
