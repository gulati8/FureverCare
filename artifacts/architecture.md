# Architecture: Rename "Special Instructions" to "Owner's Notes"

## Approach and Rationale

This feature has two dimensions: a rename (display + API layer) and a relocation (moving the field from the Overview tab to the Health Profile section). The database column `special_instructions` stays unchanged -- no migration is needed. The rename happens at three boundaries:

1. **Backend model layer**: SQL queries alias `special_instructions AS owners_notes` so the TypeScript `Pet` interface uses `owners_notes`. The `updatePet` function maps `owners_notes` back to the `special_instructions` column for writes.
2. **Backend API layer**: Zod validation schemas accept `owners_notes`. The public emergency card endpoint maps the field in the response builder.
3. **Frontend**: TypeScript interfaces change from `special_instructions` to `owners_notes`. All component references follow.

The relocation removes Owner's Notes from `OverviewTab.tsx` and adds a new accordion section to `HealthRecordsSection.tsx`, using the existing `health-accordion` CSS pattern.

## Data Flow

### Read Path (GET /api/pets/:id)
```
Database (special_instructions column)
  -> SQL: SELECT ..., special_instructions AS owners_notes, ...
  -> Backend Pet interface: { owners_notes: string | null }
  -> Express JSON response: { owners_notes: "..." }
  -> Frontend Pet type: { owners_notes: string | null }
  -> HealthRecordsSection renders in accordion
  -> EmergencyCardView renders in yellow callout
```

### Write Path (PATCH /api/pets/:id)
```
Frontend form: { owners_notes: "new value" }
  -> API call: PATCH /api/pets/:id body { owners_notes: "..." }
  -> Zod validates `owners_notes` field
  -> updatePet maps owners_notes -> special_instructions for SQL
  -> SQL: UPDATE pets SET special_instructions = $1
  -> Returns aliased: SELECT ..., special_instructions AS owners_notes
  -> Frontend receives updated Pet with owners_notes
```

### Public Emergency Card (GET /api/public/card/:shareId)
```
Database (special_instructions column)
  -> buildEmergencyCard() reads pet.special_instructions
  -> Maps to response: { pet: { owners_notes: pet.special_instructions } }
  -> EmergencyCardView reads card.pet.owners_notes
```

## Component Boundaries

### Backend Files Affected

| File | Change | Why |
|------|--------|-----|
| `backend/src/models/pet.ts` | Alias column in SELECT queries; map field name in writes | Core data layer |
| `backend/src/routes/pets.ts` | Rename field in Zod schema | Request validation |
| `backend/src/routes/public.ts` | Rename field in emergency card response | Public API |
| `backend/src/db/seed.ts` | Rename field in seed data objects | Dev data consistency |

### Frontend Files Affected

| File | Change | Why |
|------|--------|-----|
| `frontend/src/api/client.ts` | Rename field in Pet, CreatePetInput, EmergencyCard interfaces | Type foundation |
| `frontend/src/pages/pet-profile/tabs/OverviewTab.tsx` | Remove entire special_instructions section | Field relocation |
| `frontend/src/pages/pet-profile/sections/HealthRecordsSection.tsx` | Add new Owner's Notes accordion | Field relocation |
| `frontend/src/components/EmergencyCardView.tsx` | Rename field reference and label | Display rename |
| `frontend/src/components/EditPetModal.tsx` | Rename field reference and label | Edit form rename |

### Files NOT Changed (by design)

| File | Why Not |
|------|---------|
| `backend/src/db/migrate.ts` | Database column stays as `special_instructions` |
| `frontend/src/components/AddPetModal.tsx` | Does not include special_instructions field |
| `frontend/src/pages/pet-profile/EmergencyCardPreview.tsx` | Does not reference special_instructions |
| `docs/redesign/*.html` | Static mockup files, not production code |

## Interface Definitions

### Pet Interface (after change)
```typescript
// backend/src/models/pet.ts
export interface Pet {
  id: number;
  user_id: number;
  share_id: string;
  name: string;
  species: string;
  breed: string | null;
  date_of_birth: Date | null;
  weight_kg: number | null;
  weight_unit: 'lbs' | 'kg' | null;
  sex: string | null;
  is_fixed: boolean;
  microchip_id: string | null;
  photo_url: string | null;
  owners_notes: string | null;    // <-- renamed from special_instructions
  created_at: Date;
  updated_at: Date;
}
```

