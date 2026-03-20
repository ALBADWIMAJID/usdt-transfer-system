# Mobile theme system — USDT Transfer System

This document is the **single source of truth** for the product’s **visual direction** and **CSS token contract**. Later UI prompts should extend this system, not invent parallel colors or spacing per page.

**Implementation:** `src/index.css` (`:root[data-theme="light"]`, `:root[data-theme="dark"]`, mobile `@media` overrides). **Resolved theme:** `document.documentElement.dataset.theme` is always **`light`** or **`dark`** (drives CSS). **User preference:** **`light` | `dark` | `auto`** persisted in **`localStorage`** key **`usdt-theme-mode`** (see **`src/lib/themePreference.js`**); **`auto`** follows **`prefers-color-scheme`**. A small **inline script** in **`index.html`** runs before the bundle to set **`data-theme`** from storage + OS and limit first-paint flash. **`ThemePreferenceProvider`** (`src/context/ThemePreferenceProvider.jsx`) keeps DOM, **`auto`** listeners, and cross-tab **`storage`** events in sync. **Branding note:** `config/branding.js` → `applyBrandingToDocument()` may set `--brand-*` on `:root` inline; tokens that reference `var(--brand-*)` follow that palette.

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
- **Rollout:** **`data-theme="dark"`** is wired through shared primitives and major mobile surfaces (T3); **T3.6** rebalanced readability, surface luminance, and **glass vs solid** placement on **≤960px** + global dark tokens. Residual literals may remain in edge selectors.

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
| `--theme-control-inset-well` | Shared **inset** shadow on text fields (focus stack reuses it); dark `:root` sets a deeper well |
| `--theme-page-shell-border-color` / `--theme-page-shell-face` | **Page hero / card stack** hairline + layered face (light + dark) |
| `--theme-elevated-panel-bg` | **Elevated** panels (queue cards, summaries) — gradient + strong surface |
| `--theme-panel-tint-*-bg` | **Warning / danger / success / brand** tinted panels (semantic, not raw hex blocks) |
| `--theme-chrome-topbar-bg` / `--theme-chrome-plate*` | **Top bar** and **plates** (badges, compact chrome) |
| `--theme-nav-icon-well-bg` / `--theme-nav-link-hover-bg` | **Drawer / nav** icon wells and row hover |
| `--theme-sidebar-footer-bg` / `--theme-auth-highlight-chip-bg` | **Sidebar footer** wash; **auth** highlight chips |
| `--theme-sync-calm-bg` | **Sync / calm** banner neutral fill |
| `--theme-sheet-shadow-up` | **Bottom sheet** elevation (mobile `operations-sheet-panel`, upward shadow) |
| `--theme-sheet-backdrop-scrim` / `--theme-sheet-backdrop-blur` | **T4.2:** **Operations drill-down** sheet **backdrop** (desktop values; **≤960px** aliases to **`--mobile-backdrop-scrim`** + **`--mobile-scrim-blur`**) |
| `--theme-overlay-*` | Hover / press overlays for segmented controls & chrome |
| `--theme-accent-*` | Non-brand accent surfaces (tints from brand) |
| `--theme-button-primary-bg` / `--theme-on-primary` | **`.button.primary`** gradient (or solid stack) + **on-primary** label color |
| `localStorage` key `usdt-theme-mode` | `light` / `dark` / `auto` (UI preference; CSS only sees resolved `data-theme`) |
| `--theme-app-tab-idle-overlay` / `--theme-app-tab-active-overlay` / `--theme-app-tab-surface` | **`app-section-tab`** idle / active layered backgrounds |
| `--theme-mobile-control-fill` | **≤960px** **`input` / `select` / `textarea`** surface inside **`.field`** (light + dark mobile `:root`) |
| `--mobile-*` | **≤960px** chrome (tab bar, drawer, hairlines, glass) — overridden per theme in mobile block |
| `--mobile-surface-content` | **Dark + ≤960px only:** dense fill for **nested** page cards (**`.info-card`**, **`.record-card`**, article rows) — **solid**, not frosted glass |
| `--mobile-chrome-blur` / `--mobile-tab-bar-blur` / `--mobile-tray-blur` / `--mobile-drawer-blur` / `--mobile-scrim-blur` | **≤960px** shared **backdrop-filter** radii for top bar, tab bar, section/dashboard trays, drawer panel, drawer scrim (**T4**); **light + dark** mobile **`:root`** each set their own values |
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
| `--type-helper-*` | Helper, banner body, hints; **T4.2:** **`.field .support-text`** |

