import { prisma } from '../db/prisma.js';
import { decimalToNumber } from './prisma-helpers.js';

// ============ Types ============

export interface AdminUser {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  is_admin: boolean;
  subscription_status: string;
  subscription_tier: string;
  subscription_current_period_end: Date | null;
  created_at: Date;
  updated_at: Date;
  owned_pet_count: number;
  shared_pet_count: number;
}

export interface AdminUserDetails extends AdminUser {
  pets?: AdminUserPet[];
}

export interface AdminUserPet {
  id: number;
  name: string;
  species: string;
  photo_url: string | null;
  role: string;
}

export interface AdminPet {
  id: number;
  name: string;
  species: string;
  breed: string | null;
  date_of_birth: Date | null;
  photo_url: string | null;
  owner_id: number;
  owner_name: string;
  owner_email: string;
  created_at: Date;
  share_count: number;
  condition_count: number;
  medication_count: number;
  vaccination_count: number;
  allergy_count: number;
  vet_count: number;
}

export interface AdminPetDetails extends AdminPet {
  weight: number | null;
  sex: string | null;
  microchip_number: string | null;
  is_emergency_card_enabled: boolean;
  share_id: string | null;
  owners?: PetOwnerInfo[];
  vets?: PetVet[];
  conditions?: PetCondition[];
  allergies?: PetAllergy[];
  medications?: PetMedication[];
  vaccinations?: PetVaccination[];
}

export interface PetOwnerInfo {
  user_id: number;
  name: string;
  email: string;
  role: string;
  accepted_at: Date | null;
}

export interface PetVet {
  id: number;
  name: string;
  clinic_name: string | null;
  phone: string | null;
  email: string | null;
}

export interface PetCondition {
  id: number;
  name: string;
  diagnosed_date: Date | null;
  notes: string | null;
}

export interface PetAllergy {
  id: number;
  allergen: string;
  reaction: string | null;
  severity: string | null;
}

export interface PetMedication {
  id: number;
  name: string;
  dosage: string | null;
  frequency: string | null;
  start_date: Date | null;
}

export interface PetVaccination {
  id: number;
  name: string;
  date_administered: Date | null;
  next_due_date: Date | null;
}

export interface PaginationOptions {
  limit: number;
  offset: number;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface UsersFilterOptions extends PaginationOptions {
  search?: string;
  isAdmin?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface PetsFilterOptions extends PaginationOptions {
  search?: string;
  species?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface AnalyticsOverview {
  total_users: number;
  total_pets: number;
  new_users_this_week: number;
  new_pets_this_week: number;
  most_common_species: string;
  adoption_rate: number;
}

export interface ActivityMetrics {
  date: Date;
  registrations: number;
  pets_created: number;
  share_access: number;
}

export interface HealthInsights {
  most_common_conditions: { name: string; count: number }[];
  most_common_medications: { name: string; count: number }[];
  pets_with_allergies_pct: number;
  pets_with_microchips_pct: number;
}

function normalizeString(value: string | null | undefined): string {
  return (value ?? '').toLowerCase();
}

function compareValues(
  a: string | number | boolean | Date | null | undefined,
  b: string | number | boolean | Date | null | undefined
): number {
  if (a == null && b == null) {
    return 0;
  }

  if (a == null) {
    return 1;
  }

  if (b == null) {
    return -1;
  }

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime();
  }

  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return Number(a) - Number(b);
  }

  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }

  return String(a).localeCompare(String(b), undefined, {
    sensitivity: 'base',
    numeric: true,
  });
}

function sortRows<T>(
  rows: T[],
  sortOrder: 'ASC' | 'DESC',
  selector: (row: T) => string | number | boolean | Date | null | undefined
): T[] {
  const direction = sortOrder === 'ASC' ? 1 : -1;
  return [...rows].sort((a, b) => direction * compareValues(selector(a), selector(b)));
}

function buildUserWhere(options: UsersFilterOptions) {
  const where: Record<string, unknown> = {};

  if (options.search) {
    where.OR = [
      { name: { contains: options.search, mode: 'insensitive' } },
      { email: { contains: options.search, mode: 'insensitive' } },
    ];
  }

  if (options.isAdmin !== undefined) {
    where.is_admin = options.isAdmin;
  }

  if (options.createdAfter || options.createdBefore) {
    where.created_at = {
      ...(options.createdAfter ? { gte: options.createdAfter } : {}),
      ...(options.createdBefore ? { lte: options.createdBefore } : {}),
    };
  }

  return where;
}

