import { usePetProfileContext } from '../context';
import HistoryTab from '../tabs/HistoryTab';
import { MedicalTimeline } from '../../../components/MedicalTimeline';
export default function ActivitySection() {
  const { petId, pet, conditions, allergies, medications, vaccinations } = usePetProfileContext();

  return (
    <div className="space-y-6 fade-in">
      {/* Medical Timeline */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-navy)' }}>Medical Timeline</h3>
        <MedicalTimeline
          conditions={conditions}
          allergies={allergies}
          medications={medications}
          vaccinations={vaccinations}
          dateOfBirth={pet.date_of_birth}
        />
      </div>

      {/* Audit History */}
      <div className="card">
        <HistoryTab petId={petId} />
      </div>
    </div>
  );
}
