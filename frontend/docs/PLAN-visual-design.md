# Visual Design Improvement Plan

## Executive Summary

The code-plumbing remediation is complete -- all Tailwind default colors are replaced with design tokens, inline styles are converted, and component classes exist. But the visual output is identical to before because every token maps to the same value it replaced. This plan addresses the **actual visual problems**: garish stat colors, flat information hierarchy, visually heavy emergency card preview, inconsistent spacing/padding, missing warmth, and a clinical/sterile feel that contradicts the "Warm Companion" design direction.

**Strategy**: Tune the existing design token values, adjust CSS component classes, and make targeted class changes in page files. No new fonts, no new dependencies, no structural/routing changes. Everything uses the token system already in place.

---

## Audit Findings by Page

### 1. Overview Section (`OverviewSection.tsx`, `OverviewTab.tsx`)

**Problems identified:**

1. **Stat blocks use four clashing semantic colors** (lines 34-48 of `OverviewSection.tsx`): `text-warning` (yellow), `text-danger` (red), `text-info` (blue), `text-success` (green). Four different hues for simple counts is visually chaotic. These are not semantically meaningful -- "1 condition" is not a "warning".
2. **Basic Information section is visually flat**: The `dl` grid (line 157 of `OverviewTab.tsx`) uses `grid-cols-2 gap-4` with no visual separation between label/value pairs. Empty placeholder text (`text-surface-400 text-sm`, e.g., "Add breed") looks identical in weight to section labels.
3. **Empty field placeholders lack affordance**: "Add weight", "Add microchip ID" etc. are plain gray text with no background, border, or visual hint that they are interactive.
4. **Owner's Notes section** (line 171 of `OverviewTab.tsx`): When populated, it is just plain `text-surface-700` text with no visual container. It looks orphaned.
5. **The pet info card and stat blocks sit in the same column on mobile** but stat blocks have no spacing header/label before them.
6. **Emergency card preview mobile toggle** (line 52-66 of `OverviewSection.tsx`): Uses `bg-navy` for the toggle bar, which is very dark and creates a harsh break.

### 2. Emergency Card Preview (`EmergencyCardPreview.tsx`, `EmergencyCard.tsx`)

**Problems identified:**

