# Implementation Plan: Show Only Primary Vet on Emergency Card

## Context

### Current Architecture

The emergency card is a public-facing view of a pet's critical health information, designed for emergency veterinary situations. It is served through two pathways:

1. **Direct share link**: `GET /api/public/card/:shareId` -- fetches pet by `share_id`
2. **Token-based access**: `POST /api/public/token/:token/access` -- fetches pet via a share token (supports PIN protection)

Both pathways call the same `buildEmergencyCard(pet)` helper function defined in `/Users/amitgulati/Projects/JPD/FureverCare/backend/src/routes/public.ts` (line 57). This function fetches all vets via `getPetVets(pet.id)` and maps every vet into the response payload at line 142-147:

```typescript
veterinarians: vets.map(v => ({
  clinic_name: v.clinic_name,
  vet_name: v.vet_name,
  phone: v.phone,
  is_primary: v.is_primary,
})),
```

The frontend component `EmergencyCardView` at `/Users/amitgulati/Projects/JPD/FureverCare/frontend/src/components/EmergencyCardView.tsx` renders all veterinarians with `veterinarians.map(...)` at line 266-283, iterating over every vet in the array without filtering.

### Key Files Involved

| Layer | File | Role |
|-------|------|------|
| **Backend: API route** | `backend/src/routes/public.ts` | `buildEmergencyCard()` assembles the emergency card JSON; lines 62, 142-147 are the vet-related code |
| **Backend: Model** | `backend/src/models/health-records.ts` | `getPetVets()` (line 54) queries `SELECT * FROM pet_vets WHERE pet_id = $1 ORDER BY is_primary DESC, created_at` |
| **Frontend: Card renderer** | `frontend/src/components/EmergencyCardView.tsx` | Renders all `veterinarians` from the card data at lines 266-283 |
| **Frontend: API types** | `frontend/src/api/client.ts` | `EmergencyCard` interface defines `veterinarians: Array<{...}>` at line 354 |
| **Frontend: Card preview** | `frontend/src/pages/pet-profile/EmergencyCardPreview.tsx` | In-app preview widget; does NOT currently show vets (only shows alerts and primary emergency contact) |
| **Frontend: Care Team** | `frontend/src/pages/pet-profile/sections/CareTeamSection.tsx` | Uses `VetsTab` to show all vets; must remain unchanged |
| **Frontend: VetsTab** | `frontend/src/pages/pet-profile/tabs/VetsTab.tsx` | Full vet management UI; must remain unchanged |
| **Backend: Pets routes** | `backend/src/routes/pets.ts` | Authenticated `GET /:id/vets` returns all vets for care team; must remain unchanged |

### Existing Pattern: Emergency Contacts

The emergency contacts already follow the exact pattern we want for vets. In `buildEmergencyCard()` at lines 150-159, emergency contacts are filtered to only the primary:

```typescript
emergency_contacts: (() => {
  if (emergencyContacts.length === 0) return [];
  const primary = emergencyContacts.find(c => c.is_primary) || emergencyContacts[0];
  return [{ name: primary.name, relationship: primary.relationship, phone: primary.phone, is_primary: primary.is_primary }];
})(),
```

However, per the feature request acceptance criteria, the vet behavior should be slightly different: "If no primary vet is set, emergency card shows **no vet** (not all vets)." This differs from emergency contacts which fall back to the first contact.

---

## Tasks

### Task 1: Filter vets to primary-only in `buildEmergencyCard()` (Backend)

**File**: `/Users/amitgulati/Projects/JPD/FureverCare/backend/src/routes/public.ts`

**Lines to change**: 142-147

**Current code**:
```typescript
veterinarians: vets.map(v => ({
  clinic_name: v.clinic_name,
  vet_name: v.vet_name,
  phone: v.phone,
  is_primary: v.is_primary,
})),
```

**Change to**: Filter `vets` to only include the one where `is_primary === true`. If none is primary, return an empty array. Use the same IIFE pattern used for `emergency_contacts` on lines 150-159 of the same file.

