# Anti-Vibe-Code Style Guide
## Design Skill for Projects That Don't Look AI-Generated

**Philosophy**: "Maximum information, minimum interface"  
**Aesthetic**: Dense, professional, intentional  
**Use as**: Taste reference, design review checklist, or Claude Skill

---

## The Problem: Distributional Convergence

When LLMs generate frontend designs, they converge on statistical averages from training data. Safe choices that "work universally and offend no one" dominate. The result:

- Inter or Roboto fonts
- Purple gradients on white backgrounds
- Excessive rounded corners (12px+)
- Minimal animations
- Generic "modern startup" layouts

This creates the "AI slop" aesthetic — immediately recognizable and dismissible. Every AI-generated site looks like every other AI-generated site.

**This guide breaks that pattern through intentional design decisions across four dimensions: Typography, Color & Theme, Motion, and Backgrounds.**

---

## Core Philosophy

### Data is the Hero
Information should be immediately scannable. Every pixel serves communication, not decoration.

### Density Over Decoration
Pack maximum information in minimum space. Whitespace is valuable — don't waste it on excessive padding.

### Professional Restraint
Clean, authoritative, unambiguous. The amateur adds more. The professional removes.

### Think Outside the Box
Even with guidance, models converge on new local maxima (e.g., Space Grotesk becomes the new Inter). Vary choices. Avoid predictable patterns.

---

## Dimension 1: Typography

Typography instantly signals quality. Generic fonts signal "template" or "AI-generated."

### Never Use
- Inter
- Roboto
- Open Sans
- Lato
- Arial
- Default system fonts

### Recommended Alternatives

| Aesthetic | Fonts |
|-----------|-------|
| Technical/Data | IBM Plex Sans, Source Sans 3, JetBrains Mono |
| Editorial | Crimson Pro, Newsreader, Source Serif Pro |
| Modern Distinctive | Satoshi, Space Grotesk, Bricolage Grotesque |
| Code/Monospace | JetBrains Mono, Fira Code, IBM Plex Mono |

### Pairing Principle
High contrast = interesting. Combine:
- Display + monospace
- Serif + geometric sans
- Variable font across extreme weights

### Weight & Size Extremes
Use extremes, not subtle differences:
- Weights: 100/200 vs 800/900 (not 400 vs 600)
- Size jumps: 3x+ (not 1.5x)

### Size Constraints

| Element | Size |
|---------|------|
| Section labels | 10-11px, uppercase, wide tracking |
| Body text, table cells | 12px |
| Emphasized text | 13px |
| Headers | 14px maximum |
| Marketing headlines | Up to 24px (exception only) |

Pick one distinctive font. Use it decisively. Load from Google Fonts.

---

## Dimension 2: Color & Theme

Commit to a cohesive aesthetic. Timid, evenly-distributed palettes are forgettable. Dominant colors with sharp accents outperform.

### The Purple Trap

Purple, indigo, and violet are AI's favorite colors. They signal "template." Avoid entirely unless genuinely brand-appropriate.

**Red flags:**
- Purple-to-blue gradients
- Indigo buttons/CTAs
- Violet accents
- Any "modern tech startup" color scheme

### Build a Constrained Palette

| Element | Purpose |
|---------|---------|
| Primary background | Deep rich color (dark) or warm off-white (light) |
| Secondary background | Slightly darker/lighter for hierarchy |
| Single accent color | CTAs and highlights only — used sparingly |
| Text hierarchy | Opacity variations of one base color |
| Semantic colors | Status only: success, warning, error, info |

More colors ≠ better. Constraint creates cohesion.

### Text Hierarchy Through Opacity

Use one base color with opacity levels:

**Dark mode**: White at 100%, 90%, 70%, 60%, 40%  
**Light mode**: Dark brand color at 100%, 90%, 70%, 60%, 40%

This ensures automatic consistency across modes.

### Avoid Extremes

