# Overview Page Polish — Fix Layout, Fonts, and Emergency Card Preview

## Context

Branch: `ui-remediation-cleanup`. The Overview page (`/pets/:id`) has had a visual design pass (warm tones, design tokens, component classes) but still looks rough. The page is structurally sound but has font inconsistencies, cramped spacing, and an emergency card preview that visually overpowers everything.

**Screenshot reference:** The page currently renders the full public `EmergencyCard` component directly in the right column with no height constraint. With 8+ alerts it creates a massive red block that dominates the layout.

**Key constraint:** `EmergencyCard.tsx` must NOT be modified. It's the public-facing card. The preview wrapper can change, but the card component stays untouched.

---

## Changes

### 1. Phone-Frame Preview for Emergency Card

**File:** `frontend/src/pages/pet-profile/EmergencyCardPreview.tsx`

The preview wrapper should act as a device viewport:
- Max-height ~480px with `overflow-y: auto`
- Thin border (`border-surface-200`), subtle shadow (`shadow-token-sm`), rounded corners (`rounded-2xl`)
- The real `EmergencyCard` renders inside — identical output, just viewed through a constrained window
- User scrolls within the frame to see the full card
- Style the scrollbar subtly (thin, surface-300) or hide it on non-hover

The card component itself is NOT changed. This is purely wrapper styling.

### 2. Stats Grid — 2x2 Instead of 4-Across

**File:** `frontend/src/index.css` (`.pet-profile-stats` rule)

The stat blocks currently try `repeat(4, 1fr)` at `sm` breakpoint, but they live inside a 340px right column — each stat gets ~75px, which is cramped. Change to:
- Always `repeat(2, 1fr)` within the right column
- Remove the `@media (min-width: 640px)` override that forces 4 columns
- Add `margin-bottom: 16px` to create spacing before the preview label

### 3. Font & Color Consistency

**Files:** `frontend/src/pages/pet-profile/sections/OverviewSection.tsx`, `frontend/src/pages/pet-profile/tabs/OverviewTab.tsx`, `frontend/src/pages/PetDetail.tsx`

Problems and fixes:

| Element | Current | Fix |
|---------|---------|-----|
| "Edit" link (next to Preview label) | `text-info hover:text-info` — raw blue, outside brand palette | `text-steel hover:text-steel-dark` |
| "Preview" label | `text-surface-400` — fine, but visually disconnected from "Edit" | Keep as-is, but ensure both use `font-family: var(--font-body)` (they should already via inheritance) |
| Pet name `h1` (PetDetail.tsx) | `text-2xl text-navy font-bold` — Fraunces at weight 700 | `text-2xl text-navy font-semibold` — align to weight 600 like `.section-title` |
| Any `text-info` links on this page | Orphan blue color | Replace with `text-steel hover:text-steel-dark` |

### 4. Field Grid Spacing

**File:** `frontend/src/pages/pet-profile/tabs/OverviewTab.tsx`

The `dl` grid currently uses `gap-y-3`. Bump to `gap-y-4` for more breathing room between field rows. The `gap-x-6` is fine.

### 5. Tighter Vertical Rhythm in Right Column

**File:** `frontend/src/pages/pet-profile/sections/OverviewSection.tsx`

- Reduce gap between stats grid and "Preview" label — currently loose, should feel like one cohesive column
- The "Preview" / "Edit" header row: add `mb-3` (currently `mb-2`) for a bit more room before the card frame
- Consider wrapping the entire right column content in a consistent spacing container

---

## Files Touched

1. `frontend/src/pages/pet-profile/EmergencyCardPreview.tsx` — phone-frame wrapper
2. `frontend/src/pages/pet-profile/sections/OverviewSection.tsx` — link colors, spacing
3. `frontend/src/pages/pet-profile/tabs/OverviewTab.tsx` — field grid gap
4. `frontend/src/pages/PetDetail.tsx` — h1 font weight
5. `frontend/src/index.css` — stats grid rule

## Files NOT Touched

- `frontend/src/components/EmergencyCard.tsx` — must not be modified

---

## Verification

After implementation:
1. Overview page — stats are 2x2, emergency card is in a scrollable phone frame, no red block dominating the layout
2. Fonts — all headings use Fraunces at consistent weight (600), all body text uses Source Sans 3, no orphan colors
3. Links — "Edit" and any interactive text uses `text-steel` / `hover:text-steel-dark`
4. Spacing — field grid has breathing room, right column flows naturally from stats to preview
5. Mobile — stats stay 2x2, card preview collapses behind toggle (existing behavior), everything readable
6. `npm run build` succeeds with no errors