**Mobile:** `@media (max-width: 960px)` may **override** `--type-page-title-size`, **`--type-value-emphasis-size`**, and others for smaller viewports — one place, not scattered literals (**T4.1** adds emphasis scaling at **960 / 720 / 540px**).

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

## 11. Theme activation (T3.5)

1. **Preference** is stored under **`localStorage`** key **`usdt-theme-mode`**: **`light`**, **`dark`**, or **`auto`**.
2. **Default when missing or invalid:** **`auto`** (follows OS **`prefers-color-scheme`**). If the bootstrap script throws (e.g. storage unavailable), it falls back to **`data-theme="light"`**.
3. **DOM:** `document.documentElement.dataset.theme` is set to the **resolved** **`light`** or **`dark`** (never `auto`).
4. **`auto` mode:** `matchMedia('(prefers-color-scheme: dark)')` with a **`change`** listener updates **`data-theme`** and triggers a React re-sync so context consumers stay coherent.
5. **UI:** **`ThemePreferenceControl`** in **`AppShell`** drawer (above footer) and on **`LoginPage`** — compact three-segment control (فاتح / داكن / تلقائي), styled with **`theme-preference-*`** in **`src/index.css`**.
6. **Cross-tab:** **`window` `storage`** event updates preference if another tab changes **`usdt-theme-mode`**.
7. **Manual QA / debugging:** setting **`dataset.theme`** directly still works until the next preference write or provider sync; prefer the UI or **`setMode`** for product behavior.

**Future:** `applyBrandingToDocument` could vary **`--brand-*`** per resolved theme if tenants need it.

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

## 17. Full light-theme completion (T2)

**Goal:** one coherent **light** fintech language across mobile (and shared primitives where the same
components render on desktop).

**Implemented in `src/index.css`:**

- **Primary CTA:** **`.button.primary`** uses **`--theme-button-primary-bg`** + **`--theme-on-primary`** globally;
  on **≤960px** light, **`--theme-button-primary-bg`** switches to the **vertical** navy → teal gradient;
  mobile shadows use **`--theme-cta-shadow`** / **`--theme-cta-shadow-hover`**.
- **App section tabs:** **`.app-section-tab`** uses **`--theme-app-tab-idle-overlay`**, **`--theme-app-tab-active-overlay`**,
  **`--theme-app-tab-surface`** (light + dark `:root` values keep `data-theme` QA coherent).
- **Banners:** default **`.status-banner`** and variants use **`--theme-surface-soft`**, **`--theme-status-*`**, and
  **`--theme-border-default`** instead of one-off hex panels; **≤960px** variants set full **bg + border + text**
  per tone.
- **Forms (mobile):** **`.field`** controls use **`--theme-mobile-control-fill`**, **`--theme-border-default`**,
  **`--theme-text-primary`**, and stacked **`--theme-control-inset-well`** + **`--theme-inset-highlight-soft`**;
  labels lean on **`--theme-text-secondary`**.
- **Meta tiles / metrics:** **`.record-meta`** (global + mobile refinement) and **`.metric-card`** tints use
  **`--theme-surface-strong`** / **`color-mix`** with semantic surfaces; **`.stat-label`** uses **`--theme-text-tertiary`**.
- **Offline chips:** **`.offline-snapshot-chip--*`** tints use **`color-mix`** from **`--theme-status-*-text`**.
- **Top bar title:** **`.page-intro h2`** on mobile uses **`--theme-text-primary`**.

## 18. Full dark-mode rollout (T3)

**Goal:** **`data-theme="dark"`** reads as a **complete premium fintech** mobile skin — not “light with a few inverted colors.” Surfaces share one **semantic** family (canvas → shell → elevated → rows → controls).

**Implemented in `src/index.css` (CSS/tokens only; no logic or route changes):**

- **Dark `:root` completeness:** **`--theme-list-row-fill`** and **`--theme-control-inset-well`** defined for dark (were light-only gaps); status, chrome, KPI, hero, and grouped **lite** tokens already had dark values — selectors were rewired to **use** them.
- **T3 shell + panel tokens (light + dark):** **`--theme-page-shell-*`**, **`--theme-elevated-panel-bg`**, **`--theme-panel-tint-*`**, **`--theme-chrome-*`**, **`--theme-nav-*`**, **`--theme-sidebar-footer-bg`**, **`--theme-auth-highlight-chip-bg`**, **`--theme-sync-calm-bg`** — used for heroes, cards, drawers/adjacent chrome, auth, sync strip, payment/transfer panels, queue groups, KPI tiles, banners.
- **Mobile ≤960px dark primary CTA:** **`--theme-button-primary-bg`** vertical stack (deep navy → teal) for legibility on dark canvas (see mobile **`@media`** dark **`:root`**).
- **Desktop sidebar (shared):** **`.sidebar-panel`** uses **`--theme-page-shell-border-color`** + **`--theme-page-shell-face`** so **dark** desktop layout is not a bright white card; **`.sidebar-header`** hairline uses **`--theme-border-default`**.
- **Brand mark SVG:** **`.brand-mark-line`** stroke uses **`--theme-on-primary`** (contrast on brand gradient in both themes).

