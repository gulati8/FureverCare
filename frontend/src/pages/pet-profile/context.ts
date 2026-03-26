import { SetStateAction } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Pet,
  PetVet,
  PetCondition,
  PetAllergy,
  PetMedication,
  PetVaccination,
  PetEmergencyContact,
  PetAlert,
} from '../../api/client';

export interface PetProfileContext {
  pet: Pet;
  petId: number;
  token: string;
  isPremium: boolean;
  // Health data
  vets: PetVet[];
  setVets: (v: PetVet[]) => void;
  conditions: PetCondition[];
  setConditions: (value: SetStateAction<PetCondition[]>) => void;
  allergies: PetAllergy[];
  setAllergies: (value: SetStateAction<PetAllergy[]>) => void;
  medications: PetMedication[];
  setMedications: (value: SetStateAction<PetMedication[]>) => void;
  vaccinations: PetVaccination[];
  setVaccinations: (value: SetStateAction<PetVaccination[]>) => void;
  emergencyContacts: PetEmergencyContact[];
  setEmergencyContacts: (c: PetEmergencyContact[]) => void;
  alerts: PetAlert[];
  setAlerts: (a: PetAlert[]) => void;
  // Handlers
  handlePetUpdated: (pet: Pet) => void;
  handleNavigateToReview: (uploadId: number, highlightItemId: number) => void;
  loadPetData: () => Promise<void>;
  // Share
  setShowShareModal: (show: boolean) => void;
  // Doc navigation
  pendingDocNav: { uploadId: number; highlightItemId: number } | null;
  setPendingDocNav: (nav: { uploadId: number; highlightItemId: number } | null) => void;
}

export function usePetProfileContext() {
  return useOutletContext<PetProfileContext>();
}
