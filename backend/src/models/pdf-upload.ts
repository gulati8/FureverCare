import { query, queryOne } from '../db/pool.js';

export type PdfUploadStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type DocumentType = 'vaccination_record' | 'visit_summary' | 'lab_results' | 'prescription' | 'other';

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
  processing_started_at: Date | null;
  processing_completed_at: Date | null;
  error_message: string | null;
  created_at: Date;
}

export interface CreatePdfUploadInput {
  petId: number;
  uploadedBy: number;
  filename: string;
  originalFilename: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  documentType?: DocumentType;
}

export async function createPdfUpload(data: CreatePdfUploadInput): Promise<PdfUpload> {
  const result = await query<PdfUpload>(
    `INSERT INTO pdf_uploads (
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

export async function getPdfUploadById(id: number): Promise<PdfUpload | null> {
  return queryOne<PdfUpload>(
    'SELECT * FROM pdf_uploads WHERE id = $1',
    [id]
  );
}

export async function getPdfUploadsByPetId(petId: number): Promise<PdfUpload[]> {
  return query<PdfUpload>(
    'SELECT * FROM pdf_uploads WHERE pet_id = $1 ORDER BY created_at DESC',
    [petId]
  );
}

export async function updatePdfUploadStatus(
  id: number,
  status: PdfUploadStatus,
  errorMessage?: string
): Promise<PdfUpload | null> {
  let sql: string;
  let params: any[];

  if (status === 'processing') {
    sql = `UPDATE pdf_uploads SET
      status = $2,
      processing_started_at = CURRENT_TIMESTAMP
    WHERE id = $1 RETURNING *`;
    params = [id, status];
  } else if (status === 'completed') {
    sql = `UPDATE pdf_uploads SET
      status = $2,
      processing_completed_at = CURRENT_TIMESTAMP
    WHERE id = $1 RETURNING *`;
    params = [id, status];
  } else if (status === 'failed') {
    sql = `UPDATE pdf_uploads SET
      status = $2,
      processing_completed_at = CURRENT_TIMESTAMP,
      error_message = $3
    WHERE id = $1 RETURNING *`;
    params = [id, status, errorMessage || null];
  } else {
    sql = `UPDATE pdf_uploads SET status = $2 WHERE id = $1 RETURNING *`;
    params = [id, status];
  }

  return queryOne<PdfUpload>(sql, params);
}

export async function updatePdfUploadDocumentType(
  id: number,
  documentType: DocumentType
): Promise<PdfUpload | null> {
  return queryOne<PdfUpload>(
    'UPDATE pdf_uploads SET document_type = $2 WHERE id = $1 RETURNING *',
    [id, documentType]
  );
}

export async function deletePdfUpload(id: number, petId: number): Promise<boolean> {
  const result = await query(
    'DELETE FROM pdf_uploads WHERE id = $1 AND pet_id = $2 RETURNING id',
    [id, petId]
  );
  return result.length > 0;
}

export async function getPdfUploadWithExtraction(id: number): Promise<(PdfUpload & {
  extraction?: any;
}) | null> {
  const upload = await getPdfUploadById(id);
  if (!upload) return null;

  const extraction = await queryOne(
    'SELECT * FROM pdf_extractions WHERE pdf_upload_id = $1',
    [id]
  );

  return {
    ...upload,
    extraction: extraction || undefined,
  };
}
