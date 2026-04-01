# Architecture: Show Only Primary Vet on Emergency Card

## Approach and Rationale

I see three layers in this system where the filtering could happen -- database, API, or frontend -- and only one is correct.

**Database layer (rejected):** The `getPetVets(petId)` function in `backend/src/models/health-records.ts` (line 54) is a shared query. It is called by both the authenticated Care Team endpoints (`GET /pets/:id/vets` in `pets.ts` line 180) and by `buildEmergencyCard` in `public.ts` (line 63). Adding a `WHERE is_primary = true` clause here would break the Care Team tab, which must show all vets.

**Frontend layer (rejected):** The `EmergencyCardView.tsx` component receives a `veterinarians` array and renders it with `.map()`. We could filter client-side, but this would mean non-primary vet data still travels over the wire to the public emergency card endpoint -- a security consideration since the card is unauthenticated.

**API layer (chosen):** The `buildEmergencyCard` function in `backend/src/routes/public.ts` is the single point where emergency card data is shaped for output. It already filters other record types (conditions by `is_active && show_on_card`, medications by `is_active && show_on_card`, emergency contacts to primary-only). Filtering vets here is the natural, consistent choice.

## Data Flow

```
Database                     API Layer                          Frontend
---------                    ---------                          --------
pet_vets table               buildEmergencyCard()               EmergencyCardView.tsx
  ALL rows for pet    --->     getPetVets(petId)     --->        veterinarians.map(v => ...)
                               vets.find(v =>                    Renders 0 or 1 vet cards
                                 v.is_primary)
                               Returns [primary] or []

Care Team path (unchanged):
  ALL rows for pet    --->   GET /pets/:id/vets       --->      VetsTab.tsx
                               getPetVets(petId)                 vets.map(v => ...)
                               Returns all vets                  Renders all vet items
```

Both the `/card/:shareId` (line 25) and `/token/:token/access` (line 199) routes in `public.ts` call `buildEmergencyCard`, so the filtering applies to both public access methods.

## Component Boundaries

### Modified

- **`backend/src/routes/public.ts`** -- The `buildEmergencyCard` helper function. Specifically the `veterinarians:` property in the return object (lines 142-147). This is a private function within the routes file; it is not exported.

### Unchanged (verified)

- **`backend/src/models/health-records.ts`** -- `getPetVets()` remains a shared, unfiltered query returning all vets.
- **`backend/src/routes/pets.ts`** -- All authenticated vet CRUD endpoints (`GET/POST/PATCH/DELETE /pets/:id/vets/*`) are unaffected.
- **`frontend/src/components/EmergencyCardView.tsx`** -- Already uses `veterinarians.map()` which handles empty arrays correctly. Lines 266-283 render 0 cards when the array is empty.
- **`frontend/src/pages/pet-profile/EmergencyCardPreview.tsx`** -- This preview component does not render veterinarians at all; it shows alerts and the primary emergency contact.
- **`frontend/src/pages/pet-profile/tabs/VetsTab.tsx`** -- Care Team tab, uses the authenticated `/pets/:id/vets` endpoint directly.
- **`frontend/src/api/client.ts`** -- The `EmergencyCard` type defines `veterinarians` as `Array<...>`, which is valid for 0 or 1 elements.

## Interface Definitions

The `EmergencyCard` TypeScript interface (defined in `frontend/src/api/client.ts` at line 330) remains unchanged:

```typescript
veterinarians: Array<{
  clinic_name: string;
  vet_name: string | null;
  phone: string | null;
  is_primary: boolean;
}>;
```

The only difference is that the array will now contain 0 or 1 elements instead of 0 to N elements.

## Patterns to Follow

### IIFE filtering pattern (from `public.ts` lines 150-159)

The emergency contacts field already uses this exact pattern:

```typescript
emergency_contacts: (() => {
  if (emergencyContacts.length === 0) return [];
  const primary = emergencyContacts.find(c => c.is_primary) || emergencyContacts[0];
  return [{ ... }];
})(),
```

The vet filtering will use the same structure, but without the fallback (per spec: "If no primary vet is set, emergency card shows no vet"):

```typescript
veterinarians: (() => {
  const primary = vets.find(v => v.is_primary);
  if (!primary) return [];
  return [{ ... }];
})(),
```

### Structural test pattern (from `pets.test.ts` and `set-primary-emergency-contact.test.ts`)

Tests in this codebase verify code structure by reading source files and asserting on string patterns. This approach is used because:
- `buildEmergencyCard` is a private (non-exported) function
- The codebase does not have a test database harness for integration tests
- The existing test files (`pets.test.ts`, `set-primary-emergency-contact.test.ts`) establish this as the convention

## Cache Considerations

The `buildEmergencyCard` output is cached for 5 minutes in Redis (line 47 of `public.ts`). The existing `invalidateCardCache(petId)` function (defined in `pets.ts` line 63-68) is already called when:
- Vets are added/updated/deleted (`POST/PATCH/DELETE /pets/:id/vets/*`)
- Primary vet is changed (`PATCH /pets/:id/vets/:vetId/primary`)

However, I note that the vet CRUD endpoints in `pets.ts` do NOT currently call `invalidateCardCache`. The `POST` vet endpoint (line 187) and `DELETE` vet endpoint (line 200) do not invalidate the cache. This is a pre-existing issue that is NOT in scope for this change, but worth noting: after adding a new vet, the cached emergency card may be stale for up to 5 minutes. The `PATCH /primary` endpoint (line 231) also does not call `invalidateCardCache`.

This pre-existing gap does not affect the correctness of the filtering change.
