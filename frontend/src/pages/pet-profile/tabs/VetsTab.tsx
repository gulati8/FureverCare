import { useState } from 'react';
import { petsApi, PetVet } from '../../../api/client';
import InlineEditForm from '../../../components/InlineEditForm';
import { VET_FIELDS } from '../constants';

export default function VetsTab({ petId, token, vets, setVets }: {
  petId: number;
  token: string;
  vets: PetVet[];
  setVets: (v: PetVet[]) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [addValues, setAddValues] = useState<Record<string, string | boolean>>({ clinic_name: '', vet_name: '', phone: '' });

  const handleAdd = async (values: Record<string, string | boolean>) => {
    if (!(values.clinic_name as string).trim()) return;
    const vet = await petsApi.addVet(petId, {
      clinic_name: values.clinic_name as string, vet_name: (values.vet_name as string) || null,
      phone: (values.phone as string) || null, email: null, address: null, is_primary: vets.length === 0
    }, token);
    setVets([vet, ...vets]);
    setShowForm(false);
    setAddValues({ clinic_name: '', vet_name: '', phone: '' });
  };

  const handleSaveEdit = async (values: Record<string, string | boolean>) => {
    if (!editingId || !(values.clinic_name as string).trim()) return;
    const updated = await petsApi.updateVet(petId, editingId, { clinic_name: values.clinic_name as string, vet_name: (values.vet_name as string) || null, phone: (values.phone as string) || null }, token);
    setVets(vets.map(v => v.id === editingId ? updated : v));
    setEditingId(null);
  };

  const handleDelete = async (id: number) => {
    await petsApi.deleteVet(petId, id, token);
    setVets(vets.filter(v => v.id !== id));
    setDeletingId(null);
  };

  const handleSetPrimary = async (vetId: number) => {
    await petsApi.setPrimaryVet(petId, vetId, token);
    setVets(vets.map(v => ({ ...v, is_primary: v.id === vetId })));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Veterinarians</h3>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">+ Add Vet</button>
      </div>

      {showForm && (
        <InlineEditForm
          fields={VET_FIELDS}
          values={addValues}
          onSave={handleAdd}
          onCancel={() => setShowForm(false)}
          className="mb-4"
        />
      )}

      {vets.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No veterinarians recorded</p>
      ) : (
        <ul className="divide-y">
          {vets.map(v => (
            <li key={v.id} className="py-3">
              {editingId === v.id ? (
                <InlineEditForm
                  fields={VET_FIELDS}
                  values={{ clinic_name: v.clinic_name, vet_name: v.vet_name || '', phone: v.phone || '' }}
                  onSave={handleSaveEdit}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{v.clinic_name} {v.is_primary && <span className="text-xs bg-navy-50 text-primary-700 px-2 py-0.5 rounded">Primary</span>}</p>
                    {v.vet_name && <p className="text-sm text-gray-600">Dr. {v.vet_name}</p>}
                    {v.phone && <p className="text-sm text-gray-500">{v.phone}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingId(v.id)} className="text-navy hover:text-primary-800 text-sm">Edit</button>
                    {!v.is_primary && (
                      <button onClick={() => handleSetPrimary(v.id)} className="text-navy hover:text-primary-800 text-sm">Set as Primary</button>
                    )}
                    {deletingId === v.id ? (
                      <>
                        <span className="text-sm text-gray-500">Sure?</span>
                        <button onClick={() => handleDelete(v.id)} className="text-red-600 hover:text-red-800 text-sm font-semibold">Yes</button>
                        <button onClick={() => setDeletingId(null)} className="text-gray-600 hover:text-gray-800 text-sm">No</button>
                      </>
                    ) : (
                      <button onClick={() => setDeletingId(v.id)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
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
