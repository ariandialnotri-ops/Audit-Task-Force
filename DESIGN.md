---
name: AeroShift SPBU
colors:
  surface: '#f8f9ff'
  surface-dim: '#cadbf6'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d2e4ff'
  on-surface: '#0a1c30'
  on-surface-variant: '#424656'
  inverse-surface: '#203146'
  inverse-on-surface: '#eaf1ff'
  outline: '#727687'
  outline-variant: '#c2c6d8'
  surface-tint: '#0054d6'
  primary: '#0050cb'
  on-primary: '#ffffff'
  primary-container: '#0066ff'
  on-primary-container: '#f8f7ff'
  inverse-primary: '#b3c5ff'
  secondary: '#006a64'
  on-secondary: '#ffffff'
  secondary-container: '#61f6ea'
  on-secondary-container: '#006f69'
  tertiary: '#006645'
  on-tertiary: '#ffffff'
  tertiary-container: '#008259'
  on-tertiary-container: '#e1ffec'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae1ff'
  primary-fixed-dim: '#b3c5ff'
  on-primary-fixed: '#001849'
  on-primary-fixed-variant: '#003fa4'
  secondary-fixed: '#65f8ed'
  secondary-fixed-dim: '#40dcd1'
  on-secondary-fixed: '#00201e'
  on-secondary-fixed-variant: '#00504b'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f8f9ff'
  on-background: '#0a1c30'
  surface-variant: '#d2e4ff'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-numeric-lg:
    fontFamily: JetBrains Mono
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 30px
  label-numeric-md:
    fontFamily: JetBrains Mono
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 22px
  label-numeric-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  label-tag:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-tablet: 1.25rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 2rem
  margin-desktop: 3rem
  space-2xs: 0.25rem
  space-xs: 0.375rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
---

## Brand & Style

This design system establishes an ultra-refined, iOS-native aesthetic for fuel station (SPBU) cash reconciliation, shift audits, and safe drop management. It balances operational rigor—speed, zero-error entry, high financial accountability—with the ethereal elegance of frosted glassmorphic interfaces.

### Core Philosophy
- **Precision Glass:** Translucent, high-blur glass containers float above cool ambient gradients. Surfaces convey structure without heavy visual weight, allowing busy station forecourt supervisors and cashiers to navigate dense financial tables effortlessly.
- **Apple Pro Human Interface:** Fluidity, tactile haptics, hairline rim-lighting, and generous touch ergonomics suited for one-handed handheld verification under outdoor or fluorescent lighting.
- **Operational Clarity:** Financial tallies, pump counter deltas, denomination breakdowns, and reconciliation variances pop with decisive, radiant status cues against quiet frosted backdrops.

### Design Style
**Modern iOS Glassmorphism:** Layered translucent surfaces (`backdrop-filter: blur(24px)`), hairline 1px inner rim highlights (`rgba(255, 255, 255, 0.45)` top-edge bevels), diffused atmospheric drop shadows, and luminous accent conduits.

## Colors

The palette draws inspiration from pristine alpine glass surfaces tinted with automotive and petroleum hues. The primary identity is anchored in an electric iOS azure (`#0066FF`), supported by bright cyan (`#00C2B8`) for active pump telemetry, emerald green (`#10B981`) for balanced tallies/settlements, and an amber alert tone (`#F59E0B`) for reconciliation discrepancies.

### Surface System
- **Canvas Base:** Soft gradient wash transitioning from `#E9EFF6` to `#DDE7F3` with ambient radial pulses behind critical widgets.
- **Glass Card (Primary):** `rgba(255, 255, 255, 0.65)` with `backdrop-filter: blur(24px) saturate(180%)`.
- **Glass Card (Elevated/Active):** `rgba(255, 255, 255, 0.82)` with dual-light edge refraction.
- **Glass Inset / Recessed Field:** `rgba(240, 245, 251, 0.55)` with an inner drop shadow for denomination counters and totalizers.

### Functional Roles
- **Electric Blue (`#0066FF`):** Primary action trigger, active nozzle selection, and safe-drop submission.
- **Fuel Cyan (`#00C2B8`):** Real-time digital pump totalizers and meter telemetry.
- **Settlement Green (`#10B981`):** Balanced shift, zero variance, and bank-ready verification badges.
- **Variance Amber (`#F59E0B`) / Alert Red (`#EF4444`):** Cash short/over alerts and unverified pump meter discrepancies.

## Typography

Typography prioritizes pristine legibility and mathematical clarity. 

- **Primary Interface (Plus Jakarta Sans):** Selected for its geometric harmony, open apertures, and close structural kinship to Apple’s San Francisco Pro, delivering a modern, clean, and welcoming voice.
- **Financial Monospace (JetBrains Mono):** Dedicated to Indonesian Rupiah (`IDR`) currency entries, physical banknote count calculations, and mechanical pump meter digits. Monospaced tabular alignment guarantees that decimal places, commas, and negative signs stay vertically pinned when scanning cash totals.
- **Hierarchy Rules:** Large numeric figures leverage `-0.02em` tracking for a compact native widget feel, while uppercase micro-labels and shift tags utilize `+0.05em` letter spacing for fast parsing in glare-prone station environments.

## Layout & Spacing

The layout is built around an adaptive fluid grid optimized for dual contexts: quick pocket entry on mobile devices (forecourt cashiers) and multi-column dashboard surveillance on iPads/desktops (station managers and head office accounting).

