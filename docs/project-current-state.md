# Project Current State

## Project

USDT Transfer System

React + Vite + Supabase application with Arabic RTL operations UI for customers,
transfers, payments, print statements, and operator follow-up workflows.

## Current Baseline

Implemented:
- Supabase-backed auth/session flow
- Protected routed app shell
- Branded RTL desktop/mobile UI
- Dashboard upgraded into an operations and financial control center
- Transfers page upgraded into an operational follow-up queue
- Transfer details page upgraded into a financial follow-up workspace
- Transfer details page reorganized into an internal sectioned workspace for:
  - Summary
  - Payments
  - Payment History
  - Print
- Customer details page upgraded into a customer-level follow-up workspace
- Customers page upgraded into a customer portfolio follow-up screen with
  internal section navigation for:
  - Customers
  - Portfolio Summary
  - Needs Attention
  - Recent Activity
- Shared UI architecture for headers, cards, list states, filters, actions,
  metadata, form primitives, and drill-down sheets
- PWA shell foundation (Phase 1)
- Network + sync status UI foundation (Phase 2)
- IndexedDB snapshot-based offline read foundation for selected pages (Phase 3)
- Freshness / staleness / offline-read UX improvements (Phase 4)
- Controlled offline mutation foundation for payment capture only (Phase 5)
- Controlled offline mutation foundation for transfer creation only (Phase 6)
- Sync refinement / dependency-aware replay polishing (Phase 7)
- iPhone QA pass + deployment readiness hardening (Phase 8)
- iPhone/Safari offline fallback loading bugfix pass for snapshot-backed pages
  (Phase 9)
- Expanded offline read coverage for remaining major read-only operator
  surfaces, including the dashboard (Phase 10)
- Controlled offline customer creation support (Phase 11)
- TransferDetails offline snapshot completeness/reliability bugfix pass
  (Phase 12)

## Mobile app-like UI — Phase 0 baseline (frozen)

Recorded as the documented starting point before further visual transformation
work (per `docs/usdt-mobile-app-like-ui-plan.md`).

- **Branch at freeze:** `main` (confirm locally with `git branch --show-current`)
- **Working tree:** should be clean before starting Phase 2+ (`git status`)
- **Latest validated UI pass in repo:** **Shared theme rollout (mobile chrome + core surfaces)** —
  extends the **theme system foundation** (`docs/mobile-theme-system.md`): global primitives
  (`code`, `.field`, `.button`/`.icon-button`, `.empty-state`, `.info-card`/`.record-card`, statement
  table body text, `.text-success`/`.danger`/`.strong`), **Dashboard Mobile Lite** surfaces (hero, KPIs,
  nav shell, tabs, blocks, grouped lists, rows), and **≤960px** drawer panel + **app-section-tab**
  active state wired to **`--theme-*`**, **`--type-row-metadata-*`**, and existing **`--theme-lite-*`**
  / **`--mobile-*`** tokens; new **`--theme-list-row-*`**, **`--theme-control-inset-well`**,
  **`--theme-sheet-shadow-up`**. **≤960px** drawer header/footer washes, user chip/avatar/sign-out, topbar
  hairline, connection badge fills, and operational chips tie to existing **`--theme-drawer-*`** /
  **`--theme-status-chip-*`** / **`--theme-connection-badge-fill`**; **`.operations-sheet-panel`** uses theme
  borders/surfaces/shadows for side + bottom sheet. **T3** extends **`--theme-page-shell-*`**, elevated/tinted
  panels, chrome, sync calm strip, and rewires selectors so **`data-theme="dark"`** matches the same premium
  language. No routes or business/offline logic changes.
- **Phase 5 (page):** **`CustomerDetailsPage`** mobile simplification — **`.customer-details-page`** in
  **`src/index.css`** + minimal **`CustomerSummary`** API; see **`docs/last-change-summary.md`**.
- **Phase 6 (page):** **`NewTransferPage`** — **`.new-transfer-page`** in **`src/index.css`** + form
  structure in **`TransferFormSection`**; see **`docs/last-change-summary.md`**.
- **Phase 7 (page):** **`TransferDetailsPage`** — **`.transfer-details-page`** in **`src/index.css`** +
  **`transfer-details-page-hero`**, **`transfer-details-summary-identity`**, **`balance-summary-grid`**,
  **`transfer-payment-*`** hooks in **`PaymentForm`**; see **`docs/last-change-summary.md`**.
