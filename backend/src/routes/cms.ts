import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { validate } from '../middleware/validate.js';
import {
  findPageBySlug,
  findAllPages,
  findPageById,
  findPageByIdWithBlocks,
  createPage,
  updatePage,
  deletePage,
  publishPage,
  unpublishPage,
  findBlocksByPageId,
  findBlockById,
  createBlock,
  updateBlock,
  deleteBlock,
  reorderBlocks,
} from '../models/cms.js';

const router = Router();

// ============ Validation Schemas ============

const createPageSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  title: z.string().min(1).max(255),
  is_published: z.boolean().optional(),
});

const updatePageSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens').optional(),
  title: z.string().min(1).max(255).optional(),
  is_published: z.boolean().optional(),
});

const createBlockSchema = z.object({
  block_type: z.string().min(1).max(50),
  sort_order: z.number().int().min(0),
  content: z.record(z.any()),
  is_visible: z.boolean().optional(),
});

const updateBlockSchema = z.object({
  block_type: z.string().min(1).max(50).optional(),
  sort_order: z.number().int().min(0).optional(),
  content: z.record(z.any()).optional(),
  is_visible: z.boolean().optional(),
});

const reorderBlocksSchema = z.object({
  block_ids: z.array(z.number().int().positive()),
});

// ============ Public Routes ============

// GET /api/cms/pages/:slug - Get published page with blocks (public)
router.get('/pages/:slug', async (req: AuthRequest, res: Response) => {
  try {
    const page = await findPageBySlug(req.params.slug);

    if (!page) {
      res.status(404).json({ error: 'Page not found' });
      return;
    }

    res.json(page);
  } catch (error) {
    console.error('Error fetching page:', error);
    res.status(500).json({ error: 'Failed to fetch page' });
  }
});

// ============ Admin Routes ============

// GET /api/cms/admin/pages - List all pages (admin)
router.get('/admin/pages', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const pages = await findAllPages();
    res.json(pages);
  } catch (error) {
    console.error('Error fetching pages:', error);
    res.status(500).json({ error: 'Failed to fetch pages' });
  }
});

// POST /api/cms/admin/pages - Create page (admin)
router.post('/admin/pages', authenticate, requireAdmin, validate(createPageSchema), async (req: AuthRequest, res: Response) => {
  try {
    const page = await createPage(req.body);
    res.status(201).json(page);
  } catch (error: any) {
    if (error.code === '23505') {
      res.status(409).json({ error: 'A page with this slug already exists' });
      return;
    }
    console.error('Error creating page:', error);
    res.status(500).json({ error: 'Failed to create page' });
  }
});

// GET /api/cms/admin/pages/:id - Get page by ID (admin)
router.get('/admin/pages/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const pageId = parseInt(req.params.id);
    const page = await findPageByIdWithBlocks(pageId);

    if (!page) {
      res.status(404).json({ error: 'Page not found' });
      return;
    }

    res.json(page);
  } catch (error) {
    console.error('Error fetching page:', error);
    res.status(500).json({ error: 'Failed to fetch page' });
  }
});

// PUT /api/cms/admin/pages/:id - Update page (admin)
router.put('/admin/pages/:id', authenticate, requireAdmin, validate(updatePageSchema), async (req: AuthRequest, res: Response) => {
  try {
    const pageId = parseInt(req.params.id);
    const page = await updatePage(pageId, req.body);

    if (!page) {
      res.status(404).json({ error: 'Page not found' });
      return;
    }

    res.json(page);
  } catch (error: any) {
    if (error.code === '23505') {
      res.status(409).json({ error: 'A page with this slug already exists' });
      return;
    }
    console.error('Error updating page:', error);
    res.status(500).json({ error: 'Failed to update page' });
  }
});

// DELETE /api/cms/admin/pages/:id - Delete page (admin)
router.delete('/admin/pages/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const pageId = parseInt(req.params.id);
    const deleted = await deletePage(pageId);

    if (!deleted) {
      res.status(404).json({ error: 'Page not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting page:', error);
    res.status(500).json({ error: 'Failed to delete page' });
  }
});

