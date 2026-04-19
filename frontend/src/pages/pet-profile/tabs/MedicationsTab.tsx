import { useState, SetStateAction } from 'react';
import { petsApi, PetMedication } from '../../../api/client';
import InlineEditForm from '../../../components/InlineEditForm';
import { formatFlexibleDate } from '../../../components/FlexibleDateInput';
import SourceDocumentLink from '../../../components/SourceDocumentLink';
import EmptyState from '../../../components/EmptyState';
import ShowOnCardButton from '../../../components/ShowOnCardButton';
import { useFieldToggle } from '../../../hooks/useFieldToggle';
import { getMedicationFields, getMedicationReminderSummary } from '../constants';

export default function MedicationsTab({ petId, token, medications, setMedications, onNavigateToReview }: {
  petId: number;
  token: string;
  medications: PetMedication[];
  setMedications: (value: SetStateAction<PetMedication[]>) => void;
  onNavigateToReview: (uploadId: number, highlightItemId: number) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addValues, setAddValues] = useState<Record<string, string | boolean>>({
    name: '',
    dosage: '',
    frequency: '',
    start_date: '',
    start_date_precision: 'day',
    reminder_enabled: false,
    reminder_next_due_date: '',
    reminder_lead_time_value: '',
    reminder_lead_time_unit: 'days',
    reminder_recurrence_value: '',
    reminder_recurrence_unit: 'months',
  });

  const buildMedicationPayload = (
    values: Record<string, string | boolean>,
    current?: PetMedication
  ) => {
    const reminderEnabled = values.reminder_enabled === true;
    const reminderChannel: 'email' | null = reminderEnabled ? 'email' : null;

    return {
      name: values.name as string,
      dosage: (values.dosage as string) || null,
      frequency: (values.frequency as string) || null,
      start_date: (values.start_date as string) || null,
      start_date_precision: (values.start_date_precision as string as any) || 'day',
      end_date: current?.end_date || null,
      end_date_precision: current?.end_date_precision || 'day',
      prescribing_vet: current?.prescribing_vet || null,
      notes: current?.notes || null,
      is_active: current?.is_active ?? true,
      show_on_card: current?.show_on_card ?? false,
      reminder_enabled: reminderEnabled,
      reminder_channel: reminderChannel,
      reminder_lead_time_value:
        reminderEnabled && values.reminder_lead_time_value
          ? Number(values.reminder_lead_time_value)
          : null,
      reminder_lead_time_unit:
        reminderEnabled && values.reminder_lead_time_unit
          ? (values.reminder_lead_time_unit as 'days' | 'weeks')
          : null,
      reminder_next_due_date:
        reminderEnabled && values.reminder_next_due_date
          ? (values.reminder_next_due_date as string)
          : null,
      reminder_recurrence_value:
        reminderEnabled && values.reminder_recurrence_value
          ? Number(values.reminder_recurrence_value)
          : null,
      reminder_recurrence_unit:
        reminderEnabled && values.reminder_recurrence_unit
          ? (values.reminder_recurrence_unit as 'months' | 'years')
          : null,
    };
  };

  const handleAdd = async (values: Record<string, string | boolean>) => {
    if (!(values.name as string).trim()) return;
    try {
      setError(null);
      const med = await petsApi.addMedication(
        petId,
        buildMedicationPayload(values),
        token
      );
      setMedications([med, ...medications]);
      setShowForm(false);
      setAddValues({
        name: '',
        dosage: '',
        frequency: '',
        start_date: '',
        start_date_precision: 'day',
        reminder_enabled: false,
        reminder_next_due_date: '',
        reminder_lead_time_value: '',
        reminder_lead_time_unit: 'days',
        reminder_recurrence_value: '',
        reminder_recurrence_unit: 'months',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save medication');
    }
  };

  const handleSaveEdit = async (values: Record<string, string | boolean>) => {
    if (!editingId || !(values.name as string).trim()) return;
    try {
      setError(null);
      const updated = await petsApi.updateMedication(
        petId,
        editingId,
        buildMedicationPayload(
          values,
          medications.find((medication) => medication.id === editingId)
        ),
        token
      );
      setMedications(medications.map(m => m.id === editingId ? updated : m));
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update medication');
    }
  };

  const handleToggleActive = useFieldToggle(setMedications, (m, val) => petsApi.updateMedication(petId, m.id, { is_active: val }, token), 'is_active');
  const handleToggleShowOnCard = useFieldToggle(setMedications, (m, val) => petsApi.updateMedication(petId, m.id, { show_on_card: val }, token), 'show_on_card');

  const handleDelete = async (id: number) => {
    await petsApi.deleteMedication(petId, id, token);
    setMedications(medications.filter(m => m.id !== id));
    setDeletingId(null);
  };

  const active = medications.filter(m => m.is_active);
  const inactive = medications.filter(m => !m.is_active);

  const renderMedRow = (m: PetMedication, isInactive?: boolean) => (
    <li key={m.id} className="p-3">
      {editingId === m.id ? (
        <InlineEditForm
          fields={getMedicationFields}
          values={{
            name: m.name,
            dosage: m.dosage || '',
            frequency: m.frequency || '',
            start_date: m.start_date ? m.start_date.split('T')[0] : '',
            start_date_precision: m.start_date_precision || 'day',
            reminder_enabled: m.reminder_enabled,
            reminder_next_due_date: m.reminder_next_due_date ? m.reminder_next_due_date.split('T')[0] : '',
            reminder_lead_time_value: m.reminder_lead_time_value?.toString() || '',
            reminder_lead_time_unit: m.reminder_lead_time_unit || 'days',
            reminder_recurrence_value: m.reminder_recurrence_value?.toString() || '',
            reminder_recurrence_unit: m.reminder_recurrence_unit || 'months',
          }}
          onSave={handleSaveEdit}
          onCancel={() => setEditingId(null)}
        />
      ) : (
        <div className="flex justify-between items-start gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className={`font-medium ${isInactive ? 'line-through' : ''}`}>{m.name}</p>
              {m.show_on_card && (
                <span className="text-[10px] bg-danger-light text-danger px-1.5 py-0.5 rounded font-semibold">ALERT</span>
              )}
            </div>
            {m.dosage && <span className="text-sm text-surface-500">{m.dosage}</span>}
            {m.frequency && <span className="text-sm text-surface-500"> - {m.frequency}</span>}
            {m.start_date && <p className="text-sm text-surface-500">Started: {formatFlexibleDate(m.start_date, m.start_date_precision)}</p>}
            {getMedicationReminderSummary(m) && (
              <p className="text-sm text-surface-500">{getMedicationReminderSummary(m)}</p>
            )}
            <SourceDocumentLink petId={petId} recordType="pet_medications" recordId={m.id} onNavigateToReview={onNavigateToReview} />
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
            <ShowOnCardButton active={m.show_on_card} onClick={() => handleToggleShowOnCard(m)} />
            <button onClick={() => setEditingId(m.id)} className="text-navy hover:text-primary-800 text-sm">Edit</button>
            <button onClick={() => handleToggleActive(m)} className={`text-sm ${isInactive ? 'text-navy hover:text-primary-800' : 'text-surface-600 hover:text-navy'}`}>
              {isInactive ? 'Reactivate' : 'Discontinue'}
            </button>
            {deletingId === m.id ? (
              <>
                <span className="text-sm text-surface-500">Sure?</span>
                <button onClick={() => handleDelete(m.id)} className="text-danger hover:text-danger-dark text-sm font-semibold">Yes</button>
                <button onClick={() => setDeletingId(null)} className="text-surface-600 hover:text-navy text-sm">No</button>
              </>
            ) : (
              <button onClick={() => setDeletingId(m.id)} className="text-danger hover:text-danger-dark text-sm">Delete</button>
            )}
          </div>
        </div>
      )}
    </li>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="section-title">Medications</h3>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">+ Add Medication</button>
      </div>

      {error && (
        <div className="mb-4 bg-danger-light border border-danger/20 text-danger px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {showForm && (
        <InlineEditForm
          fields={getMedicationFields}
          values={addValues}
          onSave={handleAdd}
          onCancel={() => setShowForm(false)}
          className="mb-4"
        />
      )}

      {active.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-surface-500 mb-2">Active Medications</h4>
          <ul className="divide-y border rounded-lg">
            {active.map(m => renderMedRow(m))}
          </ul>
        </div>
      )}

      {inactive.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-surface-500 mb-2">Past Medications</h4>
          <ul className="divide-y border rounded-lg opacity-60">
            {inactive.map(m => renderMedRow(m, true))}
          </ul>
        </div>
      )}

      {medications.length === 0 && (
        <EmptyState title="No medications recorded" compact />
      )}
    </div>
  );
}
