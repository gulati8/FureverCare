# Visual Design Pass — Execution Plan

## Context

You are on branch `ui-remediation-cleanup`. A prior code-plumbing remediation replaced all Tailwind default colors with design tokens, eliminated inline styles, and created component classes (`.page-title`, `.section-title`, `.card-interactive`, `EmptyState`, etc.). The plumbing is clean but the visual output is unchanged — every token mapped to the same color it replaced.

This plan makes the app actually **look better** by tuning token values and adjusting class usage. There are 13 tasks across 3 phases. The detailed spec for every change is in `frontend/PLAN-visual-design.md`. The architecture document is at `.factory-run/architecture.md`. A side-by-side mockup of the warm tone shift is at `frontend/public/mockup-warm-tones.html`.

**Rules:**
- The public emergency card (`EmergencyCard.tsx`) must NOT be modified — only the in-app preview wrapper changes
- No new fonts, no new npm dependencies, no structural/routing changes
- All changes use the existing design token system
- The user has approved the warm surface tone shift after reviewing the mockup

---

## Phase 1: Foundation (must run first — everything else depends on this)

### Task 1: Warm the Token Foundation

**Files:** `frontend/src/index.css`, `frontend/tailwind.config.js`

**What to do:** Update 7 surface color values and 3 shadow values in the `:root` block of `index.css`, and mirror the surface values in `tailwind.config.js`. Add one new token `--color-warm-bg: #FFF8F3` and its Tailwind equivalent `warm: '#FFF8F3'`.

**Exact values — see the "Proposed Token Value Changes" section in `frontend/PLAN-visual-design.md`.** It has the full before/after table.

**Verify:** `npm run build` succeeds. Open the app — every surface, border, divider, and secondary text should shift from cool blue-gray to warm cream/tan. White cards on the warm background should still have clear contrast.

---

## Phase 2: Core Pages (all tasks can run in parallel — they touch different files)

### Task 2: Fix Overview Stat Blocks

**File:** `frontend/src/pages/pet-profile/sections/OverviewSection.tsx`

Replace all four semantic color classes on stat values (`text-warning`, `text-danger`, `text-info`, `text-success`) with `text-navy`. Change the mobile card-preview toggle from `bg-navy` to `bg-surface-100` with `text-surface-600`.

### Task 3: Polish Overview Basic Information

**File:** `frontend/src/pages/pet-profile/tabs/OverviewTab.tsx`

- Add `gap-x-6 gap-y-1` to the `dl` grid
- Change editable field hover from `hover:bg-surface` to `hover:bg-warm`
- Add `italic` to all empty placeholder spans ("Add breed", "Add weight", etc.)
- Wrap populated Owner's Notes in `p-4 bg-warm border border-surface-200 hover:border-surface-300 rounded-lg transition-colors`
- Empty Owner's Notes placeholder gets `italic` too

### Task 4: Soften Emergency Card Preview

**Files:** `frontend/src/pages/pet-profile/EmergencyCardPreview.tsx`, `frontend/src/index.css`

- Reduce phone-frame border-radius from `rounded-3xl` to `rounded-2xl`, lighten shadow, remove `bg-surface-100` tint
- In `index.css`: change `.emergency-card-preview` border from `2px solid var(--color-danger)` to `1.5px solid var(--color-surface-300)`
- Change `.emergency-card-preview-header` background from `var(--color-danger)` to `var(--color-navy)`
- Do NOT touch `EmergencyCard.tsx`

### Task 5: Dashboard Visual Refinements

**File:** `frontend/src/pages/Dashboard.tsx`

- Grid: `lg:grid-cols-2` → `lg:grid-cols-3`
- Action Items heading: raw Tailwind → `section-title mb-3`
- Pet avatar fallback: `bg-navy` → `bg-surface-200`
- Bottom arrow row: add `mt-1`

### Task 6: Health Records Accordion Polish

**Files:** `frontend/src/index.css`, `frontend/src/pages/pet-profile/sections/HealthRecordsSection.tsx`, `frontend/src/pages/pet-profile/tabs/ConditionsTab.tsx`

- Add CSS rule: `.health-accordion[open] { border-left: 3px solid var(--color-navy); }`
- Medications badge: `badge-info` → `badge-navy`
- Vaccinations normal count badge: `badge-success` → `badge-navy`
- Add explicit `divide-surface-200` and `border-surface-200` colors to condition list containers

### Task 7: Care Team Section Refinement

**Files:** `frontend/src/pages/pet-profile/tabs/VetsTab.tsx`, `frontend/src/pages/pet-profile/tabs/ContactsTab.tsx`

- Add `divide-surface-100` to all `divide-y` elements
- Change "Primary" badge from raw classes to `badge badge-navy`

---

## Phase 3: Supporting Pages & Chrome (all tasks can run in parallel — different files)

### Task 8: Auth Pages Visual Upgrade