- **Phase 8 (page):** **`CustomersPage`** — **`.customers-portfolio-page`** in **`src/index.css`** +
  **`customers-page-hero`**, list/filter/form section classes, tokenized banners; see
  **`docs/last-change-summary.md`**.
- **App shell source:** `src/components/AppShell.jsx` (shared UI:
  `ConnectionBadge.jsx`, `SyncStatusBanner.jsx`, `BrandLockup.jsx`, etc.)
- **Pages with internal section navigation (route unchanged):**
  - `CustomersPage` — Customers, Portfolio Summary, Needs Attention, Recent Activity
  - `CustomerDetailsPage` — overview-style sections (overview, transfers, activity, actions, etc.)
  - `TransferDetailsPage` — Summary, Payments, Payment History, Print
  - `TransfersPage` — **مؤشرات الصف** (summary) and **صف المتابعة** (queue); uses the
    unified **`app-section-*`** internal navigation system (`app-section-nav--two`
    for two columns); **Phase 3** added mobile-first queue polish (compact header,
    lighter filters, compact cards under 720px, transfers-only section counts on
    phone)
- **DashboardPage:** on **≤960px** uses **dashboard-mobile-lite** in-page tabs
  (المتابعة / الإجراءات / النشاط) — **not** `app-section-*`; route `/dashboard`
  unchanged. **`NewTransferPage`**, **`LoginPage`**, etc. — no internal section bar
- **Phase 9 (system):** mobile micro-polish + a11y — **`--touch-target-min`**, unified banners / empty /
  loading / sync strip on **≤960px**, calmer hover motion, **`prefers-reduced-motion`**, safe-area padding,
  bottom nav **`aria-label`**; see **`docs/last-change-summary.md`** and **`docs/mobile-theme-system.md`**
  §12–13.
- **Phase 10 (UI plan):** iPhone QA + docs finalization — record in **`docs/mobile-qa-final-checklist.md`**;
  viewport **`interactive-widget=resizes-content`**; **≤960px** `html` scroll-padding + **`.field:focus-within`**
  scroll-margin for keyboard clearance vs bottom nav; **`Phase 9`** remains the last broad chrome pass.
  **Device sign-off** still uses **`docs/iphone-qa-checklist.md`** (cannot be completed from CI alone).
- **T1 (mobile follow-up):** global **header / page-hero compression** — shared **`--mobile-page-hero-*`** tokens,
  **`PageHeader`** description class **`page-hero-description`** (mobile-hidden), unified **`.page-hero`** app-bar
  rhythm on **≤960px** across dashboard (stack + Lite), transfers, customers, customer details, transfer
  details, new transfer; see **`docs/mobile-theme-system.md`** §16 and **`docs/last-change-summary.md`**.
- **T2 (mobile follow-up):** **light theme completion** — shared **`.button.primary`**, **`app-section-tab`**,
  **`.status-banner`**, mobile **`.field`** fills, **`.record-meta`** / metric surfaces, offline chips on
  **`--theme-*`** / **`--theme-mobile-control-fill`**; see **`docs/mobile-theme-system.md`** §17.
- **T3 (mobile follow-up):** **full dark-mode rollout** — semantic **shell / elevated / tinted panel** tokens
  wired through heroes, cards, queue rows, drawers, sheets, tabs, banners, forms, chips, sync strip, auth,
  payment/transfer panels; dark **`--theme-list-row-fill`** + **`--theme-control-inset-well`**; mobile dark
  primary CTA gradient; desktop **`.sidebar-panel`** + **`.sidebar-header`** on theme tokens; see
  **`docs/mobile-theme-system.md`** §18.
- **T3.5 (theme activation):** **light / dark / auto** user preference — **`localStorage`** **`usdt-theme-mode`**,
  **`index.html`** inline bootstrap + **`ThemePreferenceProvider`**, **`ThemePreferenceControl`** in **AppShell**
  drawer and **LoginPage**; **`auto`** uses **`prefers-color-scheme`** with live updates; see
  **`docs/mobile-theme-system.md`** §11 / §19.
- **T3.6 (dark polish):** dark-mode **readability**, **surface layering**, and **liquid-glass placement** — lifted
  dark **`--theme-*`** canvas/surfaces/text; **≤960px** **`--mobile-*`** + **`--mobile-surface-content`**; chrome
  frosted, page content **solid**; drawer/nav/tab fixes; see **`docs/mobile-theme-system.md`** §20.
