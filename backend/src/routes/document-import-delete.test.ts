/**
 * Tests for DELETE /api/pets/:petId/documents/uploads/:id
 *
 * Covers task-001 acceptance criteria:
 * 1. Editor who didn't upload gets 403 with ownership error message
 * 2. Uploader (editor role) can delete their own document — 204
 * 3. Pet owner can delete any document regardless of uploader — 204
 * 4. Non-existent upload returns 404
 * 5. Viewer gets 403 from verifyPetEditAccess
 * 6. userIsPetOwner is imported and used for the ownership override
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// --- Mocks (must be declared before imports that trigger module evaluation) ---

vi.mock('../db/pool.js', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('../db/redis.js', () => ({
  redis: { get: vi.fn(), set: vi.fn(), del: vi.fn() },
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
  cacheDelete: vi.fn(),
  cacheDeletePattern: vi.fn(),
  createRedisStore: vi.fn(),
}));

vi.mock('../models/user.js', () => ({
  findUserById: vi.fn(),
}));

vi.mock('../models/pet.js', () => ({
  findPetById: vi.fn(),
}));

vi.mock('../models/pet-owners.js', () => ({
  userHasPetAccess: vi.fn(),
  userCanEditPet: vi.fn(),
  userIsPetOwner: vi.fn(),
}));

vi.mock('../models/document-upload.js', () => ({
  getDocumentUploadById: vi.fn(),
  deleteDocumentUpload: vi.fn(),
  createDocumentUpload: vi.fn(),
  getDocumentUploadsByPetId: vi.fn(),
  getDocumentGroup: vi.fn(),
  reorderDocumentGroup: vi.fn(),
  updateDocumentUploadFilename: vi.fn(),
  updateDocumentUploadStatus: vi.fn(),
  updateDocumentImageMetadata: vi.fn(),
  getMediaTypeFromMime: vi.fn(),
}));

vi.mock('../services/storage.js', () => ({
  storage: {
    upload: vi.fn(),
    delete: vi.fn(),
    extractKey: vi.fn().mockReturnValue('test-key'),
    getSignedUrl: vi.fn(),
    getPublicUrl: vi.fn(),
  },
}));

vi.mock('../middleware/upload.js', () => ({
  uploadDocument: {
    single: vi.fn().mockReturnValue((_req: any, _res: any, next: any) => next()),
    array: vi.fn().mockReturnValue((_req: any, _res: any, next: any) => next()),
    fields: vi.fn().mockReturnValue((_req: any, _res: any, next: any) => next()),
  },
}));

vi.mock('../middleware/subscription.js', () => ({
  requireFeature: vi.fn().mockReturnValue((_req: any, _res: any, next: any) => next()),
  requirePremium: vi.fn().mockReturnValue((_req: any, _res: any, next: any) => next()),
  checkPetLimit: vi.fn().mockReturnValue((_req: any, _res: any, next: any) => next()),
}));

vi.mock('../middleware/rate-limit-claude.js', () => ({
  claudeRateLimit: (_req: any, _res: any, next: any) => next(),
  pdfUploadRateLimit: (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../middleware/rate-limit-store.js', () => ({
  createRedisStore: vi.fn(),
  getClientIp: vi.fn(),
}));

vi.mock('../services/document-processor.js', () => ({
  processDocumentUpload: vi.fn(),
  approveDocumentExtractionItems: vi.fn(),
  rejectDocumentExtractionItems: vi.fn(),
  approveMergeDocumentExtractionItems: vi.fn(),
}));

vi.mock('../models/document-extraction.js', () => ({
  getDocumentExtractionWithItems: vi.fn(),
  updateDocumentExtractionItemData: vi.fn(),
}));

vi.mock('../models/health-records.js', () => ({
  findPetMedicationByName: vi.fn(),
  findDuplicateConditions: vi.fn(),
  findDuplicateVets: vi.fn(),
}));

vi.mock('../services/document-classifier.js', () => ({
  generateExtractedItemsSummary: vi.fn(),
}));

vi.mock('../services/audit-logger.js', () => ({
  extractRequestMetadata: vi.fn().mockReturnValue({}),
  logAuditEvent: vi.fn(),
}));

vi.mock('../services/image-optimizer.js', () => ({
  optimizeImage: vi.fn(),
  replaceExtension: vi.fn(),
  isOptimizableImage: vi.fn().mockReturnValue(false),
  extractImageMetadata: vi.fn(),
}));

// --- Import mocked modules to control behavior in tests ---
import { findUserById } from '../models/user.js';
import { findPetById } from '../models/pet.js';
import { userCanEditPet, userIsPetOwner } from '../models/pet-owners.js';
import { getDocumentUploadById, deleteDocumentUpload } from '../models/document-upload.js';
import { storage } from '../services/storage.js';

// Import the router under test AFTER all mocks are set up
import documentImportRouter from './document-import.js';

// --- Test helpers ---

const JWT_SECRET = 'dev_jwt_secret_change_in_production';

function makeToken(userId: number): string {
  return jwt.sign({ userId, email: `user${userId}@test.com` }, JWT_SECRET);
}

function makeUser(id: number) {
  return {
    id,
    email: `user${id}@test.com`,
    name: `User ${id}`,
    is_admin: false,
    subscription_tier: 'free',
    subscription_status: 'free',
    password_hash: 'hash',
    phone: null,
    stripe_customer_id: null,
    subscription_current_period_end: null,
    subscription_stripe_id: null,
    created_at: new Date(),
    updated_at: new Date(),
  };
}

function makeUpload(uploadId: number, petId: number, uploadedBy: number) {
  return {
    id: uploadId,
    pet_id: petId,
    uploaded_by: uploadedBy,
    filename: 'test.pdf',
    original_filename: 'test.pdf',
    file_path: '/uploads/test.pdf',
    file_size: 1024,
    mime_type: 'application/pdf',
    media_type: 'pdf',
    status: 'uploaded',
    detected_type: null,
    classification_confidence: null,
    classification_explanation: null,
    processing_started_at: null,
    processing_completed_at: null,
    error_message: null,
    user_tag: null,
    user_description: null,
    date_taken: null,
    body_area: null,
    document_group_id: null,
    page_number: 1,
    group_name: null,
    created_at: new Date(),
  };
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/pets', documentImportRouter);
  return app;
}

// --- Tests ---

describe('DELETE /api/pets/:petId/documents/uploads/:id — ownership enforcement', () => {
  const PET_ID = 10;
  const UPLOAD_ID = 99;
  const UPLOADER_ID = 1;    // user who originally uploaded the document
  const EDITOR_ID = 2;      // editor role, different user
  const OWNER_ID = 3;       // pet owner role
  const VIEWER_ID = 4;      // viewer-only role

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: storage.delete succeeds silently
    vi.mocked(storage.delete).mockResolvedValue(undefined as any);
    vi.mocked(storage.extractKey).mockReturnValue('test-key');
    // Default: deleteDocumentUpload succeeds
    vi.mocked(deleteDocumentUpload).mockResolvedValue(undefined as any);
  });

  // -------------------------------------------------------------------------
  // Criterion 5: Viewer gets 403 from verifyPetEditAccess
  // -------------------------------------------------------------------------
  it('AC-5: viewer role is blocked by verifyPetEditAccess with 403', async () => {
    vi.mocked(findUserById).mockResolvedValue(makeUser(VIEWER_ID) as any);
    vi.mocked(findPetById).mockResolvedValue({ id: PET_ID } as any);
    vi.mocked(userCanEditPet).mockResolvedValue(false);  // viewer cannot edit

    const app = buildApp();
    const res = await request(app)
      .delete(`/api/pets/${PET_ID}/documents/uploads/${UPLOAD_ID}`)
      .set('Authorization', `Bearer ${makeToken(VIEWER_ID)}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Not authorized to edit this pet');
    // Ownership check should never be reached
    expect(userIsPetOwner).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Criterion 4: Non-existent upload returns 404
  // -------------------------------------------------------------------------
  it('AC-4: non-existent upload returns 404', async () => {
    vi.mocked(findUserById).mockResolvedValue(makeUser(EDITOR_ID) as any);
    vi.mocked(findPetById).mockResolvedValue({ id: PET_ID } as any);
    vi.mocked(userCanEditPet).mockResolvedValue(true);
    vi.mocked(getDocumentUploadById).mockResolvedValue(null);  // not found

    const app = buildApp();
    const res = await request(app)
      .delete(`/api/pets/${PET_ID}/documents/uploads/${UPLOAD_ID}`)
      .set('Authorization', `Bearer ${makeToken(EDITOR_ID)}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Upload not found');
  });

  it('AC-4: upload belonging to a different pet returns 404', async () => {
    vi.mocked(findUserById).mockResolvedValue(makeUser(EDITOR_ID) as any);
    vi.mocked(findPetById).mockResolvedValue({ id: PET_ID } as any);
    vi.mocked(userCanEditPet).mockResolvedValue(true);
    // Upload exists but belongs to a different pet
    vi.mocked(getDocumentUploadById).mockResolvedValue(makeUpload(UPLOAD_ID, 999, UPLOADER_ID) as any);

    const app = buildApp();
    const res = await request(app)
      .delete(`/api/pets/${PET_ID}/documents/uploads/${UPLOAD_ID}`)
      .set('Authorization', `Bearer ${makeToken(EDITOR_ID)}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Upload not found');
  });

  // -------------------------------------------------------------------------
  // Criterion 1: Editor who didn't upload gets 403 with ownership error
  // -------------------------------------------------------------------------
  it('AC-1: editor who did not upload the document gets 403 with ownership error', async () => {
    vi.mocked(findUserById).mockResolvedValue(makeUser(EDITOR_ID) as any);
    vi.mocked(findPetById).mockResolvedValue({ id: PET_ID } as any);
    vi.mocked(userCanEditPet).mockResolvedValue(true);    // passes first gate
    vi.mocked(getDocumentUploadById).mockResolvedValue(
      makeUpload(UPLOAD_ID, PET_ID, UPLOADER_ID) as any  // uploaded by someone else
    );
    vi.mocked(userIsPetOwner).mockResolvedValue(false);   // not the owner either

    const app = buildApp();
    const res = await request(app)
      .delete(`/api/pets/${PET_ID}/documents/uploads/${UPLOAD_ID}`)
      .set('Authorization', `Bearer ${makeToken(EDITOR_ID)}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('You can only delete documents you uploaded');
    expect(userIsPetOwner).toHaveBeenCalledWith(PET_ID, EDITOR_ID);
    expect(deleteDocumentUpload).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Criterion 2: Uploader (editor role) can delete their own document — 204
  // -------------------------------------------------------------------------
  it('AC-2: uploader with editor role can delete their own document — returns 204', async () => {
    vi.mocked(findUserById).mockResolvedValue(makeUser(UPLOADER_ID) as any);
    vi.mocked(findPetById).mockResolvedValue({ id: PET_ID } as any);
    vi.mocked(userCanEditPet).mockResolvedValue(true);
    vi.mocked(getDocumentUploadById).mockResolvedValue(
      makeUpload(UPLOAD_ID, PET_ID, UPLOADER_ID) as any  // uploaded by this user
    );
    // userIsPetOwner should NOT be called (short-circuit: userId === uploaded_by)

    const app = buildApp();
    const res = await request(app)
      .delete(`/api/pets/${PET_ID}/documents/uploads/${UPLOAD_ID}`)
      .set('Authorization', `Bearer ${makeToken(UPLOADER_ID)}`);

    expect(res.status).toBe(204);
    expect(userIsPetOwner).not.toHaveBeenCalled();
    expect(deleteDocumentUpload).toHaveBeenCalledWith(UPLOAD_ID, PET_ID);
  });

  // -------------------------------------------------------------------------
  // Criterion 3: Pet owner can delete any document regardless of uploader — 204
  // -------------------------------------------------------------------------
  it('AC-3: pet owner can delete a document uploaded by a different user — returns 204', async () => {
    vi.mocked(findUserById).mockResolvedValue(makeUser(OWNER_ID) as any);
    vi.mocked(findPetById).mockResolvedValue({ id: PET_ID } as any);
    vi.mocked(userCanEditPet).mockResolvedValue(true);
    vi.mocked(getDocumentUploadById).mockResolvedValue(
      makeUpload(UPLOAD_ID, PET_ID, UPLOADER_ID) as any  // uploaded by someone else
    );
    vi.mocked(userIsPetOwner).mockResolvedValue(true);   // this user IS the owner

    const app = buildApp();
    const res = await request(app)
      .delete(`/api/pets/${PET_ID}/documents/uploads/${UPLOAD_ID}`)
      .set('Authorization', `Bearer ${makeToken(OWNER_ID)}`);

    expect(res.status).toBe(204);
    expect(userIsPetOwner).toHaveBeenCalledWith(PET_ID, OWNER_ID);
    expect(deleteDocumentUpload).toHaveBeenCalledWith(UPLOAD_ID, PET_ID);
  });

  // -------------------------------------------------------------------------
  // Criterion 6: userIsPetOwner is imported and invoked in the ownership check
  // -------------------------------------------------------------------------
  it('AC-6: userIsPetOwner is called when userId does not match uploaded_by', async () => {
    vi.mocked(findUserById).mockResolvedValue(makeUser(EDITOR_ID) as any);
    vi.mocked(findPetById).mockResolvedValue({ id: PET_ID } as any);
    vi.mocked(userCanEditPet).mockResolvedValue(true);
    vi.mocked(getDocumentUploadById).mockResolvedValue(
      makeUpload(UPLOAD_ID, PET_ID, UPLOADER_ID) as any
    );
    vi.mocked(userIsPetOwner).mockResolvedValue(true);   // owner check passes

    const app = buildApp();
    await request(app)
      .delete(`/api/pets/${PET_ID}/documents/uploads/${UPLOAD_ID}`)
      .set('Authorization', `Bearer ${makeToken(EDITOR_ID)}`);

    // Verifies userIsPetOwner was actually imported and called (not undefined)
    expect(userIsPetOwner).toHaveBeenCalledTimes(1);
    expect(userIsPetOwner).toHaveBeenCalledWith(PET_ID, EDITOR_ID);
  });

  // -------------------------------------------------------------------------
  // Boundary: unauthenticated request returns 401
  // -------------------------------------------------------------------------
  it('unauthenticated request returns 401', async () => {
    const app = buildApp();
    const res = await request(app)
      .delete(`/api/pets/${PET_ID}/documents/uploads/${UPLOAD_ID}`);

    expect(res.status).toBe(401);
  });

  // -------------------------------------------------------------------------
  // Boundary: storage delete failure is non-blocking (logged, not thrown)
  // -------------------------------------------------------------------------
  it('storage delete failure does not block DB deletion — returns 204', async () => {
    vi.mocked(findUserById).mockResolvedValue(makeUser(UPLOADER_ID) as any);
    vi.mocked(findPetById).mockResolvedValue({ id: PET_ID } as any);
    vi.mocked(userCanEditPet).mockResolvedValue(true);
    vi.mocked(getDocumentUploadById).mockResolvedValue(
      makeUpload(UPLOAD_ID, PET_ID, UPLOADER_ID) as any
    );
    vi.mocked(storage.delete).mockRejectedValue(new Error('S3 unavailable'));

    const app = buildApp();
    const res = await request(app)
      .delete(`/api/pets/${PET_ID}/documents/uploads/${UPLOAD_ID}`)
      .set('Authorization', `Bearer ${makeToken(UPLOADER_ID)}`);

    // Storage failure is caught and swallowed; DB deletion still runs
    expect(res.status).toBe(204);
    expect(deleteDocumentUpload).toHaveBeenCalledWith(UPLOAD_ID, PET_ID);
  });
});

// ============================================================================
// Static analysis tests — verify source code structure (matches pets.test.ts
// pattern used in the project)
// ============================================================================
describe('document-import.ts static structure — task-001', () => {
  it('imports userIsPetOwner from the pet-owners model', async () => {
    const fs = await import('fs/promises');
    const src = await fs.readFile(
      new URL('./document-import.ts', import.meta.url),
      'utf-8'
    );
    expect(src).toContain('userIsPetOwner');
    expect(src).toContain("from '../models/pet-owners.js'");
  });

  it('DELETE handler contains the ownership check before deleteDocumentUpload', async () => {
    const fs = await import('fs/promises');
    const src = await fs.readFile(
      new URL('./document-import.ts', import.meta.url),
      'utf-8'
    );

    // Find the DELETE route handler block
    const deleteRouteMatch = src.match(
      /router\.delete\(['"]\/:petId\/documents\/uploads\/:id['"][\s\S]*?^\}\);/m
    );
    expect(deleteRouteMatch).toBeTruthy();
    const handler = deleteRouteMatch![0];

    expect(handler).toContain('req.userId !== upload.uploaded_by');
    expect(handler).toContain('userIsPetOwner');
    expect(handler).toContain("'You can only delete documents you uploaded'");
    expect(handler).toContain('deleteDocumentUpload');
  });

  it('ownership check precedes deleteDocumentUpload in the handler body', async () => {
    const fs = await import('fs/promises');
    const src = await fs.readFile(
      new URL('./document-import.ts', import.meta.url),
      'utf-8'
    );

    const ownershipCheckPos = src.indexOf('You can only delete documents you uploaded');
    const deleteCallPos = src.indexOf('deleteDocumentUpload(uploadId, petId)');

    expect(ownershipCheckPos).toBeGreaterThan(0);
    expect(deleteCallPos).toBeGreaterThan(0);
    expect(ownershipCheckPos).toBeLessThan(deleteCallPos);
  });
});
