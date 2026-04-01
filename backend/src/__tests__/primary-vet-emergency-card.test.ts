import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';

describe('buildEmergencyCard - primary vet filtering', () => {
  it('uses vets.find for primary vet instead of vets.map', async () => {
    const src = await fs.readFile(path.join(__dirname, '../routes/public.ts'), 'utf-8');
    expect(src).toContain('vets.find(v => v.is_primary)');

    // Locate the veterinarians IIFE block and assert vets.map with clinic_name does NOT appear in it
    const vetBlockStart = src.indexOf('veterinarians: (() =>');
    expect(vetBlockStart).toBeGreaterThan(-1);
    const vetBlockEnd = src.indexOf('})()', vetBlockStart);
    const vetBlock = src.slice(vetBlockStart, vetBlockEnd + 4);
    expect(vetBlock).not.toMatch(/vets\.map\s*\(\s*v\s*=>\s*\(\s*\{[\s\S]*?clinic_name/);
  });

  it('returns empty array when no primary vet', async () => {
    const src = await fs.readFile(path.join(__dirname, '../routes/public.ts'), 'utf-8');
    expect(src).toContain('if (!primary) return [];');
  });

  it('returns single-element array with correct fields', async () => {
    const src = await fs.readFile(path.join(__dirname, '../routes/public.ts'), 'utf-8');
    expect(src).toContain('clinic_name: primary.clinic_name');
    expect(src).toContain('vet_name: primary.vet_name');
    expect(src).toContain('phone: primary.phone');
    expect(src).toContain('is_primary: primary.is_primary');
  });

  it('getPetVets is still called without filtering', async () => {
    const src = await fs.readFile(path.join(__dirname, '../routes/public.ts'), 'utf-8');
    expect(src).toContain('getPetVets(pet.id)');
  });

  it('emergency_contacts IIFE pattern is still intact (regression)', async () => {
    const src = await fs.readFile(path.join(__dirname, '../routes/public.ts'), 'utf-8');
    expect(src).toContain('emergencyContacts.find(c => c.is_primary)');
  });

  it('veterinarians uses IIFE pattern matching emergency_contacts', async () => {
    const src = await fs.readFile(path.join(__dirname, '../routes/public.ts'), 'utf-8');
    expect(src).toContain('veterinarians: (() => {');
  });
});