The replacement logic should be:
```
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

**Acceptance criteria**:
- When a pet has 3 vets and 1 is primary, the `veterinarians` array in the response contains exactly 1 entry.
- When a pet has vets but none is primary, the `veterinarians` array is empty (`[]`).
- When a pet has 0 vets, the `veterinarians` array is empty (`[]`).
- The `EmergencyCard` TypeScript interface in the frontend does NOT need to change -- it already types `veterinarians` as an array, so returning 0 or 1 items is valid.

**Parallel group**: A

---

### Task 2: Verify frontend `EmergencyCardView` handles 0 or 1 vets gracefully (Frontend)

**File**: `/Users/amitgulati/Projects/JPD/FureverCare/frontend/src/components/EmergencyCardView.tsx`

**Lines to inspect**: 265-283

**Current code** (lines 266-283):
```tsx
{veterinarians.map((v, i) => (
  <div key={i} className="flex items-center gap-3" ...>
    ...
    <div style={{ ... }}>
      Veterinarian{v.is_primary ? ' (Primary)' : ''}
    </div>
    <div ...>{v.clinic_name}</div>
    {v.vet_name && <div ...>Dr. {v.vet_name}</div>}
    {v.phone && <div ...>{v.phone}</div>}
    ...
  </div>
))}
```

**Analysis**: The `.map()` on an empty array produces no output, which is correct behavior. When the array has 1 entry, it renders exactly one card. No code change is technically required here for the basic functionality.

**However**, there is one improvement to consider: since the backend will now only ever send the primary vet (or none), the label `Veterinarian{v.is_primary ? ' (Primary)' : ''}` is redundant -- the vet shown is always the primary. The label should simply read `"Primary Veterinarian"` when a vet is present, without the conditional suffix.

**Change**: On line 270, change the label from:
```
Veterinarian{v.is_primary ? ' (Primary)' : ''}
```
to:
```
Primary Veterinarian
```

This is a single-line change. If the backend sends 0 vets, the `.map()` produces nothing, so this label is never rendered in that case.

**Acceptance criteria**:
- When the emergency card has 1 vet, it renders with the label "Primary Veterinarian".
- When the emergency card has 0 vets, no veterinarian card is rendered at all.
- No changes to the rest of the `EmergencyCardView` component.

**Parallel group**: A (independent from Task 1 -- touches different file, and the label change is correct regardless of when the backend change lands)

---

### Task 3: Add backend test for primary-vet-only emergency card response

**File**: `/Users/amitgulati/Projects/JPD/FureverCare/backend/src/routes/pets.test.ts`

**Context**: The existing test file at this path already contains structural verification tests for the primary vet endpoint. Add new tests that verify the `buildEmergencyCard` logic in `public.ts`.

**New tests to add** (append to the existing file):

1. **Test**: `buildEmergencyCard veterinarians field should only contain primary vet`
   - Read `backend/src/routes/public.ts` and verify the `veterinarians:` mapping uses `.find(v => v.is_primary)` rather than `.map()`.

2. **Test**: `buildEmergencyCard should return empty veterinarians when no primary vet exists`
   - Verify the code path handles `vets.find(v => v.is_primary)` returning `undefined` by returning `[]`.

3. **Test**: `emergency_contacts pattern should be the model for veterinarians filtering`
   - Verify both `emergency_contacts` and `veterinarians` use the same filtering approach (IIFE with `.find()`).

These are structural tests following the existing pattern in the file (which reads source files and verifies code patterns).

**Acceptance criteria**:
- All 3 new tests pass.
- Existing tests in the file still pass.
- Tests follow the same structural verification pattern used in the existing tests (reading source files, checking for patterns).

**Parallel group**: B (depends on Task 1 completing first, since the tests verify the changed code)

---

### Task 4: Verify no changes needed in Care Team and authenticated endpoints

**This is a verification task, not a code-change task.**

**Files to verify remain UNCHANGED**:
- `/Users/amitgulati/Projects/JPD/FureverCare/backend/src/routes/pets.ts` -- The authenticated `GET /:id/vets` endpoint (line 174) must still return ALL vets via `getPetVets()`. No filter should be added here.
- `/Users/amitgulati/Projects/JPD/FureverCare/frontend/src/pages/pet-profile/tabs/VetsTab.tsx` -- Must still show all vets with "Set as Primary" buttons. No changes.
- `/Users/amitgulati/Projects/JPD/FureverCare/frontend/src/pages/pet-profile/sections/CareTeamSection.tsx` -- Must still render the full VetsTab. No changes.
- `/Users/amitgulati/Projects/JPD/FureverCare/backend/src/models/health-records.ts` -- `getPetVets()` must remain unchanged (returns all vets). The filtering happens at the route level in `public.ts`, not in the model.

**Acceptance criteria**:
- None of the 4 files listed above are modified.
- Running the existing e2e test suite for primary vet selection (`frontend/e2e/primary-vet-selection.spec.ts`) still passes.

**Parallel group**: B (run after Task 1 and Task 2 to confirm no regressions)

---

## Task Dependency Graph

```
Task 1 (Backend filter)  ──┐
                            ├──> Task 3 (Backend tests) ──> Task 4 (Regression check)