// POST /api/cms/admin/pages/:id/publish - Publish page (admin)
router.post('/admin/pages/:id/publish', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const pageId = parseInt(req.params.id);
    const page = await publishPage(pageId);

    if (!page) {
      res.status(404).json({ error: 'Page not found' });
      return;
    }

    res.json(page);
  } catch (error) {
    console.error('Error publishing page:', error);
    res.status(500).json({ error: 'Failed to publish page' });
  }
});

// POST /api/cms/admin/pages/:id/unpublish - Unpublish page (admin)
router.post('/admin/pages/:id/unpublish', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const pageId = parseInt(req.params.id);
    const page = await unpublishPage(pageId);

    if (!page) {
      res.status(404).json({ error: 'Page not found' });
      return;
    }

    res.json(page);
  } catch (error) {
    console.error('Error unpublishing page:', error);
    res.status(500).json({ error: 'Failed to unpublish page' });
  }
});

// ============ Block Routes (Admin) ============

// GET /api/cms/admin/pages/:id/blocks - List blocks for a page (admin)
router.get('/admin/pages/:id/blocks', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const pageId = parseInt(req.params.id);

    // Verify page exists
    const page = await findPageById(pageId);
    if (!page) {
      res.status(404).json({ error: 'Page not found' });
      return;
    }

    const blocks = await findBlocksByPageId(pageId);
    res.json(blocks);
  } catch (error) {
    console.error('Error fetching blocks:', error);
    res.status(500).json({ error: 'Failed to fetch blocks' });
  }
});

// POST /api/cms/admin/pages/:id/blocks - Create block (admin)
router.post('/admin/pages/:id/blocks', authenticate, requireAdmin, validate(createBlockSchema), async (req: AuthRequest, res: Response) => {
  try {
    const pageId = parseInt(req.params.id);

    // Verify page exists
    const page = await findPageById(pageId);
    if (!page) {
      res.status(404).json({ error: 'Page not found' });
      return;
    }

    const block = await createBlock({
      page_id: pageId,
      ...req.body,
    });
    res.status(201).json(block);
  } catch (error) {
    console.error('Error creating block:', error);
    res.status(500).json({ error: 'Failed to create block' });
  }
});

// PUT /api/cms/admin/blocks/:id - Update block (admin)
router.put('/admin/blocks/:id', authenticate, requireAdmin, validate(updateBlockSchema), async (req: AuthRequest, res: Response) => {
  try {
    const blockId = parseInt(req.params.id);
    const block = await updateBlock(blockId, req.body);

    if (!block) {
      res.status(404).json({ error: 'Block not found' });
      return;
    }

    res.json(block);
  } catch (error) {
    console.error('Error updating block:', error);
    res.status(500).json({ error: 'Failed to update block' });
  }
});

// DELETE /api/cms/admin/blocks/:id - Delete block (admin)
router.delete('/admin/blocks/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const blockId = parseInt(req.params.id);
    const deleted = await deleteBlock(blockId);

    if (!deleted) {
      res.status(404).json({ error: 'Block not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting block:', error);
    res.status(500).json({ error: 'Failed to delete block' });
  }
});

// PUT /api/cms/admin/pages/:id/blocks/reorder - Reorder blocks (admin)
router.put('/admin/pages/:id/blocks/reorder', authenticate, requireAdmin, validate(reorderBlocksSchema), async (req: AuthRequest, res: Response) => {
  try {
    const pageId = parseInt(req.params.id);

    // Verify page exists
    const page = await findPageById(pageId);
    if (!page) {
      res.status(404).json({ error: 'Page not found' });
      return;
    }

    const blocks = await reorderBlocks(pageId, req.body.block_ids);
    res.json(blocks);
  } catch (error) {
    console.error('Error reordering blocks:', error);
    res.status(500).json({ error: 'Failed to reorder blocks' });
  }
});

export default router;
