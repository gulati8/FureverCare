// In production, use empty string for same-origin requests (Caddy proxies /api/*)
// In development, default to localhost:3001
export const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '' : 'http://localhost:3001');

interface RequestOptions extends RequestInit {
  token?: string;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string, token?: string) =>
    request<T>(endpoint, { method: 'GET', token }),

  post: <T>(endpoint: string, data: unknown, token?: string) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(data), token }),

  patch: <T>(endpoint: string, data: unknown, token?: string) =>
    request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(data), token }),

  delete: <T>(endpoint: string, token?: string) =>
    request<T>(endpoint, { method: 'DELETE', token }),
};

// Auth API
export const authApi = {
  register: (data: { email: string; password: string; name: string; phone?: string }) =>
    api.post<{ user: User; token: string }>('/api/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post<{ user: User; token: string }>('/api/auth/login', data),

  getProfile: (token: string) =>
    api.get<User>('/api/auth/me', token),

  updateProfile: (data: { name?: string; phone?: string }, token: string) =>
    api.patch<User>('/api/auth/me', data, token),

  forgotPassword: (email: string) =>
    api.post<{ message: string }>('/api/auth/forgot-password', { email }),

  validateResetToken: (token: string) =>
    api.get<{ valid: boolean; error?: string }>(`/api/auth/reset-password/${token}`),

  resetPassword: (data: { token: string; password: string }) =>
    api.post<{ message: string; user: User; token: string }>('/api/auth/reset-password', data),
};

// Pets API
export const petsApi = {
  list: (token: string) =>
    api.get<Pet[]>('/api/pets', token),

  get: (id: number, token: string) =>
    api.get<Pet>(`/api/pets/${id}`, token),

  create: (data: CreatePetInput, token: string) =>
    api.post<Pet>('/api/pets', data, token),

  update: (id: number, data: Partial<CreatePetInput>, token: string) =>
    api.patch<Pet>(`/api/pets/${id}`, data, token),

  delete: (id: number, token: string) =>
    api.delete(`/api/pets/${id}`, token),

  regenerateShareId: (id: number, token: string) =>
    api.post<{ share_id: string }>(`/api/pets/${id}/regenerate-share-id`, {}, token),

  // Health records
  getVets: (petId: number, token: string) =>
    api.get<PetVet[]>(`/api/pets/${petId}/vets`, token),
  addVet: (petId: number, data: Omit<PetVet, 'id' | 'pet_id' | 'created_at'>, token: string) =>
    api.post<PetVet>(`/api/pets/${petId}/vets`, data, token),
  deleteVet: (petId: number, vetId: number, token: string) =>
    api.delete(`/api/pets/${petId}/vets/${vetId}`, token),

  getConditions: (petId: number, token: string) =>
    api.get<PetCondition[]>(`/api/pets/${petId}/conditions`, token),
  addCondition: (petId: number, data: Omit<PetCondition, 'id' | 'pet_id' | 'created_at'>, token: string) =>
    api.post<PetCondition>(`/api/pets/${petId}/conditions`, data, token),
  deleteCondition: (petId: number, conditionId: number, token: string) =>
    api.delete(`/api/pets/${petId}/conditions/${conditionId}`, token),

  getAllergies: (petId: number, token: string) =>
    api.get<PetAllergy[]>(`/api/pets/${petId}/allergies`, token),
  addAllergy: (petId: number, data: Omit<PetAllergy, 'id' | 'pet_id' | 'created_at'>, token: string) =>
    api.post<PetAllergy>(`/api/pets/${petId}/allergies`, data, token),
  deleteAllergy: (petId: number, allergyId: number, token: string) =>
    api.delete(`/api/pets/${petId}/allergies/${allergyId}`, token),

  getMedications: (petId: number, token: string) =>
    api.get<PetMedication[]>(`/api/pets/${petId}/medications`, token),
  addMedication: (petId: number, data: Omit<PetMedication, 'id' | 'pet_id' | 'created_at'>, token: string) =>
    api.post<PetMedication>(`/api/pets/${petId}/medications`, data, token),
  updateMedication: (petId: number, medId: number, data: Partial<PetMedication>, token: string) =>
    api.patch<PetMedication>(`/api/pets/${petId}/medications/${medId}`, data, token),
  deleteMedication: (petId: number, medId: number, token: string) =>
    api.delete(`/api/pets/${petId}/medications/${medId}`, token),

  getVaccinations: (petId: number, token: string) =>
    api.get<PetVaccination[]>(`/api/pets/${petId}/vaccinations`, token),
  addVaccination: (petId: number, data: Omit<PetVaccination, 'id' | 'pet_id' | 'created_at'>, token: string) =>
    api.post<PetVaccination>(`/api/pets/${petId}/vaccinations`, data, token),
  deleteVaccination: (petId: number, vacId: number, token: string) =>
    api.delete(`/api/pets/${petId}/vaccinations/${vacId}`, token),

  getEmergencyContacts: (petId: number, token: string) =>
    api.get<PetEmergencyContact[]>(`/api/pets/${petId}/emergency-contacts`, token),
  addEmergencyContact: (petId: number, data: Omit<PetEmergencyContact, 'id' | 'pet_id' | 'created_at'>, token: string) =>
    api.post<PetEmergencyContact>(`/api/pets/${petId}/emergency-contacts`, data, token),
  deleteEmergencyContact: (petId: number, contactId: number, token: string) =>
    api.delete(`/api/pets/${petId}/emergency-contacts/${contactId}`, token),
};

// Public API (no auth required)
export const publicApi = {
  getEmergencyCard: (shareId: string) =>
    api.get<EmergencyCard>(`/api/public/card/${shareId}`),

  // Token-based sharing (time-limited, PIN-protected)
  getTokenInfo: (token: string) =>
    api.get<ShareTokenInfo>(`/api/public/token/${token}/info`),

  accessWithToken: (token: string, pin?: string) =>
    api.post<EmergencyCard>(`/api/public/token/${token}/access`, { pin }),
};

// Share Tokens API (authenticated)
export const shareTokensApi = {
  list: (petId: number, token: string) =>
    api.get<ShareToken[]>(`/api/pets/${petId}/share-tokens`, token),

  create: (petId: number, data: CreateShareTokenInput, token: string) =>
    api.post<ShareToken>(`/api/pets/${petId}/share-tokens`, data, token),

  delete: (petId: number, tokenId: number, token: string) =>
    api.delete(`/api/pets/${petId}/share-tokens/${tokenId}`, token),

  deactivate: (petId: number, tokenId: number, token: string) =>
    api.patch<ShareToken>(`/api/pets/${petId}/share-tokens/${tokenId}/deactivate`, {}, token),
};

// Types
export interface User {
  id: number;
  email: string;
  name: string;
  phone: string | null;
}

export interface Pet {
  id: number;
  user_id: number;
  share_id: string;
  name: string;
  species: string;
  breed: string | null;
  date_of_birth: string | null;
  weight_kg: number | null;
  weight_unit: 'lbs' | 'kg' | null;
  sex: string | null;
  is_fixed: boolean;
  microchip_id: string | null;
  photo_url: string | null;
  special_instructions: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePetInput {
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
}

export interface PetVet {
  id: number;
  pet_id: number;
  clinic_name: string;
  vet_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  is_primary: boolean;
  created_at: string;
}

export interface PetCondition {
  id: number;
  pet_id: number;
  name: string;
  diagnosed_date: string | null;
  notes: string | null;
  severity: string | null;
  created_at: string;
}

export interface PetAllergy {
  id: number;
  pet_id: number;
  allergen: string;
  reaction: string | null;
  severity: string | null;
  created_at: string;
}

export interface PetMedication {
  id: number;
  pet_id: number;
  name: string;
  dosage: string | null;
  frequency: string | null;
  start_date: string | null;
  end_date: string | null;
  prescribing_vet: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PetVaccination {
  id: number;
  pet_id: number;
  name: string;
  administered_date: string;
  expiration_date: string | null;
  administered_by: string | null;
  lot_number: string | null;
  created_at: string;
}

export interface PetEmergencyContact {
  id: number;
  pet_id: number;
  name: string;
  relationship: string | null;
  phone: string;
  email: string | null;
  is_primary: boolean;
  created_at: string;
}

export interface EmergencyCard {
  pet: {
    name: string;
    species: string;
    breed: string | null;
    age: string | null;
    date_of_birth: string | null;
    weight_kg: number | null;
    weight_unit: 'lbs' | 'kg' | null;
    sex: string | null;
    is_fixed: boolean;
    microchip_id: string | null;
    photo_url: string | null;
    special_instructions: string | null;
  };
  owner: {
    name: string;
    phone: string | null;
    email: string;
  } | null;
  conditions: Array<{ name: string; severity: string | null; notes: string | null }>;
  allergies: Array<{ allergen: string; reaction: string | null; severity: string | null }>;
  medications: Array<{ name: string; dosage: string | null; frequency: string | null; notes: string | null }>;
  vaccinations: Array<{ name: string; administered_date: string; expiration_date: string | null }>;
  veterinarians: Array<{ clinic_name: string; vet_name: string | null; phone: string | null; is_primary: boolean }>;
  emergency_contacts: Array<{ name: string; relationship: string | null; phone: string; is_primary: boolean }>;
  generated_at: string;
}

// PDF Import Types
export type PdfUploadStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type DocumentType = 'vaccination_record' | 'visit_summary' | 'lab_results' | 'prescription' | 'other';
export type RecordType = 'vaccination' | 'medication' | 'condition' | 'allergy' | 'vet' | 'emergency_contact';
export type ExtractionItemStatus = 'pending' | 'approved' | 'rejected' | 'modified';

export interface PdfUpload {
  id: number;
  pet_id: number;
  uploaded_by: number;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  status: PdfUploadStatus;
  document_type: DocumentType | null;
  processing_started_at: string | null;
  processing_completed_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface PdfExtraction {
  id: number;
  pdf_upload_id: number;
  raw_extraction: Record<string, any> | null;
  mapped_data: Record<string, any> | null;
  extraction_model: string | null;
  tokens_used: number | null;
  status: string;
  reviewed_by: number | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface PdfExtractionItem {
  id: number;
  extraction_id: number;
  record_type: RecordType;
  extracted_data: Record<string, any>;
  confidence_score: number | null;
  user_modified_data: Record<string, any> | null;
  status: ExtractionItemStatus;
  created_record_id: number | null;
  created_record_type: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExtractionWithItems {
  extraction: PdfExtraction;
  items: PdfExtractionItem[];
}

export interface ProcessingResult {
  upload: PdfUpload;
  extraction?: PdfExtraction;
  items?: PdfExtractionItem[];
  error?: string;
}

export interface ApprovalResult {
  approved: Array<{
    itemId: number;
    recordType: string;
    createdRecordId: number;
  }>;
  rejected: number[];
  errors: Array<{ itemId: number; error: string }>;
}

// Audit Log Types
export interface AuditLogEntry {
  id: number;
  entity_type: string;
  entity_id: number;
  action: 'create' | 'update' | 'delete';
  changed_by: number | null;
  changed_by_name: string | null;
  changed_by_email: string | null;
  source: 'manual' | 'pdf_import';
  source_pdf_upload_id: number | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  changed_fields: string[] | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditLogResponse {
  logs: AuditLogEntry[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// Share Token Types
export interface ShareToken {
  id: number;
  token: string;
  label: string | null;
  has_pin: boolean;
  expires_at: string | null;
  created_at: string;
  access_count: number;
  last_accessed_at: string | null;
  is_active: boolean;
  is_expired: boolean;
}

export interface CreateShareTokenInput {
  label?: string;
  pin?: string;
  expires_in_hours?: number;
}

export interface ShareTokenInfo {
  requires_pin: boolean;
  expires_at: string | null;
  label: string | null;
}

// PDF Import API
export const pdfImportApi = {
  // Upload a PDF file
  upload: async (petId: number, file: File, token: string, documentType?: DocumentType): Promise<PdfUpload> => {
    const formData = new FormData();
    formData.append('pdf', file);
    if (documentType) {
      formData.append('documentType', documentType);
    }

    const response = await fetch(`${API_URL}/api/pets/${petId}/pdf-import/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  },

  // List all uploads for a pet
  listUploads: (petId: number, token: string) =>
    api.get<PdfUpload[]>(`/api/pets/${petId}/pdf-import/uploads`, token),

  // Get a specific upload
  getUpload: (petId: number, uploadId: number, token: string) =>
    api.get<PdfUpload>(`/api/pets/${petId}/pdf-import/uploads/${uploadId}`, token),

  // Delete an upload
  deleteUpload: (petId: number, uploadId: number, token: string) =>
    api.delete(`/api/pets/${petId}/pdf-import/uploads/${uploadId}`, token),

  // Process an uploaded PDF
  processUpload: (petId: number, uploadId: number, token: string) =>
    api.post<ProcessingResult>(`/api/pets/${petId}/pdf-import/uploads/${uploadId}/process`, {}, token),

  // Get extraction results
  getExtraction: (petId: number, uploadId: number, token: string) =>
    api.get<ExtractionWithItems>(`/api/pets/${petId}/pdf-import/uploads/${uploadId}/extraction`, token),

  // Approve extraction items
  approveItems: (petId: number, uploadId: number, itemIds: number[], token: string) =>
    api.post<ApprovalResult>(`/api/pets/${petId}/pdf-import/uploads/${uploadId}/extraction/approve`, { itemIds }, token),

  // Reject extraction items
  rejectItems: (petId: number, uploadId: number, itemIds: number[], token: string) =>
    api.post<{ rejected: number[] }>(`/api/pets/${petId}/pdf-import/uploads/${uploadId}/extraction/reject`, { itemIds }, token),

  // Edit an extraction item
  editItem: (petId: number, itemId: number, modifiedData: Record<string, any>, token: string) =>
    api.patch<PdfExtractionItem>(`/api/pets/${petId}/pdf-import/extraction-items/${itemId}`, { modifiedData }, token),
};

// Image/Photo Import Types
export type ImageUploadStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type ImageDocumentType = 'vaccination_card' | 'medication_label' | 'pet_id_tag' | 'medical_record' | 'other';

export interface ImageUpload {
  id: number;
  pet_id: number;
  uploaded_by: number;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  status: ImageUploadStatus;
  document_type: ImageDocumentType | null;
  processing_started_at: string | null;
  processing_completed_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface ImageExtraction {
  id: number;
  image_upload_id: number;
  raw_extraction: Record<string, any> | null;
  mapped_data: Record<string, any> | null;
  extraction_model: string | null;
  tokens_used: number | null;
  status: string;
  reviewed_by: number | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface ImageExtractionItem {
  id: number;
  extraction_id: number;
  record_type: RecordType;
  extracted_data: Record<string, any>;
  confidence_score: number | null;
  user_modified_data: Record<string, any> | null;
  status: ExtractionItemStatus;
  created_record_id: number | null;
  created_record_type: string | null;
  created_at: string;
  updated_at: string;
}

export interface ImageExtractionWithItems {
  extraction: ImageExtraction;
  items: ImageExtractionItem[];
}

export interface ImageProcessingResult {
  upload: ImageUpload;
  extraction?: ImageExtraction;
  items?: ImageExtractionItem[];
  error?: string;
}

// Photo Import API
export const photoImportApi = {
  // Upload an image file
  upload: async (petId: number, file: File, token: string, documentType?: ImageDocumentType): Promise<ImageUpload> => {
    const formData = new FormData();
    formData.append('image', file);
    if (documentType) {
      formData.append('documentType', documentType);
    }

    const response = await fetch(`${API_URL}/api/pets/${petId}/photo-import/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  },

  // List all uploads for a pet
  listUploads: (petId: number, token: string) =>
    api.get<ImageUpload[]>(`/api/pets/${petId}/photo-import/uploads`, token),

  // Get a specific upload
  getUpload: (petId: number, uploadId: number, token: string) =>
    api.get<ImageUpload>(`/api/pets/${petId}/photo-import/uploads/${uploadId}`, token),

  // Delete an upload
  deleteUpload: (petId: number, uploadId: number, token: string) =>
    api.delete(`/api/pets/${petId}/photo-import/uploads/${uploadId}`, token),

  // Process an uploaded image
  processUpload: (petId: number, uploadId: number, token: string) =>
    api.post<ImageProcessingResult>(`/api/pets/${petId}/photo-import/uploads/${uploadId}/process`, {}, token),

  // Get extraction results
  getExtraction: (petId: number, uploadId: number, token: string) =>
    api.get<ImageExtractionWithItems>(`/api/pets/${petId}/photo-import/uploads/${uploadId}/extraction`, token),

  // Approve extraction items
  approveItems: (petId: number, uploadId: number, itemIds: number[], token: string) =>
    api.post<ApprovalResult>(`/api/pets/${petId}/photo-import/uploads/${uploadId}/extraction/approve`, { itemIds }, token),

  // Reject extraction items
  rejectItems: (petId: number, uploadId: number, itemIds: number[], token: string) =>
    api.post<{ rejected: number[] }>(`/api/pets/${petId}/photo-import/uploads/${uploadId}/extraction/reject`, { itemIds }, token),

  // Edit an extraction item
  editItem: (petId: number, itemId: number, modifiedData: Record<string, any>, token: string) =>
    api.patch<ImageExtractionItem>(`/api/pets/${petId}/photo-import/extraction-items/${itemId}`, { modifiedData }, token),
};

// Consolidated Document Import Types
export type DocumentUploadStatus = 'pending' | 'classifying' | 'classified' | 'processing' | 'completed' | 'failed';
export type DetectedDocumentType = 'vaccination_record' | 'visit_summary' | 'lab_results' | 'prescription' | 'medication_label' | 'pet_id_tag' | 'other';

export interface DocumentUpload {
  id: number;
  pet_id: number;
  uploaded_by: number;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  file_type: 'pdf' | 'image';
  status: DocumentUploadStatus;
  detected_document_type: DetectedDocumentType | null;
  classification_confidence: number | null;
  classification_explanation: string | null;
  processing_started_at: string | null;
  processing_completed_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface DocumentClassification {
  document_type: DetectedDocumentType;
  confidence: number;
  explanation: string;
  summary: {
    medications_count: number;
    conditions_count: number;
    vaccinations_count: number;
    allergies_count: number;
  };
}

export interface DocumentExtraction {
  id: number;
  document_upload_id: number;
  raw_extraction: Record<string, any> | null;
  mapped_data: Record<string, any> | null;
  extraction_model: string | null;
  tokens_used: number | null;
  status: string;
  reviewed_by: number | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface DocumentExtractionItem {
  id: number;
  extraction_id: number;
  record_type: RecordType;
  extracted_data: Record<string, any>;
  confidence_score: number | null;
  user_modified_data: Record<string, any> | null;
  status: ExtractionItemStatus;
  created_record_id: number | null;
  created_record_type: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentExtractionWithItems {
  extraction: DocumentExtraction;
  items: DocumentExtractionItem[];
}

export interface DocumentProcessingResult {
  upload: DocumentUpload;
  classification?: DocumentClassification;
  extraction?: DocumentExtraction;
  items?: DocumentExtractionItem[];
  error?: string;
}

// Consolidated Document Import API
export const documentsApi = {
  // Upload a document (PDF or image)
  upload: async (petId: number, file: File, token: string): Promise<DocumentUpload> => {
    const formData = new FormData();
    formData.append('document', file);

    const response = await fetch(`${API_URL}/api/pets/${petId}/documents/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  },

  // List all document uploads for a pet
  listUploads: (petId: number, token: string) =>
    api.get<DocumentUpload[]>(`/api/pets/${petId}/documents/uploads`, token),

  // Get a specific upload
  getUpload: (petId: number, uploadId: number, token: string) =>
    api.get<DocumentUpload>(`/api/pets/${petId}/documents/uploads/${uploadId}`, token),

  // Delete an upload
  deleteUpload: (petId: number, uploadId: number, token: string) =>
    api.delete(`/api/pets/${petId}/documents/uploads/${uploadId}`, token),

  // Classify an uploaded document (detect type without full extraction)
  classifyUpload: (petId: number, uploadId: number, token: string) =>
    api.post<{ upload: DocumentUpload; classification: DocumentClassification }>(
      `/api/pets/${petId}/documents/uploads/${uploadId}/classify`,
      {},
      token
    ),

  // Process an uploaded document (full extraction)
  processUpload: (petId: number, uploadId: number, token: string) =>
    api.post<DocumentProcessingResult>(`/api/pets/${petId}/documents/uploads/${uploadId}/process`, {}, token),

  // Get extraction results
  getExtraction: (petId: number, uploadId: number, token: string) =>
    api.get<DocumentExtractionWithItems>(`/api/pets/${petId}/documents/uploads/${uploadId}/extraction`, token),

  // Approve extraction items
  approveItems: (petId: number, uploadId: number, itemIds: number[], token: string) =>
    api.post<ApprovalResult>(`/api/pets/${petId}/documents/uploads/${uploadId}/extraction/approve`, { itemIds }, token),

  // Reject extraction items
  rejectItems: (petId: number, uploadId: number, itemIds: number[], token: string) =>
    api.post<{ rejected: number[] }>(`/api/pets/${petId}/documents/uploads/${uploadId}/extraction/reject`, { itemIds }, token),

  // Edit an extraction item
  editItem: (petId: number, itemId: number, modifiedData: Record<string, any>, token: string) =>
    api.patch<DocumentExtractionItem>(`/api/pets/${petId}/documents/extraction-items/${itemId}`, { modifiedData }, token),
};

// Audit API
export const auditApi = {
  // Get audit log for a pet
  getAuditLog: (petId: number, token: string, options?: { limit?: number; offset?: number; entityType?: string; action?: string }) => {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    if (options?.entityType) params.append('entityType', options.entityType);
    if (options?.action) params.append('action', options.action);
    const queryString = params.toString();
    return api.get<AuditLogResponse>(`/api/pets/${petId}/audit${queryString ? `?${queryString}` : ''}`, token);
  },

  // Get audit log for a specific record
  getRecordAudit: (petId: number, recordType: string, recordId: number, token: string) =>
    api.get<AuditLogEntry[]>(`/api/pets/${petId}/audit/${recordType}/${recordId}`, token),

  // Get audit entries from a PDF upload
  getPdfUploadAudit: (petId: number, uploadId: number, token: string) =>
    api.get<AuditLogEntry[]>(`/api/pets/${petId}/audit/pdf-upload/${uploadId}`, token),
};
