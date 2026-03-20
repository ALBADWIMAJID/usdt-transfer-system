# Code Map

## App Entry Points

- `src/main.jsx`
  - Loads global CSS
  - Registers the production service worker
  - Boots the React app
- `src/components/ui/PageHeader.jsx`
  - Shared **page hero / app-bar** shell: **`section.page-hero`**; route body copy in **`p.page-hero-description`**
    (mobile-hidden); **`PageActions`** → **`inline-actions page-actions`**
- `src/App.jsx`
  - Applies branding to the document
  - Sets Arabic RTL document state
  - Wraps the tree with **`ThemePreferenceProvider`** (theme preference + **`data-theme`** sync; see
    `docs/mobile-theme-system.md` §11)
  - Defines routed app structure
- `index.html`
  - Inline script (head): reads **`usdt-theme-mode`** + **`prefers-color-scheme`**, sets **`data-theme`** before
    the JS bundle (reduces flash)
- `src/lib/themePreference.js`
  - **`THEME_STORAGE_KEY`**, **`readStoredMode`**, **`writeStoredMode`**, **`resolveDataThemeFromMode`**
- `src/context/ThemePreferenceProvider.jsx` + `src/context/theme-preference-context.js`
  - Applies resolved theme to **`<html>`**, **`auto`** **`matchMedia`** listener, cross-tab **`storage`** sync
- `src/components/ui/ThemePreferenceControl.jsx`
  - Three-segment **المظهر** control (used in **`AppShell`** drawer and **`LoginPage`**)
- `docs/mobile-theme-system.md`
  - **Theme contract:** visual direction, token categories (`--theme-*`, `--type-*`, `--mobile-*`),
    light/dark philosophy, allowed/forbidden patterns, **`data-theme`** + **`localStorage`** preference (**T3.5**
    §11 / §19); **T2** §17 (light completion), **T3** §18 (dark rollout)
- `docs/mobile-qa-final-checklist.md`
  - **Phase 10 record:** plan §20 scenario matrix (static vs device), issues/fixes, deferrals; companion to
    **`docs/iphone-qa-checklist.md`**
- `docs/mobile-ui-signoff.md`
  - Final **mobile UI/theme sign-off** record for repo/browser scope: checked areas, status, tiny fixes, deferred
    external limitations, and completion statement
- `src/index.css`
  - **`:root[data-theme='light']` / `:not([data-theme])`** and **`:root[data-theme='dark']`** define
    semantic tokens + legacy aliases; mobile `@media` scopes light/dark **`:root`** overrides
  - Shared primitives (forms, buttons, `code`, info/record cards, statement table copy, utility text
    colors) and **Dashboard Mobile Lite** base + **≤960px** drawer / section tabs / Lite overrides use
    **`--theme-*`** / **`--type-*`** / **`--mobile-*`** where rolled out; **`data-theme="dark"`** shares the
    same selectors with dark token values (**T3** §18, **T3.6** §20); **T4** §21 — final **iOS-like mobile chrome**
    (top bar, tab bar, drawer, trays, sheet grabbers, shared blur tokens); **T4.1** §22 — dark surface lift, **`color-scheme`**
    / **`option`** hints, complete dark **`--type-*`**, mobile control solid fill + density; **T4.2** §23 — native
    **    control/menu** surface parity (light+dark **`option`/`optgroup`**, field typography tokens, sheet body well,
    **tokenized** **`.operations-sheet-backdrop`** via **`--theme-sheet-backdrop-*`**, date-picker icons light+dark,
    touch-safe sheet/filter min-heights, customers mobile filter parity with transfers); **T4.3** §24 — **`.field
    select`** **appearance:none** + SVG chevron (light/dark), **number** spinner removal, **autofill** surface match,
    light global **`color-scheme`**, **operations-sheet** body + actions inset/hairline, **WebKit** date/time edit
    interiors, calendar **`cursor:pointer`**, **select** placeholder/disabled **option** hints
  - **Phase 9:** **`--touch-target-min`**, shared mobile **`status-banner`** / **`empty-state`** /
    **`loading-state`** / **`sync-status-banner`** rhythm, calmer hover motion, **`prefers-reduced-motion`**
    block, safe-area padding tweaks
  - **Phase 10:** **≤960px** `html` **`scroll-padding-bottom`** + **`.field:focus-within`**
    **`scroll-margin-bottom`** (keyboard vs floating tab bar); see **`docs/mobile-theme-system.md`** §15

