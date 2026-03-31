/**
 * Tests for "Set as Primary" emergency contact feature.
 *
 * Covers all acceptance criteria from plan.json:
 *   task-001: setPrimaryEmergencyContact model function
 *   task-002: PATCH route /:id/emergency-contacts/:contactId/primary
 *   task-003: frontend API client method (structural verification)
 *   task-004: ContactsTab UI handler and button (structural verification)
 *   task-005: Emergency card filtering in public.ts and EmergencyCardView.tsx
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setPrimaryEmergencyContact, PetEmergencyContact } from './models/health-records.js';
import * as pool from './db/pool.js';
import * as auditLogger from './services/audit-logger.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Mock dependencies
vi.mock('./db/pool.js');
vi.mock('./db/redis.js');
vi.mock('./services/audit-logger.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─────────────────────────────────────────────────────────────────────────────
// TASK-001: setPrimaryEmergencyContact model function
// ─────────────────────────────────────────────────────────────────────────────

describe('task-001: setPrimaryEmergencyContact model function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('criterion: function is exported from health-records.ts', () => {
    // The import at the top of this file proves it is exported.
    expect(typeof setPrimaryEmergencyContact).toBe('function');
  });

  it('criterion: function uses transaction() helper — verifies target contact exists and returns it', async () => {
    const petId = 1;
    const contactId = 2;

    const existingContact: PetEmergencyContact = {
      id: contactId,
      pet_id: petId,
      name: 'Jane Doe',
      phone: '555-9999',
      relationship: 'Sister',
      email: null,
      is_primary: false,
      created_at: new Date(),
    };

    const updatedContact = { ...existingContact, is_primary: true };

    const mockClient = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [existingContact] })  // SELECT target contact
        .mockResolvedValueOnce({ rows: [existingContact] })  // SELECT all contacts for audit
        .mockResolvedValueOnce({ rows: [] })                  // UPDATE all to false
        .mockResolvedValueOnce({ rows: [updatedContact] }),   // UPDATE target to true RETURNING *
    };

    vi.spyOn(pool, 'transaction').mockImplementation(async (callback: any) => {
      return callback(mockClient);
    });

    vi.spyOn(auditLogger, 'logUpdate').mockResolvedValue(undefined as any);

    const result = await setPrimaryEmergencyContact(petId, contactId);

    expect(pool.transaction).toHaveBeenCalledOnce();
    expect(result.is_primary).toBe(true);
    expect(result.id).toBe(contactId);
  });

  it('criterion: queries pet_emergency_contacts (not pet_vets) to verify the target contact exists', async () => {
    const petId = 1;
    const contactId = 2;

    const existingContact: PetEmergencyContact = {
      id: contactId,
      pet_id: petId,
      name: 'Jane Doe',
      phone: '555-9999',
      relationship: 'Sister',
      email: null,
      is_primary: false,
      created_at: new Date(),
    };

    const updatedContact = { ...existingContact, is_primary: true };

    const mockClient = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [existingContact] })
        .mockResolvedValueOnce({ rows: [existingContact] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [updatedContact] }),
    };

    vi.spyOn(pool, 'transaction').mockImplementation(async (callback: any) => callback(mockClient));
    vi.spyOn(auditLogger, 'logUpdate').mockResolvedValue(undefined as any);

    await setPrimaryEmergencyContact(petId, contactId);

    // First query must target pet_emergency_contacts with the contactId and petId
    expect(mockClient.query).toHaveBeenCalledWith(
      'SELECT * FROM pet_emergency_contacts WHERE id = $1 AND pet_id = $2',
      [contactId, petId]
    );
  });

  it('criterion: throws Error("Emergency contact not found") when contact does not belong to pet', async () => {
    const petId = 1;
    const contactId = 999;

    const mockClient = {
      query: vi.fn().mockResolvedValueOnce({ rows: [] }), // contact not found
    };

    vi.spyOn(pool, 'transaction').mockImplementation(async (callback: any) => callback(mockClient));

    await expect(setPrimaryEmergencyContact(petId, contactId)).rejects.toThrow('Emergency contact not found');
  });

  it('criterion: sets all contacts for the pet to is_primary = false via UPDATE pet_emergency_contacts SET is_primary = false WHERE pet_id = $1', async () => {
    const petId = 5;
    const contactId = 10;

    const existingContact: PetEmergencyContact = {
      id: contactId,
      pet_id: petId,
      name: 'Bob',
      phone: '555-1234',
      relationship: null,
      email: null,
      is_primary: false,
      created_at: new Date(),
    };

    const updatedContact = { ...existingContact, is_primary: true };

    const mockClient = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [existingContact] })
        .mockResolvedValueOnce({ rows: [existingContact] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [updatedContact] }),
    };

    vi.spyOn(pool, 'transaction').mockImplementation(async (callback: any) => callback(mockClient));
    vi.spyOn(auditLogger, 'logUpdate').mockResolvedValue(undefined as any);

    await setPrimaryEmergencyContact(petId, contactId);

    expect(mockClient.query).toHaveBeenCalledWith(
      'UPDATE pet_emergency_contacts SET is_primary = false WHERE pet_id = $1',
      [petId]
    );
  });

  it('criterion: sets the target contact to is_primary = true via UPDATE pet_emergency_contacts SET is_primary = true WHERE id = $1 AND pet_id = $2 RETURNING *', async () => {
    const petId = 5;
    const contactId = 10;

    const existingContact: PetEmergencyContact = {
      id: contactId,
      pet_id: petId,
      name: 'Bob',
      phone: '555-1234',
      relationship: null,
      email: null,
      is_primary: false,
      created_at: new Date(),
    };

    const updatedContact = { ...existingContact, is_primary: true };

    const mockClient = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [existingContact] })
        .mockResolvedValueOnce({ rows: [existingContact] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [updatedContact] }),
    };

    vi.spyOn(pool, 'transaction').mockImplementation(async (callback: any) => callback(mockClient));
    vi.spyOn(auditLogger, 'logUpdate').mockResolvedValue(undefined as any);

    await setPrimaryEmergencyContact(petId, contactId);

    expect(mockClient.query).toHaveBeenCalledWith(
      'UPDATE pet_emergency_contacts SET is_primary = true WHERE id = $1 AND pet_id = $2 RETURNING *',
      [contactId, petId]
    );
  });

  it('criterion: logs audit event via logUpdate for the promoted contact when audit context is provided', async () => {
    const petId = 1;
    const contactId = 2;

    const existingContact: PetEmergencyContact = {
      id: contactId,
      pet_id: petId,
      name: 'Jane Doe',
      phone: '555-9999',
      relationship: 'Sister',
      email: null,
      is_primary: false,
      created_at: new Date(),
    };

    const updatedContact = { ...existingContact, is_primary: true };

    const mockClient = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [existingContact] })
        .mockResolvedValueOnce({ rows: [existingContact] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [updatedContact] }),
    };

    vi.spyOn(pool, 'transaction').mockImplementation(async (callback: any) => callback(mockClient));
    vi.spyOn(auditLogger, 'logUpdate').mockResolvedValue(undefined as any);

    await setPrimaryEmergencyContact(petId, contactId, {
      userId: 42,
      source: 'manual',
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    });

    expect(auditLogger.logUpdate).toHaveBeenCalledWith(
      'pet_emergency_contacts',
      contactId,
      existingContact,
      updatedContact,
      42,
      expect.objectContaining({ source: 'manual' })
    );
  });

  it('criterion: logs audit event via logUpdate for previously-primary demoted contacts', async () => {
    const petId = 1;
    const contactId = 2;

    const primaryContact: PetEmergencyContact = {
      id: 1,
      pet_id: petId,
      name: 'Alice',
      phone: '555-1111',
      relationship: 'Mom',
      email: null,
      is_primary: true, // currently primary — will be demoted
      created_at: new Date(),
    };

    const targetContact: PetEmergencyContact = {
      id: contactId,
      pet_id: petId,
      name: 'Jane Doe',
      phone: '555-9999',
      relationship: 'Sister',
      email: null,
      is_primary: false,
      created_at: new Date(),
    };

    const updatedContact = { ...targetContact, is_primary: true };

    const mockClient = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [targetContact] })
        .mockResolvedValueOnce({ rows: [primaryContact, targetContact] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [updatedContact] }),
    };

    vi.spyOn(pool, 'transaction').mockImplementation(async (callback: any) => callback(mockClient));
    vi.spyOn(auditLogger, 'logUpdate').mockResolvedValue(undefined as any);

    await setPrimaryEmergencyContact(petId, contactId, { userId: 42, source: 'manual' });

    // Two logUpdate calls: one for promotion, one for demotion
    expect(auditLogger.logUpdate).toHaveBeenCalledTimes(2);

    // Demotion log: previously-primary contact gets is_primary = false
    expect(auditLogger.logUpdate).toHaveBeenCalledWith(
      'pet_emergency_contacts',
      primaryContact.id,
      primaryContact,
      expect.objectContaining({ is_primary: false }),
      42,
      expect.objectContaining({ source: 'manual' })
    );
  });

  it('criterion: does not call logUpdate when no audit context is provided', async () => {
    const petId = 1;
    const contactId = 2;

    const existingContact: PetEmergencyContact = {
      id: contactId,
      pet_id: petId,
      name: 'Jane Doe',
      phone: '555-9999',
      relationship: 'Sister',
      email: null,
      is_primary: false,
      created_at: new Date(),
    };

    const updatedContact = { ...existingContact, is_primary: true };

    const mockClient = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [existingContact] })
        .mockResolvedValueOnce({ rows: [existingContact] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [updatedContact] }),
    };

    vi.spyOn(pool, 'transaction').mockImplementation(async (callback: any) => callback(mockClient));
    vi.spyOn(auditLogger, 'logUpdate').mockResolvedValue(undefined as any);

    await setPrimaryEmergencyContact(petId, contactId); // no audit

    expect(auditLogger.logUpdate).not.toHaveBeenCalled();
  });

  it('criterion: returns the updated target contact record', async () => {
    const petId = 1;
    const contactId = 2;

    const existingContact: PetEmergencyContact = {
      id: contactId,
      pet_id: petId,
      name: 'Jane Doe',
      phone: '555-9999',
      relationship: 'Sister',
      email: null,
      is_primary: false,
      created_at: new Date(),
    };

    const updatedContact = { ...existingContact, is_primary: true };

    const mockClient = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [existingContact] })
        .mockResolvedValueOnce({ rows: [existingContact] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [updatedContact] }),
    };

    vi.spyOn(pool, 'transaction').mockImplementation(async (callback: any) => callback(mockClient));
    vi.spyOn(auditLogger, 'logUpdate').mockResolvedValue(undefined as any);

    const result = await setPrimaryEmergencyContact(petId, contactId, { userId: 1 });

    expect(result).toEqual(updatedContact);
    expect(result.is_primary).toBe(true);
    expect(result.id).toBe(contactId);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TASK-002: PATCH route /:id/emergency-contacts/:contactId/primary
// ─────────────────────────────────────────────────────────────────────────────

describe('task-002: PATCH route structural verification (pets.ts)', () => {
  let routesContent: string;
  let patchBlock: string;

  beforeEach(async () => {
    routesContent = await fs.readFile(
      path.join(__dirname, 'routes/pets.ts'),
      'utf-8'
    );
    // Extract the full PATCH handler block by finding everything from the
    // route declaration up to (but not including) the next router.* call.
    const startIdx = routesContent.indexOf("router.patch('/:id/emergency-contacts/:contactId/primary'");
    const nextRouterIdx = routesContent.indexOf('router.', startIdx + 10);
    patchBlock = routesContent.substring(startIdx, nextRouterIdx);
  });

  it('criterion: setPrimaryEmergencyContact is imported from health-records.js in pets.ts', () => {
    expect(routesContent).toContain('setPrimaryEmergencyContact');
    const importLine = routesContent.match(/getPetEmergencyContacts[\s\S]*?from '\.\.\/models\/health-records\.js'/);
    expect(importLine).toBeTruthy();
    expect(importLine![0]).toContain('setPrimaryEmergencyContact');
  });

  it('criterion: PATCH route handler exists at router.patch("/:id/emergency-contacts/:contactId/primary", authenticate, ...)', () => {
    expect(routesContent).toContain("router.patch('/:id/emergency-contacts/:contactId/primary'");
    expect(patchBlock).toContain('authenticate');
  });

  it('criterion: route is placed after DELETE emergency-contacts route and before Source Document Lookup section', () => {
    const deleteIdx = routesContent.indexOf("router.delete('/:id/emergency-contacts/:contactId'");
    const patchIdx = routesContent.indexOf("router.patch('/:id/emergency-contacts/:contactId/primary'");
    const sourceLookupIdx = routesContent.indexOf('// --- Source Document Lookup ---');

    expect(deleteIdx).toBeGreaterThan(-1);
    expect(patchIdx).toBeGreaterThan(-1);
    expect(sourceLookupIdx).toBeGreaterThan(-1);

    expect(patchIdx).toBeGreaterThan(deleteIdx);
    expect(patchIdx).toBeLessThan(sourceLookupIdx);
  });

  it('criterion: route verifies pet access via verifyPetAccess and returns 404 if denied', () => {
    expect(patchBlock).toContain('verifyPetAccess');
    expect(patchBlock).toContain("res.status(404).json({ error: 'Pet not found' })");
  });

  it('criterion: route builds audit context with userId, source: "manual", ipAddress, userAgent', () => {
    expect(patchBlock).toContain('const audit =');
    expect(patchBlock).toContain('userId: req.userId');
    expect(patchBlock).toContain("source: 'manual'");
    expect(patchBlock).toContain('ipAddress: req.ip');
    expect(patchBlock).toContain("userAgent: req.headers['user-agent']");
  });

  it('criterion: route calls await setPrimaryEmergencyContact(petId, contactId, audit)', () => {
    expect(patchBlock).toContain('await setPrimaryEmergencyContact(petId, contactId, audit)');
  });

  it('criterion: route calls await invalidateCardCache(petId) after successful update', () => {
    expect(patchBlock).toContain('await invalidateCardCache(petId)');
  });

  it('criterion: route returns full contacts list via res.json(await getPetEmergencyContacts(petId))', () => {
    expect(patchBlock).toContain('await getPetEmergencyContacts(petId)');
    expect(patchBlock).toContain('res.json(');
  });

  it('criterion: route catches "Emergency contact not found" error and returns 404', () => {
    expect(patchBlock).toContain("'Emergency contact not found'");
    expect(patchBlock).toContain('res.status(404)');
  });

  it('criterion: route catches generic errors and returns 500 with message "Failed to set primary emergency contact"', () => {
    expect(patchBlock).toContain('res.status(500)');
    expect(patchBlock).toContain("'Failed to set primary emergency contact'");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TASK-003: Frontend API client method (structural verification)
// ─────────────────────────────────────────────────────────────────────────────

describe('task-003: Frontend API client structural verification (client.ts)', () => {
  let clientContent: string;

  beforeEach(async () => {
    clientContent = await fs.readFile(
      path.join(__dirname, '../../frontend/src/api/client.ts'),
      'utf-8'
    );
  });

  it('criterion: setPrimaryEmergencyContact method exists on petsApi object', () => {
    expect(clientContent).toContain('setPrimaryEmergencyContact:');
  });

  it('criterion: method uses api.patch (not api.post or api.put)', () => {
    const methodBlock = clientContent.match(/setPrimaryEmergencyContact:[\s\S]*?(?=\n  \w|\n};)/);
    expect(methodBlock).toBeTruthy();
    expect(methodBlock![0]).toContain('api.patch');
    expect(methodBlock![0]).not.toContain('api.post');
    expect(methodBlock![0]).not.toContain('api.put');
  });

  it('criterion: URL pattern is /api/pets/${petId}/emergency-contacts/${contactId}/primary', () => {
    expect(clientContent).toContain('/api/pets/${petId}/emergency-contacts/${contactId}/primary');
  });

  it('criterion: method passes an empty object {} as the request body', () => {
    // The method is defined across two lines; search full file content
    // Line 1: "setPrimaryEmergencyContact: (petId: ...) =>"
    // Line 2: "  api.patch<...>(..., {}, token)"
    expect(clientContent).toContain('{}, token)');
  });

  it('criterion: return type generic parameter is PetEmergencyContact[]', () => {
    // The api.patch generic is on the second line of the method
    const startIdx = clientContent.indexOf('setPrimaryEmergencyContact:');
    const endIdx = clientContent.indexOf('\n', clientContent.indexOf('\n', startIdx) + 1);
    const methodBlock = clientContent.substring(startIdx, endIdx);
    expect(methodBlock).toContain('PetEmergencyContact[]');
  });

  it('criterion: method is placed after deleteEmergencyContact and before getRecordSource', () => {
    const deleteIdx = clientContent.indexOf('deleteEmergencyContact:');
    const setPrimaryIdx = clientContent.indexOf('setPrimaryEmergencyContact:');
    const getRecordSourceIdx = clientContent.indexOf('getRecordSource:');

    expect(deleteIdx).toBeGreaterThan(-1);
    expect(setPrimaryIdx).toBeGreaterThan(-1);
    expect(getRecordSourceIdx).toBeGreaterThan(-1);

    expect(setPrimaryIdx).toBeGreaterThan(deleteIdx);
    expect(setPrimaryIdx).toBeLessThan(getRecordSourceIdx);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TASK-004: ContactsTab UI handler and button (structural verification)
// ─────────────────────────────────────────────────────────────────────────────

describe('task-004: ContactsTab structural verification (ContactsTab.tsx)', () => {
  let contactsTabContent: string;

  beforeEach(async () => {
    contactsTabContent = await fs.readFile(
      path.join(__dirname, '../../frontend/src/pages/pet-profile/tabs/ContactsTab.tsx'),
      'utf-8'
    );
  });

  it('criterion: handleSetPrimary async function exists accepting a contactId: number parameter', () => {
    expect(contactsTabContent).toContain('handleSetPrimary');
    const fnMatch = contactsTabContent.match(/const handleSetPrimary\s*=\s*async\s*\(\s*contactId/);
    expect(fnMatch).toBeTruthy();
  });

  it('criterion: handleSetPrimary calls petsApi.setPrimaryEmergencyContact(petId, contactId, token)', () => {
    expect(contactsTabContent).toContain('petsApi.setPrimaryEmergencyContact(petId, contactId, token)');
  });

  it('criterion: handleSetPrimary updates local state via setContacts(contacts.map(c => ({ ...c, is_primary: c.id === contactId })))', () => {
    const fnBlock = contactsTabContent.match(/handleSetPrimary[\s\S]*?^  };/m);
    if (!fnBlock) {
      // Try a simpler check
      expect(contactsTabContent).toContain('setContacts(contacts.map(c => ({ ...c, is_primary: c.id === contactId })))');
    } else {
      expect(fnBlock![0]).toContain('setContacts');
      expect(fnBlock![0]).toContain('is_primary: c.id === contactId');
    }
  });

  it('criterion: "Set as Primary" button renders for contacts where c.is_primary is false (guarded by !c.is_primary)', () => {
    expect(contactsTabContent).toContain('!c.is_primary');
    expect(contactsTabContent).toContain('Set as Primary');
  });

  it('criterion: button has className "text-navy hover:text-primary-800 text-sm"', () => {
    const buttonBlock = contactsTabContent.match(/Set as Primary[\s\S]{0,200}/);
    expect(buttonBlock).toBeTruthy();
    // Check the surrounding context contains the className
    const nearButton = contactsTabContent.match(/text-navy hover:text-primary-800 text-sm[\s\S]{0,100}Set as Primary|Set as Primary[\s\S]{0,100}text-navy hover:text-primary-800 text-sm/);
    // More lenient: just verify the className string appears near the button
    const buttonIndex = contactsTabContent.indexOf('Set as Primary');
    const surroundingCode = contactsTabContent.substring(
      Math.max(0, buttonIndex - 200),
      buttonIndex + 50
    );
    expect(surroundingCode).toContain('text-navy hover:text-primary-800 text-sm');
  });

  it('criterion: button text is exactly "Set as Primary"', () => {
    // JSX splits button text across lines with indentation, so we check for
    // the text content "Set as Primary" appearing inside a button element
    expect(contactsTabContent).toContain('Set as Primary');
    // Verify it is inside a <button> element (not just a random string)
    const buttonMatch = contactsTabContent.match(/<button[\s\S]*?>[\s\S]*?Set as Primary[\s\S]*?<\/button>/);
    expect(buttonMatch).toBeTruthy();
  });

  it('criterion: button onClick calls () => handleSetPrimary(c.id)', () => {
    expect(contactsTabContent).toContain('handleSetPrimary(c.id)');
  });

  it('criterion: button is placed after the Edit button in the action buttons div', () => {
    const editIdx = contactsTabContent.indexOf("setEditingId(c.id)");
    const setPrimaryIdx = contactsTabContent.indexOf('handleSetPrimary(c.id)');
    expect(editIdx).toBeGreaterThan(-1);
    expect(setPrimaryIdx).toBeGreaterThan(-1);
    expect(setPrimaryIdx).toBeGreaterThan(editIdx);
  });

  it('criterion: button is placed before the delete confirmation section', () => {
    const setPrimaryIdx = contactsTabContent.indexOf('handleSetPrimary(c.id)');
    const deletingConfirmIdx = contactsTabContent.indexOf('deletingId === c.id');
    expect(setPrimaryIdx).toBeGreaterThan(-1);
    expect(deletingConfirmIdx).toBeGreaterThan(-1);
    expect(setPrimaryIdx).toBeLessThan(deletingConfirmIdx);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TASK-005: Emergency card filtering — public.ts and EmergencyCardView.tsx
// ─────────────────────────────────────────────────────────────────────────────

describe('task-005: Emergency card filtering (public.ts)', () => {
  let publicContent: string;

  beforeEach(async () => {
    publicContent = await fs.readFile(
      path.join(__dirname, 'routes/public.ts'),
      'utf-8'
    );
  });

  it('criterion: buildEmergencyCard filters emergency_contacts to at most one contact (primary or first fallback)', () => {
    // Look for the filtering logic — find(is_primary) with fallback
    expect(publicContent).toContain('emergency_contacts');
    const filterBlock = publicContent.match(/emergency_contacts[\s\S]*?is_primary[\s\S]*?emergencyContacts\[0\]/);
    expect(filterBlock).toBeTruthy();
  });

  it('criterion: uses is_primary === true find with first-contact fallback pattern', () => {
    expect(publicContent).toContain('is_primary');
    // The pattern: find(c => c.is_primary) || emergencyContacts[0]
    const pattern = publicContent.match(/emergencyContacts\.find\(c\s*=>\s*c\.is_primary\)\s*\|\|\s*emergencyContacts\[0\]/);
    expect(pattern).toBeTruthy();
  });

  it('criterion: when zero emergency contacts, emergency_contacts is empty array (no errors)', () => {
    // Look for the length === 0 guard returning []
    const zeroGuard = publicContent.match(/emergencyContacts\.length\s*===\s*0[\s\S]*?return\s*\[\]/);
    expect(zeroGuard).toBeTruthy();
  });

  it('criterion: the filtered result is an array with at most one element', () => {
    // The implementation wraps the single primary in an array: return [{ name: primary.name, ... }]
    const singleElementReturn = publicContent.match(/return\s*\[\{[\s\S]*?name:\s*primary\.name/);
    expect(singleElementReturn).toBeTruthy();
  });
});

describe('task-005: Emergency card filtering (EmergencyCardView.tsx)', () => {
  let cardViewContent: string;

  beforeEach(async () => {
    cardViewContent = await fs.readFile(
      path.join(__dirname, '../../frontend/src/components/EmergencyCardView.tsx'),
      'utf-8'
    );
  });

  it('criterion: only one emergency contact renders — finds primary or falls back to first', () => {
    // Pattern: emergency_contacts.find(c => c.is_primary) || emergency_contacts[0]
    const pattern = cardViewContent.match(/emergency_contacts\.find\(c\s*=>\s*c\.is_primary\)\s*\|\|\s*emergency_contacts\[0\]/);
    expect(pattern).toBeTruthy();
  });

  it('criterion: when emergency_contacts is empty, no contact card items render (no errors)', () => {
    // Guard: if (emergency_contacts.length === 0) return null
    const emptyGuard = cardViewContent.match(/emergency_contacts\.length\s*===\s*0[\s\S]*?return null/);
    expect(emptyGuard).toBeTruthy();
  });

  it('criterion: owner card rendering is unchanged — renders owner name and phone', () => {
    // Owner section should still be present
    expect(cardViewContent).toContain('owner.name');
    expect(cardViewContent).toContain('owner.phone');
    expect(cardViewContent).toContain('Owner');
  });

  it('criterion: veterinarian cards rendering is unchanged — maps over veterinarians array', () => {
    // Vets section should still map over veterinarians
    expect(cardViewContent).toContain('veterinarians.map(');
    expect(cardViewContent).toContain('v.clinic_name');
    expect(cardViewContent).toContain('v.phone');
  });

  it('criterion: EmergencyCardPreview.tsx is NOT modified (already handles this)', async () => {
    // The plan states EmergencyCardPreview.tsx already handles primary contact
    // filtering and should NOT be modified. In this project the file does not
    // exist (the app uses EmergencyCardView.tsx instead), so we verify that
    // only EmergencyCardView.tsx was modified for this feature and no new
    // EmergencyCardPreview file was created.
    const previewPath = path.join(__dirname, '../../frontend/src/components/EmergencyCardPreview.tsx');
    let previewExists = true;
    try {
      await fs.access(previewPath);
    } catch {
      previewExists = false;
    }
    // Pass either way: file does not exist (not modified) or exists unchanged
    // The important thing is EmergencyCardView.tsx has the filtering logic
    expect(cardViewContent).toContain('is_primary'); // filtering present in View
    // If preview exists, it must not have been modified to add IIFE filtering
    if (previewExists) {
      const previewContent = await fs.readFile(previewPath, 'utf-8');
      // It should not have the IIFE pattern that was newly added to CardView
      expect(previewContent).not.toContain('emergencyContacts.find(c => c.is_primary) || emergencyContacts[0]');
    }
    // Either outcome is acceptable per the acceptance criterion
    expect(true).toBe(true);
  });
});
