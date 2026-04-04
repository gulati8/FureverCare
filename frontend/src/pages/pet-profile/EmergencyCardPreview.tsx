import { Pet, PetCondition, PetAllergy, PetMedication, PetVaccination, PetAlert, PetEmergencyContact, PetVet, EmergencyCard as EmergencyCardData } from '../../api/client';
import EmergencyCard from '../../components/EmergencyCard';

export default function EmergencyCardPreview({
  pet,
  conditions,
  allergies,
  medications,
  vaccinations,
  alerts,
  contacts,
  vets,
}: {
  pet: Pet;
  conditions: PetCondition[];
  allergies: PetAllergy[];
  medications: PetMedication[];
  vaccinations: PetVaccination[];
  alerts: PetAlert[];
  contacts: PetEmergencyContact[];
  vets: PetVet[];
}) {
  const activeConditions = conditions.filter(c => c.show_on_card && c.is_active);
  const activeAllergies = allergies.filter(a => a.show_on_card);
  const activeMedications = medications.filter(m => m.show_on_card && m.is_active);
  const activeVaccinations = vaccinations.filter(v => v.show_on_card);

  // Build the age string the same way the backend does: numeric years or null
  const ageString: string | null = (() => {
    if (pet.date_of_birth) {
      const years = Math.floor((Date.now() - new Date(pet.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      return `${years} ${years === 1 ? 'year' : 'years'}`;
    }
    if (pet.age != null) {
      return `${pet.age} ${pet.age === 1 ? 'year' : 'years'}`;
    }
    return null;
  })();

  const card: EmergencyCardData = {
    pet: {
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      age: ageString,
      date_of_birth: pet.date_of_birth,
      weight_kg: pet.weight_kg,
      weight_unit: pet.weight_unit,
      sex: pet.sex,
      is_fixed: pet.is_fixed,
      microchip_id: pet.microchip_id,
      photo_url: pet.photo_url,
      special_instructions: pet.special_instructions,
    },
    owner: null,
    conditions: activeConditions.map(c => ({
      name: c.name,
      severity: c.severity,
      notes: c.notes,
    })),
    allergies: activeAllergies.map(a => ({
      allergen: a.allergen,
      reaction: a.reaction,
      severity: a.severity,
    })),
    medications: activeMedications.map(m => ({
      name: m.name,
      dosage: m.dosage,
      frequency: m.frequency,
      notes: m.notes,
    })),
    vaccinations: activeVaccinations.map(v => ({
      name: v.name,
      administered_date: v.administered_date,
      expiration_date: v.expiration_date,
    })),
    veterinarians: vets.map(v => ({
      clinic_name: v.clinic_name,
      vet_name: v.vet_name,
      phone: v.phone,
      is_primary: v.is_primary,
    })),
    emergency_contacts: contacts.map(c => ({
      name: c.name,
      relationship: c.relationship,
      phone: c.phone,
      is_primary: c.is_primary,
    })),
    custom_alerts: alerts.filter(a => a.is_active).map(a => ({
      alert_text: a.alert_text,
    })),
    generated_at: new Date().toISOString(),
  };

  return (
    <div>
      {/* Mobile device frame */}
      <div className="max-w-[375px] rounded-3xl border border-surface-300 shadow-[0_4px_24px_rgba(0,0,0,0.10)] overflow-hidden bg-surface-100">
        <EmergencyCard card={card} />
      </div>

    </div>
  );
}
