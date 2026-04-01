/**
 * Tests for "Add Age Field to Pet Profile" feature — Frontend
 *
 * Acceptance criteria mapped:
 *   task-4: calculateAgeFromDOB utility, Pet interface in client.ts, CreatePetInput in client.ts
 *   task-5: AddPetModal — age field present, DOB-driven auto-calculate, manual entry, form submit
 *   task-6: EditPetModal — age field present, initialized from pet.age, DOB-driven disable
 *   task-7: OverviewTab — age in OverviewField type, fieldConfigs, handleSaveField, display logic
 *   task-8: Dashboard — age fallback when no DOB
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const FRONTEND_SRC = resolve(__dirname, '../..');

function readSrc(relativePath: string): string {
  return readFileSync(resolve(FRONTEND_SRC, relativePath), 'utf-8');
}

// ---------------------------------------------------------------------------
// task-4 — calculateAgeFromDOB pure function logic
// ---------------------------------------------------------------------------

import { calculateAgeFromDOB } from './utils';

describe('task-4: calculateAgeFromDOB — correct age calculation', () => {
  it('returns correct age for a birthday several years ago', () => {
    // Pin to a known date: today is 2026-03-31, born 2020-01-15 → age 6
    const dob = '2020-01-15';
    const age = calculateAgeFromDOB(dob);
    expect(age).toBe(6);
  });

  it('returns 0 for a future date (not yet born)', () => {
    const futureDate = '2099-01-01';
    const age = calculateAgeFromDOB(futureDate);
    expect(age).toBe(0);
  });

  it('returns 0 for a date in the past within the same year when birthday not yet reached', () => {
    // Born December 31 of last year → if today is March 31, birthday already passed this year
    // Use December 31 of next year relative to a known past date
    // For clarity: if DOB is 2025-12-31 and today is 2026-03-31, age = 0 (birthday in Dec not yet reached)
    const dob = '2025-12-31';
    const age = calculateAgeFromDOB(dob);
    expect(age).toBe(0);
  });

  it('accounts for month not yet reached this year', () => {
    // Born 2021-06-15, today is 2026-03-31 → birthday in June not reached, so age = 4
    const dob = '2021-06-15';
    const age = calculateAgeFromDOB(dob);
    expect(age).toBe(4);
  });

  it('accounts for birthday not yet reached this year (upcoming month)', () => {
    // Born 2021-12-15 — December is after March, birthday not reached → age = 4
    // (today is 2026-03-31; yearDiff = 5, monthDiff = 2-11 = -9 < 0, so age = 4)
    const dob = '2021-12-15';
    const age = calculateAgeFromDOB(dob);
    expect(age).toBe(4);
  });

  it('returns correct age when birthday is exactly today', () => {
    // Born 2021-03-31, today is 2026-03-31 → exactly 5 years
    const dob = '2021-03-31';
    const age = calculateAgeFromDOB(dob);
    expect(age).toBe(5);
  });

  it('returns a non-negative integer for any valid past date', () => {
    const dob = '2015-07-04';
    const age = calculateAgeFromDOB(dob);
    expect(age).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(age)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// task-4 — Pet and CreatePetInput types in frontend/src/api/client.ts
// ---------------------------------------------------------------------------

describe('task-4: Pet interface in frontend/src/api/client.ts', () => {
  const clientSrc = readSrc('api/client.ts');

  it('Pet interface has age: number | null', () => {
    const petInterfaceMatch = clientSrc.match(/export interface Pet \{([\s\S]*?)\}/);
    expect(petInterfaceMatch).toBeTruthy();
    expect(petInterfaceMatch![1]).toMatch(/age:\s*number\s*\|\s*null/);
  });
});

describe('task-4: CreatePetInput interface in frontend/src/api/client.ts', () => {
  const clientSrc = readSrc('api/client.ts');

  it('CreatePetInput interface has age?: number', () => {
    const createInputMatch = clientSrc.match(/export interface CreatePetInput \{([\s\S]*?)\}/);
    expect(createInputMatch).toBeTruthy();
    expect(createInputMatch![1]).toMatch(/age\?:\s*number/);
  });
});

// ---------------------------------------------------------------------------
// task-5 — AddPetModal
// ---------------------------------------------------------------------------

describe('task-5: AddPetModal age field presence', () => {
  const src = readSrc('components/AddPetModal.tsx');

  it('AddPetModal has an Age input field', () => {
    expect(src).toMatch(/[Aa]ge/);
    // Must have an input element wired to age
    expect(src).toMatch(/formData\.age/);
  });

  it('formData initial state includes age', () => {
    // age: undefined or age: '' or similar initial value
    expect(src).toMatch(/age:\s*(undefined|''|0)/);
  });

  it('Age input is disabled when date_of_birth has a value', () => {
    // The input's disabled/readOnly prop should depend on date_of_birth
    // Look for disabled or readOnly tied to date_of_birth presence
    expect(src).toMatch(/disabled[\s\S]{0,200}date_of_birth|date_of_birth[\s\S]{0,200}disabled/);
  });

  it('age auto-calculates from DOB via calculateAgeFromDOB', () => {
    expect(src).toContain('calculateAgeFromDOB');
  });

  it('age is included in the submitted API request payload', () => {
    // On submit, age should be passed to the API call
    expect(src).toMatch(/age[\s\S]{0,50}formData\.age|formData\.age[\s\S]{0,50}age/);
  });
});

// ---------------------------------------------------------------------------
// task-6 — EditPetModal
// ---------------------------------------------------------------------------

describe('task-6: EditPetModal age field presence', () => {
  const src = readSrc('components/EditPetModal.tsx');

  it('EditPetModal has an Age input field', () => {
    expect(src).toMatch(/formData\.age/);
  });

  it('formData initializes age from pet.age (directly or via conditional)', () => {
    // Implementation uses: age: initialDOB ? calculateAgeFromDOB(initialDOB) : (pet.age ?? undefined)
    // Both direct and conditional patterns are acceptable
    const hasDirectInit = /age:\s*pet\.age/.test(src);
    const hasConditionalInit = /pet\.age/.test(src) && /age:/.test(src);
    expect(hasDirectInit || hasConditionalInit).toBe(true);
  });

  it('Age input is disabled when date_of_birth is present', () => {
    expect(src).toMatch(/disabled[\s\S]{0,200}date_of_birth|date_of_birth[\s\S]{0,200}disabled/);
  });

  it('EditPetModal uses calculateAgeFromDOB for auto-calculation', () => {
    expect(src).toContain('calculateAgeFromDOB');
  });
});

// ---------------------------------------------------------------------------
// task-7 — OverviewTab
// ---------------------------------------------------------------------------

describe('task-7: OverviewTab OverviewField union type', () => {
  const src = readSrc('pages/pet-profile/tabs/OverviewTab.tsx');

  it("OverviewField union type includes 'age'", () => {
    const typeMatch = src.match(/type OverviewField\s*=\s*([^;]+)/);
    expect(typeMatch).toBeTruthy();
    expect(typeMatch![1]).toContain("'age'");
  });
});

describe('task-7: OverviewTab handleSaveField switch case for age', () => {
  const src = readSrc('pages/pet-profile/tabs/OverviewTab.tsx');

  it("handleSaveField switch has a 'age' case", () => {
    expect(src).toMatch(/case 'age'/);
  });

  it("age case sets payload.age", () => {
    const caseIdx = src.indexOf("case 'age'");
    expect(caseIdx).toBeGreaterThan(-1);
    const caseRegion = src.slice(caseIdx, caseIdx + 300);
    expect(caseRegion).toMatch(/payload\.age/);
  });
});

describe('task-7: OverviewTab fieldConfigs has age entry', () => {
  const src = readSrc('pages/pet-profile/tabs/OverviewTab.tsx');

  it('fieldConfigs has an age entry', () => {
    expect(src).toMatch(/age:\s*\{/);
  });
});

describe('task-7: OverviewTab renders age field', () => {
  const src = readSrc('pages/pet-profile/tabs/OverviewTab.tsx');

  it('age is rendered/displayed on OverviewTab (not hidden by default)', () => {
    // The field should always render — verified by age appearing in render/JSX area
    // Either via renderEditableField or direct JSX
    expect(src).toMatch(/renderEditableField\s*\(\s*'age'|'age'[\s\S]{0,50}renderEditableField/);
  });

  it('when DOB exists, age is shown as non-editable (calculated from DOB)', () => {
    // Age editing is disabled when DOB is present — check for DOB-guard logic near age
    expect(src).toMatch(/date_of_birth[\s\S]{0,500}age|age[\s\S]{0,200}date_of_birth/);
  });
});

// ---------------------------------------------------------------------------
// task-8 — Dashboard
// ---------------------------------------------------------------------------

describe('task-8: Dashboard pet cards age display', () => {
  const src = readSrc('pages/Dashboard.tsx');

  it('Dashboard references pet.age as fallback when no DOB', () => {
    expect(src).toMatch(/pet\.age/);
  });

  it('Dashboard shows age fallback in a conditional (only when no DOB but age exists)', () => {
    // Must not unconditionally show pet.age — only as fallback
    const ageIdx = src.indexOf('pet.age');
    expect(ageIdx).toBeGreaterThan(-1);
    // Region around the pet.age reference should contain a conditional or DOB reference
    const region = src.slice(Math.max(0, ageIdx - 200), ageIdx + 200);
    expect(region).toMatch(/date_of_birth|&&|\?/);
  });
});
