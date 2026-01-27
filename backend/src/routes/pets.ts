import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createPet,
  findPetById,
  findPetsForUser,
  updatePet,
  deletePet,
  regenerateShareId,
} from '../models/pet.js';
import {
  userHasPetAccess,
  userCanEditPet,
  userIsPetOwner,
  addPetOwner,
  getUserPetRole,
} from '../models/pet-owners.js';
import {
  getPetVets, createPetVet, deletePetVet,
  getPetConditions, createPetCondition, deletePetCondition,
  getPetAllergies, createPetAllergy, deletePetAllergy,
  getPetMedications, createPetMedication, updatePetMedication, deletePetMedication,
  getPetVaccinations, createPetVaccination, deletePetVaccination,
  getPetEmergencyContacts, createPetEmergencyContact, deletePetEmergencyContact,
} from '../models/health-records.js';

const router = Router();

// Validation schemas
const createPetSchema = z.object({
  name: z.string().min(1, 'Pet name is required'),
  species: z.string().min(1, 'Species is required'),
  breed: z.string().optional(),
  date_of_birth: z.string().optional(),
  weight_kg: z.number().positive().optional(),
  weight_unit: z.enum(['lbs', 'kg']).optional(),
  sex: z.string().optional(),
  microchip_id: z.string().optional(),
  photo_url: z.string().url().optional(),
  special_instructions: z.string().optional(),
});

const updatePetSchema = createPetSchema.partial();

// Helper to verify pet access (any role)
async function verifyPetAccess(petId: number, userId: number): Promise<boolean> {
  return userHasPetAccess(petId, userId);
}

// Helper to verify pet edit access (owner or editor)
async function verifyPetEditAccess(petId: number, userId: number): Promise<boolean> {
  return userCanEditPet(petId, userId);
}

// GET /pets - List all pets user has access to
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pets = await findPetsForUser(req.userId!);
    res.json(pets);
  } catch (error) {
    console.error('Error fetching pets:', error);
    res.status(500).json({ error: 'Failed to fetch pets' });
  }
});

// POST /pets - Create a new pet
router.post('/', authenticate, validate(createPetSchema), async (req: AuthRequest, res: Response) => {
  try {
    const pet = await createPet({
      user_id: req.userId!,
      ...req.body,
    });

    // Add creator as owner in pet_owners table
    await addPetOwner(pet.id, req.userId!, 'owner');

    res.status(201).json(pet);
  } catch (error) {
    console.error('Error creating pet:', error);
    res.status(500).json({ error: 'Failed to create pet' });
  }
});

// GET /pets/:id - Get a specific pet
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.id);
    const pet = await findPetById(petId);

    if (!pet) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }

    // Check access via pet_owners
    const hasAccess = await verifyPetAccess(petId, req.userId!);
    if (!hasAccess) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }

    // Include user's role in the response
    const role = await getUserPetRole(petId, req.userId!);
    res.json({ ...pet, userRole: role });
  } catch (error) {
    console.error('Error fetching pet:', error);
    res.status(500).json({ error: 'Failed to fetch pet' });
  }
});

// PATCH /pets/:id - Update a pet
router.patch('/:id', authenticate, validate(updatePetSchema), async (req: AuthRequest, res: Response) => {
  try {
    const pet = await updatePet(parseInt(req.params.id), req.userId!, req.body);
    if (!pet) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }
    res.json(pet);
  } catch (error) {
    console.error('Error updating pet:', error);
    res.status(500).json({ error: 'Failed to update pet' });
  }
});

// DELETE /pets/:id - Delete a pet
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const deleted = await deletePet(parseInt(req.params.id), req.userId!);
    if (!deleted) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting pet:', error);
    res.status(500).json({ error: 'Failed to delete pet' });
  }
});

// POST /pets/:id/regenerate-share-id - Generate a new share ID
router.post('/:id/regenerate-share-id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pet = await regenerateShareId(parseInt(req.params.id), req.userId!);
    if (!pet) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }
    res.json({ share_id: pet.share_id });
  } catch (error) {
    console.error('Error regenerating share ID:', error);
    res.status(500).json({ error: 'Failed to regenerate share ID' });
  }
});

// ============ Health Records Sub-routes ============

// --- Veterinarians ---
router.get('/:id/vets', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!await verifyPetAccess(parseInt(req.params.id), req.userId!)) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }
    const vets = await getPetVets(parseInt(req.params.id));
    res.json(vets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch veterinarians' });
  }
});

router.post('/:id/vets', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!await verifyPetAccess(parseInt(req.params.id), req.userId!)) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }
    const vet = await createPetVet(parseInt(req.params.id), req.body);
    res.status(201).json(vet);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add veterinarian' });
  }
});

