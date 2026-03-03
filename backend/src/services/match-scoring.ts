/**
 * Fuzzy matching utility for deduplication
 *
 * Implements rank-based similarity scoring using multiple signals:
 * - Exact match detection
 * - Case-insensitive matching
 * - Token overlap (for multi-word names)
 * - Levenshtein distance (edit distance)
 *
 * No external dependencies - pure TypeScript implementation.
 */

/**
 * Default threshold for considering two strings as potential duplicates.
 * 0.6 catches abbreviations, plurals, and minor typos while avoiding false positives.
 */
export const DEFAULT_MATCH_THRESHOLD = 0.6;

/**
 * Compute Levenshtein distance (edit distance) between two strings.
 * Returns the minimum number of single-character edits needed to transform a into b.
 */
function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Create matrix
  const matrix: number[][] = [];

  // Initialize first column
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  // Initialize first row
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Normalize a string for comparison: lowercase, trim, normalize whitespace
 */
function normalizeString(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Extract tokens (words) from a string
 */
function tokenize(s: string): string[] {
  return normalizeString(s).split(/\s+/).filter(t => t.length > 0);
}

/**
 * Compute token overlap ratio between two strings.
 * Returns the Jaccard similarity coefficient (intersection / union).
 */
function tokenOverlapRatio(a: string, b: string): number {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);

  if (tokensA.length === 0 && tokensB.length === 0) return 1.0;
  if (tokensA.length === 0 || tokensB.length === 0) return 0.0;

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  return intersection.size / union.size;
}

/**
 * Compute a match score between two strings using multiple signals.
 *
 * Returns a score from 0.0 (no match) to 1.0 (exact match).
 *
 * Signals used (with weights):
 * - Exact match: 1.0 (short-circuit)
 * - Case-insensitive exact match: 0.95 (short-circuit)
 * - Token overlap: 0.3 weight
 * - Levenshtein distance ratio: 0.7 weight
 *
 * @param a First string
 * @param b Second string
 * @returns Match score from 0.0 to 1.0
 */
export function computeMatchScore(a: string, b: string): number {
  // Handle null/undefined
  const strA = (a || '').trim();
  const strB = (b || '').trim();

  // Empty string handling
  if (strA.length === 0 && strB.length === 0) return 1.0;
  if (strA.length === 0 || strB.length === 0) return 0.0;

  // Exact match
  if (strA === strB) return 1.0;

  // Case-insensitive exact match
  const normA = normalizeString(strA);
  const normB = normalizeString(strB);
  if (normA === normB) return 0.95;

  // Token overlap signal
  const tokenScore = tokenOverlapRatio(strA, strB);

  // Levenshtein distance signal
  const distance = levenshteinDistance(normA, normB);
  const maxLen = Math.max(normA.length, normB.length);
  const levenshteinRatio = 1.0 - (distance / maxLen);

  // Weighted combination
  // Token overlap is useful for multi-word names (e.g., "Main Street Vet Clinic")
  // Levenshtein is useful for typos and minor variations (e.g., "Arthritus" vs "Arthritis")
  const combinedScore = (tokenScore * 0.3) + (levenshteinRatio * 0.7);

  return Math.max(0, Math.min(1, combinedScore));
}

/**
 * Compute a multi-field match score using weighted field scores.
 *
 * Useful for matching records with multiple fields (e.g., veterinarian = clinic_name + vet_name).
 *
 * @param fields Array of field comparisons with weights. Weights should sum to 1.0.
 * @returns Combined match score from 0.0 to 1.0
 *
 * @example
 * // Match veterinarian by clinic name (70%) and vet name (30%)
 * const score = computeMultiFieldMatchScore([
 *   { a: 'Main Street Vet Clinic', b: 'Main St Vet Clinic', weight: 0.7 },
 *   { a: 'Dr. Smith', b: 'Doctor Smith', weight: 0.3 }
 * ]);
 */
export function computeMultiFieldMatchScore(
  fields: { a: string, b: string, weight: number }[]
): number {
  if (fields.length === 0) return 0.0;

  let totalScore = 0.0;
  let totalWeight = 0.0;

  for (const field of fields) {
    const fieldScore = computeMatchScore(field.a, field.b);
    totalScore += fieldScore * field.weight;
    totalWeight += field.weight;
  }

  // Normalize by total weight (in case weights don't sum to 1.0)
  return totalWeight > 0 ? totalScore / totalWeight : 0.0;
}
