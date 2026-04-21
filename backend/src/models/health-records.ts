import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import { logCreate, logUpdate, logDelete } from '../services/audit-logger.js';
import {
  computeMatchScore,
  computeMultiFieldMatchScore,
  DEFAULT_MATCH_THRESHOLD,
} from '../services/match-scoring.js';
import {
  deleteReminderRuleForRecord,
  type ReminderConfigFields,
  type ReminderRule,
  upsertReminderRuleForRecord,
} from './reminders.js';
import { stripUndefined, toNullableDate } from './prisma-helpers.js';

type DatePrecision = 'day' | 'month' | 'year';
type PrismaClientLike = typeof prisma | Prisma.TransactionClient;

// Audit context for tracking changes
export interface AuditContext {
  userId: number;
  source?: 'manual' | 'pdf_import';
  sourcePdfUploadId?: number;
  ipAddress?: string;
  userAgent?: string;
}

function extractReminderConfig(
  values: Partial<ReminderConfigFields>
): ReminderConfigFields {
  return {
    reminder_enabled: values.reminder_enabled ?? false,
    reminder_channel: values.reminder_channel ?? null,
    reminder_lead_time_value: values.reminder_lead_time_value ?? null,
    reminder_lead_time_unit: values.reminder_lead_time_unit ?? null,
    reminder_next_due_date: toNullableDate(values.reminder_next_due_date) ?? null,
    reminder_recurrence_value: values.reminder_recurrence_value ?? null,
    reminder_recurrence_unit: values.reminder_recurrence_unit ?? null,
  };
}

function mapReminderConfig(rule?: ReminderRule | null): ReminderConfigFields {
  return {
    reminder_enabled: rule?.is_enabled ?? false,
    reminder_channel: (rule?.channel as 'email' | null) ?? null,
    reminder_lead_time_value: rule?.lead_time_value ?? null,
    reminder_lead_time_unit:
      (rule?.lead_time_unit as 'days' | 'weeks' | null) ?? null,
    reminder_next_due_date: rule?.next_due_date ?? null,
    reminder_recurrence_value: rule?.recurrence_value ?? null,
    reminder_recurrence_unit:
      (rule?.recurrence_unit as 'months' | 'years' | null) ?? null,
  };
}

async function getReminderRuleForRecord(
  client: PrismaClientLike,
  recordType: 'medication' | 'vaccination',
  recordId: number
): Promise<ReminderRule | null> {
  const rule = await client.pet_reminder_rules.findFirst({
    where: {
      record_type: recordType,
      record_id: recordId,
      channel: 'email',
    },
  });

  if (!rule) {
    return null;
  }

  return {
    id: rule.id,
    pet_id: rule.pet_id,
    record_type: rule.record_type as 'medication' | 'vaccination',
    record_id: rule.record_id,
    channel: rule.channel as 'email',
    lead_time_value: rule.lead_time_value,
    lead_time_unit: rule.lead_time_unit as 'days' | 'weeks',
    next_due_date: rule.next_due_date,
    recurrence_value: rule.recurrence_value,
    recurrence_unit: rule.recurrence_unit as 'months' | 'years' | null,
    is_enabled: rule.is_enabled,
    created_by_user_id: rule.created_by_user_id,
    updated_by_user_id: rule.updated_by_user_id,
    created_at: rule.created_at ?? new Date(),
    updated_at: rule.updated_at ?? new Date(),
  };
}

function mapPetVet(record: Record<string, any>): PetVet {
  return {
    ...record,
    is_primary: record.is_primary ?? false,
    created_at: record.created_at ?? new Date(),
  } as PetVet;
}

function mapPetCondition(record: Record<string, any>): PetCondition {
  return {
    ...record,
    diagnosed_date_precision:
      (record.diagnosed_date_precision as DatePrecision | null) ?? 'day',
    is_active: record.is_active ?? true,
    show_on_card: record.show_on_card ?? false,
    created_at: record.created_at ?? new Date(),
  } as PetCondition;
}

function mapPetAllergy(record: Record<string, any>): PetAllergy {
  return {
    ...record,
    show_on_card: record.show_on_card ?? false,
    created_at: record.created_at ?? new Date(),
  } as PetAllergy;
}

function mapPetMedication(
  record: Record<string, any>,
  reminderRule?: ReminderRule | null
): PetMedication {
  return {
    ...record,
    start_date_precision: (record.start_date_precision as DatePrecision | null) ?? 'day',
    end_date_precision: (record.end_date_precision as DatePrecision | null) ?? 'day',
    is_active: record.is_active ?? true,
    show_on_card: record.show_on_card ?? false,
    created_at: record.created_at ?? new Date(),
    ...mapReminderConfig(reminderRule),
  } as PetMedication;
}

function mapPetVaccination(
  record: Record<string, any>,
  reminderRule?: ReminderRule | null
): PetVaccination {
  return {
    ...record,
    administered_date_precision:
      (record.administered_date_precision as DatePrecision | null) ?? 'day',
    expiration_date_precision:
      (record.expiration_date_precision as DatePrecision | null) ?? 'day',
    show_on_card: record.show_on_card ?? false,
    created_at: record.created_at ?? new Date(),
    ...mapReminderConfig(reminderRule),
  } as PetVaccination;
}