- **T4 (iOS chrome):** final **shared mobile shell** refinement — **`--mobile-*-blur`** tokens, top/bottom chrome,
  drawer sheet affordances, section/dashboard **tray** geometry, operations **sheet** grabber; see
  **`docs/mobile-theme-system.md`** §21.
- **T4.1 (dark + type + density):** lifted dark **canvas/surfaces**, **`color-scheme` / `option`** hints, full dark
  **`--type-*`**, solid **mobile** control fill, **`--type-value-emphasis-size`** at **960/720/540px**, shared KPI
  metrics on tokens, tighter **≤960px** cards/forms/lists; see **`docs/mobile-theme-system.md`** §22.
- **T4.2 (controls + menus):** shared **`.field`** / **native select** surface parity (**light+dark** **`option`/`optgroup`**),
  **date/time** picker affordance (**light** opacity + **dark** filter), **operations sheet** body **well** +
  **backdrop** tokens (**`--theme-sheet-backdrop-*`**, mobile-scrim aliases), **theme preference** chip type
  alignment, **touch-safe** sheet/filter min-heights, **customers** mobile list filter aligned with **transfers**;
  see **`docs/mobile-theme-system.md`** §23.
- **T4.3 (control illusion):** **`.field select`** **appearance:none** + theme **SVG chevron**, **number** spinners
  suppressed, **`-webkit-autofill`** matched to surfaces, **light** global **`color-scheme`** on native controls,
  **operations-sheet** body + actions chrome, **WebKit** date/time edit interiors + calendar **pointer** cursor,
  **select** placeholder/disabled **option** hints — see **`docs/mobile-theme-system.md`** §24.

## Current UI Organization Notes

- Latest completed passes:
  - **Phase 2 Unified mobile section navigation system:** shared **`app-section-*`**
    classes for in-page section bars, tabs, counts, workspace, and panels across
    `CustomersPage`, `CustomerDetailsPage`, `TransfersPage`, and
    `TransferDetailsPage`; consistent sticky offsets; unified active state on small
    screens; `TransfersPage` uses **`app-section-nav--two`**
  - **Phase 3 TransfersPage mobile-first polish:** scoped presentation under
    `.transfers-queue-page` (compact hero, app-like filter panel, denser queue
    groups); `useTransfersQueueCompactCards` enables **`TransferRecordCard` compact
    mode** at ≤720px only; transfers-only override keeps **section tab counts**
    visible under ≤960px with readable active-state styling
  - **Phase 4 Dashboard mobile prioritization (Lite rework):** `DashboardMobileLite`
    + `useDashboardMobileLiteLayout` (≤960px) — one active panel, condensed previews,
    same drill-downs; desktop keeps full multi-section dashboard
  - **Phase 5 CustomerDetailsPage mobile simplification:** `CustomerDetailsPage` +
    `CustomerSummary` optional **`recordHeaderClassName`**; **`src/index.css`** rules under
    **`.customer-details-page`** (≤960px / 540px) — compact hero, hide redundant copy, 2×2
    actions, denser highlight + metric grids, grouped transfer/activity lists, follow-up
    panel **`--theme-status-*`** backgrounds; fixed flex **order** for real section class names
  - **Phase 7 TransferDetailsPage mobile refinement:** **`TransferDetailsPage`** +
    **`TransferSummary`** / **`BalanceSummary`** / **`PaymentForm`** presentation hooks;
    **`src/index.css`** **`.transfer-details-page`** — tokenized summary/follow-up/payment surfaces,
    compact hero + grouped **`payment-history-list`**, sticky payment submit, secondary print tab/card
  - **Phase 8 CustomersPage consistency:** **`customers-page-hero`**, scoped **`app-section-*`** chrome,
    grouped **`customer-portfolio-group-list`** / preview rows / pending local list, compact filter well,
    token banners + surfaces under **`.customers-portfolio-page`**
  - **Phase 9 System-wide mobile micro-polish:** shared **`src/index.css`** rules (touch targets, truncation
    helpers, **`sync-status-banner`** / **`status-banner`** tokens, reduced motion, bottom content /
    sticky CTA clearance)
  - **Mobile visual system (post–Phase 4):** **Payvo / fintech wallet–inspired** token + glass
    language for top bar, **floating** bottom nav, drawer, `app-section-*` tabs, cards, record rows,
    filters, chips, and Dashboard Lite on **≤960px** (`src/index.css`); deeper navy secondary on
    mobile viewport only for operational chrome
  - no route changes, no business/offline logic changes from these UI phases
