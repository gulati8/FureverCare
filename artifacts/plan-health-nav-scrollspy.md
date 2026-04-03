# Health Profile Sub-Nav Scroll-Spy Fix

## Problem

The current implementation has a race condition when clicking a health sub-nav item. The `useEffect` in `HealthRecordsSection.tsx` (line 23-30) responds to `location.hash` changes by doing two things simultaneously:

1. Collapsing ALL accordions except the target: `setOpenSections(new Set([hash]))`
2. Scrolling to the target: `el.scrollIntoView({ behavior: 'smooth', block: 'start' })`

Because accordion collapse changes the page height mid-scroll, the smooth scroll lands in the wrong position or jitters visibly. Additionally, the active sub-nav state is driven by `location.hash`, which only updates on click -- it does not track the user's scroll position.

## Architecture

### Data Flow (Current)

```
Sub-nav click -> navigate(health#hash) -> location.hash changes
  -> useEffect fires -> collapse all + scrollIntoView (RACE)
  -> Sub-nav reads location.hash for active state (NO SCROLL TRACKING)
```

### Data Flow (New)

```
Sub-nav click -> callback prop -> open target if closed + scrollTo with offset
  (No collapse of other sections. No hash change needed.)

User scrolls -> IntersectionObserver fires -> updates activeSection ref
  -> Sub-nav reads activeSection for highlight (SCROLL-SPY)

Direct URL with hash (e.g., /health#medications) -> useEffect on mount
  -> open target section + scrollTo with offset (ONE-TIME, no collapse)
```

### Key Design Decisions

1. **Remove hash-based accordion control.** The hash was the coupling mechanism causing the race. Instead, sub-nav clicks call a callback that directly opens the target accordion and scrolls.

2. **Independent accordions.** Each `<details>` element manages its own open/close via `openSections` Set, but clicking a sub-nav item only ADDS to the set (never removes others).

3. **IntersectionObserver for scroll-spy.** Each accordion `<details>` element gets observed. The observer uses `rootMargin: '-20% 0px -80% 0px'` to create a "hotspot" near the top 20% of the viewport. Whichever section heading intersects that zone becomes active.

4. **Scroll offset.** Since there is no fixed/sticky header (the Layout nav scrolls with the page, the sidebar is sticky but in its own column), the offset only needs ~24px of breathing room above the target.

5. **Preserve hash for deep links.** Direct URL navigation (e.g., from Overview stat blocks navigating to `health#medications`) still works: a one-time mount effect reads the hash, opens that section, and scrolls to it. But subsequent sub-nav clicks do NOT change the hash -- they use the callback directly.

6. **State ownership.** The `activeSection` state (for scroll-spy highlight) lives in `HealthRecordsSection` and is passed up to `PetProfileNav` via a new callback/state mechanism. Since these components don't share a direct parent-child relationship (PetProfileNav is a sibling of the Outlet in PetDetail.tsx), the active section must be communicated through the outlet context.

---

## Files Modified

| File | Change |
|------|--------|
| `frontend/src/pages/pet-profile/context.ts` | Add `healthActiveSection` and `setHealthActiveSection` to the context interface |
| `frontend/src/pages/PetDetail.tsx` | Add `healthActiveSection` state, pass it through outlet context |
| `frontend/src/pages/pet-profile/sections/HealthRecordsSection.tsx` | Replace collapse-all-on-hash with open-and-scroll, add IntersectionObserver scroll-spy, report active section to context |
| `frontend/src/pages/pet-profile/PetProfileNav.tsx` | Read `healthActiveSection` from context instead of `location.hash`; change sub-nav click to scroll-based callback instead of `navigate()` |

---

## Tasks

### Task 1: Add scroll-spy state to context and PetDetail

**Files:**
- `frontend/src/pages/pet-profile/context.ts`
- `frontend/src/pages/PetDetail.tsx`

**Changes:**

In `context.ts`:
- Add two new fields to `PetProfileContext` interface:
  - `healthActiveSection: string | null` -- the currently visible health section ID (e.g., `'conditions'`)
  - `setHealthActiveSection: (section: string | null) => void`
  - `scrollToHealthSection: (sectionId: string) => void` -- callback that HealthRecordsSection implements; PetProfileNav calls it

