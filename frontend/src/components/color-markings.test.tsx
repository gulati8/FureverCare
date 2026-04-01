/**
 * Tests for "Add Color/Markings Field to Pet Creation and Profile" feature.
 *
 * Acceptance criteria mapped:
 *   task-3:  Pet interface, CreatePetInput, EmergencyCard.pet in frontend/src/api/client.ts
 *   task-4:  AddPetModal formData init, label, input, placeholder, not required
 *   task-5:  EditPetModal formData init from pet.color_markings, label, input, null -> ''
 *   task-6:  OverviewTab OverviewField type, handleSaveField case, fieldConfigs, renderEditableField call
 *   task-7:  OverviewSection subtitle conditional, EmergencyCardView conditional display
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SRC = resolve(__dirname, '..');

function readSrc(relativePath: string): string {
  return readFileSync(resolve(SRC, relativePath), 'utf-8');
}

// ---------------------------------------------------------------------------
// task-3 — Frontend types in api/client.ts
// ---------------------------------------------------------------------------

describe('task-3: Pet interface in frontend/src/api/client.ts', () => {
  const clientSrc = readSrc('api/client.ts');

  it('Pet interface has color_markings: string | null', () => {
    // Extract the Pet interface block
    const petInterfaceMatch = clientSrc.match(/export interface Pet \{([\s\S]*?)\}/);
    expect(petInterfaceMatch).toBeTruthy();
    expect(petInterfaceMatch![1]).toMatch(/color_markings:\s*string\s*\|\s*null/);
  });
});

describe('task-3: CreatePetInput interface in frontend/src/api/client.ts', () => {
  const clientSrc = readSrc('api/client.ts');

  it('CreatePetInput interface has color_markings?: string', () => {
    const createInputMatch = clientSrc.match(/export interface CreatePetInput \{([\s\S]*?)\}/);
    expect(createInputMatch).toBeTruthy();
    expect(createInputMatch![1]).toMatch(/color_markings\?:\s*string/);
  });
});

describe('task-3: EmergencyCard.pet type in frontend/src/api/client.ts', () => {
  const clientSrc = readSrc('api/client.ts');

  it('EmergencyCard.pet has color_markings: string | null', () => {
    const emergencyCardMatch = clientSrc.match(/export interface EmergencyCard \{([\s\S]*?)\}/);
    expect(emergencyCardMatch).toBeTruthy();
    const body = emergencyCardMatch![1];
    // color_markings must appear inside the pet sub-object within EmergencyCard
    expect(body).toContain('color_markings');
    expect(body).toMatch(/color_markings:\s*string\s*\|\s*null/);
  });
});

// ---------------------------------------------------------------------------
// task-4 — AddPetModal
// ---------------------------------------------------------------------------

describe('task-4: AddPetModal formData initial state', () => {
  const src = readSrc('components/AddPetModal.tsx');

  it("formData initial state includes color_markings: ''", () => {
    expect(src).toMatch(/color_markings:\s*''/);
  });
});

describe('task-4: AddPetModal form field', () => {
  const src = readSrc('components/AddPetModal.tsx');

  it("has label 'Color or Markings'", () => {
    expect(src).toContain('Color or Markings');
  });

  it('has a text input bound to formData.color_markings', () => {
    expect(src).toMatch(/value=\{formData\.color_markings\}/);
  });

  it("has onChange handler updating color_markings", () => {
    expect(src).toMatch(/color_markings:\s*e\.target\.value/);
  });

  it("has placeholder 'e.g., blue merle, pink nose'", () => {
    expect(src).toContain('e.g., blue merle, pink nose');
  });

  it('color_markings input does NOT have required attribute', () => {
    // Extract the Color or Markings input block
    const labelIdx = src.indexOf('Color or Markings');
    expect(labelIdx).toBeGreaterThan(-1);
    // Look at the surrounding ~300 chars for the input element
    const inputRegion = src.slice(labelIdx, labelIdx + 400);
    // The input in this region should not have a required attribute
    const inputMatch = inputRegion.match(/<input[\s\S]*?\/>/);
    if (inputMatch) {
      expect(inputMatch[0]).not.toContain('required');
    }
    // Also verify 'required' doesn't appear directly after the label text within the field block
    expect(inputRegion).not.toMatch(/type="text"[^>]*required/);
  });
});

describe('task-4: AddPetModal field position', () => {
  const src = readSrc('components/AddPetModal.tsx');

  it('Color or Markings appears after Breed in the form', () => {
    const breedIdx = src.indexOf('>Breed<');
    const colorIdx = src.indexOf('Color or Markings');
    expect(breedIdx).toBeGreaterThan(-1);
    expect(colorIdx).toBeGreaterThan(-1);
    expect(colorIdx).toBeGreaterThan(breedIdx);
  });

  it('Date of Birth appears after Color or Markings', () => {
    const colorIdx = src.indexOf('Color or Markings');
    const dobIdx = src.indexOf('Date of Birth');
    expect(colorIdx).toBeGreaterThan(-1);
    expect(dobIdx).toBeGreaterThan(-1);
    expect(dobIdx).toBeGreaterThan(colorIdx);
  });
});

// ---------------------------------------------------------------------------
// task-5 — EditPetModal
// ---------------------------------------------------------------------------

describe('task-5: EditPetModal formData initial state', () => {
  const src = readSrc('components/EditPetModal.tsx');

  it('formData includes color_markings initialised from pet.color_markings', () => {
    expect(src).toMatch(/color_markings:\s*pet\.color_markings/);
  });

  it('null guard: uses || to coerce null to empty string', () => {
    // Must use pet.color_markings || '' pattern (not raw pet.color_markings without guard)
    expect(src).toMatch(/color_markings:\s*pet\.color_markings\s*\|\|\s*''/);
  });
});

describe('task-5: EditPetModal form field', () => {
  const src = readSrc('components/EditPetModal.tsx');

  it("has label 'Color or Markings'", () => {
    expect(src).toContain('Color or Markings');
  });

  it('has a text input bound to formData.color_markings', () => {
    expect(src).toMatch(/value=\{formData\.color_markings\}/);
  });

  it('has onChange handler updating color_markings', () => {
    expect(src).toMatch(/color_markings:\s*e\.target\.value/);
  });
});

describe('task-5: EditPetModal field position', () => {
  const src = readSrc('components/EditPetModal.tsx');

  it('Color or Markings appears after Breed', () => {
    const breedLabelIdx = src.indexOf('>Breed<');
    const colorIdx = src.indexOf('Color or Markings');
    expect(breedLabelIdx).toBeGreaterThan(-1);
    expect(colorIdx).toBeGreaterThan(-1);
    expect(colorIdx).toBeGreaterThan(breedLabelIdx);
  });

  it('Date of Birth appears after Color or Markings', () => {
    const colorIdx = src.indexOf('Color or Markings');
    const dobIdx = src.indexOf('Date of Birth');
    expect(colorIdx).toBeGreaterThan(-1);
    expect(dobIdx).toBeGreaterThan(-1);
    expect(dobIdx).toBeGreaterThan(colorIdx);
  });
});

// ---------------------------------------------------------------------------
// task-6 — OverviewTab
// ---------------------------------------------------------------------------

describe('task-6: OverviewTab OverviewField type', () => {
  const src = readSrc('pages/pet-profile/tabs/OverviewTab.tsx');

  it("OverviewField union type includes 'color_markings'", () => {
    const typeMatch = src.match(/type OverviewField\s*=\s*([^;]+)/);
    expect(typeMatch).toBeTruthy();
    expect(typeMatch![1]).toContain("'color_markings'");
  });
});

describe('task-6: OverviewTab handleSaveField switch case', () => {
  const src = readSrc('pages/pet-profile/tabs/OverviewTab.tsx');

  it("handleSaveField switch has a 'color_markings' case", () => {
    expect(src).toMatch(/case 'color_markings'/);
  });

  it("color_markings case sets payload.color_markings with || null coercion", () => {
    // Find the color_markings case block
    const caseIdx = src.indexOf("case 'color_markings'");
    expect(caseIdx).toBeGreaterThan(-1);
    const caseRegion = src.slice(caseIdx, caseIdx + 200);
    expect(caseRegion).toMatch(/payload\.color_markings/);
    expect(caseRegion).toMatch(/\|\|\s*null/);
  });
});

describe('task-6: OverviewTab fieldConfigs', () => {
  const src = readSrc('pages/pet-profile/tabs/OverviewTab.tsx');

  it('fieldConfigs has a color_markings entry', () => {
    expect(src).toMatch(/color_markings:\s*\{/);
  });

  it("color_markings fieldConfig has placeholder 'Color or markings'", () => {
    expect(src).toContain('Color or markings');
  });

  it("color_markings fieldConfig values uses pet.color_markings || ''", () => {
    expect(src).toMatch(/color_markings:\s*pet\.color_markings\s*\|\|\s*''/);
  });
});

describe('task-6: OverviewTab renderEditableField call', () => {
  const src = readSrc('pages/pet-profile/tabs/OverviewTab.tsx');

  it("renderEditableField is called with 'color_markings'", () => {
    expect(src).toMatch(/renderEditableField\s*\(\s*'color_markings'/);
  });

  it("renderEditableField for color_markings uses !!pet.color_markings as show condition", () => {
    const callMatch = src.match(/renderEditableField\s*\(\s*'color_markings'[\s\S]*?\)/);
    expect(callMatch).toBeTruthy();
    expect(callMatch![0]).toMatch(/!!pet\.color_markings/);
  });

  it("Color / Markings label passed to renderEditableField", () => {
    expect(src).toContain('Color / Markings');
  });

  it('color_markings renderEditableField appears after Breed renderEditableField', () => {
    const breedCallIdx = src.indexOf("renderEditableField('breed'");
    const colorCallIdx = src.indexOf("renderEditableField('color_markings'");
    expect(breedCallIdx).toBeGreaterThan(-1);
    expect(colorCallIdx).toBeGreaterThan(-1);
    expect(colorCallIdx).toBeGreaterThan(breedCallIdx);
  });

  it('when pet.color_markings is null/empty, field is hidden (show=false)', () => {
    // The renderEditableField function returns null when show=false and not editing.
    // We verify the hide-when-empty pattern is used: !!pet.color_markings
    expect(src).toMatch(/renderEditableField\s*\(\s*'color_markings'[\s\S]*?!!pet\.color_markings/);
  });
});

// ---------------------------------------------------------------------------
// task-7 — OverviewSection
// ---------------------------------------------------------------------------

describe('task-7: OverviewSection subtitle conditional color_markings', () => {
  const src = readSrc('pages/pet-profile/sections/OverviewSection.tsx');

  it('OverviewSection references pet.color_markings', () => {
    expect(src).toContain('pet.color_markings');
  });

  it('pet.color_markings is shown conditionally (truthy check)', () => {
    // Must be inside a conditional expression, not always rendered
    expect(src).toMatch(/pet\.color_markings\s*&&/);
  });

  it('color_markings is separated by a bullet character in the subtitle', () => {
    // The bullet is either the unicode \u2022 or literal bullet before color_markings
    // Look for bullet + color_markings pattern in the same expression
    const colorRegion = (() => {
      const idx = src.indexOf('pet.color_markings');
      return src.slice(Math.max(0, idx - 100), idx + 200);
    })();
    // Should contain a bullet separator (u2022 or &bull; or \u00b7 or ' • ')
    expect(colorRegion).toMatch(/\\u2022|&bull;|\u2022|\u00b7|\s•\s/);
  });
});

// ---------------------------------------------------------------------------
// task-7 — EmergencyCardView
// ---------------------------------------------------------------------------

describe('task-7: EmergencyCardView conditional color_markings display', () => {
  const src = readSrc('components/EmergencyCardView.tsx');

  it('EmergencyCardView references pet.color_markings', () => {
    expect(src).toContain('pet.color_markings');
  });

  it('pet.color_markings is shown conditionally', () => {
    expect(src).toMatch(/pet\.color_markings\s*&&/);
  });

  it('color_markings is displayed in its own element (not just appended inline)', () => {
    // When color_markings is shown, it should be inside a JSX element
    const colorIdx = src.indexOf('pet.color_markings');
    expect(colorIdx).toBeGreaterThan(-1);
    // The surrounding region should include JSX tag wrapping the value
    const region = src.slice(Math.max(0, colorIdx - 200), colorIdx + 200);
    expect(region).toMatch(/<p|<span/);
  });

  it('color_markings display does not appear when value is null (conditional guard)', () => {
    // Must not unconditionally render pet.color_markings without a truthy check
    // The expression must have && before any rendering of pet.color_markings value
    const instances = [...src.matchAll(/pet\.color_markings/g)];
    expect(instances.length).toBeGreaterThan(0);

    // At least one instance must be inside a conditional rendering pattern
    let foundConditional = false;
    for (const m of instances) {
      const start = Math.max(0, m.index! - 50);
      const surrounding = src.slice(start, m.index! + 50);
      if (surrounding.includes('&&') || surrounding.includes('?') || surrounding.includes('color_markings &&')) {
        foundConditional = true;
        break;
      }
    }
    expect(foundConditional).toBe(true);
  });
});
