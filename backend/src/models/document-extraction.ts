import { query, queryOne, transaction } from '../db/pool.js';

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

export async function createDocumentExtraction(data: CreateDocumentExtractionInput): Promise<DocumentExtraction> {
  const result = await query<DocumentExtraction>(
    `INSERT INTO document_extractions (
      document_upload_id, raw_extraction, mapped_data, extraction_model, tokens_used
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING *`,
    [
      data.documentUploadId,
      JSON.stringify(data.rawExtraction),
      JSON.stringify(data.mappedData),
      data.extractionModel,
      data.tokensUsed,
    ]
  );
  return result[0];
}

export async function createDocumentExtractionItem(data: CreateDocumentExtractionItemInput): Promise<DocumentExtractionItem> {
  const result = await query<DocumentExtractionItem>(
    `INSERT INTO document_extraction_items (
      extraction_id, record_type, extracted_data, confidence_score
    ) VALUES ($1, $2, $3, $4)
    RETURNING *`,
    [
      data.extractionId,
      data.recordType,
      JSON.stringify(data.extractedData),
      data.confidenceScore || null,
    ]
  );
  return result[0];
}

export async function createDocumentExtractionWithItems(
  extractionData: CreateDocumentExtractionInput,
  items: Omit<CreateDocumentExtractionItemInput, 'extractionId'>[]
): Promise<{ extraction: DocumentExtraction; items: DocumentExtractionItem[] }> {
  return transaction(async (client) => {
    // Create extraction
    const extractionResult = await client.query(
      `INSERT INTO document_extractions (
        document_upload_id, raw_extraction, mapped_data, extraction_model, tokens_used
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        extractionData.documentUploadId,
        JSON.stringify(extractionData.rawExtraction),
        JSON.stringify(extractionData.mappedData),
        extractionData.extractionModel,
        extractionData.tokensUsed,
      ]
    );
    const extraction = extractionResult.rows[0] as DocumentExtraction;

    // Create items
    const createdItems: DocumentExtractionItem[] = [];
    for (const item of items) {
      const itemResult = await client.query(
        `INSERT INTO document_extraction_items (
          extraction_id, record_type, extracted_data, confidence_score
        ) VALUES ($1, $2, $3, $4)
        RETURNING *`,
        [
          extraction.id,
          item.recordType,
          JSON.stringify(item.extractedData),
          item.confidenceScore || null,
        ]
      );
      createdItems.push(itemResult.rows[0] as DocumentExtractionItem);
    }

    return { extraction, items: createdItems };
  });
}

export async function getDocumentExtractionByUploadId(documentUploadId: number): Promise<DocumentExtraction | null> {
  return queryOne<DocumentExtraction>(
    'SELECT * FROM document_extractions WHERE document_upload_id = $1',
    [documentUploadId]
  );
}

export async function getDocumentExtractionById(id: number): Promise<DocumentExtraction | null> {
  return queryOne<DocumentExtraction>(
    'SELECT * FROM document_extractions WHERE id = $1',
    [id]
  );
}

export async function getDocumentExtractionItems(extractionId: number): Promise<DocumentExtractionItem[]> {
  return query<DocumentExtractionItem>(
    'SELECT * FROM document_extraction_items WHERE extraction_id = $1 ORDER BY id',
    [extractionId]
  );
}

export async function getDocumentExtractionWithItems(documentUploadId: number): Promise<{
  extraction: DocumentExtraction;
  items: DocumentExtractionItem[];
} | null> {
  const extraction = await getDocumentExtractionByUploadId(documentUploadId);
  if (!extraction) return null;

  const items = await getDocumentExtractionItems(extraction.id);
  return { extraction, items };
}

export async function updateDocumentExtractionItemData(
  itemId: number,
  modifiedData: Record<string, any>
): Promise<DocumentExtractionItem | null> {
  return queryOne<DocumentExtractionItem>(
    `UPDATE document_extraction_items SET
      user_modified_data = $2,
      status = 'modified',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 RETURNING *`,
    [itemId, JSON.stringify(modifiedData)]
  );
}

export async function updateDocumentExtractionItemStatus(
  itemId: number,
  status: ExtractionItemStatus,
  createdRecordId?: number,
  createdRecordType?: string
): Promise<DocumentExtractionItem | null> {
  if (status === 'approved' && createdRecordId && createdRecordType) {
    return queryOne<DocumentExtractionItem>(
      `UPDATE document_extraction_items SET
        status = $2,
        created_record_id = $3,
        created_record_type = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 RETURNING *`,
      [itemId, status, createdRecordId, createdRecordType]
    );
  }

  return queryOne<DocumentExtractionItem>(
    `UPDATE document_extraction_items SET
      status = $2,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 RETURNING *`,
    [itemId, status]
  );
}

export async function updateDocumentExtractionStatus(
  extractionId: number,
  status: ExtractionStatus,
  reviewedBy: number
): Promise<DocumentExtraction | null> {
  return queryOne<DocumentExtraction>(
    `UPDATE document_extractions SET
      status = $2,
      reviewed_by = $3,
      reviewed_at = CURRENT_TIMESTAMP
    WHERE id = $1 RETURNING *`,
    [extractionId, status, reviewedBy]
  );
}

export async function getDocumentExtractionItemById(itemId: number): Promise<DocumentExtractionItem | null> {
  return queryOne<DocumentExtractionItem>(
    'SELECT * FROM document_extraction_items WHERE id = $1',
    [itemId]
  );
}

export async function bulkUpdateDocumentExtractionItemsStatus(
  itemIds: number[],
  status: ExtractionItemStatus
): Promise<DocumentExtractionItem[]> {
  if (itemIds.length === 0) return [];

  return query<DocumentExtractionItem>(
    `UPDATE document_extraction_items SET
      status = $2,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ANY($1) RETURNING *`,
    [itemIds, status]
  );
}
