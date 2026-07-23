---
name: Maitri V2 Minimal
colors:
  surface: '#f5f5dc'
  surface-dim: '#e6e6cc'
  surface-bright: '#ffffff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fdfdf5'
  surface-container: '#f5f5dc'
  surface-container-high: '#ebebce'
  surface-container-highest: '#e0e0c2'
  on-surface: '#1a1a1a'
  on-surface-variant: '#4d4d4d'
  inverse-surface: '#000000'
  inverse-on-surface: '#f5f5dc'
  outline: '#8c8c8c'
  outline-variant: '#cccccc'
  surface-tint: '#8c7355'
  primary: '#8c7355'
  on-primary: '#ffffff'
  primary-container: '#d9cbb8'
  on-primary-container: '#33261a'
  inverse-primary: '#e6d9c3'
  secondary: '#5c6b73'
  on-secondary: '#ffffff'
  secondary-container: '#c2d1d9'
  on-secondary-container: '#1a242b'
  tertiary: '#738c6b'
  on-tertiary: '#ffffff'
  tertiary-container: '#cce6c3'
  on-tertiary-container: '#20331a'
  error: '#cc3333'
  on-error: '#ffffff'
  error-container: '#ffcccc'
  on-error-container: '#660000'
  primary-fixed: '#e6d9c3'
  primary-fixed-dim: '#d9cbb8'
  on-primary-fixed: '#33261a'
  on-primary-fixed-variant: '#594533'
  secondary-fixed: '#d9e6eb'
  secondary-fixed-dim: '#c2d1d9'
  on-secondary-fixed: '#1a242b'
  on-secondary-fixed-variant: '#334753'
  tertiary-fixed: '#e6f2df'
  tertiary-fixed-dim: '#cce6c3'
  on-tertiary-fixed: '#20331a'
  on-tertiary-fixed-variant: '#3b5933'
  background: '#f5f5dc'
  on-background: '#1a1a1a'
  surface-variant: '#ebebce'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  margin-page: 2rem
  gutter: 1rem
  stack-sm: 0.5rem
  stack-md: 1.5rem
  stack-lg: 3rem
---

## Brand & Style
The brand personality is rooted in absolute minimalism and calm. No glassmorphism, no blurs. We use solid, matte surfaces with very soft, diffused drop shadows for depth. The aesthetic is clean, premium, and sophisticated.

## Colors
- Light Mode: A warm beige foundation (#F5F5DC) providing a premium, calming feel.
- Dark Mode: A true deep black background (#000000) for maximum contrast and elegance.
- Accent: A subtle, desaturated brown/taupe (#8C7355) that feels natural and grounding.

## Typography
- Headlines: **Plus Jakarta Sans** for a modern, geometric clarity.
- Body: **Inter** for maximum legibility in paragraphs.

## Elevation & Depth
Depth is created through subtle layering. No glassmorphism.
- Use `surface-container-lowest` (#FFFFFF in light, #111111 in dark) for elevated cards.
- Shadows should be extremely subtle and diffused.

## Components
- **Top Navigation Menu Button:** A custom circular button in the top right.
- **Language Selector:** Displaying languages natively (English, हिन्दी, தமிழ், తెలుగు).
- **Cards:** Clean rectangles with soft rounded corners (1rem) and solid background colors. No glowing auras or heavy borders.
