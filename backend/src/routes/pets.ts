import { Router, Response } from 'express';
import { z } from 'zod';
import { query as dbQuery } from '../db/pool.js';
import { cacheDelete } from '../db/redis.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { checkPetLimit } from '../middleware/subscription.js';
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
  getPetVets, createPetVet, updatePetVet, deletePetVet, setPrimaryVet,
  getPetConditions, createPetCondition, updatePetCondition, deletePetCondition,
  getPetAllergies, createPetAllergy, updatePetAllergy, deletePetAllergy,
  getPetMedications, createPetMedication, updatePetMedication, deletePetMedication,
  getPetVaccinations, createPetVaccination, updatePetVaccination, deletePetVaccination,
  getPetEmergencyContacts, createPetEmergencyContact, updatePetEmergencyContact, deletePetEmergencyContact, setPrimaryEmergencyContact,
  getPetAlerts, createPetAlert, updatePetAlert, deletePetAlert,
  type PetMedication,
  type PetVaccination,
} from '../models/health-records.js';
import {
  withSignedPetPhoto,
  withSignedPetPhotos,
} from '../services/pet-photo.js';

const router = Router();

// Validation schemas
const createPetSchema = z.object({
  name: z.string().min(1, 'Pet name is required'),
  species: z.string().min(1, 'Species is required'),
  breed: z.string().optional(),
  date_of_birth: z.string().optional(),
  weight_kg: z.number().positive().optional(),
  weight_unit: z.enum(['lbs', 'kg']).optional(),
  sex: z.enum(['male', 'female']).optional(),
  is_fixed: z.boolean().optional(),
  microchip_id: z.string().optional(),
  photo_url: z.string().url().optional(),
  special_instructions: z.string().optional(),
  age: z.number().int().min(0).optional(),
  color_markings: z.string().max(255).optional(),
});

const updatePetSchema = createPetSchema.partial();

const exactDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const nullableExactDateSchema = exactDateSchema.nullable().optional();
const reminderFieldsSchema = z.object({
  reminder_enabled: z.boolean().optional(),
  reminder_channel: z.enum(['email']).nullable().optional(),
  reminder_lead_time_value: z.number().int().positive().nullable().optional(),
  reminder_lead_time_unit: z.enum(['days', 'weeks']).nullable().optional(),
  reminder_next_due_date: nullableExactDateSchema,
  reminder_recurrence_value: z.number().int().positive().nullable().optional(),
  reminder_recurrence_unit: z.enum(['months', 'years']).nullable().optional(),
});

const createMedicationSchema = z.object({
  name: z.string().min(1, 'Medication name is required'),
  dosage: z.string().nullable().optional(),
  frequency: z.string().nullable().optional(),
  start_date: nullableExactDateSchema,
  start_date_precision: z.enum(['day', 'month', 'year']).optional(),
  end_date: nullableExactDateSchema,
  end_date_precision: z.enum(['day', 'month', 'year']).optional(),
  prescribing_vet: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  show_on_card: z.boolean().optional(),
}).merge(reminderFieldsSchema);

const updateMedicationSchema = createMedicationSchema.partial();

const createVaccinationSchema = z.object({
  name: z.string().min(1, 'Vaccination name is required'),
  administered_date: exactDateSchema,
  administered_date_precision: z.enum(['day', 'month', 'year']).optional(),
  expiration_date: nullableExactDateSchema,
  expiration_date_precision: z.enum(['day', 'month', 'year']).optional(),
  administered_by: z.string().nullable().optional(),
  lot_number: z.string().nullable().optional(),
  show_on_card: z.boolean().optional(),
}).merge(reminderFieldsSchema.omit({
  reminder_next_due_date: true,
  reminder_recurrence_value: true,
  reminder_recurrence_unit: true,
}));

const updateVaccinationSchema = createVaccinationSchema.partial();

function toIsoDateString(value: string | Date | null | undefined): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value.slice(0, 10);
  }

  return value.toISOString().slice(0, 10);
}

function isFutureDate(dateString: string): boolean {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const candidate = new Date(`${dateString}T00:00:00.000Z`);
  return candidate > today;
}