### CreatePetInput (after change)
```typescript
export interface CreatePetInput {
  user_id: number;
  name: string;
  species: string;
  breed?: string;
  date_of_birth?: string;
  weight_kg?: number;
  weight_unit?: 'lbs' | 'kg';
  sex?: string;
  is_fixed?: boolean;
  microchip_id?: string;
  photo_url?: string;
  owners_notes?: string;    // <-- renamed from special_instructions
}
```

### EmergencyCard.pet (after change)
```typescript
pet: {
  name: string;
  species: string;
  breed: string | null;
  age: string | null;
  date_of_birth: string | null;
  weight_kg: number | null;
  weight_unit: 'lbs' | 'kg' | null;
  sex: string | null;
  is_fixed: boolean;
  microchip_id: string | null;
  photo_url: string | null;
  owners_notes: string | null;    // <-- renamed from special_instructions
}
```

### Zod Validation Schema (after change)
```typescript
const createPetSchema = z.object({
  // ...existing fields...
  owners_notes: z.string().optional(),    // <-- renamed from special_instructions
});
```

## Patterns to Follow from Existing Codebase

### Health Accordion Pattern
The new Owner's Notes section in HealthRecordsSection must use the exact same HTML structure as the existing accordion sections:

```html
<details className="health-accordion">
  <summary className="health-accordion-summary">
    <div className="health-accordion-title">
      {icon SVG}
      Owner's Notes
      {optional badge}
    </div>
    <svg className="health-accordion-chevron" ...>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  </summary>
  <div className="health-accordion-content">
    {content}
  </div>
</details>
```

The CSS for these classes is defined in `frontend/src/index.css` lines 485-539.

### SQL Aliasing Pattern for Column Rename
Since the database column stays as `special_instructions`, all SELECT queries need aliasing. The cleanest approach is to enumerate columns explicitly rather than using `SELECT *`:

```sql
SELECT id, user_id, share_id, name, species, breed, date_of_birth,
       weight_kg, weight_unit, sex, is_fixed, microchip_id, photo_url,
       special_instructions AS owners_notes,
       created_at, updated_at
FROM pets WHERE id = $1
```

For the `updatePet` function, the `allowedFields` array currently contains `'special_instructions'`. This should change to accept `'owners_notes'` as the input field name but map it to `'special_instructions'` for the SQL SET clause:

```typescript
const fieldMapping: Record<string, string> = { owners_notes: 'special_instructions' };
const allowedFields = ['name', 'species', 'breed', 'date_of_birth', 'weight_kg', 'weight_unit', 'sex', 'is_fixed', 'microchip_id', 'photo_url', 'owners_notes'];

for (const field of allowedFields) {
  if ((updates as any)[field] !== undefined) {
    const dbColumn = fieldMapping[field] || field;
    fields.push(`${dbColumn} = $${paramCount++}`);
    values.push((updates as any)[field]);
  }
}
```

### Inline Edit Pattern in Health Records
The existing health tabs (Conditions, Allergies, etc.) use `InlineEditForm` for adding/editing records. However, Owner's Notes is a single text field on the pet itself, not a list of records. The simplest pattern is a direct textarea with Save/Cancel buttons (similar to how the Overview tab handled it), without importing InlineEditForm. This keeps the component lightweight.

### Cache Invalidation
When Owner's Notes is updated via `updatePet`, the existing cache invalidation in the model already handles it (line 115 in pet.ts: `await cacheDelete('pet:${result.share_id}')`). No additional cache logic is needed.

## Risks and Edge Cases

1. **Redis cache**: After deployment, cached emergency card responses will still contain `special_instructions` for up to 5 minutes. Frontend code must handle both field names during this transition window, OR we accept a brief inconsistency. Given the 5-minute TTL, this is acceptable.

2. **SELECT * usage**: The current model uses `SELECT *` for all queries. Changing to explicit column lists with aliasing is a larger diff but is the correct approach. An alternative is to transform the result object after the query returns, but that is less clean.

3. **Concurrent frontend/backend deployment**: If the frontend deploys before the backend, `owners_notes` will be undefined in API responses. If the backend deploys first, the frontend will still read `special_instructions` which won't exist. Deploy both atomically (same commit/PR merged to main triggers a single deploy).

4. **No migration needed**: The database column stays as `special_instructions`. This is validated by the requirement. No migration file should be created.
