import { pool, query, queryOne, transaction } from '../db/pool.js';

// ============ Interfaces ============

export interface CmsPage {
  id: number;
  slug: string;
  title: string;
  is_published: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CmsBlock {
  id: number;
  page_id: number;
  block_type: string;
  sort_order: number;
  content: Record<string, any>;
  is_visible: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CmsPageWithBlocks extends CmsPage {
  blocks: CmsBlock[];
}

export interface CreatePageInput {
  slug: string;
  title: string;
  is_published?: boolean;
}

export interface UpdatePageInput {
  slug?: string;
  title?: string;
  is_published?: boolean;
}

export interface CreateBlockInput {
  page_id: number;
  block_type: string;
  sort_order: number;
  content: Record<string, any>;
  is_visible?: boolean;
}

export interface UpdateBlockInput {
  block_type?: string;
  sort_order?: number;
  content?: Record<string, any>;
  is_visible?: boolean;
}

// ============ Page Functions ============

export async function findPageBySlug(slug: string): Promise<CmsPageWithBlocks | null> {
  const page = await queryOne<CmsPage>(
    `SELECT * FROM cms_pages WHERE slug = $1 AND is_published = true`,
    [slug]
  );

  if (!page) return null;

  const blocks = await query<CmsBlock>(
    `SELECT * FROM cms_blocks
     WHERE page_id = $1 AND is_visible = true
     ORDER BY sort_order ASC`,
    [page.id]
  );

  return { ...page, blocks };
}

export async function findAllPages(): Promise<CmsPage[]> {
  return query<CmsPage>(
    `SELECT * FROM cms_pages ORDER BY created_at DESC`
  );
}

export async function findPageById(id: number): Promise<CmsPage | null> {
  return queryOne<CmsPage>(
    `SELECT * FROM cms_pages WHERE id = $1`,
    [id]
  );
}

export async function findPageByIdWithBlocks(id: number): Promise<CmsPageWithBlocks | null> {
  const page = await findPageById(id);
  if (!page) return null;

  const blocks = await query<CmsBlock>(
    `SELECT * FROM cms_blocks WHERE page_id = $1 ORDER BY sort_order ASC`,
    [page.id]
  );

  return { ...page, blocks };
}

export async function createPage(input: CreatePageInput): Promise<CmsPage> {
  const result = await queryOne<CmsPage>(
    `INSERT INTO cms_pages (slug, title, is_published)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [input.slug, input.title, input.is_published ?? false]
  );

  return result!;
}

export async function updatePage(id: number, input: UpdatePageInput): Promise<CmsPage | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (input.slug !== undefined) {
    fields.push(`slug = $${paramCount++}`);
    values.push(input.slug);
  }
  if (input.title !== undefined) {
    fields.push(`title = $${paramCount++}`);
    values.push(input.title);
  }
  if (input.is_published !== undefined) {
    fields.push(`is_published = $${paramCount++}`);
    values.push(input.is_published);
  }

  if (fields.length === 0) return findPageById(id);

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  return queryOne<CmsPage>(
    `UPDATE cms_pages SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    values
  );
}

export async function deletePage(id: number): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM cms_pages WHERE id = $1`,
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function publishPage(id: number): Promise<CmsPage | null> {
  return queryOne<CmsPage>(
    `UPDATE cms_pages
     SET is_published = true, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [id]
  );
}

export async function unpublishPage(id: number): Promise<CmsPage | null> {
  return queryOne<CmsPage>(
    `UPDATE cms_pages
     SET is_published = false, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [id]
  );
}

// ============ Block Functions ============

export async function findBlocksByPageId(pageId: number): Promise<CmsBlock[]> {
  return query<CmsBlock>(
    `SELECT * FROM cms_blocks WHERE page_id = $1 ORDER BY sort_order ASC`,
    [pageId]
  );
}

export async function findBlockById(id: number): Promise<CmsBlock | null> {
  return queryOne<CmsBlock>(
    `SELECT * FROM cms_blocks WHERE id = $1`,
    [id]
  );
}

export async function createBlock(input: CreateBlockInput): Promise<CmsBlock> {
  const result = await queryOne<CmsBlock>(
    `INSERT INTO cms_blocks (page_id, block_type, sort_order, content, is_visible)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      input.page_id,
      input.block_type,
      input.sort_order,
      JSON.stringify(input.content),
      input.is_visible ?? true
    ]
  );

  return result!;
}

export async function updateBlock(id: number, input: UpdateBlockInput): Promise<CmsBlock | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (input.block_type !== undefined) {
    fields.push(`block_type = $${paramCount++}`);
    values.push(input.block_type);
  }
  if (input.sort_order !== undefined) {
    fields.push(`sort_order = $${paramCount++}`);
    values.push(input.sort_order);
  }
  if (input.content !== undefined) {
    fields.push(`content = $${paramCount++}`);
    values.push(JSON.stringify(input.content));
  }
  if (input.is_visible !== undefined) {
    fields.push(`is_visible = $${paramCount++}`);
    values.push(input.is_visible);
  }

  if (fields.length === 0) return findBlockById(id);

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  return queryOne<CmsBlock>(
    `UPDATE cms_blocks SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    values
  );
}

export async function deleteBlock(id: number): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM cms_blocks WHERE id = $1`,
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function reorderBlocks(pageId: number, blockIds: number[]): Promise<CmsBlock[]> {
  return transaction(async (client) => {
    // Update each block's sort_order based on its position in the array
    for (let i = 0; i < blockIds.length; i++) {
      await client.query(
        `UPDATE cms_blocks
         SET sort_order = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND page_id = $3`,
        [i, blockIds[i], pageId]
      );
    }

    // Return the updated blocks
    const result = await client.query(
      `SELECT * FROM cms_blocks WHERE page_id = $1 ORDER BY sort_order ASC`,
      [pageId]
    );
    return result.rows;
  });
}
