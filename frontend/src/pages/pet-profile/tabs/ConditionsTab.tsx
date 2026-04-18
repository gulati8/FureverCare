import { useState, SetStateAction } from 'react';
import { petsApi, PetCondition } from '../../../api/client';
import InlineEditForm from '../../../components/InlineEditForm';
import { formatFlexibleDate } from '../../../components/FlexibleDateInput';
import SourceDocumentLink from '../../../components/SourceDocumentLink';
import EmptyState from '../../../components/EmptyState';
import ShowOnCardButton from '../../../components/ShowOnCardButton';
import { useFieldToggle } from '../../../hooks/useFieldToggle';
import { CONDITION_FIELDS } from '../constants';

export default function ConditionsTab({ petId, token, conditions, setConditions, onNavigateToReview }: {
  petId: number;
  token: string;
  conditions: PetCondition[];
  setConditions: (value: SetStateAction<PetCondition[]>) => void;
  onNavigateToReview: (uploadId: number, highlightItemId: number) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [addValues, setAddValues] = useState<Record<string, string | boolean>>({ name: '', diagnosed_date: '', diagnosed_date_precision: 'day', severity: '', notes: '' });

  const handleAdd = async (values: Record<string, string | boolean>) => {
    if (!(values.name as string).trim()) return;
    const condition = await petsApi.addCondition(petId, {
      name: values.name as string,
      severity: (values.severity as string) || null,
      notes: (values.notes as string) || null,
      diagnosed_date: (values.diagnosed_date as string) || null,
      diagnosed_date_precision: (values.diagnosed_date_precision as string as any) || 'day',
      is_active: true,
      show_on_card: false,
    }, token);
    setConditions([condition, ...conditions]);
    setShowForm(false);
    setAddValues({ name: '', diagnosed_date: '', diagnosed_date_precision: 'day', severity: '', notes: '' });
  };

  const handleSaveEdit = async (values: Record<string, string | boolean>) => {
    if (!editingId || !(values.name as string).trim()) return;
    const updated = await petsApi.updateCondition(petId, editingId, {
      name: values.name as string,
      severity: (values.severity as string) || null,
      notes: (values.notes as string) || null,
      diagnosed_date: (values.diagnosed_date as string) || null,
      diagnosed_date_precision: (values.diagnosed_date_precision as string as any) || 'day',
    }, token);
    setConditions(conditions.map(c => c.id === editingId ? updated : c));
    setEditingId(null);
  };

  const handleToggleActive = useFieldToggle(setConditions, (c, val) => petsApi.updateCondition(petId, c.id, { is_active: val }, token), 'is_active');
  const handleToggleShowOnCard = useFieldToggle(setConditions, (c, val) => petsApi.updateCondition(petId, c.id, { show_on_card: val }, token), 'show_on_card');

  const handleDelete = async (id: number) => {
    await petsApi.deleteCondition(petId, id, token);
    setConditions(conditions.filter(c => c.id !== id));
    setDeletingId(null);
  };

  const active = conditions.filter(c => c.is_active);
  const inactive = conditions.filter(c => !c.is_active);

  const renderConditionRow = (c: PetCondition, isInactive?: boolean) => (
    <li key={c.id} className="p-3">
      {editingId === c.id ? (
        <InlineEditForm
          fields={CONDITION_FIELDS}
          values={{ name: c.name, severity: c.severity || '', notes: c.notes || '', diagnosed_date: c.diagnosed_date ? c.diagnosed_date.split('T')[0] : '', diagnosed_date_precision: c.diagnosed_date_precision || 'day' }}
          onSave={handleSaveEdit}
          onCancel={() => setEditingId(null)}
        />
      ) : (
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <p className={`font-medium ${isInactive ? 'line-through' : ''}`}>{c.name}</p>
              {c.show_on_card && (
                <span className="text-[10px] bg-danger-light text-danger px-1.5 py-0.5 rounded font-semibold">ALERT</span>
              )}
            </div>
            <div className="flex gap-2 text-sm text-surface-500">
              {c.severity && <span className="capitalize">{c.severity}</span>}
              {c.diagnosed_date && <span>Diagnosed: {formatFlexibleDate(c.diagnosed_date, c.diagnosed_date_precision)}</span>}
            </div>
            {c.notes && <p className="text-sm text-surface-600 mt-1">{c.notes}</p>}
            <SourceDocumentLink petId={petId} recordType="pet_conditions" recordId={c.id} onNavigateToReview={onNavigateToReview} />
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <ShowOnCardButton active={c.show_on_card} onClick={() => handleToggleShowOnCard(c)} />
            <button onClick={() => setEditingId(c.id)} className="text-navy hover:text-primary-800 text-sm">Edit</button>
            <button onClick={() => handleToggleActive(c)} className={`text-sm ${isInactive ? 'text-navy hover:text-primary-800' : 'text-surface-600 hover:text-navy'}`}>
              {isInactive ? 'Reactivate' : 'Discontinue'}
            </button>
            {deletingId === c.id ? (
              <>
                <span className="text-sm text-surface-500">Sure?</span>
                <button onClick={() => handleDelete(c.id)} className="text-danger hover:text-danger-dark text-sm font-semibold">Yes</button>
                <button onClick={() => setDeletingId(null)} className="text-surface-600 hover:text-navy text-sm">No</button>
              </>
            ) : (
              <button onClick={() => setDeletingId(c.id)} className="text-danger hover:text-danger-dark text-sm">Delete</button>
            )}
          </div>
        </div>
      )}
    </li>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="section-title">Medical Conditions</h3>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">+ Add Condition</button>
      </div>

      {showForm && (
        <InlineEditForm
          fields={CONDITION_FIELDS}
          values={addValues}
          onSave={handleAdd}
          onCancel={() => setShowForm(false)}
          className="mb-4"
        />
      )}

      {active.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-surface-500 mb-2">Active Conditions</h4>
          <ul className="divide-y divide-surface-200 border border-surface-200 rounded-lg">
            {active.map(c => renderConditionRow(c))}
          </ul>
        </div>
      )}

      {inactive.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-surface-500 mb-2">Discontinued Conditions</h4>
          <ul className="divide-y divide-surface-200 border border-surface-200 rounded-lg opacity-60">
            {inactive.map(c => renderConditionRow(c, true))}
          </ul>
        </div>
      )}

      {conditions.length === 0 && (
        <EmptyState title="No medical conditions recorded" compact />
      )}
    </div>
  );
}
