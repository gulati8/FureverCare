import { usePetProfileContext } from '../context';
import HistoryTab from '../tabs/HistoryTab';
import { MedicalTimeline } from '../../../components/MedicalTimeline';
import UpgradeBanner from '../../../components/UpgradeBanner';

export default function ActivitySection() {
  const { petId, pet, isPremium, conditions, allergies, medications, vaccinations } = usePetProfileContext();

  return (
    <div className="space-y-6 fade-in">
      {/* Medical Timeline */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-navy)' }}>Medical Timeline</h3>
        {isPremium ? (
          <MedicalTimeline
            conditions={conditions}
            allergies={allergies}
            medications={medications}
            vaccinations={vaccinations}
            dateOfBirth={pet.date_of_birth}
          />
        ) : (
          <div className="space-y-4">
            <UpgradeBanner type="feature" feature="timeline" />
            <p className="text-gray-500 text-center py-4">
              Upgrade to premium to view a visual timeline of your pet's medical history.
            </p>
          </div>
        )}
      </div>

      {/* Audit History */}
      <div className="card">
        <HistoryTab petId={petId} />
      </div>
    </div>
  );
}
