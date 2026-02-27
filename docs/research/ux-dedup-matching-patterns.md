# UX Research: Deduplication & Matching Approval Patterns

Research conducted 2026-02-25 for FurEverCare medication matching approval flow.

## 1. Research Findings Across Tools

### CRMs (Salesforce, HubSpot)

- **Side-by-side field comparison** is the dominant pattern
- **Salesforce**: Field-by-field merge with master record pre-selected. Radio buttons per field. Master record ID preserved. Non-master records go to Recycle Bin (recoverable 15 days). Configurable matching rules (fuzzy/exact) at point of entry.
- **HubSpot**: Pair-wise review with binary Merge/Dismiss. Auto-dedup by email at entry. Daily duplicate scans. Property cherry-picking from either record. Auto-merge option for high-confidence matches.
- Both support "cherry-pick which field value to keep"

### EMRs (Epic, Cerner)

- **Queue-based human review** — no auto-merge (patient safety)
- Conservative matching flags more potential dupes (20%+ dup rates common)
- All merges require **explicit human verification**
- Epic Identity module: flagged potential duplicates go to HIM task lists
- Contact Mover tool for moving encounters between charts
- Cross-org matching uses Care Everywhere ID for manual resolution

### Data Import (Airtable)

- Dedupe Extension: exact/similar/fuzzy matching on user-selected fields
- **"Hide identical fields"** toggle to reduce noise
- **Merge Preview** shows resulting record before commit
- Primary record selection preserves comments/revision history
- Field values cherry-picked with green highlighting
- Import-time **upsert**: auto-update if exists, create if new

### Consumer (Google Contacts)

- **One-click Merge** with auto-combination of non-conflicting fields
- Merge/Dismiss binary per pair, bulk "Merge all" for high-confidence
- Minimal cognitive load — designed for non-experts
- "Merge & fix" section aggregates all suggestions

### Developer (GitHub Merge Conflicts)

- Three-way diff: base / ours / theirs with output preview
- **Per-conflict-hunk resolution**: accept ours, accept theirs, accept both, manual edit
- No defaults — all conflicts must be explicitly resolved
- Color-coded diff (green additions, red removals)
- Some tools offer "accept all ours/theirs" for bulk resolution

## 2. Cross-Cutting Patterns

### Detection & Presentation
| Pattern | Used By |
|---------|---------|
| Side-by-side comparison | Salesforce, HubSpot, Google Contacts, GitHub |
| Confidence scoring | Salesforce, Airtable, FurEverCare (already) |
| Pair-wise review | HubSpot, Google Contacts |
| Grouped duplicate sets | Airtable |
| Queue-based task list | Epic, Cerner |

### Action Spectrum
| Complexity | Actions | Used By |
|-----------|---------|---------|
| Simple | Merge / Dismiss | Google Contacts, HubSpot |
| Moderate | Merge with field selection / Reject / Skip | Salesforce, Airtable |
| Complex | Accept ours / theirs / Manual edit / Keep both | GitHub |

### Default Selection Behavior
- **CRMs**: Pre-select master record values, require explicit override
- **EMRs**: No defaults — all merges require explicit human decision
- **Consumer apps**: Auto-merge non-conflicting, only surface true conflicts
- **Import tools**: Upsert as default (update-if-exists, create-if-new)

## 3. FurEverCare Current State & Gaps

### Current Implementation
- Backend checks medication name match (case-insensitive via `findPetMedicationByName`)
- Amber warning banner: "Existing medication found: {name}. Approving will update the existing record instead of creating a duplicate."
- Auto-merge on approve: updates non-null fields in existing record
- All pending items pre-selected for approval
- Batch approve/reject via selection checkboxes
- Confidence color-coding on cards (green/yellow/red)

### Gaps Identified
1. No change summary showing what will actually change
2. No "keep existing / skip" action for duplicates
3. No side-by-side comparison of existing vs imported values
4. No per-field merge control
5. No merge preview before commit
6. Duplicate warning is passive (banner), not interactive

## 4. Four UX Approach Options

### Option A: Enhanced Banner with Smart Defaults (1-2 days)

Upgrade the duplicate warning banner to show existing values inline. Binary toggle: "Update existing" (default) vs "Skip this item".

**Pros:**
- Minimal UI change from current implementation
- Fast to implement — mostly frontend changes to ExtractionItemCard
- Low cognitive load — binary decision per duplicate item
- Preserves existing batch approve/reject workflow
- Good for pet owners who are not data-management experts

**Cons:**
- No per-field merge control
- Users can't cherry-pick which fields to update vs keep
- May silently overwrite existing values users want to keep
- Doesn't scale well if deduplication expands beyond medications

---

### Option B: Side-by-Side Field Comparison (3-5 days)

When a duplicate is detected, expand the card into a two-column comparison: left = existing values, right = imported values. Select which value to keep per field. Merge preview row shows result.

**Pros:**
- Full transparency — users see exactly what will change
- Per-field merge control prevents accidental overwrites
- Merge preview reduces approval anxiety
- Industry-standard pattern (Salesforce-style)
- Extensible to other record types

**Cons:**
- Significantly more UI complexity
- Higher cognitive load for pet owners (not data professionals)
- Requires backend changes for per-field merge decisions
- Card expansion may feel overwhelming for simple cases

---

### Option C: Three-Action Inline Resolution (3-4 days)

Three clear buttons per duplicate: (1) "Update Existing" — merge imported data into existing, (2) "Keep Existing" — reject import, keep as-is, (3) "Create New" — force-create alongside existing. Compact diff of changed fields.

**Pros:**
- Clear, explicit actions with predictable outcomes
- Covers all possible user intents
- Compact diff is more digestible than full side-by-side
- Medical-context appropriate — no silent overwrites
- Moderate effort

**Cons:**
- Three choices per item increases decision fatigue in batch review
- No per-field merge granularity
- "Create New" could lead to true duplicates if misused
- Requires backend support for skip and force-create

---

### Option D: Progressive Disclosure with Smart Merge (4-6 days) — RECOMMENDED

Default view: compact change summary on banner (e.g., "Will update dosage: 10mg → 20mg, add end date"). Actions: Approve (smart merge) / Skip / "Review changes" to expand into side-by-side comparison. Non-duplicates keep current simple flow.

**Pros:**
- Low cognitive load by default — smart merge handles most cases
- Power users can drill into field-level control when needed
- Change summary prevents silent overwrites without requiring full comparison
- Progressive disclosure keeps UI clean for simple cases
- Medical-appropriate transparency
- Extensible pattern for future record types
- Builds on existing infrastructure

**Cons:**
- Most implementation effort of all options
- Two-tier UI needs careful design to avoid confusion
- Change summary generation requires backend computation

## 5. Recommendation

**Primary: Option D (Progressive Disclosure with Smart Merge)**

This best balances pet-owner simplicity with medical-context transparency. The current implementation already has smart merge logic and duplicate detection — Option D adds the critical missing piece: showing users *what will change* before they approve. 90% of users see a clean summary and approve; 10% who want granular control can access it.

**Fallback: Option C (Three-Action Inline Resolution)** if time-constrained — adds the most critical missing capability ("keep existing" action) with moderate effort.

### Phased Implementation
1. **Phase 1**: Add change summary to duplicate banner (what will change)
2. **Phase 2**: Add "Skip/Keep Existing" action for duplicates
3. **Phase 3**: Add expandable side-by-side field comparison
4. **Phase 4**: Add per-field merge control in expanded view