In `PetDetail.tsx`:
- Add `const [healthActiveSection, setHealthActiveSection] = useState<string | null>(null)`
- Add `const [scrollToHealthSection, setScrollToHealthSection] = useState<(id: string) => void>(() => () => {})`
  - Note: this must use the function-returning-function pattern for useState since the value itself is a function
  - Alternative (cleaner): use `useRef<(id: string) => void>` and expose the ref setter. But to keep consistent with the existing context pattern (all values, no refs), use a callback registration pattern:
    - Add `registerScrollToHealthSection: (fn: (id: string) => void) => void` to context instead
    - In PetDetail: `const scrollToHealthRef = useRef<(id: string) => void>(() => {})` and `registerScrollToHealthSection = (fn) => { scrollToHealthRef.current = fn }` and `scrollToHealthSection = (id) => scrollToHealthRef.current(id)`
- Add all three to the `outletContext` object

**Acceptance Criteria:**
- `PetProfileContext` interface has `healthActiveSection`, `setHealthActiveSection`, and `scrollToHealthSection` fields
- `PetDetail.tsx` provides these values through the outlet context
- TypeScript compiles with no errors

**Parallel Group:** A

---

### Task 2: Rewrite HealthRecordsSection scroll behavior and add IntersectionObserver

**File:** `frontend/src/pages/pet-profile/sections/HealthRecordsSection.tsx`

**Changes:**

1. **Remove the collapse-all useEffect** (lines 23-30). Replace with a mount-only effect that handles the initial hash:
   ```
   useEffect(() => {
     const hash = location.hash.replace('#', '');
     if (!hash) return;
     // Open that section (additive, don't collapse others)
     setOpenSections(prev => new Set([...prev, hash]));
     // Delay scroll to let the <details> element open and render
     requestAnimationFrame(() => {
       const el = document.getElementById(hash);
       if (!el) return;
       const y = el.getBoundingClientRect().top + window.scrollY - 24;
       window.scrollTo({ top: y, behavior: 'smooth' });
     });
   }, []);  // Mount-only -- empty deps, NOT location.hash
   ```

2. **Add IntersectionObserver scroll-spy.** After the accordions render, observe all four `<details>` elements by their IDs (`conditions`, `allergies`, `medications`, `vaccinations`):
   ```
   useEffect(() => {
     const sectionIds = ['conditions', 'allergies', 'medications', 'vaccinations'];
     const observer = new IntersectionObserver(
       (entries) => {
         for (const entry of entries) {
           if (entry.isIntersecting) {
             setHealthActiveSection(entry.target.id);
           }
         }
       },
       { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
     );
     for (const id of sectionIds) {
       const el = document.getElementById(id);
       if (el) observer.observe(el);
     }
     return () => observer.disconnect();
   }, [setHealthActiveSection]);
   ```

3. **Register the scrollToHealthSection callback** via the context's `registerScrollToHealthSection`:
   ```
   useEffect(() => {
     registerScrollToHealthSection((sectionId: string) => {
       // Open the section if closed
       setOpenSections(prev => new Set([...prev, sectionId]));
       // Scroll after DOM update
       requestAnimationFrame(() => {
         const el = document.getElementById(sectionId);
         if (!el) return;
         const y = el.getBoundingClientRect().top + window.scrollY - 24;
         window.scrollTo({ top: y, behavior: 'smooth' });
       });
     });
   }, [registerScrollToHealthSection]);
   ```

4. **Keep the onToggle handlers** on each `<details>` element exactly as they are -- they manage independent open/close.

5. **Keep the `openSections` state** and default initialization (`new Set(['conditions', 'allergies'])`).

**Acceptance Criteria:**
- Clicking a sub-nav item opens the target accordion WITHOUT collapsing others
- If the target accordion is already open, it stays open and the page scrolls to it
- Scroll position lands with the section heading ~24px from the top of the viewport
- As the user scrolls manually, `healthActiveSection` in context updates to whichever section is in the top 20-30% of the viewport
- Direct URL with hash (e.g., `/pets/1/health#medications`) opens that section and scrolls to it on mount
- No scroll event listeners -- only IntersectionObserver

**Parallel Group:** B (depends on Task 1)

---

### Task 3: Update PetProfileNav to use scroll-spy active state and callback

**File:** `frontend/src/pages/pet-profile/PetProfileNav.tsx`

**Changes:**

1. **Import `usePetProfileContext`** from `../context` (or use `useOutletContext` -- but the codebase convention in HealthRecordsSection uses `usePetProfileContext`, so follow that).