Task 2 (Frontend label)  ──┘
```

- **Parallel group A**: Task 1 and Task 2 can run simultaneously. They touch different files (`public.ts` vs `EmergencyCardView.tsx`) with no shared interfaces.
- **Parallel group B**: Task 3 and Task 4 depend on both Task 1 and Task 2 being complete.

---

## Testing Strategy

### Unit / Structural Tests (Task 3)
- Verify `public.ts` source code patterns match the expected filtering logic.
- Pattern: structural file-reading tests, consistent with existing `pets.test.ts`.

### Manual / E2E Verification (Task 4)
- **Primary vet scenario**: Pet has 2+ vets, one is primary. View the public emergency card. Only the primary vet should appear.
- **No primary vet scenario**: Pet has vets but none is primary. View the public emergency card. No vet section should appear.
- **Zero vets scenario**: Pet has no vets. View the public emergency card. No vet section should appear.
- **Care Team regression**: Navigate to the Care Team section in the authenticated app. All vets should still be visible with full management capabilities (add/edit/delete/set-primary).
- **Existing e2e tests**: `frontend/e2e/primary-vet-selection.spec.ts` and `frontend/e2e/public-card.spec.ts` should still pass.

### Redis Cache Invalidation
The emergency card response is cached for 5 minutes (line 47 of `public.ts`). After a user changes which vet is primary, the cache is invalidated via `invalidateCardCache()` in `pets.ts` -- but note that the `setPrimaryVet` endpoint in `pets.ts` (line 231-259) does NOT currently call `invalidateCardCache()`. This is a pre-existing bug that is out of scope for this feature, but worth noting. The vet primary-change endpoint returns the vet list but does not flush the cached emergency card.

---

## Risk Assessment

### Low Risk
- **Breaking the Care Team view**: Risk is minimal because the filtering is done only in `buildEmergencyCard()` in `public.ts`. The authenticated `GET /pets/:id/vets` endpoint in `pets.ts` is completely separate and will not be touched.
- **TypeScript type incompatibility**: The `EmergencyCard.veterinarians` field is already typed as `Array<{...}>`, so returning 0 or 1 items is perfectly valid. No type changes needed.

### Medium Risk
- **Redis cache staleness**: As noted above, the `setPrimaryVet` endpoint does not call `invalidateCardCache()`. After changing which vet is primary, the public card may still show the old primary vet for up to 5 minutes. This is a pre-existing issue, not introduced by this change, but it becomes more visible now since the card shows only one vet.
  - **Recommendation**: Consider adding `await invalidateCardCache(petId);` to the `setPrimaryVet` handler in `pets.ts` (around line 249, after `await setPrimaryVet(petId, vetId, audit);`). This is a one-line addition but is technically out of scope.

### Low Risk
- **EmergencyCardPreview (in-app preview widget)**: The file at `frontend/src/pages/pet-profile/EmergencyCardPreview.tsx` does NOT display vets at all -- it only shows alerts and the primary emergency contact. No changes needed.

### No Risk
- **Admin panel**: The admin `PetDetailModal` fetches vets through its own admin API, not through the public emergency card endpoint. It is unaffected.
