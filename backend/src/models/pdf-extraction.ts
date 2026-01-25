import { query, queryOne, transaction } from '../db/pool.js';

export type ExtractionStatus = 'pending_review' | 'approved' | 'rejected' | 'partially_approved';
export type ExtractionItemStatus = 'pending' | 'approved' | 'rejected' | 'modified';
export type RecordType = 'vaccination' | 'medication' | 'condition' | 'allergy' | 'vet' | 'emergency_contact';

export interface PdfExtraction {
  id: number;
  pdf_upload_id: number;
  raw_extraction: Record<string, any> | null;
  mapped_data: Record<string, any> | null;
  extraction_model: string | null;
  tokens_used: number | null;
  status: ExtractionStatus;
  reviewed_by: number | null;
  reviewed_at: Date | null;
  created_at: Date;
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
  created_at: Date;
  updated_at: Date;
}

export interface CreateExtractionInput {
  pdfUploadId: number;
  rawExtraction: Record<string, any>;
  mappedData: Record<string, any>;
  extractionModel: string;
  tokensUsed: number;
}

export interface CreateExtractionItemInput {
  extractionId: number;
  recordType: RecordType;
  extractedData: Record<string, any>;
  confidenceScore?: number;
}

export async function createExtraction(data: CreateExtractionInput): Promise<PdfExtraction> {
  const result = await query<PdfExtraction>(
    `INSERT INTO pdf_extractions (
      pdf_upload_id, raw_extraction, mapped_data, extraction_model, tokens_used
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING *`,
    [
      data.pdfUploadId,
      JSON.stringify(data.rawExtraction),
      JSON.stringify(data.mappedData),
      data.extractionModel,
      data.tokensUsed,
    ]
  );
  return result[0];
}

export async function createExtractionItem(data: CreateExtractionItemInput): Promise<PdfExtractionItem> {
  const result = await query<PdfExtractionItem>(
    `INSERT INTO pdf_extraction_items (
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

export async function createExtractionWithItems(
  extractionData: CreateExtractionInput,
  items: Omit<CreateExtractionItemInput, 'extractionId'>[]
): Promise<{ extraction: PdfExtraction; items: PdfExtractionItem[] }> {
  return transaction(async (client) => {
    // Create extraction
    const extractionResult = await client.query(
      `INSERT INTO pdf_extractions (
        pdf_upload_id, raw_extraction, mapped_data, extraction_model, tokens_used
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        extractionData.pdfUploadId,
        JSON.stringify(extractionData.rawExtraction),
        JSON.stringify(extractionData.mappedData),
        extractionData.extractionModel,
        extractionData.tokensUsed,
      ]
    );
    const extraction = extractionResult.rows[0] as PdfExtraction;

    // Create items
    const createdItems: PdfExtractionItem[] = [];
    for (const item of items) {
      const itemResult = await client.query(
        `INSERT INTO pdf_extraction_items (
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
      createdItems.push(itemResult.rows[0] as PdfExtractionItem);
    }

    return { extraction, items: createdItems };
  });
}

export async function getExtractionByPdfUploadId(pdfUploadId: number): Promise<PdfExtraction | null> {
  return queryOne<PdfExtraction>(
    'SELECT * FROM pdf_extractions WHERE pdf_upload_id = $1',
    [pdfUploadId]
  );
}

export async function getExtractionById(id: number): Promise<PdfExtraction | null> {
  return queryOne<PdfExtraction>(
    'SELECT * FROM pdf_extractions WHERE id = $1',
    [id]
  );
}

export async function getExtractionItems(extractionId: number): Promise<PdfExtractionItem[]> {
  return query<PdfExtractionItem>(
    'SELECT * FROM pdf_extraction_items WHERE extraction_id = $1 ORDER BY id',
    [extractionId]
  );
}

export async function getExtractionWithItems(pdfUploadId: number): Promise<{
  extraction: PdfExtraction;
  items: PdfExtractionItem[];
} | null> {
  const extraction = await getExtractionByPdfUploadId(pdfUploadId);
  if (!extraction) return null;

  const items = await getExtractionItems(extraction.id);
  return { extraction, items };
}

export async function updateExtractionItemData(
  itemId: number,
  modifiedData: Record<string, any>
): Promise<PdfExtractionItem | null> {
  return queryOne<PdfExtractionItem>(
    `UPDATE pdf_extraction_items SET
      user_modified_data = $2,
      status = 'modified',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 RETURNING *`,
    [itemId, JSON.stringify(modifiedData)]
  );
}

export async function updateExtractionItemStatus(
  itemId: number,
  status: ExtractionItemStatus,
  createdRecordId?: number,
  createdRecordType?: string
): Promise<PdfExtractionItem | null> {
  if (status === 'approved' && createdRecordId && createdRecordType) {
    return queryOne<PdfExtractionItem>(
      `UPDATE pdf_extraction_items SET
        status = $2,
        created_record_id = $3,
        created_record_type = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 RETURNING *`,
      [itemId, status, createdRecordId, createdRecordType]
    );
  }

  return queryOne<PdfExtractionItem>(
    `UPDATE pdf_extraction_items SET
      status = $2,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 RETURNING *`,
    [itemId, status]
  );
}

export async function updateExtractionStatus(
  extractionId: number,
  status: ExtractionStatus,
  reviewedBy: number
): Promise<PdfExtraction | null> {
  return queryOne<PdfExtraction>(
    `UPDATE pdf_extractions SET
      status = $2,
      reviewed_by = $3,
      reviewed_at = CURRENT_TIMESTAMP
    WHERE id = $1 RETURNING *`,
    [extractionId, status, reviewedBy]
  );
}

export async function getExtractionItemById(itemId: number): Promise<PdfExtractionItem | null> {
  return queryOne<PdfExtractionItem>(
    'SELECT * FROM pdf_extraction_items WHERE id = $1',
    [itemId]
  );
}

export async function bulkUpdateExtractionItemsStatus(
  itemIds: number[],
  status: ExtractionItemStatus
): Promise<PdfExtractionItem[]> {
  if (itemIds.length === 0) return [];

  return query<PdfExtractionItem>(
    `UPDATE pdf_extraction_items SET
      status = $2,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ANY($1) RETURNING *`,
    [itemIds, status]
  );
}
