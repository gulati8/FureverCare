import { useState, SetStateAction } from 'react';
import { petsApi, PetVaccination } from '../../../api/client';
import InlineEditForm from '../../../components/InlineEditForm';
import { formatFlexibleDate } from '../../../components/FlexibleDateInput';
import SourceDocumentLink from '../../../components/SourceDocumentLink';
import EmptyState from '../../../components/EmptyState';
import ShowOnCardButton from '../../../components/ShowOnCardButton';
import { useFieldToggle } from '../../../hooks/useFieldToggle';
import {
  getVaccinationFields,
  getVaccinationReminderSummary,
} from '../constants';

export default function VaccinationsTab({ petId, token, vaccinations, setVaccinations, onNavigateToReview }: {
  petId: number;
  token: string;
  vaccinations: PetVaccination[];
  setVaccinations: (value: SetStateAction<PetVaccination[]>) => void;
  onNavigateToReview: (uploadId: number, highlightItemId: number) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addValues, setAddValues] = useState<Record<string, string | boolean>>({
    name: '',
    administered_date: '',
    administered_date_precision: 'day',
    expiration_date: '',
    expiration_date_precision: 'day',
    reminder_enabled: false,
    reminder_lead_time_value: '',
    reminder_lead_time_unit: 'days',
  });

  const toDateInput = (d: string | null) => d ? d.split('T')[0] : '';

  const buildVaccinationPayload = (
    values: Record<string, string | boolean>,
    current?: PetVaccination
  ) => {
    const reminderEnabled = values.reminder_enabled === true;
    const reminderChannel: 'email' | null = reminderEnabled ? 'email' : null;

    return {
      name: values.name as string,
      administered_date: values.administered_date as string,
      administered_date_precision: (values.administered_date_precision as string as any) || 'day',
      expiration_date: (values.expiration_date as string) || null,
      expiration_date_precision: (values.expiration_date_precision as string as any) || 'day',
      administered_by: current?.administered_by || null,
      lot_number: current?.lot_number || null,
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
      reminder_next_due_date: null,
      reminder_recurrence_value: null,
      reminder_recurrence_unit: null,
    };
  };

  const handleToggleShowOnCard = useFieldToggle(setVaccinations, (v, val) => petsApi.updateVaccination(petId, v.id, { show_on_card: val }, token), 'show_on_card');

  const handleAdd = async (values: Record<string, string | boolean>) => {
    if (!(values.name as string).trim() || !values.administered_date) return;

    try {
      setError(null);
      const vac = await petsApi.addVaccination(
        petId,
        buildVaccinationPayload(values),
        token
      );
      setVaccinations([vac, ...vaccinations]);
      setShowForm(false);
      setAddValues({
        name: '',
        administered_date: '',
        administered_date_precision: 'day',
        expiration_date: '',
        expiration_date_precision: 'day',
        reminder_enabled: false,
        reminder_lead_time_value: '',
        reminder_lead_time_unit: 'days',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save vaccination');
    }
  };

  const handleSaveEdit = async (values: Record<string, string | boolean>) => {
    if (!editingId || !(values.name as string).trim() || !values.administered_date) return;

    try {
      setError(null);
      const updated = await petsApi.updateVaccination(
        petId,
        editingId,
        buildVaccinationPayload(
          values,
          vaccinations.find((vaccination) => vaccination.id === editingId)
        ),
        token
      );
      setVaccinations(vaccinations.map(v => v.id === editingId ? updated : v));
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update vaccination');
    }
  };

  const handleDelete = async (id: number) => {
    await petsApi.deleteVaccination(petId, id, token);
    setVaccinations(vaccinations.filter(v => v.id !== id));
    setDeletingId(null);
  };

  const isExpired = (expDate: string | null) => {
    if (!expDate) return false;
    return new Date(expDate) < new Date();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="section-title">Vaccinations</h3>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">+ Add Vaccination</button>
      </div>

      {error && (
        <div className="mb-4 bg-danger-light border border-danger/20 text-danger px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {showForm && (
        <InlineEditForm
          fields={getVaccinationFields}
          values={addValues}
          onSave={handleAdd}
          onCancel={() => setShowForm(false)}
          className="mb-4"
        />
      )}

      {vaccinations.length === 0 ? (
        <EmptyState title="No vaccinations recorded" compact />
      ) : (
        <ul className="divide-y">
          {vaccinations.map(v => (
            <li key={v.id} className="py-3">
              {editingId === v.id ? (
                <InlineEditForm
                  fields={getVaccinationFields}
                  values={{
                    name: v.name,
                    administered_date: toDateInput(v.administered_date),
                    administered_date_precision: v.administered_date_precision || 'day',
                    expiration_date: toDateInput(v.expiration_date),
                    expiration_date_precision: v.expiration_date_precision || 'day',
                    reminder_enabled: v.reminder_enabled,
                    reminder_lead_time_value: v.reminder_lead_time_value?.toString() || '',
                    reminder_lead_time_unit: v.reminder_lead_time_unit || 'days',
                  }}
                  onSave={handleSaveEdit}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{v.name}</p>
                      {v.show_on_card && (
                        <span className="text-[10px] bg-danger-light text-danger px-1.5 py-0.5 rounded font-semibold">ALERT</span>
                      )}
                    </div>
                    <p className="text-sm text-surface-500">
                      Administered: {formatFlexibleDate(v.administered_date, v.administered_date_precision)}
                    </p>
                    {v.expiration_date && (
                      <p className={`text-sm ${isExpired(v.expiration_date) ? 'text-danger' : 'text-surface-500'}`}>
                        {isExpired(v.expiration_date) ? 'Expired' : 'Expires'}: {formatFlexibleDate(v.expiration_date, v.expiration_date_precision)}
                      </p>
                    )}
                    {getVaccinationReminderSummary(v) && (
                      <p className="text-sm text-surface-500">{getVaccinationReminderSummary(v)}</p>
                    )}
                    <SourceDocumentLink petId={petId} recordType="pet_vaccinations" recordId={v.id} onNavigateToReview={onNavigateToReview} />
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
                    <ShowOnCardButton active={v.show_on_card} onClick={() => handleToggleShowOnCard(v)} />
                    <button onClick={() => setEditingId(v.id)} className="text-navy hover:text-primary-800 text-sm">Edit</button>
                    {deletingId === v.id ? (
                      <>
                        <span className="text-sm text-surface-500">Sure?</span>
                        <button onClick={() => handleDelete(v.id)} className="text-danger hover:text-danger-dark text-sm font-semibold">Yes</button>
                        <button onClick={() => setDeletingId(null)} className="text-surface-600 hover:text-navy text-sm">No</button>
                      </>
                    ) : (
                      <button onClick={() => setDeletingId(v.id)} className="text-danger hover:text-danger-dark text-sm">Delete</button>
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
