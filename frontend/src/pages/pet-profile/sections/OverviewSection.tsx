import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePetProfileContext } from '../context';
import OverviewTab from '../tabs/OverviewTab';
import EmergencyCardPreview from '../EmergencyCardPreview';
import PhotoUpload from '../../../components/PhotoUpload';
import CardAlertsModal from '../../../components/CardAlertsModal';
import { formatWeight } from '../utils';

export default function OverviewSection() {
  const ctx = usePetProfileContext();
  const navigate = useNavigate();
  const { pet, petId, token, vets, conditions, setConditions, allergies, setAllergies, medications, setMedications, vaccinations, setVaccinations, alerts, setAlerts, emergencyContacts, handlePetUpdated, setShowShareModal } = ctx;

  const [showCardAlertsModal, setShowCardAlertsModal] = useState(false);

  return (
    <div className="space-y-6 fade-in">
      {/* Two-column layout: Pet info + Emergency card */}
      <div className="pet-profile-overview-grid">
        {/* Left: Pet info card */}
        <div className="card">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <PhotoUpload
              petId={petId}
              currentPhotoUrl={pet.photo_url}
              onPhotoUpdated={(photoUrl) => handlePetUpdated({ ...pet, photo_url: photoUrl })}
              compact
              species={pet.species}
            />
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-navy)' }}>
                {pet.name}
              </h2>
              <p className="capitalize" style={{ color: 'var(--color-surface-500)', marginTop: '2px' }}>
                {pet.breed ? `${pet.breed} \u2022 ${pet.species}` : pet.species}
                {pet.color_markings && ` \u2022 ${pet.color_markings}`}
                {(() => {
                  if (pet.date_of_birth) {
                    const age = Math.floor((Date.now() - new Date(pet.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
                    return ` \u2022 ${age} ${age === 1 ? 'year' : 'years'}`;
                  }
                  if (pet.age != null) {
                    return ` \u2022 ${pet.age} ${pet.age === 1 ? 'year' : 'years'}`;
                  }
                  return null;
                })()}
                {pet.sex && ` \u2022 ${pet.sex}${pet.is_fixed ? ' (Fixed)' : ''}`}
              </p>
              {pet.weight_kg && (
                <p className="text-sm" style={{ color: 'var(--color-surface-400)', marginTop: '4px' }}>
                  {formatWeight(pet.weight_kg, pet.weight_unit)}
                </p>
              )}
            </div>
          </div>

          <OverviewTab
            pet={pet}
            token={token}
            onPetUpdated={handlePetUpdated}
          />
        </div>

        {/* Right: Emergency card preview */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Preview</p>
          <EmergencyCardPreview
            petName={pet.name}
            conditions={conditions}
            allergies={allergies}
            medications={medications}
            vaccinations={vaccinations}
            alerts={alerts}
            contacts={emergencyContacts}
            vets={vets}
            specialInstructions={pet.special_instructions}
            onShare={() => setShowShareModal(true)}
            onEdit={() => setShowCardAlertsModal(true)}
          />
        </div>
      </div>

      {/* Stat blocks */}
      <div className="pet-profile-stats">
        <div className="pet-profile-stat" onClick={() => navigate('health#conditions')}>
          <div className="pet-profile-stat-value" style={{ color: 'var(--color-warning)' }}>{conditions.length}</div>
          <div className="pet-profile-stat-label">Conditions</div>
        </div>
        <div className="pet-profile-stat" onClick={() => navigate('health#allergies')}>
          <div className="pet-profile-stat-value" style={{ color: 'var(--color-danger)' }}>{allergies.length}</div>
          <div className="pet-profile-stat-label">Allergies</div>
        </div>
        <div className="pet-profile-stat" onClick={() => navigate('health#medications')}>
          <div className="pet-profile-stat-value" style={{ color: 'var(--color-info)' }}>{medications.filter(m => m.is_active).length}</div>
          <div className="pet-profile-stat-label">Medications</div>
        </div>
        <div className="pet-profile-stat" onClick={() => navigate('health#vaccinations')}>
          <div className="pet-profile-stat-value" style={{ color: 'var(--color-success)' }}>{vaccinations.length}</div>
          <div className="pet-profile-stat-label">Vaccinations</div>
        </div>
      </div>

      {/* Card Alerts Modal */}
      {showCardAlertsModal && (
        <CardAlertsModal
          onClose={() => setShowCardAlertsModal(false)}
          petId={petId}
          token={token}
          alerts={alerts}
          setAlerts={setAlerts}
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
