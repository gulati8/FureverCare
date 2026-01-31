# FureverCare Design System

A comprehensive design guide for FureverCare - the pet emergency health card app.

## Design Principles

1. **Trustworthy** - Health data requires credibility and professionalism
2. **Warm & Caring** - Pet owners love their pets; the design should feel compassionate
3. **Emergency-Ready** - Information must be clear, scannable, and accessible under stress
4. **Friendly** - Approachable without being childish

---

## Color Palettes

### Option 1: Sage & Coral (Recommended)
A calming sage green paired with warm coral accents. Professional yet friendly.

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Primary | Sage Green | `#6B9080` | Headers, primary buttons, navigation |
| Primary Light | Mint | `#A4C3B2` | Backgrounds, hover states |
| Primary Dark | Forest | `#4A7766` | Text on light backgrounds |
| Accent | Coral | `#E07A5F` | CTAs, alerts, important info |
| Accent Light | Peach | `#F4A88C` | Badges, highlights |
| Neutral 100 | Off-White | `#F8F9FA` | Page backgrounds |
| Neutral 200 | Light Gray | `#E9ECEF` | Card backgrounds |
| Neutral 500 | Medium Gray | `#6C757D` | Secondary text |
| Neutral 900 | Charcoal | `#212529` | Primary text |
| Error | Red | `#DC3545` | Error states |
| Warning | Amber | `#F59E0B` | Warnings, allergies |
| Success | Green | `#22C55E` | Confirmations |

### Option 2: Ocean Blue & Sand
A serene blue palette with warm sand tones. Clinical but not cold.

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Primary | Ocean Blue | `#4A90A4` | Headers, primary buttons |
| Primary Light | Sky | `#7AB8C7` | Backgrounds, hover states |
| Primary Dark | Deep Blue | `#2E6171` | Text emphasis |
| Accent | Sand | `#D4A574` | CTAs, warmth |
| Accent Light | Cream | `#E8D5B7` | Badges, highlights |
| Neutral 100 | Pearl | `#F5F5F0` | Page backgrounds |
| Neutral 200 | Stone | `#E5E5E0` | Card backgrounds |
| Neutral 500 | Slate | `#708090` | Secondary text |
| Neutral 900 | Navy | `#1E3A4C` | Primary text |

### Option 3: Warm Plum & Gold
Rich and premium feeling. Distinctive and memorable.

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Primary | Plum | `#7B506F` | Headers, primary buttons |
| Primary Light | Lavender | `#A8879E` | Backgrounds, hover states |
| Primary Dark | Deep Plum | `#5C3D52` | Text emphasis |
| Accent | Gold | `#D4A84B` | CTAs, premium feel |
| Accent Light | Champagne | `#E8D49F` | Badges, highlights |
| Neutral 100 | Cream | `#FAF8F5` | Page backgrounds |
| Neutral 200 | Linen | `#F0EBE5` | Card backgrounds |
| Neutral 500 | Taupe | `#8B8178` | Secondary text |
| Neutral 900 | Espresso | `#2D2926` | Primary text |

### Option 4: Fresh Teal & Terracotta
Modern and energetic. Balances clinical with warmth.

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Primary | Teal | `#2A9D8F` | Headers, primary buttons |
| Primary Light | Aqua | `#5CC4B8` | Backgrounds, hover states |
| Primary Dark | Deep Teal | `#1D7268` | Text emphasis |
| Accent | Terracotta | `#E76F51` | CTAs, energy |
| Accent Light | Salmon | `#F4A98F` | Badges, highlights |
| Neutral 100 | Mist | `#F7F9F9` | Page backgrounds |
| Neutral 200 | Silver | `#E8EDED` | Card backgrounds |
| Neutral 500 | Storm | `#6B7B7B` | Secondary text |
| Neutral 900 | Midnight | `#264653` | Primary text |

---

## Typography

### Font Stack

**Primary Font (Headings):**
```css
font-family: 'Nunito', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```
- Nunito: Rounded, friendly, highly readable
- Fallback to Inter for a more neutral feel

**Body Font:**
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```
- Inter: Clean, professional, excellent readability at small sizes

**Monospace (for codes, IDs):**
```css
font-family: 'JetBrains Mono', 'SF Mono', 'Consolas', monospace;
```

### Type Scale

| Level | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| Display | 48px / 3rem | 700 | 1.1 | Hero headlines |
| H1 | 36px / 2.25rem | 700 | 1.2 | Page titles |
| H2 | 28px / 1.75rem | 600 | 1.3 | Section headers |
| H3 | 22px / 1.375rem | 600 | 1.4 | Card titles |
| H4 | 18px / 1.125rem | 600 | 1.4 | Subsections |
| Body Large | 18px / 1.125rem | 400 | 1.6 | Lead text |
| Body | 16px / 1rem | 400 | 1.6 | Default text |
| Body Small | 14px / 0.875rem | 400 | 1.5 | Secondary info |
| Caption | 12px / 0.75rem | 500 | 1.4 | Labels, metadata |

### Font Weights
- Regular (400): Body text
- Medium (500): Emphasis, labels
- Semibold (600): Subheadings
- Bold (700): Headings, CTAs

---

## Button Styles

### Primary Button
- Background: Primary color
- Text: White
- Border-radius: 8px (slightly rounded, not pill-shaped)
- Padding: 12px 24px
- Font-weight: 600
- Hover: Darken 10%
- Focus: 2px outline with offset
- Shadow: `0 2px 4px rgba(0,0,0,0.1)`

```css
.btn-primary {
  background: var(--primary);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: all 0.2s ease;
}
.btn-primary:hover {
  background: var(--primary-dark);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}
