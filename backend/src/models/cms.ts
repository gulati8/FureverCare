import { prisma } from '../db/prisma.js';
import { stripUndefined } from './prisma-helpers.js';

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

function mapPage(page: Record<string, any>): CmsPage {
  return {
    id: page.id,
    slug: page.slug,
    title: page.title,
    is_published: page.is_published ?? false,
    created_at: page.created_at,
    updated_at: page.updated_at,
  };
}

function mapBlock(block: Record<string, any>): CmsBlock {
  return {
    id: block.id,
    page_id: block.page_id,
    block_type: block.block_type,
    sort_order: block.sort_order,
    content: (block.content ?? {}) as Record<string, any>,
    is_visible: block.is_visible ?? true,
    created_at: block.created_at,
    updated_at: block.updated_at,
  };
}

export async function findPageBySlug(slug: string): Promise<CmsPageWithBlocks | null> {
  const page = await prisma.cms_pages.findFirst({
    where: {
      slug,
      is_published: true,
    },
    include: {
      cms_blocks: {
        where: {
          is_visible: true,
        },
        orderBy: {
          sort_order: 'asc',
        },
      },
    },
  });

  if (!page) {
    return null;
  }

  return {
    ...mapPage(page),
    blocks: page.cms_blocks.map(mapBlock),
  };
}

export async function findAllPages(): Promise<CmsPage[]> {
  const pages = await prisma.cms_pages.findMany({
    orderBy: {
      created_at: 'desc',
    },
  });

  return pages.map(mapPage);
}

export async function findPageById(id: number): Promise<CmsPage | null> {
  const page = await prisma.cms_pages.findUnique({
    where: {
      id,
    },
  });

  return page ? mapPage(page) : null;
}

export async function findPageByIdWithBlocks(id: number): Promise<CmsPageWithBlocks | null> {
  const page = await prisma.cms_pages.findUnique({
    where: {
      id,
    },
    include: {
      cms_blocks: {
        orderBy: {
          sort_order: 'asc',
        },
      },
    },
  });

  if (!page) {
    return null;
  }

  return {
    ...mapPage(page),
    blocks: page.cms_blocks.map(mapBlock),
  };
}

export async function createPage(input: CreatePageInput): Promise<CmsPage> {
  const page = await prisma.cms_pages.create({
    data: {
      slug: input.slug,
      title: input.title,
      is_published: input.is_published ?? false,
    },
  });

  return mapPage(page);
}

export async function updatePage(id: number, input: UpdatePageInput): Promise<CmsPage | null> {
  const data = stripUndefined({
    slug: input.slug,
    title: input.title,
    is_published: input.is_published,
    updated_at: new Date(),
  });

  if (Object.keys(data).length === 1) {
    return findPageById(id);
  }

  const pages = await prisma.cms_pages.updateManyAndReturn({
    where: {
      id,
    },
    data,
  });

  return pages[0] ? mapPage(pages[0]) : null;
}

export async function deletePage(id: number): Promise<boolean> {
  const result = await prisma.cms_pages.deleteMany({
    where: {
      id,
    },
  });

  return result.count > 0;
}

export async function publishPage(id: number): Promise<CmsPage | null> {
  const pages = await prisma.cms_pages.updateManyAndReturn({
    where: {
      id,
    },
    data: {
      is_published: true,
      updated_at: new Date(),
    },
  });

  return pages[0] ? mapPage(pages[0]) : null;
}

export async function unpublishPage(id: number): Promise<CmsPage | null> {
  const pages = await prisma.cms_pages.updateManyAndReturn({
    where: {
      id,
    },
    data: {
      is_published: false,
      updated_at: new Date(),
    },
  });

  return pages[0] ? mapPage(pages[0]) : null;
}

export async function findBlocksByPageId(pageId: number): Promise<CmsBlock[]> {
  const blocks = await prisma.cms_blocks.findMany({
    where: {
      page_id: pageId,
    },
    orderBy: {
      sort_order: 'asc',
    },
  });

  return blocks.map(mapBlock);
}

export async function findBlockById(id: number): Promise<CmsBlock | null> {
  const block = await prisma.cms_blocks.findUnique({
    where: {
      id,
    },
  });

  return block ? mapBlock(block) : null;
}

export async function createBlock(input: CreateBlockInput): Promise<CmsBlock> {
  const block = await prisma.cms_blocks.create({
    data: {
      page_id: input.page_id,
      block_type: input.block_type,
      sort_order: input.sort_order,
      content: input.content,
      is_visible: input.is_visible ?? true,
    },
  });

  return mapBlock(block);
}

export async function updateBlock(id: number, input: UpdateBlockInput): Promise<CmsBlock | null> {
  const data = stripUndefined({
    block_type: input.block_type,
    sort_order: input.sort_order,
    content: input.content,
    is_visible: input.is_visible,
    updated_at: new Date(),
  });

  if (Object.keys(data).length === 1) {
    return findBlockById(id);
  }

  const blocks = await prisma.cms_blocks.updateManyAndReturn({
    where: {
      id,
    },
    data,
  });

  return blocks[0] ? mapBlock(blocks[0]) : null;
}

export async function deleteBlock(id: number): Promise<boolean> {
  const result = await prisma.cms_blocks.deleteMany({
    where: {
      id,
    },
  });

  return result.count > 0;
}

export async function reorderBlocks(pageId: number, blockIds: number[]): Promise<CmsBlock[]> {
  await prisma.$transaction(
    blockIds.map((blockId, index) =>
      prisma.cms_blocks.updateMany({
        where: {
          id: blockId,
          page_id: pageId,
        },
        data: {
          sort_order: index,
          updated_at: new Date(),
        },
      })
    )
  );

  return findBlocksByPageId(pageId);
}
