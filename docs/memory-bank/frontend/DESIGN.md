---
name: design
description: Frontend design system documentation
argument-hint: N/A
---

# Design System

## Stack

- **TailwindCSS**: 4.0 (latest major version)
- **PostCSS**: 4.0 with `@tailwindcss/postcss` plugin
- **CSS Import**: `@import "tailwindcss"` in globals.css

## Configuration

@tailwind.config.ts
- Minimal config, leverages Tailwind v4 defaults
- Content paths: pages, components, app directories
- Custom colors via CSS variables only
- No plugins installed

@postcss.config.mjs
- Single plugin: `@tailwindcss/postcss`

## Design Tokens

### Colors

Defined in @app/globals.css as CSS variables:

**Light Mode:**
- `--background`: #ffffff
- `--foreground`: #171717

**Dark Mode:**
- `--background`: #0a0a0a
- `--foreground`: #ededed

**Tailwind Built-ins:**
- Zinc palette (`zinc-50`, `zinc-400`, `zinc-600`, `zinc-950`)
- Black/white primitives

Usage: `bg-background`, `text-foreground`

### Typography

**Font Families:**
- Default: Arial, Helvetica, sans-serif
- Tailwind provides: `font-sans`, `font-mono`

**Font Sizes:**
- `text-base`: 1rem (1.5 line-height)
- `text-lg`: 1.125rem (1.75/1.125 line-height)
- `text-3xl`: 1.875rem (2.25/1.875 line-height)
- `text-4xl`: 2.25rem (2.5/2.25 line-height)

**Font Weights:**
- `font-medium`: 500
- `font-semibold`: 600
- `font-bold`: 700

**Tracking:**
- `tracking-tight`: -0.025em

### Spacing

- Base unit: `--spacing: 0.25rem` (4px)
- Usage: `p-4` = 1rem, `gap-6` = 1.5rem
- Follows Tailwind's 4px grid system

### Layout

**Containers:**
- `container-xs`: 20rem
- `container-md`: 28rem
- `container-3xl`: 48rem

**Responsive Breakpoints:**
- `sm`: 40rem (640px)
- `md`: 48rem (768px)
- Default mobile-first approach

### Effects

**Transitions:**
- Duration: 0.15s
- Timing: cubic-bezier(0.4, 0, 0.2, 1)
- Class: `transition-colors`

**Text Rendering:**
- `antialiased` on body for smoother fonts

## Theming

**Dark Mode:**
- Auto-detection via `prefers-color-scheme`
- No manual toggle implemented
- CSS-only solution (no JS)

**Color Strategy:**
- CSS variables for semantic colors
- Tailwind utilities for components
- Mix of both for flexibility

## Utility Patterns

**Layout:**
- Flexbox-first: `flex`, `flex-col`, `items-center`, `justify-center`
- Full viewport: `min-h-screen`
- Centering: `flex items-center justify-center`

**Spacing:**
- Padding: `px-*`, `py-*`
- Gap: `gap-*` for flex/grid
- Margin: rarely used (prefer gap)

**Borders:**
- Radius: `rounded`, `rounded-full`
- Border: `border`, `border-solid`
- Opacity: `border-black/[.08]` syntax

## Component Patterns

No UI component library installed (no shadcn/ui, Radix, etc.)

**Current Approach:**
- Inline Tailwind classes
- No abstraction yet
- Utility-first methodology

**Notification Library:**
- Sonner 2.0.7 for toasts (@package.json)

**Map Components:**
- React Google Maps API 2.20.8
- Custom integration expected

## Conventions

**Class Ordering:**
- Layout (flex, grid)
- Sizing (w-*, h-*)
- Spacing (p-*, m-*, gap-*)
- Typography (text-*, font-*)
- Colors (bg-*, text-*)
- Effects (rounded-*, border-*, transition-*)

**Naming:**
- Use Tailwind defaults when possible
- Custom values: bracket notation `w-[158px]`
- Arbitrary properties: `[property:value]`

## Missing Patterns

**Not Implemented:**
- Component library (Button, Input, Card)
- Design tokens in tailwind.config
- Extended color palette
- Custom spacing scale
- Animation utilities
- Form styling patterns

## Migration Notes

**Tailwind v4 Changes:**
- PostCSS plugin required
- `@import "tailwindcss"` replaces directives
- CSS-first configuration possible
- Oxide engine (faster builds)

**Current State:**
- Minimal setup
- Ready for component library addition
- Clean slate for design system expansion
