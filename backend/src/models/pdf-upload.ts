import { prisma } from '../db/prisma.js';
import { stripUndefined } from './prisma-helpers.js';

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

function mapPdfUpload(upload: Record<string, any>): PdfUpload {
  return {
    id: upload.id,
    pet_id: upload.pet_id,
    uploaded_by: upload.uploaded_by,
    filename: upload.filename,
    original_filename: upload.original_filename,
    file_path: upload.file_path,
    file_size: upload.file_size,
    mime_type: upload.mime_type,
    status: upload.status as PdfUploadStatus,
    document_type: upload.document_type as DocumentType | null,
    processing_started_at: upload.processing_started_at,
    processing_completed_at: upload.processing_completed_at,
    error_message: upload.error_message,
    created_at: upload.created_at,
  };
}

export async function createPdfUpload(data: CreatePdfUploadInput): Promise<PdfUpload> {
  const upload = await prisma.pdf_uploads.create({
    data: {
      pet_id: data.petId,
      uploaded_by: data.uploadedBy,
      filename: data.filename,
      original_filename: data.originalFilename,
      file_path: data.filePath,
      file_size: data.fileSize,
      mime_type: data.mimeType,
      status: 'pending',
      document_type: data.documentType ?? null,
    },
  });

  return mapPdfUpload(upload);
}

export async function getPdfUploadById(id: number): Promise<PdfUpload | null> {
  const upload = await prisma.pdf_uploads.findUnique({
    where: {
      id,
    },
  });

  return upload ? mapPdfUpload(upload) : null;
}

export async function getPdfUploadsByPetId(petId: number): Promise<PdfUpload[]> {
  const uploads = await prisma.pdf_uploads.findMany({
    where: {
      pet_id: petId,
    },
    orderBy: {
      created_at: 'desc',
    },
  });

  return uploads.map(mapPdfUpload);
}

export async function updatePdfUploadStatus(
  id: number,
  status: PdfUploadStatus,
  errorMessage?: string
): Promise<PdfUpload | null> {
  const uploads = await prisma.pdf_uploads.updateManyAndReturn({
    where: {
      id,
    },
    data: stripUndefined({
      status,
      processing_started_at: status === 'processing' ? new Date() : undefined,
      processing_completed_at: status === 'completed' || status === 'failed' ? new Date() : undefined,
      error_message: status === 'failed' ? errorMessage || null : undefined,
    }),
  });

  return uploads[0] ? mapPdfUpload(uploads[0]) : null;
}

export async function updatePdfUploadDocumentType(
  id: number,
  documentType: DocumentType
): Promise<PdfUpload | null> {
  const uploads = await prisma.pdf_uploads.updateManyAndReturn({
    where: {
      id,
    },
    data: {
      document_type: documentType,
    },
  });

  return uploads[0] ? mapPdfUpload(uploads[0]) : null;
}

export async function deletePdfUpload(id: number, petId: number): Promise<boolean> {
  const result = await prisma.pdf_uploads.deleteMany({
    where: {
      id,
      pet_id: petId,
    },
  });

  return result.count > 0;
}

export async function getPdfUploadWithExtraction(id: number): Promise<(PdfUpload & {
  extraction?: any;
}) | null> {
  const upload = await prisma.pdf_uploads.findUnique({
    where: {
      id,
    },
    include: {
      pdf_extractions: true,
    },
  });

  if (!upload) {
    return null;
  }

  return {
    ...mapPdfUpload(upload),
    extraction: upload.pdf_extractions[0] || undefined,
  };
}
