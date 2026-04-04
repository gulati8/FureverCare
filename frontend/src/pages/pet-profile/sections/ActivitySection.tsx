import { usePetProfileContext } from '../context';
import { MedicalTimeline } from '../../../components/MedicalTimeline';
import UpgradeBanner from '../../../components/UpgradeBanner';

export default function ActivitySection() {
  const { pet, isPremium, conditions, allergies, medications, vaccinations } = usePetProfileContext();

  return (
    <div className="space-y-6 fade-in">
      {/* Medical Timeline */}
      <div className="card">
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
            <p className="text-surface-500 text-center py-4">
              Upgrade to premium to view a visual timeline of your pet's medical history.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