function validateMedicationReminderState(
  payload: Partial<PetMedication>,
  existing?: PetMedication
): string | null {
  const reminderEnabled = payload.reminder_enabled ?? existing?.reminder_enabled ?? false;
  if (!reminderEnabled) {
    return null;
  }

  const nextDueDate = toIsoDateString(
    payload.reminder_next_due_date ?? existing?.reminder_next_due_date ?? null
  );
  const leadTimeValue =
    payload.reminder_lead_time_value ?? existing?.reminder_lead_time_value ?? null;
  const leadTimeUnit =
    payload.reminder_lead_time_unit ?? existing?.reminder_lead_time_unit ?? null;
  const recurrenceValue =
    payload.reminder_recurrence_value ?? existing?.reminder_recurrence_value ?? null;
  const recurrenceUnit =
    payload.reminder_recurrence_unit ?? existing?.reminder_recurrence_unit ?? null;

  if (!nextDueDate) {
    return 'Medication reminders require a next due date.';
  }

  if (!isFutureDate(nextDueDate)) {
    return 'Medication reminders require a next due date in the future.';
  }

  if (!leadTimeValue || !leadTimeUnit) {
    return 'Medication reminders require a lead time in days or weeks.';
  }

  if (!recurrenceValue || !recurrenceUnit) {
    return 'Medication reminders require a recurrence interval in months or years.';
  }

  return null;
}

function validateVaccinationReminderState(
  payload: Partial<PetVaccination>,
  existing?: PetVaccination
): string | null {
  const reminderEnabled = payload.reminder_enabled ?? existing?.reminder_enabled ?? false;
  if (!reminderEnabled) {
    return null;
  }

  const expirationDate = toIsoDateString(
    payload.expiration_date ?? existing?.expiration_date ?? null
  );
  const expirationPrecision =
    payload.expiration_date_precision ?? existing?.expiration_date_precision ?? 'day';
  const leadTimeValue =
    payload.reminder_lead_time_value ?? existing?.reminder_lead_time_value ?? null;
  const leadTimeUnit =
    payload.reminder_lead_time_unit ?? existing?.reminder_lead_time_unit ?? null;

  if (!expirationDate) {
    return 'Vaccination reminders require an expiration date.';
  }

  if (expirationPrecision !== 'day') {
    return 'Vaccination reminders require a day-precision expiration date.';
  }

  if (!isFutureDate(expirationDate)) {
    return 'Vaccination reminders require an expiration date in the future.';
  }

  if (!leadTimeValue || !leadTimeUnit) {
    return 'Vaccination reminders require a lead time in days or weeks.';
  }

  return null;
}

// Helper to verify pet access (any role)
async function verifyPetAccess(petId: number, userId: number): Promise<boolean> {
  return userHasPetAccess(petId, userId);
}

// Helper to verify pet edit access (owner or editor)
async function verifyPetEditAccess(petId: number, userId: number): Promise<boolean> {
  return userCanEditPet(petId, userId);
}

// Invalidate the cached emergency card when health records change
async function invalidateCardCache(petId: number): Promise<void> {
  const pet = await findPetById(petId);
  if (pet?.share_id) {
    await cacheDelete(`pet:${pet.share_id}`);
  }
}

// GET /pets - List all pets user has access to
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pets = await findPetsForUser(req.userId!);
    res.json(await withSignedPetPhotos(pets));
  } catch (error) {
    console.error('Error fetching pets:', error);
    res.status(500).json({ error: 'Failed to fetch pets' });
  }
});

// POST /pets - Create a new pet
router.post('/', authenticate, checkPetLimit, validate(createPetSchema), async (req: AuthRequest, res: Response) => {
  try {
    const pet = await createPet({
      user_id: req.userId!,
      ...req.body,
    });

    // Add creator as owner in pet_owners table
    await addPetOwner(pet.id, req.userId!, 'owner');

    res.status(201).json(await withSignedPetPhoto(pet));
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
    res.json(await withSignedPetPhoto({ ...pet, userRole: role }));
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
    res.json(await withSignedPetPhoto(pet));
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

router.patch('/:id/vets/:vetId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!await verifyPetAccess(parseInt(req.params.id), req.userId!)) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }
    const audit = { userId: req.userId!, source: 'manual' as const, ipAddress: req.ip, userAgent: req.headers['user-agent'] };
    const vet = await updatePetVet(parseInt(req.params.vetId), parseInt(req.params.id), req.body, audit);
    if (!vet) {
      res.status(404).json({ error: 'Veterinarian not found' });
      return;
    }
    res.json(vet);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update veterinarian' });
  }
});

router.patch('/:id/vets/:vetId/primary', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.id);
    const vetId = parseInt(req.params.vetId);

    if (!await verifyPetAccess(petId, req.userId!)) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }

    const audit = {
      userId: req.userId!,
      source: 'manual' as const,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };

    await setPrimaryVet(petId, vetId, audit);
    const vets = await getPetVets(petId);
    res.json(vets);
  } catch (error) {
    console.error('Error setting primary vet:', error);
    if (error instanceof Error && error.message === 'Vet not found') {
      res.status(404).json({ error: 'Veterinarian not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to set primary veterinarian' });
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
    await invalidateCardCache(parseInt(req.params.id));
    res.status(201).json(condition);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add condition' });
  }
});

