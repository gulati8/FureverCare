# Implementation Plan: Show Only Primary Vet on Emergency Card

## Summary

The emergency pet card currently returns and displays **all** veterinarians from a pet's care team. This change filters the `veterinarians` array in the emergency card API response to include **only** the vet marked `is_primary = true`. If no primary vet exists, the array will be empty. The Care Team tab (authenticated UI) is not affected -- it will continue to show all vets.

The change follows the exact pattern already established for emergency contacts in the same `buildEmergencyCard` function (see `public.ts` lines 150-159), where only the primary contact (or first fallback) is returned. For vets, however, the spec says "no primary means no vet" -- there is no fallback.

---

## Architecture

### Data Flow (current)

```
DB (pet_vets table) --> getPetVets(petId) --> buildEmergencyCard() --> API response
                        returns ALL vets      maps ALL vets              all vets in array
```

### Data Flow (after change)

```
DB (pet_vets table) --> getPetVets(petId) --> buildEmergencyCard() --> API response
                        returns ALL vets      filters to is_primary     0 or 1 vet in array
```

### Key Design Decision

The filtering happens in the API layer (`buildEmergencyCard` in `public.ts`), not in the database query. This matches the existing pattern:

- `getPetVets()` is a shared query used by both the authenticated care team endpoints AND the emergency card builder. Modifying the query would break the Care Team tab.
- The `buildEmergencyCard` function already selectively filters other record types (conditions: `is_active && show_on_card`, medications: `is_active && show_on_card`, emergency contacts: primary only). Filtering vets here is consistent.

### Files Affected

Only **one** backend file needs modification. The frontend requires **zero** changes because `EmergencyCardView.tsx` already iterates over `veterinarians.map()` -- when the array has 0 or 1 items, it will render 0 or 1 vet cards. Tests must be added or updated in **one** test file.

---

## Files to Modify

### 1. `backend/src/routes/public.ts` (lines 142-147)

**Current code (lines 142-147):**
```typescript
// Veterinarian info
veterinarians: vets.map(v => ({
  clinic_name: v.clinic_name,
  vet_name: v.vet_name,
  phone: v.phone,
  is_primary: v.is_primary,
})),
```

**New code:**
```typescript
// Veterinarian info -- only show primary vet on emergency card
veterinarians: (() => {
  const primary = vets.find(v => v.is_primary);
  if (!primary) return [];
  return [{
    clinic_name: primary.clinic_name,
    vet_name: primary.vet_name,
    phone: primary.phone,
    is_primary: primary.is_primary,
  }];
})(),
```

This is the same IIFE pattern used for `emergency_contacts` at lines 150-159 of the same file.

### 2. Test file (new or existing)

**Option A:** Add tests to the existing `backend/src/set-primary-emergency-contact.test.ts` file (since it already has a section for "task-005: Emergency card filtering (public.ts)").

**Option B (preferred):** Create a focused test file `backend/src/__tests__/primary-vet-emergency-card.test.ts` to keep concerns separated.

The test file will verify:
- `buildEmergencyCard` returns only the primary vet when one exists
- `buildEmergencyCard` returns an empty `veterinarians` array when no vet is primary
- `buildEmergencyCard` returns only one vet even when multiple vets exist
- The veterinarians field in the response is always an array (not null)
- The existing emergency_contacts filtering logic is unchanged

Since `buildEmergencyCard` is a private function in `public.ts` (not exported), tests will use the structural verification approach already established in this codebase (reading the file and asserting on its content), consistent with `backend/src/set-primary-emergency-contact.test.ts` and `backend/src/routes/pets.test.ts`.

---

## Tasks

### task-001: Filter veterinarians to primary-only in buildEmergencyCard

**File:** `backend/src/routes/public.ts`

**Change:** Replace lines 142-147 (the `veterinarians:` property in the return object of `buildEmergencyCard`) with an IIFE that filters to only the primary vet. Return an empty array if no primary vet exists.

**Acceptance Criteria:**
1. The `veterinarians` field uses an IIFE (matching the `emergency_contacts` pattern at lines 150-159)
2. `vets.find(v => v.is_primary)` is used to locate the primary vet
3. When no primary vet exists, an empty array `[]` is returned
4. When a primary vet exists, exactly one element is returned with fields: `clinic_name`, `vet_name`, `phone`, `is_primary`
5. The `getPetVets(pet.id)` call at line 63 is NOT modified (it still fetches all vets)
6. No other lines in the file are changed
7. Comment above the block reads: `// Veterinarian info -- only show primary vet on emergency card`