function buildPetWhere(options: PetsFilterOptions) {
  const where: Record<string, unknown> = {};

  if (options.species) {
    where.species = options.species;
  }

  if (options.createdAfter || options.createdBefore) {
    where.created_at = {
      ...(options.createdAfter ? { gte: options.createdAfter } : {}),
      ...(options.createdBefore ? { lte: options.createdBefore } : {}),
    };
  }

  if (options.search) {
    where.OR = [
      { name: { contains: options.search, mode: 'insensitive' } },
      {
        users: {
          is: {
            name: { contains: options.search, mode: 'insensitive' },
          },
        },
      },
      {
        users: {
          is: {
            email: { contains: options.search, mode: 'insensitive' },
          },
        },
      },
    ];
  }

  return where;
}

function mapAdminUser(user: {
  pet_owners_pet_owners_user_idTousers: Array<{ pet_id: number; role: string }>;
} & Record<string, any>): AdminUser {
  const acceptedOwners = user.pet_owners_pet_owners_user_idTousers.filter(
    (petOwner) => petOwner.role === 'owner'
  );
  const acceptedShared = user.pet_owners_pet_owners_user_idTousers.filter(
    (petOwner) => petOwner.role !== 'owner'
  );

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    is_admin: user.is_admin,
    subscription_status: user.subscription_status ?? 'free',
    subscription_tier: user.subscription_tier ?? 'free',
    subscription_current_period_end: user.subscription_current_period_end,
    created_at: user.created_at ?? new Date(),
    updated_at: user.updated_at ?? new Date(),
    owned_pet_count: new Set(acceptedOwners.map((petOwner) => petOwner.pet_id)).size,
    shared_pet_count: new Set(acceptedShared.map((petOwner) => petOwner.pet_id)).size,
  };
}

function mapAdminPet(pet: {
  users: { id: number; name: string; email: string };
  pet_owners: Array<{ user_id: number }>;
  pet_conditions: Array<{ id: number }>;
  pet_medications: Array<{ id: number }>;
  pet_vaccinations: Array<{ id: number }>;
  pet_allergies: Array<{ id: number }>;
  pet_vets: Array<{ id: number }>;
} & Record<string, any>): AdminPet {
  return {
    id: pet.id,
    name: pet.name,
    species: pet.species,
    breed: pet.breed,
    date_of_birth: pet.date_of_birth,
    photo_url: pet.photo_url,
    owner_id: pet.user_id,
    owner_name: pet.users.name,
    owner_email: pet.users.email,
    created_at: pet.created_at ?? new Date(),
    share_count: Math.max(new Set(pet.pet_owners.map((owner) => owner.user_id)).size - 1, 0),
    condition_count: pet.pet_conditions.length,
    medication_count: pet.pet_medications.length,
    vaccination_count: pet.pet_vaccinations.length,
    allergy_count: pet.pet_allergies.length,
    vet_count: pet.pet_vets.length,
  };
}

function topCounts(values: string[]): { name: string; count: number }[] {
  const counts = new Map<string, number>();

  for (const value of values) {
    const key = value.trim();
    if (!key) {
      continue;
    }
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    })
    .slice(0, 10);
}

function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function dateKey(value: Date): string {
  return startOfUtcDay(value).toISOString().slice(0, 10);
}

// ============ User Queries ============

export async function findAllUsersWithPagination(
  options: UsersFilterOptions
): Promise<PaginationResult<AdminUser>> {
  const users = await prisma.users.findMany({
    where: buildUserWhere(options),
    include: {
      pet_owners_pet_owners_user_idTousers: {
        where: {
          accepted_at: {
            not: null,
          },
        },
        select: {
          pet_id: true,
          role: true,
        },
      },
    },
  });

  const mappedUsers = users.map(mapAdminUser);
  const sortedUsers = (() => {
    switch (options.sortBy) {
      case 'name':
        return sortRows(mappedUsers, options.sortOrder, (user) => user.name);
      case 'email':
        return sortRows(mappedUsers, options.sortOrder, (user) => user.email);
      case 'is_admin':
        return sortRows(mappedUsers, options.sortOrder, (user) => user.is_admin);
      case 'subscription_status':
        return sortRows(mappedUsers, options.sortOrder, (user) => user.subscription_status);
      case 'subscription_tier':
        return sortRows(mappedUsers, options.sortOrder, (user) => user.subscription_tier);
      case 'created_at':
        return sortRows(mappedUsers, options.sortOrder, (user) => user.created_at);
      case 'owned_pet_count':
        return sortRows(mappedUsers, options.sortOrder, (user) => user.owned_pet_count);
      case 'shared_pet_count':
        return sortRows(mappedUsers, options.sortOrder, (user) => user.shared_pet_count);
      case 'id':
      default:
        return sortRows(mappedUsers, options.sortOrder, (user) => user.id);
    }
  })();

  const total = sortedUsers.length;
  const data = sortedUsers.slice(options.offset, options.offset + options.limit);

  return {
    data,
    pagination: {
      total,
      limit: options.limit,
      offset: options.offset,
      hasMore: options.offset + options.limit < total,
    },
  };
}

