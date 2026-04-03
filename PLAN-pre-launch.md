# FureverCare Pre-Launch Implementation Plan

**21 issues, decomposed into 30 tasks across 8 parallel groups**
**Generated: 2026-04-02**

---

## Architecture Overview

The codebase is a React + TypeScript SPA with an Express + TypeScript + PostgreSQL backend. The pet profile is structured as a nested route layout (`PetDetail.tsx` as the parent, with section components rendered via `<Outlet>`). Navigation is handled by `PetProfileNav.tsx` which renders both a desktop sidebar and mobile pill row. Health data flows through a React context (`PetProfileContext`) provided by `PetDetail.tsx`.

Key architectural boundaries:
- **Routing**: `frontend/src/App.tsx` defines routes; `PetDetail.tsx` provides context via `useOutletContext`
- **Navigation**: `PetProfileNav.tsx` renders sidebar + mobile pills; tab labels, icons, and ordering live here
- **Sections**: `frontend/src/pages/pet-profile/sections/` -- one component per tab
- **Tabs**: `frontend/src/pages/pet-profile/tabs/` -- granular UI pieces rendered inside sections
- **Documents**: `frontend/src/components/document-import/DocumentImportSection.tsx` -- monolithic component with `GridCard` and `ListCard` sub-components defined inline
- **Backend models**: `backend/src/models/` -- each file owns one DB table's CRUD
- **Migrations**: Individual files in `backend/src/db/migrate-*.ts`, each registered in `backend/package.json` scripts and `.github/workflows/deploy.yml`
- **CMS**: `cms_pages` + `cms_blocks` tables, public API at `/api/cms/pages/:slug`, admin API for CRUD. Seed scripts in `backend/src/db/seed-cms.ts`

---

## Parallel Group Overview

| Group | Description | Tasks |
|-------|------------|-------|
| **PG-0** | Database migrations (must run first) | 3 tasks |
| **PG-1** | Navigation & terminology (no data deps) | 3 tasks |
| **PG-2** | Pet profile fields & creation | 4 tasks |
| **PG-3** | Emergency card & overview redesign | 5 tasks |
| **PG-4** | Document features | 4 tasks |
| **PG-5** | Health profile navigation & Owner's Notes | 2 tasks |
| **PG-6** | Timeline, sharing, empty state | 3 tasks |
| **PG-7** | Dashboard pet card redesign | 1 task |

**Dependency chain**: PG-0 -> PG-1 through PG-7 (migrations must complete first; remaining groups can run in parallel after PG-0).

Within PG-3: Task 3.1 (remove Card Alerts accordion) should complete before 3.2 (emergency card redesign with modal), since 3.2 replaces the removed functionality.