router.patch('/:id/conditions/:conditionId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!await verifyPetAccess(parseInt(req.params.id), req.userId!)) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }
    const audit = { userId: req.userId!, source: 'manual' as const, ipAddress: req.ip, userAgent: req.headers['user-agent'] };
    const condition = await updatePetCondition(parseInt(req.params.conditionId), parseInt(req.params.id), req.body, audit);
    if (!condition) {
      res.status(404).json({ error: 'Condition not found' });
      return;
    }
    await invalidateCardCache(parseInt(req.params.id));
    res.json(condition);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update condition' });
  }
});

router.delete('/:id/conditions/:conditionId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!await verifyPetAccess(parseInt(req.params.id), req.userId!)) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }
    await deletePetCondition(parseInt(req.params.conditionId), parseInt(req.params.id));
    await invalidateCardCache(parseInt(req.params.id));
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
    await invalidateCardCache(parseInt(req.params.id));
    res.status(201).json(allergy);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add allergy' });
  }
});

router.patch('/:id/allergies/:allergyId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!await verifyPetAccess(parseInt(req.params.id), req.userId!)) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }
    const audit = { userId: req.userId!, source: 'manual' as const, ipAddress: req.ip, userAgent: req.headers['user-agent'] };
    const allergy = await updatePetAllergy(parseInt(req.params.allergyId), parseInt(req.params.id), req.body, audit);
    if (!allergy) {
      res.status(404).json({ error: 'Allergy not found' });
      return;
    }
    await invalidateCardCache(parseInt(req.params.id));
    res.json(allergy);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update allergy' });
  }
});

router.delete('/:id/allergies/:allergyId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!await verifyPetAccess(parseInt(req.params.id), req.userId!)) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }
    await deletePetAllergy(parseInt(req.params.allergyId), parseInt(req.params.id));
    await invalidateCardCache(parseInt(req.params.id));
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

router.post('/:id/medications', authenticate, validate(createMedicationSchema), async (req: AuthRequest, res: Response) => {
  try {
    if (!await verifyPetAccess(parseInt(req.params.id), req.userId!)) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }
    const reminderError = validateMedicationReminderState(req.body);
    if (reminderError) {
      res.status(400).json({ error: reminderError });
      return;
    }
    const medication = await createPetMedication(parseInt(req.params.id), req.body);
    await invalidateCardCache(parseInt(req.params.id));
    res.status(201).json(medication);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add medication' });
  }
});

router.patch('/:id/medications/:medId', authenticate, validate(updateMedicationSchema), async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.id);
    if (!await verifyPetAccess(petId, req.userId!)) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }
    const medications = await getPetMedications(petId);
    const existingMedication = medications.find((med) => med.id === parseInt(req.params.medId));
    if (!existingMedication) {
      res.status(404).json({ error: 'Medication not found' });
      return;
    }
    const reminderError = validateMedicationReminderState(req.body, existingMedication);
    if (reminderError) {
      res.status(400).json({ error: reminderError });
      return;
    }
    const medication = await updatePetMedication(parseInt(req.params.medId), petId, req.body);
    if (!medication) {
      res.status(404).json({ error: 'Medication not found' });
      return;
    }
    await invalidateCardCache(petId);
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
    await invalidateCardCache(parseInt(req.params.id));
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

