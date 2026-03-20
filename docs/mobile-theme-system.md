# Mobile theme system — USDT Transfer System

This document is the **single source of truth** for the product’s **visual direction** and **CSS token contract**. Later UI prompts should extend this system, not invent parallel colors or spacing per page.

**Implementation:** `src/index.css` (`:root[data-theme="light"]`, `:root[data-theme="dark"]`, mobile `@media` overrides). **Switch hook:** `document.documentElement.dataset.theme = 'light' | 'dark'` (`App.jsx` ensures default; **`index.html`** sets `data-theme="light"` on `<html>` before JS for first paint). **Branding note:** `config/branding.js` → `applyBrandingToDocument()` may set `--brand-*` on `:root` inline; tokens that reference `var(--brand-*)` follow that palette.

---

## 1. Visual direction (project terms)

- **Primary inspiration:** Payvo-style premium **digital banking** mobile UI — calm hierarchy, confident typography, operational clarity.
- **Secondary inspiration:** Modern **fintech wallet** materials — deep secondary ink, restrained teal primary, soft grouped surfaces.
- **Product mood:** **Premium iPhone fintech operations app** (daily operator tool), not a marketing site or consumer-social product.
- **Platform:** Arabic RTL first; **Noto Sans Arabic**; compact but readable densities on small viewports.

---

## 2. Light theme philosophy

- **Canvas:** Soft cool gray-violet base with **very subtle** brand-tinted radial washes (low contrast).
- **Surfaces:** White / near-white layers with **hairline** separation, not heavy boxes.
- **Accent:** Brand teal and navy for **structure and actions**; gold accent used sparingly (brand lockup, highlights).
- **Status:** Semantic greens / ambers / reds for **operational truth** (paid, warning, danger) — never decorative.

---

## 3. Dark theme philosophy (architecture)

- **Goal:** Same **semantic roles** as light (canvas → surface → text → border → status), with **lower overall luminance** and **preserved contrast** for amounts and statuses.
- **Surfaces:** Deep blue-gray stacks; elevated layers slightly **lighter** than canvas (iOS-like separation).
- **Text:** High legibility on dark (off-white primary, muted blue-gray secondary).
- **Status:** Slightly **desaturated** backgrounds with **clear** text/border cues (still obvious at a glance).
- **Rollout:** This repo defines **tokens and `data-theme="dark"` values**; not every selector has been migrated off hardcoded light literals yet. New work should use **`--theme-*`** / **`--type-*`** names first.

---

## 4. Token categories (naming)

| Prefix / pattern | Purpose |
|------------------|---------|
| `--theme-bg-*` | App canvas / page background intent |
| `--theme-body-background` | Full `background` stack for `body` (gradients) |
| `--theme-surface-*` | Default, strong, soft, elevated cards/panels |
| `--theme-text-*` | Primary, secondary, tertiary copy |
| `--theme-border-*` | Default and strong dividers |
| `--theme-shadow-*` | Elevation sm / md / lg |
| `--theme-radius-*` | xs → xl + pill |
| `--theme-space-*` | Section rhythm (xs–xl) |
| `--theme-status-*` | Semantic success / warning / danger / info (bg, border, text) |
| `--theme-list-row-fill` / `--theme-list-row-border` | Dashboard Lite (and similar) **ungrouped list row** surface + hairline border |
| `--theme-control-inset-well` | Shared **inset** shadow on text fields (focus stack reuses it) |
| `--theme-sheet-shadow-up` | **Bottom sheet** elevation (mobile `operations-sheet-panel`, upward shadow) |
| `--theme-overlay-*` | Hover / press overlays for segmented controls & chrome |
| `--theme-accent-*` | Non-brand accent surfaces (tints from brand) |
| `--mobile-*` | **≤960px** chrome (tab bar, drawer, hairlines, glass) — overridden per theme in mobile block |
| `--type-*` | Typography scale (size, weight, leading, tracking where set) |
| **Legacy** `--bg`, `--text`, `--surface`, … | **Aliases** to `--theme-*` for existing rules; prefer semantic names in **new** CSS |