- Prior pass **Phase 1 AppShell mobile transformation** (shell: top bar, frame,
  safe areas, bottom dock, sync strip) — **supplemented** by the iPhone-like material
  pass in the same `src/index.css` mobile `@media` block
- Page-level section *content* and semantic layout classes (e.g.
  `transfer-details-summary-section`, `customer-details-queue-section`) are
  unchanged

## Active Phase

Latest mobile UI transformation progress:
- Phase 1 complete: AppShell mobile transformation
- Phase 2 complete: Unified internal section navigation (`app-section-*`)
- Phase 3 complete: TransfersPage mobile-first operational queue polish
- Phase 4 complete: Dashboard Lite mobile home (single-panel + KPI strip on phone)
- Phases 5–9 complete: per-page mobile passes + system-wide micro-polish (see **`docs/last-change-summary.md`**)
- **Phase 10 complete (repo/CI scope):** static QA + docs + keyboard scroll-into-view polish — see
  **`docs/mobile-qa-final-checklist.md`**; physical iPhone rows remain **Not run (device)** until executed
- **T1 complete (mobile follow-up):** compact shared **`page-hero`** / **`PageHeader`** on phone — see
  **`docs/last-change-summary.md`** and **`docs/mobile-theme-system.md`** §16
- **T2 complete (mobile follow-up):** coherent **light** theme across mobile shared surfaces — see
  **`docs/last-change-summary.md`** and **`docs/mobile-theme-system.md`** §17
- **T3 complete (mobile follow-up):** coherent **dark** theme across mobile (and shared chrome touched by the
  same selectors) — see **`docs/last-change-summary.md`** and **`docs/mobile-theme-system.md`** §18
- **T3.5 complete:** user-facing **theme preference** (**light / dark / auto**) with persistence and OS sync —
  see **`docs/last-change-summary.md`** and **`docs/mobile-theme-system.md`** §11 / §19
- **T3.6 complete:** dark-mode **visual correction** (readability + layering + glass discipline) — see
  **`docs/last-change-summary.md`** and **`docs/mobile-theme-system.md`** §20
- **T4 complete:** **mobile chrome** refinement (native-adjacent shell, shared blur tokens, trays/tab bar/drawer) —
  see **`docs/last-change-summary.md`** and **`docs/mobile-theme-system.md`** §21
- **T4.1 complete:** dark **surface** lift, **native control** theme hints, **typography** normalization (incl. full
  dark **`--type-*`**), **mobile density** pass — see **`docs/last-change-summary.md`** and
  **`docs/mobile-theme-system.md`** §22
- **T4.2 complete:** **native controls**, **opened menu/select** surface hints, **form family** typography, **sheet**
  list **well**, **touch** floor on narrow sheet/filter rows — see **`docs/last-change-summary.md`** and
  **`docs/mobile-theme-system.md`** §23
- **T4.3 complete:** **select** closed-state **shell** (**appearance:none** + SVG chevron), **number** spinner removal,
  **autofill** surface match, **light** global **`color-scheme`**, **operations-sheet** body + actions chrome,
  **WebKit** date/time interiors + calendar **pointer** cursor, **select** **option** hints — see
  **`docs/last-change-summary.md`** and **`docs/mobile-theme-system.md`** §24
- Mobile visual system: **Payvo-inspired fintech theme** + **documented theme system**
  (`docs/mobile-theme-system.md`) and **light/dark token architecture** (`data-theme`, `--theme-*`,
  `--type-*`); **dark** mode is a first-class polished appearance for major surfaces (residual literals may
  remain in low-traffic desktop-only rules)

Offline / PWA baseline remains at:
- Phase 12 complete: shell + status UI + snapshot reads + customer queue +
  transfer queue + payment queue + dependency-aware replay refinement +
  QA/deployment hardening + Safari/iPhone offline fallback bugfixes +
  expanded offline-read coverage for remaining major read-only operator
  surfaces + TransferDetails snapshot completeness hardening

What that means:
- Manifest is linked
- Service worker is registered in production
- App shell and same-origin static assets are cached
- Basic offline fallback exists
- Browser online/offline state is exposed through a shared provider
- A conservative sync-status model is exposed through a shared provider
- App-shell-level connection and sync status UI is visible to operators
- Successful online reads are saved as IndexedDB snapshots for selected pages
- When offline, selected read pages can fall back to locally saved snapshots
- Cached/offline-derived screens show a per-page local-data notice
- Snapshot-backed pages show:
  - whether the current view is live or locally saved
  - when the local copy was last saved
  - conservative freshness/staleness labeling
