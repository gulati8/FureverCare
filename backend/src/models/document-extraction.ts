import { prisma } from '../db/prisma.js';
import { decimalToNumber, stripUndefined } from './prisma-helpers.js';

export type ExtractionStatus = 'pending_review' | 'approved' | 'rejected' | 'partially_approved';
export type ExtractionItemStatus = 'pending' | 'approved' | 'rejected' | 'modified';
export type RecordType = 'vaccination' | 'medication' | 'condition' | 'allergy' | 'vet' | 'emergency_contact';

export interface DocumentExtraction {
  id: number;
  document_upload_id: number;
  raw_extraction: Record<string, any> | null;
  mapped_data: Record<string, any> | null;
  extraction_model: string | null;
  tokens_used: number | null;
  status: ExtractionStatus;
  reviewed_by: number | null;
  reviewed_at: Date | null;
  created_at: Date;
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
  created_at: Date;
  updated_at: Date;
}

export interface CreateDocumentExtractionInput {
  documentUploadId: number;
  rawExtraction: Record<string, any>;
  mappedData: Record<string, any>;
  extractionModel: string;
  tokensUsed: number;
}

export interface CreateDocumentExtractionItemInput {
  extractionId: number;
  recordType: RecordType;
  extractedData: Record<string, any>;
  confidenceScore?: number;
}

function mapExtraction(extraction: Record<string, any>): DocumentExtraction {
  return {
    id: extraction.id,
    document_upload_id: extraction.document_upload_id,
    raw_extraction: (extraction.raw_extraction ?? null) as Record<string, any> | null,
    mapped_data: (extraction.mapped_data ?? null) as Record<string, any> | null,
    extraction_model: extraction.extraction_model,
    tokens_used: extraction.tokens_used,
    status: extraction.status as ExtractionStatus,
    reviewed_by: extraction.reviewed_by,
    reviewed_at: extraction.reviewed_at,
    created_at: extraction.created_at,
  };
}

