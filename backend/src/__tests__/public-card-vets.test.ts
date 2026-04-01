/**
 * Structural tests for primary-vet-only filtering in buildEmergencyCard()
 *
 * These tests verify that the source code of public.ts implements the correct
 * filtering logic for the "Show Only Primary Vet on Emergency Card" feature.
 *
 * Acceptance criteria covered:
 *   Task 1: veterinarians field uses .find(v => v.is_primary) not .map()
 *   Task 1: code returns [] when no primary vet exists (if (!primary) return [])
 *   Task 1: pattern matches the emergency_contacts IIFE approach
 *   Task 2: frontend label reads "Primary Veterinarian" (static string, not conditional)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

// Absolute paths — avoids import.meta.url resolution issues under tsx --test
const PROJECT_ROOT = '/Users/amitgulati/Projects/JPD/FureverCare';
const PUBLIC_TS_PATH = `${PROJECT_ROOT}/backend/src/routes/public.ts`;
const EMERGENCY_CARD_VIEW_PATH = `${PROJECT_ROOT}/frontend/src/components/EmergencyCardView.tsx`;

function readSource(filePath: string): string {
  return readFileSync(filePath, 'utf8');
}

describe('buildEmergencyCard() — veterinarians field', () => {
  test('uses .find(v => v.is_primary) to locate the primary vet', () => {
    const source = readSource(PUBLIC_TS_PATH);
    assert.ok(
      source.includes('vets.find(v => v.is_primary)'),
      'Expected vets.find(v => v.is_primary) in public.ts — old .map() pattern must be replaced'
    );
  });

  test('does NOT use .map() to build the veterinarians array', () => {
    const source = readSource(PUBLIC_TS_PATH);
    // The old code used vets.map(v => ({...})) — that must be gone.
    // We check the veterinarians block specifically. Extract the section
    // between "veterinarians:" and "emergency_contacts:" to scope the check.
    const vetsBlockStart = source.indexOf('veterinarians:');
    const emergencyContactsStart = source.indexOf('emergency_contacts:');
    assert.ok(vetsBlockStart !== -1, 'Expected veterinarians: field in public.ts');
    assert.ok(emergencyContactsStart !== -1, 'Expected emergency_contacts: field in public.ts');

    const vetsBlock = source.slice(vetsBlockStart, emergencyContactsStart);
    assert.ok(
      !vetsBlock.includes('vets.map('),
      'veterinarians block must not use vets.map() — it must use vets.find() instead'
    );
  });

  test('returns [] when no primary vet exists (if (!primary) return [])', () => {
    const source = readSource(PUBLIC_TS_PATH);
    // The guard must be present in the veterinarians IIFE
    assert.ok(
      source.includes('if (!primary) return []'),
      'Expected guard clause "if (!primary) return []" in public.ts for no-primary-vet case'
    );
  });

  test('uses an IIFE pattern (same approach as emergency_contacts)', () => {
    const source = readSource(PUBLIC_TS_PATH);

    // Both fields should follow the (() => { ... })() IIFE pattern
    const vetsBlockStart = source.indexOf('veterinarians:');
    const emergencyContactsStart = source.indexOf('emergency_contacts:');
    assert.ok(vetsBlockStart !== -1, 'Expected veterinarians: field');
    assert.ok(emergencyContactsStart !== -1, 'Expected emergency_contacts: field');

    const vetsBlock = source.slice(vetsBlockStart, emergencyContactsStart);
    assert.ok(
      vetsBlock.includes('(() => {'),
      'veterinarians field must use an IIFE (() => { ... })()'
    );
    assert.ok(
      vetsBlock.includes('})()'),
      'veterinarians IIFE must be closed with })()'
    );
  });

  test('returns exactly 1-element array with correct fields when primary vet found', () => {
    const source = readSource(PUBLIC_TS_PATH);

    // The returned object inside the IIFE must contain the four expected fields
    const vetsBlockStart = source.indexOf('veterinarians:');
    const emergencyContactsStart = source.indexOf('emergency_contacts:');
    const vetsBlock = source.slice(vetsBlockStart, emergencyContactsStart);

    assert.ok(vetsBlock.includes('clinic_name: primary.clinic_name'), 'Must map clinic_name from primary');
    assert.ok(vetsBlock.includes('vet_name: primary.vet_name'), 'Must map vet_name from primary');
    assert.ok(vetsBlock.includes('phone: primary.phone'), 'Must map phone from primary');
    assert.ok(vetsBlock.includes('is_primary: primary.is_primary'), 'Must map is_primary from primary');
  });

  test('wraps the result in a single-element array using return [{ ... }]', () => {
    const source = readSource(PUBLIC_TS_PATH);

    const vetsBlockStart = source.indexOf('veterinarians:');
    const emergencyContactsStart = source.indexOf('emergency_contacts:');
    const vetsBlock = source.slice(vetsBlockStart, emergencyContactsStart);

    assert.ok(
      vetsBlock.includes('return [{'),
      'Must return a single-element array literal [ { ... } ] when primary vet found'
    );
  });
});

describe('buildEmergencyCard() — emergency_contacts pattern consistency', () => {
  test('emergency_contacts also uses an IIFE with .find()', () => {
    const source = readSource(PUBLIC_TS_PATH);

    const emergencyContactsStart = source.indexOf('emergency_contacts:');
    const customAlertsStart = source.indexOf('custom_alerts:');
    assert.ok(emergencyContactsStart !== -1, 'Expected emergency_contacts: field');
    assert.ok(customAlertsStart !== -1, 'Expected custom_alerts: field');

    const ecBlock = source.slice(emergencyContactsStart, customAlertsStart);
    assert.ok(
      ecBlock.includes('(() => {'),
      'emergency_contacts must use an IIFE (() => { ... })()'
    );
    assert.ok(
      ecBlock.includes('.find('),
      'emergency_contacts must use .find() to locate the primary contact'
    );
  });

  test('both veterinarians and emergency_contacts use the IIFE + .find() pattern', () => {
    const source = readSource(PUBLIC_TS_PATH);

    // Count IIFE occurrences — both fields must have one
    const vetsBlockStart = source.indexOf('veterinarians:');
    const customAlertsStart = source.indexOf('custom_alerts:');
    const bothFieldsBlock = source.slice(vetsBlockStart, customAlertsStart);

    const iifeMatches = (bothFieldsBlock.match(/\(\(\) => \{/g) || []).length;
    assert.ok(
      iifeMatches >= 2,
      `Expected at least 2 IIFE patterns (one for veterinarians, one for emergency_contacts), found ${iifeMatches}`
    );

    const findMatches = (bothFieldsBlock.match(/\.find\(/g) || []).length;
    assert.ok(
      findMatches >= 2,
      `Expected at least 2 .find() calls (one per field), found ${findMatches}`
    );
  });
});

describe('EmergencyCardView.tsx — frontend label', () => {
  test('renders "Primary Veterinarian" as a static label (no conditional suffix)', () => {
    const source = readSource(EMERGENCY_CARD_VIEW_PATH);
    assert.ok(
      source.includes('Primary Veterinarian'),
      'Expected static label "Primary Veterinarian" in EmergencyCardView.tsx'
    );
  });

  test('does NOT use the old conditional label pattern (is_primary ? " (Primary)" : "")', () => {
    const source = readSource(EMERGENCY_CARD_VIEW_PATH);
    assert.ok(
      !source.includes("v.is_primary ? ' (Primary)' : ''"),
      'Old conditional label pattern must be removed from EmergencyCardView.tsx'
    );
  });
});