## Auth / Session Flow

- `src/context/AuthProvider.jsx`
  - Loads Supabase session
  - Subscribes to `onAuthStateChange`
  - Exposes sign-in and sign-out helpers
- `src/context/auth-context.js`
  - Auth context hook surface
- `src/lib/supabase.js`
  - Creates the Supabase client from env vars

## Network / Sync Status Flow

- `src/context/NetworkProvider.jsx`
  - Tracks browser online/offline state from platform events
- `src/context/SyncProvider.jsx`
  - Exposes a UI-safe sync model: `idle`, `offline`, `pending`, `blocked`,
    `syncing`, `error`
  - Aggregates both local queues:
    - customer create queue
    - transfer create queue
    - payment create queue
  - Replays customers before transfers before payments in the combined sync path
  - Surfaces dependency-blocked payment state without treating it as confirmed
    failure
  - Exposes manual replay for customer-only, transfer-only, payment-only, or
    combined sync
- `src/hooks/useNetworkStatus.js`
  - Shared access hook for connection state
- `src/hooks/useSyncStatus.js`
  - Shared access hook for sync state
- `src/hooks/useReplayQueue.js`
  - Queue replay access hook over shared sync state
- `src/hooks/useTransfersQueueCompactCards.js`
  - Presentation-only: `matchMedia('(max-width: 720px)')` + `useSyncExternalStore` so
    `TransfersList` can render **compact** `TransferRecordCard` rows on phone without
    affecting desktop layout
- `src/hooks/useDashboardMobileLiteLayout.js`
  - Presentation-only: `matchMedia('(max-width: 960px)')` + `useSyncExternalStore` so
    `DashboardPage` renders **`DashboardMobileLite`** (single-panel workspace) on phone
    widths while desktop keeps the full section stack

## Unified internal section navigation (Phase 2)

Operational pages with in-route section switching share **`app-section-*`**
classes in `src/index.css`:

- `app-section-nav-shell` — sticky wrapper
- `app-section-nav` — segmented row grid (`app-section-nav--two` when only two
  sections, e.g. transfers queue summary vs list)
- `app-section-tab--row` — label + optional count badge (customers, customer
  details, transfers)
- `app-section-tab--stack` — centered label stack (transfer details four tabs)
- `app-section-tab-copy` / `app-section-tab-count` (+ `--neutral` / `--brand` /
  `--warning` / `--danger`)
- `app-section-inline-status` — optional message directly under the bar
- `app-section-workspace` / `app-section-panel` (+ `.is-active`)

## Routing Map

- `/` -> redirect to `/dashboard` or `/login`
- `/login` -> `src/pages/LoginPage.jsx`
- `/dashboard` -> `src/pages/DashboardPage.jsx`
- `/customers` -> `src/pages/CustomersPage.jsx`
- `/customers/:customerId` -> `src/pages/CustomerDetailsPage.jsx`
- `/transfers` -> `src/pages/TransfersPage.jsx`
- `/transfers/new` -> `src/pages/NewTransferPage.jsx`
- `/transfers/:transferId` -> `src/pages/TransferDetailsPage.jsx`

Protected shell:
- `src/components/ProtectedRoute.jsx`
- `src/components/AppShell.jsx` (not under `src/layout/`)
  - Hosts shared connection badge and sync status banner
  - Keeps the sync banner focused on non-idle attention states
  - Mobile shell chrome is styled in `src/index.css` (Phase 1 layout + **Payvo-inspired fintech
    theme** for ≤960px: mobile tokens, frosted top bar, **floating** tab bar, premium drawer sheet)
  - **Phase 9:** bottom **`NavLink`** items use **`aria-label={item.label}`** so VoiceOver gets the full
    route name while the visible tab stays short

