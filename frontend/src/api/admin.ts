import { api } from './client';

// ============ Types ============

export interface AdminUser {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  is_admin: boolean;
  subscription_status: 'free' | 'trialing' | 'active' | 'past_due' | 'canceled';
  subscription_tier: 'free' | 'premium';
  subscription_current_period_end: string | null;
  created_at: string;
  updated_at: string;
  owned_pet_count: number;
  shared_pet_count: number;
}

export interface AdminUserPet {
  id: number;
  name: string;
  species: string;
  photo_url: string | null;
  role: string;
}

export interface AdminUserDetails extends AdminUser {
  pets?: AdminUserPet[];
}

export interface AdminPet {
  id: number;
  name: string;
  species: string;
  breed: string | null;
  date_of_birth: string | null;
  photo_url: string | null;
  owner_id: number;
  owner_name: string;
  owner_email: string;
  created_at: string;
  share_count: number;
  condition_count: number;
  medication_count: number;
  vaccination_count: number;
  allergy_count: number;
  vet_count: number;
}

export interface PetOwnerInfo {
  user_id: number;
  name: string;
  email: string;
  role: string;
  accepted_at: string | null;
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
  diagnosed_date: string | null;
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
  start_date: string | null;
}

export interface PetVaccination {
  id: number;
  name: string;
  date_administered: string | null;
  next_due_date: string | null;
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

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface UsersQueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'id' | 'name' | 'email' | 'is_admin' | 'subscription_status' | 'subscription_tier' | 'created_at' | 'owned_pet_count' | 'shared_pet_count';
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
  isAdmin?: boolean;
  createdAfter?: string;
  createdBefore?: string;
}

export interface PetsQueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'id' | 'name' | 'species' | 'created_at' | 'owner_name' | 'share_count';
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
  species?: string;
  createdAfter?: string;
  createdBefore?: string;
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
  date: string;
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

export interface SubscriptionPricing {
  monthly_price_cents: number;
  annual_price_cents: number;
  currency: string;
}

export interface SubscriptionTrial {
  trial_days: number;
  require_card: boolean;
}

export interface SubscriptionStripe {
  price_id_monthly: string;
  price_id_annual: string;
  webhook_secret: string;
}

export interface SubscriptionConfig {
  pricing: SubscriptionPricing;
  trial: SubscriptionTrial;
  stripe: SubscriptionStripe;
}

// ============ Admin API ============

export const adminApi = {
  // Users
  fetchUsers: (token: string, options?: UsersQueryOptions) => {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    if (options?.sortBy) params.append('sortBy', options.sortBy);
    if (options?.sortOrder) params.append('sortOrder', options.sortOrder);
    if (options?.search) params.append('search', options.search);
    if (options?.isAdmin !== undefined) params.append('isAdmin', options.isAdmin.toString());
    if (options?.createdAfter) params.append('createdAfter', options.createdAfter);
    if (options?.createdBefore) params.append('createdBefore', options.createdBefore);

    const queryString = params.toString();
    return api.get<PaginatedResponse<AdminUser>>(
      `/api/admin/users${queryString ? `?${queryString}` : ''}`,
      token
    );
  },

  fetchUserById: (id: number, token: string) =>
    api.get<AdminUserDetails>(`/api/admin/users/${id}`, token),

  fetchUserPets: (id: number, token: string) =>
    api.get<AdminUserPet[]>(`/api/admin/users/${id}/pets`, token),

  // Pets
  fetchPets: (token: string, options?: PetsQueryOptions) => {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    if (options?.sortBy) params.append('sortBy', options.sortBy);
    if (options?.sortOrder) params.append('sortOrder', options.sortOrder);
    if (options?.search) params.append('search', options.search);
    if (options?.species) params.append('species', options.species);
    if (options?.createdAfter) params.append('createdAfter', options.createdAfter);
    if (options?.createdBefore) params.append('createdBefore', options.createdBefore);

    const queryString = params.toString();
    return api.get<PaginatedResponse<AdminPet>>(
      `/api/admin/pets${queryString ? `?${queryString}` : ''}`,
      token
    );
  },

  fetchPetById: (id: number, token: string) =>
    api.get<AdminPetDetails>(`/api/admin/pets/${id}`, token),

  // Analytics
  fetchAnalyticsOverview: (token: string) =>
    api.get<AnalyticsOverview>('/api/admin/analytics/overview', token),

  fetchActivityMetrics: (token: string, days: number = 30) =>
    api.get<ActivityMetrics[]>(`/api/admin/analytics/activity?days=${days}`, token),

  fetchHealthInsights: (token: string) =>
    api.get<HealthInsights>('/api/admin/analytics/health-insights', token),

  // Subscription config
  getSubscriptionConfig: (token: string) =>
    api.get<SubscriptionConfig>('/api/admin/subscription/config', token),

  updatePricing: (token: string, pricing: SubscriptionPricing) =>
    api.put<SubscriptionPricing>('/api/admin/subscription/pricing', pricing, token),

  updateTrial: (token: string, trial: SubscriptionTrial) =>
    api.put<SubscriptionTrial>('/api/admin/subscription/trial', trial, token),

  updateStripe: (token: string, stripe: SubscriptionStripe) =>
    api.put<SubscriptionStripe>('/api/admin/subscription/stripe', stripe, token),
};