**QA:** use the in-app **المظهر** control, or temporarily set **`document.documentElement.dataset.theme`**.

## 19. Theme activation — product wiring (T3.5)

**Goal:** operators can use **light / dark / auto** without DevTools; preference survives reloads.

**Files:** **`index.html`** (inline bootstrap), **`src/lib/themePreference.js`**, **`src/context/ThemePreferenceProvider.jsx`**, **`src/context/theme-preference-context.js`**, **`src/components/ui/ThemePreferenceControl.jsx`**, **`src/App.jsx`** (provider wrap), **`AppShell.jsx`** + **`LoginPage.jsx`** (control placement), **`src/index.css`** (`.theme-preference*`, `.sidebar-theme-wrap`).

## 20. Dark readability & liquid-glass correction (T3.6)

**Goal:** dark mode feels **readable**, **layered**, and **iOS-like** — not black-heavy, not “glass on glass” inside page content.

**Token refinements (dark `:root`):** slightly **lifted** canvas (**`--theme-bg-app`**, **`--theme-body-background`**), **brighter** surface stack (**`--theme-surface-*`**), **clearer** text hierarchy (**`--theme-text-secondary`**, **`--theme-text-tertiary`**, **`--muted-strong`**), softer **shadows**, brighter **hairlines**, tuned **KPI / lite / shell** gradients, slightly stronger **status** fills + text (still restrained).

**Mobile dark `≤960px` `:root`:** **`--mobile-canvas-*`** less harsh; **`--mobile-surface-elevated`** → **solid gradient** hero/shell; **`--mobile-surface-grouped`** opaque for wells; **`--mobile-surface-glass`** reserved for **chrome**; new **`--mobile-surface-content`** for nested cards; improved **tab bar / top bar / ink** tokens.

**Glass discipline:** **Reduced blur** + intentional glass on **top bar**, **bottom nav**, **drawer**, **section tab tray**, **Dashboard Lite** nav shell; **removed backdrop blur** from **sync banners** and **nested content cards** in dark; **solid** overrides for **page cards** (transfers / customers / customer details / new transfer) and **queue filter bar**.

**Drawer:** dedicated dark **`.sidebar-panel`** gradient + lighter blur; **nav row / icon** contrast fixes so labels are not navy-on-charcoal.

**Desktop dark:** **`.app-section-nav`** no longer uses the light-only frosted fill; **`.topbar`** border uses **`--theme-border-default`**; **operations sheet** title uses primary text color.

**Light theme:** unchanged.

## 21. Final iOS chrome completion (T4)

**Goal:** shared **mobile shell** (top bar, bottom tab bar, drawer, section trays, dashboard lite tray, status strip
material, bottom **operations** sheet) feels **cohesive** and closer to **native iPhone** chrome — without
redesigning **page bodies** or changing **light/dark** architecture.

**Implemented in `src/index.css` (≤960px unless noted):**

- **Tokens:** **`--mobile-chrome-blur`**, **`--mobile-tab-bar-blur`**, **`--mobile-tray-blur`**, **`--mobile-drawer-blur`**,
  **`--mobile-scrim-blur`** on **light + dark** mobile **`:root`** — one blur language; **saturate** tuned per layer.
- **Top bar:** tighter **safe-area** padding, **title** line-height/tracking, **leading** row alignment, **smaller**
  **hamburger** (40px) + **connection** capsule, **tray-aligned** sync strip (hairline + shared tray blur in **light**).
- **Bottom nav:** **26px** outer radius, **safe-area** float, **50px** row height, **500/600** label weight, **inset**
  highlight on active, subtler **dot**; **tab-bar** blur from token.
- **Drawer:** **floating** inset from screen edges, **26px** leading corners, **grabber** pseudo, **padding-top** for
  affordance, **drawer** blur from token; header rhythm nudged.
- **Trays:** **`.app-section-nav`** + **Dashboard Lite** nav shell — **12px** tray radius, **hairline** border,
  **tighter** padding/gap, **10px** inner tab radius, **active** inset highlight; **customers** portfolio tray aligned
  with global tab styling (no separate “fat pill” tray).
- **Operations sheet (phone):** **22px** top corners, **grabber**, **padding-top** for header clearance.