### Layout Grid Model
- **Mobile (Handheld PDI/Phone):** 4-column layout with `margin: 1rem` and `gutter: 1rem`. Bottom safe-area clearance (`2.5rem`) reserved for floating iOS liquid navigation bars.
- **Tablet (iPad / POS Register):** 8-column layout with `margin: 2rem`, allowing side-by-side shift reconciliation (Physical Cash Count on left, Pump Totalizer readings on right).
- **Desktop (Manager Console):** 12-column layout capped at `1440px` max-width, maintaining modular glass dashboard tiles.

### Rhythm & Density
- Component internal padding uses a consistent `1.25rem` (20px) base for glass cards, creating airy, unhurried zones around dense numeric tables.
- Input groupings (e.g., denomination multipliers: `Rp 100.000 × [Qty]`) use tight `space-xs` (6px) vertical gaps to form cohesive interactive blocks.

## Elevation & Depth

Visual hierarchy is established entirely through glass refraction, specular highlight rims, and multi-tier diffuse shadows rather than opaque borders or brutalist outlines.

### Elevation Hierarchy
1. **Level 0 (Atmospheric Base):** Soft, cold-gradient background with subtle cyan/indigo blurred orbs creating natural lighting depth beneath the glass.
2. **Level 1 (Sub-glass Containers & Data Panels):**
   - Background: `rgba(255, 255, 255, 0.55)`
   - Backdrop Filter: `blur(20px) saturate(160%)`
   - Border: `1px solid rgba(255, 255, 255, 0.6)`
   - Shadow: `0 8px 32px 0 rgba(148, 163, 184, 0.15)`
3. **Level 2 (Interactive Cards, Shift Summaries):**
   - Background: `rgba(255, 255, 255, 0.72)`
   - Backdrop Filter: `blur(28px) saturate(190%)`
   - Border: `1px solid rgba(255, 255, 255, 0.8)`
   - Inner Glow: `inset 0 1px 1px 0 rgba(255, 255, 255, 0.9)`
   - Shadow: `0 12px 40px -4px rgba(112, 144, 176, 0.2)`
4. **Level 3 (Modal Sheets, Drop Safes, Urgent Variance Banners):**
   - Background: `rgba(255, 255, 255, 0.88)`
   - Backdrop Filter: `blur(36px) saturate(200%)`
   - Border: `1px solid #FFFFFF`
   - Shadow: `0 24px 60px -8px rgba(30, 41, 59, 0.22), 0 0 1px 1px rgba(255, 255, 255, 0.95)`

## Shapes

The interface embraces Apple’s continuous curvature squircle geometry, evoking tactile, physical glass plaques.

### Corner Radii
- **Standard Cards & Financial Panels:** `rounded-lg` (1rem / 16px) creates a smooth, aerodynamic container for shift modules.
- **Major Dashboard Blocks & Modals:** `rounded-xl` (1.5rem / 24px) for expansive summary pods and floating action trays.
- **Controls, Action Buttons & Inputs:** Continuous pill contours (`9999px`) on floating toggles and buttons, or soft squircle `0.75rem` (12px) on data-entry numeric cells.
- **Inner Rim Lighting:** All shapes implement an internal 1px gradient bevel highlight `linear-gradient(to bottom, rgba(255,255,255,0.7), rgba(255,255,255,0.1))` along the top boundary.

## Components

### 1. Shift Reconciliation Card
- **Structure:** Level 2 glass container housing fuel type badge (Pertalite, Pertamax, Solar), island/dispenser number, cashier portrait, and timestamp.
- **Metrics Layout:** Monospaced two-column grid showing Pump Volume Sales (`Liters × Price`) versus Actual Cash Collected.
- **Variance Indicator:** Pill chip docked on the top right. Displays `SEIMBANG` (green pill), `SELISIH LEBIH` (blue pill), or `SELISIH KURANG -Rp XX.XXX` (amber pill with subtle pulse).

### 2. Banknote Denomination Counter
- **Structure:** Recessed inset grid listing official Bank Indonesia currency units (`100k`, `50k`, `20k`, `10k`, `5k`, `2k`, `1k`).
- **Input Design:** Tactile numeric stepper with haptic `+` and `-` glass buttons flanking an editable monospace text field. Subtotals update with live rolling number animations.

### 3. Primary & Glass Action Buttons
- **Primary CTA (Submit Shift / Drop Cash):** Vivid iOS Electric Blue fill (`#0066FF`), white semibold typography, subtle interior highlight glow (`inset 0 1px 0 rgba(255,255,255,0.35)`), and a smooth scale-down compression on press (`transform: scale(0.98)`).
- **Secondary Glass Action:** Translucent frosted pill (`rgba(255, 255, 255, 0.6)`), 1px border, text in primary blue.

### 4. Financial Input Fields
- **Surface:** Inset frosted fill `rgba(235, 242, 250, 0.65)` with an inner drop-shadow `inset 0 2px 4px rgba(0, 0, 0, 0.04)`.
- **Focus State:** 2px neon electric blue aura with `rgba(0, 102, 255, 0.2)` blur ring and white background transition.
- **Currency Affix:** Fixed, dim monospace "Rp" prefix in neutral slate.

### 5. Floating Dock Navigation
- **Styling:** Floating frosted bar anchored to the bottom viewport with pill-shaped active indicator capsules, featuring neon glow pips below active SPBU modules (Nozzles, Safe Drop, Shift Tallies, Settings).