import { useState, SetStateAction } from 'react';
import { petsApi, PetAlert, PetCondition, PetAllergy, PetMedication, PetVaccination } from '../../../api/client';
import { formatFlexibleDate } from '../../../components/FlexibleDateInput';
import { useFieldSet } from '../../../hooks/useFieldToggle';
import { ALERT_SUGGESTIONS } from '../constants';

export default function AlertsTab({ petId, token, alerts, setAlerts, conditions, setConditions, allergies, setAllergies, medications, setMedications, vaccinations, setVaccinations }: {
  petId: number;
  token: string;
  alerts: PetAlert[];
  setAlerts: (a: PetAlert[]) => void;
  conditions: PetCondition[];
  setConditions: (value: SetStateAction<PetCondition[]>) => void;
  allergies: PetAllergy[];
  setAllergies: (value: SetStateAction<PetAllergy[]>) => void;
  medications: PetMedication[];
  setMedications: (value: SetStateAction<PetMedication[]>) => void;
  vaccinations: PetVaccination[];
  setVaccinations: (value: SetStateAction<PetVaccination[]>) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [newAlertText, setNewAlertText] = useState('');

  const conditionAlerts = conditions.filter(c => c.show_on_card && c.is_active);
  const allergyAlerts = allergies.filter(a => a.show_on_card);
  const medicationAlerts = medications.filter(m => m.show_on_card && m.is_active);
  const vaccinationAlerts = vaccinations.filter(v => v.show_on_card);
  const customAlerts = alerts.filter(a => a.is_active);

  const handleAddAlert = async () => {
    if (!newAlertText.trim()) return;
    const alert = await petsApi.addAlert(petId, { alert_text: newAlertText.trim() }, token);
    setAlerts([alert, ...alerts]);
    setNewAlertText('');
    setShowForm(false);
  };

  const handleRemoveCustomAlert = async (id: number) => {
    await petsApi.deleteAlert(petId, id, token);
    setAlerts(alerts.filter(a => a.id !== id));
  };

  const handleRemoveConditionAlert = useFieldSet(setConditions, (c, val) => petsApi.updateCondition(petId, c.id, { show_on_card: val }, token), 'show_on_card', false);
  const handleRemoveAllergyAlert = useFieldSet(setAllergies, (a, val) => petsApi.updateAllergy(petId, a.id, { show_on_card: val }, token), 'show_on_card', false);
  const handleRemoveMedicationAlert = useFieldSet(setMedications, (m, val) => petsApi.updateMedication(petId, m.id, { show_on_card: val }, token), 'show_on_card', false);
  const handleRemoveVaccinationAlert = useFieldSet(setVaccinations, (v, val) => petsApi.updateVaccination(petId, v.id, { show_on_card: val }, token), 'show_on_card', false);

  const totalAlerts = conditionAlerts.length + allergyAlerts.length + medicationAlerts.length + vaccinationAlerts.length + customAlerts.length;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold">Medical Alerts</h3>
          <p className="text-sm text-gray-500">These alerts appear on the emergency card</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">+ Add Alert</button>
      </div>

      {showForm && (
        <div className="bg-gray-50 border rounded-lg p-4 mb-4">
          <div className="mb-3">
            <input
              type="text"
              list="alert-suggestions"
              value={newAlertText}
              onChange={(e) => setNewAlertText(e.target.value)}
              placeholder="e.g., Seizure watch, Muzzle at vets"
              className="w-full input text-sm"
              maxLength={200}
              onKeyDown={(e) => e.key === 'Enter' && handleAddAlert()}
            />
            <datalist id="alert-suggestions">
              {ALERT_SUGGESTIONS.map(s => <option key={s} value={s} />)}
            </datalist>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddAlert} disabled={!newAlertText.trim()} className="btn-primary text-sm disabled:opacity-50">Save</button>
            <button onClick={() => { setShowForm(false); setNewAlertText(''); }} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}

      {totalAlerts === 0 ? (
        <p className="text-gray-500 text-center py-8">No alerts configured. Use the bell icon on conditions, allergies, and medications, or add custom alerts above.</p>
      ) : (
        <div className="space-y-6">
          {conditionAlerts.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-orange-700 mb-2">From Conditions</h4>
              <ul className="divide-y border rounded-lg">
                {conditionAlerts.map(c => (
                  <li key={c.id} className="p-3 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">{c.name}</p>
                      {c.severity && <span className="text-xs text-gray-500 capitalize">{c.severity}</span>}
                    </div>
                    <button onClick={() => handleRemoveConditionAlert(c)} className="text-gray-400 hover:text-red-600 text-sm" title="Remove from alerts">{'\u2715'}</button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {allergyAlerts.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-red-700 mb-2">From Allergies</h4>
              <ul className="divide-y border rounded-lg">
                {allergyAlerts.map(a => (
                  <li key={a.id} className="p-3 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">{a.allergen}</p>
                      {a.severity && <span className={`text-xs capitalize ${a.severity === 'life-threatening' ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>{a.severity}</span>}
                    </div>
                    <button onClick={() => handleRemoveAllergyAlert(a)} className="text-gray-400 hover:text-red-600 text-sm" title="Remove from alerts">{'\u2715'}</button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {medicationAlerts.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-blue-700 mb-2">From Medications</h4>
              <ul className="divide-y border rounded-lg">
                {medicationAlerts.map(m => (
                  <li key={m.id} className="p-3 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">{m.name}</p>
                      {m.dosage && <span className="text-xs text-gray-500">{m.dosage}</span>}
                    </div>
                    <button onClick={() => handleRemoveMedicationAlert(m)} className="text-gray-400 hover:text-red-600 text-sm" title="Remove from alerts">{'\u2715'}</button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {vaccinationAlerts.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-green-700 mb-2">From Vaccinations</h4>
              <ul className="divide-y border rounded-lg">
                {vaccinationAlerts.map(v => (
                  <li key={v.id} className="p-3 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">{v.name}</p>
                      <span className="text-xs text-gray-500">{formatFlexibleDate(v.administered_date, v.administered_date_precision)}</span>
                    </div>
                    <button onClick={() => handleRemoveVaccinationAlert(v)} className="text-gray-400 hover:text-red-600 text-sm" title="Remove from alerts">{'\u2715'}</button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {customAlerts.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-red-700 mb-2">Custom Alerts</h4>
              <ul className="divide-y border rounded-lg">
                {customAlerts.map(a => (
                  <li key={a.id} className="p-3 flex justify-between items-center">
                    <p className="font-medium text-sm">{a.alert_text}</p>
                    <button onClick={() => handleRemoveCustomAlert(a.id)} className="text-gray-400 hover:text-red-600 text-sm" title="Remove alert">{'\u2715'}</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
