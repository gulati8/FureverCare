# Changelog

## [Unreleased] — Primary Vet on Emergency Card

### Summary

The public-facing emergency pet card now shows only the primary veterinarian instead of all vets in the care team.

---

### User-Facing Behavior Change

Previously, every vet added to a pet's care team appeared on the emergency card. Now only the vet marked as primary is shown. If no vet is set as primary, no veterinarian entry appears on the card at all. This applies to both access paths: direct share links and PIN-protected share tokens.

The Care Team section inside the app is unaffected. All vets remain visible there with full management capabilities.

---

### API Changes

**Affected endpoints** (both call the same `buildEmergencyCard()` helper):

- `GET /api/public/card/:shareId`
- `POST /api/public/token/:token/access`

**`veterinarians` field behavior — before and after:**

| Scenario | Before | After |
|---|---|---|
| Pet has N vets, one is primary | Array of N entries | Array of 1 entry (primary only) |
| Pet has N vets, none is primary | Array of N entries | Empty array `[]` |
| Pet has no vets | Empty array `[]` | Empty array `[]` (unchanged) |

The field type is unchanged: `veterinarians` remains an `Array<{ clinic_name, vet_name, phone, is_primary }>`. No schema migration is required.

**Implementation** (`backend/src/routes/public.ts`, lines 142–151):

```typescript
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

This mirrors the existing pattern used for `emergency_contacts`, with one difference: emergency contacts fall back to the first contact if none is marked primary; veterinarians do not — an absent primary means an empty array.

---

### Frontend Change

`EmergencyCardView.tsx` now renders the vet entry with a fixed label of "Primary Veterinarian" instead of the previous conditional `Veterinarian (Primary)` / `Veterinarian`. Because the backend now guarantees at most one entry and it is always the primary, the conditional was removed.

---

### Migration Notes for API Consumers

Any client consuming the public card API should be aware that `veterinarians` now contains **at most 1 entry**. Clients that iterated over all entries to display multiple vets will now display zero or one. No field names or types have changed, so no deserialization changes are required.

---

### Cache Behavior — Known Issue (Pre-existing)

The emergency card response is cached in Redis for 5 minutes (`cacheKey = pet:<shareId>`, TTL 300s). This cache is invalidated by `invalidateCardCache()` in `pets.ts` when certain pet data changes, but the `setPrimaryVet` endpoint (`PATCH /api/pets/:id/vets/:vetId/primary`) does **not** call `invalidateCardCache()`. This means that after a user changes which vet is primary, the public card may continue showing the previous primary vet for up to 5 minutes.

This bug predates this feature and is not introduced here. It is more visible now because the card shows only one vet. Tracked for a follow-up fix: add `await invalidateCardCache(petId)` to the `setPrimaryVet` handler in `backend/src/routes/pets.ts` after the primary vet update is written.

---

### Files Changed

| File | Change |
|---|---|
| `backend/src/routes/public.ts` | `buildEmergencyCard()`: `veterinarians` mapping replaced with primary-only filter |
| `frontend/src/components/EmergencyCardView.tsx` | Vet label changed from conditional `Veterinarian (Primary)` to static `Primary Veterinarian` |

### Files Verified Unchanged

| File | Reason |
|---|---|
| `backend/src/routes/pets.ts` | Authenticated `GET /:id/vets` still returns all vets |
| `backend/src/models/health-records.ts` | `getPetVets()` still queries all vets; filtering is at the route layer |
| `frontend/src/pages/pet-profile/tabs/VetsTab.tsx` | Full vet management UI unaffected |
| `frontend/src/pages/pet-profile/sections/CareTeamSection.tsx` | Still renders full VetsTab |