## 22. Dark surface fix + typography & density normalization (T4.1)

**Goal:** dark mode less **black-heavy** and more **layered**; **native controls** respect resolved theme where
engines allow; **typography** contract complete on **`data-theme="dark"`**; **phone** cards/forms/lists slightly
**denser** without shrinking touch targets.

**Implemented in `src/index.css`:**

- **Dark `:root`:** slightly **lifted** **`--theme-bg-app`**, body gradient, **`--theme-surface-*`**, list row fill,
  borders, elevated/page-shell/chrome plates, **KPI lite** base/primary gradients; **`accent-color:
  var(--brand-primary)`**; **full `--type-*` mirror** (dark previously omitted several tokens → invalid **`var()`**
  for emphasis/card/row/chip/button).
- **T4.1 rules:** **`color-scheme: dark`** on **`.field`** controls and common **`input` / `select` / `textarea`**
  (excluding checkbox/radio/range/file/hidden/button); **`select option`** background/color from
  **`--theme-surface-strong`** + **`--theme-text-primary`** (browser-dependent).
- **≤960px dark `:` root:** **`--theme-mobile-control-fill`** → **`var(--theme-surface-strong)`** (solid; avoids
  gradient + native **`<select>`** clash); **brighter** **`--mobile-canvas-*`**, **`--mobile-surface-elevated`** /
  **`--mobile-surface-grouped`** / **`--mobile-surface-content`** for clearer stack vs canvas.
- **≤960px light `:` root:** **`--type-value-emphasis-size: 1.3rem`**; **720px** / **540px** breakpoints also
  nudge **`--type-value-emphasis-size`** (light + dark).
- **Shared metrics:** **`.stat-value`**, **`.dashboard-snapshot-value`**, **`.operations-sheet-total strong`**,
  **`.customers-portfolio-summary .stat-value`** use **`--type-value-emphasis-*`** instead of ad hoc **`2rem`**
  / **`1.7rem`** / **`clamp(...)`** (desktop + mobile scale via tokens).
- **Density (≤960px):** tighter **`.page-card`**, nested **`.record-card` / `.info-card`**, **`.form-grid`**,
  **`.field`** gaps + control padding, **`.field textarea`** min-height, **section tabs** min-heights, **status
  banner** padding, **queue / portfolio group** padding + list gaps, **Dashboard Lite KPI** padding.

**Light theme:** only **shared metric typography** + **mobile token/density** adjustments above (no dark-only
redesign).

## 23. Native controls + menu surfaces — final consistency (T4.2)

**Goal:** one **control family** across forms (new transfer, payment, filters, customer flows, operations sheet):
native **`<select>`** / **`<option>`** / **`optgroup`**, **date/time** inputs, **text** fields, **textarea**, and
**readonly** computed rows read as the same visual language in **light** and **dark**, without custom select
widgets or logic changes.

**Implemented in `src/index.css`:**

- **Light + dark:** **`color-scheme`** reinforced on **`.field`** controls (light explicit; dark unchanged from
  T4.1); **`select option`** + **`optgroup`** use **`--theme-surface-strong`**, **`--theme-text-primary`** /
  **`--theme-text-secondary`**, **`--type-chip-weight`** (browser-dependent for dropdown painting).
- **Dark only:** **WebKit/Blink** **`::-webkit-calendar-picker-indicator`** filter on **`.field`** **date** /
  **datetime-local** / **time** / **month** so picker icons stay visible on tinted fields.
- **Shared `.field` rhythm:** labels on **`--type-row-title-*`** (desktop) / **`--type-row-metadata-size`** +
  **`--type-chip-weight`** (≤960px); values on **`--type-row-title-size`** + **`--type-row-metadata-leading`**;
  slightly **denser** desktop control height (**48px** min, padding trim); **textarea** **`resize: vertical`** +
  shorter default min-height; **readonly** copy uses **`--theme-text-secondary`**; **`.field .support-text`**
  uses **`--type-helper-*`** + **`--theme-text-tertiary`**.
- **RTL/LTR:** **`datetime-local`**, **`time`**, **`month`** added to the shared LTR input list (same as **date**).
- **Theme preference chrome:** **`.theme-preference-*`** label/button sizes align with **`--type-chip-*`**.
- **Operations sheet list well:** **`.operations-sheet-body`** — hairline **`--theme-border-default`** + fill
  **`--theme-surface-soft`** so the scrollable list sits in a deliberate **inset** vs the panel chrome.
