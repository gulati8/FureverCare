import { useState } from 'react';
import { Pet, petsApi } from '../../../api/client';
import InlineEditForm, { EditField } from '../../../components/InlineEditForm';
import { SPECIES_OPTIONS } from '../constants';
import { formatWeight } from '../utils';

type OverviewField = 'name' | 'species' | 'breed' | 'color_markings' | 'sex' | 'date_of_birth' | 'age' | 'weight' | 'microchip_id' | 'special_instructions';

export default function OverviewTab({ pet, token, onPetUpdated }: {
  pet: Pet;
  token: string;
  onPetUpdated: (pet: Pet) => void;
}) {
  const [editingField, setEditingField] = useState<OverviewField | null>(null);

  const handleSaveField = async (field: OverviewField, values: Record<string, string | boolean>) => {
    const payload: Record<string, unknown> = {};
    switch (field) {
      case 'name':
        payload.name = values.name;
        break;
      case 'species':
        payload.species = values.species;
        break;
      case 'breed':
        payload.breed = (values.breed as string) || null;
        break;
      case 'color_markings':
        payload.color_markings = (values.color_markings as string) || null;
        break;
      case 'sex':
        payload.sex = (values.sex as string) || null;
        payload.is_fixed = values.is_fixed;
        break;
      case 'date_of_birth':
        payload.date_of_birth = (values.date_of_birth as string) || null;
        break;
      case 'age':
        payload.age = values.age ? Number(values.age) : null;
        break;
      case 'weight':
        payload.weight_kg = values.weight_kg ? Number(values.weight_kg) : null;
        payload.weight_unit = values.weight_unit;
        break;
      case 'microchip_id':
        payload.microchip_id = (values.microchip_id as string) || null;
        break;
      case 'special_instructions':
        payload.special_instructions = (values.special_instructions as string) || null;
        break;
    }
    const updated = await petsApi.update(pet.id, payload as Parameters<typeof petsApi.update>[1], token);
    onPetUpdated(updated);
    setEditingField(null);
  };

  const fieldConfigs: Record<OverviewField, { fields: EditField[]; values: Record<string, string | boolean> }> = {
    name: {
      fields: [{ key: 'name', placeholder: 'Pet name *', required: true }],
      values: { name: pet.name },
    },
    species: {
      fields: [{ key: 'species', placeholder: 'Species', type: 'select', options: SPECIES_OPTIONS, required: true }],
      values: { species: pet.species },
    },
    breed: {
      fields: [{ key: 'breed', placeholder: 'Breed', type: 'text' }],
      values: { breed: pet.breed || '' },
    },
    color_markings: {
      fields: [{ key: 'color_markings', placeholder: 'Color or Markings', type: 'text' }],
      values: { color_markings: pet.color_markings || '' },
    },
    sex: {
      fields: [
        { key: 'sex', placeholder: 'Sex', type: 'select', options: [{ value: '', label: 'Select...' }, { value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }] },
        { key: 'is_fixed', placeholder: 'Spayed / Neutered', type: 'checkbox' },
      ],
      values: { sex: pet.sex || '', is_fixed: pet.is_fixed || false },
    },
    date_of_birth: {
      fields: [{ key: 'date_of_birth', placeholder: 'Date of Birth', type: 'date' }],
      values: { date_of_birth: pet.date_of_birth ? pet.date_of_birth.split('T')[0] : '' },
    },
    age: {
      fields: [{ key: 'age', placeholder: 'Age (years)', type: 'number', min: '0', step: '1' }],
      values: { age: pet.age != null ? String(pet.age) : '' },
    },
    weight: {
      fields: [
        { key: 'weight_kg', placeholder: 'Weight', type: 'number', step: '0.1', min: '0', gridGroup: 'weight' },
        { key: 'weight_unit', placeholder: 'Unit', type: 'select', options: [{ value: 'lbs', label: 'pounds (lbs)' }, { value: 'kg', label: 'kilograms (kg)' }], gridGroup: 'weight' },
      ],
      values: { weight_kg: pet.weight_kg ? String(pet.weight_kg) : '', weight_unit: pet.weight_unit || 'lbs' },
    },
    microchip_id: {
      fields: [{ key: 'microchip_id', placeholder: 'Microchip ID', type: 'text' }],
      values: { microchip_id: pet.microchip_id || '' },
    },
    special_instructions: {
      fields: [{ key: 'special_instructions', placeholder: "Add owner's notes", type: 'textarea', rows: 3 }],
      values: { special_instructions: pet.special_instructions || '' },
    },
  };

  const renderEditableField = (field: OverviewField, label: string, displayValue: React.ReactNode, show = true) => {
    if (!show && editingField !== field) return null;

    if (editingField === field) {
      const config = fieldConfigs[field];
      return (
        <div className="col-span-2">
          <dt className="text-sm text-gray-500 mb-1">{label}</dt>
          <InlineEditForm
            fields={config.fields}
            values={config.values}
            onSave={(vals) => handleSaveField(field, vals)}
            onCancel={() => setEditingField(null)}
          />
        </div>
      );
    }

    return (
      <div
        className="group cursor-pointer rounded-lg p-2 -m-2 hover:bg-gray-50 transition-colors"
        onClick={() => setEditingField(field)}
      >
        <dt className="text-sm text-gray-500 flex items-center gap-1">
          {label}
          <svg className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </dt>
        <dd className="text-gray-900">{displayValue}</dd>
      </div>
    );
  };

  const renderAgeField = () => {
    if (pet.date_of_birth) {
      const calculatedAge = Math.floor((Date.now() - new Date(pet.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      return (
        <div>
          <dt className="text-sm text-gray-500">Age</dt>
          <dd className="text-gray-900">{calculatedAge} {calculatedAge === 1 ? 'year' : 'years'}</dd>
        </div>
      );
    }
    return renderEditableField('age', 'Age', pet.age != null ? `${pet.age} ${pet.age === 1 ? 'year' : 'years'}` : null, pet.age != null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Basic Information</h3>
        <dl className="grid grid-cols-2 gap-4">
          {renderEditableField('name', 'Name', pet.name)}
          {renderEditableField('species', 'Species', <span className="capitalize">{pet.species}</span>)}
          {renderEditableField('breed', 'Breed', pet.breed || <span className="text-gray-400 text-sm">Add breed</span>)}
          {renderEditableField('color_markings', 'Color / Markings', pet.color_markings || <span className="text-gray-400 text-sm">Add color or markings</span>)}
          {renderEditableField('sex', 'Sex', pet.sex ? <span className="capitalize">{pet.sex}{pet.is_fixed ? ' (Spayed/Neutered)' : ''}</span> : <span className="text-gray-400 text-sm">Add sex</span>)}
          {renderEditableField('date_of_birth', 'Date of Birth', pet.date_of_birth ? new Date(pet.date_of_birth.split('T')[0] + 'T00:00:00').toLocaleDateString() : <span className="text-gray-400 text-sm">Add date of birth</span>)}
          {renderAgeField()}
          {renderEditableField('weight', 'Weight', pet.weight_kg ? formatWeight(pet.weight_kg, pet.weight_unit) : <span className="text-gray-400 text-sm">Add weight</span>)}
          {renderEditableField('microchip_id', 'Microchip ID', pet.microchip_id ? <span className="font-mono">{pet.microchip_id}</span> : <span className="text-gray-400 text-sm">Add microchip ID</span>)}
        </dl>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Owner's Notes</h3>
        {editingField === 'special_instructions' ? (
          <InlineEditForm
            fields={fieldConfigs.special_instructions.fields}
            values={fieldConfigs.special_instructions.values}
            onSave={(vals) => handleSaveField('special_instructions', vals)}
            onCancel={() => setEditingField(null)}
          />
        ) : (
          <div
            className="group cursor-pointer rounded-lg p-2 -m-2 hover:bg-gray-50 transition-colors"
            onClick={() => setEditingField('special_instructions')}
          >
            {pet.special_instructions ? (
              <p className="text-gray-700 whitespace-pre-wrap flex items-start gap-1">
                {pet.special_instructions}
                <svg className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </p>
            ) : (
              <p className="text-gray-400 text-sm">Add owner's notes</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
