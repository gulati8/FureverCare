import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { petsApi } from '../../../api/client';
import InlineEditForm from '../../../components/InlineEditForm';
import { usePetProfileContext } from '../context';
import ConditionsTab from '../tabs/ConditionsTab';
import AllergiesTab from '../tabs/AllergiesTab';
import MedicationsTab from '../tabs/MedicationsTab';
import VaccinationsTab from '../tabs/VaccinationsTab';

export default function HealthRecordsSection() {
  const ctx = usePetProfileContext();
  const {
    pet, petId, token,
    conditions, setConditions,
    allergies, setAllergies,
    medications, setMedications,
    vaccinations, setVaccinations,
    handleNavigateToReview,
    handlePetUpdated,
  } = ctx;

  const location = useLocation();
  const [editingNotes, setEditingNotes] = useState(false);

  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (!hash) return;
    const el = document.getElementById(hash) as HTMLDetailsElement | null;
    if (!el) return;
    el.open = true;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [location.hash]);

  const handleSaveNotes = async (values: Record<string, string | boolean>) => {
    const payload: Record<string, unknown> = { special_instructions: (values.special_instructions as string) || null };
    const updated = await petsApi.update(pet.id, payload as Parameters<typeof petsApi.update>[1], token);
    handlePetUpdated(updated);
    setEditingNotes(false);
  };

  const activeMeds = medications.filter(m => m.is_active);
  const expiringVacs = vaccinations.filter(v => v.expiration_date && new Date(v.expiration_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

  return (
    <div className="space-y-4 fade-in">
      {/* Conditions accordion — default open */}
      <details id="conditions" className="health-accordion" open>
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
      <details id="allergies" className="health-accordion" open>
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
      <details id="medications" className="health-accordion">
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
      <details id="vaccinations" className="health-accordion">
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

      {/* Owner's Notes accordion — auto-expand if content exists */}
      <details id="owners-notes" className="health-accordion" open={!!pet.special_instructions}>
        <summary className="health-accordion-summary">
          <div className="health-accordion-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Owner's Notes
          </div>
          <svg className="health-accordion-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </summary>
        <div className="health-accordion-content">
          {editingNotes ? (
            <InlineEditForm
              fields={[{ key: 'special_instructions', placeholder: 'Any special care instructions for emergency staff...', type: 'textarea', rows: 3 }]}
              values={{ special_instructions: pet.special_instructions || '' }}
              onSave={handleSaveNotes}
              onCancel={() => setEditingNotes(false)}
            />
          ) : (
            <div
              className="group cursor-pointer rounded-lg p-2 -m-2 hover:bg-gray-50 transition-colors"
              onClick={() => setEditingNotes(true)}
            >
              {pet.special_instructions ? (
                <p className="text-gray-700 flex items-start gap-1">
                  {pet.special_instructions}
                  <svg className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </p>
              ) : (
                <p className="text-gray-400 text-sm">Click to add owner's notes</p>
              )}
            </div>
          )}
        </div>
      </details>

    </div>
  );
}
