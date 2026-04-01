import { nanoid } from 'nanoid';
import { query, queryOne, transaction } from '../db/pool.js';
import { cacheDelete, cacheDeletePattern } from '../db/redis.js';

export interface Pet {
  id: number;
  user_id: number;
  share_id: string;
  name: string;
  species: string;
  breed: string | null;
  date_of_birth: Date | null;
  weight_kg: number | null;
  weight_unit: 'lbs' | 'kg' | null;
  sex: string | null;
  is_fixed: boolean;
  microchip_id: string | null;
  photo_url: string | null;
  owners_notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreatePetInput {
  user_id: number;
  name: string;
  species: string;
  breed?: string;
  date_of_birth?: string;
  weight_kg?: number;
  weight_unit?: 'lbs' | 'kg';
  sex?: string;
  is_fixed?: boolean;
  microchip_id?: string;
  photo_url?: string;
  owners_notes?: string;
}

export async function createPet(input: CreatePetInput): Promise<Pet> {
  const shareId = nanoid();

  const result = await queryOne<Pet>(
    `INSERT INTO pets (user_id, share_id, name, species, breed, date_of_birth, weight_kg, weight_unit, sex, is_fixed, microchip_id, photo_url, special_instructions)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING ${PET_RETURNING}`,
    [
      input.user_id,
      shareId,
      input.name,
      input.species,
      input.breed || null,
      input.date_of_birth || null,
      input.weight_kg || null,
      input.weight_unit || 'lbs',
      input.sex || null,
      input.is_fixed || false,
      input.microchip_id || null,
      input.photo_url || null,
      input.owners_notes || null,
    ]
  );

  return result!;
}

const PET_COLUMNS = `p.id, p.user_id, p.share_id, p.name, p.species, p.breed, p.date_of_birth, p.weight_kg, p.weight_unit, p.sex, p.is_fixed, p.microchip_id, p.photo_url, p.special_instructions AS owners_notes, p.created_at, p.updated_at`;
const PET_RETURNING = `id, user_id, share_id, name, species, breed, date_of_birth, weight_kg, weight_unit, sex, is_fixed, microchip_id, photo_url, special_instructions AS owners_notes, created_at, updated_at`;

export async function findPetById(id: number): Promise<Pet | null> {
  return queryOne<Pet>(`SELECT ${PET_COLUMNS} FROM pets p WHERE p.id = $1`, [id]);
}

export async function findPetByShareId(shareId: string): Promise<Pet | null> {
  return queryOne<Pet>(`SELECT ${PET_COLUMNS} FROM pets p WHERE p.share_id = $1`, [shareId]);
}

// Get pets where user is the original owner (legacy)
export async function findPetsByUserId(userId: number): Promise<Pet[]> {
  return query<Pet>(`SELECT ${PET_COLUMNS} FROM pets p WHERE p.user_id = $1 ORDER BY p.created_at DESC`, [userId]);
}

// Get all pets user has access to (via pet_owners junction table)
export async function findPetsForUser(userId: number): Promise<Pet[]> {
  return query<Pet>(
    `SELECT ${PET_COLUMNS} FROM pets p
     JOIN pet_owners po ON po.pet_id = p.id
     WHERE po.user_id = $1 AND po.accepted_at IS NOT NULL
     ORDER BY p.created_at DESC`,
    [userId]
  );
}

export async function updatePet(id: number, userId: number, updates: Partial<CreatePetInput>): Promise<Pet | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  const fieldMapping: Record<string, string> = { owners_notes: 'special_instructions' };
  const allowedFields = ['name', 'species', 'breed', 'date_of_birth', 'weight_kg', 'weight_unit', 'sex', 'is_fixed', 'microchip_id', 'photo_url', 'owners_notes'];

  for (const field of allowedFields) {
    if ((updates as any)[field] !== undefined) {
      const dbColumn = fieldMapping[field] || field;
      fields.push(`${dbColumn} = $${paramCount++}`);
      values.push((updates as any)[field]);
    }
  }

  if (fields.length === 0) return findPetById(id);

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id, userId);

  const result = await queryOne<Pet>(
    `UPDATE pets SET ${fields.join(', ')} WHERE id = $${paramCount} AND user_id = $${paramCount + 1} RETURNING ${PET_RETURNING}`,
    values
  );

  if (result) {
    await cacheDelete(`pet:${result.share_id}`);
  }

  return result;
}

export async function deletePet(id: number, userId: number): Promise<boolean> {
  const pet = await findPetById(id);
  if (!pet || pet.user_id !== userId) return false;

  await query('DELETE FROM pets WHERE id = $1 AND user_id = $2', [id, userId]);
  await cacheDelete(`pet:${pet.share_id}`);

  return true;
}

export async function regenerateShareId(id: number, userId: number): Promise<Pet | null> {
  const pet = await findPetById(id);
  if (!pet || pet.user_id !== userId) return null;

  const oldShareId = pet.share_id;
  const newShareId = nanoid();

  const result = await queryOne<Pet>(
    `UPDATE pets SET share_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3 RETURNING ${PET_RETURNING}`,
    [newShareId, id, userId]
  );

  if (result) {
    await cacheDelete(`pet:${oldShareId}`);
  }

  return result;
}
