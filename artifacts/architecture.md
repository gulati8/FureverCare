# Architecture: Rename "Special Instructions" to "Owner's Notes" and Elevate to Health Profile

## Approach and Rationale

This feature is a coordinated rename and relocation. The database column `special_instructions` stays untouched -- all changes happen at the API response layer and the frontend display layer. The rename flows through three distinct boundaries:

1. **Backend API layer** -- The `Pet` model internally still uses `special_instructions` from the database, but all outbound JSON responses alias it to `owners_notes`. The Zod validation schema and `updatePet` allowedFields list continue to accept `special_instructions` as the internal column name, but we add `owners_notes` as an accepted input alias that maps to the same column. The public emergency card endpoint also renames the field in its response payload.

2. **Frontend type layer** -- The `Pet` interface, `CreatePetInput` interface, and `EmergencyCard` interface in `client.ts` are updated so the field is `owners_notes` throughout. Every component that reads or writes this field is updated to use the new name.

3. **Frontend display layer** -- The "Special Instructions" section is removed from the OverviewTab and relocated into the HealthRecordsSection as a new expand/collapse accordion (following the existing `<details>` / `health-accordion` pattern). The EmergencyCardView keeps its yellow callout but updates the label text. The EditPetModal updates the field label.

## Data Flow

### Read Path (authenticated)
```
Database (special_instructions column)
  -> backend/src/models/pet.ts: SELECT * returns row with special_instructions
  -> backend/src/routes/pets.ts: GET /pets/:id returns raw row (field is special_instructions from DB)
     ** We add a transform here to alias special_instructions -> owners_notes in the response **
  -> frontend/src/api/client.ts: Pet interface uses owners_notes
  -> Components render owners_notes
```

### Read Path (public emergency card)
```
Database (special_instructions column)
  -> backend/src/routes/public.ts: buildEmergencyCard() explicitly maps pet.special_instructions
     ** Change: map to owners_notes instead of special_instructions in the response object **
  -> frontend/src/api/client.ts: EmergencyCard.pet uses owners_notes
  -> EmergencyCardView renders owners_notes
```

### Write Path
```
Frontend form submits { owners_notes: "..." }
  -> backend/src/routes/pets.ts: Zod schema validates owners_notes field
     ** We add a transform that maps owners_notes -> special_instructions before passing to updatePet **
  -> backend/src/models/pet.ts: updatePet writes to special_instructions column
  -> Response transforms special_instructions -> owners_notes before sending back
```

## Component Boundaries

### Backend Changes (3 files)

1. **`backend/src/routes/pets.ts`** -- The Zod schemas (`createPetSchema`, `updatePetSchema`) need to accept `owners_notes` as the field name. Before calling `createPet()` or `updatePet()`, map `owners_notes` to `special_instructions` in the request body. After receiving the result, transform `special_instructions` to `owners_notes` in every response that returns a Pet object (GET /pets, GET /pets/:id, POST /pets, PATCH /pets/:id). A response transform helper function is the cleanest approach.

2. **`backend/src/routes/public.ts`** -- In `buildEmergencyCard()`, change `special_instructions: pet.special_instructions` to `owners_notes: pet.special_instructions`.

3. **`backend/src/models/pet.ts`** -- No changes to the model itself. The `Pet` interface and SQL queries continue using `special_instructions` internally. The aliasing happens at the route layer. However, the `Pet` interface is exported and used by routes, so the routes need to understand they receive `special_instructions` from the model and transform it.

### Frontend Changes (4 files)

1. **`frontend/src/api/client.ts`** -- Rename `special_instructions` to `owners_notes` in the `Pet` interface, `CreatePetInput` interface, and `EmergencyCard.pet` sub-interface.

2. **`frontend/src/pages/pet-profile/tabs/OverviewTab.tsx`** -- Remove the entire `special_instructions` section (the `<div>` block from roughly line 146-177). Remove `special_instructions` from the `OverviewField` type union, the `fieldConfigs` record, and the `handleSaveField` switch case.

3. **`frontend/src/pages/pet-profile/sections/HealthRecordsSection.tsx`** -- Add a new `<details class="health-accordion">` section after the Vaccinations accordion and before the Card Alerts accordion. This section displays the Owner's Notes text with an inline edit capability. It reads `pet.owners_notes` from context and uses the existing `petsApi.update()` to save changes. The accordion follows the exact same `health-accordion` / `health-accordion-summary` / `health-accordion-content` pattern used by all other sections.

