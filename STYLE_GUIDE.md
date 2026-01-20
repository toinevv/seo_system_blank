# Anti-Vibe-Code Style Guide
## A Design Philosophy for Projects That Don't Look AI-Generated

**Philosophy**: "Maximum information, minimum interface"  
**Aesthetic**: Dense, professional, intentional  
**Modes**: Dark + Light (both specified)

---

## The Problem

AI-generated designs converge on identical patterns:
- Purple/indigo gradients everywhere
- Inter or Roboto font
- Excessive rounded corners (12px+)
- Gradient text effects
- Decorative shadows on everything
- Generic hero sections
- The "Linear aesthetic" clone

This happens because AI produces statistical averages of its training data. Tailwind CSS defaults (especially `indigo-500`) dominate that data. The result: every AI-generated site looks like every other AI-generated site.

**This guide breaks that pattern through intentional design decisions.**

---

## Core Philosophy

### 1. Data is the Hero
Information should be immediately scannable. Every pixel serves communication, not decoration.

### 2. Ultra-Minimal Chrome
No decorative elements that don't serve the content. If something is purely decorative, remove it.

### 3. Density Over Decoration
Pack maximum information in minimum space. Whitespace is valuable — don't waste it on padding.

### 4. Professional Restraint
Clean, authoritative, unambiguous. The amateur instinct is to add more. The professional instinct is to remove.

---

## Color Principles

### Avoid the Purple Trap

Purple, indigo, and violet are AI's favorite colors. They signal "I used a template" or "AI made this." Unless purple is genuinely part of your brand identity, avoid it entirely.

**Red flags:**
- Purple-to-blue gradients
- Indigo buttons and CTAs
- Violet accent colors
- Any color scheme describable as "modern tech startup"

### Build a Constrained Palette

**Required elements:**
- 1 primary background (dark: deep rich color, not pure black)
- 1 secondary background (slightly darker/lighter for hierarchy)
- 1 accent color (used sparingly — CTAs and highlights only)
- Text hierarchy using opacity variations of one base color
- Semantic colors for status only (success, warning, error, info)

More colors ≠ better design. Constraint creates cohesion.

