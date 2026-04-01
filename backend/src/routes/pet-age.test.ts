/**
 * Tests for "Add Age Field to Pet Profile" feature — Backend
 *
 * Acceptance criteria mapped:
 *   task-1: Migration file exists, correct SQL, IF NOT EXISTS guard, INTEGER type, package.json scripts
 *   task-2: Pet interface, CreatePetInput, createPet INSERT, updatePet allowedFields,
 *            createPetSchema Zod validation (valid + invalid values)
 *   task-3: public.ts — age from DOB, age from stored field, neither → null
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

describe('task-1: Migration file migrate-pet-age.ts exists', () => {
  const migrationSrc = readSrc('db/migrate-pet-age.ts');

  it('migration file exists at backend/src/db/migrate-pet-age.ts', () => {
    expect(migrationSrc.length).toBeGreaterThan(0);
  });

  it('migration SQL adds INTEGER column named age to pets table', () => {
    expect(migrationSrc).toMatch(/ALTER TABLE pets ADD COLUMN age INTEGER/i);
  });

  it('migration column has no NOT NULL constraint (nullable)', () => {
    const addColumnLine = migrationSrc
      .split('\n')
      .find((l) => l.includes('ADD COLUMN age'));
    expect(addColumnLine).toBeDefined();
    expect(addColumnLine).not.toContain('NOT NULL');
  });

  it('migration is wrapped in a DO $$ block', () => {
    expect(migrationSrc).toMatch(/DO \$\$/);
  });

  it('migration uses IF NOT EXISTS guard', () => {
    expect(migrationSrc).toMatch(/IF NOT EXISTS/);
  });

  it('IF NOT EXISTS guard queries information_schema.columns', () => {
    expect(migrationSrc).toMatch(/information_schema\.columns/);
  });

  it('IF NOT EXISTS guard checks table_name = pets', () => {
    expect(migrationSrc).toMatch(/table_name\s*=\s*'pets'/);
  });

  it('IF NOT EXISTS guard checks column_name = age', () => {
    expect(migrationSrc).toMatch(/column_name\s*=\s*'age'/);
  });
});

describe('task-1: package.json migration scripts', () => {
  const pkg = readRoot('package.json');

  it('package.json has db:migrate:pet-age script (node dist)', () => {
    expect(pkg).toContain('"db:migrate:pet-age"');
    expect(pkg).toMatch(/"db:migrate:pet-age":\s*"node dist\/db\/migrate-pet-age\.js"/);
  });

  it('package.json has db:migrate:pet-age:dev script (tsx src)', () => {
    expect(pkg).toContain('"db:migrate:pet-age:dev"');
    expect(pkg).toMatch(/"db:migrate:pet-age:dev":\s*"tsx src\/db\/migrate-pet-age\.ts"/);
  });
});

// ---------------------------------------------------------------------------
// task-2 — Backend model (pet.ts)
// ---------------------------------------------------------------------------

describe('task-2: Pet interface in backend/src/models/pet.ts', () => {
  const modelSrc = readSrc('models/pet.ts');

  it('Pet interface contains age: number | null', () => {
    const petInterfaceMatch = modelSrc.match(/export interface Pet \{([\s\S]*?)\}/);
    expect(petInterfaceMatch).toBeTruthy();
    expect(petInterfaceMatch![1]).toMatch(/age:\s*number\s*\|\s*null/);
  });
});

describe('task-2: CreatePetInput interface in backend/src/models/pet.ts', () => {
  const modelSrc = readSrc('models/pet.ts');

  it('CreatePetInput interface contains age?: number', () => {
    const createInputMatch = modelSrc.match(/export interface CreatePetInput \{([\s\S]*?)\}/);
    expect(createInputMatch).toBeTruthy();
    expect(createInputMatch![1]).toMatch(/age\?:\s*number/);
  });
});

describe('task-2: createPet INSERT query in backend/src/models/pet.ts', () => {
  const modelSrc = readSrc('models/pet.ts');

  it('INSERT column list includes age', () => {
    const insertMatch = modelSrc.match(/INSERT INTO pets \(([\s\S]*?)\)/);
    expect(insertMatch).toBeTruthy();
    expect(insertMatch![1]).toContain('age');
  });

  it('INSERT VALUES includes 15 parameters ($15) after adding age', () => {
    expect(modelSrc).toMatch(/\$15/);
  });

  it('age value uses nullish coalescing to handle undefined → null', () => {
    // age ?? null or input.age !== undefined ? input.age : null or similar
    expect(modelSrc).toMatch(/input\.age\s*\?\??\s*null|input\.age.*null/);
  });
});

describe('task-2: updatePet allowedFields in backend/src/models/pet.ts', () => {
  const modelSrc = readSrc('models/pet.ts');

  it("allowedFields array includes 'age'", () => {
    const allowedMatch = modelSrc.match(/allowedFields\s*=\s*\[([^\]]+)\]/);
    expect(allowedMatch).toBeTruthy();
    expect(allowedMatch![1]).toContain("'age'");
  });
});

// ---------------------------------------------------------------------------
// task-2 — Zod schema in routes/pets.ts
// ---------------------------------------------------------------------------

describe('task-2: createPetSchema Zod in backend/src/routes/pets.ts', () => {
  const routesSrc = readSrc('routes/pets.ts');

  it('createPetSchema includes age as z.number().int().min(0).max(100).optional()', () => {
    expect(routesSrc).toMatch(/age:\s*z\.number\(\)\.int\(\)\.min\(0\)\.max\(100\)\.optional\(\)/);
  });
});

// ---------------------------------------------------------------------------
// task-2 — Zod schema runtime validation (pure unit tests, no DB needed)
// ---------------------------------------------------------------------------

import { z } from 'zod';

const createPetSchema = z.object({
  name: z.string().min(1, 'Pet name is required'),
  species: z.string().min(1, 'Species is required'),
  breed: z.string().optional(),
  date_of_birth: z.string().optional(),
  weight_kg: z.number().positive().optional(),
  weight_unit: z.enum(['lbs', 'kg']).optional(),
  sex: z.enum(['male', 'female']).optional(),
  is_fixed: z.boolean().optional(),
  microchip_id: z.string().optional(),
  photo_url: z.string().url().optional(),
  special_instructions: z.string().optional(),
  color_markings: z.string().max(500).optional(),
  age: z.number().int().min(0).max(100).optional(),
});

describe('task-2: createPetSchema Zod — valid age values', () => {
  const base = { name: 'Buddy', species: 'dog' };

  it('age=0 is valid (newborn pet)', () => {
    const result = createPetSchema.safeParse({ ...base, age: 0 });
    expect(result.success).toBe(true);
  });

  it('age=1 is valid', () => {
    const result = createPetSchema.safeParse({ ...base, age: 1 });
    expect(result.success).toBe(true);
  });

  it('age=50 is valid (midrange)', () => {
    const result = createPetSchema.safeParse({ ...base, age: 50 });
    expect(result.success).toBe(true);
  });

  it('age=100 is valid (max boundary)', () => {
    const result = createPetSchema.safeParse({ ...base, age: 100 });
    expect(result.success).toBe(true);
  });

  it('age omitted is valid (optional field)', () => {
    const result = createPetSchema.safeParse({ ...base });
    expect(result.success).toBe(true);
    expect(result.data?.age).toBeUndefined();
  });
});

describe('task-2: createPetSchema Zod — invalid age values', () => {
  const base = { name: 'Buddy', species: 'dog' };

  it('age=-1 is rejected (negative)', () => {
    const result = createPetSchema.safeParse({ ...base, age: -1 });
    expect(result.success).toBe(false);
  });

  it('age=101 is rejected (above 100)', () => {
    const result = createPetSchema.safeParse({ ...base, age: 101 });
    expect(result.success).toBe(false);
  });

  it('age=3.5 is rejected (fractional)', () => {
    const result = createPetSchema.safeParse({ ...base, age: 3.5 });
    expect(result.success).toBe(false);
  });

  it('age="3" (string) is rejected', () => {
    const result = createPetSchema.safeParse({ ...base, age: '3' as any });
    expect(result.success).toBe(false);
  });

  it('age=null is rejected (schema expects number, not null)', () => {
    const result = createPetSchema.safeParse({ ...base, age: null as any });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// task-3 — public.ts: age fallback logic
// ---------------------------------------------------------------------------

describe('task-3: public.ts age calculation block', () => {
  const publicSrc = readSrc('routes/public.ts');

  it('age calculation block handles date_of_birth (existing behaviour preserved)', () => {
    expect(publicSrc).toMatch(/pet\.date_of_birth/);
    expect(publicSrc).toMatch(/new Date\(pet\.date_of_birth\)/);
  });

  it('age falls back to pet.age when date_of_birth is absent', () => {
    // The else-if branch: pet.age != null → use stored age
    expect(publicSrc).toMatch(/pet\.age\s*!=\s*null|pet\.age\s*!==\s*null/);
  });

  it('stored age is formatted as "{N} year(s)"', () => {
    // Check that when using pet.age we produce a year-string
    const ageBlock = publicSrc.slice(
      publicSrc.indexOf('Calculate age'),
      publicSrc.indexOf('return {')
    );
    expect(ageBlock).toMatch(/pet\.age.*year/s);
  });

  it('age is included in the returned pet object', () => {
    const petObjMatch = publicSrc.match(/pet:\s*\{([\s\S]*?)\},\s*\/\/ Owner contact/);
    expect(petObjMatch).toBeTruthy();
    expect(petObjMatch![1]).toContain('age');
  });
});
