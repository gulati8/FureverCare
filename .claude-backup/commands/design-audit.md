# Design Audit & Redesign Mockup Generator

You are performing a comprehensive UX/design audit and producing shareable redesign mockups.

## Input

The user provides a target: `$ARGUMENTS`

This can be:
- A **live URL** (e.g., `https://example.com`) — use Playwright to navigate the site, take screenshots of every distinct page/view, and analyze the rendered UI
- A **local project path** (e.g., `~/Projects/myapp`) — explore the frontend codebase directly, reading all pages, components, styles, and config files

## Workflow

Execute these phases in order:

### Phase 1: Discovery & Analysis

**For live URLs:**
1. Use Playwright to navigate to the URL
2. Take full-page screenshots of every distinct page you can reach (follow nav links, click through flows)
3. Capture mobile (375px) and desktop (1280px) viewpoints
4. Note the tech stack from inspecting the DOM, meta tags, and network requests
5. Document every page, component, interaction, and visual pattern you observe

**For local codebases:**
1. Use an Explore agent to thoroughly map the frontend: framework, file structure, all pages/views/components, styling approach, design tokens, routing
2. Read every frontend file (pages, components, styles, config)
3. Document the complete component inventory, color system, typography, spacing, layout patterns

**For both:**
Conduct a thorough UX audit covering:
- Information architecture & navigation patterns
- Page-by-page layout analysis (what's on screen, in what order, interactive elements, states)
- Form patterns (validation, errors, success, loading)
- Modal/overlay patterns
- Empty states, loading states, error states
- Mobile vs desktop responsive behavior
- Accessibility (focus management, ARIA, keyboard nav, contrast, touch targets, screen reader support)
- Design system consistency (buttons, spacing, colors, typography, card patterns)
- User flow analysis (how users accomplish core tasks, where they get stuck)

### Phase 2: Identify the Core Product & Key Screens

Before proposing redesigns, identify:
1. What is the **core value proposition** of this product? What's the one thing it does that matters most?
2. Is that core thing **prominently surfaced** or buried?
3. Which **5 screens** matter most for the user experience? (These will be mocked up)

### Phase 3: Propose 3 Design Directions

Create 3 distinct visual directions. Each must:
- Have a clear conceptual name and one-line description
- Define: color palette (with hex codes), typography (specific Google Fonts), layout philosophy, surface treatment, motion approach, icon style
- Explain how it addresses the specific UX problems found in the audit
- Identify its target audience and emotional tone
- Acknowledge its risks and tradeoffs

The 3 directions should span a meaningful range — don't propose three variations of the same idea. Aim for genuine contrast in aesthetic philosophy.

### Phase 4: Write the Audit Document

Create a comprehensive markdown document in the project's `docs/redesign/` directory (create it if needed) called `ux-audit.md`. Include:

1. Executive summary (3-4 sentences)
2. Current state overview (tech stack, design system, page/component inventory)
3. Critical UX issues (ranked by severity with clear impact descriptions)
4. Page-by-page audit findings
5. Accessibility audit (with WCAG criteria references)
6. Design system inconsistencies
7. Proposed information architecture changes (if any)
8. The 3 design directions with full descriptions
9. Decision matrix — weighted scoring table with criteria:
   - Trust & credibility (25%)
   - Emotional connection (20%)
   - Usability / clarity (20%)
   - Differentiation (15%)
   - Accessibility (10%)
   - Development effort (10%)
   - Include weighted scores and a recommendation
10. Detailed pros/cons/tradeoffs table for each direction
11. Links to the mockup files

### Phase 5: Build HTML Mockups

**IMPORTANT:** Before building mockups, invoke the `frontend-design` skill using the Skill tool. This ensures all mockups follow production-grade frontend design principles and avoid generic AI aesthetics.

Create 3 self-contained HTML mockup files, one per direction. **Launch all 3 as parallel background agents** for speed.

Each mockup must include the 5 key screens identified in Phase 2, rendered in a single scrollable HTML file with:
- Clear screen dividers with labels ("Screen 1: Homepage", etc.)
- Floating navigation sidebar to jump between screens
- Google Fonts imported (no other external dependencies)
- Responsive CSS (desktop 1280px+ and mobile 375px)
- Hover states on all interactive elements
- Working accordions/toggles using `<details>`/`<summary>` where appropriate
- 44px minimum touch targets
- Inline SVG icons (not emoji, not icon fonts)
- The design direction's full visual language applied consistently

File naming: `mockup-direction-1-[slug].html`, `mockup-direction-2-[slug].html`, `mockup-direction-3-[slug].html`

### Phase 6: Minify for Sharing

After all mockups are complete, minify them using `html-minifier-terser` (via npx) to get file sizes under 64KB for Slack compatibility:

```bash
npx --yes html-minifier-terser --collapse-whitespace --remove-comments --remove-redundant-attributes --minify-css true --minify-js true [input].html -o [input].min.html
```

Verify all `.min.html` files are under 64KB. If any are over, identify and remove the largest non-essential sections (decorative SVGs, repeated patterns) and re-minify.

### Phase 7: Summary

Report back to the user with:
- Location of all deliverables
- File sizes of minified mockups
- Quick summary of the 3 directions and which scored highest
- Instruction to open the `.min.html` files in a browser to review, and share those files in Slack
