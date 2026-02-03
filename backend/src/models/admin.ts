import { query, queryOne } from '../db/pool.js';

// ============ Types ============

export interface AdminUser {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  is_admin: boolean;
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

// ============ User Queries ============

export async function findAllUsersWithPagination(
  options: UsersFilterOptions
): Promise<PaginationResult<AdminUser>> {
  const { limit, offset, sortBy, sortOrder, search, isAdmin, createdAfter, createdBefore } = options;

  // Build WHERE clause
  const conditions: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (search) {
    conditions.push(`(u.name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`);
    values.push(`%${search}%`);
    paramCount++;
  }

  if (isAdmin !== undefined) {
    conditions.push(`u.is_admin = $${paramCount}`);
    values.push(isAdmin);
    paramCount++;
  }

  if (createdAfter) {
    conditions.push(`u.created_at >= $${paramCount}`);
    values.push(createdAfter);
    paramCount++;
  }

  if (createdBefore) {
    conditions.push(`u.created_at <= $${paramCount}`);
    values.push(createdBefore);
    paramCount++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Validate sortBy to prevent SQL injection
  const validSortColumns = ['id', 'name', 'email', 'is_admin', 'created_at', 'owned_pet_count', 'shared_pet_count'];
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'id';

  // Get total count
  const countQuery = `
    SELECT COUNT(DISTINCT u.id) as total
    FROM users u
    ${whereClause}
  `;
  const countResult = await queryOne<{ total: string }>(countQuery, values);
  const total = parseInt(countResult?.total || '0');

  // Get paginated data
  const dataQuery = `
    SELECT
      u.id,
      u.email,
      u.name,
      u.phone,
      u.is_admin,
      u.created_at,
      u.updated_at,
      COUNT(DISTINCT CASE WHEN po.role = 'owner' THEN po.pet_id END) as owned_pet_count,
      COUNT(DISTINCT CASE WHEN po.role != 'owner' THEN po.pet_id END) as shared_pet_count
    FROM users u
    LEFT JOIN pet_owners po ON po.user_id = u.id AND po.accepted_at IS NOT NULL
    ${whereClause}
    GROUP BY u.id
    ORDER BY ${sortColumn} ${sortOrder}
    LIMIT $${paramCount} OFFSET $${paramCount + 1}
  `;

  values.push(limit, offset);
  const users = await query<AdminUser>(dataQuery, values);

  return {
    data: users,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  };
}

export async function findUserByIdWithStats(id: number): Promise<AdminUserDetails | null> {
  const user = await queryOne<AdminUser>(
    `SELECT
      u.id,
      u.email,
      u.name,
      u.phone,
      u.is_admin,
      u.created_at,
      u.updated_at,
      COUNT(DISTINCT CASE WHEN po.role = 'owner' THEN po.pet_id END) as owned_pet_count,
      COUNT(DISTINCT CASE WHEN po.role != 'owner' THEN po.pet_id END) as shared_pet_count
    FROM users u
    LEFT JOIN pet_owners po ON po.user_id = u.id AND po.accepted_at IS NOT NULL
    WHERE u.id = $1
    GROUP BY u.id`,
    [id]
  );

  if (!user) return null;

  // Get pets for this user
  const pets = await query<AdminUserPet>(
    `SELECT
      p.id,
      p.name,
      p.species,
      p.photo_url,
      po.role
    FROM pets p
    JOIN pet_owners po ON po.pet_id = p.id
    WHERE po.user_id = $1 AND po.accepted_at IS NOT NULL
    ORDER BY p.created_at DESC`,
    [id]
  );

  return {
    ...user,
    pets,
  };
}

export async function findUserPets(userId: number): Promise<AdminUserPet[]> {
  return query<AdminUserPet>(
    `SELECT
      p.id,
      p.name,
      p.species,
      p.photo_url,
      po.role
    FROM pets p
    JOIN pet_owners po ON po.pet_id = p.id
    WHERE po.user_id = $1 AND po.accepted_at IS NOT NULL
    ORDER BY p.created_at DESC`,
    [userId]
  );
}

// ============ Pet Queries ============

export async function findAllPetsWithPagination(
  options: PetsFilterOptions
): Promise<PaginationResult<AdminPet>> {
  const { limit, offset, sortBy, sortOrder, search, species, createdAfter, createdBefore } = options;

  // Build WHERE clause
  const conditions: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (search) {
    conditions.push(`(p.name ILIKE $${paramCount} OR u.name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`);
    values.push(`%${search}%`);
    paramCount++;
  }

  if (species) {
    conditions.push(`p.species = $${paramCount}`);
    values.push(species);
    paramCount++;
  }

  if (createdAfter) {
    conditions.push(`p.created_at >= $${paramCount}`);
    values.push(createdAfter);
    paramCount++;
  }

  if (createdBefore) {
    conditions.push(`p.created_at <= $${paramCount}`);
    values.push(createdBefore);
    paramCount++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Validate sortBy to prevent SQL injection
  const validSortColumns = ['id', 'name', 'species', 'created_at', 'owner_name', 'share_count'];
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'id';

  // Get total count
  const countQuery = `
    SELECT COUNT(DISTINCT p.id) as total
    FROM pets p
    JOIN users u ON u.id = p.user_id
    ${whereClause}
  `;
  const countResult = await queryOne<{ total: string }>(countQuery, values);
  const total = parseInt(countResult?.total || '0');

  // Get paginated data
  const dataQuery = `
    SELECT
      p.id,
      p.name,
      p.species,
      p.breed,
      p.date_of_birth,
      p.photo_url,
      p.user_id as owner_id,
      u.name as owner_name,
      u.email as owner_email,
      p.created_at,
      COUNT(DISTINCT po.user_id) - 1 as share_count,
      COUNT(DISTINCT pc.id) as condition_count,
      COUNT(DISTINCT pm.id) as medication_count,
      COUNT(DISTINCT pv.id) as vaccination_count,
      COUNT(DISTINCT pa.id) as allergy_count,
      COUNT(DISTINCT pvet.id) as vet_count
    FROM pets p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN pet_owners po ON po.pet_id = p.id AND po.accepted_at IS NOT NULL
    LEFT JOIN pet_conditions pc ON pc.pet_id = p.id
    LEFT JOIN pet_medications pm ON pm.pet_id = p.id
    LEFT JOIN pet_vaccinations pv ON pv.pet_id = p.id
    LEFT JOIN pet_allergies pa ON pa.pet_id = p.id
    LEFT JOIN pet_vets pvet ON pvet.pet_id = p.id
    ${whereClause}
    GROUP BY p.id, u.name, u.email
    ORDER BY ${sortColumn} ${sortOrder}
    LIMIT $${paramCount} OFFSET $${paramCount + 1}
  `;

  values.push(limit, offset);
  const pets = await query<AdminPet>(dataQuery, values);

  return {
    data: pets,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  };
}

export async function findPetByIdWithDetails(id: number): Promise<AdminPetDetails | null> {
  const pet = await queryOne<AdminPetDetails>(
    `SELECT
      p.id,
      p.name,
      p.species,
      p.breed,
      p.date_of_birth,
      p.weight,
      p.sex,
      p.microchip_number,
      p.photo_url,
      p.is_emergency_card_enabled,
      p.share_id,
      p.user_id as owner_id,
      u.name as owner_name,
      u.email as owner_email,
      p.created_at,
      COUNT(DISTINCT po.user_id) - 1 as share_count,
      COUNT(DISTINCT pc.id) as condition_count,
      COUNT(DISTINCT pm.id) as medication_count,
      COUNT(DISTINCT pv.id) as vaccination_count,
      COUNT(DISTINCT pa.id) as allergy_count,
      COUNT(DISTINCT pvet.id) as vet_count
    FROM pets p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN pet_owners po ON po.pet_id = p.id AND po.accepted_at IS NOT NULL
    LEFT JOIN pet_conditions pc ON pc.pet_id = p.id
    LEFT JOIN pet_medications pm ON pm.pet_id = p.id
    LEFT JOIN pet_vaccinations pv ON pv.pet_id = p.id
    LEFT JOIN pet_allergies pa ON pa.pet_id = p.id
    LEFT JOIN pet_vets pvet ON pvet.pet_id = p.id
    WHERE p.id = $1
    GROUP BY p.id, u.name, u.email`,
    [id]
  );

  if (!pet) return null;

  // Get all owners
  const owners = await query<PetOwnerInfo>(
    `SELECT
      po.user_id,
      u.name,
      u.email,
      po.role,
      po.accepted_at
    FROM pet_owners po
    JOIN users u ON u.id = po.user_id
    WHERE po.pet_id = $1
    ORDER BY
      CASE po.role WHEN 'owner' THEN 1 ELSE 2 END,
      po.accepted_at`,
    [id]
  );

  // Get vets
  const vets = await query<PetVet>(
    `SELECT id, name, clinic_name, phone, email
    FROM pet_vets
    WHERE pet_id = $1
    ORDER BY name`,
    [id]
  );

  // Get conditions
  const conditions = await query<PetCondition>(
    `SELECT id, name, diagnosed_date, notes
    FROM pet_conditions
    WHERE pet_id = $1
    ORDER BY diagnosed_date DESC NULLS LAST, name`,
    [id]
  );

  // Get allergies
  const allergies = await query<PetAllergy>(
    `SELECT id, allergen, reaction, severity
    FROM pet_allergies
    WHERE pet_id = $1
    ORDER BY allergen`,
    [id]
  );

  // Get medications
  const medications = await query<PetMedication>(
    `SELECT id, name, dosage, frequency, start_date
    FROM pet_medications
    WHERE pet_id = $1
    ORDER BY start_date DESC NULLS LAST, name`,
    [id]
  );

  // Get vaccinations
  const vaccinations = await query<PetVaccination>(
    `SELECT id, name, date_administered, next_due_date
    FROM pet_vaccinations
    WHERE pet_id = $1
    ORDER BY date_administered DESC NULLS LAST, name`,
    [id]
  );

  return {
    ...pet,
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
  const result = await queryOne<AnalyticsOverview>(
    `SELECT
      (SELECT COUNT(*) FROM users) as total_users,
      (SELECT COUNT(*) FROM pets) as total_pets,
      (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '7 days') as new_users_this_week,
      (SELECT COUNT(*) FROM pets WHERE created_at >= NOW() - INTERVAL '7 days') as new_pets_this_week,
      (SELECT species FROM pets GROUP BY species ORDER BY COUNT(*) DESC LIMIT 1) as most_common_species,
      ROUND((SELECT COUNT(DISTINCT user_id)::float FROM pet_owners) / NULLIF((SELECT COUNT(*)::float FROM users), 0) * 100, 2) as adoption_rate
    `
  );

  return result!;
}

export async function getActivityMetrics(days: number = 30): Promise<ActivityMetrics[]> {
  const metrics = await query<ActivityMetrics>(
    `WITH date_series AS (
      SELECT generate_series(
        CURRENT_DATE - INTERVAL '1 day' * $1,
        CURRENT_DATE,
        INTERVAL '1 day'
      )::date as date
    )
    SELECT
      ds.date,
      COALESCE(u.registrations, 0) as registrations,
      COALESCE(p.pets_created, 0) as pets_created,
      COALESCE(po.share_access, 0) as share_access
    FROM date_series ds
    LEFT JOIN (
      SELECT DATE(created_at) as date, COUNT(*) as registrations
      FROM users
      WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * $1
      GROUP BY DATE(created_at)
    ) u ON u.date = ds.date
    LEFT JOIN (
      SELECT DATE(created_at) as date, COUNT(*) as pets_created
      FROM pets
      WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * $1
      GROUP BY DATE(created_at)
    ) p ON p.date = ds.date
    LEFT JOIN (
      SELECT DATE(accepted_at) as date, COUNT(*) as share_access
      FROM pet_owners
      WHERE accepted_at >= CURRENT_DATE - INTERVAL '1 day' * $1 AND role != 'owner'
      GROUP BY DATE(accepted_at)
    ) po ON po.date = ds.date
    ORDER BY ds.date`,
    [days]
  );

  return metrics;
}

export async function getHealthInsights(): Promise<HealthInsights> {
  // Get most common conditions
  const conditions = await query<{ name: string; count: number }>(
    `SELECT name, COUNT(*) as count
    FROM pet_conditions
    GROUP BY name
    ORDER BY count DESC
    LIMIT 10`
  );

  // Get most common medications
  const medications = await query<{ name: string; count: number }>(
    `SELECT name, COUNT(*) as count
    FROM pet_medications
    GROUP BY name
    ORDER BY count DESC
    LIMIT 10`
  );

  // Get allergy and microchip percentages
  const stats = await queryOne<{ pets_with_allergies_pct: number; pets_with_microchips_pct: number }>(
    `SELECT
      ROUND((SELECT COUNT(DISTINCT pet_id)::float FROM pet_allergies) / NULLIF((SELECT COUNT(*)::float FROM pets), 0) * 100, 2) as pets_with_allergies_pct,
      ROUND((SELECT COUNT(*)::float FROM pets WHERE microchip_number IS NOT NULL) / NULLIF((SELECT COUNT(*)::float FROM pets), 0) * 100, 2) as pets_with_microchips_pct
    `
  );

  return {
    most_common_conditions: conditions,
    most_common_medications: medications,
    pets_with_allergies_pct: stats?.pets_with_allergies_pct || 0,
    pets_with_microchips_pct: stats?.pets_with_microchips_pct || 0,
  };
}
