import { useState, SetStateAction } from 'react';
import { petsApi, PetCondition, PetAllergy, PetMedication, PetVaccination } from '../../../api/client';
import EmptyState from '../../../components/EmptyState';
import { useFieldSet } from '../../../hooks/useFieldToggle';

type DropdownValue = '' | `condition-${number}` | `allergy-${number}` | `medication-${number}` | `vaccination-${number}`;

export default function AlertsTab({ petId, token, conditions, setConditions, allergies, setAllergies, medications, setMedications, vaccinations, setVaccinations }: {
  petId: number;
  token: string;
  conditions: PetCondition[];
  setConditions: (value: SetStateAction<PetCondition[]>) => void;
  allergies: PetAllergy[];
  setAllergies: (value: SetStateAction<PetAllergy[]>) => void;
  medications: PetMedication[];
  setMedications: (value: SetStateAction<PetMedication[]>) => void;
  vaccinations: PetVaccination[];
  setVaccinations: (value: SetStateAction<PetVaccination[]>) => void;
}) {
  const [selected, setSelected] = useState<DropdownValue>('');

  // "On Card" lists
  const conditionsOnCard = conditions.filter(c => c.show_on_card);
  const allergiesOnCard = allergies.filter(a => a.show_on_card);
  const medicationsOnCard = medications.filter(m => m.show_on_card);
  const vaccinationsOnCard = vaccinations.filter(v => v.show_on_card);
  const totalOnCard = conditionsOnCard.length + allergiesOnCard.length + medicationsOnCard.length + vaccinationsOnCard.length;

  // "Add to Card" dropdown candidates (not already on card)
  const conditionCandidates = conditions.filter(c => !c.show_on_card && c.is_active);
  const allergyCandidates = allergies.filter(a => !a.show_on_card);
  const medicationCandidates = medications.filter(m => !m.show_on_card && m.is_active);
  const vaccinationCandidates = vaccinations.filter(v => !v.show_on_card);
  const hasAnyCandidates = conditionCandidates.length > 0 || allergyCandidates.length > 0 || medicationCandidates.length > 0 || vaccinationCandidates.length > 0;

  // Remove handlers (set show_on_card: false)
  const handleRemoveCondition = useFieldSet(setConditions, (c, val) => petsApi.updateCondition(petId, c.id, { show_on_card: val }, token), 'show_on_card', false);
  const handleRemoveAllergy = useFieldSet(setAllergies, (a, val) => petsApi.updateAllergy(petId, a.id, { show_on_card: val }, token), 'show_on_card', false);
  const handleRemoveMedication = useFieldSet(setMedications, (m, val) => petsApi.updateMedication(petId, m.id, { show_on_card: val }, token), 'show_on_card', false);
  const handleRemoveVaccination = useFieldSet(setVaccinations, (v, val) => petsApi.updateVaccination(petId, v.id, { show_on_card: val }, token), 'show_on_card', false);

  // Add handler (set show_on_card: true)
  const handleAddCondition = useFieldSet(setConditions, (c, val) => petsApi.updateCondition(petId, c.id, { show_on_card: val }, token), 'show_on_card', true);
  const handleAddAllergy = useFieldSet(setAllergies, (a, val) => petsApi.updateAllergy(petId, a.id, { show_on_card: val }, token), 'show_on_card', true);
  const handleAddMedication = useFieldSet(setMedications, (m, val) => petsApi.updateMedication(petId, m.id, { show_on_card: val }, token), 'show_on_card', true);
  const handleAddVaccination = useFieldSet(setVaccinations, (v, val) => petsApi.updateVaccination(petId, v.id, { show_on_card: val }, token), 'show_on_card', true);

  const handleDropdownChange = async (value: DropdownValue) => {
    if (!value) return;
    setSelected('');

    if (value.startsWith('condition-')) {
      const id = parseInt(value.slice('condition-'.length), 10);
      const item = conditions.find(c => c.id === id);
      if (item) await handleAddCondition(item);
    } else if (value.startsWith('allergy-')) {
      const id = parseInt(value.slice('allergy-'.length), 10);
      const item = allergies.find(a => a.id === id);
      if (item) await handleAddAllergy(item);
    } else if (value.startsWith('medication-')) {
      const id = parseInt(value.slice('medication-'.length), 10);
      const item = medications.find(m => m.id === id);
      if (item) await handleAddMedication(item);
    } else if (value.startsWith('vaccination-')) {
      const id = parseInt(value.slice('vaccination-'.length), 10);
      const item = vaccinations.find(v => v.id === id);
      if (item) await handleAddVaccination(item);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section A: On Card */}
      <div>
        <h3 className="text-base font-semibold mb-1">On Card</h3>
        <p className="text-sm text-surface-500 mb-3">Items currently shown on the emergency card</p>

        {totalOnCard === 0 ? (
          <EmptyState title="No alerts configured" compact />
        ) : (
          <div className="space-y-3">
            {conditionsOnCard.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-orange-700 mb-1">Conditions</h4>
                <ul className="divide-y border rounded-lg">
                  {conditionsOnCard.map(c => (
                    <li key={c.id} className="px-3 py-2 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium">{c.name}</p>
                        {c.severity && <span className="text-xs text-surface-500 capitalize">{c.severity}</span>}
                      </div>
                      <button
                        onClick={() => handleRemoveCondition(c)}
                        className="text-surface-400 hover:text-danger text-sm ml-3 flex-shrink-0"
                        title="Remove from card"
                      >
                        &times;
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {allergiesOnCard.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-danger mb-1">Allergies</h4>
                <ul className="divide-y border rounded-lg">
                  {allergiesOnCard.map(a => (
                    <li key={a.id} className="px-3 py-2 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium">{a.allergen}</p>
                        {a.severity && (
                          <span className={`text-xs capitalize ${a.severity === 'life-threatening' ? 'text-danger font-semibold' : 'text-surface-500'}`}>
                            {a.severity}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveAllergy(a)}
                        className="text-surface-400 hover:text-danger text-sm ml-3 flex-shrink-0"
                        title="Remove from card"
                      >
                        &times;
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {medicationsOnCard.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-info mb-1">Medications</h4>
                <ul className="divide-y border rounded-lg">
                  {medicationsOnCard.map(m => (
                    <li key={m.id} className="px-3 py-2 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium">{m.name}</p>
                        {m.dosage && <span className="text-xs text-surface-500">{m.dosage}</span>}
                      </div>
                      <button
                        onClick={() => handleRemoveMedication(m)}
                        className="text-surface-400 hover:text-danger text-sm ml-3 flex-shrink-0"
                        title="Remove from card"
                      >
                        &times;
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {vaccinationsOnCard.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-success mb-1">Vaccinations</h4>
                <ul className="divide-y border rounded-lg">
                  {vaccinationsOnCard.map(v => (
                    <li key={v.id} className="px-3 py-2 flex justify-between items-center">
                      <p className="text-sm font-medium">{v.name}</p>
                      <button
                        onClick={() => handleRemoveVaccination(v)}
                        className="text-surface-400 hover:text-danger text-sm ml-3 flex-shrink-0"
                        title="Remove from card"
                      >
                        &times;
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section B: Add to Card */}
      <div>
        <h3 className="text-base font-semibold mb-1">Add to Card</h3>
        <p className="text-sm text-surface-500 mb-3">Select a health record to show on the emergency card</p>

        {hasAnyCandidates ? (
          <select
            value={selected}
            onChange={e => handleDropdownChange(e.target.value as DropdownValue)}
            className="w-full input text-sm"
          >
            <option value="">Select an item to add to card...</option>

            {conditionCandidates.length > 0 && (
              <optgroup label="Conditions">
                {conditionCandidates.map(c => (
                  <option key={c.id} value={`condition-${c.id}`}>
                    {c.name}{c.severity ? ` (${c.severity})` : ''}
                  </option>
                ))}
              </optgroup>
            )}

            {allergyCandidates.length > 0 && (
              <optgroup label="Allergies">
                {allergyCandidates.map(a => (
                  <option key={a.id} value={`allergy-${a.id}`}>
                    {a.allergen}{a.severity ? ` (${a.severity})` : ''}
                  </option>
                ))}
              </optgroup>
            )}

            {medicationCandidates.length > 0 && (
              <optgroup label="Medications">
                {medicationCandidates.map(m => (
                  <option key={m.id} value={`medication-${m.id}`}>
                    {m.name}{m.dosage ? ` — ${m.dosage}` : ''}
                  </option>
                ))}
              </optgroup>
            )}

            {vaccinationCandidates.length > 0 && (
              <optgroup label="Vaccinations">
                {vaccinationCandidates.map(v => (
                  <option key={v.id} value={`vaccination-${v.id}`}>
                    {v.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        ) : (
          <p className="text-surface-400 text-sm text-center py-4 border border-dashed rounded-lg">
            All eligible health records are already on the card
          </p>
        )}
      </div>
    </div>
  );
}
