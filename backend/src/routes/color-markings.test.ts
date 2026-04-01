/**
 * Tests for "Add Color/Markings Field to Pet Creation and Profile" feature.
 *
 * Acceptance criteria mapped:
 *   task-1:  Migration file exists, correct SQL, IF NOT EXISTS guard, package.json scripts
 *   task-2:  Pet interface, CreatePetInput interface, createPet INSERT, updatePet allowedFields,
 *            createPetSchema Zod, buildEmergencyCard color_markings
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const BACKEND_SRC = resolve(__dirname, '..');

function readSrc(relativePath: string): string {
  return readFileSync(resolve(BACKEND_SRC, relativePath), 'utf-8');
}

function readRoot(relativePath: string): string {
  return readFileSync(resolve(BACKEND_SRC, '..', relativePath), 'utf-8');
}

// ---------------------------------------------------------------------------
// task-1 — Database migration
// ---------------------------------------------------------------------------

describe('task-1: Database migration file (migrate-color-markings.ts)', () => {
  const migrationSrc = readSrc('db/migrate-color-markings.ts');

  it('migration file exists at backend/src/db/migrate-color-markings.ts', () => {
    expect(migrationSrc.length).toBeGreaterThan(0);
  });

  it('migration SQL includes ALTER TABLE pets ADD COLUMN color_markings TEXT', () => {
    expect(migrationSrc).toMatch(/ALTER TABLE pets ADD COLUMN color_markings TEXT/);
  });

  it('migration column has no NOT NULL constraint', () => {
    // The ADD COLUMN line must not contain NOT NULL
    const addColumnLine = migrationSrc
      .split('\n')
      .find((l) => l.includes('ADD COLUMN color_markings'));
    expect(addColumnLine).toBeDefined();
    expect(addColumnLine).not.toContain('NOT NULL');
  });

  it('migration column has no DEFAULT clause', () => {
    const addColumnLine = migrationSrc
      .split('\n')
      .find((l) => l.includes('ADD COLUMN color_markings'));
    expect(addColumnLine).toBeDefined();
    expect(addColumnLine).not.toMatch(/DEFAULT/i);
  });

  it('migration is wrapped in a DO $$ block', () => {
    expect(migrationSrc).toMatch(/DO \$\$/);
  });

  it('migration uses IF NOT EXISTS guard on information_schema.columns', () => {
    expect(migrationSrc).toMatch(/IF NOT EXISTS/);
    expect(migrationSrc).toMatch(/information_schema\.columns/);
  });

  it('IF NOT EXISTS guard checks table_name = pets', () => {
    expect(migrationSrc).toMatch(/table_name\s*=\s*'pets'/);
  });

  it('IF NOT EXISTS guard checks column_name = color_markings', () => {
    expect(migrationSrc).toMatch(/column_name\s*=\s*'color_markings'/);
  });
});

describe('task-1: package.json migration scripts', () => {
  const pkg = readRoot('package.json');

  it('package.json has db:migrate:color-markings script (node dist)', () => {
    expect(pkg).toContain('"db:migrate:color-markings"');
    expect(pkg).toMatch(/"db:migrate:color-markings":\s*"node dist\/db\/migrate-color-markings\.js"/);
  });

  it('package.json has db:migrate:color-markings:dev script (tsx src)', () => {
    expect(pkg).toContain('"db:migrate:color-markings:dev"');
    expect(pkg).toMatch(/"db:migrate:color-markings:dev":\s*"tsx src\/db\/migrate-color-markings\.ts"/);
  });
});

// ---------------------------------------------------------------------------
// task-2 — Backend model and route
// ---------------------------------------------------------------------------

describe('task-2: Pet interface in backend/src/models/pet.ts', () => {
  const modelSrc = readSrc('models/pet.ts');

  it('Pet interface contains color_markings: string | null', () => {
    expect(modelSrc).toMatch(/color_markings:\s*string\s*\|\s*null/);
  });

  it('color_markings appears inside the Pet interface block (before CreatePetInput)', () => {
    const petInterfaceMatch = modelSrc.match(/export interface Pet \{([\s\S]*?)\}/);
    expect(petInterfaceMatch).toBeTruthy();
    expect(petInterfaceMatch![1]).toContain('color_markings');
  });
});

describe('task-2: CreatePetInput interface in backend/src/models/pet.ts', () => {
  const modelSrc = readSrc('models/pet.ts');

  it('CreatePetInput interface contains color_markings?: string', () => {
    expect(modelSrc).toMatch(/color_markings\?:\s*string/);
  });

  it('color_markings optional field appears inside CreatePetInput block', () => {
    const createInputMatch = modelSrc.match(/export interface CreatePetInput \{([\s\S]*?)\}/);
    expect(createInputMatch).toBeTruthy();
    expect(createInputMatch![1]).toContain('color_markings');
  });
});

describe('task-2: createPet INSERT query in backend/src/models/pet.ts', () => {
  const modelSrc = readSrc('models/pet.ts');

  it('INSERT column list includes color_markings', () => {
    const insertMatch = modelSrc.match(/INSERT INTO pets \(([\s\S]*?)\)/);
    expect(insertMatch).toBeTruthy();
    expect(insertMatch![1]).toContain('color_markings');
  });

  it('INSERT has 14 parameters ($14)', () => {
    // The VALUES clause should go up to $14
    expect(modelSrc).toMatch(/\$14/);
  });

  it('color_markings is passed as input.color_markings || null', () => {
    expect(modelSrc).toMatch(/input\.color_markings\s*\|\|\s*null/);
  });
});

describe('task-2: updatePet allowedFields in backend/src/models/pet.ts', () => {
  const modelSrc = readSrc('models/pet.ts');

  it("allowedFields array includes 'color_markings'", () => {
    const allowedMatch = modelSrc.match(/allowedFields\s*=\s*\[([^\]]+)\]/);
    expect(allowedMatch).toBeTruthy();
    expect(allowedMatch![1]).toContain("'color_markings'");
  });
});

describe('task-2: createPetSchema Zod in backend/src/routes/pets.ts', () => {
  const routesSrc = readSrc('routes/pets.ts');

  it('createPetSchema includes color_markings: z.string().optional()', () => {
    expect(routesSrc).toMatch(/color_markings:\s*z\.string\(\)\.optional\(\)/);
  });
});

describe('task-2: buildEmergencyCard in backend/src/routes/public.ts', () => {
  const publicSrc = readSrc('routes/public.ts');

  it('buildEmergencyCard includes color_markings: pet.color_markings', () => {
    expect(publicSrc).toMatch(/color_markings:\s*pet\.color_markings/);
  });

  it('color_markings is inside the pet object returned by buildEmergencyCard', () => {
    // Find the returned pet object block
    const petObjMatch = publicSrc.match(/pet:\s*\{([\s\S]*?)\},\s*\/\/ Owner contact/);
    expect(petObjMatch).toBeTruthy();
    expect(petObjMatch![1]).toContain('color_markings');
  });
});