- **Mobile density + touch:** **transfers** filter bar controls use **`--type-row-*`** + **`max(42px,
  var(--touch-target-min))`**; **operations sheet** search row / actions (≤960px and ≤540px) no longer use
  **36–38px** min-heights — **`max(40px, var(--touch-target-min))`**; **≤540px** generic **`.field` / `.button`**
  min-height respects **`--touch-target-min`**.

**Not changed:** routing, auth, business rules, Supabase, offline/print behavior, or custom **`<select>`**
implementations (still native).

**T4.2 follow-up (same pass, CSS-only refinements):**

- **Sheet scrim tokens:** **`--theme-sheet-backdrop-scrim`** + **`--theme-sheet-backdrop-blur`** replace a hardcoded
  **`.operations-sheet-backdrop`** fill; **≤960px** light/dark **`:root`** alias them to **`--mobile-backdrop-scrim`**
  and **`--mobile-scrim-blur`** so the drill-down sheet matches **drawer** scrim language.
- **Light `accent-color`:** **`var(--brand-primary)`** on **`:root[data-theme='light']`** (parity with dark) for native
  control accents where the engine respects it.
- **Control family:** **`.field select`** **`cursor: pointer`** + **`padding-inline-end`** for chevron affordance
  (**T4.3** replaces the native arrow with a themed **SVG** while keeping native menus); **`:disabled`** states
  (**opacity** + **tertiary** text); **light** **WebKit** **calendar** indicator **opacity**
  (parity with dark inverted affordance).
- **Operations sheet copy:** description + meta lines use **`--type-helper-*`** and **`--type-row-metadata-*`** /
  **`--type-chip-weight`**; mobile bulk **0.78rem** override **removed** for sheet meta so tokens win.
- **Customers list filter (≤960px):** **`.customers-list-filter-bar`** fields aligned with **transfers** filter
  **touch** + **`--type-row-*`** rhythm.

## 24. Select shell, autofill, spinners, sheet lip — final illusion (T4.3)

**Goal:** remove the last **obvious browser-default** cues on high-traffic controls without replacing native
**`<select>`** / date pickers or changing logic.

**Implemented in `src/index.css`:**

- **`.field select`:** **`appearance: none`** (WebKit/Gecko) + **theme-tinted SVG chevron** on **`background-image`**
  (light stroke **`#62748a`**, dark **`#aabace`**) so the **closed** control matches the field family; native
  option sheet behavior unchanged.
- **Mobile ≤960px:** same chevron re-applied after the mobile **`.field`** **`background`** shorthand (which would
  otherwise drop **`background-image`**); dark theme override preserved.
- **Light `color-scheme` parity:** global **`input` / `select` / `textarea`** (excluding checkbox/radio/range/file/
  hidden/button types) mirror the **T4.1** dark rule so stray controls outside **`.field`** still prefer **light**
  native widgets when **`data-theme="light"`**.
- **`.field input[type='number']`:** **WebKit** spin buttons hidden + **`-moz-appearance: textfield`** / **`appearance: textfield`**
  so amount/rate fields read as typographic inputs.
- **`.field input:-webkit-autofill`:** **`box-shadow`** fill + **`-webkit-text-fill-color`** / **`caret-color`** so
  autofill (e.g. login) matches **`--theme-surface-strong`** and primary text in **light** and **dark**.
- **`.operations-sheet-body`:** subtle **`inset`** highlight (**`--theme-inset-highlight-soft`**) under the top border
  so the scrollable list well aligns visually with the sheet chrome.
- **WebKit/Blink date & time interiors:** **`::-webkit-datetime-edit*`** segments use **`--theme-text-primary`** /
  **`--theme-text-tertiary`** and trimmed wrapper padding so inline date/time chrome matches typographic fields.
- **Calendar / clock affordance:** **`::-webkit-calendar-picker-indicator`** uses **`cursor: pointer`** (light + dark)
  alongside existing opacity / invert tuning.
- **`.field select option`:** empty-value and **`:disabled`** options use **`--theme-text-tertiary`** (native menu
  unchanged).
- **`.operations-sheet-actions`:** top **hairline** + matching **`inset`** lip so the search / view-all row separates
  cleanly from summary and list (**`.operations-sheet-subtitle`** on **`--theme-text-secondary`**).

**Still engine-limited:** native **`<select>`** dropdown painting, **date/time** popovers, and **Firefox** autofill
styling may not fully match WebKit.

## Related docs

- `docs/usdt-mobile-app-like-ui-plan.md` — phased mobile transformation plan  
- `docs/project-current-state.md` — current baseline  
- `docs/code-map.md` — where shell and pages live  
- `docs/mobile-qa-final-checklist.md` — Phase 10 QA record (static + device follow-up)  