- `NewTransferPage` now also saves a locally reusable customer-options snapshot
  for known-customer offline transfer capture
- Offline payment capture is available on `TransferDetailsPage` only
- Offline customer creation is available on `CustomersPage` only
- Offline transfer creation is available on `NewTransferPage` only
- Customer queue behavior includes:
  - local browser persistence in IndexedDB
  - explicit pending / syncing / failed states
  - reconnect-triggered replay for pending items
  - manual retry from the customers page
  - conservative duplicate-safe replay using exact `full_name + phone` matches
- Payment queue behavior includes:
  - local browser persistence in IndexedDB
  - explicit pending / blocked / syncing / failed states
  - reconnect-triggered replay for pending items
  - manual retry from the transfer details screen
  - dependency-aware replay that holds blocked payments until a related local
    transfer is confirmed by the server
- Transfer queue behavior includes:
  - local browser persistence in IndexedDB
  - explicit pending / syncing / failed states
  - reconnect-triggered replay for pending items
  - manual retry from the new-transfer screen
  - temporary local-only references until the server assigns the final
    `reference_number`
  - relinking of dependent queued payments to the confirmed server transfer id
    after replay succeeds
- Pending local payments remain separate from:
  - confirmed server totals
  - confirmed payment history calculations
  - print output
- Pending local customers remain separate from:
  - confirmed server customer files
  - confirmed customer counts and portfolio metrics
  - any server-backed customer detail screen until sync succeeds
- Pending local transfers remain separate from:
  - confirmed server transfers
  - confirmed server queues/details
  - print output
- Reconnect replay now processes pending customers before pending transfers,
  then pending payments, and keeps dependency-blocked payments visible instead
  of failing them prematurely
- Manifest and service-worker paths are now hardened to be relative/base-aware
  instead of root-only
- PNG placeholder install icons now exist for iPhone Home Screen and general
  PWA install flows
- Manual QA artifacts now exist in:
  - `docs/iphone-qa-checklist.md`
  - `docs/mobile-qa-final-checklist.md` (Phase 10 UI record; static + device sign-off)
  - `docs/deployment-readiness-checklist.md`
  - `docs/manual-test-matrix.md`
- Approved snapshot-backed read pages now use deterministic offline-read
  hardening:
  - IndexedDB snapshot reads time out safely instead of hanging indefinitely
  - live page reads time out conservatively and try snapshot fallback before a
    final error state is shown
  - supported pages now exit loading deterministically into live data, cached
    snapshot data, explicit offline/no-snapshot state, or explicit real error
- `DashboardPage` is now snapshot-backed for offline reads:
  - top summary metrics
  - urgent attention and work-queue sections
  - recent activity sections
  - dashboard drill-down sheet inputs derived from the saved dashboard snapshot
- `TransferDetailsPage` now persists its offline snapshot more reliably:
  - transfer details/context and payment history are saved independently within
    the same snapshot record
  - offline restore can use whichever approved part is actually available
  - confirmed paid/remaining totals are not treated as zero when local payment
    history is missing
  - partial offline states are surfaced explicitly instead of degrading the
    whole page into a fake empty financial state
- Real iPhone validation is still pending and must be executed manually on a
  physical device

What is not implemented yet:
- Offline customer edit/delete
- Offline transfer edit/delete
- Offline payment edit/delete
- Broader conflict resolution
- Wider sync-engine refinement beyond the current payment-on-transfer
  dependency rules

Current cached offline-read coverage:
- `DashboardPage`
- Dashboard drill-down sheet data derived from `DashboardPage`
- `CustomersPage`
- `TransfersPage`
- `CustomerDetailsPage`
- `TransferDetailsPage`
- Transfer payments history inside `TransferDetailsPage`
- Customer options snapshot for `NewTransferPage`

## Intentionally Deferred

- Database schema changes
- New migrations
- Repository-wide offline-first refactor
- API/data caching strategies beyond shell/static assets
- Offline customer edit/delete
- Offline transfer edit/delete
- Offline payment edit/delete
- Print flow changes
- Route/navigation changes

## Must Not Change Without Explicit Request

- Transfer, payment, and customer business logic
- Supabase schema assumptions
- Existing routes and navigation contracts
- Print statement flow
- Current operational status derivation behavior
- Existing offline customer queue/replay behavior

## Current Architectural Decisions

- Supabase remains the live source of truth for business data
- Service worker is shell-only and does not cache Supabase API traffic
- PWA installability is enabled with placeholder branded icons
- PWA manifest and service-worker registration now use base-safe paths and
  scope handling
