# Pre-Launch Implementation Review

**Reviewer:** Diana Prince (Wonder Woman)
**Date:** 2026-04-02
**Plan:** PLAN-pre-launch.md (30 tasks across 8 parallel groups)
**Verdict:** FAIL (1 critical issue)

---

## Summary

The implementation is substantial and largely faithful to the plan. 25+ files across frontend and backend were modified or created. Migration scripts are idempotent, CMS seeds are correct, navigation was restructured, the emergency card was redesigned, soft-delete was introduced with proper query filtering, and new fields (age, color_markings) were added end-to-end. The code quality is consistent with the existing codebase.

However, one critical bug blocks the merge: the frontend delete confirmation dialog fails to recognize `pending_review` documents as "processed," causing a guaranteed API 400 error when users try to delete documents in review state. Beyond that, I found several warnings worth addressing before ship.

---

## Issues

### CRITICAL

**1. Frontend delete dialog misidentifies pending_review documents**
- **File:** `frontend/src/components/document-import/DocumentImportSection.tsx`
- **Line:** 532
- **Description:** `DeleteConfirmDialog` checks `item.primaryUpload.status === 'completed'` to determine whether to show the cascade confirmation. But the backend (line 405 of `document-import.ts`) treats both `completed` AND `pending_review` as "processed" and requires the `cascade` query parameter. When a user clicks delete on a `pending_review` document, the frontend sends a DELETE without `cascade`, the backend returns `400: cascade query param is required`, and the delete fails silently (the catch block in `handleDeleteConfirm` sets an error message, but the user experience is broken).
- **Suggestion:** Change line 532 from:
  ```ts
  const isProcessed = item.primaryUpload.status === 'completed';
  ```
  to:
  ```ts
  const isProcessed = item.primaryUpload.status === 'completed' || item.primaryUpload.status === 'pending_review';
  ```

---

### WARNINGS

**2. GridCard delete button hover visibility relies on broken CSS pattern**
- **File:** `frontend/src/components/document-import/DocumentImportSection.tsx`
- **Line:** 716-727
- **Description:** The delete button overlay on GridCard uses `opacity-0 group-hover:opacity-100` Tailwind classes, but the parent `<div>` at line 679 does not have the `group` class. The code works around this with inline `onMouseEnter`/`onMouseLeave` handlers that manually toggle opacity, but the `style={{ opacity: undefined }}` on line 720 means the initial render will have no opacity style, and the Tailwind `opacity-0` class will take effect, hiding the button until the user hovers. The workaround is functional but fragile -- the button briefly flashes on initial render because of the undefined style competing with the CSS class.
- **Suggestion:** Add `group` class to the parent card div at line 679, or remove the conflicting Tailwind opacity classes and rely solely on the inline event handlers.

**3. UPDATE queries on document_uploads lack `deleted_at IS NULL` guard**
- **File:** `backend/src/models/document-upload.ts`
- **Lines:** 101-124 (`updateDocumentUploadStatus`), 168-177 (`updateDocumentUploadFilename`), 179-197 (`updateDocumentImageMetadata`), 206-213 (`reorderDocumentGroup`), 215-244 (`updateDocumentGroupStatus`)
- **Description:** These UPDATE queries operate on document_uploads without filtering `AND deleted_at IS NULL`. While the calling routes typically check `getDocumentUploadById` first (which does filter), this defense-in-depth gap means a race condition or future code path could mutate a soft-deleted document. The `updateDocumentGroupStatus` function is the most concerning because it operates on a `document_group_id` and could affect soft-deleted pages within a group.
- **Suggestion:** Add `AND deleted_at IS NULL` to the WHERE clause of `updateDocumentGroupStatus` at minimum. For the others, consider adding it as a defensive measure, though it is not strictly required today.

**4. `softDeleteDocumentWithCascade` unlinking runs on already-soft-deleted items**
- **File:** `backend/src/models/document-upload.ts`
- **Lines:** 155-163
- **Description:** When `cascade=true`, the function first soft-deletes extraction items (lines 146-152), then unconditionally nulls out `created_record_id` on all linked items (lines 157-163). The second query does not exclude `deleted_at IS NOT NULL`, so it redundantly modifies already-soft-deleted items. This is semantically wasteful but not a data corruption risk.
- **Suggestion:** For clarity, add `AND deleted_at IS NULL` to the second query, or restructure so unlinking happens before soft-deletion in the cascade path.

