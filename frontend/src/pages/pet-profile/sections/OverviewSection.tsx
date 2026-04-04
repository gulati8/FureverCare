import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePetProfileContext } from '../context';
import OverviewTab from '../tabs/OverviewTab';
import EmergencyCardPreview from '../EmergencyCardPreview';
import CardAlertsModal from '../../../components/CardAlertsModal';

export default function OverviewSection() {
  const ctx = usePetProfileContext();
  const navigate = useNavigate();
  const { pet, petId, token, vets, conditions, setConditions, allergies, setAllergies, medications, setMedications, vaccinations, setVaccinations, alerts, setAlerts, emergencyContacts, handlePetUpdated } = ctx;

  const [showCardAlertsModal, setShowCardAlertsModal] = useState(false);
  const [cardPreviewOpen, setCardPreviewOpen] = useState(false);

  return (
    <div className="space-y-6 fade-in">
      {/* Two-column layout: Pet info + Emergency card */}
      <div className="pet-profile-overview-grid">
        {/* Left: Pet info card */}
        <div className="card">
          <OverviewTab
            pet={pet}
            token={token}
            onPetUpdated={handlePetUpdated}
          />
        </div>

        {/* Right: Stat blocks + Emergency card preview */}
        <div className="flex flex-col">
          {/* Stat blocks */}
          <div className="pet-profile-stats">
            <div className="pet-profile-stat" onClick={() => navigate('health#conditions')}>
              <div className="pet-profile-stat-value text-navy">{conditions.length}</div>
              <div className="pet-profile-stat-label">Conditions</div>
            </div>
            <div className="pet-profile-stat" onClick={() => navigate('health#allergies')}>
              <div className="pet-profile-stat-value text-navy">{allergies.length}</div>
              <div className="pet-profile-stat-label">Allergies</div>
            </div>
            <div className="pet-profile-stat" onClick={() => navigate('health#medications')}>
              <div className="pet-profile-stat-value text-navy">{medications.filter(m => m.is_active).length}</div>
              <div className="pet-profile-stat-label">Medications</div>
            </div>
            <div className="pet-profile-stat" onClick={() => navigate('health#vaccinations')}>
              <div className="pet-profile-stat-value text-navy">{vaccinations.length}</div>
              <div className="pet-profile-stat-label">Vaccinations</div>
            </div>
          </div>

          {/* Mobile toggle - only visible < lg */}
          <button
            className="lg:hidden w-full flex items-center justify-between p-3 rounded-lg bg-surface-100 border border-surface-200 mb-2"
            onClick={() => setCardPreviewOpen(!cardPreviewOpen)}
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-surface-600">Card Preview</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`transition-transform text-surface-600 ${cardPreviewOpen ? 'rotate-180' : ''}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {cardPreviewOpen && (
            <div className="lg:hidden mb-2">
              <div className="flex justify-between items-center mb-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-surface-400 m-0">Preview</p>
                <button onClick={() => setShowCardAlertsModal(true)} className="text-xs font-medium text-steel hover:text-steel-dark">Edit</button>
              </div>
              <EmergencyCardPreview
                pet={pet}
                conditions={conditions}
                allergies={allergies}
                medications={medications}
                vaccinations={vaccinations}
                alerts={alerts}
                contacts={emergencyContacts}
                vets={vets}
              />
            </div>
          )}

          {/* Desktop - always visible */}
          <div className="hidden lg:block">
            <div className="flex justify-between items-center mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-surface-400 m-0">Preview</p>
              <button onClick={() => setShowCardAlertsModal(true)} className="text-xs font-medium text-steel hover:text-steel-dark">Edit</button>
            </div>
            <EmergencyCardPreview
              pet={pet}
              conditions={conditions}
              allergies={allergies}
              medications={medications}
              vaccinations={vaccinations}
              alerts={alerts}
              contacts={emergencyContacts}
              vets={vets}
            />
          </div>
        </div>
      </div>

      {/* Card Alerts Modal */}
      {showCardAlertsModal && (
        <CardAlertsModal
          onClose={() => setShowCardAlertsModal(false)}
          petId={petId}
          token={token}
          conditions={conditions}
          setConditions={setConditions}
          allergies={allergies}
          setAllergies={setAllergies}
          medications={medications}
          setMedications={setMedications}
          vaccinations={vaccinations}
          setVaccinations={setVaccinations}
        />
      )}
    </div>
  );
}
