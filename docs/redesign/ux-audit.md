# FureverCare UX Audit & Redesign Analysis

**Date:** March 9, 2026
**Scope:** Complete frontend audit — every page, component, flow, and interaction
**Stack:** React 18 + TypeScript + Tailwind CSS + Vite

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Overview](#current-state-overview)
3. [Critical UX Issues](#critical-ux-issues)
4. [Page-by-Page Audit](#page-by-page-audit)
5. [Accessibility Audit](#accessibility-audit)
6. [Design System Inconsistencies](#design-system-inconsistencies)
7. [Proposed Information Architecture](#proposed-information-architecture)
8. [Redesign Directions](#redesign-directions)
9. [Decision Matrix](#decision-matrix)
10. [Mockups](#mockups)

---

## 1. Executive Summary

FureverCare is a pet emergency health card platform with a functional but unrefined frontend. The app works — users can add pets, manage medical records, and share emergency cards. But the UX has significant structural problems that make it harder to use than it should be, particularly around navigation, information hierarchy, and the discoverability of the core product (the emergency card).

**The three most impactful problems:**

1. **PetDetail has 12 flat tabs with no URL state** — back button and reload lose your place, tabs mix unrelated concerns, and most tabs are invisible on mobile
2. **The emergency card (the core product) is buried** — accessible only via a button on PetDetail, with no preview and no clear path to configure what appears on it
3. **Systematic accessibility failures** — no focus management, no ARIA landmarks, no skip links, color-only status indicators, and undersized touch targets throughout

**Recommendation:** A structural redesign of the information architecture (12 tabs → 5 URL-synced sections) combined with a visual refresh. Three directions are proposed with mockups for team review.

---

## 2. Current State Overview

### Tech Stack
- React 18.2.0 + TypeScript 5.3.3
- Vite 5.0.10 (build)
- Tailwind CSS 3.4.0 (styling)
- React Router DOM 6.21.1 (routing)
- Heroicons (icons)
- Stripe Elements (payments)
- qrcode.react (QR generation)
- @dnd-kit (drag-and-drop)

### Current Design System
- **Primary color:** Sage green (#6B9080)
- **Accent color:** Coral (#E07A5F)
- **Headings:** Nunito (600, 700, 800)
- **Body:** Inter (400, 500, 600)
- **Component classes:** `.btn`, `.btn-primary`, `.btn-accent`, `.btn-secondary`, `.btn-danger`, `.input`, `.label`, `.card`, `.error-text`
- **Layout:** max-w-7xl containers, mobile-first responsive

### Page Inventory (21 pages total)

| Page | Route | Auth | Purpose |
|------|-------|------|---------|
| Homepage | `/` | Public | Landing page (CMS-driven) |
| Login | `/login` | Public | Standalone login form |
| Register | `/register` | Public | Standalone registration |
| Forgot Password | `/forgot-password` | Public | Password reset request |
| Reset Password | `/reset-password` | Public | New password form |
| Dashboard | `/dashboard` | Required | Pet list grid |
| Pet Detail | `/pets/:id` | Required | Pet profile + 12 tabs of data |
| Pricing | `/pricing` | Public | Plan comparison |
| Payment | `/payment` | Required | Stripe checkout |
| Payment Confirm | `/payment/confirm` | Required | Payment result |
| Account Settings | `/settings` | Required | Profile + password + subscription summary |
| Billing Settings | `/billing` | Required | Subscription + payment methods |
| Public Card | `/card/:shareId` | Public | Emergency card view |
| Token Card | `/share/:token` | Public | PIN-protected card |
| Accept Invite | `/invite/:code` | Optional | Shared ownership invite |
| Admin Layout | `/admin` | Admin | Sidebar nav wrapper |
| Analytics | `/admin/analytics` | Admin | Platform metrics |
| Users List | `/admin/users` | Admin | User management |
| Pets List | `/admin/pets` | Admin | Pet management |
| CMS Editor | `/admin/cms` | Admin | Homepage content editor |
| Subscription Settings | `/admin/subscriptions` | Admin | Plan config |

### Component Inventory (35+ components)
- 6 homepage components (Navigation, Hero, Features, HowItWorks, CTASection, Footer)
- 8 document import components
- 4 photo import components
- 7 PDF import components
- 3 audit components
- Core: Layout, AuthModal, AddPetModal, EditPetModal, PhotoUpload, EmergencyCardView, ShareModal, ShareWallet, ManageAccessModal, MedicalTimeline, InlineEditForm, FlexibleDateInput, UpgradeBanner, CheckoutForm, SourceDocumentLink, PaymentMethodList, AddPaymentMethodModal

---

## 3. Critical UX Issues

### 3.1 PetDetail: 12 Flat Tabs, No URL State (Severity: Critical)

**Current tabs, all at the same level:**
Overview | Timeline | Conditions | Allergies | Medications | Vaccinations | Veterinarians | Emergency Contacts | Alerts | Images | Import Documents | History

**Problems:**
- `activeTab` is `useState` only — browser back and reload always reset to Overview
- 12 items in a single horizontal scroll is cognitive overload (Miller's Law: 7±2)
- On mobile, tabs 5-12 are invisible with no indication they exist
- Tabs mix fundamentally different concerns:
  - Medical data: Conditions, Allergies, Medications, Vaccinations
  - People: Veterinarians, Emergency Contacts
  - Files: Images, Import Documents
  - Meta: Timeline, History, Alerts (card configuration)
- "Alerts" is misleadingly named — it's actually "configure what shows on the emergency card"
- "Images" vs "Import Documents" is a false distinction from the user's perspective

**Impact:** Users lose work context on every back-button press or page reload. Mobile users may never discover tabs beyond the first 4-5 visible ones.

### 3.2 The Core Product is Buried (Severity: Critical)

The emergency health card — the entire reason FureverCare exists — is only accessible via a "Share Card" button on PetDetail. There is:
- No preview of the card anywhere in the authenticated app
- No clear indication of what information will appear on the card
- The "Alerts" tab (which controls card content) is tab 9 of 12
- No way to see the card from the Overview tab
- No onboarding flow that shows users what they're building toward

**Impact:** Users don't understand the value proposition until they've already done significant data entry. The product's core differentiator is hidden.

### 3.3 Navigation is Disjointed (Severity: High)

- No breadcrumbs anywhere — from PetDetail there's no visible path back to Dashboard
- No pet switcher — to view a different pet, you must go back to Dashboard first
- Homepage nav and app nav are completely different components with different visual patterns
- Admin uses a third navigation paradigm (sidebar)
- Settings are split across two pages (`/settings` and `/billing`) with subscription info duplicated in both

### 3.4 Authentication Flow Fragmentation (Severity: Medium)

Three separate auth entry points:
1. `/login` standalone page
2. `/register` standalone page
3. `AuthModal` overlay on homepage

The modal and pages have identical forms but different layouts. After modal login, user stays on homepage. After `/login`, user goes to dashboard. No redirect preservation (except `/invite`).

### 3.5 Modal Overload (Severity: Medium)

Every data operation opens a modal: AddPet, EditPet, Share, ManageAccess, AddPaymentMethod, plus modals for every medical record type. None have:
- Focus traps
- `role="dialog"` or `aria-modal="true"`
- Consistent sizing (max-w-md vs max-w-lg vs max-w-2xl)
- Animation (they just appear/disappear)
- Mobile-appropriate behavior (bottom sheets)

### 3.6 Form Patterns are Inconsistent (Severity: Medium)

| Pattern | Variants Used |
|---------|--------------|
| Error display | Red banner at top, inline text, `alert()`, `confirm()` |
| Validation | Client-side (some), server-only (some), none (some) |
| Required indicators | Sometimes `*`, sometimes not, no consistent rule |
| Success feedback | Green banner, modal closes silently, "Copied!" text swap |
| Loading states | "Saving..." text, spinner, nothing |

### 3.7 Dashboard Lacks Health Context (Severity: Medium)

Pet cards show only name, breed, species, and DOB. No:
- Vaccination expiration warnings
- Active alert counts
- Recent activity
- Health status indicators
- Action items ("2 documents need review")

### 3.8 Pricing Page UX (Severity: Low)

- Billing toggle is custom buttons without `aria-pressed`
- Feature comparison table duplicates card content
- Free tier presents excluded features with X marks — feels punishing rather than aspirational
- "Start Free Trial" vs "Subscribe Now" distinction is unclear

### 3.9 Settings Page Duplication (Severity: Low)

- Account Settings shows profile, password, AND subscription summary
- Billing Settings shows subscription AND payment methods
- Subscription info appears in both — confusing

---

## 4. Page-by-Page Audit

### Homepage

**Layout:** Fixed transparent-to-white header, full-height hero with gradient bg, features grid, how-it-works timeline, CTA section, dark footer. All CMS-driven.

**Issues:**
- Hero illustration (`hidden lg:flex`) is invisible on mobile — most users never see the best visual
- Navigation scroll state ternary applies identical classes for both states (dead code)
- Features section uses generic icon cards — not distinctive
- No social proof (testimonials, user count, trust badges)
- Pricing is a separate page rather than integrated section

### Login / Register

**Layout:** Centered single-column forms, full viewport height, gray-50 background.

**Issues:**
- No real-time validation feedback
- Password requirements not shown until validation fails
- No password strength indicator
- Error messages not announced to screen readers (no `aria-live`)
- No redirect preservation after login

### Dashboard

**Layout:** Simple header with pet count, grid of pet cards (md:2, lg:3 columns).

**Issues:**
- Cards show minimal info — no health status at a glance
- Empty state is a generic plus icon
- Upgrade banner uses gradient that could have contrast issues
- No activity feed or action items
- No search/filter (matters at scale with premium unlimited pets)

### Pet Detail

**Layout:** Header card (photo, name, breed, action buttons) + 12-tab navigation + tab content in single card.

**Issues:** See Section 3.1 (Critical). Additionally:
- Delete button sits next to Share and Access buttons with no visual separation — accidental deletion risk
- Three action buttons (Access, Share Card, Delete) have no visual hierarchy — all same size
- Photo upload hover state shows camera icon but no text — unclear affordance
- InlineEditForm on Overview tab: pencil icon appears on hover (invisible on touch devices)
- Weight display shows both lbs and kg but the conversion formatting is confusing

### Pricing

**Layout:** Centered header, monthly/annual toggle, two-column card comparison, feature table, FAQ.

**Issues:**
- Toggle lacks proper ARIA attributes
- Feature table repeats card info
- "Current Plan" badge positioning is inconsistent between tiers

### Payment / Payment Confirm

**Layout:** Narrow centered card with Stripe Elements.

**Issues:**
- No order summary visible during payment
- Confirmation page doesn't show what was purchased (plan name, price, billing period)

### Account Settings / Billing Settings

**Issues:**
- Split across two pages with duplicated subscription info
- No unified settings navigation
- Password requirements not stated upfront
- Email shown as disabled field with note — could be clearer

### Public Emergency Card

**Layout:** Red sticky header, alert section with gradient, pet info bar, sectioned content, footer.

**Issues:**
- Sticky header takes too much vertical space on mobile
- Alert section gradients reduce text readability
- Call buttons are small touch targets (under 44px)
- No print stylesheet
- No offline capability
- No "save to phone" option

### Token Card (PIN-Protected)

**Issues:**
- PIN input field is small and not well-labeled
- Error state ("Invalid PIN") doesn't indicate how many attempts remain
- Loading state has no `aria-busy`

---

## 5. Accessibility Audit

### Critical Failures

| Issue | Scope | WCAG Criteria |
|-------|-------|---------------|
| No focus management on modals | All modals (10+) | 2.4.3 Focus Order |
| No focus traps on modals | All modals | 2.1.2 No Keyboard Trap (inverse) |
| Missing `role="dialog"` | All modals | 4.1.2 Name, Role, Value |
| No `aria-live` regions | Error/success messages | 4.1.3 Status Messages |
| No skip-to-content link | All pages | 2.4.1 Bypass Blocks |
| Color-only status indicators | Severity badges, status badges | 1.4.1 Use of Color |
| Touch targets under 44px | Tab navigation, inline edit icons, some buttons | 2.5.5 Target Size |
| Gray-400 text on white bg | Multiple locations | 1.4.3 Contrast (Minimum) |
| Decorative SVGs not `aria-hidden` | Icons throughout | 1.1.1 Non-text Content |
| Mobile menu doesn't trap focus | Navigation component | 2.1.1 Keyboard |

### Moderate Issues

| Issue | Scope |
|-------|-------|
| No keyboard navigation for tabs (arrow keys) | PetDetail tabs |
| Form fields missing `aria-invalid` | All forms |
| Form fields missing `aria-describedby` for errors | All forms |
| No visible focus rings on interactive elements | Buttons, links, inputs |
| QR code has no text alternative | ShareModal |
| Close buttons have no `aria-label` | All modals |
| Password requirements not programmatically associated | Register, Reset Password |

---

## 6. Design System Inconsistencies

### Buttons
- 5 button classes (`.btn-primary`, `.btn-accent`, `.btn-secondary`, `.btn-danger`, plus ad-hoc styled buttons)
- No `.btn-ghost` or `.btn-outline` class despite outline buttons being used
- Button sizes vary: `py-2`, `py-3`, `py-4` used inconsistently
- Some buttons use `btn-` classes, others use raw Tailwind

### Spacing
- Card padding varies: `p-4`, `p-6`, `p-8` with no clear rule
- Section spacing varies: `py-8`, `py-12`, `py-16`, `py-20`, `py-28`
- Gap values vary: `gap-4`, `gap-6`, `gap-8` within similar contexts

### Modals
- Width varies: `max-w-md`, `max-w-lg`, `max-w-2xl`
- Backdrop: sometimes `bg-black/50`, sometimes `bg-black bg-opacity-50`
- Padding varies: `p-4`, `p-6`, `p-8`
- No shared modal component — each is built from scratch

### Colors
- Red used for both danger actions AND error states (no semantic distinction)
- Primary green used for both brand identity AND success states
- Gray-400 used for both secondary text AND disabled states

### Typography
- Heading sizes are inconsistent across pages:
  - Dashboard: `text-2xl`
  - PetDetail: `text-2xl`
  - Settings: `text-2xl`
  - But section headers within pages vary from `text-lg` to `text-xl`

---

## 7. Proposed Information Architecture

### Current (Flat)
```
/dashboard
  └── /pets/:id (12 tabs, state-only)
        ├── Overview
        ├── Timeline
        ├── Conditions
        ├── Allergies
        ├── Medications
        ├── Vaccinations
        ├── Veterinarians
        ├── Emergency Contacts
        ├── Alerts
        ├── Images
        ├── Import Documents
        └── History
/settings
/billing
```

### Proposed (Hierarchical, URL-synced)
```
/dashboard                          → Pet list + health overview + action feed
/pets/:id                           → Pet profile overview + emergency card preview
/pets/:id/health                    → All medical records (single scrollable page)
/pets/:id/health/:section           → Deep link to specific section (anchor)
/pets/:id/care-team                 → Vets + emergency contacts
/pets/:id/documents                 → Images + document imports (combined)
/pets/:id/activity                  → Timeline + audit history (combined)
/settings                           → Unified settings hub
/settings/profile                   → Profile + password
/settings/billing                   → Subscription + payment methods
```

### Navigation Changes
- **Pet profile sidebar** (desktop) / **horizontal pills** (mobile) — 5 items max
- **Breadcrumbs** on all interior pages: Dashboard > Max > Health Records
- **Pet switcher** dropdown in header — switch pets without returning to Dashboard
- **Emergency card preview** prominently on the Overview page — users always see what they're building

### Tab Grouping Logic

| New Section | Contains | Rationale |
|-------------|----------|-----------|
| Overview | Pet info + card preview + quick summary | The "home base" — see everything at a glance |
| Health Records | Conditions, Allergies, Medications, Vaccinations, Card Settings | All medical data in one scrollable view with accordion sections |
| Care Team | Veterinarians, Emergency Contacts | The people in the pet's care — logically grouped |
| Documents | Images + Import Documents | All files in one place — the current split is arbitrary |
| Activity | Timeline + History | All events over time — medical timeline + audit log |

---

## 8. Redesign Directions

### Direction 1: "Veterinary Clarity" — Clinical + Trustworthy

**Concept:** Lean into the medical/health angle. Think: a modern veterinary clinic's digital experience. Clean, precise, confidence-inspiring.

**Visual Language:**
- **Palette:** Deep navy (#1B2A4A) primary, clinical white backgrounds, mint accent (#4ECDC4), red for medical alerts only
- **Typography:** DM Serif Display for headings (authoritative serif), IBM Plex Sans for body (clinical precision)
- **Layout philosophy:** Dense but organized — vital-sign-style stat blocks, structured data tables, medical chart aesthetics
- **Surfaces:** Crisp white cards with subtle 1px borders, no heavy shadows. Thin dividers between sections.
- **Motion:** Minimal and functional — subtle slide-in for cards, pulse on critical alerts, smooth transitions between sections
- **Icons:** Outlined medical icons, monoline style

**How it addresses the core issues:**
- Emergency card preview styled as a medical document — structured, scannable, trustworthy
- Health records section uses a clinical table/grid layout with color-coded severity strips on the left edge
- Dashboard shows pet cards with vital-sign-style indicators (vaccination status, alert count, last checkup)
- Navigation uses a clean left sidebar with clear section hierarchy

**Best for:** Users who want FureverCare to feel like a serious medical tool. Builds trust with veterinary professionals who might view the emergency card.

**Risk:** Could feel cold or clinical for pet owners who see their pets as family members, not patients.

---

### Direction 2: "Warm Companion" — Playful + Organic

**Concept:** Celebrate the emotional bond between pet and owner. Warm, approachable, joyful — but not childish. Think: premium pet brands like The Farmer's Dog or Fi collar.

**Visual Language:**
- **Palette:** Warm cream (#FFF8F0) backgrounds, rich terracotta (#C45D3E), deep forest green (#2D5016), soft amber highlights. Full earth-tone system.
- **Typography:** Fraunces for headings (warm serif with optical sizing and character), Source Sans 3 for body
- **Layout philosophy:** Generous whitespace, organic shapes, rounded containers, pet photos front-and-center
- **Surfaces:** Soft rounded cards with warm shadows, wavy section dividers, subtle paper-like textures
- **Motion:** Gentle and delightful — bounce on interactions, staggered fade-in, parallax on hero, custom paw-print loading animation
- **Icons:** Rounded, filled icons with organic feel

**How it addresses the core issues:**
- Emergency card preview integrated into Overview with an illustrated frame — feels like a keepsake, not a form
- Health records use friendly accordion sections with warm color coding — feels approachable not intimidating
- Dashboard shows large pet portrait cards with overlapping health badges — photo-forward design
- Navigation uses rounded pill buttons — warm and tactile

**Best for:** Pet owners who are emotionally motivated. Makes the app feel personal and caring. Strong brand differentiation.

**Risk:** Could feel unserious to users who want clinical precision. Organic shapes and textures add design complexity.

---

### Direction 3: "Digital Shield" — Bold + Modern Tech

**Concept:** Position FureverCare as a tech-forward safety platform. Think: 1Password for pets, or Life360 applied to pet health. Bold, confident, information-dense.

**Visual Language:**
- **Palette:** Near-black (#0D1117) with electric violet (#7C3AED) and neon green (#10B981). Light mode option: crisp white + violet accents. High contrast throughout.
- **Typography:** Space Mono for data labels and counts (techy monospace), Satoshi for headings and body (modern geometric sans)
- **Layout philosophy:** Dashboard-first, information-dense. Glass-morphism panels, grid-based layouts, data visualization elements.
- **Surfaces:** Glass-morphism cards with backdrop blur, subtle gradients, dark mode as default
- **Motion:** Micro-interactions everywhere — cards scale on hover, status badges pulse, skeleton loading states, smooth shared-element page transitions
- **Icons:** Sharp geometric icons, duotone style

**How it addresses the core issues:**
- Emergency card styled as a digital ID — dark background, monospace data formatting, scannable layout, real-time "last synced" timestamp
- Health records in a dense two-column panel layout — data left, details right, feels like a control panel
- Dashboard shows activity feed with real-time health status monitoring feel — "all systems green"
- Navigation is a full-width horizontal bar with breadcrumbs — information-dense but clear

**Best for:** Tech-savvy users, younger demographics, users who want their pet's data managed like important digital assets.

**Risk:** Dark mode default may not appeal to all demographics. Information-dense layouts may overwhelm casual users. Could feel impersonal.

---

## 9. Decision Matrix

### Scoring Criteria (1-5 scale, 5 = best)

| Criteria | Weight | Dir 1: Veterinary Clarity | Dir 2: Warm Companion | Dir 3: Digital Shield |
|----------|--------|---------------------------|----------------------|----------------------|
| **Trust & credibility** | 25% | 5 — Medical aesthetic inspires confidence | 3 — Warm but may feel less "serious" | 4 — Modern/techy signals competence |
| **Emotional connection** | 20% | 2 — Clinical can feel cold | 5 — Warmth is the entire point | 2 — Tech aesthetic is impersonal |
| **Usability / clarity** | 20% | 5 — Clean hierarchy, scannable | 4 — Clear but decorative elements add noise | 3 — Dense layouts have learning curve |
| **Differentiation** | 15% | 3 — Clean medical design is common in health apps | 5 — Distinctive in pet tech space | 4 — Bold but dark-mode apps are trending |
| **Accessibility** | 10% | 5 — High contrast, clinical clarity | 3 — Warm colors may have contrast issues | 3 — Dark mode needs careful contrast work |
| **Development effort** | 10% | 3 — Moderate (structured layouts) | 2 — High (organic shapes, textures, animations) | 2 — High (glass-morphism, dark mode, dense data layouts) |
| **Weighted Score** | 100% | **3.85** | **3.75** | **3.05** |

### Detailed Tradeoffs

#### Direction 1: Veterinary Clarity

| Pros | Cons |
|------|------|
| Builds trust with vets who view the emergency card | May feel cold for emotional pet owners |
| Clean data presentation makes health records scannable | Less visually distinctive — "medical app" is a common pattern |
| High contrast and structured layouts are inherently accessible | Serif headings need careful sizing on mobile |
| Moderate development complexity — structured grids, not organic shapes | Navy + white is safe but not exciting |
| Emergency card looks like a real medical document — vets take it seriously | Less shareable / "Instagram-worthy" than warmer designs |

#### Direction 2: Warm Companion

| Pros | Cons |
|------|------|
| Strong emotional resonance — users feel the app "gets" their relationship with their pet | Organic shapes and textures increase design/dev complexity |
| Highly differentiated in pet tech (most competitors are generic SaaS) | Warm earth tones need careful contrast checking for WCAG |
| Photo-forward design encourages users to personalize profiles | Decorative elements (waves, blobs) can become visual noise |
| Premium brand feel — aligns with upscale pet market trends | May feel unserious for clinical use cases (vet office viewing card) |
| Most "shareable" — users proud to show friends the app | Typography (Fraunces) is distinctive but needs fallback strategy |

#### Direction 3: Digital Shield

| Pros | Cons |
|------|------|
| Appeals to tech-savvy demographic that values data security | Dark mode as default alienates users who prefer light interfaces |
| Information-dense layouts show more data without scrolling | Dense layouts overwhelm casual/non-technical users |
| Glass-morphism and micro-interactions feel premium and modern | Glass-morphism has browser compatibility edge cases |
| "Digital ID" emergency card concept is novel | Monospace data formatting may feel impersonal for pet info |
| Activity feed concept adds real-time value | Highest development complexity (dark mode, glass effects, animations) |
| Strong password-manager/safety brand positioning | May not resonate with older demographics |

### Recommendation

**Direction 1 (Veterinary Clarity)** scores highest on the weighted matrix due to its strength in trust, usability, and accessibility — the three criteria most critical for a health information product. However, it lacks emotional warmth.

**Suggested approach:** Start with Direction 1 as the structural foundation (layout patterns, data hierarchy, navigation), then selectively incorporate warmth elements from Direction 2 (typography character, earth-tone accents, photo emphasis, loading animations). This hybrid avoids the clinical coldness of pure Direction 1 while maintaining its clarity.

**Direction 3** is the most visually striking but carries the highest risk for the target audience (pet owners of all ages and technical abilities).

---

## 10. Mockups

Interactive HTML mockups for all three directions are available:

- [`mockup-direction-1-veterinary-clarity.html`](./mockup-direction-1-veterinary-clarity.html)
- [`mockup-direction-2-warm-companion.html`](./mockup-direction-2-warm-companion.html)
- [`mockup-direction-3-digital-shield.html`](./mockup-direction-3-digital-shield.html)

Each mockup includes:
1. Homepage hero section
2. Dashboard with pet cards and health indicators
3. Pet profile with the new 5-section navigation
4. Health records page with accordion sections
5. Emergency card preview

Open each HTML file in a browser to review. They are self-contained (no external dependencies except Google Fonts CDN).
