# Implementation Log

## 2026-03-20 — T4.3 follow-up: date/time interior + sheet actions + select hints

Scope: **CSS-only** — extends **T4.3** without logic, routes, schema, auth, offline, or print changes. Further reduce
**WebKit/Blink**-visible chrome on **date/time** fields; tighten **operations sheet** action strip vs summary/list;
soften **select** placeholder/disabled option copy in the native menu.

Files changed:

- `src/index.css` — **WebKit** **`::-webkit-datetime-edit*`** on **`.field`** **date** / **datetime-local** / **time** /
  **month**; **`cursor: pointer`** on calendar/clock indicators (light + dark, incl. **`:not([data-theme])`** light
  block repair); **`.field select option[value='']`** + **`option:disabled`** → **`--theme-text-tertiary`**;
  **`.operations-sheet-actions`** top border + inset lip; **`.operations-sheet-subtitle`** → **`--theme-text-secondary`**
- `docs/mobile-theme-system.md` — **§24** bullets
- `docs/code-map.md`, `docs/project-current-state.md`, `docs/implementation-log.md`,
  `docs/last-change-summary.md`

Verification:

- `npm run lint` — passed
- `npm run build` — passed

Suggested commit message:

- `T4.3 High-impact control replacement and final illusion fix`

## 2026-03-20 — T4.3 High-impact control shell + final illusion fix

Scope: **CSS-only** — no business logic, routes, schema, auth, offline, or print changes. Tighten **native-adjacent**
controls and one sheet surface so fewer **browser-default** moments break the premium mobile illusion.

Files changed:

- `src/index.css` — **T4.3:** **`.field select`** **`appearance: none`** + **theme-colored SVG chevron** (light/dark);
  **≤960px** re-apply chevron after mobile field **`background`** shorthand + dark override; **light** global
  **`color-scheme: light`** on **`input`/`select`/`textarea`** (same exclusions as dark **T4.1**); **`.field
  input[type=number]`** spinner removal (**WebKit** + **Moz** **`textfield`**); **`-webkit-autofill`** fill aligned to
  **`--theme-surface-strong`** + primary text/caret; **`.operations-sheet-body`** **`inset`** lip
  (**`--theme-inset-highlight-soft`**)
- `docs/mobile-theme-system.md` — **§24 T4.3** (control illusion pass)
- `docs/code-map.md`, `docs/project-current-state.md`, `docs/implementation-log.md`,
  `docs/last-change-summary.md`

Verification:

- `npm run lint` — passed
- `npm run build` — passed

Suggested commit message:

- `T4.3 High-impact control replacement and final illusion fix`

## 2026-03-20 — T4.2 follow-up: sheet scrim tokens + control parity

Scope: extend **T4.2** without logic/routes/offline changes — **tokenized** operations-sheet **backdrop**, **light**
**`accent-color`**, **select/disabled/calendar** polish, **operations sheet** helper typography on **`--type-*`**,
**customers** mobile filter fields aligned with **transfers**, mobile cascade fix (sheet meta no longer forced to
**0.78rem** bulk rule).

Files changed:

- `src/index.css` — **`--theme-sheet-backdrop-scrim`**, **`--theme-sheet-backdrop-blur`** (light/dark **`:root`**;
  **≤960px** aliases); **`.operations-sheet-backdrop`** + sheet **description/meta/labels** tokens; **`.field select`**
  / **`:disabled`**; light **calendar** indicator; **customers** **`.customers-list-filter-bar`** fields; mobile
  **`.field select`** padding; removed **operations-sheet** selectors from generic mobile **0.78rem** block
- `docs/mobile-theme-system.md` — §4 token row, §23 **T4.2 follow-up**
- `docs/code-map.md`, `docs/project-current-state.md`, `docs/implementation-log.md`,
  `docs/last-change-summary.md`

Verification:

- `npm run lint` — passed
- `npm run build` — passed

Suggested commit message:

- `T4.2 Native controls and final visual consistency pass`

## 2026-03-20 — T4.2 Native controls + final visual consistency pass

Requested scope:
- **Control-layer** polish only: **selects**, **native menus**, **date/time**, **inputs/textarea**, **sheet** scroll
  bodies, **filters**, **theme preference** segments; **light + dark** readable; **no** logic, routes, schema, offline,
  or page redesign.