function mapPetEmergencyContact(record: Record<string, any>): PetEmergencyContact {
  return {
    ...record,
    is_primary: record.is_primary ?? false,
    created_at: record.created_at ?? new Date(),
  } as PetEmergencyContact;
}

function mapPetAlert(record: Record<string, any>): PetAlert {
  return {
    ...record,
    is_active: record.is_active ?? true,
    created_at: record.created_at ?? new Date(),
  } as PetAlert;
}

async function findMedicationWithReminder(
  client: PrismaClientLike,
  petId: number,
  medicationId: number
): Promise<PetMedication | null> {
  const medication = await client.pet_medications.findFirst({
    where: {
      id: medicationId,
      pet_id: petId,
    },
  });

  if (!medication) {
    return null;
  }

  const reminderRule = await getReminderRuleForRecord(client, 'medication', medication.id);
  return mapPetMedication(medication, reminderRule);
}

async function findVaccinationWithReminder(
  client: PrismaClientLike,
  petId: number,
  vaccinationId: number
): Promise<PetVaccination | null> {
  const vaccination = await client.pet_vaccinations.findFirst({
    where: {
      id: vaccinationId,
      pet_id: petId,
    },
  });

  if (!vaccination) {
    return null;
  }

  const reminderRule = await getReminderRuleForRecord(client, 'vaccination', vaccination.id);
  return mapPetVaccination(vaccination, reminderRule);
}

// Veterinarian
export interface PetVet {
  id: number;
  pet_id: number;
  clinic_name: string;
  vet_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  is_primary: boolean;
  created_at: Date;
}

export async function createPetVet(
  petId: number,
  data: Omit<PetVet, 'id' | 'pet_id' | 'created_at'>,
  audit?: AuditContext
): Promise<PetVet> {
  let isPrimary = data.is_primary;
  if (isPrimary === undefined) {
    const existingVetCount = await prisma.pet_vets.count({
      where: {
        pet_id: petId,
      },
    });
    isPrimary = existingVetCount === 0;
  }

  const result = await prisma.pet_vets.create({
    data: {
      pet_id: petId,
      clinic_name: data.clinic_name,
      vet_name: data.vet_name,
      phone: data.phone,
      email: data.email,
      address: data.address,
      is_primary: isPrimary,
    },
  });

  const vet = mapPetVet(result);

  if (audit) {
    await logCreate('pet_vets', vet.id, data, audit.userId, {
      source: audit.source,
      sourcePdfUploadId: audit.sourcePdfUploadId,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });
  }

  return vet;
}

export async function getPetVets(petId: number): Promise<PetVet[]> {
  const vets = await prisma.pet_vets.findMany({
    where: {
      pet_id: petId,
    },
    orderBy: [
      {
        is_primary: 'desc',
      },
      {
        created_at: 'asc',
      },
    ],
  });

  return vets.map(mapPetVet);
}

export async function updatePetVet(
  id: number,
  petId: number,
  updates: Partial<Omit<PetVet, 'id' | 'pet_id' | 'created_at'>>,
  audit?: AuditContext
): Promise<PetVet | null> {
  const existing = await prisma.pet_vets.findFirst({
    where: {
      id,
      pet_id: petId,
    },
  });

  const data = stripUndefined({
    clinic_name: updates.clinic_name,
    vet_name: updates.vet_name,
    phone: updates.phone,
    email: updates.email,
    address: updates.address,
    is_primary: updates.is_primary,
  });

  if (Object.keys(data).length === 0) {
    return null;
  }

  const records = await prisma.pet_vets.updateManyAndReturn({
    where: {
      id,
      pet_id: petId,
    },
    data,
  });

  const result = records[0] ? mapPetVet(records[0]) : null;

  if (audit && existing && result) {
    await logUpdate('pet_vets', id, mapPetVet(existing), result, audit.userId, {
      source: audit.source,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });
  }

  return result;
}

