# Code Map

## App Entry Points

- `src/main.jsx`
  - Loads global CSS
  - Registers the production service worker
  - Boots the React app
- `src/App.jsx`
  - Applies branding to the document
  - Sets Arabic RTL document state
  - Defines routed app structure

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
    - transfer create queue
    - payment create queue
  - Replays transfers before payments in the combined sync path
  - Surfaces dependency-blocked payment state without treating it as confirmed
    failure
  - Exposes manual replay for transfer-only, payment-only, or combined sync
- `src/hooks/useNetworkStatus.js`
  - Shared access hook for connection state
- `src/hooks/useSyncStatus.js`
  - Shared access hook for sync state
- `src/hooks/useReplayQueue.js`
  - Queue replay access hook over shared sync state

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
- `src/components/AppShell.jsx`
  - Hosts shared connection badge and sync status banner
  - Keeps the sync banner focused on non-idle attention states

## Important Page Responsibilities

- `src/pages/DashboardPage.jsx`
  - Operations dashboard
  - Financial snapshot
  - Drill-down entry points into transfer queue data
- `src/pages/CustomersPage.jsx`
  - Customer creation
  - Portfolio follow-up overview
  - Customer drill-down sheet entry points
- `src/pages/CustomerDetailsPage.jsx`
  - One-customer follow-up workspace
  - Customer transfer queue and recent activity
- `src/pages/TransfersPage.jsx`
  - Transfer follow-up queue
  - Queue-focused filters and summaries
- `src/pages/NewTransferPage.jsx`
  - Transfer creation form and computed settlement preview
  - Online-first transfer creation path
  - Offline transfer capture path for locally known customers only
  - Pending local transfer visibility and manual replay surface
- `src/pages/TransferDetailsPage.jsx`
  - One-transfer follow-up workspace
  - Payment entry
  - Payment history
  - Payment-only offline capture and replay surface
  - Pending / blocked / failed local payment visibility
  - Print statement surface

## Data Access Points

Direct Supabase reads remain page-level and live-online first:
- `src/pages/CustomersPage.jsx`
- `src/pages/CustomerDetailsPage.jsx`
- `src/pages/TransfersPage.jsx`
- `src/pages/TransferDetailsPage.jsx`
- `src/pages/NewTransferPage.jsx`
- `src/pages/LoginPage.jsx` through auth context

Snapshot-based offline fallback exists for:
- `src/pages/CustomersPage.jsx`
- `src/pages/TransfersPage.jsx`
- `src/pages/CustomerDetailsPage.jsx`
- `src/pages/TransferDetailsPage.jsx`
- `src/pages/NewTransferPage.jsx` for customer-options lookup only

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
- `src/lib/offline/dependencyResolution.js`
  - Conservative payment-on-transfer dependency checks for replay
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
- `docs/deployment-readiness-checklist.md`
  - Launch/deployment requirements and readiness tracking
- `docs/manual-test-matrix.md`
  - Consolidated scenario matrix for browser, offline, queue replay, and
    installability checks