## Important Page Responsibilities

- `src/pages/DashboardPage.jsx`
  - Operations dashboard
  - Financial snapshot
  - Snapshot-backed offline read fallback for main dashboard data
  - Drill-down entry points into transfer queue data
  - Offline-capable drill-down inputs derived from the saved dashboard snapshot
  - **Phase 4 mobile:** `DashboardMobileLite.jsx` when ≤960px — internal tabs
    (المتابعة / الإجراءات / النشاط), **3-column** headline KPI grid, condensed previews with
    **`dashboard-mobile-lite-list--grouped`** (hairline rows); **desktop** unchanged multi-section
    layout
- `src/components/dashboard/DashboardMobileLite.jsx`
  - Mobile-only presentation shell for `/dashboard`; reuses parent drill-downs and
    `headlineCards`; no independent data fetching; preview lists use grouped list class for
    app-like row surfaces (CSS in `index.css`)
- `src/pages/CustomersPage.jsx`
  - Customer creation
  - Internal sectioned workspace for:
    - Customers
    - Portfolio Summary
    - Needs Attention
    - Recent Activity
  - Page-level section navigation inside `/customers` using shared
    **`app-section-*`** classes (Phase 2)
  - **Phase 8 consistency:** root **`customers-portfolio-page`**; **`CustomersHeader`**
    **`customers-page-hero`**; list/form/presentation hooks — **`src/index.css`**
    **`.customers-portfolio-page`**
  - Customer drill-down sheet entry points
  - Offline customer capture and pending/failed local customer visibility
- `src/pages/CustomerDetailsPage.jsx`
  - One-customer follow-up workspace
  - Customer transfer queue and recent activity
  - Internal section navigation via **`app-section-*`** (same system as other
    long operational pages)
  - **Phase 5 mobile simplification:** compact **`customer-details-page-hero`** (tokenized
    shell, long description hidden ≤960px, 2-col actions with full-width back row),
    **`customer-details-identity`** on **`CustomerSummary`** (name only in hero; strip shows
    phone + state chip), grouped **transfer** / **activity** lists
    (`--theme-lite-list-well`, hairlines), denser KPI grids + follow-up panel tones via
    **`--theme-status-*`** — scoped in **`src/index.css`** under **`.customer-details-page`**
- `src/pages/TransfersPage.jsx`
  - Transfer follow-up queue
  - Queue-focused filters and summaries
  - Internal section navigation inside `/transfers` (two sections: summary vs
    queue) via **`app-section-nav app-section-nav--two`** + row tabs and panels
  - **Phase 3 mobile polish** (presentation): `TransfersHeader` /
    `TransfersFilterBar` / `TransfersList` + `src/index.css` scoped to
    `.transfers-queue-page` — compact hero, lighter filter panel, optional compact
    cards via `useTransfersQueueCompactCards` (≤720px); section tab counts remain
    visible on phone for this page only
- `src/pages/NewTransferPage.jsx`
  - Transfer creation form and computed settlement preview
  - Online-first transfer creation path
  - Offline transfer capture path for locally known customers only
  - Pending local transfer visibility and manual replay surface
  - **Phase 6 mobile capture polish:** root **`new-transfer-page`**; **`TransferComputedSummary`**
    renders **after** the form and **before** the pending list; **`TransferFormSection`** groups
    **customer / pricing / notes / submit** steps, **pre-submit strip** + optional
    **`amountDisplayLabel`** / **`globalRateDisplayLabel`**; **`NewTransferHeader`** uses
    **`new-transfer-page-hero`** — presentation in **`src/index.css`**
