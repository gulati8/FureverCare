import { useNavigate } from 'react-router-dom';
import { usePetProfileContext } from '../context';
import OverviewTab from '../tabs/OverviewTab';
import EmergencyCardPreview from '../EmergencyCardPreview';
import PhotoUpload from '../../../components/PhotoUpload';
import { formatWeight } from '../utils';

export default function OverviewSection() {
  const ctx = usePetProfileContext();
  const navigate = useNavigate();
  const { pet, petId, token, conditions, allergies, medications, vaccinations, alerts, emergencyContacts, handlePetUpdated, setShowShareModal } = ctx;

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
                {pet.breed ? `${pet.breed} ${pet.species}` : pet.species}
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
            conditions={conditions}
            allergies={allergies}
            medications={medications}
            onNavigateToHealth={() => navigate('health')}
          />
        </div>

        {/* Right: Emergency card preview */}
        <div>
          <EmergencyCardPreview
            petName={pet.name}
            conditions={conditions}
            allergies={allergies}
            medications={medications}
            vaccinations={vaccinations}
            alerts={alerts}
            contacts={emergencyContacts}
            onShare={() => setShowShareModal(true)}
            onConfigure={() => navigate('health')}
          />
        </div>
      </div>

      {/* Stat blocks */}
      <div className="pet-profile-stats">
        <div className="pet-profile-stat" onClick={() => navigate('health')}>
          <div className="pet-profile-stat-value" style={{ color: 'var(--color-warning)' }}>{conditions.length}</div>
          <div className="pet-profile-stat-label">Conditions</div>
        </div>
        <div className="pet-profile-stat" onClick={() => navigate('health')}>
          <div className="pet-profile-stat-value" style={{ color: 'var(--color-danger)' }}>{allergies.length}</div>
          <div className="pet-profile-stat-label">Allergies</div>
        </div>
        <div className="pet-profile-stat" onClick={() => navigate('health')}>
          <div className="pet-profile-stat-value" style={{ color: 'var(--color-info)' }}>{medications.filter(m => m.is_active).length}</div>
          <div className="pet-profile-stat-label">Medications</div>
        </div>
        <div className="pet-profile-stat" onClick={() => navigate('health')}>
          <div className="pet-profile-stat-value" style={{ color: 'var(--color-success)' }}>{vaccinations.length}</div>
          <div className="pet-profile-stat-label">Vaccinations</div>
        </div>
      </div>
    </div>
  );
}