router.post('/:id/vaccinations', authenticate, validate(createVaccinationSchema), async (req: AuthRequest, res: Response) => {
  try {
    if (!await verifyPetAccess(parseInt(req.params.id), req.userId!)) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }
    const reminderError = validateVaccinationReminderState(req.body);
    if (reminderError) {
      res.status(400).json({ error: reminderError });
      return;
    }
    const vaccination = await createPetVaccination(parseInt(req.params.id), req.body);
    await invalidateCardCache(parseInt(req.params.id));
    res.status(201).json(vaccination);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add vaccination' });
  }
});

router.patch('/:id/vaccinations/:vacId', authenticate, validate(updateVaccinationSchema), async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.id);
    if (!await verifyPetAccess(petId, req.userId!)) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }
    const vaccinations = await getPetVaccinations(petId);
    const existingVaccination = vaccinations.find((vac) => vac.id === parseInt(req.params.vacId));
    if (!existingVaccination) {
      res.status(404).json({ error: 'Vaccination not found' });
      return;
    }
    const reminderError = validateVaccinationReminderState(req.body, existingVaccination);
    if (reminderError) {
      res.status(400).json({ error: reminderError });
      return;
    }
    const audit = { userId: req.userId!, source: 'manual' as const, ipAddress: req.ip, userAgent: req.headers['user-agent'] };
    const vaccination = await updatePetVaccination(parseInt(req.params.vacId), petId, req.body, audit);
    if (!vaccination) {
      res.status(404).json({ error: 'Vaccination not found' });
      return;
    }
    await invalidateCardCache(petId);
    res.json(vaccination);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update vaccination' });
  }
});

router.delete('/:id/vaccinations/:vacId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!await verifyPetAccess(parseInt(req.params.id), req.userId!)) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }
    await deletePetVaccination(parseInt(req.params.vacId), parseInt(req.params.id));
    await invalidateCardCache(parseInt(req.params.id));
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
    await invalidateCardCache(parseInt(req.params.id));
    res.status(201).json(contact);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add emergency contact' });
  }
});

router.patch('/:id/emergency-contacts/:contactId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!await verifyPetAccess(parseInt(req.params.id), req.userId!)) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }
    const audit = { userId: req.userId!, source: 'manual' as const, ipAddress: req.ip, userAgent: req.headers['user-agent'] };
    const contact = await updatePetEmergencyContact(parseInt(req.params.contactId), parseInt(req.params.id), req.body, audit);
    if (!contact) {
      res.status(404).json({ error: 'Emergency contact not found' });
      return;
    }
    await invalidateCardCache(parseInt(req.params.id));
    res.json(contact);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update emergency contact' });
  }
});

router.delete('/:id/emergency-contacts/:contactId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!await verifyPetAccess(parseInt(req.params.id), req.userId!)) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }
    await deletePetEmergencyContact(parseInt(req.params.contactId), parseInt(req.params.id));
    await invalidateCardCache(parseInt(req.params.id));
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete emergency contact' });
  }
});

router.patch('/:id/emergency-contacts/:contactId/primary', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.id);
    const contactId = parseInt(req.params.contactId);

    if (!await verifyPetAccess(petId, req.userId!)) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }

    const audit = {
      userId: req.userId!,
      source: 'manual' as const,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };

    await setPrimaryEmergencyContact(petId, contactId, audit);
    await invalidateCardCache(petId);

    const contacts = await getPetEmergencyContacts(petId);
    res.json(contacts);
  } catch (error) {
    console.error('Error setting primary emergency contact:', error);
    if (error instanceof Error && error.message === 'Emergency contact not found') {
      res.status(404).json({ error: 'Emergency contact not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to set primary emergency contact' });
  }
});

