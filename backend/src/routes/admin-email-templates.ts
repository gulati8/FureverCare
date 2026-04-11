import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { validate } from '../middleware/validate.js';
import {
  getAllEmailTemplates,
  getEmailTemplateByType,
  upsertEmailTemplate,
  deleteEmailTemplate,
} from '../models/email-templates.js';

const router = Router();

const updateTemplateSchema = z.object({
  brevo_template_id: z.number().int().positive(),
  description: z.string().optional(),
});

const createTemplateSchema = z.object({
  email_type: z.string().min(1).regex(/^[a-z][a-z0-9_]*$/),
  brevo_template_id: z.number().int().positive(),
  description: z.string().optional(),
});

// GET /api/admin/email-templates - List all email templates
router.get('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const templates = await getAllEmailTemplates();
    res.json(templates);
  } catch (error) {
    console.error('Error fetching email templates:', error);
    res.status(500).json({ error: 'Failed to fetch email templates' });
  }
});

// GET /api/admin/email-templates/:emailType - Get single template
router.get('/:emailType', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const template = await getEmailTemplateByType(req.params.emailType);
    if (!template) {
      res.status(404).json({ error: 'Email template not found' });
      return;
    }
    res.json(template);
  } catch (error) {
    console.error('Error fetching email template:', error);
    res.status(500).json({ error: 'Failed to fetch email template' });
  }
});

// PUT /api/admin/email-templates/:emailType - Update template mapping
router.put('/:emailType', authenticate, requireAdmin, validate(updateTemplateSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { brevo_template_id, description } = req.body;
    const template = await upsertEmailTemplate(
      req.params.emailType,
      brevo_template_id,
      description ?? null,
      (req as AuthRequest).userId!
    );
    res.json(template);
  } catch (error) {
    console.error('Error updating email template:', error);
    res.status(500).json({ error: 'Failed to update email template' });
  }
});

// POST /api/admin/email-templates - Create new template mapping
router.post('/', authenticate, requireAdmin, validate(createTemplateSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { email_type, brevo_template_id, description } = req.body;
    const template = await upsertEmailTemplate(
      email_type,
      brevo_template_id,
      description ?? null,
      (req as AuthRequest).userId!
    );
    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating email template:', error);
    res.status(500).json({ error: 'Failed to create email template' });
  }
});

// DELETE /api/admin/email-templates/:emailType - Delete template mapping
router.delete('/:emailType', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await deleteEmailTemplate(req.params.emailType);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting email template:', error);
    res.status(500).json({ error: 'Failed to delete email template' });
  }
});

export default router;