### Dark Mode Backgrounds
Use deep, rich darks — never pure black (#000). Pure black feels harsh and cheap.

### Light Mode Backgrounds
Use warm or cool off-whites — never pure white (#FFF). Pure white glares. Subtle color adds sophistication.

### Text Hierarchy Through Opacity

Instead of picking multiple gray values, use one base color with opacity:

**Dark mode**: White at 100%, 90%, 70%, 60%, 40%  
**Light mode**: Your dark color at 100%, 90%, 70%, 60%, 40%

This creates automatic consistency and simplifies light/dark mode switching.

---

## Typography Principles

### Avoid Generic Fonts

These fonts scream "default" or "AI-generated":
- Inter (the #1 AI default)
- Roboto
- Open Sans
- Lato
- Arial
- System default sans-serif

**Never use these.**

### Choose Fonts With Character

**Recommended:**
- IBM Plex Sans (technical, professional)
- Source Sans 3 (clean, readable)
- DM Sans (modern, distinctive)
- Satoshi (contemporary without being generic)

**For monospace (data, timestamps, codes):**
- JetBrains Mono
- IBM Plex Mono
- Fira Code

### Size Constraints

| Element | Size |
|---------|------|
| Section labels | 10-11px, uppercase |
| Body text, table cells | 12px |
| Emphasized text | 13px |
| Headers | 14px maximum |
| Marketing headlines | Up to 24px (exception) |

Keep text small. Information density requires it.

### Typography Patterns

**Section labels**: Uppercase, ultra-subtle color, wide letter-spacing (0.05em)

**Data display**: Normal weight for readability, monospace for numbers/timestamps

**Headers**: Medium weight (500), never bold unless critical emphasis needed

---

## Spacing Principles

### Base Unit: 4px

Build all spacing from multiples of 4px.

### Spacing Scale

| Token | Value | Use |
|-------|-------|-----|
| xs | 4px | Minimal gaps, tight groupings |
| sm | 8px | Standard gaps between related items |
| md | 12px | Container padding, section gaps |
| lg | 16px | Maximum padding (rare) |

### The 16px Rule

**Container padding should never exceed 16px.** This forces density and prevents the bloated look of template sites.

### Vertical Rhythm

- 6px between lines of related data
- 12px between data groups
- 16px between major sections

---

## Shape Principles

### Border Radius

| Context | Maximum |
|---------|---------|
| Buttons, inputs | 4px |
| Cards, containers | 6px |
| Never exceed | 8px |

Large rounded corners (12px+) are an AI telltale. They signal "friendly template" at the cost of professionalism. When in doubt, go smaller.

### Borders

Use subtle borders (low opacity: 5-10%) for containers. Borders should define structure, not decorate.

Accent-colored borders: use sparingly, only for active/selected states.

### Shadows

**Avoid drop shadows.** Use glass-morphism (subtle background opacity + backdrop blur) for depth instead. If you must use shadows, keep them extremely subtle.

---

## Glass-Morphism System

The preferred method for creating depth and hierarchy:

**Dark mode:**
- Card backgrounds: white at 5% opacity
- Borders: white at 10% opacity
- Hover states: white at 10% opacity
- Active states: white at 15% opacity
- Backdrop blur: 12px

**Light mode:**
- Card backgrounds: black at 4% opacity
- Borders: black at 8% opacity
- Hover states: black at 6% opacity
- Active states: black at 10% opacity

This creates depth without decorative shadows.

---

## Icon System

### Use Lucide Icons

Lucide is the icon library of choice:
- Consistent stroke width
- Clean, minimal aesthetic
- Comprehensive coverage
- MIT licensed

### Icon Sizing

| Context | Size |
|---------|------|
| Inline with small text (11-12px) | 14px |
| Inline with body text | 16px |
| Navigation items | 16-18px |
| Feature highlights | 20-24px |

### Icon Usage Rules

1. **Icons support text, not replace it** — Always pair icons with labels except for universally understood symbols (close, menu, search)

2. **Use sparingly** — Not every list item needs an icon. Not every button needs an icon.

3. **Consistent stroke width** — Don't mix filled and outlined icons. Stick to Lucide's default stroke.

4. **Match text color** — Icons should use the same color as adjacent text, usually `text-muted` or `text-subtle`

5. **No decorative icons** — Every icon should communicate function or status

---

## Animation Principles

### Allowed

- Hover transitions: 150ms ease
- Opacity changes
- Subtle scale on buttons: 1.02x maximum
- Simple loading pulse

### Prohibited

- Spin/rotate animations
- Bounce effects
- Multi-element loading spinners
- Parallax scrolling
- Any animation over 200ms
- Any animation that draws attention to itself

### Loading States

Use a simple horizontal pulse animation on skeleton elements. No spinning loaders, no bouncing dots.

---

## Layout Principles

### Fixed Sidebar Width

If using a sidebar: 192px (12rem). Fixed. Never changes.

### Grid Gaps

Use consistent gaps from the spacing scale:
- 8px for tight data grids
- 12px for standard layouts

### Information Density

Prioritize showing more information over adding whitespace. Users can scan dense information faster than scrolling through padded layouts.

---

## The Taste Test

Before finalizing any design, ask:

1. **Could this be any other brand?** If yes, it lacks identity.
2. **Does it look like a template?** If yes, it needs differentiation.
3. **Is anything purely decorative?** If yes, remove it.
4. **Are there purple gradients?** If yes, start over.
5. **Is there unnecessary padding?** If yes, tighten it.
6. **Would I recognize this as AI-generated?** If yes, what specifically gives it away?
7. **Is every icon earning its place?** If no, remove the decorative ones.

---

## Prompting AI Tools

When using AI for design or code, include these constraints:

```
Design constraints:
- No purple, indigo, or violet colors
- Use [your font], never Inter or Roboto
- Maximum border-radius: 6px
- No gradient backgrounds or gradient text
- No decorative shadows — use glass-morphism for depth
- Maximum container padding: 16px
- Maximum body text size: 14px
- [Your brand color] as the only accent color
- Icons: Lucide only, 16px default size
- Dense, professional, minimal aesthetic
```

Being explicit breaks AI out of its default patterns.

---

## Brand Configuration Template

For each new project, define:

```
PROJECT: [Name]

COLORS
├── Dark mode background: [hex]
├── Dark mode secondary: [hex]
├── Light mode background: [hex]
├── Light mode secondary: [hex]
├── Accent color: [hex]
└── Accent at 80/60/40/20% opacity

TYPOGRAPHY
├── Primary font: [name]
├── Monospace font: [name]
└── Base size: 12px

SHAPE
├── Border radius max: 6px
└── Border opacity: 10%

ICONS
└── Lucide, 16px default
```

---

## Quick Reference

### Do ✓

- Maximum 14px text for UI (marketing headlines excepted)
- Padding ≤16px
- Monospace for data, timestamps, codes
- Glass-morphism for depth
- Uppercase section labels with wide tracking
- Single accent color, used sparingly
- Lucide icons, sized to match text
- Opacity-based text hierarchy
- Density over decoration

### Don't ✗

- Purple, indigo, violet color schemes
- Inter, Roboto, Open Sans fonts
- Border radius >8px
- Drop shadows for depth
- Gradient backgrounds or text
- Decorative animations
- Icons without purpose
- Padding >16px
- Multiple accent colors

---

## Summary Checklist

**Colors**
- [ ] No purple/indigo/violet
- [ ] Single distinctive accent color
- [ ] Opacity-based text hierarchy
- [ ] Both dark and light mode defined

**Typography**
- [ ] Not Inter, Roboto, Open Sans, or Lato
- [ ] Maximum 14px for UI text
- [ ] Monospace for data/numbers
- [ ] Uppercase labels with tracking

**Shape**
- [ ] Border radius ≤6px
- [ ] Glass-morphism instead of shadows
- [ ] Subtle borders (≤10% opacity)

**Spacing**
- [ ] Based on 4px unit
- [ ] Container padding ≤16px
- [ ] Dense over decorative

**Icons**
- [ ] Lucide only
- [ ] Sized to match text context
- [ ] Functional, not decorative

**Animation**
- [ ] ≤150ms transitions
- [ ] No bounce, spin, or complex sequences

---

**This guide exists to make you pause and choose. AI doesn't pause. AI doesn't choose. That's the difference.**