2. **Read context values:**
   ```
   const { healthActiveSection, scrollToHealthSection } = usePetProfileContext();
   ```
   
   Note: PetProfileNav is NOT inside the `<Outlet>`, it is a sibling. It cannot use `useOutletContext`. Looking at PetDetail.tsx line 225-237, PetProfileNav receives `basePath` and `counts` as props. The context values must be passed as props instead.
   
   **Correction:** Add two new props to PetProfileNav:
   - `healthActiveSection: string | null`
   - `onHealthSubNavClick: (sectionId: string) => void`
   
   In PetDetail.tsx, pass these props:
   - `healthActiveSection={healthActiveSection}`
   - `onHealthSubNavClick={(id) => scrollToHealthRef.current(id)}`

3. **Replace the sub-nav click handler** (line 141):
   - Old: `onClick={() => navigate(\`${basePath}/health#${sub.hash}\`)}`
   - New: When already on the health page (`isHealthActive` is true), call `onHealthSubNavClick(sub.hash)`. When NOT on the health page, keep the navigate call so it routes to health first (the mount effect in HealthRecordsSection will handle the hash).
   ```
   onClick={() => {
     if (isHealthActive) {
       onHealthSubNavClick(sub.hash);
     } else {
       navigate(`${basePath}/health#${sub.hash}`);
     }
   }}
   ```

4. **Replace the active class logic** for sub-items (line 140):
   - Old: `location.hash === \`#${sub.hash}\` ? 'active' : ''`
   - New: `healthActiveSection === sub.hash ? 'active' : ''`

5. **Remove `useNavigate` import** if no longer needed (but it is still used by the sub-nav fallback for cross-page navigation, so keep it).

**Acceptance Criteria:**
- Sub-nav items highlight based on scroll position, not URL hash
- When the user scrolls past "Conditions" into "Allergies", the "Allergies" sub-item gets the `active` class
- Clicking a sub-nav item when already on the health page does NOT change the URL hash
- Clicking a sub-nav item from a different page (e.g., Overview) still navigates to `/health#section`
- No visual change to the sub-nav styling itself -- only the active state logic changes

**Parallel Group:** B (depends on Task 1; can run in parallel with Task 2 since they touch different files, but both depend on Task 1's context changes)

---

## Parallel Execution Plan

```
Task 1 (context + PetDetail)
    |
    +---> Task 2 (HealthRecordsSection) --|
    |                                      |--> Done
    +---> Task 3 (PetProfileNav + props) --|
```

Tasks 2 and 3 can proceed in parallel once Task 1 is complete. They modify different files (`HealthRecordsSection.tsx` vs `PetProfileNav.tsx`), though Task 3 also adds props in `PetDetail.tsx` (which Task 1 also touches). To avoid conflicts: Task 1 adds the state and context fields, Task 3 adds the props to the `<PetProfileNav>` JSX call site. These are different lines in `PetDetail.tsx`, but to be safe, Task 3 should be aware that Task 1 has already modified the file.

---

## Impact on Existing Tests

The e2e tests in `frontend/e2e/prelaunch-pg5-health-profile-nav.spec.ts` check:
- Sub-items visible when health is active -- **still passes** (no change to rendering logic)
- Clicking sub-item sets URL hash -- **WILL FAIL** for the case when already on health page, because we no longer set the hash on click
- Clicking sub-item opens accordion -- **still passes** (we still open it, just without collapsing others)
- Direct URL with hash opens accordion -- **still passes** (mount effect handles this)

Tests that check `page.url().toContain('#conditions')` etc. (lines 113-165) need updating: when already on the health page, the hash will not change. These tests should instead verify the scroll position or the active class on the sub-nav item. However, since these are pre-launch regression tests (not yet in CI), they can be updated as a follow-up.

---

## Edge Cases

1. **User navigates from Overview stat block to health#medications.** This uses `navigate('health#medications')` which changes the route AND sets a hash. The mount effect in HealthRecordsSection reads the hash and opens+scrolls. This still works.

2. **User is on health page, clicks sub-nav for a section that is already open.** The section stays open (Set.add is idempotent), and the page scrolls to it. Correct behavior.

3. **User is on health page, all sections are open, scrolls freely.** The IntersectionObserver updates `healthActiveSection` as sections enter the hotspot. The sub-nav highlights track the scroll. Correct behavior.

4. **Rapid clicking between sub-nav items.** Each click calls `window.scrollTo` which cancels any in-progress smooth scroll (browser behavior). The accordion open is additive and non-destructive. No race condition.

5. **Page load with no hash.** Default `openSections` is `['conditions', 'allergies']`. No scroll. IntersectionObserver will pick up whichever section is visible (likely "conditions" at the top). Correct.

6. **Mobile.** Sub-nav items are only visible in the desktop sidebar (hidden below 1024px via CSS). Mobile pill row does not show sub-items. No change needed for mobile.
