import { query, queryOne, transaction } from '../db/pool.js';

export type ExtractionStatus = 'pending_review' | 'approved' | 'rejected' | 'partially_approved';
export type ExtractionItemStatus = 'pending' | 'approved' | 'rejected' | 'modified';
export type RecordType = 'vaccination' | 'medication' | 'condition' | 'allergy' | 'vet' | 'emergency_contact';

export interface ImageExtraction {
  id: number;
  image_upload_id: number;
  raw_extraction: Record<string, any> | null;
  mapped_data: Record<string, any> | null;
  extraction_model: string | null;
  tokens_used: number | null;
  status: ExtractionStatus;
  reviewed_by: number | null;
  reviewed_at: Date | null;
  created_at: Date;
}

export interface ImageExtractionItem {
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

export interface CreateImageExtractionInput {
  imageUploadId: number;
  rawExtraction: Record<string, any>;
  mappedData: Record<string, any>;
  extractionModel: string;
  tokensUsed: number;
}

export interface CreateImageExtractionItemInput {
  extractionId: number;
  recordType: RecordType;
  extractedData: Record<string, any>;
  confidenceScore?: number;
}

export async function createImageExtraction(data: CreateImageExtractionInput): Promise<ImageExtraction> {
  const result = await query<ImageExtraction>(
    `INSERT INTO image_extractions (
      image_upload_id, raw_extraction, mapped_data, extraction_model, tokens_used
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING *`,
    [
      data.imageUploadId,
      JSON.stringify(data.rawExtraction),
      JSON.stringify(data.mappedData),
      data.extractionModel,
      data.tokensUsed,
    ]
  );
  return result[0];
}

export async function createImageExtractionItem(data: CreateImageExtractionItemInput): Promise<ImageExtractionItem> {
  const result = await query<ImageExtractionItem>(
    `INSERT INTO image_extraction_items (
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

export async function createImageExtractionWithItems(
  extractionData: CreateImageExtractionInput,
  items: Omit<CreateImageExtractionItemInput, 'extractionId'>[]
): Promise<{ extraction: ImageExtraction; items: ImageExtractionItem[] }> {
  return transaction(async (client) => {
    // Create extraction
    const extractionResult = await client.query(
      `INSERT INTO image_extractions (
        image_upload_id, raw_extraction, mapped_data, extraction_model, tokens_used
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        extractionData.imageUploadId,
        JSON.stringify(extractionData.rawExtraction),
        JSON.stringify(extractionData.mappedData),
        extractionData.extractionModel,
        extractionData.tokensUsed,
      ]
    );
    const extraction = extractionResult.rows[0] as ImageExtraction;

    // Create items
    const createdItems: ImageExtractionItem[] = [];
    for (const item of items) {
      const itemResult = await client.query(
        `INSERT INTO image_extraction_items (
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
      createdItems.push(itemResult.rows[0] as ImageExtractionItem);
    }

    return { extraction, items: createdItems };
  });
}

export async function getImageExtractionByUploadId(imageUploadId: number): Promise<ImageExtraction | null> {
  return queryOne<ImageExtraction>(
    'SELECT * FROM image_extractions WHERE image_upload_id = $1',
    [imageUploadId]
  );
}

export async function getImageExtractionById(id: number): Promise<ImageExtraction | null> {
  return queryOne<ImageExtraction>(
    'SELECT * FROM image_extractions WHERE id = $1',
    [id]
  );
}

export async function getImageExtractionItems(extractionId: number): Promise<ImageExtractionItem[]> {
  return query<ImageExtractionItem>(
    'SELECT * FROM image_extraction_items WHERE extraction_id = $1 ORDER BY id',
    [extractionId]
  );
}

export async function getImageExtractionWithItems(imageUploadId: number): Promise<{
  extraction: ImageExtraction;
  items: ImageExtractionItem[];
} | null> {
  const extraction = await getImageExtractionByUploadId(imageUploadId);
  if (!extraction) return null;

  const items = await getImageExtractionItems(extraction.id);
  return { extraction, items };
}

export async function updateImageExtractionItemData(
  itemId: number,
  modifiedData: Record<string, any>
): Promise<ImageExtractionItem | null> {
  return queryOne<ImageExtractionItem>(
    `UPDATE image_extraction_items SET
      user_modified_data = $2,
      status = 'modified',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 RETURNING *`,
    [itemId, JSON.stringify(modifiedData)]
  );
}

export async function updateImageExtractionItemStatus(
  itemId: number,
  status: ExtractionItemStatus,
  createdRecordId?: number,
  createdRecordType?: string
): Promise<ImageExtractionItem | null> {
  if (status === 'approved' && createdRecordId && createdRecordType) {
    return queryOne<ImageExtractionItem>(
      `UPDATE image_extraction_items SET
        status = $2,
        created_record_id = $3,
        created_record_type = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 RETURNING *`,
      [itemId, status, createdRecordId, createdRecordType]
    );
  }

  return queryOne<ImageExtractionItem>(
    `UPDATE image_extraction_items SET
      status = $2,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 RETURNING *`,
    [itemId, status]
  );
}

export async function updateImageExtractionStatus(
  extractionId: number,
  status: ExtractionStatus,
  reviewedBy: number
): Promise<ImageExtraction | null> {
  return queryOne<ImageExtraction>(
    `UPDATE image_extractions SET
      status = $2,
      reviewed_by = $3,
      reviewed_at = CURRENT_TIMESTAMP
    WHERE id = $1 RETURNING *`,
    [extractionId, status, reviewedBy]
  );
}

export async function getImageExtractionItemById(itemId: number): Promise<ImageExtractionItem | null> {
  return queryOne<ImageExtractionItem>(
    'SELECT * FROM image_extraction_items WHERE id = $1',
    [itemId]
  );
}

export async function bulkUpdateImageExtractionItemsStatus(
  itemIds: number[],
  status: ExtractionItemStatus
): Promise<ImageExtractionItem[]> {
  if (itemIds.length === 0) return [];

  return query<ImageExtractionItem>(
    `UPDATE image_extraction_items SET
      status = $2,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ANY($1) RETURNING *`,
    [itemIds, status]
  );
}