Within PG-5: Task 5.1 (Owner's Notes rename+move) should complete before 5.2 (section navigation), since 5.2 needs to know the final list of sections including Owner's Notes.

---

## PG-0: Database Migrations

### Task 0.1: Add soft-delete columns to document tables
**Issue**: #104 (prerequisite)
**Complexity**: S
**Files**:
- CREATE `backend/src/db/migrate-soft-delete.ts`
- MODIFY `backend/package.json` (add `db:migrate:soft-delete` and `db:migrate:soft-delete:dev` scripts)
- MODIFY `.github/workflows/deploy.yml` (add migration step)

**Details**:
- Add `deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL` to `document_uploads` table
- Add `deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL` to `document_extractions` table
- Add `deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL` to `document_extraction_items` table
- Add index: `CREATE INDEX IF NOT EXISTS idx_document_uploads_deleted_at ON document_uploads(deleted_at)`
- Follow the exact pattern from `backend/src/db/migrate-vaccination-show-on-card.ts`

**Acceptance criteria**:
- Migration script runs idempotently (uses `ADD COLUMN IF NOT EXISTS`)
- `deleted_at` column defaults to NULL
- Script registered in `package.json` with both prod and dev variants
- Deploy workflow updated with new migration step after `db:migrate:document-groups`

---

### Task 0.2: Add age and color_markings columns to pets table
**Issue**: #98, #99 (prerequisite)
**Complexity**: S
**Files**:
- CREATE `backend/src/db/migrate-pet-age-color.ts`
- MODIFY `backend/package.json` (add scripts)
- MODIFY `.github/workflows/deploy.yml` (add migration step)

**Details**:
- `ALTER TABLE pets ADD COLUMN IF NOT EXISTS age INTEGER` -- whole number years, nullable
- `ALTER TABLE pets ADD COLUMN IF NOT EXISTS color_markings VARCHAR(255)` -- free text, nullable
- Follow migration pattern from existing files

**Acceptance criteria**:
- Both columns are nullable
- `age` is INTEGER type
- `color_markings` is VARCHAR(255)
- Migration runs idempotently

---

### Task 0.3: Add CMS seed for empty state page
**Issue**: #108 (prerequisite)
**Complexity**: S
**Files**:
- CREATE `backend/src/db/seed-cms-empty-state.ts`
- MODIFY `backend/package.json` (add `db:seed:cms-empty-state` and dev variant)

**Details**:
- Create a new CMS page with slug `dashboard-empty-state` and title `Dashboard Empty State`
- Create one block of type `empty_state` with content:
  ```json
  {
    "heading": "Add your first pet to create their profile",
    "subheading": ""
  }
  ```
- Set `is_published: true`, `is_visible: true`
- Follow the exact pattern from `backend/src/db/seed-cms.ts` (check if page exists first, skip if so)

**Acceptance criteria**:
- Seed script is idempotent (skips if page already exists)
- Page has slug `dashboard-empty-state`
- Block has type `empty_state` with heading and optional subheading
- Registered in `package.json`

---

## PG-1: Navigation & Terminology

### Task 1.1: Rename and reorder navigation tabs (#94) + Fix duplicate icons (#110)
**Complexity**: M
**Files**:
- MODIFY `frontend/src/pages/pet-profile/PetProfileNav.tsx`
- MODIFY `frontend/src/index.css` (add divider styles)

**Details**:
The `navItems` array in `PetProfileNav.tsx` (line 29) defines all tabs. Changes:

1. **Reorder and rename** the `navItems` array to:
   - `{ path: basePath, label: 'Overview' }` -- keep existing grid icon
   - `{ path: '${basePath}/documents', label: 'Health Records' }` -- was "Documents" at path `/documents`
   - `{ path: '${basePath}/health', label: 'Health Profile' }` -- was "Health Records" at path `/health`
   - DIVIDER
   - `{ path: '${basePath}/care-team', label: 'Care Team' }` -- keep existing
   - DIVIDER
   - `{ path: '${basePath}/activity', label: 'Timeline' }` -- was "Activity"

2. **Fix duplicate icons**: Currently "Health Records" (heartbeat line) and "Activity" (similar heartbeat line) use nearly identical SVG icons. Assign distinct icons:
   - Overview: grid icon (keep current)
   - Health Records (documents): file/document icon (keep the current Documents file icon)
   - Health Profile: heartbeat/pulse icon (keep current Health Records icon)
   - Care Team: people icon (keep current)
   - Timeline: clock/history icon (replace the Activity heartbeat with a clock)

3. **Dividers**: Add a visual divider element between "Health Profile" and "Care Team", and between "Care Team" and "Timeline". In the desktop sidebar, render as a `<hr>` or `<div>` with class `pet-profile-nav-divider`. In the mobile pill row, dividers are not needed (pills scroll horizontally).

4. **CSS**: Add `.pet-profile-nav-divider` style:
   ```css
   .pet-profile-nav-divider {
     height: 1px;
     background: var(--color-surface-200);
     margin: 4px 8px;
   }
   ```

5. **Update `SECTION_LABELS`** in `frontend/src/pages/PetDetail.tsx` (line 24) to match new names:
   ```
   'health' -> 'Health Profile'
   'documents' -> 'Health Records'
   'activity' -> 'Timeline'
   ```

**Note**: Route paths (`/health`, `/documents`, `/activity`, `/care-team`) remain unchanged in `App.tsx`. Only labels change.

**Acceptance criteria**:
- Tab order is: Overview | Health Records | Health Profile | -- | Care Team | -- | Timeline
- Each tab has a visually distinct icon
- Desktop sidebar shows dividers between Health Profile/Care Team and Care Team/Timeline
- Mobile pills show all tabs without dividers
- Breadcrumb labels match new tab names
- No route path changes needed

---

### Task 1.2: Update document workflow terminology (#95)
**Complexity**: M
**Files**:
- MODIFY `frontend/src/components/document-import/DocumentImportSection.tsx`

**Details**:
Changes within `DocumentImportSection.tsx`:

1. **Remove `FilterStatus` value `'stored'`**: Change the `FilterStatus` type (line 22) from `'all' | 'stored' | 'review' | 'imported'` to `'all' | 'review' | 'processed'`.

2. **Update `getFilterCategory` function** (line 32): Remove `'stored'` category. Documents with status `'uploaded'` should now be in `'all'` only (no dedicated filter). Change `'imported'` to `'processed'`:
   ```
   if (['pending', 'processing', 'pending_review'].includes(status)) return 'review';
   if (['completed'].includes(status)) return 'processed';
   return null; // 'uploaded', 'failed' -- no category filter
   ```

3. **Update filter pills section** (~line 360): Render only `All`, `Needs Review`, `Processed`. Remove the `Stored` and `Imported` pills. Update the labels map.

4. **Remove count badge from `Processed` filter**: When rendering the `Processed` pill, do not show the count badge. Keep badge on `Needs Review` only.

5. **Rename button text**: In `GridCard` (~line 582) and `ListCard` (~line 722), change `'Find Health Records'` to `'Process'`.

6. **Loading state text**: In `GridCard` (~line 543) and `ListCard` (~line 684), change any instance of `'Finding...'` to `'Processing...'`. In `STATUS_LABELS` (line 458), ensure `'pending'` and `'processing'` both show `'Processing...'` (already correct).

7. **Update `STATUS_LABELS`** (line 463): Change `'completed': 'Imported'` to `'completed': 'Processed'`. Remove `'uploaded': 'Stored'` or change to just `'Uploaded'`.

8. **Remove Process button from processed documents**: In `GridCard` and `ListCard`, the action button that shows "Find Health Records" / "Process" should not appear when `upload.status === 'completed'`. Currently it only shows for `isStored || isFailed` which is correct, but verify the "View" button for completed docs stays.

9. **Batch action text**: Change `'Find Records in All'` (~line 314) to `'Process All'`.

**Acceptance criteria**:
- Filter pills show only: All | Needs Review | Processed
- "Processed" filter has no count badge
- "Find Health Records" button text replaced with "Process" everywhere
- All loading states show "Processing..." (not "Finding...")
- Status label for completed documents shows "Processed"
- Batch action button reads "Process All (N)"
- Process button does not appear on already-processed documents

---

### Task 1.3: Update status label for stored documents
**Complexity**: S
**Files**:
- MODIFY `frontend/src/components/document-import/DocumentImportSection.tsx`

**Details**:
In `GridCard`, the overlay badge for stored documents (~line 532) shows the text "Stored". Change to "Uploaded" or remove the status overlay for uploaded-only documents since the filter no longer has a "Stored" category.

Also in `STATUS_LABELS` (line 459), change `'uploaded': 'Stored'` to `'uploaded': 'Uploaded'`.

**Note**: This task can be merged into Task 1.2 if the same developer handles both. Listed separately for clarity.

**Acceptance criteria**:
- No reference to "Stored" anywhere in the document UI
- Uploaded documents show "Uploaded" status label

---

## PG-2: Pet Profile Fields & Creation

### Task 2.1: Add age field to pet profile (#98)
**Complexity**: M
**Depends on**: Task 0.2 (migration)
**Files**:
- MODIFY `backend/src/models/pet.ts` -- add `age` to `Pet` interface, `CreatePetInput`, `createPet`, `updatePet` (add to `allowedFields`)
- MODIFY `backend/src/routes/pets.ts` -- add `age` to `createPetSchema` and `updatePetSchema` (optional `z.number().int().min(0)`)
- MODIFY `frontend/src/api/client.ts` -- add `age: number | null` to `Pet` interface and `age?: number` to `CreatePetInput`

**Details**:
- Backend: Add `age` as nullable INTEGER to Pet model. In `createPet`, include `input.age || null` in the INSERT. In `updatePet`, add `'age'` to `allowedFields` array.
- API validation: `age: z.number().int().min(0).optional()` in both create and update schemas.
- Frontend type: Add `age: number | null` to `Pet` interface in `client.ts`.

**Acceptance criteria**:
- `age` field stored in DB as integer
- API accepts `age` on create and update
- Validation: must be non-negative integer if provided
- `age` included in API responses

---

### Task 2.2: Add age display and editing to pet profile frontend (#98)
**Complexity**: M
**Depends on**: Task 2.1
**Files**:
- MODIFY `frontend/src/pages/pet-profile/tabs/OverviewTab.tsx` -- add age field display/edit
- MODIFY `frontend/src/pages/pet-profile/sections/OverviewSection.tsx` -- add age display in pet info card

**Details**:
In `OverviewTab.tsx`:
1. Add `'age'` to the `OverviewField` type union (line 7)
2. Add `age` field config to `fieldConfigs` (line 56): `{ key: 'age', placeholder: 'Age (years)', type: 'number', min: '0', step: '1' }`
3. Display logic: If `pet.date_of_birth` exists, calculate age dynamically and show as non-editable (gray text, no click-to-edit). If no DOB, show editable age field.
4. Age calculation: `Math.floor((Date.now() - new Date(pet.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))`
5. Add `renderEditableField('age', 'Age', ...)` after the DOB field in the grid

In `OverviewSection.tsx`:
1. Display age next to the breed/species text (line 33-34). Show `{age} year(s)` if available (from DOB calculation or manual age field).

**Acceptance criteria**:
- If DOB present: age auto-calculates, displayed as read-only, DOB field still editable
- If no DOB: age field is manually editable via click-to-edit pattern
- Age displays on overview as "N years" next to breed
- Age saves via PATCH `/api/pets/:id`

---

### Task 2.3: Add color/markings field (#99)
**Complexity**: M
**Depends on**: Task 0.2 (migration)
**Files**:
- MODIFY `backend/src/models/pet.ts` -- add `color_markings` to interfaces, `createPet`, `updatePet`
- MODIFY `backend/src/routes/pets.ts` -- add to schemas
- MODIFY `frontend/src/api/client.ts` -- add to types
- MODIFY `frontend/src/pages/pet-profile/tabs/OverviewTab.tsx` -- add field
- MODIFY `frontend/src/components/AddPetModal.tsx` -- add field to create form
- MODIFY `frontend/src/pages/pet-profile/sections/OverviewSection.tsx` -- display next to breed

**Note**: This touches more than 3 files. Split into backend (2.3a) and frontend (2.3b) if needed, but they are tightly coupled. A single developer should handle both.

**Details**:
Backend:
- Add `color_markings: string | null` to `Pet` interface
- Add `color_markings?: string` to `CreatePetInput`
- Add `'color_markings'` to `allowedFields` in `updatePet`
- Add `color_markings: z.string().max(255).optional()` to schemas

Frontend:
- `client.ts`: Add `color_markings: string | null` to `Pet`, `color_markings?: string` to `CreatePetInput`
- `OverviewTab.tsx`: Add `'color_markings'` to `OverviewField`, add field config, render after breed
- `AddPetModal.tsx`: Add "Color or Markings" text input after the Breed field
- `OverviewSection.tsx`: Display `pet.color_markings` next to breed text if present (e.g., "Golden Retriever Dog -- Gold/White")

**Acceptance criteria**:
- Free-text field, max 255 chars
- Optional on create and edit
- Displayed on overview next to breed
- Does NOT appear on emergency card
- Added to create pet modal form

---

### Task 2.4: Change default pet avatar to animal silhouette (#107)
**Complexity**: M
**Files**:
- MODIFY `frontend/src/components/PhotoUpload.tsx` -- replace fallback emoji/icon with species SVG
- MODIFY `frontend/src/pages/Dashboard.tsx` -- replace fallback SVG in pet card (line 228-230)
- CREATE `frontend/src/components/SpeciesAvatar.tsx` -- shared component

**Details**:
Create a `SpeciesAvatar` component that accepts `species: string` and `size?: number` and returns an inline SVG silhouette. Map species values from `SPECIES_OPTIONS` in constants.ts: `dog`, `cat`, `bird`, `rabbit`, `hamster`, `fish`, `reptile`, `other`.

Use simple, recognizable silhouettes (solid fill, single color). Each species gets a unique shape. `other` gets a generic paw print.

Replace the current fallback in:
1. `PhotoUpload.tsx`: The compact mode currently shows a species emoji. Replace with `<SpeciesAvatar>`.
2. `Dashboard.tsx` (line 228-230): Replace the generic person-like SVG with `<SpeciesAvatar species={pet.species} size={32} />`.

**Acceptance criteria**:
- 8 distinct silhouettes (dog, cat, bird, rabbit, hamster, fish, reptile, other)
- Silhouettes render as inline SVGs (no external files)
- Used in pet card on dashboard (fallback when no photo)
- Used in pet profile photo upload area (fallback when no photo)
- Silhouettes are visually distinguishable at 32px and 64px sizes

---

## PG-3: Emergency Card & Overview Redesign

### Task 3.1: Remove Card Alerts accordion from Health Profile (#93 partial)
**Complexity**: S
**Files**:
- MODIFY `frontend/src/pages/pet-profile/sections/HealthRecordsSection.tsx` -- remove the "Card Alerts" `<details>` block (lines 127-158)

**Details**:
Remove the entire Card Alerts accordion section (the last `<details>` block that renders `<AlertsTab>`). This functionality will be replaced by the Edit modal on the emergency card (Task 3.2).

Also remove the `alerts` and `setAlerts` destructuring from context if no longer used in this file. Keep `handleNavigateToReview` as-is.

**Acceptance criteria**:
- "Card Alerts" accordion no longer appears on the Health Profile tab
- No runtime errors -- `AlertsTab` component file can remain (it will be reused in the modal)
- Health Profile still shows: Conditions, Allergies, Medications, Vaccinations accordions

---

### Task 3.2: Redesign emergency card preview layout + Edit modal (#93)
**Complexity**: L
**Depends on**: Task 3.1
**Files**:
- MODIFY `frontend/src/pages/pet-profile/EmergencyCardPreview.tsx` -- complete redesign
- CREATE `frontend/src/components/CardAlertsModal.tsx` -- modal wrapping `AlertsTab`
- MODIFY `frontend/src/pages/pet-profile/sections/OverviewSection.tsx` -- wire up modal, add "Preview" label

**Details**:

**EmergencyCardPreview.tsx redesign**:
1. Remove the red alerts list at the top of the card
2. Restructure card body to mirror health profile sections in this order:
   - **Conditions** (only those with `show_on_card && is_active`)
   - **Allergies** (only those with `show_on_card`)
   - **Medications** (only those with `show_on_card && is_active`)
   - **Vaccinations** (only those with `show_on_card`)
3. Each section shows items in compact list format with the existing color coding from `alertTypeColors`
4. **Owner's Notes**: If `pet.special_instructions` exists, display in a yellow callout (`bg-yellow-50 border border-yellow-200 rounded-lg p-3`) at the bottom of the card body. Always shown when notes exist -- no toggle.
5. **Primary vet** (#105): Show only the primary vet (where `is_primary === true`). If no primary vet, show nothing for vet section.
6. **Emergency contact**: Keep existing primary contact display
7. Replace "Configure" button with "Edit" link text. Clicking "Edit" opens `CardAlertsModal`.
8. Replace "Share Card" button text with "Send Card" (matching #96).

**Props changes**: Add `specialInstructions: string | null` and `vets: PetVet[]` to the component props.

**CardAlertsModal.tsx**:
- A modal wrapper that renders `AlertsTab` (from `frontend/src/pages/pet-profile/tabs/AlertsTab.tsx`)
- Accepts all the same props as `AlertsTab` plus `onClose: () => void`
- Standard modal overlay with title "Edit Emergency Card" and close button
- Same toggle behavior that was previously in the Card Alerts accordion

**OverviewSection.tsx**:
- Add "Preview" label above the emergency card div: `<p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Preview</p>`
- Add state for `showCardAlertsModal` and wire up to the Edit link
- Pass `specialInstructions={pet.special_instructions}` and `vets={vets}` to `EmergencyCardPreview`

**Acceptance criteria**:
- Card shows sections: Conditions, Allergies, Medications, Vaccinations (only show_on_card items)
- Owner's Notes displayed in yellow callout when present
- Only primary vet shown on card
- "Edit" link opens modal with AlertsTab toggle functionality
- "Preview" label appears above card on overview
- Card Alerts accordion removed from Health Profile (Task 3.1)

---

### Task 3.3: Clean up overview page button bar (#96)
**Complexity**: S
**Files**:
- MODIFY `frontend/src/pages/PetDetail.tsx` -- update header buttons (lines 197-218)

**Details**:
In the button bar (line 197-218):
1. Rename "Access" button to "Share Profile"
2. Rename "Share Card" button to "Send Card"
3. Remove the "Delete" button entirely (the `handleDeletePet` function can remain for now but the button is removed from the UI)
4. Both remaining buttons should have the same visual weight. Use `btn btn-sm` with matching border styles for both. Suggested: both use `btn-ghost` with borders, or both use the accent style. Pick one consistent treatment.
5. Choose appropriate icons: share icon for "Share Profile", send/mail icon for "Send Card"

**Acceptance criteria**:
- Only two buttons: "Share Profile" and "Send Card"
- "Share Profile" opens the access modal (previously "Access")
- "Send Card" opens the share modal (previously "Share Card")
- "Delete" button removed from UI
- Both buttons have equal visual weight

---

### Task 3.4: Remove health summary section from overview (#97)
**Complexity**: S
**Files**:
- MODIFY `frontend/src/pages/pet-profile/tabs/OverviewTab.tsx` -- remove Health Summary block (lines 179-221)

**Details**:
Remove the entire "Health Summary" section (the `conditions.length > 0 || allergies.length > 0 || activeMeds.length > 0` block). Keep the stat blocks in `OverviewSection.tsx` (lines 71-88) -- those are the four section links with counts that serve as quick-nav to Health Profile. Update those stat blocks to navigate to the specific section (this will be enhanced in PG-5 Task 5.2).

Also remove `conditions`, `allergies`, `medications` from `OverviewTab` props since they're no longer needed after removing Health Summary. Update the call site in `OverviewSection.tsx` accordingly.

**Acceptance criteria**:
- Health Summary cards (Conditions, Allergies, Active Medications) removed from overview
- Four stat blocks (Conditions, Allergies, Medications, Vaccinations) with counts remain
- OverviewTab component renders without errors

---

### Task 3.5: Update public emergency card endpoint for primary vet only (#105)
**Complexity**: S
**Files**:
- MODIFY `backend/src/routes/public.ts` -- filter vets in `buildEmergencyCard` (line 142-147)

**Details**:
In `buildEmergencyCard` function (line 142), change the veterinarians mapping:
```
// Current: shows all vets
veterinarians: vets.map(v => ({ ... })),

// New: show only primary vet
veterinarians: vets.filter(v => v.is_primary).map(v => ({ ... })),
```

If no vet has `is_primary === true`, the array will be empty, which is the correct behavior per requirements.

**Acceptance criteria**:
- Public emergency card API only returns primary vet(s)
- If no primary vet, `veterinarians` array is empty
- Non-primary vets excluded from public card response

---

## PG-4: Document Features

### Task 4.1: Backend soft-delete for documents (#104)
**Complexity**: M
**Depends on**: Task 0.1 (migration)
**Files**:
- MODIFY `backend/src/models/document-upload.ts` -- update queries to filter by `deleted_at IS NULL`, add soft-delete function
- MODIFY `backend/src/routes/document-import.ts` -- update delete endpoint, add cascade option

**Details**:

**Model changes** (`document-upload.ts`):
1. Update `getDocumentUploadsByPetId` (line 79-89): Add `AND deleted_at IS NULL` to both queries
2. Update `getDocumentUploadById` (line 72-76): Add `AND deleted_at IS NULL`
3. Replace `deleteDocumentUpload` (line 127-133): Change from `DELETE` to `UPDATE document_uploads SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND pet_id = $2 AND deleted_at IS NULL RETURNING id`
4. Add new function `softDeleteDocumentWithCascade(uploadId, petId, cascade)`:
   - Soft-delete the document upload
   - If `cascade === true`: Find all `document_extraction_items` linked to this upload (via `document_extractions.document_upload_id`), get their `created_record_id` and `created_record_type`, and soft-delete those health records (set `deleted_at` or actually delete -- but per spec, soft-delete the extraction items; for health records, remove the source link by setting `created_record_id = NULL`)
   - If `cascade === false`: Just soft-delete the document and set `created_record_id = NULL` on any linked extraction items (unlink from health records)

**Route changes** (`document-import.ts`):
1. Update DELETE endpoint (line 386): Accept optional `cascade` query param or body field
2. For processed documents (status `completed` or `pending_review`): require `cascade` param (boolean)
3. For unprocessed documents (status `uploaded`): simple soft-delete, no cascade needed
4. Do NOT delete from storage -- the file stays (soft delete keeps everything)

**Acceptance criteria**:
- Documents with `deleted_at IS NOT NULL` are excluded from all list queries
- DELETE endpoint sets `deleted_at` instead of removing rows
- For processed documents: `cascade=true` also soft-deletes linked extraction items; `cascade=false` just unlinks
- Unprocessed documents: simple soft-delete
- Files NOT deleted from storage (data preserved)

---

### Task 4.2: Frontend delete for documents (#104)
**Complexity**: M
**Depends on**: Task 4.1
**Files**:
- MODIFY `frontend/src/components/document-import/DocumentImportSection.tsx` -- add delete button and confirmation dialog to `ListCard` and `GridCard`
- MODIFY `frontend/src/api/client.ts` -- update `deleteUpload` to accept cascade option

**Details**:
1. **API client**: Update `documentsApi.deleteUpload` to accept optional `cascade` boolean:
   ```ts
   deleteUpload: (petId: number, uploadId: number, token: string, cascade?: boolean) =>
     api.delete(`/api/pets/${petId}/documents/uploads/${uploadId}${cascade !== undefined ? `?cascade=${cascade}` : ''}`, token),
   ```

2. **ListCard**: Add a delete button (trash icon) in the action buttons area. On click:
   - If document is processed (`completed` status): show a confirmation dialog with two options:
     - "Delete document and imported records" (cascade=true)
     - "Delete document only, keep imported records" (cascade=false)
     - "Cancel"
   - If document is unprocessed: show simple confirmation "Delete this document?" with OK/Cancel

3. **GridCard**: Add a delete button. Can be a small trash icon overlaid on the thumbnail or in the meta section.

4. **Confirmation dialog**: Use a simple modal/dialog (can be a new small component or inline JSX with the existing modal pattern from `AddPetModal`).

5. After deletion: call `loadUploads()` to refresh the list.

**Acceptance criteria**:
- Delete button visible on all documents (processed and unprocessed)
- Processed documents show cascade confirmation dialog
- Unprocessed documents show simple confirmation
- After delete, document disappears from list
- API call includes cascade parameter for processed documents

---

### Task 4.3: Re-add inline document rename (#114)
**Complexity**: M
**Files**:
- MODIFY `frontend/src/components/document-import/DocumentImportSection.tsx` -- add pencil icon + inline edit to both `ListCard` and `GridCard`

**Details**:
Add inline rename functionality to both card types:

1. **ListCard** (~line 668): Next to the document name, add a pencil icon button. On click:
   - Replace the name text with an `<input>` field pre-filled with current name
   - Show checkmark (save) and X (cancel) buttons
   - Save: call `documentsApi.renameUpload(petId, upload.id, newName, token)`, then refresh
   - Cancel: revert to display mode
   - Enter key saves, Escape key cancels
   - Max 255 characters

2. **GridCard** (~line 557): Same pattern in the meta section below the thumbnail

3. Add local state to each card component for rename mode: `[isRenaming, setIsRenaming]` and `[renameTo, setRenameTo]`

4. The `documentsApi.renameUpload` already exists in `client.ts` (line 841). Backend endpoint already exists (line 819 in `document-import.ts`).

**Acceptance criteria**:
- Pencil icon visible next to document name in both list and grid views
- Click pencil -> inline input with save/cancel
- Enter saves, Escape cancels
- Max 255 characters enforced
- Name updates immediately in UI after save
- Works for all document statuses

---

### Task 4.4: Increase grid view text size (#111)
**Complexity**: S
**Files**:
- MODIFY `frontend/src/components/document-import/DocumentImportSection.tsx` -- increase font sizes in `GridCard`

**Details**:
In `GridCard`, increase text sizes in the meta section (lines 556-568):
- Document name (line 557): Change `text-xs` to `text-sm` 
- Status label (line 563): Change `text-[11px]` to `text-xs`
- Date (line 566): Change `text-[11px]` to `text-xs`
- Button text (line 576): Change `text-xs` to `text-sm`

Only apply on desktop -- use `md:text-sm` / `md:text-xs` responsive prefixes if Tailwind is available, or add a media query. Check if the existing Tailwind setup supports responsive utilities (it does based on the `md:grid-cols-4` usage on line 412).

**Acceptance criteria**:
- Grid card text is larger and more readable on desktop
- Mobile text sizes remain compact
- Layout doesn't break with larger text (test with long filenames)

---

## PG-5: Health Profile Navigation & Owner's Notes

### Task 5.1: Rename Special Instructions to Owner's Notes + move to Health Profile (#100)
**Complexity**: M
**Files**:
- MODIFY `frontend/src/pages/pet-profile/tabs/OverviewTab.tsx` -- remove Special Instructions section (lines 147-175)
- MODIFY `frontend/src/pages/pet-profile/sections/HealthRecordsSection.tsx` -- add Owner's Notes accordion section
- MODIFY `frontend/src/pages/pet-profile/EmergencyCardPreview.tsx` -- use "Owner's Notes" label (done in Task 3.2)

**Details**:

**OverviewTab.tsx**:
- Remove the entire "Special Instructions" section (lines 147-175). This field will now live in Health Profile.
- Remove `'special_instructions'` from the `OverviewField` type and `fieldConfigs`.

**HealthRecordsSection.tsx**:
- Add a new accordion section for "Owner's Notes" after Vaccinations and before the (now removed) Card Alerts:
  ```tsx
  <details className="health-accordion" open={!!pet.special_instructions}>
    <summary className="health-accordion-summary">
      <div className="health-accordion-title">
        {/* notepad/pencil icon */}
        Owner's Notes
      </div>
      <svg className="health-accordion-chevron" .../>
    </summary>
    <div className="health-accordion-content">
      {/* Render editable Owner's Notes using the same InlineEditForm pattern */}
    </div>
  </details>
  ```
- This section needs access to `pet` and `handlePetUpdated` from context to save changes via `petsApi.update`
- The field uses the existing `special_instructions` database column -- no DB changes needed

**Acceptance criteria**:
- "Special Instructions" removed from Overview tab
- "Owner's Notes" accordion appears in Health Profile after Vaccinations
- Editable via click-to-edit (same InlineEditForm pattern)
- Saves to `special_instructions` field via existing API
- Label "Owner's Notes" used everywhere (not "Special Instructions")

---

### Task 5.2: Fix health profile section navigation and scrolling (#101)
**Complexity**: L
**Depends on**: Task 5.1 (needs final section list including Owner's Notes)
**Files**:
- MODIFY `frontend/src/pages/pet-profile/PetProfileNav.tsx` -- add sub-items under Health Profile
- MODIFY `frontend/src/pages/pet-profile/sections/HealthRecordsSection.tsx` -- add scroll targets, handle URL hash
- MODIFY `frontend/src/pages/pet-profile/sections/OverviewSection.tsx` -- update stat block navigation

**Details**:

**PetProfileNav.tsx**:
1. Add expandable sub-items under the "Health Profile" nav item for: Conditions, Allergies, Medications, Vaccinations, Owner's Notes
2. Sub-items only show when Health Profile tab is active
3. Each sub-item navigates to `/pets/:id/health#conditions` (etc.) using hash fragments
4. Style sub-items as indented, smaller text within the sidebar

**HealthRecordsSection.tsx**:
1. Add `id` attributes to each accordion `<details>` element: `id="conditions"`, `id="allergies"`, `id="medications"`, `id="vaccinations"`, `id="owners-notes"`
2. On mount, check `window.location.hash`. If hash matches a section:
   - Find the `<details>` element by id
   - Set its `open` attribute to true
   - Smooth-scroll to it: `element.scrollIntoView({ behavior: 'smooth', block: 'start' })`
3. Use `useEffect` with dependency on `location.hash` (from `useLocation`)

**OverviewSection.tsx**:
1. Update the stat blocks (lines 72-88): Instead of `navigate('health')`, navigate to `health#conditions`, `health#allergies`, `health#medications`, `health#vaccinations` respectively

**Acceptance criteria**:
- Clicking stat block on Overview navigates to Health Profile and scrolls to the specific section
- Sidebar shows sub-items (Conditions, Allergies, Medications, Vaccinations, Owner's Notes) under Health Profile when that tab is active
- Clicking sidebar sub-item navigates to section and expands its accordion
- Smooth scroll animation
- Works on page refresh with hash in URL

---

## PG-6: Timeline, Sharing, Empty State

### Task 6.1: Timeline cleanup (#112 + #113)
**Complexity**: M
**Files**:
- MODIFY `frontend/src/pages/pet-profile/sections/ActivitySection.tsx` -- remove history, add filters, rename
- MODIFY `frontend/src/components/MedicalTimeline.tsx` -- add type filter support

**Details**:

**ActivitySection.tsx**:
1. Remove the "Change History" section entirely (the `<div className="card"><HistoryTab .../>` block, lines 26-29). Audit logs continue to be stored on the backend, just not displayed here.
2. Remove the `<h3>Medical Timeline</h3>` title (line 13) -- the page title from the breadcrumb ("Timeline") is sufficient. Remove the duplicate title.
3. Remove the `HistoryTab` import.

**MedicalTimeline.tsx**:
1. Add a `filter` state for event types: `'all' | 'vaccination' | 'medication' | 'condition' | 'allergy'`
2. Render filter pill buttons above the timeline: All | Vaccinations | Medications | Conditions | Allergies
3. Filter the `events` array based on selected type before rendering
4. Style the filter pills consistently with the document filter pills (compact, rounded)

**Acceptance criteria**:
- Page title is "Timeline" (from breadcrumb, no duplicate heading)
- Change history section removed from timeline page
- Type filter pills displayed: All | Vaccinations | Medications | Conditions | Allergies
- Selecting a filter shows only events of that type
- "All" shows all events (default)
- Timeline still shows date grouping and event details

---

### Task 6.2: Fix shared pet access (#102)
**Complexity**: M
**Files**:
- MODIFY `backend/src/models/pet.ts` -- fix `findPetsForUser` query if needed
- MODIFY `frontend/src/pages/Dashboard.tsx` -- add shared pet visual indicator

**Details**:

**Backend investigation**: Check `findPetsForUser` in `backend/src/models/pet.ts` (line 80-88). The current query:
```sql
SELECT p.* FROM pets p
JOIN pet_owners po ON po.pet_id = p.id
WHERE po.user_id = $1 AND po.accepted_at IS NOT NULL
ORDER BY p.created_at DESC
```
This should already include shared pets. The bug may be that the `accepted_at` is NULL for some invited users, or the invitation flow isn't properly setting `accepted_at`. Investigate:
1. Check `acceptInvitation` in `pet-owners.ts` -- it calls `addPetOwner` which sets `accepted_at = CURRENT_TIMESTAMP`. This looks correct.
2. The query also returns the user's own pets (added via `addPetOwner` during pet creation). This is correct.
3. The likely issue: the API response doesn't include the user's role, so the frontend can't distinguish shared pets. Update the query to include the role:
   ```sql
   SELECT p.*, po.role as user_role FROM pets p
   JOIN pet_owners po ON po.pet_id = p.id
   WHERE po.user_id = $1 AND po.accepted_at IS NOT NULL
   ORDER BY p.created_at DESC
   ```

**Frontend**:
1. Update `Pet` type to include optional `userRole?: string` 
2. In `Dashboard.tsx`: If `pet.userRole` is `'editor'` or `'viewer'` (not `'owner'`), show a visual indicator on the pet card. Options:
   - Small badge below the pet name: "Shared with you" in a subtle style
   - Or a small share icon next to the pet name
3. Shared pets appear in the same list, not separated

**Acceptance criteria**:
- Pets shared with the current user appear in the dashboard pet list
- Shared pets show a visual indicator distinguishing them from owned pets
- Shared pets are clickable and navigate to the pet profile
- No separate "Shared with me" section

---

### Task 6.3: CMS-managed empty state text (#108)
**Complexity**: M
**Depends on**: Task 0.3 (CMS seed)
**Files**:
- MODIFY `frontend/src/pages/Dashboard.tsx` -- fetch empty state content from CMS
- MODIFY `frontend/src/api/cms.ts` -- add `EmptyStateContent` type

**Details**:

**CMS types** (`cms.ts`):
Add a new content type:
```ts
export interface EmptyStateContent {
  heading: string;
  subheading?: string;
}
```
Add `'empty_state'` to the `BlockType` union. Add `EmptyStateContent` to the `BlockContent` union.

**Dashboard.tsx**:
1. On mount, if `pets.length === 0`, fetch the CMS page: `cmsApi.fetchPage('dashboard-empty-state')`
2. Extract the `empty_state` block content
3. Replace the hardcoded empty state text (lines 195-199) with CMS content:
   - Use `content.heading` instead of "No pets yet"
   - Use `content.subheading` (if present) instead of "Add your first pet to create an emergency health card."
4. Keep fallback text if CMS fetch fails
5. Keep the "Add Your First Pet" button as-is

**Acceptance criteria**:
- Empty state heading and subheading fetched from CMS
- Falls back to hardcoded text if CMS unavailable
- CMS seed provides: heading "Add your first pet to create their profile"
- Admin can update the text via CMS admin panel

---

## PG-7: Dashboard Pet Card

### Task 7.1: Remove 'View Profile' button, make card clickable (#109)
**Complexity**: S
**Files**:
- MODIFY `frontend/src/pages/Dashboard.tsx` -- update pet card bottom section (lines 266-271)

**Details**:
The pet card (line 210-273) is already wrapped in a `<Link>` component, making the entire card clickable. Changes:
1. Remove the "View profile" badge text (line 267): `<span className="badge badge-navy">View profile</span>`
2. Increase the chevron size on the right side: change from `width="16" height="16"` to `width="24" height="24"` to make it a more prominent visual affordance
3. Add hover effect to the card: add `hover:shadow-lg hover:border-blue-300 transition-all` classes to the card `<Link>` element
4. Remove the bottom divider/border section entirely, or simplify it to just the large chevron aligned right

**Acceptance criteria**:
- "View profile" text removed
- Large chevron visible on right side of card
- Entire card remains clickable (already is via `<Link>`)
- Hover state provides clear visual feedback (shadow, border color change)
- Card maintains its current layout and information density

---

## Summary Table

| Task | Issue(s) | Complexity | Group | Depends On | Key Files |
|------|----------|-----------|-------|------------|-----------|
| 0.1 | #104 | S | PG-0 | -- | migrate-soft-delete.ts, package.json, deploy.yml |
| 0.2 | #98, #99 | S | PG-0 | -- | migrate-pet-age-color.ts, package.json, deploy.yml |
| 0.3 | #108 | S | PG-0 | -- | seed-cms-empty-state.ts, package.json |
| 1.1 | #94, #110 | M | PG-1 | PG-0 | PetProfileNav.tsx, PetDetail.tsx, index.css |
| 1.2 | #95 | M | PG-1 | PG-0 | DocumentImportSection.tsx |
| 1.3 | #95 | S | PG-1 | PG-0 | DocumentImportSection.tsx |
| 2.1 | #98 | M | PG-2 | 0.2 | pet.ts, pets.ts, client.ts |
| 2.2 | #98 | M | PG-2 | 2.1 | OverviewTab.tsx, OverviewSection.tsx |
| 2.3 | #99 | M | PG-2 | 0.2 | pet.ts, pets.ts, client.ts, OverviewTab.tsx, AddPetModal.tsx, OverviewSection.tsx |
| 2.4 | #107 | M | PG-2 | PG-0 | SpeciesAvatar.tsx (new), PhotoUpload.tsx, Dashboard.tsx |
| 3.1 | #93 | S | PG-3 | PG-0 | HealthRecordsSection.tsx |
| 3.2 | #93, #105 | L | PG-3 | 3.1 | EmergencyCardPreview.tsx, CardAlertsModal.tsx (new), OverviewSection.tsx |
| 3.3 | #96 | S | PG-3 | PG-0 | PetDetail.tsx |
| 3.4 | #97 | S | PG-3 | PG-0 | OverviewTab.tsx |
| 3.5 | #105 | S | PG-3 | PG-0 | public.ts |
| 4.1 | #104 | M | PG-4 | 0.1 | document-upload.ts, document-import.ts |
| 4.2 | #104 | M | PG-4 | 4.1 | DocumentImportSection.tsx, client.ts |
| 4.3 | #114 | M | PG-4 | PG-0 | DocumentImportSection.tsx |
| 4.4 | #111 | S | PG-4 | PG-0 | DocumentImportSection.tsx |
| 5.1 | #100 | M | PG-5 | PG-0 | OverviewTab.tsx, HealthRecordsSection.tsx |
| 5.2 | #101 | L | PG-5 | 5.1 | PetProfileNav.tsx, HealthRecordsSection.tsx, OverviewSection.tsx |
| 6.1 | #112, #113 | M | PG-6 | PG-0 | ActivitySection.tsx, MedicalTimeline.tsx |
| 6.2 | #102 | M | PG-6 | PG-0 | pet.ts, Dashboard.tsx |
| 6.3 | #108 | M | PG-6 | 0.3 | Dashboard.tsx, cms.ts |
| 7.1 | #109 | S | PG-7 | PG-0 | Dashboard.tsx |

---

## Risks and Considerations

1. **DocumentImportSection.tsx is a 900+ line monolith**: Tasks 1.2, 1.3, 4.2, 4.3, and 4.4 all modify this file. If worked in parallel, merge conflicts are guaranteed. Recommendation: assign all document-related frontend tasks (PG-4 + tasks 1.2/1.3) to one developer, or serialize them.

2. **Emergency card redesign (Task 3.2) is the highest-complexity task**: It touches the card layout, adds a new modal, and wires up new data flows. The developer should read `AlertsTab.tsx` thoroughly before starting.

3. **Health profile section navigation (Task 5.2)** requires careful handling of React Router hash navigation and DOM manipulation (opening `<details>` elements programmatically). The `<details>` element's `open` attribute is not controlled by React by default -- the developer may need to use refs or controlled state.

4. **Soft-delete (Task 4.1)** introduces a new pattern to the codebase. Every future query against `document_uploads` must include `AND deleted_at IS NULL`. The developer should search for all existing queries and update them.

5. **The `OverviewTab.tsx` file is modified by Tasks 2.2, 2.3, 3.4, and 5.1**. If these run in parallel, coordinate carefully. Recommendation: Tasks 3.4 and 5.1 should run first (they remove code), then 2.2 and 2.3 (they add code).

6. **CMS empty state (Task 6.3)**: The CMS API returns 404 for non-existent pages. The frontend must handle this gracefully and fall back to hardcoded text.

7. **No existing tests cover the frontend components being modified**. Backend tests exist in `backend/src/routes/pets.test.ts` and `backend/src/models/health-records.test.ts`. New backend changes (Tasks 4.1, 2.1, 2.3, 3.5) should have corresponding test coverage.
