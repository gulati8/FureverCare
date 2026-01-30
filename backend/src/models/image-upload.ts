import { query, queryOne } from '../db/pool.js';

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
  processing_started_at: Date | null;
  processing_completed_at: Date | null;
  error_message: string | null;
  created_at: Date;
}

export interface CreateImageUploadInput {
  petId: number;
  uploadedBy: number;
  filename: string;
  originalFilename: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  documentType?: ImageDocumentType;
}

export async function createImageUpload(data: CreateImageUploadInput): Promise<ImageUpload> {
  const result = await query<ImageUpload>(
    `INSERT INTO image_uploads (
      pet_id, uploaded_by, filename, original_filename, file_path,
      file_size, mime_type, status, document_type
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8)
    RETURNING *`,
    [
      data.petId,
      data.uploadedBy,
      data.filename,
      data.originalFilename,
      data.filePath,
      data.fileSize,
      data.mimeType,
      data.documentType || null,
    ]
  );
  return result[0];
}

export async function getImageUploadById(id: number): Promise<ImageUpload | null> {
  return queryOne<ImageUpload>(
    'SELECT * FROM image_uploads WHERE id = $1',
    [id]
  );
}

export async function getImageUploadsByPetId(petId: number): Promise<ImageUpload[]> {
  return query<ImageUpload>(
    'SELECT * FROM image_uploads WHERE pet_id = $1 ORDER BY created_at DESC',
    [petId]
  );
}

export async function updateImageUploadStatus(
  id: number,
  status: ImageUploadStatus,
  errorMessage?: string
): Promise<ImageUpload | null> {
  let sql: string;
  let params: any[];

  if (status === 'processing') {
    sql = `UPDATE image_uploads SET
      status = $2,
      processing_started_at = CURRENT_TIMESTAMP
    WHERE id = $1 RETURNING *`;
    params = [id, status];
  } else if (status === 'completed') {
    sql = `UPDATE image_uploads SET
      status = $2,
      processing_completed_at = CURRENT_TIMESTAMP
    WHERE id = $1 RETURNING *`;
    params = [id, status];
  } else if (status === 'failed') {
    sql = `UPDATE image_uploads SET
      status = $2,
      processing_completed_at = CURRENT_TIMESTAMP,
      error_message = $3
    WHERE id = $1 RETURNING *`;
    params = [id, status, errorMessage || null];
  } else {
    sql = `UPDATE image_uploads SET status = $2 WHERE id = $1 RETURNING *`;
    params = [id, status];
  }

  return queryOne<ImageUpload>(sql, params);
}

export async function updateImageUploadDocumentType(
  id: number,
  documentType: ImageDocumentType
): Promise<ImageUpload | null> {
  return queryOne<ImageUpload>(
    'UPDATE image_uploads SET document_type = $2 WHERE id = $1 RETURNING *',
    [id, documentType]
  );
}

export async function deleteImageUpload(id: number, petId: number): Promise<boolean> {
  const result = await query(
    'DELETE FROM image_uploads WHERE id = $1 AND pet_id = $2 RETURNING id',
    [id, petId]
  );
  return result.length > 0;
}

export async function getImageUploadWithExtraction(id: number): Promise<(ImageUpload & {
  extraction?: any;
}) | null> {
  const upload = await getImageUploadById(id);
  if (!upload) return null;

  const extraction = await queryOne(
    'SELECT * FROM image_extractions WHERE image_upload_id = $1',
    [id]
  );

  return {
    ...upload,
    extraction: extraction || undefined,
  };
}