1. **Preview is wrapped in a phone-frame** (line 98 of `EmergencyCardPreview.tsx`) with `rounded-3xl border border-surface-300 shadow-[0_4px_24px_rgba(0,0,0,0.10)]` that is visually heavy in the overview grid.
2. **The emergency card header** (`EmergencyCard.tsx` line 100) uses raw `bg-danger` which is a saturated dark red (#C0392B). Combined with the `bg-danger-dark` (#922B21) alert banner below it, the right column is overwhelmed with dark red.
3. **The emergency card preview is max-width 375px** -- on wide desktops where the right column is 340px, this nearly fills it. The phone frame adds bulk.

### 3. Pet Detail Header (`PetDetail.tsx`)

**Problems identified:**

1. **Header card** (line 187): Uses bare `.card` class with default `padding: 24px`. The header content (photo + name + buttons) has inconsistent vertical alignment with `flex-col sm:flex-row`.
2. **Action buttons** (lines 207-229): Three ghost buttons with identical styling (`btn btn-ghost btn-sm border border-surface-200`). No visual hierarchy -- "Share Profile" and "Send Card" look identical.
3. **Weight text** uses `text-surface-400` (line 203) which is too light for meaningful data.

### 4. Dashboard (`Dashboard.tsx`)

**Problems identified:**

1. **Pet cards use `card-interactive`** which has correct hover shadow, but the interior layout has inconsistent spacing: `gap-4 mb-4` for the top section, then `pt-3` for the bottom arrow row.
2. **Health context badges** (`dashboard-pet-health` CSS class) use status-dot + badge mixing. Status dots for "Vaccines current" and badges for "2 alerts on card" look like different design systems.
3. **"Action Items" section** heading uses `text-lg mb-3 text-navy font-semibold` (line 293) which is a raw heading -- not `.section-title`. Inconsistent with the design system.
4. **Grid is `md:grid-cols-2 lg:grid-cols-2`** (line 221) -- on large screens, two wide cards feels sparse.
5. **Empty state** uses a `w-20 h-20 rounded-full bg-navy-50` circle (line 207) that looks cold.

### 5. Health Records Section (`HealthRecordsSection.tsx`)

**Problems identified:**

1. **Accordion sections** look clean structurally but lack visual warmth. The `.health-accordion` uses bare `bg-white` + `border border-surface-200` with no color accent to distinguish sections.
2. **Badge colors in accordion headers** are inconsistent: conditions get `badge-warning`, allergies get `badge-danger`, medications get `badge-info`, vaccinations alternate between `badge-danger` and `badge-success`. The color logic is confusing.
3. **Inside accordion content**, list items (e.g., `ConditionsTab.tsx` line 64) use `p-3` with `divide-y border rounded-lg` but the border uses default Tailwind `border` (no specific color), which falls through to browser default.

### 6. Care Team Section (`CareTeamSection.tsx`)

**Problems identified:**

1. **Two-column grid** (`grid gap-6 lg:grid-cols-2`) with each column using `.card`. The cards lack headers with visual distinction -- both `VetsTab` and `ContactsTab` use `.section-title` but there is no icon or color accent.
2. **List items** use bare `divide-y` without a border-color specification -- inconsistent with health records tabs that use `divide-y border rounded-lg`.

### 7. Auth Pages (Login, Register, ForgotPassword, ResetPassword)

**Problems identified:**

1. **All four pages share the same layout** (`min-h-screen flex items-center justify-center bg-surface`) but use an **old-style paw SVG logo** (circle + path, lines 32-35 of Login.tsx) with `text-primary-600` which maps to `#162240` -- nearly black. This logo does not match the app nav logo (the square-rounded navy pet face).
2. **Submit buttons** use `btn-primary py-3` but lack the `.btn` base class -- missing min-height, display:inline-flex, gap, and font-family normalization. This means auth page buttons render differently from app buttons.
3. **Link colors** use `text-primary-600 hover:text-primary-500` which are extremely dark navy shades. On the light surface background, these links are barely distinguishable from regular text.
4. **Form cards have no visual container** -- just `max-w-md w-full space-y-8` on the raw surface background. No card, no shadow, no border.
5. **Heading uses `font-extrabold`** (weight 800) which is not loaded for Fraunces (only 400, 600, 700 are loaded in index.html). This falls back to system serif at 800 weight.

### 8. Account Settings (`AccountSettings.tsx`)

**Problems identified:**

1. **Three stacked `.card` sections** with `mb-6` between them. Each card has `h2` with `text-lg font-semibold text-navy mb-4`. Consistent but visually flat -- no section icons, no dividers between the page-level sections.
2. **Subscription section** (line 239) uses `border-b border-surface-200` rows that look like a data table but lack the `.data-table` CSS class. Inconsistent with the data-table pattern defined in `index.css`.
3. **"Manage Subscription" link** uses `btn btn-secondary inline-flex` -- the `inline-flex` is redundant since `.btn` already has `inline-flex`.

### 9. Billing Settings (`BillingSettings.tsx`)

**Problems identified:**

1. **Upgrade CTA box** (line 156) uses `bg-primary-50 border-primary-200` which maps to very pale navy tones. The `text-primary-900` and `text-primary-700` are very dark. The box looks cold.
2. **Cancel subscription button** (line 167-169) has `btn btn-ghost border border-danger text-danger hover:bg-danger-light`. The ghost+border+danger combo looks inconsistent with other button patterns.

### 10. Pricing Page (`Pricing.tsx`)

**Problems identified:**

1. **Billing toggle buttons** (lines 121-146) use raw Tailwind classes instead of a toggle component pattern. Active state is `bg-navy text-white`, inactive is `bg-surface-100 text-surface-700`. No animation on toggle.
2. **Free tier card** uses `border-2 border-surface-200` while premium uses `border-2 border-primary-500`. The primary-500 maps to `#1B2A4A` (navy) which is very dark and heavy for a border.
3. **Feature comparison table** (lines 279-321) has no `.data-table` class. Row alternation uses `bg-surface` / `bg-white` which is subtle to the point of invisible (surface is #F8F9FA, white is #FFFFFF).
4. **"Save $X/yr" pill** (line 141) uses `bg-accent-400 text-white` which is coral -- the only coral element on the page. It looks like an error badge.

### 11. Homepage Components

**Problems identified:**

1. **Hero section** (`Hero.tsx`): The emergency card preview mock (lines 58-132) uses **inline styles** for the card body layout. The card itself looks good but the hero section has no visual warmth -- `bg-navy-50` to white gradient is a very cool blue-gray.
2. **Features section** (`Features.tsx`): Feature cards use `.card` class but lack hover state (not `.card-interactive`). Icon containers use `bg-steel-light` (#E8F0F8) which is a very desaturated blue.
3. **HowItWorks section**: Step numbers use `bg-navy` circles which are very dark. The connecting line uses `bg-navy-50` which is nearly invisible.
4. **CTA section** (`CTASection.tsx`): Good gradient from navy to navy-light, but the `btn-coral` CTA button color (#E07A5F) against the navy gradient lacks sufficient contrast warmth.
5. **Footer** (`Footer.tsx`): Uses navy background with surface-400 text and surface-500 for the bottom line. Clean but cold.

### 12. Public Card & Token Card (`PublicCard.tsx`, `TokenCard.tsx`)

**Problems identified:**

1. **Loading spinners** use `border-primary-600` which maps to `#162240` -- nearly black, looks broken.
2. **Token card PIN form** (TokenCard.tsx line 107): The card uses `bg-white rounded-xl shadow-lg` with an `info-light` circle icon. Clean but generic.
3. **Error states** across both pages are well-done with icon circles. No major visual issues.

### 13. Layout Component (`Layout.tsx`)

**Problems identified:**

1. **App nav bar** is minimal and clean. `py-3 bg-white border-b border-surface-200`. The nav links use `text-surface-600` with no hover state.
2. **No user avatar/initials** -- just the user's name as a text link.
3. **Main content area** has `py-6` which is the same as the nav padding, making the nav feel part of the content rather than separate.

---

## Proposed Token Value Changes

These changes modify the design token values in `index.css` `:root` to shift the visual tone toward "Warm Companion" while keeping the existing token names intact. Every component that references these tokens will update automatically.

### File: `frontend/src/index.css` (`:root` block, lines 6-53)

| Token | Current Value | New Value | Rationale |
|-------|--------------|-----------|-----------|
| `--color-surface` | `#F8F9FA` | `#FAF9F7` | Shift from cool blue-gray to warm off-white |
| `--color-surface-100` | `#F1F3F5` | `#F5F3F0` | Warmer light surface |
| `--color-surface-200` | `#E2E5E9` | `#E8E5E0` | Warmer border/divider tone |
| `--color-surface-300` | `#CED4DA` | `#D5D0CA` | Warmer medium border |
| `--color-surface-400` | `#ADB5BD` | `#B5AFA6` | Warmer disabled/placeholder text |
| `--color-surface-500` | `#868E96` | `#8C857C` | Warmer secondary text |
| `--color-surface-600` | `#5A6270` | `#635C54` | Warmer body text |
| `--color-surface-700` | `#3D4551` | `#463F38` | Warmer dark text |
| `--shadow-sm` | `0 1px 2px rgba(27,42,74,0.05)` | `0 1px 2px rgba(70,63,56,0.06)` | Match warm surface tones |
| `--shadow-md` | `0 2px 8px rgba(27,42,74,0.08)` | `0 2px 8px rgba(70,63,56,0.08)` | Match warm surface tones |
| `--shadow-lg` | `0 4px 16px rgba(27,42,74,0.1)` | `0 4px 16px rgba(70,63,56,0.10)` | Match warm surface tones |

### File: `frontend/tailwind.config.js` (lines 51-62)

Update the surface color mapping to match the new `:root` values:

| Key | Current Value | New Value |
|-----|--------------|-----------|
| `surface.DEFAULT` | `#F8F9FA` | `#FAF9F7` |
| `surface.50` | `#F8F9FA` | `#FAF9F7` |
| `surface.100` | `#F1F3F5` | `#F5F3F0` |
| `surface.200` | `#E2E5E9` | `#E8E5E0` |
| `surface.300` | `#CED4DA` | `#D5D0CA` |
| `surface.400` | `#ADB5BD` | `#B5AFA6` |
| `surface.500` | `#868E96` | `#8C857C` |
| `surface.600` | `#5A6270` | `#635C54` |
| `surface.700` | `#3D4551` | `#463F38` |

---

## Task Breakdown

### TASK 1: Warm the Token Foundation (index.css + tailwind.config.js)

**Files:** `frontend/src/index.css`, `frontend/tailwind.config.js`

**Changes:**

1. In `frontend/src/index.css`, update the 7 `--color-surface-*` values and `--color-surface` in the `:root` block (lines 30-38) to the warm values listed in the token table above.
2. In `frontend/src/index.css`, update the 3 `--shadow-*` values (lines 42-44) to use `rgba(70,63,56,...)` instead of `rgba(27,42,74,...)`.
3. In `frontend/tailwind.config.js`, update the `surface` object (lines 52-60) to match the new hex values.
4. In `frontend/src/index.css`, add a new CSS custom property `--color-warm-bg: #FFF8F3;` after the surface block (line 39). This is a very subtle cream for special containers (owner's notes, empty field hints).
5. In `frontend/tailwind.config.js`, add `warm: '#FFF8F3'` to the colors object (e.g., after the surface block).

**Acceptance criteria:**
- All 7 surface token values in `:root` use the warm hex codes from the table
- All 3 shadow tokens use `rgba(70,63,56,...)` base color
- Tailwind config surface values match CSS custom property values exactly
- New `warm` color available in both CSS (`--color-warm-bg`) and Tailwind (`bg-warm`, `text-warm`, etc.)
- App still renders without build errors

---

### TASK 2: Fix Overview Stat Blocks

**Files:** `frontend/src/pages/pet-profile/sections/OverviewSection.tsx`

**Changes:**

1. Lines 34-48: Remove the four different semantic color classes from stat values. Replace all four `text-warning`, `text-danger`, `text-info`, `text-success` with `text-navy`. All stat numbers should be the same color -- they are counts, not alerts.

Specifically:
- Line 34: Change `text-warning` to `text-navy`
- Line 38: Change `text-danger` to `text-navy`
- Line 42: Change `text-info` to `text-navy`
- Line 46: Change `text-success` to `text-navy`

2. Lines 52-66 (mobile toggle button): Change `bg-navy border border-surface-700` to `bg-surface-100 border border-surface-200`. Change the text from `text-surface-400` to `text-surface-600`. This makes the toggle bar feel like a section header rather than a dark interruption.

**Acceptance criteria:**
- All four stat block numbers render in the same navy color
- Mobile card-preview toggle bar uses light surface background, not navy
- No semantic color classes remain on `.pet-profile-stat-value` elements

---

### TASK 3: Polish Overview Basic Information

**Files:** `frontend/src/pages/pet-profile/tabs/OverviewTab.tsx`

**Changes:**

1. Line 157: Add `gap-x-6 gap-y-1` (increase horizontal gap, decrease vertical gap) to the `dl` grid to give label/value pairs more breathing room horizontally while keeping rows compact.

2. Lines 129-137 (the `renderEditableField` display state): Change the hover container from `rounded-lg p-2 -m-2 hover:bg-surface` to `rounded-lg p-3 -m-3 hover:bg-warm`. This gives a warmer hover highlight and slightly more padding for click targets.

3. Empty field placeholders (lines 160-166): For every `<span className="text-surface-400 text-sm">Add ...</span>`, wrap in a styled span:
   - Change from: `<span className="text-surface-400 text-sm">Add breed</span>`
   - Change to: `<span className="text-surface-400 text-sm italic">Add breed</span>`
   
   Add `italic` to all empty placeholder spans. This visually differentiates "this is a prompt" from "this is data" without adding visual clutter.

4. Lines 170-196 (Owner's Notes section): When the notes are populated (line 185), wrap the existing `<p>` in a container with a warm background:
   - Change the parent `<div>` (currently `group cursor-pointer rounded-lg p-2 -m-2 hover:bg-surface`) to `group cursor-pointer rounded-lg p-4 bg-warm border border-surface-200 hover:border-surface-300 transition-colors`
   - Remove the `-m-2` since we now want the container to be visible
   - For the empty state (line 192), change to: `<p className="text-surface-400 text-sm italic">Add owner's notes</p>`

**Acceptance criteria:**
- Basic Information grid has increased horizontal gap
- Hover state on editable fields uses warm cream background (`bg-warm`)
- All empty field placeholders display in italic
- Owner's Notes, when populated, sits in a warm cream card with a subtle border
- Owner's Notes empty state matches the italic pattern of other empty fields

---

### TASK 4: Soften Emergency Card Preview

**Files:** `frontend/src/pages/pet-profile/EmergencyCardPreview.tsx`, `frontend/src/index.css`

**Changes:**

1. `EmergencyCardPreview.tsx` line 98: Change the phone-frame container from:
   ```
   className="max-w-[375px] rounded-3xl border border-surface-300 shadow-[0_4px_24px_rgba(0,0,0,0.10)] overflow-hidden bg-surface-100"
   ```
   to:
   ```
   className="max-w-[375px] rounded-2xl border border-surface-200 shadow-token-sm overflow-hidden bg-white"
   ```
   Reduce border-radius from 3xl to 2xl (less phone-like, more card-like). Lighten shadow from custom heavy shadow to the standard token-sm. Remove the bg-surface-100 tint (it made the card look dingy).

2. `index.css`: In the `.emergency-card-preview` class (line 607), change `border: 2px solid var(--color-danger)` to `border: 1.5px solid var(--color-surface-300)`. Change `.emergency-card-preview-header` (line 615) from `background: var(--color-danger)` to `background: var(--color-navy)`. This makes the preview header authoritative but not alarming. The actual public card retains its emergency-red styling.

**Acceptance criteria:**
- Emergency card preview in the overview has a lighter, less phone-like frame
- Preview header is navy instead of danger-red
- Preview border is subtle surface-300 instead of thick danger-red
- The public emergency card (`EmergencyCard.tsx`) is NOT changed -- it retains its emergency-red styling
- Preview is visually lighter and does not dominate the right column

---

### TASK 5: Dashboard Visual Refinements

**Files:** `frontend/src/pages/Dashboard.tsx`

**Changes:**

1. Line 221: Change grid from `grid gap-5 md:grid-cols-2 lg:grid-cols-2` to `grid gap-5 md:grid-cols-2 lg:grid-cols-3`. Allow three columns on large screens for users with many pets.

2. Line 293: Change the Action Items heading from `text-lg mb-3 text-navy font-semibold` to `section-title mb-3`. Use the existing `.section-title` CSS component class for consistency.

3. Lines 234-238: The pet photo circle uses `bg-navy` as fallback. Change to `bg-surface-200` for a softer look when there is no photo. The SpeciesAvatar SVG colors will still be visible. Specifically, change `w-16 h-16 rounded-full bg-navy` to `w-16 h-16 rounded-full bg-surface-200`.

4. Line 280: The bottom arrow row uses `border-t border-surface-100 pt-3`. The arrow fill is `var(--color-surface-400)`. This is fine but add `mt-1` to add a tiny bit more space between the health badges and the divider line. Change `border-t border-surface-100 pt-3` to `border-t border-surface-100 pt-3 mt-1`.

**Acceptance criteria:**
- Dashboard shows 3 columns on `lg` breakpoint
- Action Items heading uses `.section-title` class
- Pet avatar fallback circle uses `bg-surface-200` instead of `bg-navy`
- Bottom arrow row has slightly more top margin

---

### TASK 6: Health Records Accordion Polish

**Files:** `frontend/src/index.css`, `frontend/src/pages/pet-profile/sections/HealthRecordsSection.tsx`

**Changes:**

1. In `index.css`, add a left color accent to open accordions. After the `.health-accordion[open] > .health-accordion-summary .health-accordion-chevron` rule (line 597-599), add:
   ```css
   .health-accordion[open] {
     border-left: 3px solid var(--color-navy);
   }
   ```
   This adds a subtle navy left-border accent when an accordion is open, visually distinguishing expanded from collapsed sections.

2. In `HealthRecordsSection.tsx`, normalize the badge usage in accordion headers. The current pattern is inconsistent. Standardize to:
   - Conditions (line 92): Keep `badge badge-warning` but only show when `conditions.length > 0` (already correct)
   - Allergies (line 125): Keep `badge badge-danger` (already correct)
   - Medications (line 158): Change `badge badge-info` to `badge badge-navy`. "Active" medications are not informational -- use the neutral navy badge.
   - Vaccinations (line 190-193): Change the conditional from showing `badge-danger` / `badge-success` to: if `expiringVacs.length > 0` show `badge badge-danger`, else if `vaccinations.length > 0` show `badge badge-navy` (not badge-success). A count of recorded vaccinations is not a "success."

3. In `ConditionsTab.tsx` line 131: Change `divide-y border rounded-lg` to `divide-y divide-surface-200 border border-surface-200 rounded-lg`. Explicitly set divide and border colors.

4. In `ConditionsTab.tsx` line 140: Change `divide-y border rounded-lg opacity-60` to `divide-y divide-surface-200 border border-surface-200 rounded-lg opacity-60`. Same fix.

**Acceptance criteria:**
- Open health accordions show a 3px navy left border accent
- Medications badge uses `badge-navy` instead of `badge-info`
- Vaccinations use `badge-navy` for normal count (not `badge-success`)
- All `divide-y` and `border` on condition lists include explicit color tokens
- No default-Tailwind border colors remain in health tab list containers

---

### TASK 7: Care Team Section Refinement

**Files:** `frontend/src/pages/pet-profile/tabs/VetsTab.tsx`, `frontend/src/pages/pet-profile/tabs/ContactsTab.tsx`

**Changes:**

1. In `VetsTab.tsx` line 67: Change `divide-y` to `divide-y divide-surface-100`. Add explicit divide color.

2. In `ContactsTab.tsx` line 66: Change `divide-y` to `divide-y divide-surface-100`. Same fix.

3. In both files, for the "Primary" badge (VetsTab line 80, ContactsTab line 79): Change `text-xs bg-navy-50 text-primary-700 px-2 py-0.5 rounded` to `badge badge-navy`. Use the existing badge component class for consistency.

**Acceptance criteria:**
- All `divide-y` elements have explicit color tokens
- "Primary" badges use the `.badge .badge-navy` component classes
- Visual consistency between Vets and Contacts tabs

---

### TASK 8: Auth Pages Visual Upgrade

**Files:** `frontend/src/pages/Login.tsx`, `frontend/src/pages/Register.tsx`, `frontend/src/pages/ForgotPassword.tsx`, `frontend/src/pages/ResetPassword.tsx`

**Changes:**

1. In all four files, replace the old paw-print SVG logo with the app's actual logo SVG. The logo SVG is in `Layout.tsx` lines 18-24. Copy that exact SVG markup (the 32x32 navy rounded-rect with steel-blue circles and arc) and use it at 48x48 size. Replace the existing `<svg className="mx-auto w-16 h-16 text-primary-600" viewBox="0 0 100 100" ...>` with:
   ```jsx
   <svg width="48" height="48" viewBox="0 0 32 32" fill="none" className="mx-auto">
     <rect width="32" height="32" rx="10" fill="#1B2A4A"/>
     <circle cx="11" cy="12" r="2" fill="#4A7FB5"/>
     <circle cx="21" cy="12" r="2" fill="#4A7FB5"/>
     <circle cx="16" cy="16" r="1.5" fill="#4A7FB5"/>
     <path d="M9 20c0-3.9 3.1-7 7-7s7 3.1 7 7" stroke="#4A7FB5" strokeWidth="2" strokeLinecap="round"/>
   </svg>
   ```

2. In all four files, change the heading from `text-3xl font-extrabold` to `text-3xl font-bold`. The `font-extrabold` (800) weight is not loaded for Fraunces. `font-bold` (700) is loaded and will render correctly.

3. In all four files, wrap the form content in a card container. Change:
   ```
   <div className="max-w-md w-full space-y-8">
   ```
   to:
   ```
   <div className="max-w-md w-full space-y-8 card">
   ```
   This adds the standard white card with border and border-radius around the form content, giving it a proper visual container.

4. In all four files, fix link colors. Change every instance of `text-primary-600 hover:text-primary-500` to `text-steel hover:text-steel-dark`. The primary-600 is nearly black; steel provides a visible, accessible blue link color.

5. In all four files, fix submit buttons. Change every `btn-primary py-3` to `btn btn-primary`. The `.btn` base class already has correct padding (12px 24px) and the full-width is achieved by the `w-full` on the parent.

**Acceptance criteria:**
- All four auth pages show the correct app logo (navy rounded-rect with pet face), not the old circle SVG
- Headings use `font-bold` (700), not `font-extrabold` (800)
- Forms are wrapped in a `.card` container
- Links use `text-steel hover:text-steel-dark` color
- Submit buttons use `btn btn-primary` with correct base class
- All four pages are visually consistent with each other

---

### TASK 9: Settings & Billing Visual Consistency

**Files:** `frontend/src/pages/AccountSettings.tsx`, `frontend/src/pages/BillingSettings.tsx`

**Changes:**

1. In `AccountSettings.tsx` line 100 and 169: Change section headings from `text-lg font-semibold text-navy mb-4` to `section-title mb-4`. Use the CSS component class.

2. In `AccountSettings.tsx` line 241 and `BillingSettings.tsx` line 123: Same fix -- section headings should use `section-title mb-4`.

3. In `AccountSettings.tsx`, the subscription info rows (lines 243-282) use inline flex layout. These work but lack the `.data-table` aesthetic. Leave them as-is (they are key-value pairs, not tabular data), but add `py-3` instead of `py-2` to lines 243, 249, 269 for more breathing room.

4. In `BillingSettings.tsx` line 156: Change `bg-primary-50 border border-primary-200` to `bg-warm border border-surface-200`. Change `text-primary-900` to `text-navy`. Change `text-primary-700` to `text-surface-600`. This warms up the upgrade CTA box.

5. In `BillingSettings.tsx` line 186: Change `text-primary-600 hover:text-primary-500` to `text-steel hover:text-steel-dark`. Fix the resubscribe link color.

6. In `BillingSettings.tsx` line 199: Same link color fix for "Update Payment Method".

**Acceptance criteria:**
- All section headings in settings pages use `.section-title` class
- Subscription info rows have consistent `py-3` padding
- Upgrade CTA in Billing uses warm background, not cold primary-50
- All links use steel color instead of primary-600

---

### TASK 10: Pricing Page Polish

**Files:** `frontend/src/pages/Pricing.tsx`

**Changes:**

1. Lines 121-146 (billing toggle): Wrap both buttons in a container with `bg-surface-100 rounded-lg p-1 inline-flex gap-1`. Change active state from `bg-navy text-white` to `bg-white text-navy shadow-token-sm`. Change inactive from `bg-surface-100 text-surface-700 hover:bg-surface-200` to `bg-transparent text-surface-500 hover:text-navy`. This creates a segmented-control look instead of two separate buttons.

2. Line 141 (annual savings pill): Change `bg-accent-400 text-white` to `bg-success-light text-success font-semibold`. Green "save" messaging is more universally understood than coral.

3. Line 159 (free tier card): Keep `border-2 border-surface-200`.

4. Line 208 (premium tier card): Change `border-2 border-primary-500` to `border-2 border-steel`. Steel blue (#4A7FB5) is lighter than primary-500 (#1B2A4A) and feels premium without being oppressively dark.

5. Line 211 (current plan badge on premium): Change `bg-primary-500 text-white` to `bg-navy text-white`. Already navy-colored, just use the token name.

6. Lines 296-297 (comparison table alternating rows): Change `bg-surface` to `bg-surface-100` for even rows. The current surface (#FAF9F7 after Task 1) is too close to white to create visible alternation. Surface-100 (#F5F3F0) provides enough contrast.

**Acceptance criteria:**
- Billing toggle looks like a segmented control with inset active state
- Annual savings pill uses green (success) instead of coral (accent)
- Premium card border uses steel blue, not near-black navy
- Table row alternation is visible (surface-100 vs white)

---

### TASK 11: Layout & Navigation Bar Warmth

**Files:** `frontend/src/components/Layout.tsx`

**Changes:**

1. Line 15: Change `py-3 bg-white border-b border-surface-200` to `py-3 bg-white border-b border-surface-200 shadow-token-sm`. Add a very subtle shadow below the nav bar to give it more presence and visually separate it from the content.

2. Lines 40-43: Add hover state to nav links. Change `text-sm font-medium text-surface-600 no-underline` (Settings link, line 42) to `text-sm font-medium text-surface-600 no-underline hover:text-navy transition-colors`. Same for Logout button (line 48): add `hover:text-navy transition-colors`.

3. Line 55: Change main content `py-6` to `py-8`. Give content more vertical breathing room from the nav bar.

**Acceptance criteria:**
- Nav bar has a subtle shadow (`shadow-token-sm`)
- Nav links have hover state transitioning to navy
- Main content has increased top/bottom padding (py-8)

---

### TASK 12: Homepage Warmth & Feature Cards

**Files:** `frontend/src/components/homepage/Features.tsx`, `frontend/src/components/homepage/HowItWorks.tsx`, `frontend/src/components/homepage/Hero.tsx`

**Changes:**

1. In `Features.tsx` line 54: Change `.card` to `.card-interactive` on `FeatureCard`. Feature cards should have the hover shadow lift.

2. In `Features.tsx` line 57: Change `background: 'var(--color-steel-light)'` to `background: 'var(--color-warm-bg)'` for the icon container. Warmer background for feature icons.

3. In `Features.tsx` line 46: Change the icon color from `color: 'var(--color-steel)'` to `color: 'var(--color-coral)'`. Coral icons on warm cream backgrounds create the "Warm Companion" feel.

4. In `HowItWorks.tsx` lines 13-17 and 49-53: The step number circles use `background: 'var(--color-navy)'`. Change to `background: 'var(--color-coral)'`. Coral numbered circles with white text create warmth.

5. In `HowItWorks.tsx` line 35 and 60: Change the connecting line from `background: 'var(--color-navy-50)'` to `background: 'var(--color-coral-light)'`. The coral-light (#FDF0EC) line connects the coral step circles.

6. In `Hero.tsx` line 17: Change the gradient from `linear-gradient(180deg, var(--color-navy-50) 0%, var(--color-white) 40%)` to `linear-gradient(180deg, var(--color-warm-bg) 0%, var(--color-white) 50%)`. Warmer hero background gradient.

**Acceptance criteria:**
- Feature cards have hover shadow lift
- Feature icons are coral on warm cream backgrounds
- How It Works step circles are coral instead of navy
- Connecting lines between steps are coral-light
- Hero gradient uses warm cream instead of cool navy-50
- No inline `style={{}}` changes break existing layout

---

### TASK 13: Loading Spinner & Global Micro-fixes

**Files:** `frontend/src/pages/PublicCard.tsx`, `frontend/src/pages/TokenCard.tsx`, `frontend/src/pages/Pricing.tsx`, `frontend/src/pages/PaymentConfirm.tsx`, `frontend/src/pages/pet-profile/tabs/OverviewTab.tsx`

**Changes:**

1. In every file that has a loading spinner with `border-primary-600`, change to `border-navy`. Files: `PublicCard.tsx` line 32, `TokenCard.tsx` line 82, `Pricing.tsx` line 81, `PaymentConfirm.tsx` line 69, `ResetPassword.tsx` line 69. The `primary-600` is `#162240` which is nearly indistinguishable from black. `border-navy` uses `#1B2A4A` which is the same brand color but via the correct token.

2. In `OverviewTab.tsx` line 113 and line 129: The editable field labels use `text-sm text-surface-500`. Change to `text-xs font-medium uppercase tracking-wide text-surface-500`. This creates a clear "caption label" style that is visually distinct from the field values below.

**Acceptance criteria:**
- All loading spinners use `border-navy` instead of `border-primary-600`
- Overview tab field labels use uppercase caption style
- No references to `border-primary-600` remain in non-admin pages

---

## Parallel Execution Groups

| Group | Tasks | Rationale |
|-------|-------|-----------|
| `foundation` | Task 1 | Must run first -- changes token values that affect everything |
| `overview-polish` | Task 2, Task 3, Task 4 | All modify OverviewSection/OverviewTab/EmergencyCardPreview -- separate files, can run in parallel |
| `page-polish` | Task 5, Task 6, Task 7 | Dashboard, Health Records, Care Team -- separate page files |
| `auth-settings` | Task 8, Task 9, Task 10 | Auth pages, Settings pages, Pricing page -- completely independent files |
| `chrome-homepage` | Task 11, Task 12, Task 13 | Layout chrome, Homepage components, global micro-fixes |

### Execution Order

1. **Phase 1**: `foundation` (Task 1) -- everything else depends on the token values
2. **Phase 2**: `overview-polish` + `page-polish` -- can run simultaneously after Phase 1
3. **Phase 3**: `auth-settings` + `chrome-homepage` -- can run simultaneously after Phase 1

Phase 2 and Phase 3 can also run simultaneously since they touch completely different files.

---

## What This Plan Does NOT Change

- **No structural changes**: No new routes, no component extraction, no new React components
- **No new fonts**: Fraunces and Source Sans 3 are already excellent choices
- **No new dependencies**: Everything uses existing Tailwind utilities and CSS custom properties
- **No admin pages**: Admin layout, analytics, users, pets, CMS, subscription settings are out of scope
- **No accessibility changes**: Focus management, ARIA attributes, screen-reader support are separate concerns
- **No animation additions**: No new animations, transitions, or micro-interactions beyond hover states
- **The public emergency card (`EmergencyCard.tsx`) is preserved as-is**: It needs to look serious and medical for vets. Only the in-app preview wrapper changes.

## Expected Visual Impact

After all 13 tasks:

1. **Warm tones throughout** -- The cool blue-gray surfaces become warm cream/tan, creating an emotional connection
2. **Unified stat blocks** -- Four garish colors become one authoritative navy, letting the labels do the talking
3. **Breathing room** -- Better spacing, padding, and visual separation between sections
4. **Lighter emergency preview** -- Navy header instead of screaming red, lighter frame, less visual weight
5. **Consistent typography** -- Correct font weights, proper heading classes, caption-style labels
6. **Cohesive auth experience** -- Matching logo, proper card containers, visible link colors
7. **Homepage warmth** -- Coral accents, warm gradients, interactive feature cards
8. **Professional polish** -- Proper shadow tokens, hover states, explicit border colors
