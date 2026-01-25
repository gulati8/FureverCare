import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { userHasPetAccess } from '../models/pet-owners.js';
import {
  getAuditLogForPet,
  getAuditLogForRecord,
  getAuditLogCountForPet,
  getAuditLogForPdfUpload,
} from '../models/audit-log.js';

const router = Router();

// GET /api/pets/:petId/audit - Get audit log for a pet
router.get('/:petId/audit', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.petId);

    const hasAccess = await userHasPetAccess(petId, req.userId!);
    if (!hasAccess) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const entityType = req.query.entityType as string | undefined;
    const action = req.query.action as string | undefined;

    const [logs, total] = await Promise.all([
      getAuditLogForPet(petId, { limit, offset, entityType, action }),
      getAuditLogCountForPet(petId, { entityType, action }),
    ]);

    res.json({
      logs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + logs.length < total,
      },
    });
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

// GET /api/pets/:petId/audit/:recordType/:recordId - Get audit log for a specific record
router.get('/:petId/audit/:recordType/:recordId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.petId);
    const { recordType, recordId } = req.params;

    const hasAccess = await userHasPetAccess(petId, req.userId!);
    if (!hasAccess) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }

    // Validate record type
    const validRecordTypes = [
      'pets',
      'pet_vaccinations',
      'pet_medications',
      'pet_conditions',
      'pet_allergies',
      'pet_vets',
      'pet_emergency_contacts',
    ];

    if (!validRecordTypes.includes(recordType)) {
      res.status(400).json({ error: 'Invalid record type' });
      return;
    }

    const logs = await getAuditLogForRecord(recordType, parseInt(recordId));
    res.json(logs);
  } catch (error) {
    console.error('Error fetching record audit log:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

// GET /api/pets/:petId/audit/pdf-upload/:uploadId - Get audit entries from a specific PDF upload
router.get('/:petId/audit/pdf-upload/:uploadId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.petId);
    const uploadId = parseInt(req.params.uploadId);

    const hasAccess = await userHasPetAccess(petId, req.userId!);
    if (!hasAccess) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }

    const logs = await getAuditLogForPdfUpload(uploadId);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching PDF upload audit log:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

export default router;
