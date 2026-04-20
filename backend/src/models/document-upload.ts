import { prisma } from '../db/prisma.js';
import { stripUndefined, toNullableDate } from './prisma-helpers.js';

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

function mapDocumentUpload(upload: Record<string, any>): DocumentUpload {
  return {
    id: upload.id,
    pet_id: upload.pet_id,
    uploaded_by: upload.uploaded_by,
    filename: upload.filename,
    original_filename: upload.original_filename,
    file_path: upload.file_path,
    file_size: upload.file_size,
    mime_type: upload.mime_type,
    media_type: upload.media_type as MediaType,
    status: upload.status as DocumentUploadStatus,
    detected_type: upload.detected_type,
    classification_confidence: upload.classification_confidence,
    classification_explanation: upload.classification_explanation,
    processing_started_at: upload.processing_started_at,
    processing_completed_at: upload.processing_completed_at,
    error_message: upload.error_message,
    user_tag: upload.user_tag,
    user_description: upload.user_description,
    date_taken: upload.date_taken,
    body_area: upload.body_area,
    document_group_id: upload.document_group_id,
    page_number: upload.page_number ?? 1,
    group_name: upload.group_name,
    created_at: upload.created_at,
  };
}

export async function createDocumentUpload(data: CreateDocumentUploadInput): Promise<DocumentUpload> {
  const upload = await prisma.document_uploads.create({
    data: {
      pet_id: data.petId,
      uploaded_by: data.uploadedBy,
      filename: data.filename,
      original_filename: data.originalFilename,
      file_path: data.filePath,
      file_size: data.fileSize,
      mime_type: data.mimeType,
      media_type: data.mediaType,
      status: 'uploaded',
      document_group_id: data.documentGroupId ?? null,
      page_number: data.pageNumber ?? 1,
      group_name: data.groupName ?? null,
    },
  });

  return mapDocumentUpload(upload);
}

export async function getDocumentUploadById(id: number): Promise<DocumentUpload | null> {
  const upload = await prisma.document_uploads.findFirst({
    where: {
      id,
      deleted_at: null,
    },
  });

  return upload ? mapDocumentUpload(upload) : null;
}

export async function getDocumentUploadsByPetId(petId: number, mediaType?: MediaType): Promise<DocumentUpload[]> {
  const uploads = await prisma.document_uploads.findMany({
    where: {
      pet_id: petId,
      deleted_at: null,
      media_type: mediaType,
    },
    orderBy: {
      created_at: 'desc',
    },
  });

  return uploads.map(mapDocumentUpload);
}

export async function updateDocumentUploadStatus(
  id: number,
  status: DocumentUploadStatus,
  errorMessage?: string
): Promise<DocumentUpload | null> {
  const data = stripUndefined({
    status,
    processing_started_at: status === 'processing' ? new Date() : undefined,
    processing_completed_at: status === 'completed' || status === 'failed' ? new Date() : undefined,
    error_message: status === 'failed' ? errorMessage || null : undefined,
  });

  const uploads = await prisma.document_uploads.updateManyAndReturn({
    where: {
      id,
      deleted_at: null,
    },
    data,
  });

  return uploads[0] ? mapDocumentUpload(uploads[0]) : null;
}

export async function deleteDocumentUpload(id: number, petId: number): Promise<boolean> {
  const result = await prisma.document_uploads.updateMany({
    where: {
      id,
      pet_id: petId,
      deleted_at: null,
    },
    data: {
      deleted_at: new Date(),
    },
  });

  return result.count > 0;
}

export async function softDeleteDocumentWithCascade(
  uploadId: number,
  petId: number,
  cascade: boolean
): Promise<boolean> {
  const deleted = await deleteDocumentUpload(uploadId, petId);
  if (!deleted) {
    return false;
  }

  if (cascade) {
    await prisma.document_extraction_items.updateMany({
      where: {
        deleted_at: null,
        document_extractions: {
          is: {
            document_upload_id: uploadId,
          },
        },
      },
      data: {
        deleted_at: new Date(),
      },
    });
  }

  await prisma.document_extraction_items.updateMany({
    where: {
      deleted_at: null,
      created_record_id: {
        not: null,
      },
      document_extractions: {
        is: {
          document_upload_id: uploadId,
        },
      },
    },
    data: {
      created_record_id: null,
      created_record_type: null,
    },
  });

  return true;
}

export async function updateDocumentUploadFilename(
  id: number,
  petId: number,
  newFilename: string
): Promise<DocumentUpload | null> {
  const uploads = await prisma.document_uploads.updateManyAndReturn({
    where: {
      id,
      pet_id: petId,
      deleted_at: null,
    },
    data: {
      original_filename: newFilename,
    },
  });

  return uploads[0] ? mapDocumentUpload(uploads[0]) : null;
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
  const uploads = await prisma.document_uploads.updateManyAndReturn({
    where: {
      id,
      deleted_at: null,
    },
    data: stripUndefined({
      user_tag: data.userTag,
      user_description: data.userDescription,
      date_taken: toNullableDate(data.dateTaken),
      body_area: data.bodyArea,
    }),
  });

  return uploads[0] ? mapDocumentUpload(uploads[0]) : null;
}

export async function getDocumentGroup(groupId: string): Promise<DocumentUpload[]> {
  const uploads = await prisma.document_uploads.findMany({
    where: {
      document_group_id: groupId,
      deleted_at: null,
    },
    orderBy: {
      page_number: 'asc',
    },
  });

  return uploads.map(mapDocumentUpload);
}

export async function reorderDocumentGroup(groupId: string, uploadIdsInOrder: number[]): Promise<void> {
  await prisma.$transaction(
    uploadIdsInOrder.map((uploadId, index) =>
      prisma.document_uploads.updateMany({
        where: {
          id: uploadId,
          document_group_id: groupId,
          deleted_at: null,
        },
        data: {
          page_number: index + 1,
        },
      })
    )
  );
}

export async function updateDocumentGroupStatus(
  groupId: string,
  status: DocumentUploadStatus,
  errorMessage?: string
): Promise<void> {
  await prisma.document_uploads.updateMany({
    where: {
      document_group_id: groupId,
      deleted_at: null,
    },
    data: stripUndefined({
      status,
      processing_started_at: status === 'processing' ? new Date() : undefined,
      processing_completed_at: status === 'completed' || status === 'failed' ? new Date() : undefined,
      error_message: status === 'failed' ? errorMessage || null : undefined,
    }),
  });
}

export function getMediaTypeFromMime(mimeType: string): MediaType {
  if (mimeType === 'application/pdf') {
    return 'pdf';
  }

  return 'image';
}
