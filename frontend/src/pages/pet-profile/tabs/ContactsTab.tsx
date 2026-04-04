import { useState } from 'react';
import { petsApi, PetEmergencyContact } from '../../../api/client';
import InlineEditForm from '../../../components/InlineEditForm';
import EmptyState from '../../../components/EmptyState';
import { CONTACT_FIELDS } from '../constants';

export default function ContactsTab({ petId, token, contacts, setContacts }: {
  petId: number;
  token: string;
  contacts: PetEmergencyContact[];
  setContacts: (c: PetEmergencyContact[]) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [addValues, setAddValues] = useState<Record<string, string | boolean>>({ name: '', phone: '', relationship: '' });

  const handleAdd = async (values: Record<string, string | boolean>) => {
    if (!(values.name as string).trim() || !(values.phone as string).trim()) return;
    const contact = await petsApi.addEmergencyContact(petId, {
      name: values.name as string, phone: values.phone as string, relationship: (values.relationship as string) || null, email: null, is_primary: contacts.length === 0
    }, token);
    setContacts([contact, ...contacts]);
    setShowForm(false);
    setAddValues({ name: '', phone: '', relationship: '' });
  };

  const handleSaveEdit = async (values: Record<string, string | boolean>) => {
    if (!editingId || !(values.name as string).trim() || !(values.phone as string).trim()) return;
    const updated = await petsApi.updateEmergencyContact(petId, editingId, { name: values.name as string, phone: values.phone as string, relationship: (values.relationship as string) || null }, token);
    setContacts(contacts.map(c => c.id === editingId ? updated : c));
    setEditingId(null);
  };

  const handleDelete = async (id: number) => {
    await petsApi.deleteEmergencyContact(petId, id, token);
    setContacts(contacts.filter(c => c.id !== id));
    setDeletingId(null);
  };

  const handleSetPrimary = async (contactId: number) => {
    await petsApi.setPrimaryEmergencyContact(petId, contactId, token);
    setContacts(contacts.map(c => ({ ...c, is_primary: c.id === contactId })));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="section-title">Emergency Contacts</h3>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">+ Add Contact</button>
      </div>

      {showForm && (
        <InlineEditForm
          fields={CONTACT_FIELDS}
          values={addValues}
          onSave={handleAdd}
          onCancel={() => setShowForm(false)}
          className="mb-4"
        />
      )}

      {contacts.length === 0 ? (
        <EmptyState title="No emergency contacts recorded" compact />
      ) : (
        <ul className="divide-y divide-surface-100">
          {contacts.map(c => (
            <li key={c.id} className="py-3">
              {editingId === c.id ? (
                <InlineEditForm
                  fields={CONTACT_FIELDS}
                  values={{ name: c.name, phone: c.phone, relationship: c.relationship || '' }}
                  onSave={handleSaveEdit}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{c.name} {c.is_primary && <span className="badge badge-navy">Primary</span>}</p>
                    {c.relationship && <p className="text-sm text-surface-600">{c.relationship}</p>}
                    <p className="text-sm text-surface-500">{c.phone}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingId(c.id)} className="text-navy hover:text-primary-800 text-sm">Edit</button>
                    {!c.is_primary && (
                      <button
                        onClick={() => handleSetPrimary(c.id)}
                        className="text-navy hover:text-primary-800 text-sm"
                      >
                        Set as Primary
                      </button>
                    )}
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
          ))}
        </ul>
      )}
    </div>
  );
}
