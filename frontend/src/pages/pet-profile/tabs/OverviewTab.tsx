import { useState } from 'react';
import { Pet, PetCondition, PetAllergy, PetMedication, petsApi } from '../../../api/client';
import InlineEditForm, { EditField } from '../../../components/InlineEditForm';
import { SPECIES_OPTIONS } from '../constants';
import { formatWeight, calculateAgeFromDOB } from '../utils';

type OverviewField = 'name' | 'species' | 'breed' | 'color_markings' | 'sex' | 'date_of_birth' | 'weight' | 'microchip_id' | 'special_instructions' | 'age';

export default function OverviewTab({ pet, token, onPetUpdated, conditions, allergies, medications, onNavigateToHealth }: {
  pet: Pet;
  token: string;
  onPetUpdated: (pet: Pet) => void;
  onNavigateToHealth: () => void;
  conditions: PetCondition[];
  allergies: PetAllergy[];
  medications: PetMedication[];
}) {
  const activeMeds = medications.filter(m => m.is_active);
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
      case 'age':
        payload.age = values.age !== '' && values.age !== undefined ? Number(values.age) : null;
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
      fields: [{ key: 'color_markings', placeholder: 'Color or markings', type: 'text' }],
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
      fields: [{ key: 'special_instructions', placeholder: 'Any special care instructions for emergency staff...', type: 'textarea', rows: 3 }],
      values: { special_instructions: pet.special_instructions || '' },
    },
    age: {
      fields: [{ key: 'age', placeholder: 'Age (years)', type: 'number', min: '0', step: '1' }],
      values: { age: pet.age != null ? String(pet.age) : '' },
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

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Basic Information</h3>
        <dl className="grid grid-cols-2 gap-4">
          {renderEditableField('name', 'Name', pet.name)}
          {renderEditableField('species', 'Species', <span className="capitalize">{pet.species}</span>)}
          {renderEditableField('breed', 'Breed', pet.breed, !!pet.breed)}
          {renderEditableField('color_markings', 'Color / Markings', pet.color_markings, !!pet.color_markings)}
          {renderEditableField('sex', 'Sex', <span className="capitalize">{pet.sex}{pet.is_fixed ? ' (Spayed/Neutered)' : ''}</span>, !!pet.sex)}
          {renderEditableField('date_of_birth', 'Date of Birth', pet.date_of_birth ? new Date(pet.date_of_birth.split('T')[0] + 'T00:00:00').toLocaleDateString() : null, !!pet.date_of_birth)}
          {renderEditableField('weight', 'Weight', pet.weight_kg ? formatWeight(pet.weight_kg, pet.weight_unit) : null, !!pet.weight_kg)}
          {renderEditableField('microchip_id', 'Microchip ID', <span className="font-mono">{pet.microchip_id}</span>, !!pet.microchip_id)}
          {pet.date_of_birth ? (
            <div className="rounded-lg p-2 -m-2">
              <dt className="text-sm text-gray-500">Age</dt>
              <dd className="text-gray-900">{calculateAgeFromDOB(pet.date_of_birth.split('T')[0])} years old</dd>
            </div>
          ) : (
            renderEditableField(
              'age',
              'Age',
              pet.age != null ? `${pet.age} years old` : <span className="text-gray-400">Unknown</span>
            )
          )}
        </dl>
      </div>

      <div>
        {editingField === 'special_instructions' ? (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Special Instructions</h3>
            <InlineEditForm
              fields={fieldConfigs.special_instructions.fields}
              values={fieldConfigs.special_instructions.values}
              onSave={(vals) => handleSaveField('special_instructions', vals)}
              onCancel={() => setEditingField(null)}
            />
          </div>
        ) : (
          <div
            className="group cursor-pointer rounded-lg p-2 -m-2 hover:bg-gray-50 transition-colors"
            onClick={() => setEditingField('special_instructions')}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-1">
              Special Instructions
              <svg className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </h3>
            {pet.special_instructions ? (
              <p className="text-gray-700 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                {pet.special_instructions}
              </p>
            ) : (
              <p className="text-gray-400 text-sm">Click to add special instructions</p>
            )}
          </div>
        )}
      </div>

      {(conditions.length > 0 || allergies.length > 0 || activeMeds.length > 0) && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Health Summary</h3>
          <div className="grid gap-4 md:grid-cols-3">
            {conditions.length > 0 && (
              <div
                className="bg-orange-50 rounded-lg p-4 cursor-pointer hover:bg-orange-100 transition-colors"
                onClick={onNavigateToHealth}
              >
                <h4 className="font-medium text-orange-800 mb-2">Conditions ({conditions.length})</h4>
                <ul className="text-sm text-orange-700 space-y-1">
                  {conditions.slice(0, 3).map(c => <li key={c.id}>{c.name}</li>)}
                  {conditions.length > 3 && <li className="font-medium">+{conditions.length - 3} more</li>}
                </ul>
              </div>
            )}
            {allergies.length > 0 && (
              <div
                className="bg-red-50 rounded-lg p-4 cursor-pointer hover:bg-red-100 transition-colors"
                onClick={onNavigateToHealth}
              >
                <h4 className="font-medium text-red-800 mb-2">Allergies ({allergies.length})</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {allergies.slice(0, 3).map(a => <li key={a.id}>{a.allergen}</li>)}
                  {allergies.length > 3 && <li className="font-medium">+{allergies.length - 3} more</li>}
                </ul>
              </div>
            )}
            {activeMeds.length > 0 && (
              <div
                className="bg-blue-50 rounded-lg p-4 cursor-pointer hover:bg-blue-100 transition-colors"
                onClick={onNavigateToHealth}
              >
                <h4 className="font-medium text-blue-800 mb-2">Active Medications ({activeMeds.length})</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  {activeMeds.slice(0, 3).map(m => <li key={m.id}>{m.name}</li>)}
                  {activeMeds.length > 3 && <li className="font-medium">+{activeMeds.length - 3} more</li>}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
