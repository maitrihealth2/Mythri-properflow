---
name: Digital Sanctuary
colors:
  surface: '#fcf9f3'
  surface-dim: '#dcdad4'
  surface-bright: '#fcf9f3'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3ed'
  surface-container: '#f0eee8'
  surface-container-high: '#ebe8e2'
  surface-container-highest: '#e5e2dc'
  on-surface: '#1c1c18'
  on-surface-variant: '#4f4540'
  inverse-surface: '#31312d'
  inverse-on-surface: '#f3f0ea'
  outline: '#81756f'
  outline-variant: '#d3c3bd'
  surface-tint: '#705a4f'
  primary: '#322119'
  on-primary: '#ffffff'
  primary-container: '#49362d'
  on-primary-container: '#b99f93'
  inverse-primary: '#ddc1b4'
  secondary: '#7c5544'
  on-secondary: '#ffffff'
  secondary-container: '#fdc9b3'
  on-secondary-container: '#795241'
  tertiary: '#32220d'
  on-tertiary: '#ffffff'
  tertiary-container: '#4a3720'
  on-tertiary-container: '#bba083'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#fbdccf'
  primary-fixed-dim: '#ddc1b4'
  on-primary-fixed: '#271810'
  on-primary-fixed-variant: '#574239'
  secondary-fixed: '#ffdbcd'
  secondary-fixed-dim: '#eebba6'
  on-secondary-fixed: '#2f1407'
  on-secondary-fixed-variant: '#623e2e'
  tertiary-fixed: '#fcddbd'
  tertiary-fixed-dim: '#dfc2a3'
  on-tertiary-fixed: '#281805'
  on-tertiary-fixed-variant: '#57432c'
  background: '#fcf9f3'
  on-background: '#1c1c18'
  surface-variant: '#e5e2dc'
  espresso: '#49362D'
  mocha: '#8B6250'
  caramel: '#CBAF91'
  oat: '#F1E6D7'
  ivory: '#FBF8F2'
  ink: '#2C2724'
  muted: '#756A62'
  border: '#E3D8CC'
typography:
  display-lg:
    fontFamily: Literata
    fontSize: 48px
    fontWeight: '500'
    lineHeight: '1.2'
  display-lg-mobile:
    fontFamily: Literata
    fontSize: 32px
    fontWeight: '500'
    lineHeight: '1.25'
  headline-lg:
    fontFamily: Literata
    fontSize: 32px
    fontWeight: '500'
    lineHeight: '1.3'
  headline-lg-mobile:
    fontFamily: Literata
    fontSize: 26px
    fontWeight: '500'
    lineHeight: '1.3'
  headline-md:
    fontFamily: Literata
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.4'
  headline-sm:
    fontFamily: Literata
    fontSize: 20px
    fontWeight: '500'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Literata
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.7'
  body-md:
    fontFamily: Literata
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.7'
  body-sm:
    fontFamily: Literata
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Literata
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.2'
  label-sm:
    fontFamily: Literata
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  margin: 4rem
  margin-mobile: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
  space-3xl: 4rem
---

# Mythri --- Design System & Experience Specification

## 1. Product direction

Mythri is a calm, private, conversation-first emotional-support
experience. It should feel like entering a quiet space where someone can
pause, talk, and reflect at their own pace.

> Do not design a mental-health dashboard. Design a place someone would
> want to stay when they are having a difficult day.

The product combines a restrained interface, an immersive environment, a
natural companion character, and text- or voice-based conversation. The
experience should feel premium, warm, mature, and human without
pretending that the AI is a licensed therapist or a real person.

### Core principles

- **Conversation first:** Text and voice conversation are the primary interactions.
- **Low visual density:** Introduce features progressively; avoid dashboards, competing cards, and persistent side panels.
- **Immersive but optional:** The 3D room adds presence but must not be required to use core features.
- **User agency:** Users can skip non-essential onboarding questions, correct assumptions, control memory, and leave immersive mode.
- **Accessible by default:** Maintain readable UI, keyboard access, visible focus, reduced-motion support, and a complete 2D/text path.
- **Honest support:** Describe Mythri as an AI emotional-support companion, not a human therapist or emergency service.

## 2. Brand and visual style

### Brand character

**Digital Sanctuary · Minimalism · Tactile Editorial**

Use exquisite but legible typography, generous whitespace, warm neutral surfaces, deliberate visual hierarchy, restrained accents, and fine borders. The interface should feel intimate and thoughtfully crafted—like a well-made book or stationery—without becoming decorative or difficult to use.

### Avoid

- Analytics-heavy healthcare dashboards.
- Game, metaverse, or avatar-first styling.
- Excessive cards, floating panels, glassmorphism, blur, or heavy shadows.
- Constant gradients, shimmer, parallax, or decorative motion without purpose.
- A mascot-like or glossy synthetic character.
- Clinical, judgmental, or overly certain language.
- Using colour alone to convey meaning.

## 3. Primary colour palette --- 03 Espresso & Oat

- Espresso: `#49362D` (Primary text, strong controls, selected states)
- Mocha: `#8B6250` (Secondary actions and warm emphasis)
- Caramel: `#CBAF91` (Soft accents and decorative material references)
- Oat: `#F1E6D7` (Warm surfaces and quiet section backgrounds)
- Ivory: `#FBF8F2` (Main canvas and page background)
- Ink: `#2C2724` (Body text where extra contrast is needed)
- Muted: `#756A62` (Secondary text; verify contrast before use)
- Border: `#E3D8CC` (Dividers, input outlines, subtle boundaries)

## 4. Typography

Primary typeface: Literata (Serif, literary, reflective, warm).

- Display large: Literata 48px, weight 500, line-height 1.2
- Headline large: Literata 32px, weight 500, line-height 1.3
- Headline medium: Literata 24px, weight 500, line-height 1.4
- Body large: Literata 18px, weight 400, line-height 1.7
- Body medium: Literata 16px, weight 400, line-height 1.7
- Body small: Literata 14px, weight 400, line-height 1.6
- Label medium: Literata 14px, weight 500, line-height 1.2

## 5. Layout, spacing, surfaces, and shape

- Base unit: 4px
- Desktop margin: 64px, Mobile margin: 20px, Standard gutter: 24px
- Corner radius: Small (0.25rem / 4px), Default (0.5rem / 8px), Medium (0.75rem / 12px), Large (1rem / 16px), Pill (9999px)
- Fine 1px subtle borders (`#E3D8CC`), soft tonal layering, minimal shadows.