- `src/pages/TransferDetailsPage.jsx`
  - One-transfer follow-up workspace
  - Internal sectioned navigation for:
    - Summary
    - Payments
    - Payment History
    - Print
  - **`app-section-*`** navigation: row vs stack tab variants; mobile compact
    mode matches other sectioned pages
  - **Phase 7 mobile refinement:** root **`transfer-details-page`**; **`PageHeader`**
    **`transfer-details-page-hero`**; **`TransferSummary`**
    **`recordHeaderClassName="transfer-details-summary-identity"`** — presentation in **`src/index.css`**
  - Arabic section labels and operator copy restored after the sectioned-layout
    reorganization bugfix pass
  - Payment entry
  - Payment history
  - Snapshot-backed offline restore for both transfer details and payment history
  - Partial offline state handling when transfer context is available locally
    but payment history is missing, or vice versa
  - Payment-only offline capture and replay surface
  - Pending / blocked / failed local payment visibility
  - Print statement surface

## Data Access Points

Direct Supabase reads remain page-level and live-online first:
- `src/pages/DashboardPage.jsx`
- `src/pages/CustomersPage.jsx`
- `src/pages/CustomerDetailsPage.jsx`
- `src/pages/TransfersPage.jsx`
- `src/pages/TransferDetailsPage.jsx`
- `src/pages/NewTransferPage.jsx`
- `src/pages/LoginPage.jsx` through auth context

Snapshot-based offline fallback exists for:
- `src/pages/DashboardPage.jsx`
- `src/pages/CustomersPage.jsx`
- `src/pages/TransfersPage.jsx`
- `src/pages/CustomerDetailsPage.jsx`
- `src/pages/TransferDetailsPage.jsx`
- `src/pages/NewTransferPage.jsx` for customer-options lookup only
- Dashboard drill-down sheet inputs when a saved dashboard snapshot exists

`TransferDetailsPage` snapshot notes:
- Transfer details and payment history are now persisted independently inside
  the same snapshot record
- Offline restore can show transfer context even when payment-history snapshot
  is missing, with explicit partial-state messaging instead of fake zero totals

Approved snapshot-backed pages now use deterministic fallback hardening:
- IndexedDB snapshot access times out safely instead of hanging indefinitely
- Live page reads use conservative timeout wrappers before falling back to
  approved local snapshots
- Supported pages exit loading into a concrete state instead of staying in an
  ambiguous spinner when offline fallback is possible

## Write / Mutation Points

- Customer creation:
  - `src/pages/CustomersPage.jsx`
  - `src/components/customers/CustomersFormSection.jsx`
  - Online insert to Supabase when connected
  - Offline queue record creation when disconnected
- Transfer creation:
  - `src/pages/NewTransferPage.jsx`
  - `src/components/new-transfer/TransferFormSection.jsx`
  - Online insert to Supabase when connected
  - Offline queue record creation when disconnected and the selected customer is
    already cached locally
- Payment insertion:
  - `src/pages/TransferDetailsPage.jsx`
  - `src/components/transfer-details/PaymentForm.jsx`
  - Online insert to Supabase when connected
  - Offline queue record creation when disconnected
- Auth writes:
  - `src/context/AuthProvider.jsx`

## Offline / PWA Files

- `public/manifest.webmanifest`
  - Install metadata and app icons
  - Uses relative/base-safe URLs for scope and icon paths
- `public/sw.js`
  - Shell/static asset service worker
  - Resolves shell cache paths relative to worker scope
  - No Supabase API caching
- `public/offline.html`
  - Minimal fallback page for no-network shell loads
  - Reopens the cached shell relative to the current app scope
- `public/icons/*`
  - Placeholder branded PWA icons
  - Includes PNG install icons for iPhone/Home Screen and general PWA flows
- `src/pwa/registerServiceWorker.js`
  - Production-only registration and shell asset messaging
  - Uses `import.meta.env.BASE_URL` for scope-safe service worker registration
- `src/context/NetworkProvider.jsx`
  - Runtime connection detection
- `src/context/SyncProvider.jsx`
  - Queue-aware sync state for transfer and payment offline mutation phases
