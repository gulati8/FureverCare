/**
 * Unit tests for fuzzy matching utility
 *
 * Tests the rank-based similarity scoring engine used for deduplication.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  computeMatchScore,
  computeMultiFieldMatchScore,
  DEFAULT_MATCH_THRESHOLD
} from '../services/match-scoring';

describe('computeMatchScore', () => {
  describe('exact matches', () => {
    test('returns 1.0 for identical strings', () => {
      const score = computeMatchScore('Arthritis', 'Arthritis');
      assert.strictEqual(score, 1.0);
    });

    test('returns 1.0 for identical multi-word strings', () => {
      const score = computeMatchScore('Hip Dysplasia', 'Hip Dysplasia');
      assert.strictEqual(score, 1.0);
    });

    test('returns 1.0 for empty strings', () => {
      const score = computeMatchScore('', '');
      assert.strictEqual(score, 1.0);
    });
  });

  describe('case-insensitive matches', () => {
    test('returns ~0.95 for case-insensitive exact match', () => {
      const score = computeMatchScore('Arthritis', 'arthritis');
      assert.strictEqual(score, 0.95);
    });

    test('returns ~0.95 for mixed case match', () => {
      const score = computeMatchScore('Hip Dysplasia', 'hip dysplasia');
      assert.strictEqual(score, 0.95);
    });

    test('returns ~0.95 for uppercase vs lowercase', () => {
      const score = computeMatchScore('DIABETES', 'diabetes');
      assert.strictEqual(score, 0.95);
    });

    test('handles extra whitespace in case-insensitive match', () => {
      const score = computeMatchScore('  Hip Dysplasia  ', 'hip  dysplasia');
      assert.strictEqual(score, 0.95);
    });
  });

  describe('abbreviations and common variations', () => {
    test('scores moderately for Dr. vs Doctor (token overlap)', () => {
      const score = computeMatchScore('Dr. Smith', 'Doctor Smith');
      // Token overlap: "Smith" matches, but "Dr." vs "Doctor" are different
      assert.ok(score >= 0.5 && score < 0.7, `Expected score 0.5-0.7, got ${score}`);
    });

    test('scores moderately for Vet vs Veterinary (token overlap)', () => {
      const score = computeMatchScore('Vet Clinic', 'Veterinary Clinic');
      // Token overlap: "Clinic" matches, partial match on "Vet" in "Veterinary"
      assert.ok(score >= 0.5, `Expected score >= 0.5, got ${score}`);
    });

    test('scores high for St. vs Street (good Levenshtein)', () => {
      const score = computeMatchScore('Main St Clinic', 'Main Street Clinic');
      // Good token overlap: "Main" + "Clinic", "St" is short form of "Street"
      assert.ok(score >= 0.65, `Expected score >= 0.65, got ${score}`);
    });

    test('scores above threshold for similar multi-word names', () => {
      const score = computeMatchScore('Main St Animal Clinic', 'Main Street Animal Clinic');
      // Excellent token overlap, minor variation in one word
      assert.ok(score >= DEFAULT_MATCH_THRESHOLD, `Expected score >= ${DEFAULT_MATCH_THRESHOLD}, got ${score}`);
    });
  });

  describe('typos and minor variations', () => {
    test('scores above threshold for single character typo', () => {
      const score = computeMatchScore('Arthritis', 'Arthritus');
      assert.ok(score >= DEFAULT_MATCH_THRESHOLD, `Expected score >= ${DEFAULT_MATCH_THRESHOLD}, got ${score}`);
    });

    test('scores moderately for transposed characters', () => {
      const score = computeMatchScore('Diabetes', 'Diabetse');
      // Transposed characters create 2 edits, moderate similarity
      assert.ok(score >= 0.5 && score < DEFAULT_MATCH_THRESHOLD, `Expected score 0.5-0.6, got ${score}`);
    });

    test('scores well for minor spelling variation', () => {
      const score = computeMatchScore('Hypothyroidism', 'Hypothroidism');
      // Missing single character, still good match
      assert.ok(score >= 0.6, `Expected score >= 0.6, got ${score}`);
    });

    test('scores moderately for plurals', () => {
      const score = computeMatchScore('Allergies', 'Allergy');
      // Different endings affect score significantly
      assert.ok(score >= 0.4 && score < DEFAULT_MATCH_THRESHOLD, `Expected score 0.4-0.6, got ${score}`);
    });
  });

  describe('dissimilar strings', () => {
    test('scores below threshold for completely different conditions', () => {
      const score = computeMatchScore('Diabetes', 'Arthritis');
      assert.ok(score < DEFAULT_MATCH_THRESHOLD, `Expected score < ${DEFAULT_MATCH_THRESHOLD}, got ${score}`);
    });

    test('scores below threshold for different clinic names', () => {
      const score = computeMatchScore('Main Street Vet', 'Downtown Animal Hospital');
      assert.ok(score < DEFAULT_MATCH_THRESHOLD, `Expected score < ${DEFAULT_MATCH_THRESHOLD}, got ${score}`);
    });

    test('scores low for completely unrelated terms', () => {
      const score = computeMatchScore('Vaccination', 'Surgery');
      assert.ok(score < 0.4, `Expected score < 0.4, got ${score}`);
    });
  });

  describe('edge cases', () => {
    test('returns 0.0 when first string is empty', () => {
      const score = computeMatchScore('', 'Arthritis');
      assert.strictEqual(score, 0.0);
    });

    test('returns 0.0 when second string is empty', () => {
      const score = computeMatchScore('Arthritis', '');
      assert.strictEqual(score, 0.0);
    });

    test('handles null as empty string (first param)', () => {
      const score = computeMatchScore(null as any, 'Arthritis');
      assert.strictEqual(score, 0.0);
    });

    test('handles null as empty string (second param)', () => {
      const score = computeMatchScore('Arthritis', null as any);
      assert.strictEqual(score, 0.0);
    });

    test('handles undefined as empty string (first param)', () => {
      const score = computeMatchScore(undefined as any, 'Arthritis');
      assert.strictEqual(score, 0.0);
    });

    test('handles undefined as empty string (second param)', () => {
      const score = computeMatchScore('Arthritis', undefined as any);
      assert.strictEqual(score, 0.0);
    });

    test('handles single character strings', () => {
      const score = computeMatchScore('A', 'A');
      assert.strictEqual(score, 1.0);
    });

    test('handles single character mismatch', () => {
      const score = computeMatchScore('A', 'B');
      assert.ok(score < 0.5, `Expected score < 0.5, got ${score}`);
    });

    test('handles very long strings efficiently', () => {
      const longString1 = 'Chronic Progressive Degenerative Hip Dysplasia with Secondary Osteoarthritis';
      const longString2 = 'Chronic Progressive Degenerative Hip Dysplasia with Secondary Osteoarthritus';
      const score = computeMatchScore(longString1, longString2);
      // Single character typo in long string still has high similarity
      assert.ok(score >= 0.9, `Expected high score for minor typo in long string, got ${score}`);
    });

    test('handles strings with special characters', () => {
      const score = computeMatchScore('Dr. O\'Malley', 'Dr. O\'Malley');
      assert.strictEqual(score, 1.0);
    });

    test('handles strings with numbers', () => {
      const score = computeMatchScore('Clinic 123', 'Clinic 123');
      assert.strictEqual(score, 1.0);
    });
  });

  describe('multi-word token matching', () => {
    test('scores high when word order is same', () => {
      const score = computeMatchScore('Main Street Animal Hospital', 'Main Street Animal Hospital');
      assert.strictEqual(score, 1.0);
    });

    test('scores reasonably when words overlap', () => {
      const score = computeMatchScore('Main Street Veterinary Clinic', 'Main Street Vet Clinic');
      assert.ok(score >= 0.7, `Expected score >= 0.7 for overlapping words, got ${score}`);
    });

    test('scores lower when word order differs', () => {
      const score1 = computeMatchScore('Animal Hospital Main Street', 'Main Street Animal Hospital');
      const score2 = computeMatchScore('Main Street Animal Hospital', 'Main Street Animal Hospital');
      // Word order difference should result in lower score than exact match
      assert.ok(score1 < score2, `Expected different word order to score lower than exact match`);
    });
  });
});

describe('computeMultiFieldMatchScore', () => {
  describe('basic multi-field matching', () => {
    test('returns 1.0 when all fields match exactly', () => {
      const score = computeMultiFieldMatchScore([
        { a: 'Main Street Vet Clinic', b: 'Main Street Vet Clinic', weight: 0.7 },
        { a: 'Dr. Smith', b: 'Dr. Smith', weight: 0.3 }
      ]);
      assert.strictEqual(score, 1.0);
    });

    test('returns weighted average of field scores', () => {
      // Clinic matches perfectly (1.0), vet name has partial overlap (Smith/Jones share some similarity)
      const score = computeMultiFieldMatchScore([
        { a: 'Main Street Vet Clinic', b: 'Main Street Vet Clinic', weight: 0.7 },
        { a: 'Dr. Smith', b: 'Dr. Jones', weight: 0.3 }
      ]);
      // Expected: 0.7 * 1.0 + 0.3 * (partial token overlap ~0.4) ~= 0.82
      assert.ok(score >= 0.75, `Expected score >= 0.75, got ${score}`);
    });

    test('weights fields correctly (clinic 70%, vet 30%)', () => {
      // Perfect clinic match should dominate the score
      const score = computeMultiFieldMatchScore([
        { a: 'Downtown Animal Hospital', b: 'Downtown Animal Hospital', weight: 0.7 },
        { a: 'Dr. Smith', b: 'Dr. X', weight: 0.3 }
      ]);
      assert.ok(score >= 0.7, `Expected score >= 0.7 with perfect clinic match, got ${score}`);
    });
  });

  describe('veterinarian matching scenarios', () => {
    test('matches vet by clinic name with similar variations', () => {
      const score = computeMultiFieldMatchScore([
        { a: 'Main Street Vet Clinic', b: 'Main St Vet Clinic', weight: 0.7 },
        { a: 'Dr. Smith', b: 'Dr. Smith', weight: 0.3 }
      ]);
      // Clinic matches well, vet name exact match
      assert.ok(score >= DEFAULT_MATCH_THRESHOLD, `Expected score >= ${DEFAULT_MATCH_THRESHOLD}, got ${score}`);
    });

    test('matches when clinic is exact and vet name has token overlap', () => {
      const score = computeMultiFieldMatchScore([
        { a: 'Downtown Animal Hospital', b: 'Downtown Animal Hospital', weight: 0.7 },
        { a: 'Dr. Smith', b: 'Doctor Smith', weight: 0.3 }
      ]);
      // Clinic exact (1.0 * 0.7) + vet partial (~0.5 * 0.3) ~= 0.85
      assert.ok(score >= 0.8, `Expected score >= 0.8, got ${score}`);
    });

    test('relies heavily on clinic match when weighted 70%', () => {
      const score = computeMultiFieldMatchScore([
        { a: 'Main Street Veterinary Clinic', b: 'Main St Vet Clinic', weight: 0.7 },
        { a: 'Dr. Smith', b: 'Dr. Smith', weight: 0.3 }
      ]);
      // Clinic has good token overlap, vet exact
      assert.ok(score >= DEFAULT_MATCH_THRESHOLD, `Expected score >= ${DEFAULT_MATCH_THRESHOLD}, got ${score}`);
    });
  });

  describe('edge cases', () => {
    test('returns 0.0 for empty fields array', () => {
      const score = computeMultiFieldMatchScore([]);
      assert.strictEqual(score, 0.0);
    });

    test('handles single field', () => {
      const score = computeMultiFieldMatchScore([
        { a: 'Main Street Vet', b: 'Main Street Vet', weight: 1.0 }
      ]);
      assert.strictEqual(score, 1.0);
    });

    test('normalizes weights that don\'t sum to 1.0', () => {
      // Weights sum to 2.0 instead of 1.0
      const score = computeMultiFieldMatchScore([
        { a: 'Main Street Vet', b: 'Main Street Vet', weight: 1.4 },
        { a: 'Dr. Smith', b: 'Dr. Smith', weight: 0.6 }
      ]);
      // Should normalize to same as 0.7/0.3
      assert.strictEqual(score, 1.0);
    });

    test('handles empty string fields', () => {
      const score = computeMultiFieldMatchScore([
        { a: '', b: '', weight: 0.7 },
        { a: 'Dr. Smith', b: 'Dr. Smith', weight: 0.3 }
      ]);
      // Empty strings match (1.0), Dr. Smith matches (1.0)
      // But empty string matching returns 1.0 per computeMatchScore
      assert.strictEqual(score, 1.0);
    });

    test('handles null/undefined in multi-field', () => {
      const score = computeMultiFieldMatchScore([
        { a: null as any, b: '', weight: 0.5 },
        { a: 'Test', b: 'Test', weight: 0.5 }
      ]);
      // null treated as empty string, matches empty (1.0)
      // Test matches Test (1.0)
      assert.strictEqual(score, 1.0);
    });

    test('handles three or more fields', () => {
      const score = computeMultiFieldMatchScore([
        { a: 'Field1', b: 'Field1', weight: 0.5 },
        { a: 'Field2', b: 'Field2', weight: 0.3 },
        { a: 'Field3', b: 'Field3', weight: 0.2 }
      ]);
      assert.strictEqual(score, 1.0);
    });
  });

  describe('realistic veterinarian scenarios', () => {
    test('identifies duplicate vet with minor clinic name variation', () => {
      const score = computeMultiFieldMatchScore([
        { a: 'VCA Animal Hospital', b: 'VCA Animal Hosp', weight: 0.7 },
        { a: 'Dr. Sarah Johnson', b: 'Dr. Sarah Johnson', weight: 0.3 }
      ]);
      assert.ok(score >= DEFAULT_MATCH_THRESHOLD, `Expected potential duplicate, got score ${score}`);
    });

    test('identifies duplicate vet with typo in vet name', () => {
      const score = computeMultiFieldMatchScore([
        { a: 'Emergency Vet Clinic', b: 'Emergency Vet Clinic', weight: 0.7 },
        { a: 'Dr. Michael Chen', b: 'Dr. Micheal Chen', weight: 0.3 }
      ]);
      assert.ok(score >= DEFAULT_MATCH_THRESHOLD, `Expected potential duplicate, got score ${score}`);
    });

    test('does not match completely different vets', () => {
      const score = computeMultiFieldMatchScore([
        { a: 'Downtown Vet', b: 'Uptown Animal Hospital', weight: 0.7 },
        { a: 'Dr. Smith', b: 'Dr. Jones', weight: 0.3 }
      ]);
      assert.ok(score < DEFAULT_MATCH_THRESHOLD, `Expected no match for different vets, got score ${score}`);
    });
  });
});

describe('DEFAULT_MATCH_THRESHOLD', () => {
  test('is set to 0.6', () => {
    assert.strictEqual(DEFAULT_MATCH_THRESHOLD, 0.6);
  });

  test('catches typos above threshold', () => {
    const typoScore = computeMatchScore('Arthritis', 'Arthritus');
    assert.ok(typoScore >= DEFAULT_MATCH_THRESHOLD, 'Single character typo should be above threshold');
  });

  test('catches similar multi-word terms above threshold', () => {
    const score = computeMatchScore('Hip Dysplasia', 'Hip dysplasia');
    assert.ok(score >= DEFAULT_MATCH_THRESHOLD, 'Case variations should be above threshold');
  });

  test('rejects dissimilar names below threshold', () => {
    const dissimilarScore = computeMatchScore('Diabetes', 'Arthritis');
    assert.ok(dissimilarScore < DEFAULT_MATCH_THRESHOLD, 'Completely different names should be below threshold');
  });
});