**5. SpeciesAvatar missing "hamster" from SPECIES_OPTIONS coverage check**
- **File:** `frontend/src/components/SpeciesAvatar.tsx`
- **Description:** The component defines 8 species silhouettes (dog, cat, bird, rabbit, hamster, fish, reptile, other) as required by the plan. However, the hamster SVG path at line 15 produces a very small visual at 32px -- the body is only about half the viewBox. At the acceptance-criteria size of 32px, this silhouette may be hard to distinguish from other species. All other silhouettes fill the viewBox more fully.
- **Suggestion:** Review the hamster SVG path for visual balance at 32px. Consider scaling the path to fill more of the 24x24 viewBox.

---

### INFO

**6. Empty state paw icon in Dashboard uses SpeciesAvatar instead of the previous generic icon**
- **File:** `frontend/src/pages/Dashboard.tsx`
- **Line:** 209
- **Description:** The empty state uses `<SpeciesAvatar species="other" size={40} />` which renders a paw print. This is a nice touch and matches the plan requirement. The previous generic person-like SVG is gone. This is correct per Task 2.4 and 7.1.

**7. CSS sub-item styles added for health profile navigation**
- **File:** `frontend/src/index.css`
- **Description:** New CSS classes `.pet-profile-nav-sub-items` and `.pet-profile-nav-sub-item` are properly scoped and styled. The sub-items use `button` elements with `onClick` handlers for hash navigation rather than `<Link>` components, which is the correct approach since React Router's `<Link>` doesn't handle hash-only navigation as smoothly.

**8. The `age` field uses `input.age ?? null` (nullish coalescing) in `createPet` but `input.color_markings || null` (logical OR) for the string field**
- **File:** `backend/src/models/pet.ts`
- **Line:** 65-66
- **Description:** The nullish coalescing (`??`) for `age` is correct because `age: 0` is a valid value that `||` would incorrectly treat as falsy. The `||` for `color_markings` is also correct since an empty string should map to `null`. Good attention to detail.

**9. `OverviewTab` renders age as read-only when DOB is present, editable otherwise**
- **File:** `frontend/src/pages/pet-profile/tabs/OverviewTab.tsx`
- **Lines:** 133-144
- **Description:** The `renderAgeField` function correctly implements the plan's requirement: calculated age from DOB is display-only (gray text, no click-to-edit), while manual age is editable. The age calculation uses the same formula as in `OverviewSection.tsx` for consistency.

**10. Medical timeline filter uses EventType union for filtering**
- **File:** `frontend/src/components/MedicalTimeline.tsx`
- **Line:** 115
- **Description:** The filter state uses `EventType | 'all'` which includes `medication_start` and `medication_end` as separate types. The filter logic at lines 215-222 correctly groups both medication types under the `medication_start` filter. The plan's requirement of "Vaccinations | Medications | Conditions | Allergies" pills is met, with the filter labels at line 261-267 showing user-friendly names.

---

## Task-by-Task Verification

