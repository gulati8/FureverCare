# UI/UX Remediation Plan

## Overview

This document describes the exact changes needed across 13 tasks in 3 phases to bring the FureverCare frontend into consistency with its design token system. The app has a well-defined token layer (`index.css` CSS custom properties + `tailwind.config.js` custom colors) but approximately 70 files still reference Tailwind's default `gray-*` palette and 55 files reference default `green-*`, `red-*`, `blue-*`, `yellow-*` classes instead of the semantic surface/success/danger/info/warning tokens. Additionally, 17+ files use inline `style={{}}` for layout, spacing, and color that should be Tailwind utility classes.

---

## PHASE 1: Foundation

### Task 1: Unify the Color System

**Goal:** Replace all Tailwind default palette classes (`text-gray-*`, `bg-gray-*`, `border-gray-*`, `divide-gray-*`, plus `green-*`, `red-*`, `blue-*`, `yellow-*`) with the design-token equivalents defined in `tailwind.config.js`.

**Mapping Table (Gray to Surface):**

| Default Tailwind | Design Token Equivalent |
|---|---|
| `text-gray-900` / `text-gray-800` | `text-navy` (--color-navy, #1B2A4A) |
| `text-gray-700` | `text-surface-700` |
| `text-gray-600` | `text-surface-600` |
| `text-gray-500` | `text-surface-500` |
| `text-gray-400` | `text-surface-400` |
| `text-gray-300` | `text-surface-300` |
| `bg-gray-900` | `bg-navy` |
| `bg-gray-50` / `bg-gray-100` | `bg-surface` or `bg-surface-100` |
| `bg-gray-100` (disabled input) | `bg-surface-100` |
| `bg-gray-200` | `bg-surface-200` |
| `border-gray-200` / `border-gray-100` | `border-surface-200` / `border-surface-100` |
| `border-gray-300` | `border-surface-300` |
| `divide-gray-200` | `divide-surface-200` |
| `hover:bg-gray-50` | `hover:bg-surface` or `hover:bg-surface-100` |
| `hover:bg-gray-100` | `hover:bg-surface-100` |
| `hover:bg-gray-200` | `hover:bg-surface-200` |
| `hover:text-gray-600` | `hover:text-surface-600` |
| `hover:text-gray-800` | `hover:text-navy` |

**Mapping Table (Semantic Colors):**

| Default Tailwind | Design Token Equivalent |
|---|---|
| `bg-red-50` / `bg-red-100` | `bg-danger-light` |
| `text-red-600` / `text-red-700` / `text-red-800` | `text-danger` or `text-danger-dark` |
| `border-red-200` / `border-red-300` | `border-danger-light` (or `border-danger/20` via opacity) |
| `hover:text-red-800` / `hover:text-red-500` | `hover:text-danger-dark` |
| `hover:bg-red-50` | `hover:bg-danger-light` |
| `bg-green-50` / `bg-green-100` | `bg-success-light` |
| `text-green-600` / `text-green-800` / `text-green-500` | `text-success` |
| `border-green-200` | `border-success-light` (or `border-success/20`) |
| `bg-blue-100` | `bg-info-light` |
| `text-blue-600` / `text-blue-800` | `text-info` |
| `hover:text-blue-800` | `hover:text-info` |
| `bg-yellow-50` / `bg-yellow-100` | `bg-warning-light` |
| `text-yellow-800` / `text-yellow-600` | `text-warning` (note: warning text should use darker shade for readability; use inline `[color:var(--color-warning)]` or add a `warning-dark` token) |
| `border-yellow-200` | `border-warning-light` |

**Files to change (70 files for gray, 55 for semantic colors).** Because this is a global find-and-replace, it should be done file-by-file for each directory group to limit risk. The groups are:

**Group A: Pet profile tabs (8 files)**
- `frontend/src/pages/pet-profile/tabs/OverviewTab.tsx`
- `frontend/src/pages/pet-profile/tabs/ConditionsTab.tsx`
- `frontend/src/pages/pet-profile/tabs/AllergiesTab.tsx`
- `frontend/src/pages/pet-profile/tabs/MedicationsTab.tsx`
- `frontend/src/pages/pet-profile/tabs/VaccinationsTab.tsx`
- `frontend/src/pages/pet-profile/tabs/VetsTab.tsx`
- `frontend/src/pages/pet-profile/tabs/ContactsTab.tsx`
- `frontend/src/pages/pet-profile/tabs/AlertsTab.tsx`

Specific examples in OverviewTab.tsx:
- Line 113: `text-sm text-gray-500 mb-1` -> `text-sm text-surface-500 mb-1`
- Line 125: `hover:bg-gray-50` -> `hover:bg-surface`
- Line 129: `text-sm text-gray-500` -> `text-sm text-surface-500`
- Line 131: `text-gray-400` -> `text-surface-400`
- Line 135: `text-gray-900` -> `text-navy`
- Line 145: `text-sm text-gray-500` -> `text-sm text-surface-500`
- Line 147: `text-gray-900` -> `text-navy`
- Line 157: `text-lg font-semibold text-gray-900` -> `text-lg font-semibold text-navy`
- Line 161: `text-gray-400 text-sm` -> `text-surface-400 text-sm`
- Line 166: `text-gray-400 text-sm` -> `text-surface-400 text-sm`
- Line 171: `text-lg font-semibold text-gray-900` -> `text-lg font-semibold text-navy`
- Line 180: `hover:bg-gray-50` -> `hover:bg-surface`
- Line 185: `text-gray-700` -> `text-surface-700`
- Line 192: `text-gray-400 text-sm` -> `text-surface-400 text-sm`

In ConditionsTab.tsx:
- Line 77: `bg-red-100 text-red-700` -> `bg-danger-light text-danger`
- Line 80: `text-sm text-gray-500` -> `text-sm text-surface-500`
- Line 84: `text-sm text-gray-600` -> `text-sm text-surface-600`
- Line 88: `text-red-600 hover:text-red-800` / `text-gray-400 hover:text-gray-600` -> `text-danger hover:text-danger-dark` / `text-surface-400 hover:text-surface-600`
- Line 92: `text-gray-600 hover:text-gray-800` -> `text-surface-600 hover:text-navy`
- Line 97: `text-sm text-gray-500` -> `text-sm text-surface-500`
- Line 98: `text-red-600 hover:text-red-800` -> `text-danger hover:text-danger-dark`
- Line 99: `text-gray-600 hover:text-gray-800` -> `text-surface-600 hover:text-navy`
- Line 102: `text-red-600 hover:text-red-800` -> `text-danger hover:text-danger-dark`
- Line 129: `text-sm font-medium text-gray-500` -> `text-sm font-medium text-surface-500`
- Line 138: `text-sm font-medium text-gray-500` -> `text-sm font-medium text-surface-500`
- Line 146: `text-gray-500` -> `text-surface-500`

The same pattern applies to AllergiesTab, MedicationsTab, VaccinationsTab, VetsTab, ContactsTab, AlertsTab. Each uses the exact same `text-gray-*`, `text-red-*`, `hover:text-red-*`, `hover:text-gray-*`, `hover:bg-gray-*` patterns.

**Group B: Pet profile sections (5 files)**
- `frontend/src/pages/pet-profile/sections/OverviewSection.tsx` (line 89: `text-gray-400`, line 91: `text-blue-600 hover:text-blue-800`)
- `frontend/src/pages/pet-profile/sections/ActivitySection.tsx` (line 24: `text-gray-500`)
- `frontend/src/pages/pet-profile/sections/DocumentsSection.tsx` (line 25: `text-gray-500`)
- `frontend/src/pages/pet-profile/sections/HealthRecordsSection.tsx` (none -- uses design tokens already)
- `frontend/src/pages/pet-profile/sections/CareTeamSection.tsx` (none -- clean)

**Group C: Top-level pages (10 files)**
- `frontend/src/pages/PetDetail.tsx` (lines 289-293: `text-gray-900`, `text-gray-600`)
- `frontend/src/pages/AccountSettings.tsx` (pervasive: `text-gray-900`, `text-gray-700`, `text-gray-500`, `text-gray-600`, `bg-red-50`, `text-red-600`, `border-red-200`, `bg-green-50`, `text-green-600`, `border-green-200`, `border-gray-200`, `bg-gray-100`)
- `frontend/src/pages/BillingSettings.tsx` (same patterns as AccountSettings)
- `frontend/src/pages/Pricing.tsx` (pervasive: `text-gray-900`, `text-gray-600`, `text-gray-500`, `text-gray-700`, `text-gray-400`, `text-gray-300`, `bg-gray-100`, `bg-gray-50`, `hover:bg-gray-200`, `border-gray-200`, `text-green-500`, `bg-primary-500`)
- `frontend/src/pages/Dashboard.tsx` (mostly clean; only uses design tokens via style={{}})
- `frontend/src/pages/PublicCard.tsx` (`bg-gray-50`, `text-gray-300`, `text-gray-900`, `text-gray-500`)
- `frontend/src/pages/TokenCard.tsx` (same as PublicCard)
- `frontend/src/pages/Homepage.tsx` (`text-gray-600`, `bg-gray-900`, `text-gray-400`)
- `frontend/src/pages/ForgotPassword.tsx` (pervasive gray usage)
- `frontend/src/pages/ResetPassword.tsx`, `Register.tsx`, `Login.tsx`, `AcceptInvite.tsx` (same patterns)

**Group D: Components (20+ files)**
- `frontend/src/components/ShareModal.tsx`
- `frontend/src/components/ShareWallet.tsx`
- `frontend/src/components/ManageAccessModal.tsx`
- `frontend/src/components/AddPetModal.tsx`
- `frontend/src/components/EditPetModal.tsx`
- `frontend/src/components/PhotoUpload.tsx`
- `frontend/src/components/CardAlertsModal.tsx`
- `frontend/src/components/MedicalTimeline.tsx`
- `frontend/src/components/InlineEditForm.tsx`
- `frontend/src/components/PaymentMethodList.tsx`
- `frontend/src/components/AddPaymentMethodModal.tsx`
- `frontend/src/components/UpgradeBanner.tsx`
- `frontend/src/components/document-import/DocumentImportSection.tsx`
- `frontend/src/components/document-import/DocumentUploadZone.tsx`
- `frontend/src/components/document-import/ImageReviewForm.tsx`
- `frontend/src/components/document-import/DocumentExtractionReview.tsx`
- `frontend/src/components/pdf-import/*.tsx` (6 files)
- `frontend/src/components/photo-import/*.tsx` (4 files)
- `frontend/src/components/audit/AuditLogViewer.tsx`
- `frontend/src/components/audit/AuditLogEntry.tsx`

**Group E: Admin pages (10 files)**
- `frontend/src/pages/admin/AdminLayout.tsx`
- `frontend/src/pages/admin/AnalyticsDashboard.tsx`
- `frontend/src/pages/admin/UsersList.tsx`
- `frontend/src/pages/admin/UserDetailModal.tsx`
- `frontend/src/pages/admin/PetsList.tsx`
- `frontend/src/pages/admin/PetDetailModal.tsx`
- `frontend/src/pages/admin/CMSEditor.tsx`
- `frontend/src/pages/admin/SubscriptionSettings.tsx`
- `frontend/src/pages/admin/blocks/*.tsx` (6 files)

**Acceptance Criteria:**
- Zero occurrences of `text-gray-`, `bg-gray-`, `border-gray-`, `divide-gray-`, `hover:bg-gray-`, `hover:text-gray-` in any `.tsx` file under `frontend/src/`
- Zero occurrences of `bg-red-`, `text-red-`, `border-red-`, `bg-green-`, `text-green-`, `bg-blue-`, `text-blue-`, `bg-yellow-`, `text-yellow-`, `hover:text-red-`, `hover:bg-red-`, `hover:text-green-` in any `.tsx` file (replaced with semantic tokens)
- App renders identically or better (no missing text, no invisible elements)
- All existing badge classes (`.badge-danger`, `.badge-warning`, etc.) continue to work

**Risks:**
- Some `text-gray-900` instances are on dark backgrounds (modals, etc.) where `text-navy` might be too similar. Verify visually.
- The `bg-gray-50` used on page backgrounds should map to `bg-surface` (same value: #F8F9FA)
- The Homepage footer uses `bg-gray-900` which should become `bg-navy` (visually different: navy is #1B2A4A vs gray-900 #111827). Verify this is the desired look.

**Dependencies:** None. This is purely cosmetic class renaming.

**Parallelism:** Groups A through E can be done in parallel since they touch different files.

---

### Task 2: Eliminate Inline Styles

**Goal:** Convert all `style={{}}` attributes that set layout, spacing, or color to Tailwind utility classes. Keep inline styles only when referencing CSS custom properties that have no Tailwind equivalent.

**Files with inline styles (17 files with significant inline usage):**

**File: `frontend/src/components/Layout.tsx`**
- Line 14: `style={{ background: 'var(--color-surface)' }}` -> `bg-surface` (Tailwind has this)
- Line 15: `style={{ padding: '12px 0', background: 'var(--color-white)', borderBottom: '1px solid var(--color-surface-200)' }}` -> `py-3 bg-white border-b border-surface-200`
- Line 18: `style={{ flexShrink: 0 }}` -> `flex-shrink-0` (already exists in Tailwind)
- Line 25: `style={{ fontFamily: 'var(--font-heading)', fontSize: '1.125rem', color: 'var(--color-navy)', fontWeight: 600 }}` -> `font-heading text-lg text-navy font-semibold` (Note: `font-heading` is in tailwind config)
- Line 35: `style={{ color: 'var(--color-steel)', textDecoration: 'none' }}` -> `text-steel no-underline`
- Line 43: `style={{ color: 'var(--color-surface-600)', textDecoration: 'none' }}` -> `text-surface-600 no-underline`
- Line 50: `style={{ color: 'var(--color-surface-600)', background: 'none', border: 'none', cursor: 'pointer' }}` -> `text-surface-600 bg-transparent border-none cursor-pointer`

**File: `frontend/src/pages/PetDetail.tsx`**
- Line 121: `style={{ borderColor: 'var(--color-navy)' }}` -> `border-navy`
- Line 198: `style={{ color: 'var(--color-navy)', fontWeight: 700 }}` -> `text-navy font-bold`
- Line 199: `style={{ color: 'var(--color-surface-500)' }}` -> `text-surface-500`
- Line 203: `style={{ color: 'var(--color-surface-400)' }}` -> `text-surface-400`
- Line 213: `style={{ border: '1px solid var(--color-surface-200)' }}` -> `border border-surface-200`
- Line 214: SVG `style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }}` -> `inline mr-1.5 align-middle`
- Line 224: Same patterns repeated

**File: `frontend/src/pages/pet-profile/sections/OverviewSection.tsx`**
- Line 23: `style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginBottom: '24px' }}` -> `flex flex-col items-center gap-4 mb-6`
- Line 31: `style={{ textAlign: 'center' }}` -> `text-center`
- Line 32: `style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-navy)' }}` -> `font-heading text-2xl font-bold text-navy`
- Line 35: `style={{ color: 'var(--color-surface-500)', marginTop: '2px' }}` -> `text-surface-500 mt-0.5`
- Line 51: `style={{ color: 'var(--color-surface-400)', marginTop: '4px' }}` -> `text-surface-400 mt-1`
- Line 88: `style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}` -> `flex justify-between items-center mb-2`
- Line 89: `style={{ margin: 0 }}` -> remove (redundant with Tailwind reset)

**File: `frontend/src/pages/Dashboard.tsx`**
- Line 181: `style={{ marginBottom: '24px' }}` -> `mb-6`
- Lines 206-207: `style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--color-navy-50)' }}` -> `w-20 h-20 rounded-full bg-navy-50`
- Line 233: `style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--color-navy)', overflow: 'hidden' }}` -> `w-16 h-16 rounded-full bg-navy overflow-hidden`
- Line 247: `style={{ flex: 1 }}` -> `flex-1`
- Line 248: `style={{ marginBottom: '2px' }}` -> `mb-0.5`
- Line 285: `style={{ borderTop: '1px solid var(--color-surface-100)', paddingTop: '12px' }}` -> `border-t border-surface-100 pt-3`

**File: `frontend/src/components/EmergencyCard.tsx` (44 inline styles)**
This file is the most heavily inline-styled file. Most styles reference `var(--color-*)` tokens which DO have Tailwind equivalents. Convert systematically:
- `style={{ background: 'var(--color-danger)', color: 'white', padding: '14px 16px' }}` -> `bg-danger text-white py-3.5 px-4`
- Font styles: `fontFamily: 'var(--font-body)'` -> already the body default, remove
- `fontWeight: 700` -> `font-bold`
- `letterSpacing: '0.12em'` -> `tracking-widest` (close enough) or keep inline for exact value
- `textTransform: 'uppercase'` -> `uppercase`
- `fontSize: '0.8125rem'` -> `text-[0.8125rem]` or `text-sm` (0.875rem is close)

Note: Some inline styles in EmergencyCard.tsx reference values without exact Tailwind equivalents (e.g., `padding: '14px 16px'`, `fontSize: '0.6875rem'`). For these:
- `14px` -> `py-3.5 px-4` (3.5 * 4 = 14px)
- `0.6875rem` -> `text-[0.6875rem]` (Tailwind arbitrary value)
- `0.9375rem` -> `text-[0.9375rem]`
- Exact `rgba(255,255,255,0.12)` -> `bg-white/[0.12]`

**File: `frontend/src/pages/pet-profile/EmergencyCardPreview.tsx`**
- Lines 98-105: The mobile device frame style block. Convert border/shadow to Tailwind but keep `borderRadius: '24px'` as `rounded-3xl` and keep the box-shadow as `shadow-[0_4px_24px_rgba(0,0,0,0.10)]`.

**Files to change:** Layout.tsx, PetDetail.tsx, OverviewSection.tsx, Dashboard.tsx, EmergencyCard.tsx, EmergencyCardPreview.tsx, and scan all other files for isolated inline styles.

**Acceptance Criteria:**
- No `style={{}}` attributes that set `color`, `background`, `padding`, `margin`, `fontSize`, `fontWeight`, `fontFamily`, `border`, `borderRadius`, `display`, `flexDirection`, `alignItems`, `justifyContent`, `gap`, `textAlign`, `textDecoration`, `cursor`, `overflow`, `textTransform` when the equivalent Tailwind class exists
- Inline styles are retained ONLY for values that have no Tailwind utility (custom shadows, exact non-4px-multiple sizes, etc.) -- and even those should use Tailwind arbitrary value syntax where possible (e.g., `text-[0.6875rem]`)
- App renders identically

**Risks:**
- EmergencyCard.tsx is the public-facing emergency card. Changes must be pixel-precise.
- Some padding values (10px, 14px) don't align to Tailwind's 4px scale. Use arbitrary values `p-[10px]` or round to nearest: 10px -> `p-2.5`, 14px -> `p-3.5`.

**Dependencies:** Should be done after Task 1 (color unification) to avoid double-editing the same lines.

---

### Task 3: Define Heading Hierarchy

**Goal:** Create `.page-title` and `.section-title` component classes in `index.css` and apply them consistently.

**File: `frontend/src/index.css`** -- Add to `@layer components`:

```css
/* Heading hierarchy */
.page-title {
  font-family: var(--font-heading);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-navy);
  line-height: 1.25;
}

.section-title {
  font-family: var(--font-heading);
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-navy);
  line-height: 1.25;
}
```

**Then replace across files:**

- `Dashboard.tsx` line 183: `className="text-2xl" style={{ color: 'var(--color-navy)', fontWeight: 700 }}` -> `className="page-title"`
- `Dashboard.tsx` line 298: `className="text-lg mb-3" style={{ color: 'var(--color-navy)', fontWeight: 600 }}` -> `className="section-title mb-3"`
- `AccountSettings.tsx` line 89: `className="text-2xl font-bold text-gray-900 mb-8"` -> `className="page-title mb-8"`
- `AccountSettings.tsx` lines 93, 161, 233: `className="text-lg font-semibold text-gray-900 mb-4"` -> `className="section-title mb-4"`
- `BillingSettings.tsx` line 63: `className="text-2xl font-bold text-gray-900 mb-8"` -> `className="page-title mb-8"`
- `BillingSettings.tsx` line 78: `className="text-lg font-semibold text-gray-900 mb-4"` -> `className="section-title mb-4"`
- `Pricing.tsx` line 103: `className="text-3xl font-bold text-gray-900 mb-4"` -> keep as-is or define a `.page-title-lg` (this page has special typography)
- Tab section headers (e.g., VetsTab.tsx line 49: `className="text-lg font-semibold"`): -> `className="section-title"`

**Acceptance Criteria:**
- `.page-title` and `.section-title` classes exist in `index.css`
- All top-level page headings use `.page-title`
- All card/section headings use `.section-title`
- No more ad-hoc `text-2xl font-bold text-gray-900` patterns for headings
- Heading font (Fraunces) is applied consistently via these classes

**Dependencies:** Should follow Task 1 (color system) to avoid conflicts.

---

### Task 4: Normalize Spacing Scale

**Goal:** Replace arbitrary CSS values (10px, 14px, etc.) with Tailwind's 4px-multiple scale.

**Current arbitrary values found:**

In `index.css` component classes:
- `.btn` padding: `12px 24px` -> `py-3 px-6` (already 4px multiples, fine)
- `.input` padding: `10px 14px` -> change to `12px 16px` (py-3 px-4)
- `.badge` padding: `3px 10px` -> change to `4px 12px` (py-1 px-3)
- `.pet-profile-nav-item` padding: `10px 14px` -> change to `12px 16px`
- `.pet-profile-nav-item` gap: `10px` -> change to `12px`
- `.data-table th` padding: `10px 16px` -> change to `12px 16px`
- `.data-table td` padding: `14px 16px` -> change to `16px` (all sides)
- `.health-accordion-summary` padding: `16px 20px` -> keep (both 4px multiples)
- `.health-accordion-content` padding: `0 20px 20px` -> keep (20px = 5 * 4px)
- `.health-accordion-title` gap: `10px` -> `12px`
- `.emergency-card-preview-header` padding: `10px 16px` -> `12px 16px`
- `.emergency-card-preview-header` gap: `8px` -> keep (already 4px multiple)

In component inline styles (will be converted to Tailwind in Task 2):
- `marginTop: '2px'` -> round to `mt-1` (4px) or remove
- `marginTop: '4px'` -> `mt-1` (already 4px)
- `fontSize: '0.6875rem'` -> not a spacing concern, leave as arbitrary value

**File: `frontend/src/index.css`** -- Update these specific values:
- `.input` padding: `10px 14px` -> `12px 16px`
- `.badge` padding: `3px 10px` -> `4px 12px`
- `.pet-profile-nav-item` padding: `10px 14px` -> `12px 16px`
- `.pet-profile-nav-item` gap: `10px` -> `12px`
- `.data-table th` padding: `10px 16px` -> `12px 16px`
- `.data-table td` padding: `14px 16px` -> `16px`
- `.health-accordion-title` gap: `10px` -> `12px`
- `.emergency-card-preview-header` padding: `10px 16px` -> `12px 16px`

**Acceptance Criteria:**
- All spacing values in `index.css` component classes are multiples of 4px
- All Tailwind class spacing values in components use the standard scale (no `p-[10px]` or `m-[14px]`)
- Input fields and badges remain visually correct (the 2px changes are subtle)

**Risks:**
- Changing `.input` padding may affect form field alignment. Test login, settings, and pet edit forms.
- Changing `.badge` padding may affect badge alignment in health accordions.

**Dependencies:** None. Can run in parallel with Tasks 1-3.

---

### Task 5: Fix the Billing Page

**Goal:** The `/billing` route renders completely blank (no navbar, no content). Diagnose and fix.

**Current state:** `frontend/src/pages/BillingSettings.tsx` is routed at `/billing` inside the `<Layout>` wrapper. The screenshot shows a completely blank page -- even the Layout navbar is missing, which means the component is crashing during render and the error propagates up.

**Investigation checklist for the implementer:**

1. **Likely crash: `btn-outline` class on line 128** -- This class does not exist in `index.css`. It's used as `className="w-full btn-outline text-red-600 border-red-300 hover:bg-red-50"`. While a missing CSS class shouldn't crash React, verify this isn't causing a cascade issue. Replace with `btn-secondary` or `btn btn-ghost`.

2. **Likely crash: `subscription.currentPeriodEnd.toLocaleDateString()`** -- On line 97, this is guarded by `subscription?.currentPeriodEnd &&`, which should be safe. But verify the `currentPeriodEnd` is actually a `Date` object and not a string. The auth provider converts it (line 72 of useAuth.tsx), but if the billing API returns an unexpected format, `new Date(null)` would create an invalid date, and `toLocaleDateString()` on an invalid Date returns "Invalid Date" (not a crash). So this is probably not the cause.

3. **Check for missing Stripe dependency at import time** -- `BillingSettings.tsx` imports `AddPaymentMethodModal` which imports from `@stripe/react-stripe-js`. If the Stripe Elements package has a version mismatch or initialization error, it could crash on import. The packages are in `package.json` so they should be installed.

4. **Most likely root cause: runtime error in render** -- Add an Error Boundary wrapper or use browser dev tools to check the console for the specific error.

**Fix approach:**
- Open the browser console at `/billing` and identify the exact error
- Apply the fix based on the error
- Additionally, migrate BillingSettings.tsx to use design tokens (this overlaps with Task 1)

**Specific code fixes regardless of crash cause:**
- Line 128: Replace `btn-outline` with `btn btn-ghost border border-danger text-danger hover:bg-danger-light`
- Line 193: Replace `btn-outline` with `btn-secondary`
- Line 200: Replace inline `bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50` with `btn-danger`
- Add a try/catch or error boundary around the component render

**Acceptance Criteria:**
- `/billing` page renders correctly showing subscription info, status badge, and actions
- Free tier users see "Upgrade to Premium" CTA
- Premium users see current subscription details and cancel button
- Navbar is visible
- All buttons use design system `.btn-*` classes

**Dependencies:** Ideally done before Task 1 touches BillingSettings.tsx.

---

## PHASE 2: Layout & Information Architecture

### Task 6: Remove Duplicate Pet Photo/Name Block from OverviewSection

**Goal:** The pet header card in `PetDetail.tsx` (lines 187-231) already shows the pet photo, name, breed, sex, weight. The `OverviewSection.tsx` (lines 22-56) duplicates this with a centered photo+name+breed block. Remove the duplicate.

**File: `frontend/src/pages/pet-profile/sections/OverviewSection.tsx`**

Remove lines 22-56 (the entire block inside `<div className="card">` before `<OverviewTab>`):
```
<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
  <PhotoUpload ... />
  <div style={{ textAlign: 'center' }}>
    <h2 ...>{pet.name}</h2>
    <p ...>{breed/species/age/sex}</p>
    <p ...>{weight}</p>
  </div>
</div>
```

After removal, the left column of the overview grid should just contain the `<OverviewTab>` component wrapped in a card:
```tsx
<div className="card">
  <OverviewTab pet={pet} token={token} onPetUpdated={handlePetUpdated} />
</div>
```

Also remove the now-unused import of `PhotoUpload` (line 6) and `formatWeight` (line 8) from this file.

**Acceptance Criteria:**
- OverviewSection no longer shows a photo/name/breed block
- The header card in PetDetail.tsx remains the single source of pet identity
- The OverviewTab (Basic Information form) still renders in the left column
- The right column (stat blocks + emergency card preview) is unchanged

**Risks:** None. The header card already shows all this info.

**Dependencies:** None. Can be done in parallel with other Phase 2 tasks.

---

### Task 7: Standardize Page Layout Templates

**Goal:** Settings, Billing, and Pricing pages should use the same max-width container as the rest of the app. Currently:
- Layout.tsx wraps content in `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6`
- AccountSettings.tsx uses `max-w-2xl mx-auto` (narrower than Layout)
- BillingSettings.tsx uses `max-w-2xl mx-auto` (same)
- Pricing.tsx uses no max-width wrapper for the top section, then `max-w-4xl mx-auto` for pricing cards, then `max-w-2xl mx-auto` for FAQ

The Layout already provides `max-w-7xl`. The inner `max-w-2xl` is intentional for form pages -- this is a good pattern. But verify it looks correct.

**Assessment:** The current pattern is actually correct for these pages:
- Form pages (Settings, Billing) use `max-w-2xl` to keep forms readable
- Pricing uses `max-w-4xl` for the two-column card grid
- Dashboard uses full `max-w-7xl` from Layout

The real issue is that Pricing.tsx has the header section (`py-8`, lines 99-109) with no explicit container -- it inherits `max-w-7xl` from Layout. The pricing cards then use `max-w-4xl`. This is fine.

**Changes needed:**
- Add a breadcrumb to AccountSettings.tsx (currently missing, unlike Dashboard and PetDetail)
- Add a breadcrumb to BillingSettings.tsx (currently missing)
- Add a breadcrumb to Pricing.tsx (currently missing)
- Ensure the Pricing page header respects the same visual treatment

**File: `frontend/src/pages/AccountSettings.tsx`** -- Add breadcrumb at top:
```tsx
<div className="breadcrumb">
  <Link to="/dashboard">Dashboard</Link>
  <span className="sep">...</span>
  <span className="current">Account Settings</span>
</div>
```

**File: `frontend/src/pages/BillingSettings.tsx`** -- Add breadcrumb at top:
```tsx
<div className="breadcrumb">
  <Link to="/dashboard">Dashboard</Link>
  <span className="sep">...</span>
  <span className="current">Billing</span>
</div>
```

**File: `frontend/src/pages/Pricing.tsx`** -- Add breadcrumb at top:
```tsx
<div className="breadcrumb">
  <Link to="/dashboard">Dashboard</Link>
  <span className="sep">...</span>
  <span className="current">Pricing</span>
</div>
```

**Acceptance Criteria:**
- All three pages have breadcrumbs consistent with Dashboard and PetDetail
- Pages render within appropriate max-width containers
- Visual consistency between all app pages

**Dependencies:** None.

---

### Task 8: Split .card into .card and .card-interactive

**Goal:** Currently `.card` in `index.css` (line 155-164) has a `:hover` rule that adds `box-shadow: var(--shadow-md)`. This is appropriate for clickable cards (dashboard pet cards) but not for static content containers (settings form cards, health accordion wrappers, etc.).

**File: `frontend/src/index.css`** -- Modify the `.card` class:

Remove the hover rule from `.card`:
```css
.card {
  background: var(--color-white);
  border: 1px solid var(--color-surface-200);
  border-radius: var(--radius-lg);
  padding: 24px;
}
```

Add new `.card-interactive`:
```css
.card-interactive {
  @apply card;
  transition: box-shadow 0.15s ease;
  cursor: pointer;
}
.card-interactive:hover {
  box-shadow: var(--shadow-md);
}
```

**Then update files:**

Cards that SHOULD be interactive (clickable):
- `Dashboard.tsx` line 231: `className="card fade-in-up hover:shadow-lg transition-shadow"` -> `className="card-interactive fade-in-up"` (Note: `hover:shadow-lg` is already applied as a Tailwind class, which is slightly different from `var(--shadow-md)`. Unify to use `card-interactive`.)

Cards that should be STATIC (no hover):
- `PetDetail.tsx` line 187: `className="card mb-6"` -> keep as `card mb-6` (static -- it's the header, not clickable)
- `AccountSettings.tsx` lines 92, 160, 232: `className="card mb-6"` -> keep as `card` (static)
- `BillingSettings.tsx` lines 77, 167: `className="card"` -> keep as `card` (static)
- `OverviewSection.tsx` line 22: `className="card"` -> keep as `card` (static)
- `CareTeamSection.tsx` lines 12, 14: `className="card"` -> keep as `card` (static)
- `DocumentsSection.tsx` line 11: `className="card"` -> keep as `card` (static)
- `ActivitySection.tsx` line 12: `className="card"` -> keep as `card` (static)

The `.pet-profile-stat` class (line 496-509) already has its own hover behavior which is fine -- it's a standalone class, not `.card`.

**Acceptance Criteria:**
- `.card` no longer has hover shadow
- `.card-interactive` extends `.card` with hover shadow and cursor pointer
- Dashboard pet cards use `.card-interactive`
- All other cards use `.card` (static)
- No visual regression on non-card elements

**Dependencies:** None.

---

### Task 9: Create Reusable EmptyState Component

**Goal:** Replace the scattered inline empty-state patterns with a reusable component.

**Current patterns (inconsistent):**
- `VetsTab.tsx` line 64: `<p className="text-gray-500 text-center py-8">No veterinarians recorded</p>`
- `ConditionsTab.tsx` line 146: `<p className="text-gray-500 text-center py-8">No medical conditions recorded</p>`
- `AllergiesTab.tsx` line 62: same pattern
- `MedicationsTab.tsx` line 139: same pattern
- `VaccinationsTab.tsx` line 81: same pattern
- `ContactsTab.tsx` line 63: same pattern
- `DocumentImportSection.tsx` line 429: `<h4 className="mt-2 text-sm font-semibold text-gray-900">No documents yet</h4>` + icon
- `ImagesTab.tsx` line 16: `<h3 className="mt-2 text-sm font-medium text-gray-900">No images yet</h3>` + icon
- `Dashboard.tsx` lines 204-215: more complex with icon + heading + subheading + CTA button
- `AlertsTab.tsx` line 78: `<p className="text-gray-400 text-sm text-center py-4 border border-dashed rounded-lg">No items on card yet</p>`

**New file: `frontend/src/components/EmptyState.tsx`**

```tsx
interface EmptyStateProps {
  icon?: React.ReactNode;     // Optional icon/illustration
  title: string;               // e.g., "No veterinarians recorded"
  description?: string;        // Optional secondary text
  action?: React.ReactNode;    // Optional CTA button
  compact?: boolean;           // Smaller padding for inline usage
}
```

The component should render:
- A centered container with vertical padding
- Optional icon (centered above title)
- Title in `text-surface-500` (compact) or `text-navy` (full)
- Optional description in `text-surface-400`
- Optional action button below

**Then replace in files:**

Simple replacements (tabs):
- `VetsTab.tsx` line 64: `<EmptyState title="No veterinarians recorded" compact />`
- `ConditionsTab.tsx` line 146: `<EmptyState title="No medical conditions recorded" compact />`
- `AllergiesTab.tsx`: `<EmptyState title="No allergies recorded" compact />`
- `MedicationsTab.tsx`: `<EmptyState title="No medications recorded" compact />`
- `VaccinationsTab.tsx`: `<EmptyState title="No vaccinations recorded" compact />`
- `ContactsTab.tsx`: `<EmptyState title="No emergency contacts recorded" compact />`

Complex replacement (Dashboard):
- `Dashboard.tsx` lines 204-215: `<EmptyState icon={...} title={emptyStateHeading} description={emptyStateSubheading} action={<button ...>Add Your First Pet</button>} />`

**Acceptance Criteria:**
- `EmptyState` component exists at `frontend/src/components/EmptyState.tsx`
- All existing inline empty-state patterns are replaced with `<EmptyState>`
- Visual appearance matches current design (centered text, appropriate padding)
- `compact` variant has less padding (py-4 vs py-12)
- Works in both card and full-page contexts

**Dependencies:** Task 1 (color unification) should be done first so EmptyState uses design tokens from the start.

---

## PHASE 3: Mobile & Polish

### Task 10: Reduce Mobile Pet Header Stack Height

**Goal:** On mobile, the pet detail page shows: navbar -> breadcrumb -> header card (photo + name + breed + weight + 2 action buttons stacked) -> pill nav -> content. The header card takes too much vertical space before the user sees any content.

**Current structure in `PetDetail.tsx` (lines 187-231):**
The header card has `flex-col sm:flex-row` for the layout, which on mobile becomes a vertical stack: photo+info block, then a row of buttons.

**Changes to `frontend/src/pages/PetDetail.tsx`:**

1. On mobile (< sm), collapse the action buttons into a single "..." menu button:
   - Wrap the two buttons ("Share Profile" and "Send Card") in a `hidden sm:flex gap-2` container
   - Add a mobile-only dropdown menu: `<div className="sm:hidden">` with a single icon button that opens a small dropdown with the two actions

2. Alternatively (simpler approach): Hide button text on mobile, show only icons:
   - Add `hidden sm:inline` to the button text spans
   - The buttons become icon-only on mobile, taking less space

**Recommended approach (simpler, less risk):**
- Change button text labels to be hidden on mobile:
  - Line 217: `Share Profile` text: wrap in `<span className="hidden sm:inline">Share Profile</span>`
  - Line 228: `Send Card` text: wrap in `<span className="hidden sm:inline">Send Card</span>`
- This keeps the buttons as icon-only on mobile (the SVG icons remain visible)
- Ensure the buttons have `title` attributes for accessibility

3. The `flex-col sm:flex-row` layout is fine -- it naturally stacks on mobile.

**Acceptance Criteria:**
- Mobile pet header takes less vertical space
- Action buttons show icons only on mobile, icons + text on desktop
- All functionality remains accessible
- `title` attributes on buttons provide context on mobile

**Dependencies:** None.

---

### Task 11: Fix Pill Nav Overflow/Clipping

**Goal:** The mobile pill navigation text gets clipped by the fade affordance gradient. In the screenshot, "Health Profi..." is visible being cut off by the gradient.

**Current CSS in `index.css`:**
- `.pet-profile-pills-wrapper::after` creates a gradient overlay that is `width: 72px` and `height: 36px`
- `.pet-profile-pills` has `padding-right: 48px` to create space so the last pill isn't under the fade

**Problem:** The fade gradient is 72px wide but the padding-right on the scrollable container is only 48px. This means pills within the last 24px of visible area get partially obscured by the gradient. Also the `height: 36px` may not match the actual pill height with padding.

**File: `frontend/src/index.css`**

Changes:
1. Increase `padding-right` on `.pet-profile-pills` from `48px` to `80px` (ensures no pill is under the gradient)
2. Verify `height: 36px` matches actual pill height. The pill has `padding: 8px 16px` + `font-size: 0.8125rem` + `border: 1px`. That's roughly 8+13+8+2 = 31px. With the normalized spacing (Task 4), pills would be `padding: 8px 16px` -> unchanged. The height should be set to match or use `100%`:
   - Change `height: 36px` to `height: 100%` on the `::after` pseudo-element
3. Optionally reduce the gradient width from 72px to 56px so it covers less of the pills

**Changes:**
```css
.pet-profile-pills-wrapper::after {
  /* ... existing ... */
  width: 56px;         /* was 72px — less aggressive coverage */
  height: 100%;        /* was 36px — match container height */
}

.pet-profile-pills {
  /* ... existing ... */
  padding-right: 64px;  /* was 48px — ensure last pill clears the gradient */
}
```

**Acceptance Criteria:**
- No pill text is obscured by the fade gradient
- The fade gradient still provides a visual cue that more pills exist to the right
- The last pill is fully readable when scrolled into view
- Works on all mobile viewport widths

**Dependencies:** None. Can run in parallel with Tasks 10, 12, 13.

---

### Task 12: Make Emergency Card Preview Collapsible on Mobile

**Goal:** On mobile, the emergency card preview in the overview section takes significant vertical space. Make it collapsible.

**File: `frontend/src/pages/pet-profile/sections/OverviewSection.tsx`**

The emergency card preview is in the right column (lines 87-103). On mobile, the grid collapses to single column, so this appears below the stat blocks and below the overview info.

**Changes:**

Wrap the emergency card preview section in a `<details>` element on mobile:

```tsx
{/* Emergency card preview - collapsible on mobile */}
<details className="lg:open" open>
  <summary className="lg:hidden flex justify-between items-center mb-2 cursor-pointer">
    <p className="text-xs font-semibold uppercase tracking-wide text-surface-400">
      Card Preview
    </p>
    <svg className="w-4 h-4 text-surface-400" ...chevron... />
  </summary>
  <div className="hidden lg:flex justify-between items-center mb-2">
    <p className="text-xs font-semibold uppercase tracking-wide text-surface-400">Preview</p>
    <button ...>Edit</button>
  </div>
  <EmergencyCardPreview ... />
</details>
```

Actually, a simpler approach: Use a state toggle:

```tsx
const [showCardPreview, setShowCardPreview] = useState(false);
// ... in JSX:
<div>
  {/* Desktop: always show */}
  <div className="hidden lg:block">
    <div className="flex justify-between items-center mb-2">...</div>
    <EmergencyCardPreview ... />
  </div>
  {/* Mobile: collapsible */}
  <div className="lg:hidden">
    <button onClick={() => setShowCardPreview(!showCardPreview)} className="w-full flex justify-between items-center py-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-surface-400">Card Preview</span>
      <svg className={`w-4 h-4 text-surface-400 transition-transform ${showCardPreview ? 'rotate-180' : ''}`}>chevron</svg>
    </button>
    {showCardPreview && <EmergencyCardPreview ... />}
  </div>
</div>
```

**Acceptance Criteria:**
- On desktop (lg+), the emergency card preview is always visible (no change)
- On mobile (< lg), a "Card Preview" toggle is shown; the card is hidden by default
- Tapping the toggle shows/hides the card preview
- The Edit button for card alerts is accessible in both views

**Dependencies:** None.

---

### Task 13: Normalize Public Card Typography

**Goal:** The public emergency card (`EmergencyCard.tsx` and `EmergencyCardView.tsx`) should use the design system fonts consistently.

**Current state in `EmergencyCard.tsx`:**
- Line 109: `fontFamily: 'var(--font-body)'` -- correct, but redundant since body sets this
- Line 110: `fontFamily: 'var(--font-body)'` -- same
- Line 185: `fontFamily: 'var(--font-heading)'` -- correct for pet name
- Line 195: `fontFamily: 'monospace'` for microchip ID -- this is intentional (monospace for IDs)

**Problem areas:**
- The public card is loaded at `/card/:shareId` which renders `EmergencyCardView` -> `EmergencyCard`. This page has `min-h-screen` but does NOT go through `Layout.tsx`. The `body` CSS in `index.css` sets `font-family: var(--font-body)`, so the fonts should apply. But if the Google Fonts are loaded only via `index.html`, they're available.

**Verify in `frontend/index.html`:**

<-- need to check this -->

Let me verify the font loading:

The fonts (Fraunces and Source Sans 3) need to be loaded. They're likely in index.html via Google Fonts link tags.

**Changes to `frontend/src/components/EmergencyCard.tsx`:**
- Remove all redundant `fontFamily: 'var(--font-body)'` inline styles (the body already sets this)
- Keep `fontFamily: 'var(--font-heading)'` on the pet name (line 185) or convert to `font-heading` Tailwind class
- Keep `fontFamily: 'monospace'` on microchip ID (intentional)
- Convert the section headers (lines 119, 216, 226, etc.) that use inline `fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em'` to use a consistent pattern

**Suggested approach:** Create a utility class or just ensure all section headers in the emergency card use the same treatment: `text-xs font-bold uppercase tracking-wide` (Tailwind classes).

**File: `frontend/src/components/EmergencyCard.tsx`**
- All `fontFamily: 'var(--font-body)'` occurrences: remove (lines 109, 110, and any others)
- Line 185 `fontFamily: 'var(--font-heading)'`: convert to `className="font-heading"` and remove from style
- All section header blocks (e.g., line 119, 216, 226): extract the inline typography to Tailwind classes

**File: `frontend/src/pages/PublicCard.tsx`**
- Line 30: `bg-gray-50` -> `bg-surface`
- Line 38: `bg-gray-50` -> `bg-surface`
- Line 40: `text-gray-300` -> `text-surface-300`
- Line 41: `text-gray-900` -> `text-navy`
- Line 42: `text-gray-500` -> `text-surface-500`

**File: `frontend/src/pages/TokenCard.tsx`** -- Apply same color token fixes.

**Acceptance Criteria:**
- Public emergency card uses design system fonts (Source Sans 3 for body, Fraunces for pet name)
- No redundant `fontFamily` inline styles
- Section headers in the card use consistent typography (uppercase, tracking, weight)
- PublicCard.tsx and TokenCard.tsx use design tokens instead of default gray palette

**Dependencies:** Task 1 (color unification) and Task 2 (inline style elimination) address much of this. This task focuses on the public card specifically.

---

## Parallelism & Execution Order

### Phase 1 (Foundation)

| Task | Can Parallel With | Must Follow |
|------|------------------|-------------|
| Task 1 (Colors) | Task 4 | -- |
| Task 2 (Inline Styles) | Task 4 | Task 1 (same files, colors first) |
| Task 3 (Headings) | Task 4 | Task 1 (same files) |
| Task 4 (Spacing) | Tasks 1, 3, 5 | -- |
| Task 5 (Billing Fix) | Tasks 1, 4 | -- |

**Recommended execution:**
- Sprint 1: Tasks 1, 4, 5 in parallel
- Sprint 2: Tasks 2, 3 (after Task 1 completes)

### Phase 2 (Layout & IA)

| Task | Can Parallel With | Must Follow |
|------|------------------|-------------|
| Task 6 (Remove Duplicate) | Tasks 7, 8, 9 | Phase 1 |
| Task 7 (Standardize Layout) | Tasks 6, 8, 9 | Phase 1 |
| Task 8 (Card Split) | Tasks 6, 7, 9 | Phase 1 |
| Task 9 (EmptyState) | Tasks 6, 7, 8 | Task 1 |

All Phase 2 tasks can run in parallel since they touch different files.

### Phase 3 (Mobile & Polish)

| Task | Can Parallel With | Must Follow |
|------|------------------|-------------|
| Task 10 (Mobile Header) | Tasks 11, 12, 13 | Phase 1 |
| Task 11 (Pill Nav) | Tasks 10, 12, 13 | Task 4 |
| Task 12 (Collapsible Preview) | Tasks 10, 11, 13 | Task 6 |
| Task 13 (Public Card Typography) | Tasks 10, 11, 12 | Tasks 1, 2 |

All Phase 3 tasks can run in parallel.

---

## File Index (All Files Touched)

### index.css (Tasks 3, 4, 8, 11)
- Add `.page-title`, `.section-title` classes
- Normalize spacing values
- Split `.card` / `.card-interactive`
- Fix pill nav gradient

### tailwind.config.js (Possibly Task 1)
- May need to add `warning-dark` color if missing for text contrast

### Layout.tsx (Tasks 1, 2)
### PetDetail.tsx (Tasks 1, 2, 10)
### OverviewSection.tsx (Tasks 1, 2, 6, 12)
### OverviewTab.tsx (Task 1)
### Dashboard.tsx (Tasks 1, 2, 8, 9)
### AccountSettings.tsx (Tasks 1, 3, 7)
### BillingSettings.tsx (Tasks 1, 3, 5, 7)
### Pricing.tsx (Tasks 1, 7)
### PublicCard.tsx (Tasks 1, 13)
### TokenCard.tsx (Tasks 1, 13)
### EmergencyCard.tsx (Tasks 2, 13)
### EmergencyCardView.tsx (Task 2)
### EmergencyCardPreview.tsx (Task 2)
### PetProfileNav.tsx (no changes needed)
### CareTeamSection.tsx (Task 8 -- verify card usage)
### DocumentsSection.tsx (Tasks 1, 8)
### ActivitySection.tsx (Tasks 1, 8)
### HealthRecordsSection.tsx (already clean)
### All tabs (8 files) (Tasks 1, 9)
### New: EmptyState.tsx (Task 9)
### 20+ component files (Task 1)
### 10+ admin files (Task 1)
### 4 auth pages (Task 1)

---

## Open Questions

1. **Homepage footer:** `bg-gray-900` (#111827) -> `bg-navy` (#1B2A4A) is a visible color shift. Is the navy footer the desired look, or should we add a `bg-dark` token?

2. **Warning text color:** The design tokens have `--color-warning: #E6A817` which is poor contrast for text on white backgrounds. The existing `badge-warning` uses `color: #8B6914` which is better. Should we add a `warning-dark` / `warning-text` token?

3. **Admin pages:** Should admin pages (behind `/admin`) be included in the color remediation, or are they lower priority since only admins see them?

4. **Billing page crash:** The root cause needs runtime debugging. The plan above covers the most likely causes, but the implementer should check the browser console first.

5. **EmergencyCard inline styles:** This component has ~44 inline styles. Full conversion to Tailwind is a significant effort. Should we do a complete conversion or just address the font/color issues and leave layout styles for a future pass?
