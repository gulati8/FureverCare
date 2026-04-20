import { prisma } from '../db/prisma.js';
import { stripUndefined } from './prisma-helpers.js';

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

function mapImageUpload(upload: Record<string, any>): ImageUpload {
  return {
    id: upload.id,
    pet_id: upload.pet_id,
    uploaded_by: upload.uploaded_by,
    filename: upload.filename,
    original_filename: upload.original_filename,
    file_path: upload.file_path,
    file_size: upload.file_size,
    mime_type: upload.mime_type,
    status: upload.status as ImageUploadStatus,
    document_type: upload.document_type as ImageDocumentType | null,
    processing_started_at: upload.processing_started_at,
    processing_completed_at: upload.processing_completed_at,
    error_message: upload.error_message,
    created_at: upload.created_at,
  };
}

export async function createImageUpload(data: CreateImageUploadInput): Promise<ImageUpload> {
  const upload = await prisma.image_uploads.create({
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

  return mapImageUpload(upload);
}

export async function getImageUploadById(id: number): Promise<ImageUpload | null> {
  const upload = await prisma.image_uploads.findUnique({
    where: {
      id,
    },
  });

  return upload ? mapImageUpload(upload) : null;
}

export async function getImageUploadsByPetId(petId: number): Promise<ImageUpload[]> {
  const uploads = await prisma.image_uploads.findMany({
    where: {
      pet_id: petId,
    },
    orderBy: {
      created_at: 'desc',
    },
  });

  return uploads.map(mapImageUpload);
}

export async function updateImageUploadStatus(
  id: number,
  status: ImageUploadStatus,
  errorMessage?: string
): Promise<ImageUpload | null> {
  const uploads = await prisma.image_uploads.updateManyAndReturn({
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

  return uploads[0] ? mapImageUpload(uploads[0]) : null;
}

export async function updateImageUploadDocumentType(
  id: number,
  documentType: ImageDocumentType
): Promise<ImageUpload | null> {
  const uploads = await prisma.image_uploads.updateManyAndReturn({
    where: {
      id,
    },
    data: {
      document_type: documentType,
    },
  });

  return uploads[0] ? mapImageUpload(uploads[0]) : null;
}

export async function deleteImageUpload(id: number, petId: number): Promise<boolean> {
  const result = await prisma.image_uploads.deleteMany({
    where: {
      id,
      pet_id: petId,
    },
  });

  return result.count > 0;
}

export async function getImageUploadWithExtraction(id: number): Promise<(ImageUpload & {
  extraction?: any;
}) | null> {
  const upload = await prisma.image_uploads.findUnique({
    where: {
      id,
    },
    include: {
      image_extractions: true,
    },
  });

  if (!upload) {
    return null;
  }

  return {
    ...mapImageUpload(upload),
    extraction: upload.image_extractions[0] || undefined,
  };
}