| Task | Status | Notes |
|------|--------|-------|
| 0.1 | PASS | `migrate-soft-delete.ts` adds `deleted_at` to all 3 tables + index. Idempotent. Registered in package.json and deploy.yml. |
| 0.2 | PASS | `migrate-pet-age-color.ts` adds INTEGER `age` and VARCHAR(255) `color_markings`. Nullable. Idempotent. |
| 0.3 | PASS | `seed-cms-empty-state.ts` creates page with slug `dashboard-empty-state`, block type `empty_state`. Idempotent (checks existence). |
| 1.1 | PASS | Tab order: Overview, Health Records, Health Profile, divider, Care Team, divider, Timeline. Clock icon for Timeline. Dividers render in sidebar only. Mobile pills skip dividers. SECTION_LABELS updated in PetDetail.tsx. |
| 1.2 | PASS | Filter pills: All, Needs Review, Processed. No count badge on Processed. "Process" button text. "Processing..." loading state. STATUS_LABELS updated. Batch button reads "Process All (N)". |
| 1.3 | PASS | STATUS_LABELS `uploaded` = `'Uploaded'`. No reference to "Stored" in document UI. |
| 2.1 | PASS | `age` in Pet model, CreatePetInput, createPet, updatePet. Validation: `z.number().int().min(0).optional()`. |
| 2.2 | PASS | Age field in OverviewTab with conditional editability (DOB = read-only, no DOB = editable). Age displayed in OverviewSection. |
| 2.3 | PASS | `color_markings` end-to-end: backend model, routes, frontend types, OverviewTab, AddPetModal, OverviewSection display. |
| 2.4 | PASS | SpeciesAvatar component with 8 species. Used in PhotoUpload (compact fallback) and Dashboard pet card. Inline SVGs. |
| 3.1 | PASS | Card Alerts accordion removed from HealthRecordsSection. AlertsTab import removed. No runtime errors expected. |
| 3.2 | PASS | EmergencyCardPreview redesigned with section-based layout (Conditions, Allergies, Medications, Vaccinations with show_on_card filtering). Owner's Notes yellow callout. Primary vet only. CardAlertsModal created. "Edit" button opens modal. "Preview" label above card. |
| 3.3 | PASS | Two buttons: "Share Profile" and "Send Card". Delete button removed. Both have `btn-ghost btn-sm` with border styling. Share/send icons present. |
| 3.4 | PASS | Health Summary section removed from OverviewTab. `conditions`, `allergies`, `medications` no longer passed as props to OverviewTab. Stat blocks remain in OverviewSection. |
| 3.5 | PASS | `public.ts` line 142: `vets.filter(v => v.is_primary)`. Empty array when no primary. |
| 4.1 | PASS (with warnings) | Soft-delete implemented: `deleteDocumentUpload` sets `deleted_at`. `softDeleteDocumentWithCascade` cascades to extraction items. All SELECT queries filter `deleted_at IS NULL`. See warnings #3 and #4 for UPDATE queries. |
| 4.2 | FAIL (critical) | Delete button on both GridCard and ListCard. Cascade confirmation for processed docs. But `pending_review` not treated as processed in frontend -- see critical issue #1. |
| 4.3 | PASS | Pencil icon + inline rename on both GridCard and ListCard. Enter saves, Escape cancels. Max 255 chars. `renameUpload` API called. |
| 4.4 | PASS | Grid card text sizes increased with responsive prefixes: `text-xs md:text-sm` for name, `text-[11px] md:text-xs` for status/date, `text-xs md:text-sm` for button. |
| 5.1 | PASS | Special Instructions removed from OverviewTab. Owner's Notes accordion added to HealthRecordsSection with InlineEditForm. Saves to `special_instructions` field. |
| 5.2 | PASS | Sub-items under Health Profile in sidebar (Conditions, Allergies, Medications, Vaccinations, Owner's Notes). Hash navigation with `useEffect` scrolling. `id` attributes on accordion elements. Stat blocks navigate to `health#conditions` etc. |
| 6.1 | PASS | Change History section removed. HistoryTab import removed. No duplicate heading. Filter pills in MedicalTimeline: All, Vaccinations, Medications, Conditions, Allergies. |
| 6.2 | PASS | `findPetsForUser` returns `po.role as user_role`. Frontend `Pet` type has `user_role?: string`. Dashboard shows "Shared with you" badge for non-owner roles. |
| 6.3 | PASS | Dashboard fetches CMS `dashboard-empty-state` page when no pets. Fallback text preserved. `EmptyStateContent` type added to cms.ts. `empty_state` added to `BlockType` and `BlockContent`. |
| 7.1 | PASS | "View profile" badge removed. Chevron increased to 24x24. Card has `hover:shadow-lg transition-shadow`. Bottom section simplified to just chevron. |

---

## Verdict: FAIL

One critical issue must be fixed before merge: the `DeleteConfirmDialog` in `DocumentImportSection.tsx` line 532 does not treat `pending_review` documents as "processed," causing API 400 errors when users attempt to delete documents in review state. This is a single-line fix.

The three warnings should be addressed but are not blockers. The implementation is otherwise thorough and well-executed across all 25 tasks.