export async function findUserByIdWithStats(id: number): Promise<AdminUserDetails | null> {
  const user = await prisma.users.findUnique({
    where: {
      id,
    },
    include: {
      pet_owners_pet_owners_user_idTousers: {
        where: {
          accepted_at: {
            not: null,
          },
        },
        include: {
          pets: {
            select: {
              id: true,
              name: true,
              species: true,
              photo_url: true,
              created_at: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  const pets = [...user.pet_owners_pet_owners_user_idTousers]
    .sort((a, b) => {
      const aCreatedAt = a.pets.created_at?.getTime() ?? 0;
      const bCreatedAt = b.pets.created_at?.getTime() ?? 0;
      return bCreatedAt - aCreatedAt;
    })
    .map((petOwner) => ({
      id: petOwner.pets.id,
      name: petOwner.pets.name,
      species: petOwner.pets.species,
      photo_url: petOwner.pets.photo_url,
      role: petOwner.role,
    }));

  return {
    ...mapAdminUser(user),
    pets,
  };
}

export async function findUserPets(userId: number): Promise<AdminUserPet[]> {
  const petOwners = await prisma.pet_owners.findMany({
    where: {
      user_id: userId,
      accepted_at: {
        not: null,
      },
    },
    include: {
      pets: {
        select: {
          id: true,
          name: true,
          species: true,
          photo_url: true,
          created_at: true,
        },
      },
    },
  });

  return [...petOwners]
    .sort((a, b) => {
      const aCreatedAt = a.pets.created_at?.getTime() ?? 0;
      const bCreatedAt = b.pets.created_at?.getTime() ?? 0;
      return bCreatedAt - aCreatedAt;
    })
    .map((petOwner) => ({
      id: petOwner.pets.id,
      name: petOwner.pets.name,
      species: petOwner.pets.species,
      photo_url: petOwner.pets.photo_url,
      role: petOwner.role,
    }));
}

// ============ Pet Queries ============

export async function findAllPetsWithPagination(
  options: PetsFilterOptions
): Promise<PaginationResult<AdminPet>> {
  const pets = await prisma.pets.findMany({
    where: buildPetWhere(options),
    include: {
      users: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      pet_owners: {
        where: {
          accepted_at: {
            not: null,
          },
        },
        select: {
          user_id: true,
        },
      },
      pet_conditions: {
        select: {
          id: true,
        },
      },
      pet_medications: {
        select: {
          id: true,
        },
      },
      pet_vaccinations: {
        select: {
          id: true,
        },
      },
      pet_allergies: {
        select: {
          id: true,
        },
      },
      pet_vets: {
        select: {
          id: true,
        },
      },
    },
  });

  const mappedPets = pets.map(mapAdminPet);
  const sortedPets = (() => {
    switch (options.sortBy) {
      case 'name':
        return sortRows(mappedPets, options.sortOrder, (pet) => pet.name);
      case 'species':
        return sortRows(mappedPets, options.sortOrder, (pet) => pet.species);
      case 'created_at':
        return sortRows(mappedPets, options.sortOrder, (pet) => pet.created_at);
      case 'owner_name':
        return sortRows(mappedPets, options.sortOrder, (pet) => pet.owner_name);
      case 'share_count':
        return sortRows(mappedPets, options.sortOrder, (pet) => pet.share_count);
      case 'id':
      default:
        return sortRows(mappedPets, options.sortOrder, (pet) => pet.id);
    }
  })();

  const total = sortedPets.length;
  const data = sortedPets.slice(options.offset, options.offset + options.limit);

  return {
    data,
    pagination: {
      total,
      limit: options.limit,
      offset: options.offset,
      hasMore: options.offset + options.limit < total,
    },
  };
}

export async function findPetByIdWithDetails(id: number): Promise<AdminPetDetails | null> {
  const pet = await prisma.pets.findUnique({
    where: {
      id,
    },
    include: {
      users: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      pet_owners: {
        include: {
          users_pet_owners_user_idTousers: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
      pet_vets: true,
      pet_conditions: true,
      pet_allergies: true,
      pet_medications: true,
      pet_vaccinations: true,
    },
  });

  if (!pet) {
    return null;
  }

  const basePet = mapAdminPet({
    ...pet,
    pet_owners: pet.pet_owners.filter((owner) => owner.accepted_at !== null),
  });

  const owners = [...pet.pet_owners]
    .sort((a, b) => {
      const roleCompare =
        a.role === b.role ? 0 : a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : a.role.localeCompare(b.role);
      if (roleCompare !== 0) {
        return roleCompare;
      }
      return (a.accepted_at?.getTime() ?? 0) - (b.accepted_at?.getTime() ?? 0);
    })
    .map((owner) => ({
      user_id: owner.user_id,
      name: owner.users_pet_owners_user_idTousers.name,
      email: owner.users_pet_owners_user_idTousers.email,
      role: owner.role,
      accepted_at: owner.accepted_at,
    }));

  const vets = [...pet.pet_vets]
    .sort((a, b) =>
      normalizeString(a.vet_name || a.clinic_name).localeCompare(
        normalizeString(b.vet_name || b.clinic_name),
        undefined,
        { sensitivity: 'base' }
      )
    )
    .map((vet) => ({
      id: vet.id,
      name: vet.vet_name || vet.clinic_name,
      clinic_name: vet.clinic_name,
      phone: vet.phone,
      email: vet.email,
    }));

  const conditions = [...pet.pet_conditions]
    .sort((a, b) => {
      if (a.diagnosed_date && b.diagnosed_date) {
        return b.diagnosed_date.getTime() - a.diagnosed_date.getTime();
      }
      if (a.diagnosed_date) {
        return -1;
      }
      if (b.diagnosed_date) {
        return 1;
      }
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    })
    .map((condition) => ({
      id: condition.id,
      name: condition.name,
      diagnosed_date: condition.diagnosed_date,
      notes: condition.notes,
    }));

  const allergies = [...pet.pet_allergies]
    .sort((a, b) => a.allergen.localeCompare(b.allergen, undefined, { sensitivity: 'base' }))
    .map((allergy) => ({
      id: allergy.id,
      allergen: allergy.allergen,
      reaction: allergy.reaction,
      severity: allergy.severity,
    }));

  const medications = [...pet.pet_medications]
    .sort((a, b) => {
      if (a.start_date && b.start_date) {
        return b.start_date.getTime() - a.start_date.getTime();
      }
      if (a.start_date) {
        return -1;
      }
      if (b.start_date) {
        return 1;
      }
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    })
    .map((medication) => ({
      id: medication.id,
      name: medication.name,
      dosage: medication.dosage,
      frequency: medication.frequency,
      start_date: medication.start_date,
    }));

  const vaccinations = [...pet.pet_vaccinations]
    .sort((a, b) => {
      if (a.administered_date && b.administered_date) {
        return b.administered_date.getTime() - a.administered_date.getTime();
      }
      if (a.administered_date) {
        return -1;
      }
      if (b.administered_date) {
        return 1;
      }
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    })
    .map((vaccination) => ({
      id: vaccination.id,
      name: vaccination.name,
      date_administered: vaccination.administered_date,
      next_due_date: vaccination.expiration_date,
    }));

  return {
    ...basePet,
    weight: decimalToNumber(pet.weight_kg),
    sex: pet.sex,
    microchip_number: pet.microchip_id,
    is_emergency_card_enabled: Boolean(pet.share_id),
    share_id: pet.share_id,
    owners,
    vets,
    conditions,
    allergies,
    medications,
    vaccinations,
  };
}

// ============ Analytics Queries ============

export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  const weekAgo = new Date();
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);

  const [
    totalUsers,
    totalPets,
    newUsersThisWeek,
    newPetsThisWeek,
    allPets,
    usersWithPets,
  ] = await Promise.all([
    prisma.users.count(),
    prisma.pets.count(),
    prisma.users.count({
      where: {
        created_at: {
          gte: weekAgo,
        },
      },
    }),
    prisma.pets.count({
      where: {
        created_at: {
          gte: weekAgo,
        },
      },
    }),
    prisma.pets.findMany({
      select: {
        species: true,
      },
    }),
    prisma.pet_owners.findMany({
      distinct: ['user_id'],
      select: {
        user_id: true,
      },
    }),
  ]);

  const mostCommonSpecies =
    topCounts(allPets.map((pet) => pet.species))[0]?.name ?? 'unknown';
  const adoption_rate =
    totalUsers > 0 ? Math.round((usersWithPets.length / totalUsers) * 10000) / 100 : 0;

  return {
    total_users: totalUsers,
    total_pets: totalPets,
    new_users_this_week: newUsersThisWeek,
    new_pets_this_week: newPetsThisWeek,
    most_common_species: mostCommonSpecies,
    adoption_rate,
  };
}

export async function getActivityMetrics(days: number = 30): Promise<ActivityMetrics[]> {
  const today = startOfUtcDay(new Date());
  const startDate = new Date(today);
  startDate.setUTCDate(startDate.getUTCDate() - days);

  const [users, pets, shareAccess] = await Promise.all([
    prisma.users.findMany({
      where: {
        created_at: {
          gte: startDate,
        },
      },
      select: {
        created_at: true,
      },
    }),
    prisma.pets.findMany({
      where: {
        created_at: {
          gte: startDate,
        },
      },
      select: {
        created_at: true,
      },
    }),
    prisma.pet_owners.findMany({
      where: {
        accepted_at: {
          gte: startDate,
        },
        role: {
          not: 'owner',
        },
      },
      select: {
        accepted_at: true,
      },
    }),
  ]);

  const registrationsByDay = new Map<string, number>();
  for (const user of users) {
    if (!user.created_at) {
      continue;
    }
    const key = dateKey(user.created_at);
    registrationsByDay.set(key, (registrationsByDay.get(key) ?? 0) + 1);
  }

  const petsByDay = new Map<string, number>();
  for (const pet of pets) {
    if (!pet.created_at) {
      continue;
    }
    const key = dateKey(pet.created_at);
    petsByDay.set(key, (petsByDay.get(key) ?? 0) + 1);
  }

  const sharesByDay = new Map<string, number>();
  for (const petOwner of shareAccess) {
    if (!petOwner.accepted_at) {
      continue;
    }
    const key = dateKey(petOwner.accepted_at);
    sharesByDay.set(key, (sharesByDay.get(key) ?? 0) + 1);
  }

  const metrics: ActivityMetrics[] = [];
  for (let offset = 0; offset <= days; offset += 1) {
    const date = new Date(startDate);
    date.setUTCDate(startDate.getUTCDate() + offset);
    const key = dateKey(date);
    metrics.push({
      date,
      registrations: registrationsByDay.get(key) ?? 0,
      pets_created: petsByDay.get(key) ?? 0,
      share_access: sharesByDay.get(key) ?? 0,
    });
  }

  return metrics;
}

export async function getHealthInsights(): Promise<HealthInsights> {
  const [conditions, medications, totalPets, petsWithAllergies, petsWithMicrochips] =
    await Promise.all([
      prisma.pet_conditions.findMany({
        select: {
          name: true,
        },
      }),
      prisma.pet_medications.findMany({
        select: {
          name: true,
        },
      }),
      prisma.pets.count(),
      prisma.pet_allergies.findMany({
        distinct: ['pet_id'],
        select: {
          pet_id: true,
        },
      }),
      prisma.pets.count({
        where: {
          microchip_id: {
            not: null,
          },
        },
      }),
    ]);

  const pets_with_allergies_pct =
    totalPets > 0 ? Math.round((petsWithAllergies.length / totalPets) * 10000) / 100 : 0;
  const pets_with_microchips_pct =
    totalPets > 0 ? Math.round((petsWithMicrochips / totalPets) * 10000) / 100 : 0;

  return {
    most_common_conditions: topCounts(conditions.map((condition) => condition.name)),
    most_common_medications: topCounts(medications.map((medication) => medication.name)),
    pets_with_allergies_pct,
    pets_with_microchips_pct,
  };
}
