import { useState } from 'react';
import { usePetProfileContext } from '../context';
import ConditionsTab from '../tabs/ConditionsTab';
import AllergiesTab from '../tabs/AllergiesTab';
import MedicationsTab from '../tabs/MedicationsTab';
import VaccinationsTab from '../tabs/VaccinationsTab';
import AlertsTab from '../tabs/AlertsTab';
import { petsApi } from '../../../api/client';

export default function HealthRecordsSection() {
  const ctx = usePetProfileContext();
  const {
    pet, petId, token,
    conditions, setConditions,
    allergies, setAllergies,
    medications, setMedications,
    vaccinations, setVaccinations,
    alerts, setAlerts,
    handlePetUpdated, handleNavigateToReview,
  } = ctx;

  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(pet.owners_notes || '');
  const [savingNotes, setSavingNotes] = useState(false);

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const updated = await petsApi.update(petId, { owners_notes: notesValue || undefined }, token);
      handlePetUpdated(updated);
      setEditingNotes(false);
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setSavingNotes(false);
    }
  };

  const activeMeds = medications.filter(m => m.is_active);
  const expiringVacs = vaccinations.filter(v => v.expiration_date && new Date(v.expiration_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

  return (
    <div className="space-y-4 fade-in">
      {/* Conditions accordion — default open */}
      <details className="health-accordion" open>
        <summary className="health-accordion-summary">
          <div className="health-accordion-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
            Conditions
            {conditions.length > 0 && (
              <span className="badge badge-warning">{conditions.length}</span>
            )}
          </div>
          <svg className="health-accordion-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </summary>
        <div className="health-accordion-content">
          <ConditionsTab
            petId={petId} token={token}
            conditions={conditions} setConditions={setConditions}
            onNavigateToReview={handleNavigateToReview}
          />
        </div>
      </details>

      {/* Allergies accordion — default open */}
      <details className="health-accordion" open>
        <summary className="health-accordion-summary">
          <div className="health-accordion-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Allergies
            {allergies.length > 0 && (
              <span className="badge badge-danger">{allergies.length}</span>
            )}
          </div>
          <svg className="health-accordion-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </summary>
        <div className="health-accordion-content">
          <AllergiesTab
            petId={petId} token={token}
            allergies={allergies} setAllergies={setAllergies}
            onNavigateToReview={handleNavigateToReview}
          />
        </div>
      </details>

      {/* Medications accordion — default collapsed */}
      <details className="health-accordion">
        <summary className="health-accordion-summary">
          <div className="health-accordion-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3" />
            </svg>
            Medications
            {activeMeds.length > 0 && (
              <span className="badge badge-info">{activeMeds.length} active</span>
            )}
          </div>
          <svg className="health-accordion-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </summary>
        <div className="health-accordion-content">
          <MedicationsTab
            petId={petId} token={token}
            medications={medications} setMedications={setMedications}
            onNavigateToReview={handleNavigateToReview}
          />
        </div>
      </details>

      {/* Vaccinations accordion — default collapsed */}
      <details className="health-accordion">
        <summary className="health-accordion-summary">
          <div className="health-accordion-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.5 14.5L3 21m7-4l4 4m3-11l-1-1m-3-3l-1-1m5-2l-7 7" />
            </svg>
            Vaccinations
            {expiringVacs.length > 0 ? (
              <span className="badge badge-danger">{expiringVacs.length} expiring</span>
            ) : vaccinations.length > 0 ? (
              <span className="badge badge-success">{vaccinations.length} recorded</span>
            ) : null}
          </div>
          <svg className="health-accordion-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </summary>
        <div className="health-accordion-content">
          <VaccinationsTab
            petId={petId} token={token}
            vaccinations={vaccinations} setVaccinations={setVaccinations}
            onNavigateToReview={handleNavigateToReview}
          />
        </div>
      </details>

      {/* Owner's Notes accordion — default collapsed */}
      <details className="health-accordion">
        <summary className="health-accordion-summary">
          <div className="health-accordion-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            Owner's Notes
            {pet.owners_notes && (
              <span className="badge badge-info">1</span>
            )}
          </div>
          <svg className="health-accordion-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </summary>
        <div className="health-accordion-content">
          {editingNotes ? (
            <div className="space-y-3">
              <textarea
                className="input w-full"
                rows={4}
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                placeholder="Notes for emergency staff (e.g., 'needs muzzle at vet', 'scared of loud noises')..."
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => { setEditingNotes(false); setNotesValue(pet.owners_notes || ''); }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary btn-sm"
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                >
                  {savingNotes ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <div
              className="group cursor-pointer rounded-lg p-3 -m-1 hover:bg-gray-50 transition-colors"
              onClick={() => { setNotesValue(pet.owners_notes || ''); setEditingNotes(true); }}
            >
              {pet.owners_notes ? (
                <p className="text-gray-700 whitespace-pre-wrap">{pet.owners_notes}</p>
              ) : (
                <p className="text-gray-400 text-sm">No notes yet. Click to add notes for emergency staff.</p>
              )}
              <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity mt-1 inline-block">Click to edit</span>
            </div>
          )}
        </div>
      </details>

      {/* Alerts section */}
      <details className="health-accordion">
        <summary className="health-accordion-summary">
          <div className="health-accordion-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            Card Alerts
            {(() => {
              const total = alerts.filter(a => a.is_active).length +
                conditions.filter(c => c.show_on_card && c.is_active).length +
                allergies.filter(a => a.show_on_card).length +
                medications.filter(m => m.show_on_card && m.is_active).length +
                vaccinations.filter(v => v.show_on_card).length;
              return total > 0 ? <span className="badge badge-danger">{total} on card</span> : null;
            })()}
          </div>
          <svg className="health-accordion-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </summary>
        <div className="health-accordion-content">
          <AlertsTab
            petId={petId} token={token}
            alerts={alerts} setAlerts={setAlerts}
            conditions={conditions} setConditions={setConditions}
            allergies={allergies} setAllergies={setAllergies}
            medications={medications} setMedications={setMedications}
            vaccinations={vaccinations} setVaccinations={setVaccinations}
          />
        </div>
      </details>
    </div>
  );
}