export async function findDuplicateVets(
  petId: number,
  clinicName: string,
  vetName?: string,
  threshold: number = DEFAULT_MATCH_THRESHOLD
): Promise<{ vet: PetVet; score: number }[]> {
  const allVets = await getPetVets(petId);
  const matches: { vet: PetVet; score: number }[] = [];

  for (const vet of allVets) {
    const fields: { a: string; b: string; weight: number }[] = [
      { a: clinicName, b: vet.clinic_name, weight: 0.7 },
    ];

    if (vetName && vet.vet_name) {
      fields.push({ a: vetName, b: vet.vet_name, weight: 0.3 });
    }

    const score = computeMultiFieldMatchScore(fields);
    if (score >= threshold) {
      matches.push({ vet, score });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}

export async function deletePetVet(
  id: number,
  petId: number,
  audit?: AuditContext
): Promise<boolean> {
  const existing = await prisma.pet_vets.findFirst({
    where: {
      id,
      pet_id: petId,
    },
  });

  await prisma.pet_vets.deleteMany({
    where: {
      id,
      pet_id: petId,
    },
  });

  if (audit && existing) {
    await logDelete('pet_vets', id, mapPetVet(existing), audit.userId, {
      source: audit.source,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });
  }

  return true;
}

export async function setPrimaryVet(
  petId: number,
  vetId: number,
  audit?: AuditContext
): Promise<PetVet> {
  return prisma.$transaction(async (tx) => {
    const targetVet = await tx.pet_vets.findFirst({
      where: {
        id: vetId,
        pet_id: petId,
      },
    });

    if (!targetVet) {
      throw new Error('Vet not found');
    }

    const oldVets = (await tx.pet_vets.findMany({
      where: {
        pet_id: petId,
      },
    })).map(mapPetVet);

    await tx.pet_vets.updateMany({
      where: {
        pet_id: petId,
      },
      data: {
        is_primary: false,
      },
    });

    const updatedRecords = await tx.pet_vets.updateManyAndReturn({
      where: {
        id: vetId,
        pet_id: petId,
      },
      data: {
        is_primary: true,
      },
    });

    const updatedVet = updatedRecords[0] ? mapPetVet(updatedRecords[0]) : null;
    if (!updatedVet) {
      throw new Error('Vet not found');
    }

    if (audit) {
      const oldVet = oldVets.find((vet) => vet.id === vetId);
      if (oldVet) {
        await logUpdate('pet_vets', vetId, oldVet, updatedVet, audit.userId, {
          source: audit.source || 'manual',
          ipAddress: audit.ipAddress,
          userAgent: audit.userAgent,
        });
      }

      for (const oldVetEntry of oldVets) {
        if (oldVetEntry.id !== vetId && oldVetEntry.is_primary) {
          await logUpdate(
            'pet_vets',
            oldVetEntry.id,
            oldVetEntry,
            { ...oldVetEntry, is_primary: false },
            audit.userId,
            {
              source: audit.source || 'manual',
              ipAddress: audit.ipAddress,
              userAgent: audit.userAgent,
            }
          );
        }
      }
    }

    return updatedVet;
  });
}

// Medical Conditions
export interface PetCondition {
  id: number;
  pet_id: number;
  name: string;
  diagnosed_date: Date | null;
  diagnosed_date_precision: DatePrecision;
  notes: string | null;
  severity: string | null;
  is_active: boolean;
  show_on_card: boolean;
  created_at: Date;
}

export async function createPetCondition(
  petId: number,
  data: Omit<PetCondition, 'id' | 'pet_id' | 'created_at'>,
  audit?: AuditContext
): Promise<PetCondition> {
  const result = await prisma.pet_conditions.create({
    data: {
      pet_id: petId,
      name: data.name,
      diagnosed_date: data.diagnosed_date,
      diagnosed_date_precision: data.diagnosed_date_precision || 'day',
      notes: data.notes,
      severity: data.severity,
      is_active: data.is_active ?? true,
      show_on_card: data.show_on_card ?? false,
    },
  });

  const condition = mapPetCondition(result);

  if (audit) {
    await logCreate('pet_conditions', condition.id, data, audit.userId, {
      source: audit.source,
      sourcePdfUploadId: audit.sourcePdfUploadId,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });
  }

  return condition;
}

export async function getPetConditions(petId: number): Promise<PetCondition[]> {
  const conditions = await prisma.pet_conditions.findMany({
    where: {
      pet_id: petId,
    },
    orderBy: [
      {
        is_active: 'desc',
      },
      {
        created_at: 'desc',
      },
    ],
  });

  return conditions.map(mapPetCondition);
}

export async function updatePetCondition(
  id: number,
  petId: number,
  updates: Partial<Omit<PetCondition, 'id' | 'pet_id' | 'created_at'>>,
  audit?: AuditContext
): Promise<PetCondition | null> {
  const existing = await prisma.pet_conditions.findFirst({
    where: {
      id,
      pet_id: petId,
    },
  });

  const data = stripUndefined({
    name: updates.name,
    diagnosed_date: updates.diagnosed_date,
    diagnosed_date_precision: updates.diagnosed_date_precision,
    notes: updates.notes,
    severity: updates.severity,
    is_active: updates.is_active,
    show_on_card: updates.show_on_card,
  });

  if (Object.keys(data).length === 0) {
    return null;
  }

  const records = await prisma.pet_conditions.updateManyAndReturn({
    where: {
      id,
      pet_id: petId,
    },
    data,
  });

  const result = records[0] ? mapPetCondition(records[0]) : null;

  if (audit && existing && result) {
    await logUpdate(
      'pet_conditions',
      id,
      mapPetCondition(existing),
      result,
      audit.userId,
      {
        source: audit.source,
        ipAddress: audit.ipAddress,
        userAgent: audit.userAgent,
      }
    );
  }

  return result;
}

export async function findDuplicateConditions(
  petId: number,
  name: string,
  threshold: number = DEFAULT_MATCH_THRESHOLD
): Promise<{ condition: PetCondition; score: number }[]> {
  const allConditions = await getPetConditions(petId);
  const matches: { condition: PetCondition; score: number }[] = [];

  for (const condition of allConditions) {
    const score = computeMatchScore(name, condition.name);
    if (score >= threshold) {
      matches.push({ condition, score });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}

export async function deletePetCondition(
  id: number,
  petId: number,
  audit?: AuditContext
): Promise<boolean> {
  const existing = await prisma.pet_conditions.findFirst({
    where: {
      id,
      pet_id: petId,
    },
  });

  await prisma.pet_conditions.deleteMany({
    where: {
      id,
      pet_id: petId,
    },
  });

  if (audit && existing) {
    await logDelete('pet_conditions', id, mapPetCondition(existing), audit.userId, {
      source: audit.source,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });
  }

  return true;
}

// Allergies
export interface PetAllergy {
  id: number;
  pet_id: number;
  allergen: string;
  reaction: string | null;
  severity: string | null;
  show_on_card: boolean;
  created_at: Date;
}

export async function createPetAllergy(
  petId: number,
  data: Omit<PetAllergy, 'id' | 'pet_id' | 'created_at'>,
  audit?: AuditContext
): Promise<PetAllergy> {
  const showOnCard =
    data.show_on_card ?? (data.severity === 'life-threatening' || data.severity === 'severe');

  const result = await prisma.pet_allergies.create({
    data: {
      pet_id: petId,
      allergen: data.allergen,
      reaction: data.reaction,
      severity: data.severity,
      show_on_card: showOnCard,
    },
  });

  const allergy = mapPetAllergy(result);

  if (audit) {
    await logCreate('pet_allergies', allergy.id, data, audit.userId, {
      source: audit.source,
      sourcePdfUploadId: audit.sourcePdfUploadId,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });
  }

  return allergy;
}

export async function getPetAllergies(petId: number): Promise<PetAllergy[]> {
  const allergies = await prisma.pet_allergies.findMany({
    where: {
      pet_id: petId,
    },
    orderBy: {
      created_at: 'desc',
    },
  });

  return allergies.map(mapPetAllergy);
}

export async function updatePetAllergy(
  id: number,
  petId: number,
  updates: Partial<Omit<PetAllergy, 'id' | 'pet_id' | 'created_at'>>,
  audit?: AuditContext
): Promise<PetAllergy | null> {
  const existing = await prisma.pet_allergies.findFirst({
    where: {
      id,
      pet_id: petId,
    },
  });

  const data = stripUndefined({
    allergen: updates.allergen,
    reaction: updates.reaction,
    severity: updates.severity,
    show_on_card: updates.show_on_card,
  });

  if (Object.keys(data).length === 0) {
    return null;
  }

  const records = await prisma.pet_allergies.updateManyAndReturn({
    where: {
      id,
      pet_id: petId,
    },
    data,
  });

  const result = records[0] ? mapPetAllergy(records[0]) : null;

  if (audit && existing && result) {
    await logUpdate(
      'pet_allergies',
      id,
      mapPetAllergy(existing),
      result,
      audit.userId,
      {
        source: audit.source,
        ipAddress: audit.ipAddress,
        userAgent: audit.userAgent,
      }
    );
  }

  return result;
}

export async function deletePetAllergy(
  id: number,
  petId: number,
  audit?: AuditContext
): Promise<boolean> {
  const existing = await prisma.pet_allergies.findFirst({
    where: {
      id,
      pet_id: petId,
    },
  });

  await prisma.pet_allergies.deleteMany({
    where: {
      id,
      pet_id: petId,
    },
  });

  if (audit && existing) {
    await logDelete('pet_allergies', id, mapPetAllergy(existing), audit.userId, {
      source: audit.source,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });
  }

  return true;
}

// Medications
export interface PetMedication {
  id: number;
  pet_id: number;
  name: string;
  dosage: string | null;
  frequency: string | null;
  start_date: Date | null;
  start_date_precision: DatePrecision;
  end_date: Date | null;
  end_date_precision: DatePrecision;
  prescribing_vet: string | null;
  notes: string | null;
  is_active: boolean;
  show_on_card: boolean;
  reminder_enabled: boolean;
  reminder_channel: 'email' | null;
  reminder_lead_time_value: number | null;
  reminder_lead_time_unit: 'days' | 'weeks' | null;
  reminder_next_due_date: Date | null;
  reminder_recurrence_value: number | null;
  reminder_recurrence_unit: 'months' | 'years' | null;
  created_at: Date;
}

export async function createPetMedication(
  petId: number,
  data: Omit<PetMedication, 'id' | 'pet_id' | 'created_at'>,
  audit?: AuditContext
): Promise<PetMedication> {
  const reminder = extractReminderConfig(data);

  const result = await prisma.$transaction(async (tx) => {
    const medication = await tx.pet_medications.create({
      data: {
        pet_id: petId,
        name: data.name,
        dosage: data.dosage,
        frequency: data.frequency,
        start_date: toNullableDate(data.start_date) ?? null,
        start_date_precision: data.start_date_precision || 'day',
        end_date: toNullableDate(data.end_date) ?? null,
        end_date_precision: data.end_date_precision || 'day',
        prescribing_vet: data.prescribing_vet,
        notes: data.notes,
        is_active: data.is_active ?? true,
        show_on_card: data.show_on_card ?? false,
      },
    });

    await upsertReminderRuleForRecord(tx, {
      petId,
      recordType: 'medication',
      recordId: medication.id,
      reminder,
      userId: audit?.userId,
    });

    return findMedicationWithReminder(tx, petId, medication.id);
  });

  if (!result) {
    throw new Error('Failed to create medication');
  }

  if (audit) {
    await logCreate('pet_medications', result.id, data, audit.userId, {
      source: audit.source,
      sourcePdfUploadId: audit.sourcePdfUploadId,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });
  }

  return result;
}

export async function getPetMedications(petId: number): Promise<PetMedication[]> {
  const [medications, reminderRules] = await Promise.all([
    prisma.pet_medications.findMany({
      where: {
        pet_id: petId,
      },
      orderBy: [
        {
          is_active: 'desc',
        },
        {
          created_at: 'desc',
        },
      ],
    }),
    prisma.pet_reminder_rules.findMany({
      where: {
        pet_id: petId,
        record_type: 'medication',
        channel: 'email',
      },
    }),
  ]);

  const reminderMap = new Map(
    reminderRules.map((rule) => [
      rule.record_id,
      {
        id: rule.id,
        pet_id: rule.pet_id,
        record_type: rule.record_type as 'medication',
        record_id: rule.record_id,
        channel: rule.channel as 'email',
        lead_time_value: rule.lead_time_value,
        lead_time_unit: rule.lead_time_unit as 'days' | 'weeks',
        next_due_date: rule.next_due_date,
        recurrence_value: rule.recurrence_value,
        recurrence_unit: rule.recurrence_unit as 'months' | 'years' | null,
        is_enabled: rule.is_enabled,
        created_by_user_id: rule.created_by_user_id,
        updated_by_user_id: rule.updated_by_user_id,
        created_at: rule.created_at ?? new Date(),
        updated_at: rule.updated_at ?? new Date(),
      } satisfies ReminderRule,
    ])
  );

  return medications.map((medication) =>
    mapPetMedication(medication, reminderMap.get(medication.id))
  );
}

export async function findPetMedicationByName(
  petId: number,
  name: string,
  threshold: number = 0.9
): Promise<{ medication: PetMedication; score: number } | null> {
  const allMedications = await getPetMedications(petId);

  let bestMatch: { medication: PetMedication; score: number } | null = null;

  for (const medication of allMedications) {
    const score = computeMatchScore(name, medication.name);
    if (score >= threshold && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { medication, score };
    }
  }

  return bestMatch;
}

export async function findDuplicateMedications(
  petId: number,
  name: string,
  threshold: number = DEFAULT_MATCH_THRESHOLD
): Promise<{ medication: PetMedication; score: number }[]> {
  const allMedications = await getPetMedications(petId);
  const matches: { medication: PetMedication; score: number }[] = [];

  for (const medication of allMedications) {
    const score = computeMatchScore(name, medication.name);
    if (score >= threshold) {
      matches.push({ medication, score });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}

export async function updatePetMedication(
  id: number,
  petId: number,
  updates: Partial<Omit<PetMedication, 'id' | 'pet_id' | 'created_at'>>,
  audit?: AuditContext
): Promise<PetMedication | null> {
  const existing = await findMedicationWithReminder(prisma, petId, id);

  const reminder = extractReminderConfig({
    reminder_enabled: updates.reminder_enabled ?? existing?.reminder_enabled ?? false,
    reminder_channel: updates.reminder_channel ?? existing?.reminder_channel ?? null,
    reminder_lead_time_value:
      updates.reminder_lead_time_value ?? existing?.reminder_lead_time_value ?? null,
    reminder_lead_time_unit:
      updates.reminder_lead_time_unit ?? existing?.reminder_lead_time_unit ?? null,
    reminder_next_due_date:
      updates.reminder_next_due_date ?? existing?.reminder_next_due_date ?? null,
    reminder_recurrence_value:
      updates.reminder_recurrence_value ?? existing?.reminder_recurrence_value ?? null,
    reminder_recurrence_unit:
      updates.reminder_recurrence_unit ?? existing?.reminder_recurrence_unit ?? null,
  });

  const data = stripUndefined({
    name: updates.name,
    dosage: updates.dosage,
    frequency: updates.frequency,
    start_date: toNullableDate(updates.start_date),
    start_date_precision: updates.start_date_precision,
    end_date: toNullableDate(updates.end_date),
    end_date_precision: updates.end_date_precision,
    prescribing_vet: updates.prescribing_vet,
    notes: updates.notes,
    is_active: updates.is_active,
    show_on_card: updates.show_on_card,
  });

  const result = await prisma.$transaction(async (tx) => {
    if (!existing) {
      return null;
    }

    if (Object.keys(data).length > 0) {
      await tx.pet_medications.updateMany({
        where: {
          id,
          pet_id: petId,
        },
        data,
      });
    }

    await upsertReminderRuleForRecord(tx, {
      petId,
      recordType: 'medication',
      recordId: id,
      reminder,
      userId: audit?.userId,
    });

    return findMedicationWithReminder(tx, petId, id);
  });

  if (audit && existing && result) {
    await logUpdate('pet_medications', id, existing, result, audit.userId, {
      source: audit.source,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });
  }

  return result;
}

export async function deletePetMedication(
  id: number,
  petId: number,
  audit?: AuditContext
): Promise<boolean> {
  const existing = await findMedicationWithReminder(prisma, petId, id);

  await prisma.$transaction(async (tx) => {
    await deleteReminderRuleForRecord(tx, 'medication', id);
    await tx.pet_medications.deleteMany({
      where: {
        id,
        pet_id: petId,
      },
    });
  });

  if (audit && existing) {
    await logDelete('pet_medications', id, existing, audit.userId, {
      source: audit.source,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });
  }

  return true;
}

// Vaccinations
export interface PetVaccination {
  id: number;
  pet_id: number;
  name: string;
  administered_date: Date;
  administered_date_precision: DatePrecision;
  expiration_date: Date | null;
  expiration_date_precision: DatePrecision;
  administered_by: string | null;
  lot_number: string | null;
  show_on_card: boolean;
  reminder_enabled: boolean;
  reminder_channel: 'email' | null;
  reminder_lead_time_value: number | null;
  reminder_lead_time_unit: 'days' | 'weeks' | null;
  reminder_next_due_date: Date | null;
  reminder_recurrence_value: number | null;
  reminder_recurrence_unit: 'months' | 'years' | null;
  created_at: Date;
}

export async function createPetVaccination(
  petId: number,
  data: Omit<PetVaccination, 'id' | 'pet_id' | 'created_at'>,
  audit?: AuditContext
): Promise<PetVaccination> {
  const reminder = extractReminderConfig({
    ...data,
    reminder_next_due_date: data.expiration_date ?? null,
    reminder_recurrence_value: null,
    reminder_recurrence_unit: null,
  });

  const result = await prisma.$transaction(async (tx) => {
    const vaccination = await tx.pet_vaccinations.create({
      data: {
        pet_id: petId,
        name: data.name,
        administered_date: toNullableDate(data.administered_date)!,
        administered_date_precision: data.administered_date_precision || 'day',
        expiration_date: toNullableDate(data.expiration_date),
        expiration_date_precision: data.expiration_date_precision || 'day',
        administered_by: data.administered_by,
        lot_number: data.lot_number,
        show_on_card: data.show_on_card ?? false,
      },
    });

    await upsertReminderRuleForRecord(tx, {
      petId,
      recordType: 'vaccination',
      recordId: vaccination.id,
      reminder,
      userId: audit?.userId,
    });

    return findVaccinationWithReminder(tx, petId, vaccination.id);
  });

  if (!result) {
    throw new Error('Failed to create vaccination');
  }

  if (audit) {
    await logCreate('pet_vaccinations', result.id, data, audit.userId, {
      source: audit.source,
      sourcePdfUploadId: audit.sourcePdfUploadId,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });
  }

  return result;
}

export async function getPetVaccinations(petId: number): Promise<PetVaccination[]> {
  const [vaccinations, reminderRules] = await Promise.all([
    prisma.pet_vaccinations.findMany({
      where: {
        pet_id: petId,
      },
      orderBy: {
        administered_date: 'desc',
      },
    }),
    prisma.pet_reminder_rules.findMany({
      where: {
        pet_id: petId,
        record_type: 'vaccination',
        channel: 'email',
      },
    }),
  ]);

  const reminderMap = new Map(
    reminderRules.map((rule) => [
      rule.record_id,
      {
        id: rule.id,
        pet_id: rule.pet_id,
        record_type: rule.record_type as 'vaccination',
        record_id: rule.record_id,
        channel: rule.channel as 'email',
        lead_time_value: rule.lead_time_value,
        lead_time_unit: rule.lead_time_unit as 'days' | 'weeks',
        next_due_date: rule.next_due_date,
        recurrence_value: rule.recurrence_value,
        recurrence_unit: rule.recurrence_unit as 'months' | 'years' | null,
        is_enabled: rule.is_enabled,
        created_by_user_id: rule.created_by_user_id,
        updated_by_user_id: rule.updated_by_user_id,
        created_at: rule.created_at ?? new Date(),
        updated_at: rule.updated_at ?? new Date(),
      } satisfies ReminderRule,
    ])
  );

  return vaccinations.map((vaccination) =>
    mapPetVaccination(vaccination, reminderMap.get(vaccination.id))
  );
}

export async function updatePetVaccination(
  id: number,
  petId: number,
  updates: Partial<Omit<PetVaccination, 'id' | 'pet_id' | 'created_at'>>,
  audit?: AuditContext
): Promise<PetVaccination | null> {
  const existing = await findVaccinationWithReminder(prisma, petId, id);

  const effectiveExpirationDate =
    updates.expiration_date !== undefined
      ? updates.expiration_date
      : existing?.expiration_date ?? null;

  const reminder = extractReminderConfig({
    reminder_enabled: updates.reminder_enabled ?? existing?.reminder_enabled ?? false,
    reminder_channel: updates.reminder_channel ?? existing?.reminder_channel ?? null,
    reminder_lead_time_value:
      updates.reminder_lead_time_value ?? existing?.reminder_lead_time_value ?? null,
    reminder_lead_time_unit:
      updates.reminder_lead_time_unit ?? existing?.reminder_lead_time_unit ?? null,
    reminder_next_due_date: effectiveExpirationDate,
    reminder_recurrence_value: null,
    reminder_recurrence_unit: null,
  });

  const data = stripUndefined({
    name: updates.name,
    administered_date:
      updates.administered_date === undefined
        ? undefined
        : toNullableDate(updates.administered_date) ?? undefined,
    administered_date_precision: updates.administered_date_precision,
    expiration_date: toNullableDate(updates.expiration_date),
    expiration_date_precision: updates.expiration_date_precision,
    administered_by: updates.administered_by,
    lot_number: updates.lot_number,
    show_on_card: updates.show_on_card,
  });

  const result = await prisma.$transaction(async (tx) => {
    if (!existing) {
      return null;
    }

    if (Object.keys(data).length > 0) {
      await tx.pet_vaccinations.updateMany({
        where: {
          id,
          pet_id: petId,
        },
        data,
      });
    }

    await upsertReminderRuleForRecord(tx, {
      petId,
      recordType: 'vaccination',
      recordId: id,
      reminder,
      userId: audit?.userId,
    });

    return findVaccinationWithReminder(tx, petId, id);
  });

  if (audit && existing && result) {
    await logUpdate('pet_vaccinations', id, existing, result, audit.userId, {
      source: audit.source,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });
  }

  return result;
}

export async function deletePetVaccination(
  id: number,
  petId: number,
  audit?: AuditContext
): Promise<boolean> {
  const existing = await findVaccinationWithReminder(prisma, petId, id);

  await prisma.$transaction(async (tx) => {
    await deleteReminderRuleForRecord(tx, 'vaccination', id);
    await tx.pet_vaccinations.deleteMany({
      where: {
        id,
        pet_id: petId,
      },
    });
  });

  if (audit && existing) {
    await logDelete('pet_vaccinations', id, existing, audit.userId, {
      source: audit.source,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });
  }

  return true;
}

// Emergency Contacts
export interface PetEmergencyContact {
  id: number;
  pet_id: number;
  name: string;
  relationship: string | null;
  phone: string;
  email: string | null;
  is_primary: boolean;
  created_at: Date;
}

export async function createPetEmergencyContact(
  petId: number,
  data: Omit<PetEmergencyContact, 'id' | 'pet_id' | 'created_at'>,
  audit?: AuditContext
): Promise<PetEmergencyContact> {
  const result = await prisma.pet_emergency_contacts.create({
    data: {
      pet_id: petId,
      name: data.name,
      relationship: data.relationship,
      phone: data.phone,
      email: data.email,
      is_primary: data.is_primary ?? false,
    },
  });

  const contact = mapPetEmergencyContact(result);

  if (audit) {
    await logCreate('pet_emergency_contacts', contact.id, data, audit.userId, {
      source: audit.source,
      sourcePdfUploadId: audit.sourcePdfUploadId,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });
  }

  return contact;
}

export async function getPetEmergencyContacts(
  petId: number
): Promise<PetEmergencyContact[]> {
  const contacts = await prisma.pet_emergency_contacts.findMany({
    where: {
      pet_id: petId,
    },
    orderBy: [
      {
        is_primary: 'desc',
      },
      {
        created_at: 'asc',
      },
    ],
  });

  return contacts.map(mapPetEmergencyContact);
}

export async function updatePetEmergencyContact(
  id: number,
  petId: number,
  updates: Partial<Omit<PetEmergencyContact, 'id' | 'pet_id' | 'created_at'>>,
  audit?: AuditContext
): Promise<PetEmergencyContact | null> {
  const existing = await prisma.pet_emergency_contacts.findFirst({
    where: {
      id,
      pet_id: petId,
    },
  });

  const data = stripUndefined({
    name: updates.name,
    relationship: updates.relationship,
    phone: updates.phone,
    email: updates.email,
    is_primary: updates.is_primary,
  });

  if (Object.keys(data).length === 0) {
    return null;
  }

  const records = await prisma.pet_emergency_contacts.updateManyAndReturn({
    where: {
      id,
      pet_id: petId,
    },
    data,
  });

  const result = records[0] ? mapPetEmergencyContact(records[0]) : null;

  if (audit && existing && result) {
    await logUpdate(
      'pet_emergency_contacts',
      id,
      mapPetEmergencyContact(existing),
      result,
      audit.userId,
      {
        source: audit.source,
        ipAddress: audit.ipAddress,
        userAgent: audit.userAgent,
      }
    );
  }

  return result;
}

export async function deletePetEmergencyContact(
  id: number,
  petId: number,
  audit?: AuditContext
): Promise<boolean> {
  const existing = await prisma.pet_emergency_contacts.findFirst({
    where: {
      id,
      pet_id: petId,
    },
  });

  await prisma.pet_emergency_contacts.deleteMany({
    where: {
      id,
      pet_id: petId,
    },
  });

  if (audit && existing) {
    await logDelete(
      'pet_emergency_contacts',
      id,
      mapPetEmergencyContact(existing),
      audit.userId,
      {
        source: audit.source,
        ipAddress: audit.ipAddress,
        userAgent: audit.userAgent,
      }
    );
  }

  return true;
}

export async function setPrimaryEmergencyContact(
  petId: number,
  contactId: number,
  audit?: AuditContext
): Promise<PetEmergencyContact> {
  return prisma.$transaction(async (tx) => {
    const targetContact = await tx.pet_emergency_contacts.findFirst({
      where: {
        id: contactId,
        pet_id: petId,
      },
    });

    if (!targetContact) {
      throw new Error('Emergency contact not found');
    }

    const oldContacts = (await tx.pet_emergency_contacts.findMany({
      where: {
        pet_id: petId,
      },
    })).map(mapPetEmergencyContact);

    await tx.pet_emergency_contacts.updateMany({
      where: {
        pet_id: petId,
      },
      data: {
        is_primary: false,
      },
    });

    const updatedRecords = await tx.pet_emergency_contacts.updateManyAndReturn({
      where: {
        id: contactId,
        pet_id: petId,
      },
      data: {
        is_primary: true,
      },
    });

    const updatedContact = updatedRecords[0]
      ? mapPetEmergencyContact(updatedRecords[0])
      : null;

    if (!updatedContact) {
      throw new Error('Emergency contact not found');
    }

    if (audit) {
      const oldContact = oldContacts.find((contact) => contact.id === contactId);
      if (oldContact) {
        await logUpdate(
          'pet_emergency_contacts',
          contactId,
          oldContact,
          updatedContact,
          audit.userId,
          {
            source: audit.source || 'manual',
            ipAddress: audit.ipAddress,
            userAgent: audit.userAgent,
          }
        );
      }

      for (const oldContactEntry of oldContacts) {
        if (oldContactEntry.id !== contactId && oldContactEntry.is_primary) {
          await logUpdate(
            'pet_emergency_contacts',
            oldContactEntry.id,
            oldContactEntry,
            { ...oldContactEntry, is_primary: false },
            audit.userId,
            {
              source: audit.source || 'manual',
              ipAddress: audit.ipAddress,
              userAgent: audit.userAgent,
            }
          );
        }
      }
    }

    return updatedContact;
  });
}

// Pet Alerts (custom owner-entered alerts)
export interface PetAlert {
  id: number;
  pet_id: number;
  alert_text: string;
  is_active: boolean;
  created_at: Date;
}

export async function createPetAlert(
  petId: number,
  data: { alert_text: string; is_active?: boolean },
  audit?: AuditContext
): Promise<PetAlert> {
  const result = await prisma.pet_alerts.create({
    data: {
      pet_id: petId,
      alert_text: data.alert_text,
      is_active: data.is_active ?? true,
    },
  });

  const alert = mapPetAlert(result);

  if (audit) {
    await logCreate('pet_alerts', alert.id, data, audit.userId, {
      source: audit.source,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });
  }

  return alert;
}

export async function getPetAlerts(petId: number): Promise<PetAlert[]> {
  const alerts = await prisma.pet_alerts.findMany({
    where: {
      pet_id: petId,
    },
    orderBy: [
      {
        is_active: 'desc',
      },
      {
        created_at: 'desc',
      },
    ],
  });

  return alerts.map(mapPetAlert);
}

export async function updatePetAlert(
  id: number,
  petId: number,
  updates: Partial<{ alert_text: string; is_active: boolean }>,
  audit?: AuditContext
): Promise<PetAlert | null> {
  const existing = await prisma.pet_alerts.findFirst({
    where: {
      id,
      pet_id: petId,
    },
  });

  const data = stripUndefined({
    alert_text: updates.alert_text,
    is_active: updates.is_active,
  });

  if (Object.keys(data).length === 0) {
    return null;
  }

  const records = await prisma.pet_alerts.updateManyAndReturn({
    where: {
      id,
      pet_id: petId,
    },
    data,
  });

  const result = records[0] ? mapPetAlert(records[0]) : null;

  if (audit && existing && result) {
    await logUpdate('pet_alerts', id, mapPetAlert(existing), result, audit.userId, {
      source: audit.source,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });
  }

  return result;
}

export async function deletePetAlert(
  id: number,
  petId: number,
  audit?: AuditContext
): Promise<boolean> {
  const existing = await prisma.pet_alerts.findFirst({
    where: {
      id,
      pet_id: petId,
    },
  });

  await prisma.pet_alerts.deleteMany({
    where: {
      id,
      pet_id: petId,
    },
  });

  if (audit && existing) {
    await logDelete('pet_alerts', id, mapPetAlert(existing), audit.userId, {
      source: audit.source,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });
  }

  return true;
}
