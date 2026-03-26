import { query, queryOne } from '../db/pool.js';

export type DocumentUploadStatus = 'uploaded' | 'pending' | 'processing' | 'pending_review' | 'completed' | 'failed';

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
  detected_type: string | null;
  classification_confidence: number | null;
  classification_explanation: string | null;
  processing_started_at: Date | null;
  processing_completed_at: Date | null;
  error_message: string | null;
  user_tag: string | null;
  user_description: string | null;
  date_taken: Date | null;
  body_area: string | null;
  document_group_id: string | null;
  page_number: number;
  group_name: string | null;
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
  documentGroupId?: string | null;
  pageNumber?: number;
  groupName?: string | null;
}

export async function createDocumentUpload(data: CreateDocumentUploadInput): Promise<DocumentUpload> {
  const result = await query<DocumentUpload>(
    `INSERT INTO document_uploads (
      pet_id, uploaded_by, filename, original_filename, file_path,
      file_size, mime_type, media_type, status, document_group_id, page_number, group_name
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'uploaded', $9, $10, $11)
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
      data.documentGroupId || null,
      data.pageNumber || 1,
      data.groupName || null,
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

export async function getDocumentUploadsByPetId(petId: number, mediaType?: MediaType): Promise<DocumentUpload[]> {
  if (mediaType) {
    return query<DocumentUpload>(
      'SELECT * FROM document_uploads WHERE pet_id = $1 AND media_type = $2 ORDER BY created_at DESC',
      [petId, mediaType]
    );
  }
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

  if (status === 'processing') {
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

export async function deleteDocumentUpload(id: number, petId: number): Promise<boolean> {
  const result = await query(
    'DELETE FROM document_uploads WHERE id = $1 AND pet_id = $2 RETURNING id',
    [id, petId]
  );
  return result.length > 0;
}

export async function updateDocumentUploadFilename(
  id: number,
  petId: number,
  newFilename: string
): Promise<DocumentUpload | null> {
  return queryOne<DocumentUpload>(
    'UPDATE document_uploads SET original_filename = $1 WHERE id = $2 AND pet_id = $3 RETURNING *',
    [newFilename, id, petId]
  );
}

export async function updateDocumentImageMetadata(
  id: number,
  data: {
    userTag?: string | null;
    userDescription?: string | null;
    dateTaken?: string | null;
    bodyArea?: string | null;
  }
): Promise<DocumentUpload | null> {
  return queryOne<DocumentUpload>(
    `UPDATE document_uploads SET
      user_tag = COALESCE($2, user_tag),
      user_description = COALESCE($3, user_description),
      date_taken = COALESCE($4, date_taken),
      body_area = COALESCE($5, body_area)
    WHERE id = $1 RETURNING *`,
    [id, data.userTag || null, data.userDescription || null, data.dateTaken || null, data.bodyArea || null]
  );
}

export async function getDocumentGroup(groupId: string): Promise<DocumentUpload[]> {
  return query<DocumentUpload>(
    'SELECT * FROM document_uploads WHERE document_group_id = $1 ORDER BY page_number ASC',
    [groupId]
  );
}

export async function reorderDocumentGroup(groupId: string, uploadIdsInOrder: number[]): Promise<void> {
  for (let i = 0; i < uploadIdsInOrder.length; i++) {
    await query(
      'UPDATE document_uploads SET page_number = $1 WHERE id = $2 AND document_group_id = $3',
      [i + 1, uploadIdsInOrder[i], groupId]
    );
  }
}

export async function updateDocumentGroupStatus(
  groupId: string,
  status: DocumentUploadStatus,
  errorMessage?: string
): Promise<void> {
  if (status === 'failed') {
    await query(
      `UPDATE document_uploads SET status = $2, processing_completed_at = CURRENT_TIMESTAMP, error_message = $3
       WHERE document_group_id = $1`,
      [groupId, status, errorMessage || null]
    );
  } else if (status === 'completed') {
    await query(
      `UPDATE document_uploads SET status = $2, processing_completed_at = CURRENT_TIMESTAMP
       WHERE document_group_id = $1`,
      [groupId, status]
    );
  } else if (status === 'processing') {
    await query(
      `UPDATE document_uploads SET status = $2, processing_started_at = COALESCE(processing_started_at, CURRENT_TIMESTAMP)
       WHERE document_group_id = $1`,
      [groupId, status]
    );
  } else {
    await query(
      'UPDATE document_uploads SET status = $2 WHERE document_group_id = $1',
      [groupId, status]
    );
  }
}

export function getMediaTypeFromMime(mimeType: string): MediaType {
  if (mimeType === 'application/pdf') {
    return 'pdf';
  }
  return 'image';
}