**Files:** `frontend/src/pages/Login.tsx`, `frontend/src/pages/Register.tsx`, `frontend/src/pages/ForgotPassword.tsx`, `frontend/src/pages/ResetPassword.tsx`

All four pages get the same treatment:
- Replace old paw SVG logo with the actual app logo from `Layout.tsx` (the navy rounded-rect with steel-blue pet face), rendered at 48x48
- `font-extrabold` → `font-bold` (weight 800 not loaded for Fraunces)
- Wrap form in `.card` container: add `card` to the `max-w-md w-full space-y-8` div
- Fix link colors: `text-primary-600 hover:text-primary-500` → `text-steel hover:text-steel-dark`
- Fix buttons: `btn-primary py-3` → `btn btn-primary`

### Task 9: Settings & Billing Visual Consistency

**Files:** `frontend/src/pages/AccountSettings.tsx`, `frontend/src/pages/BillingSettings.tsx`

- All section headings: raw Tailwind → `section-title mb-4`
- AccountSettings subscription info rows: `py-2` → `py-3`
- BillingSettings upgrade CTA: `bg-primary-50 border-primary-200` → `bg-warm border-surface-200`; `text-primary-900` → `text-navy`; `text-primary-700` → `text-surface-600`
- Fix link colors: `text-primary-600` → `text-steel hover:text-steel-dark`

### Task 10: Pricing Page Polish

**File:** `frontend/src/pages/Pricing.tsx`

- Billing toggle: wrap in `bg-surface-100 rounded-lg p-1 inline-flex gap-1`; active state `bg-white text-navy shadow-token-sm`; inactive `bg-transparent text-surface-500 hover:text-navy`
- Savings pill: `bg-accent-400 text-white` → `bg-success-light text-success font-semibold`
- Premium card border: `border-primary-500` → `border-steel`
- Table alternating rows: `bg-surface` → `bg-surface-100`

### Task 11: Layout & Navigation Bar

**File:** `frontend/src/components/Layout.tsx`

- Nav bar: add `shadow-token-sm`
- Nav links: add `hover:text-navy transition-colors`
- Main content: `py-6` → `py-8`

### Task 12: Homepage Warmth

**Files:** `frontend/src/components/homepage/Features.tsx`, `frontend/src/components/homepage/HowItWorks.tsx`, `frontend/src/components/homepage/Hero.tsx`

- Feature cards: `.card` → `.card-interactive`
- Feature icon containers: `var(--color-steel-light)` → `var(--color-warm-bg)`
- Feature icon color: `var(--color-steel)` → `var(--color-coral)`
- HowItWorks step circles: `var(--color-navy)` → `var(--color-coral)`
- HowItWorks connecting lines: `var(--color-navy-50)` → `var(--color-coral-light)`
- Hero gradient: `var(--color-navy-50)` → `var(--color-warm-bg)`

### Task 13: Loading Spinners & Micro-fixes

**Files:** `frontend/src/pages/PublicCard.tsx`, `frontend/src/pages/TokenCard.tsx`, `frontend/src/pages/Pricing.tsx`, `frontend/src/pages/PaymentConfirm.tsx`, `frontend/src/pages/ResetPassword.tsx`, `frontend/src/pages/pet-profile/tabs/OverviewTab.tsx`

- All `border-primary-600` loading spinners → `border-navy`
- OverviewTab field labels: `text-sm text-surface-500` → `text-xs font-medium uppercase tracking-wide text-surface-500`

---

## Execution Order & Parallelism

```
Phase 1:  Task 1 (foundation — must complete first)
              |
              v
Phase 2:  Tasks 2, 3, 4, 5, 6, 7  (all in parallel — different files)
              |
              v
Phase 3:  Tasks 8, 9, 10, 11, 12, 13  (all in parallel — different files)
```

Phase 2 and Phase 3 can also run simultaneously since they touch completely different files. The only hard dependency is that Task 1 completes first.

---

## Verification

After all tasks, visually check:
1. **Overview page** — warm background, navy stat numbers, italic placeholders, warm Owner's Notes card, navy emergency preview header
2. **Dashboard** — 3-column grid on desktop, warm avatar fallback circles
3. **Health Records** — navy left accent on open accordions, consistent badge colors
4. **Auth pages** — correct logo, card-wrapped forms, visible link colors
5. **Homepage** — coral accents on features and how-it-works, warm hero gradient
6. **Settings/Billing/Pricing** — consistent headings, warm upgrade CTA, proper toggle

Then build and deploy.

---

## Reference Documents

- **Detailed spec (exact line numbers, class changes):** `frontend/PLAN-visual-design.md`
- **Architecture & risk assessment:** `.factory-run/architecture.md`
- **Approved mockup:** `frontend/public/mockup-warm-tones.html`
- **Prior code-plumbing plan (already completed):** `frontend/PLAN-ui-remediation.md`
- **Original UX audit:** `docs/redesign/ux-audit.md`
