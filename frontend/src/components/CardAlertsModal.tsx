import { SetStateAction } from 'react';
import { PetAlert, PetCondition, PetAllergy, PetMedication, PetVaccination } from '../api/client';
import AlertsTab from '../pages/pet-profile/tabs/AlertsTab';

interface CardAlertsModalProps {
  onClose: () => void;
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
}

export default function CardAlertsModal({
  onClose,
  petId,
  token,
  alerts,
  setAlerts,
  conditions,
  setConditions,
  allergies,
  setAllergies,
  medications,
  setMedications,
  vaccinations,
  setVaccinations,
}: CardAlertsModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Edit Emergency Card</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <AlertsTab
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
      </div>
    </div>
  );
}