router.delete('/:id/vets/:vetId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!await verifyPetAccess(parseInt(req.params.id), req.userId!)) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }
    await deletePetVet(parseInt(req.params.vetId), parseInt(req.params.id));
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete veterinarian' });
  }
});

// --- Conditions ---
router.get('/:id/conditions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!await verifyPetAccess(parseInt(req.params.id), req.userId!)) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }
    const conditions = await getPetConditions(parseInt(req.params.id));
    res.json(conditions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch conditions' });
  }
});

router.post('/:id/conditions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!await verifyPetAccess(parseInt(req.params.id), req.userId!)) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }
    const condition = await createPetCondition(parseInt(req.params.id), req.body);
    res.status(201).json(condition);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add condition' });
  }
});

router.delete('/:id/conditions/:conditionId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!await verifyPetAccess(parseInt(req.params.id), req.userId!)) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }
    await deletePetCondition(parseInt(req.params.conditionId), parseInt(req.params.id));
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete condition' });
  }
});

// --- Allergies ---
router.get('/:id/allergies', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!await verifyPetAccess(parseInt(req.params.id), req.userId!)) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }
    const allergies = await getPetAllergies(parseInt(req.params.id));
    res.json(allergies);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch allergies' });
  }
});

router.post('/:id/allergies', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!await verifyPetAccess(parseInt(req.params.id), req.userId!)) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }
    const allergy = await createPetAllergy(parseInt(req.params.id), req.body);
    res.status(201).json(allergy);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add allergy' });
  }
});

router.delete('/:id/allergies/:allergyId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!await verifyPetAccess(parseInt(req.params.id), req.userId!)) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }
    await deletePetAllergy(parseInt(req.params.allergyId), parseInt(req.params.id));
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete allergy' });
  }
});

// --- Medications ---
router.get('/:id/medications', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!await verifyPetAccess(parseInt(req.params.id), req.userId!)) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }
    const medications = await getPetMedications(parseInt(req.params.id));
    res.json(medications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch medications' });
  }
});

router.post('/:id/medications', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!await verifyPetAccess(parseInt(req.params.id), req.userId!)) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }
    const medication = await createPetMedication(parseInt(req.params.id), req.body);
    res.status(201).json(medication);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add medication' });
  }
});

router.patch('/:id/medications/:medId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!await verifyPetAccess(parseInt(req.params.id), req.userId!)) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }
    const medication = await updatePetMedication(parseInt(req.params.medId), parseInt(req.params.id), req.body);
    if (!medication) {
      res.status(404).json({ error: 'Medication not found' });
      return;
    }
    res.json(medication);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update medication' });
  }
});

router.delete('/:id/medications/:medId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!await verifyPetAccess(parseInt(req.params.id), req.userId!)) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }
    await deletePetMedication(parseInt(req.params.medId), parseInt(req.params.id));
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete medication' });
  }
});

// --- Vaccinations ---
router.get('/:id/vaccinations', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!await verifyPetAccess(parseInt(req.params.id), req.userId!)) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }
    const vaccinations = await getPetVaccinations(parseInt(req.params.id));
    res.json(vaccinations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vaccinations' });
  }
});

router.post('/:id/vaccinations', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!await verifyPetAccess(parseInt(req.params.id), req.userId!)) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }
    const vaccination = await createPetVaccination(parseInt(req.params.id), req.body);
    res.status(201).json(vaccination);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add vaccination' });
  }
});

router.delete('/:id/vaccinations/:vacId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!await verifyPetAccess(parseInt(req.params.id), req.userId!)) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }
    await deletePetVaccination(parseInt(req.params.vacId), parseInt(req.params.id));
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete vaccination' });
  }
});

// --- Emergency Contacts ---
router.get('/:id/emergency-contacts', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!await verifyPetAccess(parseInt(req.params.id), req.userId!)) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }
    const contacts = await getPetEmergencyContacts(parseInt(req.params.id));
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch emergency contacts' });
  }
});

router.post('/:id/emergency-contacts', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!await verifyPetAccess(parseInt(req.params.id), req.userId!)) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }
    const contact = await createPetEmergencyContact(parseInt(req.params.id), req.body);
    res.status(201).json(contact);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add emergency contact' });
  }
});

router.delete('/:id/emergency-contacts/:contactId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!await verifyPetAccess(parseInt(req.params.id), req.userId!)) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }
    await deletePetEmergencyContact(parseInt(req.params.contactId), parseInt(req.params.id));
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete emergency contact' });
  }
});

export default router;