- `src/lib/offline/stores.js`
  - IndexedDB store metadata
- `src/lib/offline/cacheKeys.js`
  - Stable read-snapshot keys by surface/scope
  - Includes the `dashboard:main` snapshot key for dashboard offline reads
- `src/lib/offline/db.js`
  - Thin IndexedDB access wrapper
  - Adds timeout protection for IndexedDB open/read operations used by
    snapshot-backed pages
- `src/lib/offline/serializers.js`
  - Snapshot record shape and metadata
- `src/lib/offline/readCache.js`
  - Safe read/write helpers for snapshots
  - Exposes conservative live-read timeout and likely-offline failure helpers
    used by the approved snapshot-backed pages
- `src/lib/offline/freshness.js`
  - Shared formatting and conservative freshness/staleness helpers for locally
    saved snapshots
- `src/lib/offline/queueStores.js`
  - IndexedDB queue store names and queue event channel
- `src/lib/offline/mutationIds.js`
  - Local mutation IDs, local transfer references, and dedupe helpers
- `src/lib/offline/mutationQueue.js`
  - Generic browser-side mutation queue persistence helpers
- `src/lib/offline/customerQueue.js`
  - Customer queue records, queue summaries, and queue state transitions
- `src/lib/offline/dependencyResolution.js`
  - Conservative payment-on-transfer dependency checks for replay
- `src/lib/offline/replayCustomers.js`
  - Conservative customer replay and duplicate-safe server checks
- `src/lib/offline/paymentQueue.js`
  - Payment queue records, queue summaries, queue state transitions, and
    transfer-to-payment relinking helpers
- `src/lib/offline/replayPayments.js`
  - Conservative payment replay, duplicate-safe server checks, and dependency
    blocking for payments waiting on local transfers
- `src/lib/offline/transferQueue.js`
  - Transfer queue records, queue summaries, and queue state transitions
- `src/lib/offline/replayTransfers.js`
  - Conservative transfer replay, duplicate-safe server checks, and relinking
    of dependent queued payments after server confirmation
- `src/hooks/useOfflineSnapshot.js`
  - Per-page cached/live snapshot state helper
- `src/hooks/usePendingPayments.js`
  - Transfer-scoped pending local payment list and summary hook
- `src/hooks/usePendingCustomers.js`
  - Customers-page pending local customer list and summary hook
- `src/hooks/usePendingTransfers.js`
  - Pending local transfer list and summary hook
- `src/components/ui/ConnectionBadge.jsx`
  - Shared compact network indicator
- `src/components/ui/SyncStatusBanner.jsx`
  - Shared compact sync-status banner
  - Shows pending vs blocked vs failed queue attention states
- `src/components/ui/OfflineSnapshotNotice.jsx`
  - Shared per-page cached-data notice
  - Shows live vs locally saved source, last saved time, and snapshot age
- `src/components/ui/PendingMutationNotice.jsx`
  - Local pending/blocked/failed payment or transfer summary and manual sync
    action

## Shared UI Layers

- `src/components/ui/*`
  - Page headers
  - Section cards
  - Metric cards
  - Filters
  - List-state primitives
  - Record metadata
  - Form primitives
  - `OperationsDrillDownSheet.jsx`
  - Status UI primitives including connection/sync presentation
  - Cached-data notice presentation
  - Pending local-mutation presentation

## Print Flow

- `src/components/transfer-details/PrintStatement.jsx`
  - Printable transfer statement layout
- Print flow is triggered from transfer details and is unchanged by PWA/offline
  work

## QA / Deployment Docs

- `docs/iphone-qa-checklist.md`
  - Manual device checklist for Safari and Add to Home Screen validation
- `docs/mobile-ui-signoff.md`
  - Final repository/browser sign-off document for the mobile UI/theme scope
- `docs/deployment-readiness-checklist.md`
  - Launch/deployment requirements and readiness tracking
- `docs/manual-test-matrix.md`
  - Consolidated scenario matrix for browser, offline, queue replay, and
    installability checks