**Brand (legacy names, still canonical for product identity):** `--brand-primary`, `--brand-secondary`, `--brand-accent`, `*-rgb`, `*-soft`.

---

## 5. Allowed visual choices

- Subtle **glass** (blur + saturation) on **shell** pieces only when tokens exist (`--mobile-surface-glass`, etc.).
- **Hairlines** (`--mobile-hairline`, `--theme-border-*`) instead of 1px solid gray boxes.
- **Single** restrained **vertical** gradient on primary CTA (operational, not hero marketing).
- **Floating** tab bar geometry with **safe-area** awareness.
- **Grouped list** surfaces (inset table-like rows) for dense operational lists.
- **Typography scale** via `--type-*` — adjust globally, not per page ad hoc.

---

## 6. Forbidden visual choices

- **Loud gradients** on every card, panel, or background.
- **Thick borders** around every module (“admin panel grid”).
- Playful illustration style, **consumer-social** aesthetics, or neon gamification.
- **Random per-page** font sizes / colors that bypass tokens.
- **Dropping** operational semantics (status colors, queue meaning) for aesthetics.

---

## 7. Intended feel (checklist)

| Attribute | Meaning here |
|-----------|----------------|
| Premium | Restraint, consistent radius/shadow, no clutter |
| Operational | Scannable numbers, clear status, obvious CTAs |
| Calm | Low noise, soft canvas, limited elevation |
| Compact | Tight but tappable; mobile section rules in CSS |
| iPhone-like | Safe areas, floating tab bar, sheet drawer, segmented controls |
| Fintech | Navy/teal identity, amount hierarchy, trustworthy |

---

## 8. Explicit non-goals

- **Not** a full dark-mode polish of every component in one pass.
- **Not** replacing **business logic**, routes, offline behavior, or schema.
- **Not** duplicating Behance/Dribbble screens or assets.
- **Not** removing RTL or Arabic-first copy patterns.

---

## 9. Typography scale (contract)

Use these tokens for **new** rules; existing rules may still use `rem` until migrated.

| Token group | Role |
|-------------|------|
| `--type-page-title-*` | App bar / hero page title |
| `--type-section-title-*` | Section headers inside pages |
| `--type-card-title-*` | Card / panel titles |
| `--type-value-emphasis-*` | Amounts, KPI figures |
| `--type-row-title-*` | List row primary line |
| `--type-row-metadata-*` | Secondary line / meta |
| `--type-chip-*` | Chips, small badges |
| `--type-button-*` | Primary/secondary button label rhythm |
| `--type-helper-*` | Helper, banner body, hints |

**Mobile:** `@media (max-width: 960px)` may **override** `--type-page-title-size` (and others) for smaller viewports — one place, not scattered literals.

---

## 10. Surface language (contract)

| Surface role | Token / class direction |
|--------------|-------------------------|
| Page canvas | `--theme-body-background`, `--theme-bg-app` |
| Default card | `--theme-surface-base`, `--theme-radius-lg` / xl |
| Elevated / modal chrome | `--theme-surface-elevated`, `--theme-shadow-md` |
| Grouped rows | `--mobile-surface-grouped`, hairline separators |
| Glass shell (mobile) | `--mobile-surface-glass` + blur in CSS |
| Segmented control tray | Glass + `--theme-overlay-hover` on inactive |
| Active tab | Light: white capsule; Dark: elevated fill (tokenized) |
| Drawer sheet | `--mobile-surface-elevated`, scrim `--mobile-backdrop-scrim` |
| Tab bar | Floating bar using glass + shadow tokens |
| Top bar | Frosted strip; text `--mobile-ink-strong` (mobile) |
| Primary CTA | Brand gradient + `--theme-shadow-*`; secondary = bordered/filled surface |
| Chips | Semantic tints; `--type-chip-*` |

---

## 11. Switching theme later

1. Set `document.documentElement.dataset.theme = 'dark'` (or `'light'`).
2. Optionally persist in `localStorage` and re-apply before paint (future).
3. Optionally respect `prefers-color-scheme` in a small bootstrap script (future).
4. Revisit `applyBrandingToDocument` if tenant palettes need **per-theme** soft tints (future).

