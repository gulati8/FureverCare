import { useState, SetStateAction } from 'react';
import { petsApi, PetAllergy } from '../../../api/client';
import InlineEditForm from '../../../components/InlineEditForm';
import SourceDocumentLink from '../../../components/SourceDocumentLink';
import EmptyState from '../../../components/EmptyState';
import ShowOnCardButton from '../../../components/ShowOnCardButton';
import { useFieldToggle } from '../../../hooks/useFieldToggle';
import { ALLERGY_FIELDS } from '../constants';

export default function AllergiesTab({ petId, token, allergies, setAllergies, onNavigateToReview }: {
  petId: number;
  token: string;
  allergies: PetAllergy[];
  setAllergies: (value: SetStateAction<PetAllergy[]>) => void;
  onNavigateToReview: (uploadId: number, highlightItemId: number) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [addValues, setAddValues] = useState<Record<string, string | boolean>>({ allergen: '', reaction: '', severity: '' });

  const handleAdd = async (values: Record<string, string | boolean>) => {
    if (!(values.allergen as string).trim()) return;
    const severity = (values.severity as string) || null;
    const allergy = await petsApi.addAllergy(petId, { allergen: values.allergen as string, reaction: (values.reaction as string) || null, severity, show_on_card: severity === 'life-threatening' || severity === 'severe' }, token);
    setAllergies([allergy, ...allergies]);
    setShowForm(false);
    setAddValues({ allergen: '', reaction: '', severity: '' });
  };

  const handleSaveEdit = async (values: Record<string, string | boolean>) => {
    if (!editingId || !(values.allergen as string).trim()) return;
    const updated = await petsApi.updateAllergy(petId, editingId, { allergen: values.allergen as string, reaction: (values.reaction as string) || null, severity: (values.severity as string) || null }, token);
    setAllergies(allergies.map(a => a.id === editingId ? updated : a));
    setEditingId(null);
  };

  const handleToggleShowOnCard = useFieldToggle(setAllergies, (a, val) => petsApi.updateAllergy(petId, a.id, { show_on_card: val }, token), 'show_on_card');

  const handleDelete = async (id: number) => {
    await petsApi.deleteAllergy(petId, id, token);
    setAllergies(allergies.filter(a => a.id !== id));
    setDeletingId(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="section-title">Allergies</h3>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">+ Add Allergy</button>
      </div>

      {showForm && (
        <InlineEditForm
          fields={ALLERGY_FIELDS}
          values={addValues}
          onSave={handleAdd}
          onCancel={() => setShowForm(false)}
          className="mb-4"
        />
      )}

      {allergies.length === 0 ? (
        <EmptyState title="No allergies recorded" compact />
      ) : (
        <ul className="divide-y">
          {allergies.map(a => (
            <li key={a.id} className="py-3">
              {editingId === a.id ? (
                <InlineEditForm
                  fields={ALLERGY_FIELDS}
                  values={{ allergen: a.allergen, reaction: a.reaction || '', severity: a.severity || '' }}
                  onSave={handleSaveEdit}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{a.allergen}</p>
                      {a.show_on_card && (
                        <span className="text-[10px] bg-danger-light text-danger px-1.5 py-0.5 rounded font-semibold">ALERT</span>
                      )}
                    </div>
                    {a.severity && <span className={`text-sm capitalize ${a.severity === 'life-threatening' ? 'text-danger font-semibold' : 'text-surface-500'}`}>{a.severity}</span>}
                    {a.reaction && <p className="text-sm text-surface-600 mt-1">Reaction: {a.reaction}</p>}
                    <SourceDocumentLink petId={petId} recordType="pet_allergies" recordId={a.id} onNavigateToReview={onNavigateToReview} />
                  </div>
                  <div className="flex gap-2">
                    <ShowOnCardButton active={a.show_on_card} onClick={() => handleToggleShowOnCard(a)} />
                    <button onClick={() => setEditingId(a.id)} className="text-navy hover:text-primary-800 text-sm">Edit</button>
                    {deletingId === a.id ? (
                      <>
                        <span className="text-sm text-surface-500">Sure?</span>
                        <button onClick={() => handleDelete(a.id)} className="text-danger hover:text-danger-dark text-sm font-semibold">Yes</button>
                        <button onClick={() => setDeletingId(null)} className="text-surface-600 hover:text-navy text-sm">No</button>
                      </>
                    ) : (
                      <button onClick={() => setDeletingId(a.id)} className="text-danger hover:text-danger-dark text-sm">Delete</button>
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
