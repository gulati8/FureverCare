# Feature Request: Show Only Primary Vet on Emergency Card

## Summary
The emergency pet card currently shows all vets from the care team. It should only show the primary vet.

## Details
- Only display the primary vet on the emergency card
- Non-primary vets should still be visible in the Care Team section, just not on the card
- The emergency card is a public-facing view — showing all vets clutters it and may expose information unnecessarily

## Acceptance Criteria
1. Emergency card displays only the vet marked as `is_primary = true`
2. If no primary vet is set, emergency card shows no vet (not all vets)
3. Care Team tab still shows all vets with their roles
4. Existing API endpoints for the emergency card return only primary vet data
5. No regression in care team management (add/edit/remove vets still works)
