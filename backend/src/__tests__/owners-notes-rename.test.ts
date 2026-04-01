/**
 * Unit tests: "Rename Special Instructions to Owner's Notes"
 *
 * Each test maps to a specific acceptance criterion from plan.json.
 * No database connection required — tests verify code structure,
 * constants, field mappings, and Zod schemas directly.
 *
 * Tasks covered: task-001, task-002, task-008
 * (task-003 through task-007 are frontend — verified via static source analysis below)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';

// ---------------------------------------------------------------------------
// task-001: Backend pet model
// ---------------------------------------------------------------------------

describe('task-001: Pet model field aliasing and mapping', () => {

  test('PET_COLUMNS contains "special_instructions AS owners_notes" alias', async () => {
    // We can't import the constant directly (it's not exported), so we verify
    // via the source file content. Read at runtime to keep this a unit test.
    const fs = await import('node:fs');
    const path = await import('node:path');
    const src = fs.readFileSync(
      path.resolve('/Users/amitgulati/Projects/JPD/FureverCare/backend/src/models/pet.ts'),
      'utf8'
    );
    assert.ok(
      src.includes('special_instructions AS owners_notes'),
      'PET_COLUMNS must alias special_instructions AS owners_notes'
    );
  });

  test('Pet interface has owners_notes field (string | null), not special_instructions', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(
      '/Users/amitgulati/Projects/JPD/FureverCare/backend/src/models/pet.ts',
      'utf8'
    );
    assert.ok(
      src.includes('owners_notes: string | null'),
      'Pet interface must declare owners_notes: string | null'
    );
    // Ensure the old field name is not in the interface
    // The word "special_instructions" should only appear in SQL strings, not in the TS interface
    const interfaceMatch = src.match(/export interface Pet \{[^}]+\}/s);
    assert.ok(interfaceMatch, 'Pet interface should be found');
    assert.ok(
      !interfaceMatch![0].includes('special_instructions'),
      'Pet interface must NOT contain special_instructions field'
    );
  });

  test('CreatePetInput interface has owners_notes field, not special_instructions', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(
      '/Users/amitgulati/Projects/JPD/FureverCare/backend/src/models/pet.ts',
      'utf8'
    );
    const interfaceMatch = src.match(/export interface CreatePetInput \{[^}]+\}/s);
    assert.ok(interfaceMatch, 'CreatePetInput interface should be found');
    assert.ok(
      interfaceMatch![0].includes('owners_notes'),
      'CreatePetInput must contain owners_notes field'
    );
    assert.ok(
      !interfaceMatch![0].includes('special_instructions'),
      'CreatePetInput must NOT contain special_instructions field'
    );
  });

  test('createPet SQL INSERT maps owners_notes input to special_instructions column', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(
      '/Users/amitgulati/Projects/JPD/FureverCare/backend/src/models/pet.ts',
      'utf8'
    );
    // The INSERT statement should still reference the DB column name
    assert.ok(
      src.includes('special_instructions)') || src.includes('special_instructions,'),
      'createPet INSERT must reference special_instructions DB column'
    );
    // And the value parameter should come from input.owners_notes
    assert.ok(
      src.includes('input.owners_notes'),
      'createPet must use input.owners_notes as the value for special_instructions'
    );
  });

  test('updatePet fieldMapping maps owners_notes to special_instructions', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(
      '/Users/amitgulati/Projects/JPD/FureverCare/backend/src/models/pet.ts',
      'utf8'
    );
    assert.ok(
      src.includes("owners_notes: 'special_instructions'"),
      'updatePet fieldMapping must map owners_notes -> special_instructions'
    );
  });

  test('updatePet allowedFields includes owners_notes and NOT special_instructions', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(
      '/Users/amitgulati/Projects/JPD/FureverCare/backend/src/models/pet.ts',
      'utf8'
    );
    // Find the allowedFields array
    const match = src.match(/const allowedFields\s*=\s*\[([^\]]+)\]/);
    assert.ok(match, 'allowedFields array must be present in updatePet');
    const arrayContent = match![1];
    assert.ok(
      arrayContent.includes("'owners_notes'"),
      "allowedFields must include 'owners_notes'"
    );
    assert.ok(
      !arrayContent.includes("'special_instructions'"),
      "allowedFields must NOT include 'special_instructions'"
    );
  });

});

// ---------------------------------------------------------------------------
// task-001 (routes): Zod schema validation
// ---------------------------------------------------------------------------

describe('task-001: createPetSchema Zod validation', () => {

  test('createPetSchema accepts owners_notes field', async () => {
    // We can't import the schema directly (not exported), so verify via source
    const fs = await import('node:fs');
    const src = fs.readFileSync(
      '/Users/amitgulati/Projects/JPD/FureverCare/backend/src/routes/pets.ts',
      'utf8'
    );
    // The schema definition block should contain owners_notes
    const schemaMatch = src.match(/const createPetSchema\s*=\s*z\.object\(\{([^}]+)\}/s);
    assert.ok(schemaMatch, 'createPetSchema must be found in pets.ts');
    assert.ok(
      schemaMatch![1].includes('owners_notes'),
      'createPetSchema must include owners_notes field'
    );
  });

  test('createPetSchema does NOT accept special_instructions field', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(
      '/Users/amitgulati/Projects/JPD/FureverCare/backend/src/routes/pets.ts',
      'utf8'
    );
    const schemaMatch = src.match(/const createPetSchema\s*=\s*z\.object\(\{([^}]+)\}/s);
    assert.ok(schemaMatch, 'createPetSchema must be found in pets.ts');
    assert.ok(
      !schemaMatch![1].includes('special_instructions'),
      'createPetSchema must NOT include special_instructions field'
    );
  });

});

// ---------------------------------------------------------------------------
// task-002: Public route — buildEmergencyCard
// ---------------------------------------------------------------------------

describe('task-002: buildEmergencyCard uses owners_notes', () => {

  test('buildEmergencyCard response object uses owners_notes key', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(
      '/Users/amitgulati/Projects/JPD/FureverCare/backend/src/routes/public.ts',
      'utf8'
    );
    // The pet object in the response should key as owners_notes
    assert.ok(
      src.includes('owners_notes: pet.owners_notes'),
      'buildEmergencyCard must return owners_notes: pet.owners_notes'
    );
  });

  test('buildEmergencyCard does NOT expose special_instructions key in response', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(
      '/Users/amitgulati/Projects/JPD/FureverCare/backend/src/routes/public.ts',
      'utf8'
    );
    // special_instructions should not appear as a response key (only acceptable in SQL if present)
    assert.ok(
      !src.includes('special_instructions:'),
      'buildEmergencyCard must NOT expose special_instructions as a response key'
    );
  });

  test('public.ts does not reference pet.special_instructions', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(
      '/Users/amitgulati/Projects/JPD/FureverCare/backend/src/routes/public.ts',
      'utf8'
    );
    assert.ok(
      !src.includes('pet.special_instructions'),
      'public.ts must not reference pet.special_instructions — it should use pet.owners_notes'
    );
  });

});

// ---------------------------------------------------------------------------
// task-008: Seed data
// ---------------------------------------------------------------------------

describe('task-008: Seed data uses owners_notes', () => {

  test('SeedPet interface uses owners_notes field', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(
      '/Users/amitgulati/Projects/JPD/FureverCare/backend/src/db/seed.ts',
      'utf8'
    );
    const interfaceMatch = src.match(/interface SeedPet \{[^}]+\}/s);
    assert.ok(interfaceMatch, 'SeedPet interface must be present');
    assert.ok(
      interfaceMatch![0].includes('owners_notes'),
      'SeedPet interface must have owners_notes field'
    );
    assert.ok(
      !interfaceMatch![0].includes('special_instructions'),
      'SeedPet interface must NOT have special_instructions field'
    );
  });

  test('All pet seed objects use owners_notes key', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(
      '/Users/amitgulati/Projects/JPD/FureverCare/backend/src/db/seed.ts',
      'utf8'
    );
    // No pet object literal should use special_instructions as a key
    // Heuristic: no "special_instructions:" assignment in object literals (only SQL string is OK)
    // The SQL INSERT still has it as a column — but the TS object keys should be owners_notes
    const objectKeyPattern = /^\s+special_instructions:\s/m;
    assert.ok(
      !objectKeyPattern.test(src),
      'Pet seed objects must use owners_notes key, not special_instructions'
    );
  });

  test('Seed INSERT SQL still references special_instructions column', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(
      '/Users/amitgulati/Projects/JPD/FureverCare/backend/src/db/seed.ts',
      'utf8'
    );
    // The SQL INSERT should still use the DB column name
    assert.ok(
      src.includes('special_instructions'),
      'Seed INSERT SQL must still reference the special_instructions DB column'
    );
  });

  test('Seed INSERT value references pet.owners_notes', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(
      '/Users/amitgulati/Projects/JPD/FureverCare/backend/src/db/seed.ts',
      'utf8'
    );
    assert.ok(
      src.includes('pet.owners_notes'),
      'Seed INSERT value must reference pet.owners_notes, not pet.special_instructions'
    );
  });

  test('Seed does not reference pet.special_instructions', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(
      '/Users/amitgulati/Projects/JPD/FureverCare/backend/src/db/seed.ts',
      'utf8'
    );
    assert.ok(
      !src.includes('pet.special_instructions'),
      'Seed must not reference pet.special_instructions — value should come from pet.owners_notes'
    );
  });

});

// ---------------------------------------------------------------------------
// Frontend source verification (task-003, task-004, task-005, task-006, task-007)
// These are TypeScript source analysis tests — no runtime execution needed.
// ---------------------------------------------------------------------------

describe('task-003: Frontend API client types use owners_notes', () => {

  test('Pet interface in client.ts has owners_notes: string | null', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(
      '/Users/amitgulati/Projects/JPD/FureverCare/frontend/src/api/client.ts',
      'utf8'
    );
    const interfaceMatch = src.match(/export interface Pet \{[^}]+\}/s);
    assert.ok(interfaceMatch, 'Pet interface must exist in client.ts');
    assert.ok(
      interfaceMatch![0].includes('owners_notes: string | null'),
      'Pet interface must have owners_notes: string | null'
    );
    assert.ok(
      !interfaceMatch![0].includes('special_instructions'),
      'Pet interface must NOT have special_instructions'
    );
  });

  test('CreatePetInput interface in client.ts has owners_notes?: string', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(
      '/Users/amitgulati/Projects/JPD/FureverCare/frontend/src/api/client.ts',
      'utf8'
    );
    const interfaceMatch = src.match(/export interface CreatePetInput \{[^}]+\}/s);
    assert.ok(interfaceMatch, 'CreatePetInput interface must exist in client.ts');
    assert.ok(
      interfaceMatch![0].includes('owners_notes'),
      'CreatePetInput must have owners_notes field'
    );
    assert.ok(
      !interfaceMatch![0].includes('special_instructions'),
      'CreatePetInput must NOT have special_instructions'
    );
  });

  test('EmergencyCard.pet type in client.ts has owners_notes: string | null', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(
      '/Users/amitgulati/Projects/JPD/FureverCare/frontend/src/api/client.ts',
      'utf8'
    );
    const cardMatch = src.match(/export interface EmergencyCard \{[\s\S]+?^\}/m);
    assert.ok(cardMatch, 'EmergencyCard interface must exist in client.ts');
    assert.ok(
      cardMatch![0].includes('owners_notes: string | null'),
      'EmergencyCard.pet must have owners_notes: string | null'
    );
    assert.ok(
      !cardMatch![0].includes('special_instructions'),
      'EmergencyCard must NOT have special_instructions'
    );
  });

});

describe('task-004: OverviewTab has no special_instructions', () => {

  test('OverviewField type does not include special_instructions', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(
      '/Users/amitgulati/Projects/JPD/FureverCare/frontend/src/pages/pet-profile/tabs/OverviewTab.tsx',
      'utf8'
    );
    const typeMatch = src.match(/type OverviewField\s*=\s*[^;]+;/s);
    assert.ok(typeMatch, 'OverviewField type must exist');
    assert.ok(
      !typeMatch![0].includes('special_instructions'),
      'OverviewField type must NOT include special_instructions'
    );
  });

  test('OverviewTab.tsx has no references to special_instructions at all', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(
      '/Users/amitgulati/Projects/JPD/FureverCare/frontend/src/pages/pet-profile/tabs/OverviewTab.tsx',
      'utf8'
    );
    assert.ok(
      !src.includes('special_instructions'),
      'OverviewTab.tsx must have zero references to special_instructions'
    );
  });

  test('OverviewTab.tsx has no references to owners_notes (field removed from overview)', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(
      '/Users/amitgulati/Projects/JPD/FureverCare/frontend/src/pages/pet-profile/tabs/OverviewTab.tsx',
      'utf8'
    );
    // The field was removed from the overview entirely
    assert.ok(
      !src.includes('owners_notes'),
      "OverviewTab.tsx must not display owners_notes — it was moved to HealthRecordsSection"
    );
  });

  test("OverviewTab.tsx does not display 'Owner's Notes' or 'Special Instructions' section", async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(
      '/Users/amitgulati/Projects/JPD/FureverCare/frontend/src/pages/pet-profile/tabs/OverviewTab.tsx',
      'utf8'
    );
    assert.ok(
      !src.includes("Owner's Notes") && !src.includes('Special Instructions'),
      "OverviewTab must not render an Owner's Notes or Special Instructions section"
    );
  });

});

describe('task-005: HealthRecordsSection has Owner\'s Notes accordion', () => {

  test("HealthRecordsSection contains Owner's Notes accordion title", async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(
      '/Users/amitgulati/Projects/JPD/FureverCare/frontend/src/pages/pet-profile/sections/HealthRecordsSection.tsx',
      'utf8'
    );
    assert.ok(
      src.includes("Owner's Notes"),
      "HealthRecordsSection must contain an Owner's Notes accordion title"
    );
  });

  test('HealthRecordsSection uses health-accordion CSS class for the notes section', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(
      '/Users/amitgulati/Projects/JPD/FureverCare/frontend/src/pages/pet-profile/sections/HealthRecordsSection.tsx',
      'utf8'
    );
    // Count health-accordion details elements — should be at least 5 (Conditions, Allergies, Medications, Vaccinations, Owner's Notes, Alerts)
    const accordionCount = (src.match(/className="health-accordion"/g) || []).length;
    assert.ok(
      accordionCount >= 5,
      `Expected at least 5 health-accordion elements (found ${accordionCount}), Owner's Notes section may be missing`
    );
  });

  test('HealthRecordsSection uses <details> element for Owner\'s Notes section', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(
      '/Users/amitgulati/Projects/JPD/FureverCare/frontend/src/pages/pet-profile/sections/HealthRecordsSection.tsx',
      'utf8'
    );
    assert.ok(
      src.includes('<details'),
      'HealthRecordsSection must use <details> elements for accordions'
    );
  });

  test('HealthRecordsSection reads pet.owners_notes for notes value', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(
      '/Users/amitgulati/Projects/JPD/FureverCare/frontend/src/pages/pet-profile/sections/HealthRecordsSection.tsx',
      'utf8'
    );
    assert.ok(
      src.includes('pet.owners_notes'),
      'HealthRecordsSection must read pet.owners_notes'
    );
  });

  test('HealthRecordsSection calls petsApi.update with owners_notes to save', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(
      '/Users/amitgulati/Projects/JPD/FureverCare/frontend/src/pages/pet-profile/sections/HealthRecordsSection.tsx',
      'utf8'
    );
    assert.ok(
      src.includes('owners_notes: notesValue'),
      'HealthRecordsSection must call petsApi.update with { owners_notes: notesValue }'
    );
  });

  test('HealthRecordsSection has Edit button for notes', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(
      '/Users/amitgulati/Projects/JPD/FureverCare/frontend/src/pages/pet-profile/sections/HealthRecordsSection.tsx',
      'utf8'
    );
    assert.ok(
      src.includes('setEditingNotes(true)'),
      'HealthRecordsSection must have an Edit button that sets editingNotes to true'
    );
  });

  test('HealthRecordsSection has Cancel button that reverts notes value', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(
      '/Users/amitgulati/Projects/JPD/FureverCare/frontend/src/pages/pet-profile/sections/HealthRecordsSection.tsx',
      'utf8'
    );
    // Cancel should reset notesValue to pet.owners_notes and setEditingNotes(false)
    assert.ok(
      src.includes('setNotesValue(pet.owners_notes || \'\')') || src.includes("setNotesValue(pet.owners_notes || '')"),
      'Cancel button must revert notesValue to pet.owners_notes'
    );
    assert.ok(
      src.includes('setEditingNotes(false)'),
      'Cancel button must call setEditingNotes(false)'
    );
  });

  test('HealthRecordsSection Owner\'s Notes accordion is positioned after Vaccinations and before Card Alerts', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(
      '/Users/amitgulati/Projects/JPD/FureverCare/frontend/src/pages/pet-profile/sections/HealthRecordsSection.tsx',
      'utf8'
    );
    const vaccinationsPos = src.indexOf('Vaccinations');
    const ownersNotesPos = src.indexOf("Owner's Notes");
    const cardAlertsPos = src.indexOf('Card Alerts');
    assert.ok(vaccinationsPos > -1, 'Vaccinations section must exist');
    assert.ok(ownersNotesPos > -1, "Owner's Notes section must exist");
    assert.ok(cardAlertsPos > -1, 'Card Alerts section must exist');
    assert.ok(
      vaccinationsPos < ownersNotesPos,
      "Owner's Notes must appear after Vaccinations"
    );
    assert.ok(
      ownersNotesPos < cardAlertsPos,
      "Owner's Notes must appear before Card Alerts"
    );
  });

});

describe('task-006: EmergencyCardView uses owners_notes', () => {

  test("EmergencyCardView renders Owner's Notes label text", async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(
      '/Users/amitgulati/Projects/JPD/FureverCare/frontend/src/components/EmergencyCardView.tsx',
      'utf8'
    );
    assert.ok(
      src.includes("Owner's Notes"),
      "EmergencyCardView must display \"Owner's Notes\" label"
    );
  });

  test('EmergencyCardView does NOT display "Special Instructions" label', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(
      '/Users/amitgulati/Projects/JPD/FureverCare/frontend/src/components/EmergencyCardView.tsx',
      'utf8'
    );
    assert.ok(
      !src.includes('Special Instructions'),
      'EmergencyCardView must NOT display "Special Instructions" label'
    );
  });

  test('EmergencyCardView renders notes text from pet.owners_notes', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(
      '/Users/amitgulati/Projects/JPD/FureverCare/frontend/src/components/EmergencyCardView.tsx',
      'utf8'
    );
    assert.ok(
      src.includes('pet.owners_notes'),
      'EmergencyCardView must reference pet.owners_notes for the notes text'
    );
  });

  test('EmergencyCardView does NOT reference pet.special_instructions', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(
      '/Users/amitgulati/Projects/JPD/FureverCare/frontend/src/components/EmergencyCardView.tsx',
      'utf8'
    );
    assert.ok(
      !src.includes('pet.special_instructions'),
      'EmergencyCardView must NOT reference pet.special_instructions'
    );
  });

  test('EmergencyCardView yellow callout conditionally renders only when pet.owners_notes is truthy', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(
      '/Users/amitgulati/Projects/JPD/FureverCare/frontend/src/components/EmergencyCardView.tsx',
      'utf8'
    );
    // The conditional rendering check should use pet.owners_notes
    assert.ok(
      src.includes('{pet.owners_notes &&'),
      'EmergencyCardView yellow callout must conditionally render on pet.owners_notes'
    );
  });

});

describe('task-007: EditPetModal uses owners_notes', () => {

  test("EditPetModal form label reads Owner's Notes", async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(
      '/Users/amitgulati/Projects/JPD/FureverCare/frontend/src/components/EditPetModal.tsx',
      'utf8'
    );
    assert.ok(
      src.includes("Owner's Notes"),
      "EditPetModal label must read \"Owner's Notes\""
    );
  });

  test('EditPetModal does NOT display "Special Instructions" label', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(
      '/Users/amitgulati/Projects/JPD/FureverCare/frontend/src/components/EditPetModal.tsx',
      'utf8'
    );
    assert.ok(
      !src.includes('Special Instructions'),
      'EditPetModal must NOT display "Special Instructions" label'
    );
  });

  test('EditPetModal initializes formData with owners_notes from pet', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(
      '/Users/amitgulati/Projects/JPD/FureverCare/frontend/src/components/EditPetModal.tsx',
      'utf8'
    );
    assert.ok(
      src.includes('owners_notes: pet.owners_notes'),
      'EditPetModal formData must initialize owners_notes from pet.owners_notes'
    );
  });

  test('EditPetModal textarea onChange updates formData.owners_notes', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(
      '/Users/amitgulati/Projects/JPD/FureverCare/frontend/src/components/EditPetModal.tsx',
      'utf8'
    );
    assert.ok(
      src.includes('owners_notes: e.target.value'),
      'EditPetModal onChange must set owners_notes: e.target.value'
    );
  });

});
