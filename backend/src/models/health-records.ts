import { query, queryOne, transaction } from '../db/pool.js';
import { cacheDelete } from '../db/redis.js';
import { logCreate, logUpdate, logDelete } from '../services/audit-logger.js';
import { computeMatchScore, computeMultiFieldMatchScore, DEFAULT_MATCH_THRESHOLD } from '../services/match-scoring.js';

// Audit context for tracking changes
export interface AuditContext {
  userId: number;
  source?: 'manual' | 'pdf_import';
  sourcePdfUploadId?: number;
  ipAddress?: string;
  userAgent?: string;
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

export async function createPetVet(petId: number, data: Omit<PetVet, 'id' | 'pet_id' | 'created_at'>, audit?: AuditContext): Promise<PetVet> {
  // If is_primary is not explicitly set, default based on whether there are existing vets
  let isPrimary = data.is_primary;
  if (isPrimary === undefined) {
    const existingVets = await query<PetVet>('SELECT id FROM pet_vets WHERE pet_id = $1 LIMIT 1', [petId]);
    isPrimary = existingVets.length === 0; // true if no existing vets, false otherwise
  }

  const result = await queryOne<PetVet>(
    `INSERT INTO pet_vets (pet_id, clinic_name, vet_name, phone, email, address, is_primary)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [petId, data.clinic_name, data.vet_name, data.phone, data.email, data.address, isPrimary]
  );

  if (audit && result) {
    await logCreate('pet_vets', result.id, data, audit.userId, {
      source: audit.source,
      sourcePdfUploadId: audit.sourcePdfUploadId,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });
  }

  return result!;
}

export async function getPetVets(petId: number): Promise<PetVet[]> {
  return query<PetVet>('SELECT * FROM pet_vets WHERE pet_id = $1 ORDER BY is_primary DESC, created_at', [petId]);
}

export async function updatePetVet(id: number, petId: number, updates: Partial<Omit<PetVet, 'id' | 'pet_id' | 'created_at'>>, audit?: AuditContext): Promise<PetVet | null> {
  // Get existing record for audit
  const existing = await queryOne<PetVet>('SELECT * FROM pet_vets WHERE id = $1 AND pet_id = $2', [id, petId]);

  const fields: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  const allowedFields = ['clinic_name', 'vet_name', 'phone', 'email', 'address', 'is_primary'];

  for (const field of allowedFields) {
    if ((updates as any)[field] !== undefined) {
      fields.push(`${field} = $${paramCount++}`);
      values.push((updates as any)[field]);
    }
  }

  if (fields.length === 0) return null;

  values.push(id, petId);

  const result = await queryOne<PetVet>(
    `UPDATE pet_vets SET ${fields.join(', ')} WHERE id = $${paramCount} AND pet_id = $${paramCount + 1} RETURNING *`,
    values
  );

  if (audit && existing && result) {
    await logUpdate('pet_vets', id, existing, result, audit.userId, {
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
): Promise<{ vet: PetVet, score: number }[]> {
  const allVets = await getPetVets(petId);

  const matches: { vet: PetVet, score: number }[] = [];

  for (const vet of allVets) {
    // Multi-field scoring: clinic_name (70%) + vet_name (30%)
    const fields: { a: string, b: string, weight: number }[] = [
      { a: clinicName, b: vet.clinic_name, weight: 0.7 }
    ];

    // Include vet_name in scoring if provided and vet has a vet_name
    if (vetName && vet.vet_name) {
      fields.push({ a: vetName, b: vet.vet_name, weight: 0.3 });
    }

    const score = computeMultiFieldMatchScore(fields);

    if (score >= threshold) {
      matches.push({ vet, score });
    }
  }

  // Sort by score descending
  return matches.sort((a, b) => b.score - a.score);
}

export async function deletePetVet(id: number, petId: number, audit?: AuditContext): Promise<boolean> {
  // Get existing record for audit
  const existing = await queryOne<PetVet>('SELECT * FROM pet_vets WHERE id = $1 AND pet_id = $2', [id, petId]);

  await query('DELETE FROM pet_vets WHERE id = $1 AND pet_id = $2', [id, petId]);

  if (audit && existing) {
    await logDelete('pet_vets', id, existing, audit.userId, {
      source: audit.source,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });
  }

  return true;
}

export async function setPrimaryVet(petId: number, vetId: number, audit?: AuditContext): Promise<PetVet> {
  return transaction(async (client) => {
    // Get the vet we're setting as primary (to verify it exists)
    const targetVet = await client.query('SELECT * FROM pet_vets WHERE id = $1 AND pet_id = $2', [vetId, petId]);
    if (!targetVet.rows || targetVet.rows.length === 0) {
      throw new Error('Vet not found');
    }

    // Get all vets for audit logging
    const allVetsResult = await client.query('SELECT * FROM pet_vets WHERE pet_id = $1', [petId]);
    const oldVets = allVetsResult.rows;

    // Set all vets to is_primary = false
    await client.query('UPDATE pet_vets SET is_primary = false WHERE pet_id = $1', [petId]);

    // Set the target vet to is_primary = true
    const result = await client.query(
      'UPDATE pet_vets SET is_primary = true WHERE id = $1 AND pet_id = $2 RETURNING *',
      [vetId, petId]
    );

    const updatedVet = result.rows[0];

    // Audit logging - log the primary vet change
    if (audit && updatedVet) {
      const oldVet = oldVets.find((v: PetVet) => v.id === vetId);
      if (oldVet) {
        await logUpdate('pet_vets', vetId, oldVet, updatedVet, audit.userId, {
          source: audit.source || 'manual',
          ipAddress: audit.ipAddress,
          userAgent: audit.userAgent,
        });
      }

      // Also log updates for any previously primary vets that were demoted
      for (const oldVet of oldVets) {
        if (oldVet.id !== vetId && oldVet.is_primary) {
          const demotedVet = { ...oldVet, is_primary: false };
          await logUpdate('pet_vets', oldVet.id, oldVet, demotedVet, audit.userId, {
            source: audit.source || 'manual',
            ipAddress: audit.ipAddress,
            userAgent: audit.userAgent,
          });
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
  notes: string | null;
  severity: string | null;
  created_at: Date;
}

export async function createPetCondition(petId: number, data: Omit<PetCondition, 'id' | 'pet_id' | 'created_at'>, audit?: AuditContext): Promise<PetCondition> {
  const result = await queryOne<PetCondition>(
    `INSERT INTO pet_conditions (pet_id, name, diagnosed_date, notes, severity)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [petId, data.name, data.diagnosed_date, data.notes, data.severity]
  );

  if (audit && result) {
    await logCreate('pet_conditions', result.id, data, audit.userId, {
      source: audit.source,
      sourcePdfUploadId: audit.sourcePdfUploadId,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });
  }

  return result!;
}

export async function getPetConditions(petId: number): Promise<PetCondition[]> {
  return query<PetCondition>('SELECT * FROM pet_conditions WHERE pet_id = $1 ORDER BY created_at DESC', [petId]);
}

export async function updatePetCondition(id: number, petId: number, updates: Partial<Omit<PetCondition, 'id' | 'pet_id' | 'created_at'>>, audit?: AuditContext): Promise<PetCondition | null> {
  // Get existing record for audit
  const existing = await queryOne<PetCondition>('SELECT * FROM pet_conditions WHERE id = $1 AND pet_id = $2', [id, petId]);

  const fields: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  const allowedFields = ['name', 'diagnosed_date', 'notes', 'severity'];

  for (const field of allowedFields) {
    if ((updates as any)[field] !== undefined) {
      fields.push(`${field} = $${paramCount++}`);
      values.push((updates as any)[field]);
    }
  }

  if (fields.length === 0) return null;

  values.push(id, petId);

  const result = await queryOne<PetCondition>(
    `UPDATE pet_conditions SET ${fields.join(', ')} WHERE id = $${paramCount} AND pet_id = $${paramCount + 1} RETURNING *`,
    values
  );

  if (audit && existing && result) {
    await logUpdate('pet_conditions', id, existing, result, audit.userId, {
      source: audit.source,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });
  }

  return result;
}

export async function findDuplicateConditions(
  petId: number,
  name: string,
  threshold: number = DEFAULT_MATCH_THRESHOLD
): Promise<{ condition: PetCondition, score: number }[]> {
  const allConditions = await getPetConditions(petId);

  const matches: { condition: PetCondition, score: number }[] = [];

  for (const condition of allConditions) {
    const score = computeMatchScore(name, condition.name);

    if (score >= threshold) {
      matches.push({ condition, score });
    }
  }

  // Sort by score descending
  return matches.sort((a, b) => b.score - a.score);
}

export async function deletePetCondition(id: number, petId: number, audit?: AuditContext): Promise<boolean> {
  const existing = await queryOne<PetCondition>('SELECT * FROM pet_conditions WHERE id = $1 AND pet_id = $2', [id, petId]);

  await query('DELETE FROM pet_conditions WHERE id = $1 AND pet_id = $2', [id, petId]);

  if (audit && existing) {
    await logDelete('pet_conditions', id, existing, audit.userId, {
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
  created_at: Date;
}

export async function createPetAllergy(petId: number, data: Omit<PetAllergy, 'id' | 'pet_id' | 'created_at'>, audit?: AuditContext): Promise<PetAllergy> {
  const result = await queryOne<PetAllergy>(
    `INSERT INTO pet_allergies (pet_id, allergen, reaction, severity)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [petId, data.allergen, data.reaction, data.severity]
  );

  if (audit && result) {
    await logCreate('pet_allergies', result.id, data, audit.userId, {
      source: audit.source,
      sourcePdfUploadId: audit.sourcePdfUploadId,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });
  }

  return result!;
}

export async function getPetAllergies(petId: number): Promise<PetAllergy[]> {
  return query<PetAllergy>('SELECT * FROM pet_allergies WHERE pet_id = $1 ORDER BY created_at DESC', [petId]);
}

export async function updatePetAllergy(id: number, petId: number, updates: Partial<Omit<PetAllergy, 'id' | 'pet_id' | 'created_at'>>, audit?: AuditContext): Promise<PetAllergy | null> {
  const existing = await queryOne<PetAllergy>('SELECT * FROM pet_allergies WHERE id = $1 AND pet_id = $2', [id, petId]);

  const fields: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  const allowedFields = ['allergen', 'reaction', 'severity'];

  for (const field of allowedFields) {
    if ((updates as any)[field] !== undefined) {
      fields.push(`${field} = $${paramCount++}`);
      values.push((updates as any)[field]);
    }
  }

  if (fields.length === 0) return null;

  values.push(id, petId);

  const result = await queryOne<PetAllergy>(
    `UPDATE pet_allergies SET ${fields.join(', ')} WHERE id = $${paramCount} AND pet_id = $${paramCount + 1} RETURNING *`,
    values
  );

  if (audit && existing && result) {
    await logUpdate('pet_allergies', id, existing, result, audit.userId, {
      source: audit.source,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });
  }

  return result;
}

export async function deletePetAllergy(id: number, petId: number, audit?: AuditContext): Promise<boolean> {
  const existing = await queryOne<PetAllergy>('SELECT * FROM pet_allergies WHERE id = $1 AND pet_id = $2', [id, petId]);

  await query('DELETE FROM pet_allergies WHERE id = $1 AND pet_id = $2', [id, petId]);

  if (audit && existing) {
    await logDelete('pet_allergies', id, existing, audit.userId, {
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
  end_date: Date | null;
  prescribing_vet: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: Date;
}

export async function createPetMedication(petId: number, data: Omit<PetMedication, 'id' | 'pet_id' | 'created_at'>, audit?: AuditContext): Promise<PetMedication> {
  const result = await queryOne<PetMedication>(
    `INSERT INTO pet_medications (pet_id, name, dosage, frequency, start_date, end_date, prescribing_vet, notes, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [petId, data.name, data.dosage, data.frequency, data.start_date, data.end_date, data.prescribing_vet, data.notes, data.is_active ?? true]
  );

  if (audit && result) {
    await logCreate('pet_medications', result.id, data, audit.userId, {
      source: audit.source,
      sourcePdfUploadId: audit.sourcePdfUploadId,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });
  }

  return result!;
}

export async function getPetMedications(petId: number): Promise<PetMedication[]> {
  return query<PetMedication>('SELECT * FROM pet_medications WHERE pet_id = $1 ORDER BY is_active DESC, created_at DESC', [petId]);
}

export async function findPetMedicationByName(
  petId: number,
  name: string,
  threshold: number = 0.9
): Promise<{ medication: PetMedication, score: number } | null> {
  const allMedications = await getPetMedications(petId);

  let bestMatch: { medication: PetMedication, score: number } | null = null;

  for (const medication of allMedications) {
    const score = computeMatchScore(name, medication.name);

    if (score >= threshold) {
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { medication, score };
      }
    }
  }

  return bestMatch;
}

export async function findDuplicateMedications(
  petId: number,
  name: string,
  threshold: number = DEFAULT_MATCH_THRESHOLD
): Promise<{ medication: PetMedication, score: number }[]> {
  const allMedications = await getPetMedications(petId);

  const matches: { medication: PetMedication, score: number }[] = [];

  for (const medication of allMedications) {
    const score = computeMatchScore(name, medication.name);

    if (score >= threshold) {
      matches.push({ medication, score });
    }
  }

  // Sort by score descending
  return matches.sort((a, b) => b.score - a.score);
}

export async function updatePetMedication(id: number, petId: number, updates: Partial<Omit<PetMedication, 'id' | 'pet_id' | 'created_at'>>, audit?: AuditContext): Promise<PetMedication | null> {
  // Get existing record for audit
  const existing = await queryOne<PetMedication>('SELECT * FROM pet_medications WHERE id = $1 AND pet_id = $2', [id, petId]);

  const fields: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  const allowedFields = ['name', 'dosage', 'frequency', 'start_date', 'end_date', 'prescribing_vet', 'notes', 'is_active'];

  for (const field of allowedFields) {
    if ((updates as any)[field] !== undefined) {
      fields.push(`${field} = $${paramCount++}`);
      values.push((updates as any)[field]);
    }
  }

  if (fields.length === 0) return null;

  values.push(id, petId);

  const result = await queryOne<PetMedication>(
    `UPDATE pet_medications SET ${fields.join(', ')} WHERE id = $${paramCount} AND pet_id = $${paramCount + 1} RETURNING *`,
    values
  );

  if (audit && existing && result) {
    await logUpdate('pet_medications', id, existing, result, audit.userId, {
      source: audit.source,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });
  }

  return result;
}

export async function deletePetMedication(id: number, petId: number, audit?: AuditContext): Promise<boolean> {
  const existing = await queryOne<PetMedication>('SELECT * FROM pet_medications WHERE id = $1 AND pet_id = $2', [id, petId]);

  await query('DELETE FROM pet_medications WHERE id = $1 AND pet_id = $2', [id, petId]);

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
  expiration_date: Date | null;
  administered_by: string | null;
  lot_number: string | null;
  created_at: Date;
}

export async function createPetVaccination(petId: number, data: Omit<PetVaccination, 'id' | 'pet_id' | 'created_at'>, audit?: AuditContext): Promise<PetVaccination> {
  const result = await queryOne<PetVaccination>(
    `INSERT INTO pet_vaccinations (pet_id, name, administered_date, expiration_date, administered_by, lot_number)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [petId, data.name, data.administered_date, data.expiration_date, data.administered_by, data.lot_number]
  );

  if (audit && result) {
    await logCreate('pet_vaccinations', result.id, data, audit.userId, {
      source: audit.source,
      sourcePdfUploadId: audit.sourcePdfUploadId,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });
  }

  return result!;
}

export async function getPetVaccinations(petId: number): Promise<PetVaccination[]> {
  return query<PetVaccination>('SELECT * FROM pet_vaccinations WHERE pet_id = $1 ORDER BY administered_date DESC', [petId]);
}

export async function updatePetVaccination(id: number, petId: number, updates: Partial<Omit<PetVaccination, 'id' | 'pet_id' | 'created_at'>>, audit?: AuditContext): Promise<PetVaccination | null> {
  const existing = await queryOne<PetVaccination>('SELECT * FROM pet_vaccinations WHERE id = $1 AND pet_id = $2', [id, petId]);

  const fields: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  const allowedFields = ['name', 'administered_date', 'expiration_date', 'administered_by', 'lot_number'];

  for (const field of allowedFields) {
    if ((updates as any)[field] !== undefined) {
      fields.push(`${field} = $${paramCount++}`);
      values.push((updates as any)[field]);
    }
  }

  if (fields.length === 0) return null;

  values.push(id, petId);

  const result = await queryOne<PetVaccination>(
    `UPDATE pet_vaccinations SET ${fields.join(', ')} WHERE id = $${paramCount} AND pet_id = $${paramCount + 1} RETURNING *`,
    values
  );

  if (audit && existing && result) {
    await logUpdate('pet_vaccinations', id, existing, result, audit.userId, {
      source: audit.source,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });
  }

  return result;
}

export async function deletePetVaccination(id: number, petId: number, audit?: AuditContext): Promise<boolean> {
  const existing = await queryOne<PetVaccination>('SELECT * FROM pet_vaccinations WHERE id = $1 AND pet_id = $2', [id, petId]);

  await query('DELETE FROM pet_vaccinations WHERE id = $1 AND pet_id = $2', [id, petId]);

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

export async function createPetEmergencyContact(petId: number, data: Omit<PetEmergencyContact, 'id' | 'pet_id' | 'created_at'>, audit?: AuditContext): Promise<PetEmergencyContact> {
  const result = await queryOne<PetEmergencyContact>(
    `INSERT INTO pet_emergency_contacts (pet_id, name, relationship, phone, email, is_primary)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [petId, data.name, data.relationship, data.phone, data.email, data.is_primary ?? false]
  );

  if (audit && result) {
    await logCreate('pet_emergency_contacts', result.id, data, audit.userId, {
      source: audit.source,
      sourcePdfUploadId: audit.sourcePdfUploadId,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });
  }

  return result!;
}

export async function getPetEmergencyContacts(petId: number): Promise<PetEmergencyContact[]> {
  return query<PetEmergencyContact>('SELECT * FROM pet_emergency_contacts WHERE pet_id = $1 ORDER BY is_primary DESC, created_at', [petId]);
}

export async function updatePetEmergencyContact(id: number, petId: number, updates: Partial<Omit<PetEmergencyContact, 'id' | 'pet_id' | 'created_at'>>, audit?: AuditContext): Promise<PetEmergencyContact | null> {
  const existing = await queryOne<PetEmergencyContact>('SELECT * FROM pet_emergency_contacts WHERE id = $1 AND pet_id = $2', [id, petId]);

  const fields: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  const allowedFields = ['name', 'relationship', 'phone', 'email', 'is_primary'];

  for (const field of allowedFields) {
    if ((updates as any)[field] !== undefined) {
      fields.push(`${field} = $${paramCount++}`);
      values.push((updates as any)[field]);
    }
  }

  if (fields.length === 0) return null;

  values.push(id, petId);

  const result = await queryOne<PetEmergencyContact>(
    `UPDATE pet_emergency_contacts SET ${fields.join(', ')} WHERE id = $${paramCount} AND pet_id = $${paramCount + 1} RETURNING *`,
    values
  );

  if (audit && existing && result) {
    await logUpdate('pet_emergency_contacts', id, existing, result, audit.userId, {
      source: audit.source,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });
  }

  return result;
}

export async function deletePetEmergencyContact(id: number, petId: number, audit?: AuditContext): Promise<boolean> {
  const existing = await queryOne<PetEmergencyContact>('SELECT * FROM pet_emergency_contacts WHERE id = $1 AND pet_id = $2', [id, petId]);

  await query('DELETE FROM pet_emergency_contacts WHERE id = $1 AND pet_id = $2', [id, petId]);

  if (audit && existing) {
    await logDelete('pet_emergency_contacts', id, existing, audit.userId, {
      source: audit.source,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });
  }

  return true;
}