4. **`frontend/src/components/EmergencyCardView.tsx`** -- Change `pet.special_instructions` to `pet.owners_notes` in two places (the conditional check and the text render). Change the label from "Special Instructions" to "Owner's Notes".

5. **`frontend/src/components/EditPetModal.tsx`** -- Change `special_instructions` to `owners_notes` in formData initialization (line 28), onChange handler (lines 206-207), and the label text (line 204).

## Interface Definitions

### Backend Response Transform

A helper function `transformPetResponse(pet)` will be introduced in `pets.ts` that takes a raw Pet from the model and returns a new object with `special_instructions` renamed to `owners_notes`. This is applied to every route handler that returns pet data.

```
// Conceptual signature (not implementation)
function transformPetResponse(pet: Pet): PetResponse {
  const { special_instructions, ...rest } = pet;
  return { ...rest, owners_notes: special_instructions };
}
```

### Frontend Pet Interface (after change)

The `Pet` interface in `client.ts` will have `owners_notes: string | null` instead of `special_instructions: string | null`. Same for `CreatePetInput` (`owners_notes?: string`) and `EmergencyCard.pet` (`owners_notes: string | null`).

### Health Records Section -- Owner's Notes Accordion

The new accordion in `HealthRecordsSection.tsx` needs access to the pet object from context. Currently, the context (`PetProfileContext`) provides `pet` and `handlePetUpdated`. The section already has access to the context via `usePetProfileContext()`, but currently only destructures health record arrays. It will additionally destructure `pet`, `handlePetUpdated`, and `token` (which it already has).

The accordion content will be a simple display of the text with an edit button that opens an inline edit form (using the same `InlineEditForm` component already used in OverviewTab), or a direct textarea toggle pattern.

## Patterns to Follow

1. **Accordion pattern**: Use `<details className="health-accordion">` with `<summary className="health-accordion-summary">` and `<div className="health-accordion-content">` exactly as done for Conditions, Allergies, Medications, Vaccinations, and Alerts in `HealthRecordsSection.tsx`.

2. **Inline editing pattern**: Use the `InlineEditForm` component with a textarea field, following the same pattern currently used in OverviewTab for special_instructions editing.

3. **API response transformation**: Apply the transform consistently to every route that returns a Pet. The routes that return Pet objects are: `GET /pets` (list), `GET /pets/:id`, `POST /pets`, `PATCH /pets/:id`, `POST /pets/:id/regenerate-share-id` (returns share_id only, not full pet -- skip this one).

4. **Context usage pattern**: Access pet data and mutation handlers from `usePetProfileContext()` as all other sections do.

5. **Emergency card callout pattern**: The existing yellow callout box in `EmergencyCardView.tsx` (lines 204-218) already has the correct visual treatment. Only the label text and field name references need updating.

## Risks and Edge Cases

1. **Cached emergency cards**: The Redis cache stores the old shape (`special_instructions`). After deployment, cached responses will still have the old field name until they expire (5-minute TTL). This is a minor, self-resolving issue. If needed, a cache flush can be done post-deploy.

2. **Seed data**: `backend/src/db/seed.ts` uses `special_instructions` in its insert statements. This is internal to the seed and writes directly to the database column, so no change is needed. The seed data will be transformed when read through the API.

3. **EditPetModal vs HealthRecordsSection editing**: After this change, Owner's Notes can be edited from two places: the EditPetModal (full pet edit form) and the HealthRecordsSection inline editor. Both write to the same field via `petsApi.update()`. This is fine -- the EditPetModal is a fallback edit path and the inline editor in Health Records becomes the primary path.

4. **API backward compatibility**: Any external consumers of the public card API (`/api/public/card/:shareId`) will see `owners_notes` instead of `special_instructions`. Since this is a first-party frontend, this is acceptable. The field name change is intentional per the requirements.

5. **The `allowedFields` array in `updatePet()`**: This array in the model validates which fields can be updated. It currently includes `special_instructions`. Since the route layer will map `owners_notes` back to `special_instructions` before calling `updatePet()`, the model's allowedFields list does not need to change.