```

### Secondary Button
- Background: Transparent or light gray
- Text: Primary color
- Border: 2px solid primary
- Same radius and padding as primary

### Accent/CTA Button
- Background: Accent color
- Text: White
- Used sparingly for important actions
- Slightly larger for hero CTAs

### Danger Button
- Background: Error color
- Used for destructive actions
- Should have confirmation dialogs

### Button Sizes
- Small: 8px 16px (for inline actions)
- Medium: 12px 24px (default)
- Large: 16px 32px (CTAs, hero sections)

---

## Card & Container Styles

### Standard Card
```css
.card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.05);
}
```

### Elevated Card (for important info)
```css
.card-elevated {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.07), 0 12px 24px rgba(0,0,0,0.1);
}
```

### Emergency Card (for health info display)
```css
.card-emergency {
  background: white;
  border-radius: 16px;
  border-left: 4px solid var(--accent);
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
```

### Section Container
```css
.section {
  max-width: 1200px;
  margin: 0 auto;
  padding: 64px 24px;
}
```

---

## Imagery Style

### Recommended Approach: Illustrations
- **Style**: Flat or semi-flat illustrations with soft gradients
- **Mood**: Warm, friendly, inclusive
- **Subjects**: Diverse pet types (dogs, cats, birds, etc.), happy pet-owner interactions
- **Avoid**: Realistic photos of sick/injured pets, clinical imagery

### Illustration Guidelines
1. Use consistent line weights (2-3px)
2. Soft, rounded shapes (matches rounded UI elements)
3. Limited color palette per illustration (3-4 colors from brand palette)
4. Include diverse pet breeds and owner demographics
5. Show positive scenarios: healthy pets, caring owners, organized info

### Icon Style
- Line icons with rounded caps and joins
- 2px stroke weight
- 24x24 base size
- Consistent with Lucide, Heroicons, or Phosphor icon sets

### Photography (if used)
- Bright, natural lighting
- Soft backgrounds (not stark white)
- Focus on human-pet connection
- Professional but not sterile
- Avoid: dark backgrounds, dramatic shadows, clinical settings

---

## Background Patterns & Textures

### Subtle Pattern Options

**Paw Print Pattern (subtle)**
- Light gray paw prints at 3-5% opacity
- Scattered randomly on hero sections
- Never on content-heavy areas

**Dot Grid**
- Very subtle dot pattern for card backgrounds
- 1-2% opacity
- Adds texture without distraction

**Gradient Overlays**
- Soft gradient from primary-light to white
- Use on hero sections and feature highlights
- Direction: typically top-left to bottom-right

### Hero Section Background
```css
.hero {
  background: linear-gradient(135deg, var(--primary-light) 0%, white 100%);
}
```

### Feature Section Background
```css
.features {
  background: var(--neutral-100);
}
```

---

## Spacing System

Based on 4px base unit:

| Token | Size | Usage |
|-------|------|-------|
| xs | 4px | Inline element spacing |
| sm | 8px | Tight spacing |
| md | 16px | Default spacing |
| lg | 24px | Section padding |
| xl | 32px | Large gaps |
| 2xl | 48px | Section margins |
| 3xl | 64px | Major section breaks |

---

## Accessibility Requirements

1. **Color Contrast**: All text must meet WCAG AA (4.5:1 for body, 3:1 for large text)
2. **Focus States**: Visible focus indicators on all interactive elements
3. **Touch Targets**: Minimum 44x44px for mobile
4. **Alt Text**: All images must have descriptive alt text
5. **Semantic HTML**: Proper heading hierarchy, landmarks

---

## Component Recommendations

### Navigation
- Sticky header on scroll
- Clear logo placement (left)
- Minimal menu items
- Prominent "Sign Up" / "Login" CTAs

### Emergency Card Display
- Clear visual hierarchy: Pet name > Critical info > Details
- Color-coded severity levels for allergies
- Large, scannable text for ER staff
- QR code prominently displayed

### Forms
- Clear labels above fields
- Helpful placeholder text
- Inline validation with friendly messages
- Progress indicators for multi-step forms

### Empty States
- Friendly illustrations
- Clear next-action CTAs
- Encouraging copy

---

## Implementation Notes

### CSS Variables (example)
```css
:root {
  /* Sage & Coral palette */
  --primary: #6B9080;
  --primary-light: #A4C3B2;
  --primary-dark: #4A7766;
  --accent: #E07A5F;
  --accent-light: #F4A88C;

  --neutral-100: #F8F9FA;
  --neutral-200: #E9ECEF;
  --neutral-500: #6C757D;
  --neutral-900: #212529;

  --error: #DC3545;
  --warning: #F59E0B;
  --success: #22C55E;

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;

  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.07), 0 12px 24px rgba(0,0,0,0.05);
  --shadow-lg: 0 10px 25px rgba(0,0,0,0.1);
}
```

### Tailwind Config Extension
```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6B9080',
          light: '#A4C3B2',
          dark: '#4A7766',
        },
        accent: {
          DEFAULT: '#E07A5F',
          light: '#F4A88C',
        },
      },
      fontFamily: {
        heading: ['Nunito', 'Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        'card': '12px',
        'button': '8px',
      },
    },
  },
};
```