Files changed:
- `src/index.css` — **T4.2:** light **`color-scheme`** on **`.field`**; **`option`/`optgroup`** surfaces (light+dark);
  dark **WebKit** calendar indicator filter; **`.field`** label/value/**support-text**/readonly/**textarea** on **`--type-*`**
  + theme colors; **LTR** list + **`datetime-local`/`time`/`month`**; **`.operations-sheet-body`** inset well;
  **`.theme-preference-*`** on **`--type-chip-*`**; mobile **transfers filter** + **operations sheet** search/actions
  **`--type-row-*`** + **`max(..., var(--touch-target-min))`**; **≤540px** field/button min-height respects touch token
- `docs/mobile-theme-system.md` — **§23 T4.2**, **`--type-helper-*`** row note
- `docs/code-map.md`, `docs/project-current-state.md`, `docs/implementation-log.md`,
  `docs/last-change-summary.md`

Verification:
- `npm run lint` — passed
- `npm run build` — passed

Suggested commit message:
- `T4.2 Native controls and final visual consistency pass`

## 2026-03-20 — T4.1 Dark surface fix + typography & density normalization

Requested scope:
- **Dark** surfaces less oppressive; **white/light native controls** in dark less jarring; **typography** aligned
  (especially mobile); **density** improved on phone; **CSS/tokens only** — no logic, routes, offline, schema.

Files changed:
- `src/index.css` — **dark `:root`:** lifted canvas/surfaces/borders/chrome/elevated/lite-KPI stacks, **`accent-color`**,
  **full `--type-*` mirror**; **T4.1** **`color-scheme: dark`** + **`option`** surface hints; **≤960px dark:** solid
  **`--theme-mobile-control-fill`**, brighter **`--mobile-canvas-*`** / **`--mobile-surface-*`**; **≤960/720/540px**
  **`--type-value-emphasis-size`**; **`.stat-value` / `.dashboard-snapshot-value` / operations sheet total /
  customers portfolio stat** on **`--type-value-emphasis-*`**; **density:** page/record cards, forms, tabs, banners,
  queue groups, lists, lite KPI padding
- `docs/mobile-theme-system.md` — §9 note, **§22 T4.1**
- `docs/code-map.md`, `docs/project-current-state.md`, `docs/implementation-log.md`,
  `docs/last-change-summary.md`

Verification:
- `npm run lint` — passed
- `npm run build` — passed

Suggested commit message:
- `T4.1 Dark surface fix and typography density normalization`

## 2026-03-20 — T4 Final iOS chrome completion (mobile shell)

Requested scope:
- Refine **shared mobile chrome** (top bar, bottom tab bar, drawer, trays, status strip material, operations
  bottom sheet) toward **native iPhone** feel; **no** business logic, routes, offline, page-body redesign, or new
  visual direction.

Files changed:
- `src/index.css` — **≤960px** mobile **`:root` (light + dark):** **`--mobile-chrome-blur`**, **`--mobile-tab-bar-blur`**,
  **`--mobile-tray-blur`**, **`--mobile-drawer-blur`**, **`--mobile-scrim-blur`**; **top bar** padding/title/badge/menu;
  **sync strip** tray styling (**light** blur harmonized); **drawer** margin, **26px** radius, **grabber**,
  **padding-top**; **bottom nav** radius/spacing/active; **app-section-nav** + **dashboard lite** tray density;
  **customers** **`.app-section-nav`** aligned with global tabs; **540px** tray radii; **720px** top bar compact;
  **operations-sheet-panel** grabber + radius; scrim/drawer/topbar/tabbar blur wired to tokens
- `docs/mobile-theme-system.md` — §4 blur token rows, **§21 T4**
- `docs/code-map.md`, `docs/project-current-state.md`, `docs/implementation-log.md`,
  `docs/last-change-summary.md`

Verification:
- `npm run lint` — passed
- `npm run build` — passed

Suggested commit message:
- `T4 Final iOS chrome completion`

## 2026-03-20 — T3.6 Dark mode readability & liquid-glass correction

Requested scope:
- Improve **dark** readability, surface **layering**, and **glass vs solid** placement on mobile chrome and
  shared surfaces; **no** business logic, routes, offline behavior, light-theme redesign, or T4.

Files changed:
- `src/index.css` — **dark `:root`:** lifted canvas/surfaces, clearer **`--theme-text-*`**, borders, shadows,
  KPI/lite/chrome/drawer/status tokens; **`:root[data-theme='dark'] .app-section-nav`** (desktop), **`.topbar`**
  border, **`.operations-sheet-copy h2`**; **≤960px dark `:root`:** **`--mobile-*`** canvas/glass/grouped/
  elevated + **`--mobile-surface-content`**; **T3.6 rules:** drawer panel gradient + blur, top bar / bottom nav /
  app-section-nav / dashboard lite nav **blur** tuning; sync banner **blur off** in dark; **solid** nested cards
  + page-scoped **`.page-card`** / filter bar; drawer **nav** text/icon contrast; customers/transfers tab count
  **brand** color in dark
- `docs/mobile-theme-system.md` — §3 note, §4 **`--mobile-surface-content`**, **§20 T3.6**
- `docs/code-map.md`, `docs/project-current-state.md`, `docs/implementation-log.md`,
  `docs/last-change-summary.md`

Verification:
- `npm run lint` — passed
- `npm run build` — passed

Suggested commit message:
- `T3.6 Dark mode readability and liquid glass correction`

## 2026-03-20 — T3.5 Theme activation (light / dark / auto)

Requested scope:
- User-visible theme switching on existing **`data-theme`** architecture; **`light`**, **`dark`**, **`auto`**
  (OS **`prefers-color-scheme`**); persist safely; **no** business logic, routes, schema, auth, offline, or
  broad UI redesign.

Files changed:
- `index.html` — inline bootstrap sets **`document.documentElement.dataset.theme`** from **`localStorage`**
  **`usdt-theme-mode`** + system scheme; try/catch fallback **`light`**; removed static **`data-theme`** on
  **`<html>`**
- `src/lib/themePreference.js` — storage key, normalize/read/write, **`resolveDataThemeFromMode`**
- `src/context/theme-preference-context.js`, `src/context/ThemePreferenceProvider.jsx` — context, **`setMode`**,
  **`auto`** listener, cross-tab **`storage`**, DOM sync
- `src/components/ui/ThemePreferenceControl.jsx` — compact segment UI (**فاتح / داكن / تلقائي**)
- `src/App.jsx` — **`ThemePreferenceProvider`** wrap; removed redundant default **`dataset.theme`**
- `src/components/AppShell.jsx` — **`sidebar-theme-wrap`** + control above footer
- `src/pages/LoginPage.jsx` — same control before **`auth-footer`**
- `src/index.css` — **`.theme-preference*`**, **`.sidebar-theme-wrap`** (+ mobile drawer tweaks)
- `docs/mobile-theme-system.md` — §11 rewrite, §4 row, §19 T3.5; `docs/code-map.md`,
  `docs/project-current-state.md`, `docs/implementation-log.md`, `docs/last-change-summary.md`

Default behavior:
- **No stored value or invalid value → `auto`** (resolved from OS). Bootstrap failure → **`light`**.

Verification:
- `npm run lint` — passed
- `npm run build` — passed

Suggested commit message:
- `T3.5 Theme activation with light dark auto modes`

## 2026-03-20 — T3 Full dark mode rollout (mobile + shared selectors)

Requested scope:
- Complete **dark** visual coherence for the mobile product (and shared CSS that serves both themes) using
  existing **`--theme-*` / `--type-*` / `--mobile-*`**; **no** business logic, routes, offline behavior,
  schema, or light-theme redesign.

Files changed:
- `src/index.css` — **`:root[data-theme='dark']`:** **`--theme-list-row-fill`**, **`--theme-control-inset-well`**
  (dark values); **T3 tokens** (**`--theme-page-shell-*`**, **`--theme-elevated-panel-bg`**, **`--theme-panel-tint-*`**,
  **`--theme-chrome-*`**, **`--theme-nav-*`**, **`--theme-sidebar-footer-bg`**, **`--theme-auth-highlight-chip-bg`**,
  **`--theme-sync-calm-bg`**) with selector rewires across shell (topbar, sync, drawer-adjacent nav), **page heroes /
  cards**, dashboard/customers/transfers/transfer-details/customer-details/new-transfer scoped surfaces, queue
  groups, KPI tiles, banners, payment/follow-up panels, activity chips, record meta; **≤960px dark** overrides
  **`--theme-button-primary-bg`** (vertical navy → teal); **desktop** **`.sidebar-panel`** → shell tokens,
  **`.sidebar-header`** → **`--theme-border-default`**; **`.brand-mark-line`** → **`--theme-on-primary`**
- `docs/mobile-theme-system.md` — §3 rollout note, §4 T3 token rows, §8 non-goals trim, **§18 T3 contract**
- `docs/code-map.md`, `docs/project-current-state.md`, `docs/implementation-log.md`,
  `docs/last-change-summary.md`

Verification:
- `npm run lint` — passed
- `npm run build` — passed

Suggested commit message:
- `T3 Full dark mode rollout`

## 2026-03-20 — T2 Full light theme completion (mobile follow-up)

Requested scope:
- Finish **light** visual consistency across mobile (shared primitives where they overlap desktop) using
  **`--theme-*` / `--type-*` / `--mobile-*`**; **no** business logic, routes, offline behavior, dark-mode
  completion pass, or visible theme toggle.

Files changed:
- `src/index.css` — **`:root` light + dark:** **`--theme-on-primary`**, **`--theme-button-primary-bg`**,
  **`--theme-app-tab-*`** for **`app-section-tab`**; **base** **`.status-banner`** / variants on semantic
  status + surface tokens; **`.button.primary`**, **`.record-meta`**, **`.metric-card`** / **`.stat-label`**,
  **`.offline-snapshot-chip--*`** token cleanup; **≤960px:** **`--theme-button-primary-bg`** vertical CTA
  override (light), **`--theme-mobile-control-fill`**, mobile **`.field`** controls, **`.record-meta`**,
  **`.status-banner`** variant fills, **`.page-intro h2`** color, primary button shadows from **`--theme-cta-*`**
- `docs/mobile-theme-system.md` — §4 token rows + §17 T2 contract
- `docs/code-map.md`, `docs/project-current-state.md`, `docs/implementation-log.md`,
  `docs/last-change-summary.md`

Verification:
- `npm run lint` — passed
- `npm run build` — passed

Suggested commit message:
- `T2 Full light theme completion`

## 2026-03-20 — T1 Global header compression pass (mobile follow-up)

Requested scope:
- Compress **≤960px** **`PageHeader` / `page-hero`** footprint across dashboard (desktop stack + Lite),
  transfers, customers, customer details, transfer details, new transfer; calmer top rhythm with shell
  status; **no** business logic, routes, offline behavior, or page body redesigns.

Files changed:
- `src/components/ui/PageHeader.jsx` — **`page-hero-description`** class on description **`p`** for targeted
  mobile hiding (support / freshness lines unchanged)
- `src/index.css` — mobile **`:root`** tokens **`--mobile-page-hero-*`**; shared **`.page-hero`** block
  (padding, title **`--theme-text-primary`**, compact eyebrow, **`page-actions`** 2-col grid + primary full
  row); **`.page-content`** / **`shell-status-strip`** top spacing nudge; **720px** / **540px** token
  tighten; **Dashboard Mobile Lite** header uses same tokens (with fallbacks); page-specific hero CSS
  deduped (transfers / customers / customer details / new transfer overrides only where layout differs);
  removed fragile **540px** **`p:last-of-type`** hero hiding (superseded by **`page-hero-description`**)
- `docs/mobile-theme-system.md` — §16 compact page hero contract
- `docs/code-map.md`, `docs/project-current-state.md`, `docs/implementation-log.md`,
  `docs/last-change-summary.md`

Verification:
- `npm run lint` — passed
- `npm run build` — passed

Suggested commit message:
- `T1 Global header compression pass`

## 2026-03-20 — Phase 10 iPhone QA and docs finalization

Requested scope:
- Final **mobile trust** pass per `docs/usdt-mobile-app-like-ui-plan.md` §20: static QA against shell,
  safe areas, sticky CTAs, lists, offline/sync visibility; **no** business logic, routes, offline semantics,
  auth, print, or page redesigns.

Files changed:
- `index.html` — viewport meta adds **`interactive-widget=resizes-content`** (with **`viewport-fit=cover`**)
  for keyboard/viewport behavior where supported
- `src/index.css` — **≤960px:** `html` **`scroll-padding-bottom`** + **`.field:focus-within`**
  **`scroll-margin-bottom`** so focused inputs clear the floating bottom nav when the browser scrolls
  them into view
- `docs/mobile-qa-final-checklist.md` — Phase 10 record (scenarios 1–11, static vs device, P10-1, deferrals)
- `docs/iphone-qa-checklist.md` — pointer to record results in **`mobile-qa-final-checklist.md`**
- `docs/mobile-theme-system.md` — §15 viewport / keyboard scroll contract
- `docs/code-map.md`, `docs/project-current-state.md`, `docs/implementation-log.md`,
  `docs/last-change-summary.md`

Verification:
- `npm run lint` — passed
- `npm run build` — passed

Physical iPhone sign-off remains **manual** via **`docs/iphone-qa-checklist.md`**.

Suggested commit message:
- `Phase 10 iPhone QA and docs finalization`

## 2026-03-20 — Phase 9 System-wide mobile micro-polish and accessibility pass

Requested scope:
- Calmer, more consistent **≤960px** chrome: touch targets, spacing rhythm for notices/empty/loading,
  truncation, motion restraint, **`prefers-reduced-motion`**, contrast tweaks, safe-area clearance; **no**
  business logic, routes, offline queues, or page redesigns.

Files changed:
- `src/index.css` — mobile **`:root`** **`--touch-target-min`** (light + dark); Phase 9 block: **`min-width: 0`**
  / wrapping for titles, tab label ellipsis containers, tokenized **`status-banner`** / **`empty-state`** /
  **`loading-state`**, **`sync-status-banner`** variants on **`--theme-status-*`**, **`shell-status-strip`**
  horizontal safe padding; larger **`.icon-button`**, **`.button`** / **`.field`** min-heights, drawer
  **`nav-link`** + **`nav-link-icon`**, **chips** **`min-height`**, **bottom-nav** padding + scale tweak;
  **`.page-content`** + **≤540px** bottom padding **`calc(5.75rem + safe-area)`**; sticky submit
  **`bottom: calc(5.5rem + safe-area)`**; **`a:hover article`** no lift on mobile; **≤720px** connection
  badge taller tap target; global **`@media (prefers-reduced-motion: reduce)`**
- `src/components/AppShell.jsx` — bottom **`NavLink`** **`aria-label={item.label}`**
- `docs/mobile-theme-system.md` — §12 touch targets, §13 reduced motion, maintenance §14
- `docs/code-map.md`, `docs/project-current-state.md`, `docs/implementation-log.md`,
  `docs/last-change-summary.md`

Verification:
- `npm run lint` — passed
- `npm run build` — passed

Suggested commit message:
- `Phase 9 system-wide mobile micro-polish and accessibility pass`

## 2026-03-20 — Phase 8 CustomersPage consistency pass

Requested scope:
- Align **`CustomersPage`** with the premium mobile shell (**hero**, **`app-section-*`**, grouped lists,
  compact filters) and **`--theme-*`** / **`--type-*`** / **`--mobile-*`** tokens; **no** business logic,
  routes, offline customer queue/replay semantics, or schema changes.

Files changed:
- `src/components/customers/CustomersHeader.jsx` — **`PageHeader`** **`className="customers-page-hero"`**;
  count label wrapped in **`customers-page-hero-meta`**
- `src/components/customers/CustomersList.jsx` — **`SectionCard`** **`customers-list-section`**;
  **`FilterBar`** **`customers-list-filter-bar`**
- `src/components/customers/CustomersFormSection.jsx` — **`customers-form-section`**;
  **`customers-create-form`** on **`<form>`**
- `src/pages/CustomersPage.jsx` — **`customers-portfolio-metrics-warning`** on portfolio warning
  **`InlineMessage`**; **`customers-portfolio-queue-inline`** on cross-section queue **`InlineMessage`**
- `src/index.css` — global **`.customers-portfolio-page`** token surfaces (preview cards/items, portfolio
  groups, customer row status variants, calmer **`status-banner`** overrides); **≤960px** Phase 8 block
  (compact hero, glass section nav + tab tokens, section description hides except pending copy, inset
  filter bar, grouped **`customer-portfolio-group-list`** / preview lists / **`pending-transfer-list`**,
  full-width create submit, **`empty-state`** / **`loading-state`** tone)
- `docs/code-map.md`, `docs/project-current-state.md`, `docs/implementation-log.md`,
  `docs/last-change-summary.md`

Verification:
- `npm run lint` — passed
- `npm run build` — passed

Suggested commit message:
- `Phase 8 CustomersPage consistency pass`

## 2026-03-20 — Phase 7 TransferDetailsPage mobile refinement pass

Requested scope:
- Stronger **≤960px** transfer follow-up screen: compact summary, clearer payment capture, grouped
  payment history, visually secondary print tab/surface, **`--theme-*`** / **`--type-*`** / **`--mobile-*`**
  alignment; **no** business logic, schema, routes, auth, print mechanics, or offline snapshot/queue
  semantics.

Files changed:
- `src/pages/TransferDetailsPage.jsx` — **`PageHeader`** **`className`** adds **`transfer-details-page-hero`**;
  **`TransferSummary`** **`recordHeaderClassName="transfer-details-summary-identity"`**
- `src/components/transfer-details/TransferSummary.jsx` — optional **`recordHeaderClassName`** merged into
  **`RecordHeader`**
- `src/components/transfer-details/BalanceSummary.jsx` — **`InfoGrid`** **`className="balance-summary-grid"`**
- `src/components/transfer-details/PaymentForm.jsx` — form **`transfer-payment-action-form`**;
  amount **`FieldShell`** **`transfer-payment-amount-field`**; submit wrapper **`transfer-payment-submit-slot`**
- `src/index.css` — global **`.transfer-details-page`** tokenized surfaces (highlight/balance/follow-up
  cards, follow-up + payment-action panels + meta items); **≤960px** Phase 7 block (hero, section chrome,
  identity + metric grids, tighter panels, payment form well + sticky primary CTA, grouped
  **`payment-history-list`**, de-emphasized active print card); split shared **≤960px** rules so
  **`.customer-details-page`** alone keeps older follow-up padding/copy font rules; **≤540px**
  **`payment-form-row`** single column + **`payment-entry--priority`** row padding without rounding inside
  grouped lists
- `docs/code-map.md`, `docs/project-current-state.md`, `docs/implementation-log.md`,
  `docs/last-change-summary.md`

Verification:
- `npm run lint` — passed
- `npm run build` — passed

Suggested commit message:
- `Phase 7 TransferDetailsPage mobile refinement pass`

## 2026-03-20 — Phase 6 NewTransferPage mobile capture flow polish

Requested scope:
- Guided **mobile** transfer entry: clearer grouping, calmer surfaces, stronger primary action,
  better summary placement, keyboard/tab-bar-safe spacing; **no** validation, submit contract,
  offline queue, or schema changes.

Files changed:
- `src/pages/NewTransferPage.jsx` — **`stack new-transfer-page`**; **`TransferComputedSummary`**
  moved **above** pending **`SectionCard`**; pending section **`new-transfer-pending-section`**;
  passes **`amountDisplayLabel`** / **`globalRateDisplayLabel`** into **`TransferFormSection`**
- `src/components/new-transfer/NewTransferHeader.jsx` — **`PageHeader`** **`className="new-transfer-page-hero"`**
- `src/components/new-transfer/TransferFormSection.jsx` — **`new-transfer-form-section`**,
  **`.new-transfer-step--customer|--pricing|--notes|--submit`**, **`new-transfer-submit-strip`** before
  submit, **`new-transfer-field-*`** on key fields; new optional string props for submit strip meta
- `src/components/new-transfer/TransferComputedSummary.jsx` — **`className`** prop + default
  **`new-transfer-summary-section`**
- `src/index.css` — **`.new-transfer-page`** global token surfaces (submit strip, pending failed card);
  **≤960px** hero compact, section cards, step hairlines, emphasized **USDT** input, sticky submit
  **`bottom: calc(5.35rem + safe-area)`**, compact **2-col** summary grid + full-width highlighted
  settlement card, pending section head
- `docs/code-map.md`, `docs/project-current-state.md`, `docs/implementation-log.md`,
  `docs/last-change-summary.md`

Verification:
- `npm run lint` — passed
- `npm run build` — passed

Suggested commit message:
- `Phase 6 NewTransferPage mobile capture flow polish`

## 2026-03-20 — Phase 5 CustomerDetailsPage mobile simplification

Requested scope:
- Cleaner **mobile** follow-up workspace for one customer; keep internal **`app-section-*`**
  model, data loading, snapshot/offline behavior, and routes unchanged; align with **theme tokens**
  and Payvo-style operational density.

Files changed:
- `src/pages/CustomerDetailsPage.jsx` — **`PageHeader`** `className="customer-details-page-hero"`;
  **`CustomerSummary`** `recordHeaderClassName="customer-details-identity"`
- `src/components/customer-details/CustomerSummary.jsx` — optional **`recordHeaderClassName`** passed
  through to **`RecordHeader`**
- `src/index.css` — global **`.customer-details-page`** follow-up panel + summary card surfaces use
  **`--theme-*`** / **`--theme-status-*`**; **≤960px** compact hero (hide long description paragraph,
  tokenized title/eyebrow, 2-col actions + full-width first secondary), section tab tweaks (hide tab
  descriptions, tokenized counts), **`page-card`** glass/border tokens, compact identity strip (hide
  duplicate name; phone + chip), 2-col highlight + metric grids, grouped **transfer-queue** /
  **activity** lists (`--theme-lite-list-well`, `--theme-block-head-rule`), actions section full-width
  buttons, queue **filter-bar** chip; **≤540px** preserve grouped list `gap: 0` + tighter row padding;
  corrected **flex `order`** for section panels (removed obsolete totals/followup class names; added
  **`customer-details-actions-section`**)
- `docs/code-map.md`, `docs/project-current-state.md`, `docs/implementation-log.md`,
  `docs/last-change-summary.md`

What was not changed:
- Business logic, Supabase, auth, print, offline queues/snapshots, section keys, transfer/activity data
  shaping

Verification:
- `npm run lint` — passed
- `npm run build` — passed

Suggested commit message:
- `Phase 5 CustomerDetailsPage mobile simplification`

## 2026-03-20 (follow-up) — Mobile shell + shared sheet chrome tokens

Scope:
- **≤960px** drawer/menu: **`.sidebar-header`** → **`--theme-drawer-header-wash`**; **`.sidebar-footer`**
  → **`--theme-drawer-footer-wash`**; **`.nav-link-icon`** color → **`--theme-nav-icon-fg`**; **`.user-chip`**
  → **`--theme-fill-muted-navy`**; **`.user-avatar`** → **`--theme-avatar-gradient`**; **`.sidebar-signout`**
  → **`--theme-surface-pill-muted`** + **`--theme-elev-micro`**
- **Top bar / badges:** **`.topbar`** hairline → **`--theme-chrome-hairline-y`**; **`.topbar .connection-badge`**
  → **`--theme-fill-muted-navy`**; **`.connection-badge`** fill → **`--theme-connection-badge-fill`**
- **Mobile chips:** warning / danger / success → **`--theme-status-chip-*`**
- **Shared operations sheet:** **`.operations-sheet-panel`** (base + **≤960** bottom sheet) → theme border,
  surface gradient, **`--theme-drawer-shadow-out`** (side) / **`--theme-sheet-shadow-up`** (bottom)
- **New token:** **`--theme-sheet-shadow-up`** (light + dark `:root`)

Files: `src/index.css`, `docs/mobile-theme-system.md`, `docs/implementation-log.md`,
`docs/last-change-summary.md`, `docs/project-current-state.md`

Verification: `npm run lint`, `npm run build` — passed

## 2026-03-20 - Shared theme rollout: mobile chrome + core surfaces (CSS)

Requested scope:
- Migrate **shared** mobile chrome and core surfaces from hardcoded light literals to the semantic
  token system (`--theme-*`, `--type-*`, `--mobile-*`, existing `--theme-lite-*`); improve coherence
  when `<html data-theme="dark">`; no user-facing theme toggle; no page-specific redesign; no logic,
  routes, offline, or schema changes.

Files changed:
- `src/index.css` — new tokens **`--theme-list-row-fill`**, **`--theme-list-row-border`**,
  **`--theme-control-inset-well`** (light + dark); global **`code`**, **`.empty-state`**, **`.field`**
  inputs/placeholders/readonly/focus, **`.button.secondary`**, **`.icon-button`**, **`.info-card` /
  `.record-card`** (+ success/danger variants + value colors), **`.text-*` utilities**, statement
  **table** `td`/small; **Dashboard Mobile Lite** base + **≤960px** overrides (hero, KPIs, primary KPI,
  nav shell, tabs, chips, blocks, grouped list, rows); **`.app-section-tab.active`**, **`.sidebar-panel`**
  shadow/border; mobile **`.button.secondary`** fill; **`.dashboard-mobile-lite-row-sub`** →
  **`--type-row-metadata-*`**

What was not changed:
- JSX (except docs only), Supabase, auth, print pipeline, offline queues/snapshots, routing, metrics
  meaning

Verification:
- `npm run lint` — passed
- `npm run build` — passed

Docs:
- `docs/mobile-theme-system.md` — document new tokens in category table
- `docs/implementation-log.md`, `docs/last-change-summary.md`, `docs/project-current-state.md`,
  `docs/code-map.md`

Remaining for a **full** dark rollout:
- Many **page-scoped** selectors (e.g. customer preview cards, transfer record variants) still use
  light-oriented gradients/literals; address in future page or component passes.

Suggested commit message:
- `Roll out theme tokens to shared mobile chrome and surfaces`

## 2026-03-14T21:12:21+03:00 - Phase 1 PWA shell foundation documentation baseline

Requested scope:
- Preserve project continuity for future reviews
- Inspect the current repository state
- Read required docs if present
- Create/update persistent project docs
- Reflect the already-implemented Phase 1 PWA shell foundation accurately

Files changed:
- `docs/offline-pwa-execution-plan.md`
- `docs/project-current-state.md`
- `docs/implementation-log.md`
- `docs/code-map.md`
- `docs/last-change-summary.md`

Files documenting already-implemented PWA shell work:
- `index.html`
- `src/main.jsx`
- `src/pwa/registerServiceWorker.js`
- `public/manifest.webmanifest`
- `public/sw.js`
- `public/offline.html`
- `public/icons/favicon.svg`
- `public/icons/apple-touch-icon.svg`
- `public/icons/icon-192.svg`
- `public/icons/icon-512.svg`
- `public/icons/icon-maskable.svg`

What was added:
- A project-local offline/PWA phase plan
- A concise current-state baseline
- A code map including offline/PWA responsibilities
- A latest-change summary for external review
- A persistent implementation log entry for the PWA shell phase

What was not changed:
- Business logic
- Database schema
- Supabase queries/inserts
- Routes/navigation
- Print flow
- Offline data storage
- IndexedDB
- Sync queue
- Offline mutations

Verification:
- `npm run lint` - passed
- `npm run build` - passed
- Build warning only: client chunk exceeded 500 kB after minification

Risks / notes:
- PWA icon assets are placeholders
- Service worker is intentionally limited to shell/static caching
- Offline data availability is not part of the current phase

Suggested next step:
- Replace placeholder icons with final production assets before Phase 2
- If offline work continues, implement local data foundations separately from
  shell caching

## 2026-03-14T21:26:44+03:00 - Phase 2 network and sync status UI

Requested scope:
- Implement only the next approved offline/PWA step
- Add reusable status foundations for network connectivity and sync visibility
- Keep this phase UI-only and future-ready
- Update repository documentation after implementation

Files changed:
- `src/context/NetworkProvider.jsx`
- `src/context/SyncProvider.jsx`
- `src/hooks/useNetworkStatus.js`
- `src/hooks/useSyncStatus.js`
- `src/components/ui/ConnectionBadge.jsx`
- `src/components/ui/SyncStatusBanner.jsx`
- `src/App.jsx`
- `src/components/AppShell.jsx`
- `src/index.css`
- `docs/offline-pwa-execution-plan.md`
- `docs/project-current-state.md`
- `docs/implementation-log.md`
- `docs/code-map.md`
- `docs/last-change-summary.md`

What was added:
- Shared online/offline detection provider
- Shared sync-status provider with future-ready manual state helpers
- Reusable network and sync hooks
- App-shell connection badge
- App-shell sync status banner
- Deployment notes for HTTPS, SPA fallback, and non-root base path limits

What was not changed:
- Business logic
- Database schema
- Supabase queries/inserts
- Routes/navigation
- Print flow
- IndexedDB
- Offline persistence
- Sync queue execution
- Offline mutations

Verification:
- `npm run lint` - passed
- `npm run build` - passed
- Build warning only: client chunk exceeded 500 kB after minification

Risks / notes:
- Sync status is a UI/state foundation only; no real queue exists yet
- Current service worker and manifest paths still assume root deployment
- Placeholder PWA icons are still in use

Suggested next step:
- Phase 3 should add local data foundations separately from mutation behavior

## 2026-03-14T21:39:55+03:00 - Phase 3 local data foundations for safe offline reads

Requested scope:
- Implement only the next approved offline/PWA step
- Add IndexedDB-based local persistence for selected read surfaces
- Preserve current business logic and online Supabase behavior
- Update repository docs after implementation

Files changed:
- `src/lib/offline/stores.js`
- `src/lib/offline/cacheKeys.js`
- `src/lib/offline/db.js`
- `src/lib/offline/serializers.js`
- `src/lib/offline/readCache.js`
- `src/hooks/useOfflineSnapshot.js`
- `src/components/ui/OfflineSnapshotNotice.jsx`
- `src/components/ui/SyncStatusBanner.jsx`
- `src/pages/CustomersPage.jsx`
- `src/pages/TransfersPage.jsx`
- `src/pages/CustomerDetailsPage.jsx`
- `src/pages/TransferDetailsPage.jsx`
- `docs/offline-pwa-execution-plan.md`
- `docs/project-current-state.md`
- `docs/implementation-log.md`
- `docs/code-map.md`
- `docs/last-change-summary.md`

What was added:
- Plain IndexedDB wrapper for read snapshots
- Explicit snapshot key helpers
- Snapshot record serializer with metadata
- Thin read-cache helper layer
- Per-page snapshot state hook
- Reusable cached-data notice UI
- Offline fallback for:
  - customers list
  - transfers list
  - customer details
  - transfer details
  - transfer payments history inside transfer details

What was not changed:
- Business logic
- Database schema
- Supabase queries/inserts
- Routes/navigation
- Print flow
- Offline writes
- Queue execution
- Replay/conflict handling

Verification:
- `npm run lint` - passed
- `npm run build` - passed
- Local dev HTTP smoke - passed (`STATUS=200`)
- Preview HTTP smoke - passed (`STATUS=200`)
- Build warning only: client chunk exceeded 500 kB after minification

Risks / notes:
- Offline reads are snapshot-based and can become stale
- No per-record merge or reconciliation exists yet
- Current PWA shell still assumes root-relative paths

Suggested next step:
- Phase 4 should expand offline-read UX/freshness handling only where needed,
  or begin designing a mutation queue separately without implementing it

## 2026-03-14T21:50:31.8254082+03:00 - Phase 4 freshness / staleness / offline-read UX improvements

Requested scope:
- Implement only the next approved offline/PWA step
- Improve trust and usability of the existing snapshot-backed offline-read UX
- Keep this phase read-only and future-ready
- Update repository docs after implementation

Files changed:
- `src/lib/offline/freshness.js`
- `src/components/ui/OfflineSnapshotNotice.jsx`
- `src/components/ui/SyncStatusBanner.jsx`
- `src/components/AppShell.jsx`
- `src/pages/CustomersPage.jsx`
- `src/pages/TransfersPage.jsx`
- `src/pages/CustomerDetailsPage.jsx`
- `src/pages/TransferDetailsPage.jsx`
- `src/index.css`
- `docs/offline-pwa-execution-plan.md`
- `docs/project-current-state.md`
- `docs/implementation-log.md`
- `docs/code-map.md`
- `docs/last-change-summary.md`

What was added:
- Shared snapshot freshness helpers for:
  - last-saved formatting
  - elapsed age formatting
  - conservative freshness/staleness labels
- Richer per-page cached-data notices showing:
  - live vs locally saved source
  - last locally saved time
  - snapshot-age context
- Clearer offline/no-snapshot messages for the approved cached-read pages
- Reduced status-message duplication by showing the app-shell sync banner only
  when a non-idle state needs attention

What was not changed:
- Business logic
- Database schema
- Supabase queries/inserts
- Routes/navigation
- Print flow
- Offline writes
- Queue execution
- Replay/conflict handling

Verification:
- `npm run lint` - passed
- `npm run build` - passed
- Local dev HTTP smoke - passed (`DEV_STATUS=200`)
- Preview HTTP smoke - passed (`PREVIEW_STATUS=200`)
- Build warning only: client chunk exceeded 500 kB after minification

Risks / notes:
- Freshness labels are conservative hints based on snapshot save time only
- Snapshot-backed offline reads still require a prior successful online visit
- Current PWA shell still assumes root-relative paths

Suggested next step:
- Phase 5 should add controlled offline mutations only after queue, replay, and
  conflict rules are explicitly approved

## 2026-03-14T22:28:36.2508158+03:00 - Phase 5 controlled offline mutation foundation for payment capture only

Requested scope:
- Implement only the next approved offline/PWA step
- Add the first controlled offline mutation path for payment capture only
- Keep scope limited to `TransferDetailsPage`
- Preserve business logic, schema, routes, and print behavior
- Update repository docs after implementation

Files changed:
- `src/lib/offline/stores.js`
- `src/lib/offline/queueStores.js`
- `src/lib/offline/db.js`
- `src/lib/offline/mutationIds.js`
- `src/lib/offline/mutationQueue.js`
- `src/lib/offline/paymentQueue.js`
- `src/lib/offline/replayPayments.js`
- `src/context/SyncProvider.jsx`
- `src/hooks/usePendingPayments.js`
- `src/hooks/useReplayQueue.js`
- `src/components/ui/PendingMutationNotice.jsx`
- `src/components/ui/SyncStatusBanner.jsx`
- `src/components/transfer-details/PaymentList.jsx`
- `src/pages/TransferDetailsPage.jsx`
- `src/index.css`
- `docs/offline-pwa-execution-plan.md`
- `docs/project-current-state.md`
- `docs/implementation-log.md`
- `docs/code-map.md`
- `docs/last-change-summary.md`

What was added:
- A persistent IndexedDB payment mutation queue
- Payment-only queue records with:
  - id
  - type
  - status
  - transferId
  - payload
  - retryCount
  - lastError
  - dedupeKey
- Payment-only replay logic with conservative duplicate-safe server checks
- Shared sync-provider awareness of pending/failed payment queue state
- Pending local payment hook for `TransferDetailsPage`
- Manual sync / retry action for queued payments
- Distinct UI for:
  - locally saved pending payments
  - syncing payments
  - failed replay payments

What was not changed:
- Business logic
- Database schema
- Supabase tables/contracts
- Routes/navigation
- Print flow
- Offline transfer creation
- Offline customer creation
- Broader conflict resolution

Verification:
- `npm run lint` - passed
- `npm run build` - passed
- Local dev HTTP smoke - passed (`DEV_STATUS=200`)
- Preview HTTP smoke - passed (`PREVIEW_STATUS=200`)
- Browser-level offline queue replay was not automation-tested in this environment
- Build warning only: client chunk exceeded 500 kB after minification

Risks / notes:
- Replay dedupe is conservative only and depends on matching existing payment
  fields, especially `transfer_id`, `amount_rub`, `payment_method`, `note`,
  and `paid_at`
- Successful replay resolves the local queue item by removal after server
  confirmation or duplicate detection
- Offline payment capture is still limited to `TransferDetailsPage`
- Current PWA shell still assumes root-relative paths

Suggested next step:
- Broaden offline mutations only after explicit approval for transfer/customer
  creation scope and conflict-handling rules

## 2026-03-14T22:57:46+03:00 - Phase 6 controlled offline transfer creation

Requested scope:
- Implement only the next approved offline/PWA step
- Add the second controlled offline mutation path for transfer creation only
- Keep scope limited to `NewTransferPage`
- Require customers to be already known locally before offline transfer capture
- Preserve business logic, schema, routes, and print behavior
- Update repository docs after implementation

Files changed:
- `src/lib/offline/cacheKeys.js`
- `src/lib/offline/mutationIds.js`
- `src/lib/offline/transferQueue.js`
- `src/lib/offline/replayTransfers.js`
- `src/context/SyncProvider.jsx`
- `src/hooks/usePendingTransfers.js`
- `src/hooks/useReplayQueue.js`
- `src/components/ui/SyncStatusBanner.jsx`
- `src/components/ui/PendingMutationNotice.jsx`
- `src/components/new-transfer/TransferFormSection.jsx`
- `src/components/new-transfer/TransferSubmitFeedback.jsx`
- `src/pages/NewTransferPage.jsx`
- `src/index.css`
- `docs/offline-pwa-execution-plan.md`
- `docs/project-current-state.md`
- `docs/implementation-log.md`
- `docs/code-map.md`
- `docs/last-change-summary.md`

What was added:
- A persistent IndexedDB transfer mutation queue
- Transfer-only queue records with:
  - id
  - type
  - status
  - customerId
  - payload
  - retryCount
  - lastError
  - dedupeKey
  - local-only reference metadata
- Transfer-only replay logic with conservative duplicate-safe server checks
- Shared sync-provider awareness of pending/failed transfer queue state
- Pending local transfer hook for `NewTransferPage`
- Manual sync / retry action for queued transfers
- Distinct UI for:
  - locally saved pending transfers
  - syncing transfers
  - failed replay transfers
- A reusable customer-options snapshot for known-customer offline transfer entry
- Reconnect replay ordering that sends pending transfers before pending payments

What was not changed:
- Business logic
- Database schema
- Supabase tables/contracts
- Routes/navigation
- Print flow
- Offline customer creation
- Offline transfer edit/delete
- Offline payment edit/delete
- Broader conflict resolution

Verification:
- `npm run lint` - passed
- `npm run build` - passed
- Local dev HTTP smoke - passed (`DEV_STATUS=200`)
- Preview HTTP smoke - passed (`PREVIEW_STATUS=200`)
- Browser-level offline transfer queue replay was not automation-tested in this
  environment
- Build warning only: client chunk exceeded 500 kB after minification

Risks / notes:
- Offline transfer creation is allowed only for customers already known locally
  from saved customer snapshots
- Replay dedupe is conservative only and depends on matching existing transfer
  fields, especially `customer_id`, financial amounts/rates, `status`, `notes`,
  and `created_at`
- Local pending transfer references are temporary browser-side labels only and
  are not the final server `reference_number`
- Successful replay resolves the local queue item by removal after server
  confirmation or conservative duplicate detection
- Current PWA shell still assumes root-relative paths

Suggested next step:
- Do not broaden offline mutations to customer creation or wider dependency
  handling until explicit replay-order and conflict rules are approved

## 2026-03-14T23:18:19.0826316+03:00 - Phase 7 sync refinement and dependency-aware replay polishing

Requested scope:
- Implement only the next approved offline/PWA step
- Improve replay ordering, dependency-aware processing, retry handling, and
  operator trust for the existing local transfer/payment queues
- Keep scope limited to sync refinement without adding new mutation types
- Preserve business logic, schema, routes, and print behavior
- Update repository docs after implementation

Files changed:
- `src/lib/offline/dependencyResolution.js`
- `src/lib/offline/paymentQueue.js`
- `src/lib/offline/replayPayments.js`
- `src/lib/offline/replayTransfers.js`
- `src/lib/offline/transferQueue.js`
- `src/context/SyncProvider.jsx`
- `src/hooks/usePendingPayments.js`
- `src/hooks/useReplayQueue.js`
- `src/components/ui/SyncStatusBanner.jsx`
- `src/components/ui/PendingMutationNotice.jsx`
- `src/components/transfer-details/PaymentList.jsx`
- `src/pages/TransferDetailsPage.jsx`
- `docs/offline-pwa-execution-plan.md`
- `docs/project-current-state.md`
- `docs/implementation-log.md`
- `docs/code-map.md`
- `docs/last-change-summary.md`

What was added:
- Conservative dependency-aware replay checks for queued payments
- A `blocked` queue/UI state for payments waiting on related local transfers
- Deterministic combined sync that still replays transfers before payments
- Transfer-to-payment relinking so resolved transfer replay can patch dependent
  queued payments with the confirmed server transfer id
- Shared sync-banner and pending-notice wording for blocked / retry-needed
  states
- Transfer details UI support for blocked local payments and clearer replay
  outcomes

What was not changed:
- Business logic
- Database schema
- Supabase tables/contracts
- Routes/navigation
- Print flow
- Offline customer creation
- Offline edit/delete flows
- Broad conflict resolution

Verification:
- `npm run lint` - passed
- `npm run build` - passed
- Local dev HTTP smoke - passed (`DEV_STATUS=200`)
- Preview HTTP smoke - passed (`PREVIEW_STATUS=200`)
- Browser-level mixed transfer/payment queue replay was not automation-tested
  end-to-end in this environment
- Build warning only: client chunk exceeded 500 kB after minification

Risks / notes:
- Dependency-aware replay is conservative only and currently covers
  payment-on-transfer relationships
- Duplicate-safe checks still rely on matching existing server fields and do
  not replace full conflict resolution
- Automatic reconnect replay still avoids blocked-only retry loops by running
  only when true pending work exists
- Current PWA shell still assumes root-relative paths

Suggested next step:
- Only broaden offline behavior after explicit approval for either offline
  customer creation or deeper reconciliation/conflict rules for existing queues

## 2026-03-14T23:37:48.5042643+03:00 - Phase 8 iPhone QA pass and deployment readiness hardening

Requested scope:
- Implement only the next approved step
- Review and harden current PWA/deployment correctness for iPhone/Safari/Home
  Screen usage and static hosting
- Add formal in-repo QA/deployment checklist artifacts
- Preserve business logic, schema, routes, print flow, and current offline
  scope

Files changed:
- `public/manifest.webmanifest`
- `public/sw.js`
- `public/offline.html`
- `public/icons/apple-touch-icon-180.png`
- `public/icons/icon-192.png`
- `public/icons/icon-512.png`
- `public/icons/icon-maskable-512.png`
- `src/pwa/registerServiceWorker.js`
- `index.html`
- `docs/offline-pwa-execution-plan.md`
- `docs/project-current-state.md`
- `docs/implementation-log.md`
- `docs/code-map.md`
- `docs/last-change-summary.md`
- `docs/iphone-qa-checklist.md`
- `docs/deployment-readiness-checklist.md`
- `docs/manual-test-matrix.md`

What was added:
- Relative/base-safe manifest URLs for `id`, `start_url`, `scope`, and icons
- Scope-aware service worker registration using `import.meta.env.BASE_URL`
- Scope-aware service worker precache/fallback path handling
- PNG placeholder icons suitable for iPhone/Home Screen install flows
- Relative offline fallback reopen path
- Manual QA and deployment checklist documents with pass/fail placeholders

What was not changed:
- Business logic
- Database schema
- Supabase tables/contracts
- Routes/navigation
- Print flow
- Offline customer creation
- New offline mutation types
- Broader conflict resolution

Verification:
- `npm run lint` - passed
- `npm run build` - passed
- Local dev HTTP smoke - passed (`DEV_STATUS=200`)
- Preview HTTP smoke - passed (`PREVIEW_STATUS=200`)
- Static preview asset checks for `/manifest.webmanifest`, `/sw.js`, and
  `/offline.html` are still recommended as part of manual deployment review
- Build warning only: client chunk exceeded 500 kB after minification

Risks / notes:
- Real iPhone testing was not possible from this environment and remains
  required
- Placeholder PNG icons improve install readiness but are not final production
  artwork
- Non-root deployment is safer than before but still requires matching Vite
  `base` configuration and host SPA fallback rules

Suggested next step:
- Execute the new iPhone and deployment checklists on a real staging/production
  deployment before broad rollout

## 2026-03-15T01:40:58.6693317+03:00 - Phase 9 iPhone/Safari offline fallback loading bugfix pass

Requested scope:
- Implement only a tightly scoped bugfix pass for snapshot-backed offline-read
  screens
- Stop approved offline-read pages from remaining indefinitely in loading on
  iPhone Safari when offline
- Keep changes minimal, surgical, and bugfix-only
- Preserve business logic, schema, routes, print flow, queue behavior, and
  current offline feature scope

Files changed:
- `src/lib/offline/db.js`
- `src/lib/offline/readCache.js`
- `src/pages/CustomersPage.jsx`
- `src/pages/TransfersPage.jsx`
- `src/pages/CustomerDetailsPage.jsx`
- `src/pages/TransferDetailsPage.jsx`
- `src/pages/NewTransferPage.jsx`
- `docs/offline-pwa-execution-plan.md`
- `docs/project-current-state.md`
- `docs/implementation-log.md`
- `docs/code-map.md`
- `docs/last-change-summary.md`
- `docs/iphone-qa-checklist.md`
- `docs/manual-test-matrix.md`

What was added:
- Timeout protection for IndexedDB open/read operations used by snapshot-backed
  read screens
- Conservative live-read timeout helpers and likely-offline failure detection
- Page-level fallback orchestration so approved screens now try local snapshots
  before surfacing a final error when live reads time out or fail offline-like
- Clear deterministic exit paths from loading for:
  - `CustomersPage`
  - `TransfersPage`
  - `CustomerDetailsPage`
  - `TransferDetailsPage`
  - `NewTransferPage` customer-options lookup
- Updated manual iPhone/browser test docs to explicitly check for “not stuck in
  loading” behavior

What was not changed:
- Business logic
- Database schema
- Supabase tables/contracts
- Routes/navigation
- Print flow
- Offline customer creation
- New offline mutation types
- Queue/replay architecture
- Broader conflict resolution

Verification:
- `npm run lint` - passed
- `npm run build` - passed
- Preview HTTP smoke - passed (`PREVIEW_ROOT_STATUS=200`, `PREVIEW_CUSTOMERS_STATUS=200`)
- Build warning only: client chunk exceeded 500 kB after minification

Risks / notes:
- Physical iPhone Safari validation was not possible from this environment and
  remains required
- Timeout-based fallback hardening is conservative and designed to prevent
  indefinite loading, not to guarantee perfect network-state detection on every
  browser edge case
- The fix intentionally targets only the approved snapshot-backed read pages
  and does not broaden offline scope

Suggested next step:
- Re-run the updated offline-read scenarios from `docs/iphone-qa-checklist.md`
  and `docs/manual-test-matrix.md` on a real iPhone Safari deployment

## 2026-03-15T02:34:03.5181653+03:00 - Phase 10 expanded offline read coverage for remaining major read-only operator surfaces

Requested scope:
- Implement only the next approved step
- Expand snapshot-backed offline reads to the remaining major read-only
  operator surfaces
- Focus first on `DashboardPage` and dashboard drill-down support
- Preserve business logic, schema, routes, print flow, and offline mutation
  scope

Files changed:
- `src/lib/offline/cacheKeys.js`
- `src/pages/DashboardPage.jsx`
- `docs/offline-pwa-execution-plan.md`
- `docs/project-current-state.md`
- `docs/implementation-log.md`
- `docs/code-map.md`
- `docs/last-change-summary.md`
- `docs/iphone-qa-checklist.md`
- `docs/manual-test-matrix.md`
- `docs/deployment-readiness-checklist.md`

What was added:
- A dedicated dashboard snapshot key
- Snapshot save/load behavior for `DashboardPage`
- Offline fallback for dashboard summary cards, attention/work queue sections,
  recent activity sections, and dashboard drill-down inputs
- Shared cached-data notice visibility on the dashboard
- Documentation updates so manual QA now includes dashboard and dashboard
  drill-down offline scenarios

What was not changed:
- Business logic
- Database schema
- Supabase tables/contracts
- Routes/navigation
- Print flow
- Offline customer creation
- Offline customer edit/delete
- Offline transfer edit/delete
- Offline payment edit/delete
- Broader conflict resolution

Verification:
- `npm run lint` - passed
- `npm run build` - passed
- Preview HTTP smoke - passed (`PREVIEW_ROOT_STATUS=200`,
  `PREVIEW_DASHBOARD_STATUS=200`)
- Build warning only: client chunk exceeded 500 kB after minification

Risks / notes:
- Physical iPhone retesting was not possible from this environment and remains
  required
- Dashboard drill-down offline support depends on a previously saved dashboard
  snapshot; no fake metrics are generated offline
- This phase intentionally did not broaden offline writes or edit/delete
  behavior

Suggested next step:
- Re-run the updated iPhone and manual offline-read scenarios for the dashboard
  and its drill-down sheets on the staging deployment

## 2026-03-15T02:53:07.8441555+03:00 - Phase 11 controlled offline customer creation

Requested scope:
- Implement only the next approved step
- Add controlled offline customer creation support
- Keep scope limited to `CustomersPage` and the minimal shared queue/replay
  surfaces required to support `customer_create`
- Preserve business logic, schema, routes, print flow, and existing offline
  read/payment/transfer behavior

Files changed:
- `src/lib/offline/mutationIds.js`
- `src/lib/offline/customerQueue.js`
- `src/lib/offline/replayCustomers.js`
- `src/hooks/usePendingCustomers.js`
- `src/context/SyncProvider.jsx`
- `src/hooks/useReplayQueue.js`
- `src/components/ui/SyncStatusBanner.jsx`
- `src/components/ui/PendingMutationNotice.jsx`
- `src/components/customers/CustomersFormSection.jsx`
- `src/pages/CustomersPage.jsx`
- `docs/offline-pwa-execution-plan.md`
- `docs/project-current-state.md`
- `docs/implementation-log.md`
- `docs/code-map.md`
- `docs/last-change-summary.md`
- `docs/iphone-qa-checklist.md`
- `docs/manual-test-matrix.md`
- `docs/deployment-readiness-checklist.md`

What was added:
- A persistent IndexedDB customer mutation queue
- Customer-only replay logic with conservative duplicate-safe checks
- Shared sync-provider awareness of queued customer items
- Pending local customer hook for `CustomersPage`
- Manual sync / retry action for queued customers
- Distinct UI for:
  - locally saved pending customers
  - syncing local customers
  - failed customer replay items
- Offline customer creation form messaging that clearly states local-only and
  unsynced customer limits

What was not changed:
- Business logic
- Database schema
- Supabase tables/contracts
- Routes/navigation
- Print flow
- Offline customer edit/delete
- Offline transfer edit/delete
- Offline payment edit/delete
- Broader conflict resolution

Verification:
- `npm run lint` - passed
- `npm run build` - passed
- Preview HTTP smoke - passed (`PREVIEW_ROOT_STATUS=200`,
  `PREVIEW_CUSTOMERS_STATUS=200`)
- Build warning only: client chunk exceeded 500 kB after minification

Risks / notes:
- Physical iPhone retesting was not possible from this environment and remains
  required
- Customer duplicate protection is conservative only and is strongest when an
  exact `full_name + phone` match exists on the server
- Offline-created local customers remain separate from confirmed server
  customer files until replay succeeds and the page refreshes live data
- Offline-created local customers are not yet available as valid inputs for new
  offline transfer creation before sync

Suggested next step:
- Re-run the updated staging/iPhone queue and replay scenarios for
  `CustomersPage`, especially offline save + reconnect replay + manual retry

## 2026-03-15T03:35:01.7815914+03:00 - Phase 12 TransferDetails offline snapshot completeness bugfix

Requested scope:
- Implement only a tightly scoped bugfix pass for `TransferDetailsPage`
- Fix incomplete/unreliable offline snapshot behavior for transfer details and
  payment history after prior online usage
- Preserve business logic, schema, routes, print flow, queue behavior, and
  current offline feature scope

Files changed:
- `src/pages/TransferDetailsPage.jsx`
- `docs/offline-pwa-execution-plan.md`
- `docs/project-current-state.md`
- `docs/implementation-log.md`
- `docs/code-map.md`
- `docs/last-change-summary.md`
- `docs/iphone-qa-checklist.md`
- `docs/manual-test-matrix.md`
- `docs/deployment-readiness-checklist.md`

What was added:
- Independent snapshot persistence for:
  - transfer details/context
  - customer name context
  - payment history
- Merge-style snapshot writes so later payment-history saves do not erase an
  already-saved transfer snapshot, and vice versa
- Explicit availability markers inside the transfer-details snapshot record so
  offline restore no longer assumes transfer and payments are always saved
  together
- Partial offline-state handling for `TransferDetailsPage` so transfer context
  can still render when payment history is missing locally
- Conservative UI copy that avoids treating missing confirmed payment history as
  if zero payments existed

What was not changed:
- Business logic
- Database schema
- Supabase tables/contracts
- Routes/navigation
- Print flow
- Offline customer edit/delete
- Offline transfer edit/delete
- Offline payment edit/delete
- Broader conflict resolution

Verification:
- `npm run lint` - passed
- `npm run build` - passed
- Preview HTTP smoke - passed (`PREVIEW_ROOT_STATUS=200`,
  `PREVIEW_TRANSFER_DETAILS_STATUS=200`)
- Build warning only: client chunk exceeded 500 kB after minification

Risks / notes:
- Physical iPhone retesting was not possible from this environment and remains
  required
- Existing older transfer-details snapshots without the new per-piece markers
  still fall back conservatively using the presence of saved `transfer` and/or
  `payments` data
- If only the transfer snapshot is available locally, confirmed paid/remaining
  totals now stay incomplete instead of faking a zero-payment state

Suggested next step:
- Re-run the staging/iPhone `TransferDetailsPage` scenarios specifically for:
  prior online visit -> offline reopen, missing payment-history snapshot,
  partial offline restore, and pending local payments remaining visually
  separate from confirmed payment history

## 2026-03-15T04:23:44.9523142+03:00 - CustomersPage sectioned navigation reorganization

Requested scope:
- Implement only the first page-organization phase
- Reorganize `CustomersPage` into clearer internal sections without changing
  business logic, routes, print flow, or offline queue behavior
- Preserve customer creation, offline customer capture, pending/failed local
  customer visibility, manual replay, search/list behavior, and drill-down
  entry points

Files changed:
- `src/pages/CustomersPage.jsx`
- `src/index.css`
- `docs/project-current-state.md`
- `docs/implementation-log.md`
- `docs/code-map.md`
- `docs/last-change-summary.md`
- `docs/manual-test-matrix.md`
- `docs/iphone-qa-checklist.md`

What was added:
- Page-internal section navigation for `CustomersPage`
- Four sections inside the existing `/customers` route:
  - Customers
  - Portfolio Summary
  - Needs Attention
  - Recent Activity
- A compact sticky section bar for mobile and a clear segmented section row for
  desktop within the page itself
- A small cross-section notice that keeps pending/failed local customer state
  visible even when the operator is viewing another section

What was not changed:
- Business logic
- Database schema
- Supabase tables/contracts
- Routes/navigation contracts
- Print flow
- Offline customer queue/replay behavior
- Offline transfer/payment behavior
- Dashboard organization

Verification:
- `npm run lint` - passed
- `npm run build` - passed
- Preview HTTP smoke - passed (`PREVIEW_CUSTOMERS_STATUS=200`)
- Build warning only: client chunk exceeded 500 kB after minification

Risks / notes:
- Physical iPhone retesting was not possible from this environment and remains
  required
- `CustomersPage` now shows one primary section at a time, which reduces crowding
  but leaves wider dashboard-level page organization work for later
- Dashboard reorganization remains deferred for a future page-organization pass

Suggested next step:
- If page organization continues, apply the next scoped reorganization pass to
  the dashboard without changing its business logic or offline-read behavior

## 2026-03-15T04:34:37.0490047+03:00 - CustomersPage mobile section navigation UX correction

Requested scope:
- Implement only a tightly scoped bugfix / UX correction pass
- Keep the existing CustomersPage internal section model
- Correct the mobile section navigation so it is clear, thumb-friendly, and
  genuinely mobile-usable
- Preserve customer business logic, offline customer creation, pending/failed
  local visibility, manual replay, and drill-down behavior

Files changed:
- `src/pages/CustomersPage.jsx`
- `src/index.css`
- `docs/project-current-state.md`
- `docs/implementation-log.md`
- `docs/code-map.md`
- `docs/last-change-summary.md`
- `docs/manual-test-matrix.md`
- `docs/iphone-qa-checklist.md`

What was changed:
- CustomersPage mobile section labels were shortened to:
  - `العملاء`
  - `المحفظة`
  - `متابعة`
  - `النشاط`
- Mobile navigation was corrected from a scrollable card-like row into a
  clearer four-tab bar with larger tap targets
- Desktop section navigation remained a page-level segmented row
- One primary section at a time is still shown on mobile

What was not changed:
- Business logic
- Database schema
- Supabase tables/contracts
- Routes/navigation contracts
- Print flow
- Offline customer queue/replay behavior
- Offline transfer/payment behavior
- Other page reorganizations

Verification:
- `npm run lint` - passed
- `npm run build` - passed
- Preview HTTP smoke - passed (`PREVIEW_CUSTOMERS_STATUS=200`)
- Build warning only: client chunk exceeded 500 kB after minification

Risks / notes:
- Physical iPhone retesting was not possible from this environment and remains
  required
- This pass corrects navigation usability only; it does not broaden product
  scope or reorganize other pages

Suggested next step:
- Re-test `CustomersPage` on mobile/iPhone specifically for fast section
  switching and pending local-customer visibility before moving to another page


## 2026-03-15T04:56:45.7367011+03:00 - TransferDetailsPage sectioned navigation reorganization

Requested scope:
- Implement only the next page-organization phase
- Reorganize `TransferDetailsPage` into clearer internal sections without changing
  business logic, routes, print flow, or offline payment queue behavior
- Preserve online/offline payment capture, pending/blocked/failed local payment
  visibility, manual replay, partial offline snapshot behavior, and print
  statement access

Files changed:
- `src/pages/TransferDetailsPage.jsx`
- `src/components/transfer-details/PrintStatement.jsx`
- `src/index.css`
- `docs/project-current-state.md`
- `docs/implementation-log.md`
- `docs/code-map.md`
- `docs/last-change-summary.md`
- `docs/manual-test-matrix.md`
- `docs/iphone-qa-checklist.md`

What was added:
- Page-internal section navigation for `TransferDetailsPage`
- Four sections inside the existing `/transfers/:transferId` route:
  - Summary
  - Payments
  - Payment History
  - Print
- A compact sticky mobile tab bar with short Arabic labels and a desktop
  segmented row inside the page
- Screen-only section visibility so the print statement remains in the DOM for
  printing while other sections stay easier to operate on mobile
- A small cross-section status notice so hidden local payment attention states
  are not easy to miss when the operator is viewing Summary or Print

What was not changed:
- Business logic
- Database schema
- Supabase tables/contracts
- Routes/navigation contracts
- Print flow
- Offline payment queue/replay behavior
- Offline snapshot behavior
- Other page reorganizations

Verification:
- `npm run lint` - passed
- `npm run build` - passed
- Preview HTTP smoke - not run from this environment (background preview process was blocked by command policy)

Risks / notes:
- Physical iPhone retesting was not possible from this environment and remains
  required
- This pass reorganizes `TransferDetailsPage` only; it does not change dashboard
  or customer-detail organization

Suggested next step:
- Re-test `TransferDetailsPage` on mobile/iPhone for section switching comfort,
  payment-entry accessibility, history readability, and print-section clarity
  before reorganizing another page

## 2026-03-15T05:08:35.8552157+03:00 - TransferDetailsPage Arabic copy restoration bugfix

Requested scope:
- Implement only a tightly scoped bugfix pass
- Restore corrupted Arabic UI copy inside `TransferDetailsPage` after the recent
  sectioned-navigation reorganization
- Preserve business logic, section layout, offline payment behavior, replay
  behavior, snapshot behavior, and print flow

Files changed:
- `src/pages/TransferDetailsPage.jsx`
- `docs/project-current-state.md`
- `docs/implementation-log.md`
- `docs/code-map.md`
- `docs/last-change-summary.md`
- `docs/iphone-qa-checklist.md`

What was fixed:
- Restored all question-mark placeholder strings in the sectioned
  `TransferDetailsPage` workspace
- Recovered original Arabic titles and descriptions for the summary, balance,
  payment entry, history, secondary details, and lock sections
- Restored proper Arabic inline warning/help copy for partial snapshot and lock
  state messages
- Preserved the current sectioned layout and page-level navigation behavior

What was not changed:
- Business logic
- Database schema
- Supabase tables/contracts
- Routes/navigation contracts
- Print flow
- Offline payment queue/replay behavior
- Offline snapshot behavior
- Other page reorganizations

Verification:
- `npm run lint` - passed
- `npm run build` - passed
- Preview HTTP smoke - not run from this environment

Risks / notes:
- Physical iPhone retesting was not possible from this environment and remains
  required
- This pass restores Arabic copy only; it does not broaden or roll back the
  sectioned `TransferDetailsPage` layout

Suggested next step:
- Re-test `TransferDetailsPage` on staging/iPhone specifically for Arabic copy
  correctness, section switching, and preserved payment/print behavior

## 2026-03-15T05:20:00+03:00 - Phase 1 AppShell mobile transformation

Requested scope:
- Implement only the first phase of the mobile app-like UI shell transformation
- Make the global shell feel more like a focused mobile app on iPhone
- Keep changes conservative, CSS/layout-focused, and shell-only
- Preserve business logic, schema, routes, offline behavior, and page internals

Files changed:
- `src/index.css`
- `docs/implementation-log.md`
- `docs/last-change-summary.md`

What was changed:
- Tightened the mobile top bar spacing:
  - Reduced vertical padding and gap on `.topbar` for small widths
  - Kept the same content (page title, system name, connection badge, user info) but with less vertical bulk
- Improved mobile global frame and safe-area handling:
  - Updated `.page-content` mobile padding to include `env(safe-area-inset-bottom)` so the main content sits visually above the bottom nav and iPhone home indicator
- Refined bottom navigation for a more app-like feel:
  - Kept the same four destinations and icons
  - Increased bottom-safe-area padding and overall bottom-nav padding for thumb comfort
  - Slightly increased label size and spacing between icon and label
  - Strengthened the active state to use a full brand gradient background and white text, making the current section clearer
  - Adjusted box shadow and blur on `.bottom-nav` to feel more like a mobile dock
- Added minor mobile-only refinements for small screens so the shell feels tighter and more intentional without touching page content

What was not changed:
- Business logic
- Database schema
- Supabase queries/inserts
- Routes/navigation contracts (including bottom-nav destinations)
- Auth/session behavior
- Print flow
- Offline snapshot behavior and queue/replay semantics
- Any page-level business logic or calculations

Verification:
- `npm run lint` - passed
- `npm run build` - passed
- Existing build-size warning remains: main client bundle exceeds 500 kB after minification

Risks / notes:
- Changes are layout-only and scoped to the shell/topbar/bottom-nav CSS; no JS logic was altered
- Real iPhone testing is still required to validate:
  - visual comfort of the new top bar
  - safe-area padding around the bottom navigation
  - perceived “app-like” feel for bottom nav interactions
- Desktop styles were intentionally left functionally unchanged except for inheriting the slightly leaner topbar on narrow widths

Suggested next step:
- Execute a focused iPhone/mobile QA pass for:
  - top bar readability and compactness
  - bottom navigation thumb reach and active-state clarity
  - safe-area behavior around the home indicator
  - preservation of connection/sync banner meaning and visibility

## 2026-03-20T00:00:00+03:00 - Phase 0 mobile UI transformation baseline freeze

Requested scope:
- Baseline freeze and current-state confirmation only (per
  `docs/usdt-mobile-app-like-ui-plan.md` Phase 0)
- No UI, route, logic, or refactor changes

Files changed:
- `docs/project-current-state.md`
- `docs/code-map.md`
- `docs/implementation-log.md`
- `docs/last-change-summary.md`

What was added:
- Documented frozen baseline: branch expectation, clean working tree before next
  work, list of pages that already use internal section navigation
- Clarified `TransfersPage` ships a stable two-section in-page model (summary vs
  queue) using shared section CSS patterns — not treated as in-progress Phase 3
- Recorded that **mobile shell Phase 1** is already present in `src/index.css`
  (top bar, page frame, safe areas, bottom nav, status strip spacing)
- Stated next planned implementation step: **Phase 2 unified mobile section
  navigation system**

What was not changed:
- Application source (`src/**`), routes, business logic, offline behavior, or
  print flow

Verification:
- `git status` / `git diff --name-only` - docs-only changes for this Phase 0 pass
  (no `src/**` edits)
- `npm run lint` - passed
- `npm run build` - passed

Suggested next step:
- Begin **Phase 2** only when explicitly approved: unify section navigation
  presentation across sectioned pages without changing route contracts

## 2026-03-21T12:00:00+03:00 - Phase 1 AppShell mobile transformation (refresh pass)

Requested scope:
- Mobile app-like shell only: top bar, page frame, safe areas, bottom nav, global
  sync/connection presentation, mobile rhythm
- CSS-first; preserve routes, nav meaning, auth, data/offline/print semantics

Files changed:
- `src/index.css`
- `docs/code-map.md`
- `docs/implementation-log.md`
- `docs/last-change-summary.md`
- `docs/project-current-state.md`

What was changed:
- **Content shell grid:** `content-shell` now uses `grid-template-rows: auto auto 1fr`
  so the top bar, sync strip, and main column stack predictably (main absorbs
  remaining height; `min-height: 0` on shell + main for safer grid overflow)
- **Mobile top bar (≤960px):** safe-area padding on top and horizontal edges;
  slightly cleaner background/border; **title-first** — hide topbar page eyebrow
  and long route description on phone to reduce “web dashboard” framing
- **Connection badge (in topbar, mobile):** flatter, lighter chip (no drop shadow,
  softer border/background)
- **Sync strip (mobile):** tighter spacing, no banner shadow, softer border when
  the shell sync banner is visible
- **Page frame:** horizontal padding respects safe-area insets; increased bottom
  padding to clear the **floating** bottom nav + home indicator
- **Bottom navigation (≤960px):** inset “dock” bar with rounded container,
  stronger blur, subtle inner highlight, active tab shadow; safe-area handled on
  `bottom` + `inset-inline`; slight active press feedback (`:active`)
- **≤540px:** restored bottom **content** padding to include
  `env(safe-area-inset-bottom)` (was a fixed `4.8rem` only); dock tightened to
  match smaller widths

What was not changed:
- `src/components/AppShell.jsx` and other React shell markup (paths remain under
  `src/components/`)
- Route definitions, `navigation` targets/labels, auth, business logic, print,
  offline snapshot/queue/replay behavior, page components (e.g. `TransfersPage`)

Verification:
- `npm run lint` - passed
- `npm run build` - passed
- Build chunk-size warning unchanged (>500 kB main bundle)

Suggested next step:
- Manual iPhone QA (see `docs/last-change-summary.md`), then proceed to **Phase 2**
  when approved

## 2026-03-21T18:00:00+03:00 - Phase 2 Unified mobile section navigation system

Requested scope:
- One shared visual + interaction pattern for internal section navigation on
  Customers, Customer details, Transfers list, and Transfer details
- CSS-first unification; no route or business-logic changes

Files changed:
- `src/index.css`
- `src/pages/CustomersPage.jsx`
- `src/pages/CustomerDetailsPage.jsx`
- `src/pages/TransfersPage.jsx`
- `src/pages/TransferDetailsPage.jsx`
- `docs/implementation-log.md`
- `docs/last-change-summary.md`
- `docs/project-current-state.md`
- `docs/code-map.md`

What was added:
- Canonical **`app-section-*`** class family replacing duplicated
  `customers-section-*`, `customer-details-section-*`, and
  `transfer-details-section-*` nav/workspace/panel rules
- **`app-section-tab--row`** (label + optional count) vs **`--stack`** (centered
  two-line segment for transfer details)
- **`app-section-nav--two`** for `TransfersPage` two-column bar
- Unified sticky offsets, nav chrome (blur/radius/gap), count badge tones, panel
  show/hide, `focus-visible`, and consolidated **≤960px / ≤540px** compact rules
- **≤960px:** single active treatment (brand gradient fill + white label) for
  all section tabs; row tabs hide description + count; stack tabs stay readable
- `TransferDetailsPage` section buttons now wrap copy in `app-section-tab-copy`
  for typography parity with row tabs

What was not changed:
- Routes, auth, Supabase, offline snapshots/queues/replay/sync, print flow,
  filtering/sorting semantics, section *keys* or page data flow
- Semantic SectionCard modifier classes (e.g. `transfer-details-summary-section`)
- `transfer-details-print-section` print behavior

Verification:
- `npm run lint` - passed
- `npm run build` - passed
- Build chunk-size warning unchanged

Suggested next step:
- Manual mobile QA on all four pages; then **Phase 3** (`TransfersPage`
  mobile-first polish) when approved

## 2026-03-21T22:30:00+03:00 - Phase 3 TransfersPage mobile-first polish

Requested scope:
- Presentation-only polish for `/transfers` as a mobile operational queue
- Preserve all filter semantics, offline snapshot reads, grouping, and routes

Files changed:
- `src/hooks/useTransfersQueueCompactCards.js` (new; `matchMedia('(max-width: 720px)')` +
  `useSyncExternalStore` for hydration-safe subscribe)
- `src/components/transfers/TransfersHeader.jsx` — `className="transfers-queue-page-header"`
- `src/components/transfers/TransfersFilterBar.jsx` — `transfers-queue-filter-bar` on `FilterBar`
- `src/components/transfers/TransfersList.jsx` — wires compact hook into groups
- `src/components/transfers/TransferQueueGroup.jsx` — optional `compactCards` → `TransferRecordCard`
- `src/index.css` — scoped rules under `.transfers-queue-page` (header, filters, notes,
  summary/group chrome); ≤960px transfers-only section **count** visibility override +
  active-tab count contrast; extended operations-sheet **mobile-priority** card rules to
  queue cards with **transfers-specific** follow-up note (no line-clamp)
- `docs/implementation-log.md`, `docs/last-change-summary.md`, `docs/project-current-state.md`,
  `docs/code-map.md`

What was added:
- Compact **page hero** on narrow widths (hide long framing copy; tighter title; action grid)
- App-like **filter strip** (panel + responsive grid; lighter field chrome)
- **Compact transfer cards** only when viewport ≤720px; desktop unchanged
- Faster scan: hide duplicate queue scope note in summary panel on phone; hide metric
  footers and group blurbs in-queue scope; show section tab counts on Transfers despite
  global ≤960px row-tab compact rule

What was not changed:
- `TransfersPage.jsx` business logic, Supabase queries, filter state, `queueGroups` rules,
  snapshot keys, or navigation contracts
- Print flow, auth, offline queues, replay ordering, sync semantics, calculations

Verification:
- `npm run lint` - passed
- `npm run build` - passed
- Build chunk-size warning unchanged

Suggested next step:
- Manual iPhone QA on Transfers (see `docs/last-change-summary.md`); then **Phase 4**
  Dashboard mobile prioritization when approved

## 2026-03-22T12:00:00+03:00 - Phase 4 Dashboard Lite mobile rework (presentation)

Requested scope:
- Replace stacked mobile dashboard blocks with a single “operational home” pattern:
  compact header, KPI strip, internal tabs, **one active panel** at a time
- Keep all `DashboardPage` data loading, drill-down configs, snapshots, and href
  builders unchanged; **no** route or business-logic edits

Files changed:
- `src/hooks/useDashboardMobileLiteLayout.js` (new; `matchMedia('(max-width: 960px)')` +
  `useSyncExternalStore`)
- `src/components/dashboard/DashboardMobileLite.jsx` (new; mobile-only UI shell)
- `src/pages/DashboardPage.jsx` — branch: mobile → `DashboardMobileLite`, else existing
  desktop stack (unchanged section components)
- `src/index.css` — `dashboard-mobile-lite*` presentation rules + compact offline strip
- `docs/implementation-log.md`, `docs/last-change-summary.md`, `docs/project-current-state.md`,
  `docs/code-map.md`

What was added:
- **Mobile ≤960px:** dedicated layout with **المتابعة / الإجراءات / النشاط** tabs; each panel
  shows condensed lists (caps on preview rows); headline KPIs reuse existing
  `headlineCards` (today / remaining / overpayment); drill-down + `OperationsDrillDownSheet`
  unchanged
- **Desktop:** prior full dashboard sections remain as before

What was not changed:
- Supabase reads, stats derivation, `drillDownConfigs`, snapshot keys, `buildTransfersQueueHref`
- Print, auth, offline queues/replay/sync semantics

Verification:
- `npm run lint` - passed
- `npm run build` - passed
- Build chunk-size warning unchanged

Suggested next step:
- Manual iPhone QA on Dashboard Lite; then **Phase 5** CustomerDetailsPage when approved

## 2026-03-22T14:30:00+03:00 - iPhone visual system pass (mobile shell + surfaces)

Requested scope:
- Mobile-only presentation: reduce “responsive website” feel; align top bar, bottom nav,
  drawer, and shared surfaces with a calmer, more **native-like** iPhone app language
- No business logic, routes, auth, offline, or schema changes

Files changed:
- `src/index.css` — within `@media (max-width: 960px)` (and minor ≤540 bottom-nav tweaks):
  mobile CSS variables; body canvas; topbar; connection badge; menu `icon-button`; drawer
  backdrop + sidebar panel + nav rows + footer; bottom tab bar + active/inactive states;
  `app-section-nav` / `app-section-tab` (tint selection vs gradient pill); transfers active
  count chip; sync strip; record/info cards, fields, buttons; operational chips; Dashboard
  Mobile Lite material overrides
- `docs/implementation-log.md`, `docs/last-change-summary.md`, `docs/project-current-state.md`,
  `docs/code-map.md`

What was added:
- **Hairline borders** (`--mobile-hairline`), **quaternary fills**, softer shadows
- **Frosted** bars (saturate + blur) with lighter elevation
- **Tint-based** selection for tabs and bottom nav (operational, not decorative gradients)

What was not changed:
- `AppShell.jsx` markup or navigation config
- Desktop **>960px** base styles (except inherited token usage where cascade applies only in
  mobile block for overridden rules)

Verification:
- `npm run lint` - passed
- `npm run build` - passed

Suggested next step:
- Manual iPhone QA on shell + key flows; then continue plan-driven page work when approved

## 2026-03-20T12:00:00+03:00 - Mobile chrome and grouped-list refinement pass

Requested scope:
- Mobile-only (≤960px): push shell + Dashboard Lite closer to a modern iPhone **operations** app
- Refine top bar, bottom tab bar, drawer, KPI density, list row language, grouped surfaces
- No business logic, routes, auth, offline, schema, print, or Phase 5 CustomerDetails work

Files changed:
- `src/index.css` — `@media (max-width: 960px)` / `720px` / `540px` adjustments: topbar materials +
  connection; hide `.topbar-user` on ≤960; bottom nav **full-bleed** + active indicator; drawer **inset
  sheet** + scroll mid + hide `.nav-link-note` + compact footer; Dashboard Lite KPI grid, tabs,
  blocks, grouped list hairlines; `720` topbar `.connection-badge` scoped to `.topbar`
- `src/components/dashboard/DashboardMobileLite.jsx` — add `dashboard-mobile-lite-list--grouped` to
  preview list roots (presentational)
- `docs/implementation-log.md`, `docs/last-change-summary.md`, `docs/project-current-state.md`,
  `docs/code-map.md`

What was added:
- **Top bar:** softer bar, subtler separator; calmer one-line connection in header
- **Tab bar:** system-like full-width bar, active **dot** + typography (no docked pill per tab)
- **Drawer:** floating sheet geometry, simpler nav rows, smaller account region copy
- **Lite KPIs:** three-across operational strip, reduced vertical waste
- **Lite lists:** grouped inset list surface replacing per-row card boxes

What was not changed:
- `AppShell.jsx` markup / navigation config / route targets
- Data, drill-downs, offline queues, sync, calculations
- Desktop **>960px** presentation (aside from shared class names on DOM only when Lite mounts)

Verification:
- `npm run lint` - passed
- `npm run build` - passed

Suggested next step:
- Manual QA on iPhone/notch devices for tab bar safe-area + drawer height; then plan Phase 5 when
  approved

## 2026-03-20T18:00:00+03:00 - Payvo-inspired fintech mobile theme pass

Requested scope:
- Mobile-only visual system (≤960px / 720px refinements): premium banking / wallet mood per plan
- Tokens, shell (top bar, floating tab bar, drawer), shared surfaces, Dashboard Lite, lists/cards,
  segmented controls, primary CTA — **no** logic, routes, auth, offline, schema, print

Files changed:
- `src/index.css` — viewport-scoped mobile tokens (`--mobile-canvas-*`, `--mobile-surface-*`,
  `--mobile-tab-*`, `--mobile-ink-*`, deeper `--brand-secondary` override ≤960); canvas gradient
  body; frosted top bar + connection; **floating** pill tab bar with inset safe-area; drawer sheet
  (scrim, panel border, footer gradient); `app-section-*` segmented bar (glass, iOS-like active
  pill); calmer sync strip; page heroes without decorative `::after`; cards/record rows borderless
  glass surfaces; transfers filter panel; tighter `record-list` gap; vertical primary button
  gradient; Dashboard Lite KPI/tab/block/list harmonization with tokens; `720` tab bar density
- `src/components/AppShell.jsx` — hide sidebar section label on mobile (`desktop-only` on
  “الأقسام الرئيسية”) for cleaner menu grouping
- `docs/implementation-log.md`, `docs/last-change-summary.md`, `docs/project-current-state.md`,
  `docs/code-map.md`

What was added:
- Coherent **fintech mobile token** layer and deeper navy secondary on phone only
- **Native-like** floating bottom navigation + increased `page-content` bottom padding
- **Premium sheet** drawer (blur, inner highlight, calmer account footer)
- **Unified** glass surfaces across section tabs, cards, filters, sync, Lite home

What was not changed:
- Navigation targets, data wiring, offline/snapshot/sync semantics, desktop layouts (>960px baseline
  rules unchanged outside mobile cascade)

Verification:
- `npm run lint` - passed
- `npm run build` - passed

Suggested next step:
- Manual iPhone QA (floating tab vs home indicator, drawer scroll, section tabs on all four pages);
  optional contrast check on mint primary KPI tile

## 2026-03-20T22:30:00+03:00 - Theme system foundation + dark-mode architecture

Requested scope:
- Documented mobile/fintech theme contract; semantic **light + dark** CSS token layers; typography
  and surface foundations; **`data-theme`** hook without full dark UI rollout; no logic/routes/offline
  changes

Files changed:
- `docs/mobile-theme-system.md` **(new)** — direction, allowed/forbidden choices, token categories,
  typography/surface contracts, switching notes, branding caveat
- `src/index.css` — split **`:root`** into universal document defaults + `:root[data-theme='light']`
  / `:not([data-theme])` + `:root[data-theme='dark']` with `--theme-*`, `--type-*`, legacy aliases;
  **`--theme-body-background`** for `body`; mobile `@media` blocks scoped to light/dark `:root`;
  shell tokens (`--theme-mobile-*`); segmented hover → `--theme-overlay-hover`; page title /
  metric emphasis wired to `--type-*`; **540px** `page-content` bottom padding aligned with floating
  tab bar (`5.65rem`)
- `src/App.jsx` — default `document.documentElement.dataset.theme = 'light'` if unset
- `index.html` — `data-theme="light"` on `<html>` for pre-React paint
- `docs/implementation-log.md`, `docs/last-change-summary.md`, `docs/project-current-state.md`,
  `docs/code-map.md`

What was added:
- Single **theme system doc** for future prompts
- **Semantic** vs **legacy** token split (`--theme-*` / `--type-*` vs `--bg`, `--text`, …)
- **Dark** token values (architecture); flip `data-theme="dark"` for incremental QA
- **Typography scale** with mobile/720/540 overrides via token only

What was not changed:
- Business logic, schema, routes, auth, print, offline, calculations
- Per-page JSX (except theme init in `App.jsx`)

Verification:
- `npm run lint` - passed
- `npm run build` - passed

Suggested next step:
- Optional: `prefers-color-scheme` or settings toggle writing `data-theme`; migrate remaining hardcoded
  light `rgba(255,…)` in mobile block to tokens