// --- Source Document Lookup ---
router.get('/:id/records/:recordType/:recordId/source', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.id);
    if (!await verifyPetAccess(petId, req.userId!)) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }
    const { recordType, recordId } = req.params;

    // Look up in document_extraction_items first (new system)
    // Use the most recently updated item (latest approval/merge)
    const docResult = await dbQuery<any>(
      `SELECT dei.id as extraction_item_id, du.id as upload_id, du.original_filename, du.mime_type as file_type
       FROM document_extraction_items dei
       JOIN document_extractions de ON de.id = dei.extraction_id
       JOIN document_uploads du ON du.id = de.document_upload_id
       WHERE dei.created_record_id = $1
         AND dei.created_record_type = $2
         AND du.pet_id = $3
         AND dei.deleted_at IS NULL
         AND du.deleted_at IS NULL
       ORDER BY dei.updated_at DESC
       LIMIT 1`,
      [parseInt(recordId), recordType, petId]
    );

    if (docResult.length > 0) {
      res.json({ source: 'document_import', upload_id: docResult[0].upload_id, extraction_item_id: docResult[0].extraction_item_id, filename: docResult[0].original_filename, file_type: docResult[0].file_type });
      return;
    }

    // Check pdf_extraction_items (legacy PDF import)
    const pdfResult = await dbQuery<any>(
      `SELECT pei.id, pu.id as upload_id, pu.original_filename, 'pdf' as file_type
       FROM pdf_extraction_items pei
       JOIN pdf_extractions pe ON pe.id = pei.extraction_id
       JOIN pdf_uploads pu ON pu.id = pe.pdf_upload_id
       WHERE pei.created_record_id = $1
         AND pei.created_record_type = $2
         AND pu.pet_id = $3
       LIMIT 1`,
      [parseInt(recordId), recordType, petId]
    );

    if (pdfResult.length > 0) {
      res.json({ source: 'pdf_import', upload_id: pdfResult[0].upload_id, filename: pdfResult[0].original_filename, file_type: pdfResult[0].file_type });
      return;
    }

    // Check image_extraction_items (legacy image import)
    const imgResult = await dbQuery<any>(
      `SELECT iei.id, iu.id as upload_id, iu.original_filename, 'image' as file_type
       FROM image_extraction_items iei
       JOIN image_extractions ie ON ie.id = iei.extraction_id
       JOIN image_uploads iu ON iu.id = ie.image_upload_id
       WHERE iei.created_record_id = $1
         AND iei.created_record_type = $2
         AND iu.pet_id = $3
       LIMIT 1`,
      [parseInt(recordId), recordType, petId]
    );

    if (imgResult.length > 0) {
      res.json({ source: 'image_import', upload_id: imgResult[0].upload_id, filename: imgResult[0].original_filename, file_type: imgResult[0].file_type });
      return;
    }

    // Fall back to audit log
    const auditResult = await dbQuery<any>(
      `SELECT source, source_pdf_upload_id FROM audit_log
       WHERE entity_type = $1 AND entity_id = $2 AND action = 'create'
       ORDER BY created_at ASC LIMIT 1`,
      [recordType, parseInt(recordId)]
    );

    if (auditResult.length > 0 && auditResult[0].source !== 'manual') {
      res.json({ source: auditResult[0].source, upload_id: auditResult[0].source_pdf_upload_id, filename: null, file_type: null });
      return;
    }

    res.json({ source: 'manual', upload_id: null, filename: null, file_type: null });
  } catch (error) {
    console.error('Error looking up record source:', error);
    res.status(500).json({ error: 'Failed to look up record source' });
  }
});

// --- Alerts ---
router.get('/:id/alerts', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!await verifyPetAccess(parseInt(req.params.id), req.userId!)) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }
    const alerts = await getPetAlerts(parseInt(req.params.id));
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

router.post('/:id/alerts', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!await verifyPetAccess(parseInt(req.params.id), req.userId!)) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }
    const audit = { userId: req.userId!, source: 'manual' as const, ipAddress: req.ip, userAgent: req.headers['user-agent'] };
    const alert = await createPetAlert(parseInt(req.params.id), req.body, audit);
    await invalidateCardCache(parseInt(req.params.id));
    res.status(201).json(alert);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add alert' });
  }
});

router.patch('/:id/alerts/:alertId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!await verifyPetAccess(parseInt(req.params.id), req.userId!)) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }
    const audit = { userId: req.userId!, source: 'manual' as const, ipAddress: req.ip, userAgent: req.headers['user-agent'] };
    const alert = await updatePetAlert(parseInt(req.params.alertId), parseInt(req.params.id), req.body, audit);
    if (!alert) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }
    await invalidateCardCache(parseInt(req.params.id));
    res.json(alert);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update alert' });
  }
});

router.delete('/:id/alerts/:alertId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!await verifyPetAccess(parseInt(req.params.id), req.userId!)) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }
    await deletePetAlert(parseInt(req.params.alertId), parseInt(req.params.id));
    await invalidateCardCache(parseInt(req.params.id));
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete alert' });
  }
});

export default router;