- Offline shell loading is allowed after at least one successful online visit
- Network and sync state are surfaced at the app-shell level, not per page
- Sync state now reflects a browser queue that may contain:
  - customer create mutations
  - payment create mutations
  - transfer create mutations
- Payment queue items can be marked `blocked` when they depend on a local
  transfer that is not yet server-confirmed
- IndexedDB stores conservative page snapshots rather than a normalized offline
  data model
- Offline fallback is localized to approved read surfaces, not global
- Snapshot-backed read pages now use timeout-based fallback hardening to avoid
  indefinite loading during Safari/iPhone offline conditions
- `CustomersPage` section navigation uses local page state only; it does not
  add new routes or split the screen into new route contracts
- `TransferDetailsPage` uses per-piece snapshot availability markers so
  transfer context and payment history can be restored independently when only
  part of the local snapshot exists
- Offline payment capture is currently limited to queued payment creation on
  `TransferDetailsPage`
- Offline customer capture is currently limited to queued customer creation on
  `CustomersPage`
- Offline transfer capture is currently limited to queued transfer creation on
  `NewTransferPage`
- Offline transfer creation still requires a customer already known locally
  from a saved server-backed customer snapshot; newly created local customers
  are not yet valid for offline transfer creation until they sync successfully
- Successful replay removes local queue items after server confirmation or
  conservative duplicate detection
- Successful transfer replay also patches dependent queued payments with the
  confirmed server transfer id when dependency metadata is present
- Broader offline write behavior remains deferred to later phases

## Hosting / Deployment Considerations

- The app remains safe for static Vite hosting.
- IndexedDB snapshot and queue logic are browser-only and add no server
  requirement.
- Service worker behavior requires HTTPS in production or localhost in
  development.
- Browser-router deep links still require host-level SPA fallback to
  `index.html`.
- PWA asset paths are no longer hardcoded to root, but a non-root deployment
  still requires matching Vite `base` configuration and host rewrite rules.

## Known Warnings / Issues

- Build emits a chunk-size warning above 500 kB after minification; build still
  succeeds.
- Placeholder PWA icons now include PNG install assets for iPhone/PWA flows,
  but they should still be replaced by final production artwork.
- Offline data can become stale; cached pages show locally saved timestamps, but
  not real-time freshness guarantees.
- Offline read fallback is only useful after a successful authenticated online
  visit has already saved a local snapshot for that surface.
- Freshness indicators are snapshot-age hints only and do not guarantee server
  accuracy or background refresh completeness.
- Duplicate protection for queued payments is conservative only and relies on
  matching existing server payment fields, especially `transfer_id`,
  `amount_rub`, `payment_method`, `note`, and `paid_at`.
- Duplicate protection for queued customers is conservative only and is
  strongest when an exact `full_name + phone` match already exists on the
  server; no broad fuzzy matching is attempted, especially when phone is
  missing.
- Duplicate protection for queued transfers is conservative only and relies on
  matching existing transfer fields, especially `customer_id`, the financial
  amounts/rates, `status`, `notes`, and locally saved `created_at`.
- Offline payment capture still depends on the transfer details screen being
  available in the current session or via a previously saved offline snapshot.
- Dependency-aware payment replay is conservative only; blocked payments are
  retried safely, but the app still does not implement a full conflict
  resolution engine.
- The current UI still captures offline payments only from
  `TransferDetailsPage` against existing transfer records; dependency-blocked
  payment replay mainly protects mixed-queue edge cases and future local
  dependency scenarios rather than adding a new payment-entry surface.
- Offline transfer capture still depends on locally saved customer options; if
  the required customer has never been cached locally, offline creation is
  blocked safely.
- Offline-created local customers remain operationally separate until sync
  succeeds; they do not yet unlock a new offline transfer creation dependency
  path.
- Local pending transfer references are temporary browser-side labels only and
  are not the final server `reference_number`.
- Real iPhone QA has not been executed from this environment; only code-level
  hardening and browser-based smoke checks were completed.
- Safari/iPhone offline fallback is now hardened for the approved
  snapshot-backed pages, but physical retesting is still required to confirm
  the original stuck-loading bug is resolved on device.
- `TransferDetailsPage` offline support is more trustworthy after Phase 12, but
  real iPhone retesting is still required to confirm:
  - prior online visit saves both transfer details and payment history
  - partial offline restore behaves clearly when one saved piece is missing
