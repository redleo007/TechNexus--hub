# TECHNEXUS DESIGN SYSTEM
## Professional Zoho-Inspired UI/UX

### Overview
TechNexus now features an enterprise-grade design system featuring:
- **Soft Dark Blue Theme**: Comfortable for extended usage without eye strain
- **Professional Enterprise SaaS aesthetic**: Inspired by Zoho, HubSpot, and modern SaaS platforms
- **Zero neon/flashy elements**: Clean, calm, business-focused design
- **100% Responsive**: Mobile-first approach, desktop-optimized, tablet-friendly
- **Accessibility-first**: WCAG compliant, proper contrast ratios, keyboard navigation

---

## COLOR PALETTE

### Primary Backgrounds
| Variable | Color | Purpose |
|----------|-------|---------|
| `--bg-primary` | `#0b1220` | Main page background (deep soft blue-black) |
| `--bg-secondary` | `#111827` | Card/surface background |
| `--bg-tertiary` | `#1a202c` | Tertiary surface (table headers, etc) |

### Text Colors (Optimized for Readability)
| Variable | Color | Purpose |
|----------|-------|---------|
| `--text-primary` | `#e5e7eb` | Main body text (light gray) |
| `--text-secondary` | `#9ca3af` | Secondary/muted text |
| `--text-tertiary` | `#6b7280` | Disabled/very muted text |
| `--text-inverse` | `#0b1220` | Text on light backgrounds |

### Semantic Colors
| Variable | Color | Hex | Purpose |
|----------|-------|-----|---------|
| `--color-primary` | Soft Blue | `#2563eb` | Primary actions, links |
| `--color-primary-hover` | Darker Blue | `#1d4ed8` | Hover state |
| `--color-success` | Professional Green | `#16a34a` | Success messages |
| `--color-danger` | Clear Red | `#dc2626` | Errors, destructive actions |
| `--color-warning` | Amber | `#d97706` | Warnings |
| `--color-info` | Professional Cyan | `#0891b2` | Info messages (NOT neon) |

### Borders & Interactive States
| Variable | Color | Purpose |
|----------|-------|---------|
| `--border-color` | `#1f2937` | Standard borders |
| `--border-light` | `#2d3748` | Lighter borders (hover state) |
| `--state-hover` | `#1f2937` | Card hover background |
| `--state-focus` | `#2563eb` | Focus ring color |

---

## TYPOGRAPHY SYSTEM

### Font Stack
```css
-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
'Helvetica Neue', Arial, sans-serif, 'Apple Color Emoji'
```

### Font Sizes (Desktop First)
| Variable | Size | Use Case |
|----------|------|----------|
| `--font-size-xs` | 12px | Small labels, badges |
| `--font-size-sm` | 13px | Secondary text |
| `--font-size-base` | 14px | Body text (DEFAULT) |
| `--font-size-md` | 15px | Default input |
| `--font-size-lg` | 16px | Large text |
| `--font-size-xl` | 18px | Card titles |
| `--font-size-2xl` | 20px | Section headings |
| `--font-size-3xl` | 24px | Page headings |
| `--font-size-4xl` | 28px | Main headings |

### Font Weights
| Variable | Weight | Use Case |
|----------|--------|----------|
| `--font-weight-normal` | 400 | Body text |
| `--font-weight-medium` | 500 | Emphasis, labels |
| `--font-weight-semibold` | 600 | Headings |

### Mobile Adjustments
- Base font size: 13px (down from 14px)
- Headings: Slightly smaller for mobile
- Improved readability with larger line-height

---

## SPACING SYSTEM
All spacing uses an 4px grid for consistency:

| Variable | Size | Use Case |
|----------|------|----------|
| `--space-xs` | 4px | Micro spacing |
| `--space-sm` | 8px | Tight spacing |
| `--space-md` | 12px | Default spacing |
| `--space-lg` | 16px | Primary spacing |
| `--space-xl` | 24px | Card padding, sections |
| `--space-2xl` | 32px | Large sections |
| `--space-3xl` | 48px | Page margins |

---

## COMPONENTS

### Buttons
**Default Height**: 36px  
**Padding**: 0 16px  
**Border Radius**: 6px  
**Font Weight**: 500

#### Variants
1. **Primary** - Solid blue background, white text
2. **Secondary** - Transparent with border, primary text
3. **Danger** - Red background for destructive actions
4. **Success** - Green background for positive actions
5. **Size Variants**: `btn-sm` (32px), `btn-lg` (40px)

### Input Fields
**Height**: 36px  
**Padding**: 12px 16px  
**Border Radius**: 6px  
**Focus State**: Blue border + soft glow

### Cards
**Padding**: 24px (default) or 16px (compact)  
**Border Radius**: 8px  
**Border**: 1px `--border-color`  
**Hover**: Border lightens, subtle shadow

### Tables
- **Header BG**: `--bg-tertiary`
- **Row Hover**: `--state-hover`
- **Cell Padding**: 16px
- **Clean rows** with 1px bottom borders

### Badges
- **Padding**: 4px 12px
- **Border Radius**: 20px (pill-shaped)
- **Font Size**: 12px
- **Font Weight**: 600
- Subtle colored backgrounds with colored text

---

## SPACING & LAYOUT

### Container
- **Max Width**: 1400px
- **Padding**: 16px (sides)
- Auto-centered with flexbox/margin-auto

### Grid System
- **Auto**: `repeat(auto-fit, minmax(300px, 1fr))`
- **2-column**: `repeat(2, 1fr)`
- **3-column**: `repeat(3, 1fr)`
- **4-column**: `repeat(4, 1fr)`
- **Gap**: 16px (consistent)

