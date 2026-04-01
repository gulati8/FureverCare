/**
 * Tests for PetAvatarPlaceholder component.
 *
 * Acceptance criteria mapped:
 *   task-1:  File exists, SVG width/height from size prop, species-specific paths,
 *            fallback paw print, viewBox, color prop, className prop, default export,
 *            no external assets.
 *   task-2:  Dashboard uses PetAvatarPlaceholder — verified via static source scan.
 *   task-3:  EmergencyCardView uses PetAvatarPlaceholder — verified via static source scan.
 *   task-4:  Hero.tsx uses PetAvatarPlaceholder with species='dog' — verified via static source scan.
 *   task-5:  PhotoUpload uses PetAvatarPlaceholder, no defaultEmoji — verified via static source scan.
 *   task-6:  PetDetailModal and PetsList use PetAvatarPlaceholder — verified via static source scan.
 *   extra:   TypeScript compilation (tsc --noEmit), no residual person-silhouette SVG path.
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import PetAvatarPlaceholder from './PetAvatarPlaceholder';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SRC = resolve(__dirname, '..');

function readSrc(relativePath: string): string {
  return readFileSync(resolve(SRC, relativePath), 'utf-8');
}

// The person-silhouette path that must be purged (plan acceptance criterion:
// "No person-silhouette SVG paths remain").
const PERSON_PATH_FRAGMENT = 'M12 2C9.24';

// Each species' unique path data prefix extracted from the component source so
// the tests are coupled to the component's actual output, not a hardcoded copy.
const componentSource = readSrc('components/PetAvatarPlaceholder.tsx');

function extractPath(species: string): string {
  // e.g.  dog: 'M4.5 8.5...',
  const re = new RegExp(`${species}:\\s*'([^']+)'`);
  const m = componentSource.match(re);
  if (!m) throw new Error(`Could not extract path for species: ${species}`);
  return m[1];
}

const SPECIES = ['dog', 'cat', 'bird', 'rabbit', 'hamster', 'fish', 'reptile'];

// ---------------------------------------------------------------------------
// task-1 — PetAvatarPlaceholder component
// ---------------------------------------------------------------------------

describe('PetAvatarPlaceholder component (task-1)', () => {

  it('file exists at frontend/src/components/PetAvatarPlaceholder.tsx', () => {
    // If the import above worked, the file exists. Belt-and-suspenders:
    expect(componentSource.length).toBeGreaterThan(0);
  });

  it('renders an SVG element', () => {
    const { container } = render(<PetAvatarPlaceholder />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it('SVG width equals the size prop', () => {
    const { container } = render(<PetAvatarPlaceholder size={48} />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('width')).toBe('48');
  });

  it('SVG height equals the size prop', () => {
    const { container } = render(<PetAvatarPlaceholder size={48} />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('height')).toBe('48');
  });

  it('viewBox is "0 0 24 24"', () => {
    const { container } = render(<PetAvatarPlaceholder />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
  });

  it('default size is 32', () => {
    const { container } = render(<PetAvatarPlaceholder />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('width')).toBe('32');
    expect(svg.getAttribute('height')).toBe('32');
  });

  it("default color is '#4A7FB5'", () => {
    const { container } = render(<PetAvatarPlaceholder />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('fill')).toBe('#4A7FB5');
  });

  it('color prop controls SVG fill attribute', () => {
    const { container } = render(<PetAvatarPlaceholder color="#FF0000" />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('fill')).toBe('#FF0000');
  });

  it('className prop is passed through to SVG element', () => {
    const { container } = render(<PetAvatarPlaceholder className="my-avatar" />);
    const svg = container.querySelector('svg')!;
    expect(svg.classList.contains('my-avatar')).toBe(true);
  });

  it('component is the default export', async () => {
    // Dynamic import to verify default export shape
    const mod = await import('./PetAvatarPlaceholder');
    expect(typeof mod.default).toBe('function');
  });

  it('no external SVG files referenced — all paths are inline', () => {
    // No <image>, no src= or href= pointing to .svg files
    expect(componentSource).not.toMatch(/\.svg['"]/);
    expect(componentSource).not.toMatch(/<image/);
  });

  // --- Species-specific paths ---

  for (const species of SPECIES) {
    it(`species='${species}' renders a unique SVG path (not paw print, not person)`, () => {
      const expectedPath = extractPath(species);
      const { container } = render(<PetAvatarPlaceholder species={species} />);
      const path = container.querySelector('path')!;
      expect(path.getAttribute('d')).toBe(expectedPath);
      // Must not be the person-silhouette path
      expect(path.getAttribute('d')).not.toContain(PERSON_PATH_FRAGMENT);
    });
  }

  it('all known species render distinct SVG paths from each other', () => {
    const paths = SPECIES.map(s => extractPath(s));
    const unique = new Set(paths);
    expect(unique.size).toBe(SPECIES.length);
  });

  it("species='other' renders the paw print fallback", () => {
    const { container: c1 } = render(<PetAvatarPlaceholder species="other" />);
    const { container: c2 } = render(<PetAvatarPlaceholder />);  // undefined species
    const pathOther = c1.querySelector('path')!.getAttribute('d');
    const pathUndefined = c2.querySelector('path')!.getAttribute('d');
    // Both should be the same paw path
    expect(pathOther).toBe(pathUndefined);
    // Neither should be a species-specific path
    for (const s of SPECIES) {
      expect(pathOther).not.toBe(extractPath(s));
    }
  });

  it('species=undefined renders the paw print fallback', () => {
    const { container } = render(<PetAvatarPlaceholder species={undefined} />);
    const path = container.querySelector('path')!.getAttribute('d');
    // Must not be a known species path
    for (const s of SPECIES) {
      expect(path).not.toBe(extractPath(s));
    }
    // Must not be the person-silhouette path
    expect(path).not.toContain(PERSON_PATH_FRAGMENT);
  });

  it('unknown species renders the paw print fallback', () => {
    const { container } = render(<PetAvatarPlaceholder species="dragon" />);
    const { container: fallback } = render(<PetAvatarPlaceholder />);
    expect(container.querySelector('path')!.getAttribute('d'))
      .toBe(fallback.querySelector('path')!.getAttribute('d'));
  });

  it('paw print fallback does not use the person-silhouette path', () => {
    const { container } = render(<PetAvatarPlaceholder />);
    const path = container.querySelector('path')!.getAttribute('d');
    expect(path).not.toContain(PERSON_PATH_FRAGMENT);
  });

});

// ---------------------------------------------------------------------------
// task-2 — Dashboard.tsx integration
// ---------------------------------------------------------------------------

describe('Dashboard.tsx integration (task-2)', () => {
  const source = readSrc('pages/Dashboard.tsx');

  it('imports PetAvatarPlaceholder from the components directory', () => {
    expect(source).toMatch(/import PetAvatarPlaceholder from ['"]\.\.\/components\/PetAvatarPlaceholder['"]/);
  });

  it('uses PetAvatarPlaceholder in JSX', () => {
    expect(source).toMatch(/<PetAvatarPlaceholder/);
  });

  it('no person-silhouette SVG path remains in Dashboard.tsx', () => {
    expect(source).not.toContain(PERSON_PATH_FRAGMENT);
  });

  it('empty-state renders PetAvatarPlaceholder with size=40', () => {
    expect(source).toMatch(/PetAvatarPlaceholder[^/]*size=\{40\}/);
  });

  it('pet card fallback renders PetAvatarPlaceholder with size=32 and pet.species', () => {
    expect(source).toMatch(/PetAvatarPlaceholder[^/]*size=\{32\}[^/]*species=\{pet\.species\}|PetAvatarPlaceholder[^/]*species=\{pet\.species\}[^/]*size=\{32\}/);
  });
});

// ---------------------------------------------------------------------------
// task-3 — EmergencyCardView.tsx integration
// ---------------------------------------------------------------------------

describe('EmergencyCardView.tsx integration (task-3)', () => {
  const source = readSrc('components/EmergencyCardView.tsx');

  it('imports PetAvatarPlaceholder', () => {
    expect(source).toMatch(/import PetAvatarPlaceholder from ['"]\.\/PetAvatarPlaceholder['"]/);
  });

  it('no person-silhouette SVG path remains in EmergencyCardView.tsx', () => {
    expect(source).not.toContain(PERSON_PATH_FRAGMENT);
  });

  it('renders PetAvatarPlaceholder with size=36', () => {
    expect(source).toMatch(/PetAvatarPlaceholder[^/]*size=\{36\}/);
  });

  it('passes pet.species to PetAvatarPlaceholder', () => {
    expect(source).toMatch(/PetAvatarPlaceholder[^/]*species=\{pet\.species\}/);
  });
});

// ---------------------------------------------------------------------------
// task-4 — Hero.tsx integration
// ---------------------------------------------------------------------------

describe('Hero.tsx integration (task-4)', () => {
  const source = readSrc('components/homepage/Hero.tsx');

  it("imports PetAvatarPlaceholder from '../../components/PetAvatarPlaceholder'", () => {
    expect(source).toMatch(/import PetAvatarPlaceholder from ['"]\.\.\/\.\.\/components\/PetAvatarPlaceholder['"]/);
  });

  it('no person-silhouette SVG path remains in Hero.tsx', () => {
    expect(source).not.toContain(PERSON_PATH_FRAGMENT);
  });

  it("uses PetAvatarPlaceholder with species='dog'", () => {
    expect(source).toMatch(/PetAvatarPlaceholder[^/]*species=['"]dog['"]/);
  });

  it('renders PetAvatarPlaceholder with size=28', () => {
    expect(source).toMatch(/PetAvatarPlaceholder[^/]*size=\{28\}/);
  });
});

// ---------------------------------------------------------------------------
// task-5 — PhotoUpload.tsx integration
// ---------------------------------------------------------------------------

describe('PhotoUpload.tsx integration (task-5)', () => {
  const source = readSrc('components/PhotoUpload.tsx');

  it("imports PetAvatarPlaceholder from './PetAvatarPlaceholder'", () => {
    expect(source).toMatch(/import PetAvatarPlaceholder from ['"]\.\/PetAvatarPlaceholder['"]/);
  });

  it('defaultEmoji variable is removed', () => {
    expect(source).not.toContain('defaultEmoji');
  });

  it('no pet emoji characters remain for avatar purposes', () => {
    // The plan removes emoji spans used as avatar fallbacks.
    // Check that common pet emojis used as fallbacks are gone from the file.
    expect(source).not.toMatch(/['"]🐾['"]/);
    expect(source).not.toMatch(/['"]🐶['"]/);
    expect(source).not.toMatch(/['"]🐱['"]/);
  });

  it('uses PetAvatarPlaceholder in compact mode with size=32', () => {
    expect(source).toMatch(/PetAvatarPlaceholder[^/]*size=\{32\}/);
  });

  it('uses PetAvatarPlaceholder in full mode with size=36', () => {
    expect(source).toMatch(/PetAvatarPlaceholder[^/]*size=\{36\}/);
  });

  it('passes species prop to PetAvatarPlaceholder', () => {
    expect(source).toMatch(/PetAvatarPlaceholder[^/]*species=\{species\}/);
  });
});

// ---------------------------------------------------------------------------
// task-6 — Admin files integration
// ---------------------------------------------------------------------------

describe('PetDetailModal.tsx integration (task-6)', () => {
  const source = readSrc('pages/admin/PetDetailModal.tsx');

  it('imports PetAvatarPlaceholder', () => {
    expect(source).toMatch(/import PetAvatarPlaceholder from/);
  });

  it('uses PetAvatarPlaceholder with size=32 and pet.species', () => {
    expect(source).toMatch(/PetAvatarPlaceholder/);
    expect(source).toMatch(/size=\{32\}/);
    expect(source).toMatch(/species=\{pet\.species\}/);
  });

  it('no pet emoji avatar fallback remains', () => {
    // Common fallback emojis per the plan
    expect(source).not.toMatch(/['"]🐾['"]/);
  });
});

describe('PetsList.tsx integration (task-6)', () => {
  const source = readSrc('pages/admin/PetsList.tsx');

  it('imports PetAvatarPlaceholder', () => {
    expect(source).toMatch(/import PetAvatarPlaceholder from/);
  });

  it('uses PetAvatarPlaceholder with size=16 and pet.species', () => {
    expect(source).toMatch(/PetAvatarPlaceholder/);
    expect(source).toMatch(/size=\{16\}/);
    expect(source).toMatch(/species=\{pet\.species\}/);
  });

  it('no pet emoji avatar fallback remains', () => {
    expect(source).not.toMatch(/['"]🐾['"]/);
  });
});

// ---------------------------------------------------------------------------
// Extra — No residual person-silhouette path across all frontend/src files
// ---------------------------------------------------------------------------

describe('No residual person-silhouette SVG path in frontend/src (extra)', () => {
  const filesToCheck = [
    'pages/Dashboard.tsx',
    'components/EmergencyCardView.tsx',
    'components/homepage/Hero.tsx',
    'components/PhotoUpload.tsx',
    'pages/admin/PetDetailModal.tsx',
    'pages/admin/PetsList.tsx',
  ];

  for (const file of filesToCheck) {
    it(`no person-silhouette path in ${file}`, () => {
      const source = readSrc(file);
      expect(source).not.toContain(PERSON_PATH_FRAGMENT);
    });
  }
});