- Never pure black (#000) — use deep, rich darks
- Never pure white (#FFF) — use warm/cool off-whites

### Inspiration Sources
Draw from IDE themes and cultural aesthetics rather than generic "modern web" palettes.

---

## Dimension 3: Motion

Animations add polish that static designs lack. But purposeless motion is noise.

### High-Impact Moments

Focus on:
- Page load with staggered reveals (animation-delay)
- Hover state transitions
- Micro-interactions on key actions

One well-orchestrated sequence creates more delight than scattered effects.

### Allowed

| Animation | Specification |
|-----------|---------------|
| Hover transitions | 150ms ease |
| Opacity changes | 150ms ease |
| Button scale | 1.02x maximum |
| Staggered reveals | animation-delay sequences |
| Loading pulse | Simple horizontal sweep |

### Prohibited

- Spin/rotate animations
- Bounce effects
- Multi-element loading spinners
- Parallax scrolling
- Any animation over 200ms
- Motion that draws attention to itself

### Implementation
Prioritize CSS-only solutions. Use Motion library for React when needed.

---

## Dimension 4: Backgrounds

Create atmosphere and depth. Never default to solid colors.

### Techniques

| Method | Effect |
|--------|--------|
| Layered CSS gradients | Subtle depth without decoration |
| Geometric patterns | Visual interest at low contrast |
| Glass-morphism | Depth through transparency + blur |
| Contextual effects | Match the overall aesthetic |

### Glass-Morphism System (Preferred)

**Dark mode:**
- Card backgrounds: white at 5% opacity
- Borders: white at 10% opacity
- Hover: white at 10% opacity
- Active: white at 15% opacity
- Backdrop blur: 12px

**Light mode:**
- Card backgrounds: black at 4% opacity
- Borders: black at 8% opacity
- Hover: black at 6% opacity
- Active: black at 10% opacity

### Avoid
- Flat solid backgrounds with no depth
- Decorative drop shadows (use glass-morphism instead)
- Gradient backgrounds that scream "AI-generated"

---

## Shape & Spacing

### Border Radius

| Context | Maximum |
|---------|---------|
| Buttons, inputs | 4px |
| Cards, containers | 6px |
| Never exceed | 8px |

Large corners (12px+) signal "friendly template" at the cost of professionalism.

### Spacing Scale (Base: 4px)

| Token | Value | Use |
|-------|-------|-----|
| xs | 4px | Minimal gaps |
| sm | 8px | Standard gaps |
| md | 12px | Container padding |
| lg | 16px | Maximum (rare) |

### The 16px Rule
Container padding never exceeds 16px. This forces density.

---

## Icons

### Use Lucide Icons
- Consistent stroke width
- Clean, minimal aesthetic
- Comprehensive coverage

### Sizing

| Context | Size |
|---------|------|
| Inline with small text | 14px |
| Inline with body text | 16px |
| Navigation items | 16-18px |
| Feature highlights | 20-24px |

### Rules
1. Icons support text, not replace it
2. Use sparingly — not every element needs one
3. Match text color (usually muted/subtle)
4. No decorative icons — every icon communicates function

---

## The Taste Test

Before finalizing any design:

1. **Could this be any other brand?** → Lacks identity
2. **Does it look like a template?** → Needs differentiation  
3. **Is anything purely decorative?** → Remove it
4. **Are there purple gradients?** → Start over
5. **Is there unnecessary padding?** → Tighten it
6. **Would I recognize this as AI-generated?** → Fix what gives it away
7. **Is every icon earning its place?** → Remove decorative ones
8. **Am I converging on common choices?** → Think outside the box

---

## Skill Prompt (For AI Tools)

Use this when prompting Claude or other LLMs for frontend work:

```
<frontend_design_constraints>
Avoid distributional convergence and "AI slop" aesthetic. Make distinctive, 
professional frontends.

TYPOGRAPHY
- Never use: Inter, Roboto, Open Sans, Lato, Arial, system fonts
- Use: IBM Plex Sans, Satoshi, Crimson Pro, or other distinctive fonts
- Monospace for data: JetBrains Mono
- Maximum body text: 14px
- Use weight extremes (200 vs 800), not subtle differences

COLOR & THEME
- No purple, indigo, or violet
- Single accent color, used sparingly
- Text hierarchy through opacity (100/90/70/60/40%)
- No pure black or pure white backgrounds
- Commit to cohesive aesthetic, not timid palettes

MOTION
- Transitions: 150ms ease maximum
- Focus on page load stagger and hover states
- No bounce, spin, or attention-seeking animations
- CSS-only preferred

BACKGROUNDS
- Use glass-morphism for depth (opacity + backdrop-blur)
- No decorative drop shadows
- Layer subtle gradients for atmosphere
- Never flat solid backgrounds

SHAPE & SPACING
- Border radius: 6px maximum
- Container padding: 16px maximum
- Dense, information-first layouts
- Icons: Lucide only, 16px default, functional not decorative

Think outside the box. Vary choices. Avoid converging on new defaults.
</frontend_design_constraints>
```

---

## Brand Configuration Template

For each project:

```
PROJECT: [Name]

COLORS
├── Dark background: [hex]
├── Dark secondary: [hex]
├── Light background: [hex]
├── Light secondary: [hex]
├── Accent: [hex]
└── Accent opacities: 80/60/40/20%

TYPOGRAPHY
├── Primary: [font name]
├── Monospace: [font name]
└── Base size: 12px

SHAPE
├── Border radius max: 6px
└── Border opacity: 10%

ICONS
└── Lucide, 16px default

MOTION
└── 150ms ease transitions
```

---

## Quick Reference

### Do ✓
- Distinctive fonts (not Inter/Roboto)
- Single accent color, used sparingly
- Glass-morphism for depth
- Opacity-based text hierarchy
- Dense layouts, ≤16px padding
- 150ms transitions
- Lucide icons, functional only
- Staggered page load animations
- Weight/size extremes in typography

### Don't ✗
- Purple/indigo/violet schemes
- Generic fonts (Inter, Roboto, Open Sans)
- Border radius >8px
- Drop shadows for depth
- Gradient text
- Bounce/spin animations
- Decorative icons
- Flat solid backgrounds
- Subtle typography differences (400 vs 600)
- Predictable "modern startup" layouts

---

## Summary

The four dimensions of non-AI-generated design:

| Dimension | Key Principle |
|-----------|---------------|
| Typography | Distinctive fonts, extreme contrasts |
| Color & Theme | Constrained palette, no purple, commit fully |
| Motion | Purposeful, 150ms max, staggered reveals |
| Backgrounds | Glass-morphism, layered depth, no flat solids |

**This guide exists to break distributional convergence. Claude has strong design understanding — this unlocks it.**