**Today:** `App.jsx` initializes **`light`** only; dark values exist so flipping `data-theme` is safe for incremental QA.

---

## 12. Touch targets (mobile ≤960px)

- **`--touch-target-min`:** `44px` (set inside **`@media (max-width: 960px)`** on **`:root`**, light + dark). Used for **`min-height`** / **`icon-button`** sizing so primary taps meet a comfortable iPhone-style minimum.
- **Buttons & fields:** `min-height: max(42px, var(--touch-target-min))` where the layout allows.
- **Bottom nav:** link row **`min-height`** ~48px + padding; **ConnectionBadge** in the top bar **`min-height`** ~40px on narrow breakpoints.
- **Chips:** operational chips use **`min-height: 32px`** + **`inline-flex`** for alignment when they behave as scan targets.

## 13. Reduced motion

- Global **`@media (prefers-reduced-motion: reduce)`** (see **`src/index.css`**) collapses transition durations on shell controls (buttons, tabs, drawer, bottom nav, linked cards) and removes hover / press **transform** flourishes.
- Drawer slide may still move; duration is shortened to **`0.01ms`** so it is effectively instant. Prefer **no** `animation` for decorative loops in chrome.

## 14. Maintenance rule

_(Former §12; §12–13 above add touch-target and reduced-motion contracts.)_

Any new mobile or shared chrome **must**:

1. Use **`--theme-*` / `--type-*` / `--mobile-*`** when a token exists or should exist.
2. Add missing tokens here and in `index.css` **in the same change**.
3. Avoid new raw hex/rgba in `@media (max-width: 960px)` except for one-off fixes with a **TODO(token)** comment.

---

## 15. Viewport and keyboard scroll (mobile ≤960px)

- **`index.html` viewport:** includes **`viewport-fit=cover`** (safe-area full-bleed) and, where engines
  support it, **`interactive-widget=resizes-content`** so the visual viewport can shrink when the on-screen
  keyboard opens instead of only overlaying content.
- **`@media (max-width: 960px)`** in **`src/index.css`:** `html` uses **`scroll-padding-bottom`** and
  **`.field:focus-within`** uses **`scroll-margin-bottom`** sized to the floating bottom nav + **`env(safe-area-inset-bottom)`** so **`scrollIntoView` / browser focus scrolling** tends to leave the active field
  above the tab bar. Pair with existing **`.page-content`** bottom padding and sticky submit **`bottom`**
  offsets (Phase 9).

## 16. Compact page hero / app-bar (mobile ≤960px, T1)

Shared **`PageHeader`** output is **`section.page-hero`**. On phone widths the product treats this as an
**app bar**, not a marketing hero.

**Tokens** (set on **`:root`** inside **`@media (max-width: 960px)`**, light + dark; tightened again at **720px**
and **540px**):

| Token | Role |
|-------|------|
| **`--mobile-page-hero-padding-y`** / **`--mobile-page-hero-padding-x`** | Inset for the hero card |
| **`--mobile-page-hero-radius`** | Corner radius (slightly smaller on very narrow widths) |
| **`--mobile-page-hero-actions-margin-top`** | Space between title stack and **`page-actions`** |
| **`--mobile-page-hero-actions-gap`** | Grid gap for hero action buttons |

**Markup:** long route descriptions use **`p.page-hero-description`** (hidden on mobile via CSS). Meta lines
such as “آخر تحديث” stay as **`support-text`** / **`dashboard-mobile-lite-updated`** children — not the
description paragraph.

**Title color:** hero **`h1`** uses **`var(--theme-text-primary)`** (not hardcoded ink) so **`data-theme="dark"`**
QA reads correctly.

## Related docs

- `docs/usdt-mobile-app-like-ui-plan.md` — phased mobile transformation plan  
- `docs/project-current-state.md` — current baseline  
- `docs/code-map.md` — where shell and pages live  
- `docs/mobile-qa-final-checklist.md` — Phase 10 QA record (static + device follow-up)  