function mapExtractionItem(item: Record<string, any>): DocumentExtractionItem {
  return {
    id: item.id,
    extraction_id: item.extraction_id,
    record_type: item.record_type as RecordType,
    extracted_data: item.extracted_data as Record<string, any>,
    confidence_score: decimalToNumber(item.confidence_score),
    user_modified_data: (item.user_modified_data ?? null) as Record<string, any> | null,
    status: item.status as ExtractionItemStatus,
    created_record_id: item.created_record_id,
    created_record_type: item.created_record_type,
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
}

export async function createDocumentExtraction(data: CreateDocumentExtractionInput): Promise<DocumentExtraction> {
  const extraction = await prisma.document_extractions.create({
    data: {
      document_upload_id: data.documentUploadId,
      raw_extraction: data.rawExtraction,
      mapped_data: data.mappedData,
      extraction_model: data.extractionModel,
      tokens_used: data.tokensUsed,
    },
  });

  return mapExtraction(extraction);
}

export async function createDocumentExtractionItem(data: CreateDocumentExtractionItemInput): Promise<DocumentExtractionItem> {
  const item = await prisma.document_extraction_items.create({
    data: {
      extraction_id: data.extractionId,
      record_type: data.recordType,
      extracted_data: data.extractedData,
      confidence_score: data.confidenceScore ?? null,
    },
  });

  return mapExtractionItem(item);
}

export async function createDocumentExtractionWithItems(
  extractionData: CreateDocumentExtractionInput,
  items: Omit<CreateDocumentExtractionItemInput, 'extractionId'>[]
): Promise<{ extraction: DocumentExtraction; items: DocumentExtractionItem[] }> {
  return prisma.$transaction(async (tx) => {
    const extraction = await tx.document_extractions.create({
      data: {
        document_upload_id: extractionData.documentUploadId,
        raw_extraction: extractionData.rawExtraction,
        mapped_data: extractionData.mappedData,
        extraction_model: extractionData.extractionModel,
        tokens_used: extractionData.tokensUsed,
      },
    });

    const createdItems: DocumentExtractionItem[] = [];

    for (const item of items) {
      const created = await tx.document_extraction_items.create({
        data: {
          extraction_id: extraction.id,
          record_type: item.recordType,
          extracted_data: item.extractedData,
          confidence_score: item.confidenceScore ?? null,
        },
      });
      createdItems.push(mapExtractionItem(created));
    }

    return {
      extraction: mapExtraction(extraction),
      items: createdItems,
    };
  });
}

export async function getDocumentExtractionByUploadId(documentUploadId: number): Promise<DocumentExtraction | null> {
  const extraction = await prisma.document_extractions.findFirst({
    where: {
      document_upload_id: documentUploadId,
      deleted_at: null,
    },
  });

  return extraction ? mapExtraction(extraction) : null;
}

export async function getDocumentExtractionById(id: number): Promise<DocumentExtraction | null> {
  const extraction = await prisma.document_extractions.findFirst({
    where: {
      id,
      deleted_at: null,
    },
  });

  return extraction ? mapExtraction(extraction) : null;
}

export async function getDocumentExtractionItems(extractionId: number): Promise<DocumentExtractionItem[]> {
  const items = await prisma.document_extraction_items.findMany({
    where: {
      extraction_id: extractionId,
      deleted_at: null,
    },
    orderBy: {
      id: 'asc',
    },
  });

  return items.map(mapExtractionItem);
}

export async function getDocumentExtractionWithItems(documentUploadId: number): Promise<{
  extraction: DocumentExtraction;
  items: DocumentExtractionItem[];
} | null> {
  const extraction = await prisma.document_extractions.findFirst({
    where: {
      document_upload_id: documentUploadId,
      deleted_at: null,
    },
    include: {
      document_extraction_items: {
        where: {
          deleted_at: null,
        },
        orderBy: {
          id: 'asc',
        },
      },
    },
  });

  if (!extraction) {
    return null;
  }

  return {
    extraction: mapExtraction(extraction),
    items: extraction.document_extraction_items.map(mapExtractionItem),
  };
}

export async function updateDocumentExtractionItemData(
  itemId: number,
  modifiedData: Record<string, any>
): Promise<DocumentExtractionItem | null> {
  const items = await prisma.document_extraction_items.updateManyAndReturn({
    where: {
      id: itemId,
    },
    data: {
      user_modified_data: modifiedData,
      status: 'modified',
      updated_at: new Date(),
    },
  });

  return items[0] ? mapExtractionItem(items[0]) : null;
}

export async function updateDocumentExtractionItemStatus(
  itemId: number,
  status: ExtractionItemStatus,
  createdRecordId?: number,
  createdRecordType?: string
): Promise<DocumentExtractionItem | null> {
  const items = await prisma.document_extraction_items.updateManyAndReturn({
    where: {
      id: itemId,
    },
    data: stripUndefined({
      status,
      created_record_id: status === 'approved' ? createdRecordId : undefined,
      created_record_type: status === 'approved' ? createdRecordType : undefined,
      updated_at: new Date(),
    }),
  });

  return items[0] ? mapExtractionItem(items[0]) : null;
}

export async function updateDocumentExtractionStatus(
  extractionId: number,
  status: ExtractionStatus,
  reviewedBy: number
): Promise<DocumentExtraction | null> {
  const extractions = await prisma.document_extractions.updateManyAndReturn({
    where: {
      id: extractionId,
    },
    data: {
      status,
      reviewed_by: reviewedBy,
      reviewed_at: new Date(),
    },
  });

  return extractions[0] ? mapExtraction(extractions[0]) : null;
}

export async function getDocumentExtractionItemById(itemId: number): Promise<DocumentExtractionItem | null> {
  const item = await prisma.document_extraction_items.findFirst({
    where: {
      id: itemId,
      deleted_at: null,
    },
  });

  return item ? mapExtractionItem(item) : null;
}

export async function bulkUpdateDocumentExtractionItemsStatus(
  itemIds: number[],
  status: ExtractionItemStatus
): Promise<DocumentExtractionItem[]> {
  if (itemIds.length === 0) {
    return [];
  }

  const items = await prisma.document_extraction_items.updateManyAndReturn({
    where: {
      id: {
        in: itemIds,
      },
    },
    data: {
      status,
      updated_at: new Date(),
    },
  });

  return items.map(mapExtractionItem);
}
