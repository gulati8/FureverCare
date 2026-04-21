import { nanoid } from 'nanoid';
import { prisma } from '../db/prisma.js';
import { cacheDelete } from '../db/redis.js';
import { decimalToNumber, stripUndefined, toNullableDate } from './prisma-helpers.js';

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
  special_instructions: string | null;
  age: number | null;
  color_markings: string | null;
  created_at: Date;
  updated_at: Date;
  user_role?: string | null;
}

function mapPet(
  pet: {
    weight_kg: any;
    user_role?: string | null;
  } & Record<string, any>
): Pet {
  return {
    ...pet,
    weight_kg: decimalToNumber(pet.weight_kg),
  } as Pet;
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
  special_instructions?: string;
  age?: number;
  color_markings?: string;
}

export async function createPet(input: CreatePetInput): Promise<Pet> {
  const shareId = nanoid();

  const result = await prisma.pets.create({
    data: {
      user_id: input.user_id,
      share_id: shareId,
      name: input.name,
      species: input.species,
      breed: input.breed || null,
      date_of_birth: toNullableDate(input.date_of_birth) ?? null,
      weight_kg: input.weight_kg ?? null,
      weight_unit: input.weight_unit || 'lbs',
      sex: input.sex || null,
      is_fixed: input.is_fixed || false,
      microchip_id: input.microchip_id || null,
      photo_url: input.photo_url || null,
      special_instructions: input.special_instructions || null,
      age: input.age ?? null,
      color_markings: input.color_markings || null,
    },
  });

  return mapPet(result);
}

export async function findPetById(id: number): Promise<Pet | null> {
  const pet = await prisma.pets.findUnique({
    where: {
      id,
    },
  });
  return pet ? mapPet(pet) : null;
}

export async function findPetByShareId(shareId: string): Promise<Pet | null> {
  const pet = await prisma.pets.findUnique({
    where: {
      share_id: shareId,
    },
  });
  return pet ? mapPet(pet) : null;
}

// Get pets where user is the original owner (legacy)
export async function findPetsByUserId(userId: number): Promise<Pet[]> {
  const pets = await prisma.pets.findMany({
    where: {
      user_id: userId,
    },
    orderBy: {
      created_at: 'desc',
    },
  });
  return pets.map(mapPet);
}

// Get all pets user has access to (via pet_owners junction table)
export async function findPetsForUser(userId: number): Promise<Pet[]> {
  const petOwners = await prisma.pet_owners.findMany({
    where: {
      user_id: userId,
      accepted_at: {
        not: null,
      },
    },
    include: {
      pets: true,
    },
  });

  return petOwners
    .map((petOwner) =>
      mapPet({
        ...petOwner.pets,
        user_role: petOwner.role,
      })
    )
    .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
}

export async function updatePet(id: number, userId: number, updates: Partial<CreatePetInput>): Promise<Pet | null> {
  const data = stripUndefined({
    name: updates.name,
    species: updates.species,
    breed: updates.breed,
    date_of_birth: toNullableDate(updates.date_of_birth),
    weight_kg: updates.weight_kg,
    weight_unit: updates.weight_unit,
    sex: updates.sex,
    is_fixed: updates.is_fixed,
    microchip_id: updates.microchip_id,
    photo_url: updates.photo_url,
    special_instructions: updates.special_instructions,
    age: updates.age,
    color_markings: updates.color_markings,
    updated_at: new Date(),
  });

  if (Object.keys(data).length === 1) {
    return findPetById(id);
  }

  const pets = await prisma.pets.updateManyAndReturn({
    where: {
      id,
      user_id: userId,
    },
    data,
  });

  const result = pets[0] ? mapPet(pets[0]) : null;

  if (result) {
    await cacheDelete(`pet:${result.share_id}`);
  }

  return result;
}

export async function deletePet(id: number, userId: number): Promise<boolean> {
  const pet = await findPetById(id);
  if (!pet || pet.user_id !== userId) return false;

  await prisma.pets.deleteMany({
    where: {
      id,
      user_id: userId,
    },
  });
  await cacheDelete(`pet:${pet.share_id}`);

  return true;
}

export async function regenerateShareId(id: number, userId: number): Promise<Pet | null> {
  const pet = await findPetById(id);
  if (!pet || pet.user_id !== userId) return null;

  const oldShareId = pet.share_id;
  const newShareId = nanoid();

  const pets = await prisma.pets.updateManyAndReturn({
    where: {
      id,
      user_id: userId,
    },
    data: {
      share_id: newShareId,
      updated_at: new Date(),
    },
  });
  const result = pets[0] ? mapPet(pets[0]) : null;

  if (result) {
    await cacheDelete(`pet:${oldShareId}`);
  }

  return result;
}
