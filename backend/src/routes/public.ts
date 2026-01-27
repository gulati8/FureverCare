import { Router, Response, Request } from 'express';
import { findPetByShareId } from '../models/pet.js';
import { findUserById } from '../models/user.js';
import {
  getPetVets,
  getPetConditions,
  getPetAllergies,
  getPetMedications,
  getPetVaccinations,
  getPetEmergencyContacts,
} from '../models/health-records.js';
import { cacheGet, cacheSet } from '../db/redis.js';

const router = Router();

// Public endpoint - Get pet emergency card by share ID
// No authentication required
router.get('/card/:shareId', async (req: Request, res: Response) => {
  try {
    const { shareId } = req.params;

    // Try cache first
    const cacheKey = `pet:${shareId}`;
    const cached = await cacheGet<any>(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    // Fetch pet
    const pet = await findPetByShareId(shareId);
    if (!pet) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }

    // Fetch owner info
    const owner = await findUserById(pet.user_id);

    // Fetch all health records in parallel
    const [vets, conditions, allergies, medications, vaccinations, emergencyContacts] = await Promise.all([
      getPetVets(pet.id),
      getPetConditions(pet.id),
      getPetAllergies(pet.id),
      getPetMedications(pet.id),
      getPetVaccinations(pet.id),
      getPetEmergencyContacts(pet.id),
    ]);

    // Calculate age from date of birth
    let age = null;
    if (pet.date_of_birth) {
      const dob = new Date(pet.date_of_birth);
      const now = new Date();
      const years = now.getFullYear() - dob.getFullYear();
      const months = now.getMonth() - dob.getMonth();
      if (years > 0) {
        age = `${years} year${years > 1 ? 's' : ''}`;
      } else if (months > 0) {
        age = `${months} month${months > 1 ? 's' : ''}`;
      } else {
        const days = Math.floor((now.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24));
        age = `${days} day${days !== 1 ? 's' : ''}`;
      }
    }

    const emergencyCard = {
      // Pet basic info
      pet: {
        name: pet.name,
        species: pet.species,
        breed: pet.breed,
        age,
        date_of_birth: pet.date_of_birth,
        weight_kg: pet.weight_kg,
        weight_unit: pet.weight_unit,
        sex: pet.sex,
        microchip_id: pet.microchip_id,
        photo_url: pet.photo_url,
        special_instructions: pet.special_instructions,
      },

      // Owner contact (primary emergency contact)
      owner: owner ? {
        name: owner.name,
        phone: owner.phone,
        email: owner.email,
      } : null,

      // Medical information
      conditions: conditions.map(c => ({
        name: c.name,
        severity: c.severity,
        notes: c.notes,
      })),

      allergies: allergies.map(a => ({
        allergen: a.allergen,
        reaction: a.reaction,
        severity: a.severity,
      })),

      medications: medications
        .filter(m => m.is_active)
        .map(m => ({
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          notes: m.notes,
        })),

      vaccinations: vaccinations.map(v => ({
        name: v.name,
        administered_date: v.administered_date,
        expiration_date: v.expiration_date,
      })),

      // Veterinarian info
      veterinarians: vets.map(v => ({
        clinic_name: v.clinic_name,
        vet_name: v.vet_name,
        phone: v.phone,
        is_primary: v.is_primary,
      })),

      // Additional emergency contacts
      emergency_contacts: emergencyContacts.map(c => ({
        name: c.name,
        relationship: c.relationship,
        phone: c.phone,
        is_primary: c.is_primary,
      })),

      // Metadata
      generated_at: new Date().toISOString(),
    };

    // Cache for 5 minutes
    await cacheSet(cacheKey, emergencyCard, 300);

    res.json(emergencyCard);
  } catch (error) {
    console.error('Error fetching emergency card:', error);
    res.status(500).json({ error: 'Failed to fetch emergency card' });
  }
});

export default router;