**parallel_group:** A

---

### task-002: Add tests for primary vet emergency card filtering

**File:** `backend/src/__tests__/primary-vet-emergency-card.test.ts` (new file)

**Change:** Create a test file using the structural verification approach (reading `public.ts` source and asserting on content patterns), consistent with `backend/src/routes/pets.test.ts` and `backend/src/set-primary-emergency-contact.test.ts`.

**Acceptance Criteria:**
1. Test file imports `vitest` (describe, it, expect) and `fs/promises` -- matching the test pattern in `backend/src/routes/pets.test.ts`
2. Test reads `backend/src/routes/public.ts` via `fs.readFile`
3. Test asserts that the `veterinarians` field in `buildEmergencyCard` uses `vets.find(v => v.is_primary)` (not `vets.map`)
4. Test asserts that when no primary vet is found, an empty array is returned (pattern: `if (!primary) return []` or equivalent)
5. Test asserts that the result is wrapped in a single-element array: `return [{ clinic_name: primary.clinic_name ... }]`
6. Test asserts that `getPetVets` is still called without filtering (the shared query is unchanged)
7. Test asserts that the emergency_contacts IIFE pattern is still intact (regression check)
8. All tests pass with `npx vitest run backend/src/__tests__/primary-vet-emergency-card.test.ts`

**parallel_group:** A

---

## Dependency Graph

```
task-001 ──┐
           ├── (both in parallel_group A, but task-002 reads task-001's output file)
task-002 ──┘
```

Both tasks are in parallel_group A, but there is a soft dependency: task-002's structural assertions must match task-001's implementation. If implemented by different agents, they should coordinate on the exact code patterns. If implemented sequentially, task-002 should run after task-001.

**Recommended execution order:** task-001 first, then task-002.

---

## Files NOT Modified (confirmation)

These files are explicitly **not** changed, and the plan should verify no regressions:

| File | Reason |
|------|--------|
| `backend/src/models/health-records.ts` | `getPetVets()` is a shared query; filtering at the model layer would break the Care Team tab |
| `backend/src/routes/pets.ts` | Authenticated vet CRUD endpoints are unaffected |
| `frontend/src/components/EmergencyCardView.tsx` | Already uses `veterinarians.map()` which handles 0 or 1 items correctly |
| `frontend/src/pages/pet-profile/EmergencyCardPreview.tsx` | Does not display vets -- only shows alerts and primary contact |
| `frontend/src/pages/pet-profile/tabs/VetsTab.tsx` | Care Team tab, shows all vets, unaffected |
| `frontend/src/pages/pet-profile/sections/CareTeamSection.tsx` | Wraps VetsTab + ContactsTab, unaffected |
| `frontend/src/api/client.ts` | `EmergencyCard` type already has `veterinarians: Array<...>` -- a 0-or-1 element array is valid |
| `frontend/src/pages/PublicCard.tsx` | Consumes `EmergencyCard` type, no change needed |
| `frontend/src/pages/TokenCard.tsx` | Consumes `EmergencyCard` type, no change needed |

---

## Risk Assessment

### Low Risk
- **Cache staleness:** The `buildEmergencyCard` function's output is cached for 5 minutes (line 47 of `public.ts`). After deploying, cached cards may still show all vets until the cache expires. This is acceptable -- no action needed. The `invalidateCardCache` function is already called when vets are modified.
- **Empty vet display:** If no primary vet is set, the emergency card shows zero vets. The `EmergencyCardView.tsx` component handles this gracefully because `veterinarians.map()` on an empty array renders nothing.

### No Risk
- **Care Team tab:** Uses `GET /pets/:id/vets` which calls `getPetVets()` directly (not via `buildEmergencyCard`). Completely separate code path.
- **Vet CRUD operations:** Add/edit/delete/set-primary vet endpoints in `pets.ts` are unaffected.
- **Document import:** The document classifier in `document-classifier.ts` always sets `is_primary: false` for extracted vets. This is unchanged.

### Verification Steps
1. Create a pet with 2+ vets, one marked primary
2. View the public emergency card -- only the primary vet should appear
3. Remove the primary designation from all vets
4. View the emergency card again -- no vets should appear
5. View the Care Team tab -- all vets should still appear
6. Share the card via token link -- same filtering applies (both `/card/:shareId` and `/token/:token/access` use `buildEmergencyCard`)
