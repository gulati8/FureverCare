import { query, queryOne } from '../db/pool.js';

export type DocumentUploadStatus = 'pending' | 'classifying' | 'processing' | 'completed' | 'failed';
export type DocumentType =
  | 'medication_label'
  | 'vet_visit_summary'
  | 'lab_results'
  | 'vaccination_record'
  | 'receipt'
  | 'insurance_form'
  | 'pet_id'
  | 'medical_history'
  | 'prescription'
  | 'other';

export type MediaType = 'pdf' | 'image';

export interface DocumentUpload {
  id: number;
  pet_id: number;
  uploaded_by: number;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  media_type: MediaType;
  status: DocumentUploadStatus;
  detected_type: DocumentType | null;
  classification_confidence: number | null;
  classification_explanation: string | null;
  processing_started_at: Date | null;
  processing_completed_at: Date | null;
  error_message: string | null;
  created_at: Date;
}

export interface CreateDocumentUploadInput {
  petId: number;
  uploadedBy: number;
  filename: string;
  originalFilename: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  mediaType: MediaType;
}

export async function createDocumentUpload(data: CreateDocumentUploadInput): Promise<DocumentUpload> {
  const result = await query<DocumentUpload>(
    `INSERT INTO document_uploads (
      pet_id, uploaded_by, filename, original_filename, file_path,
      file_size, mime_type, media_type, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
    RETURNING *`,
    [
      data.petId,
      data.uploadedBy,
      data.filename,
      data.originalFilename,
      data.filePath,
      data.fileSize,
      data.mimeType,
      data.mediaType,
    ]
  );
  return result[0];
}

export async function getDocumentUploadById(id: number): Promise<DocumentUpload | null> {
  return queryOne<DocumentUpload>(
    'SELECT * FROM document_uploads WHERE id = $1',
    [id]
  );
}

export async function getDocumentUploadsByPetId(petId: number): Promise<DocumentUpload[]> {
  return query<DocumentUpload>(
    'SELECT * FROM document_uploads WHERE pet_id = $1 ORDER BY created_at DESC',
    [petId]
  );
}

export async function updateDocumentUploadStatus(
  id: number,
  status: DocumentUploadStatus,
  errorMessage?: string
): Promise<DocumentUpload | null> {
  let sql: string;
  let params: any[];

  if (status === 'classifying' || status === 'processing') {
    sql = `UPDATE document_uploads SET
      status = $2,
      processing_started_at = COALESCE(processing_started_at, CURRENT_TIMESTAMP)
    WHERE id = $1 RETURNING *`;
    params = [id, status];
  } else if (status === 'completed') {
    sql = `UPDATE document_uploads SET
      status = $2,
      processing_completed_at = CURRENT_TIMESTAMP
    WHERE id = $1 RETURNING *`;
    params = [id, status];
  } else if (status === 'failed') {
    sql = `UPDATE document_uploads SET
      status = $2,
      processing_completed_at = CURRENT_TIMESTAMP,
      error_message = $3
    WHERE id = $1 RETURNING *`;
    params = [id, status, errorMessage || null];
  } else {
    sql = `UPDATE document_uploads SET status = $2 WHERE id = $1 RETURNING *`;
    params = [id, status];
  }

  return queryOne<DocumentUpload>(sql, params);
}

export async function updateDocumentClassification(
  id: number,
  detectedType: DocumentType,
  confidence: number,
  explanation: string
): Promise<DocumentUpload | null> {
  return queryOne<DocumentUpload>(
    `UPDATE document_uploads SET
      detected_type = $2,
      classification_confidence = $3,
      classification_explanation = $4
    WHERE id = $1 RETURNING *`,
    [id, detectedType, confidence, explanation]
  );
}

export async function deleteDocumentUpload(id: number, petId: number): Promise<boolean> {
  const result = await query(
    'DELETE FROM document_uploads WHERE id = $1 AND pet_id = $2 RETURNING id',
    [id, petId]
  );
  return result.length > 0;
}

export function getMediaTypeFromMime(mimeType: string): MediaType {
  if (mimeType === 'application/pdf') {
    return 'pdf';
  }
  return 'image';
}
