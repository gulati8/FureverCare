# Feature Request: Rename "Special Instructions" to "Owner's Notes" and Elevate to Health Profile

## Summary
Rename "Special Instructions" to "Owner's Notes" throughout the app and elevate it from a minor field on the overview page to a first-class section in Health Profile, at the same level as conditions, allergies, medications, and vaccinations.

## Details
- Rename all instances of "Special Instructions" to "Owner's Notes" across the entire codebase (frontend labels, backend API responses, database column comments if applicable)
- Remove the Owner's Notes display from the pet overview page (it currently appears there as "Special Instructions")
- Add Owner's Notes as its own expandable section in the Health Profile tab, at the same level as conditions, allergies, medications, and vaccinations
- On the emergency card, display Owner's Notes in a prominent yellow callout/alert style to make it visually distinct (this is where owners write things like "needs muzzle at vet" or "scared of men" — behavioral notes that matter in emergency situations)
- The field name in the database can stay as `special_instructions` for now — this is a display/API rename, not a migration

## Acceptance Criteria
1. All user-facing text reads "Owner's Notes" instead of "Special Instructions"
2. Backend API responses use `owners_notes` as the field name (aliased from the database column `special_instructions`)
3. The overview page no longer displays the Owner's Notes section
4. Health Profile tab has a new "Owner's Notes" section with expand/collapse, positioned after vaccinations
5. Emergency card displays Owner's Notes in a yellow callout/alert box that is visually prominent
6. The emergency card public API endpoint returns `owners_notes` instead of `special_instructions`
7. Editing Owner's Notes still works (the edit flow should use the new field name in the UI but write to the same database column)
8. No database migration required — this is a display and API layer rename only