### Responsive Breakpoints
```css
Desktop: 1024px+
Tablet: 641px - 1024px
Mobile: 480px - 640px
Small Mobile: < 480px
```

#### Responsive Grid Behavior
- **Desktop**: Full columns
- **Tablet**: 2 columns (except auto-grid)
- **Mobile**: 1 column (stacked)

---

## STATES & INTERACTIONS

### Focus State
- **Outline**: 2px solid primary color
- **Offset**: 2px
- **Accessible**: High contrast for keyboard navigation

### Hover States
- **Cards**: Border lightens, subtle shadow
- **Buttons**: Slightly darker color, no transform (stable)
- **Links**: Color change only
- **Rows**: Subtle background change

### Disabled State
- **Opacity**: 0.5
- **Cursor**: not-allowed
- **No interaction**: Disabled state is final

### Loading
- **Spinner**: 40px border-radius circle
- **Border Color**: `--border-color`
- **Top Border**: Primary color
- **Animation**: 1s linear infinite rotation

---

## SHADOWS

| Variable | Value | Use Case |
|----------|-------|----------|
| `--shadow-sm` | 0 1px 2px 0 rgba(0,0,0,0.3) | Subtle shadows |
| `--shadow-md` | 0 4px 6px -1px rgba(0,0,0,0.4) | Card hover |
| `--shadow-lg` | 0 10px 15px -3px rgba(0,0,0,0.5) | Modals |
| `--shadow-xl` | 0 20px 25px -5px rgba(0,0,0,0.6) | Dropdowns |

**Philosophy**: Shadows are subtle and professional, not dramatic.

---

## TRANSITIONS

| Variable | Duration | Cubic Bezier | Use Case |
|----------|----------|------------|----------|
| `--transition-fast` | 150ms | cubic-bezier(0.4, 0, 0.2, 1) | Micro interactions |
| `--transition-normal` | 250ms | cubic-bezier(0.4, 0, 0.2, 1) | Default transitions |
| `--transition-slow` | 350ms | cubic-bezier(0.4, 0, 0.2, 1) | Important animations |

**Philosophy**: Transitions are smooth and professional, never jarring.

---

## IMPLEMENTATION FILES

### 1. `theme.css` (PRIMARY)
- All CSS variables
- Base styles for all HTML elements
- Global utilities
- Typography defaults
- Component styles

### 2. `index.css` (UTILITIES)
- Responsive grid system
- Layout utilities
- Page structure classes
- Components specific utilities

### 3. Individual Page CSS
- Page-specific overrides only
- Keep to a minimum
- Always inherit from theme

---

## MOBILE-FIRST APPROACH

### Principles
1. **Mobile is default**: Start with mobile styles
2. **Progressive Enhancement**: Add desktop features at larger breakpoints
3. **Touch Friendly**: Buttons and inputs are at least 44px on mobile
4. **No Overflow**: Never allow horizontal scroll (overflow-x: hidden)
5. **Flexible Layouts**: Use flex/grid, not fixed widths

### Responsive Pattern
```css
/* Mobile first - default styles */
.component { ... }

/* Tablet at 641px */
@media (min-width: 641px) { ... }

/* Desktop at 1025px */
@media (min-width: 1025px) { ... }
```

---

## ACCESSIBILITY STANDARDS

✅ **WCAG 2.1 Level AA Compliant**

- Text contrast ratios ≥ 4.5:1 for normal text
- Color not the only indicator of state
- Keyboard navigation fully supported
- Focus indicators always visible
- Semantic HTML structure
- Proper ARIA labels where needed
- Alt text for all images/icons

---

## DESIGN CHECKLIST FOR NEW COMPONENTS

When creating a new component:

- [ ] Use CSS variables from theme (never hardcode colors)
- [ ] Follow spacing system (use `--space-*` variables)
- [ ] Responsive at all breakpoints
- [ ] Hover states defined
- [ ] Focus states visible
- [ ] Disabled state handled
- [ ] Dark theme compatible
- [ ] No neon colors
- [ ] Icons sized to match text (16px-24px)
- [ ] Loading states included
- [ ] Error states included

---

## COLOR EXAMPLES IN USE

### Success Message
- Background: `rgba(22, 163, 74, 0.1)` (10% opacity)
- Border: `--color-success`
- Text: `--color-success`

### Error Message
- Background: `rgba(220, 38, 38, 0.1)` (10% opacity)
- Border: `--color-danger`
- Text: `--color-danger`

### Primary Button Hover
- Background: `--color-primary-hover`
- Shadow: `var(--shadow-md)`

---

## PRODUCTION DEPLOYMENT

Before deploying:

1. ✅ All pages build without CSS errors
2. ✅ All pages responsive (640px, 768px, 1024px+ viewports)
3. ✅ No color hardcodes (all from CSS variables)
4. ✅ No overflow-x on any page
5. ✅ Consistent spacing throughout
6. ✅ Icons match text colors
7. ✅ Focus rings visible
8. ✅ Loading states smooth
9. ✅ No neon colors present
10. ✅ Text contrast ≥ 4.5:1

---

## BRAND PERSONALITY

- **Professional**: Enterprise-grade, not playful
- **Calm**: Soft colors, no eye strain
- **Clear**: High readability, consistent patterns
- **Trustworthy**: Professional SaaS aesthetic
- **Efficient**: Minimal decoration, focus on function
- **Accessible**: Everyone can use it comfortably

---

## FUTURE ENHANCEMENTS

Possible future additions while maintaining aesthetic:
- Dark mode toggle (optional, as dark is default)
- Custom color themes (enterprise)
- Animation libraries (using same transition values)
- Component library documentation
- Icon customization

---

## QUESTIONS?

Refer back to this design system document for all design decisions.  
**Single source of truth**: `theme.css`
