# Offline / PWA Execution Plan

This file is the project-local execution baseline for offline and PWA work.

## Goal

Add offline capabilities in controlled phases without changing business logic,
database schema, routing, or print behavior unless a later phase explicitly
requires it.

## Phase 1 - PWA Shell Foundation

Status: Implemented

Scope:
- Link a valid `manifest.webmanifest`
- Add PWA and Apple Home Screen meta tags in `index.html`
- Provide wired icon paths with placeholder branded assets
- Register a service worker from the React entry point
- Cache the app shell and same-origin static assets only
- Allow the shell to load after one successful online visit
- Provide a minimal offline fallback page for shell loading

Non-goals:
- No IndexedDB
- No repository layer changes
- No offline reads for Supabase data
- No offline writes or mutation queue
- No caching of Supabase API or mutation requests
- No change to business calculations

Current implementation files:
- `public/manifest.webmanifest`
- `public/sw.js`
- `public/offline.html`
- `public/icons/*`
- `src/pwa/registerServiceWorker.js`
- `index.html`
- `src/main.jsx`

## Phase 2 - Network + Sync Status UI

Status: Implemented

Scope:
- Detect browser online/offline state safely
- Expose reusable React providers and hooks for network status
- Expose a future-ready sync status model for UI only
- Surface a compact connection badge in the app shell
- Surface a compact sync status banner in the app shell
- Keep wording conservative and accurate when offline

Non-goals:
- No IndexedDB
- No local database persistence
- No offline reads from local cache
- No offline writes
- No sync queue execution
- No mutation replay
- No conflict resolution

Current implementation files:
- `src/context/NetworkProvider.jsx`
- `src/context/SyncProvider.jsx`
- `src/hooks/useNetworkStatus.js`
- `src/hooks/useSyncStatus.js`
- `src/components/ui/ConnectionBadge.jsx`
- `src/components/ui/SyncStatusBanner.jsx`
- `src/App.jsx`
- `src/components/AppShell.jsx`
- `src/index.css`

## Phase 3 - Local Data Foundations for Safe Offline Reads

Status: Implemented

Scope:
- Add IndexedDB-based snapshot persistence for selected read models
- Save successful online read snapshots locally
- Allow conservative offline fallback from local snapshots only
- Surface per-page cached-data notices when a page is rendered from local data
- Keep Supabase as the live source of truth whenever online

Current snapshot coverage:
- Customers list page
- Transfers list page
- Customer details page
- Transfer details page
- Transfer payments history used by transfer details

Non-goals:
- No offline customer creation
- No offline transfer creation
- No offline payment creation
- No mutation queue execution
- No replay or conflict handling
- No service-worker API caching

Current implementation files:
- `src/lib/offline/cacheKeys.js`
- `src/lib/offline/stores.js`
- `src/lib/offline/db.js`
- `src/lib/offline/serializers.js`
- `src/lib/offline/readCache.js`
- `src/hooks/useOfflineSnapshot.js`
- `src/components/ui/OfflineSnapshotNotice.jsx`
- `src/pages/CustomersPage.jsx`
- `src/pages/TransfersPage.jsx`
- `src/pages/CustomerDetailsPage.jsx`
- `src/pages/TransferDetailsPage.jsx`

## Phase 4 - Freshness / Staleness / Offline-Read UX Improvements

Status: Implemented

Implemented scope:
- Added shared freshness helpers for locally saved snapshot timestamps and age
- Improved per-page cached-data messaging with:
  - live vs locally saved source distinction
  - last locally saved time
  - conservative freshness labeling
  - clearer stale/older snapshot wording
- Improved offline no-snapshot messaging for approved cached-read surfaces
- Reduced shared status duplication by keeping the app-shell sync banner focused
  on non-idle states while page-level snapshot notices carry freshness details

Current UX behavior:
- Snapshot-backed pages can show when a local copy was last saved
- Snapshot-backed pages can distinguish live data from locally saved fallback
- Offline/no-snapshot states now tell the operator to reconnect and refresh the
  screen to save a first local copy
- Messaging remains conservative and does not imply queueing or later replay

## Phase 5 - Controlled Offline Mutations

Status: Implemented (payment capture only)

Implemented scope:
- Added a persistent browser-side payment mutation queue in IndexedDB
- Limited offline mutation support to `payment_create` records only
- Added controlled replay for queued payments:
  - automatically on reconnect for pending items
  - manually from `TransferDetailsPage` for pending and failed items
- Added distinct UI states for:
  - locally saved pending payments
  - payments currently syncing
  - payments that failed replay and need operator review
- Kept local-only pending payments separate from:
  - confirmed server totals
  - confirmed payment history
  - print output

Current behavior:
- Offline payment capture is available only on `TransferDetailsPage`
- Queued payments persist in IndexedDB until replay succeeds or the operator
  retries failed items
- Successful replay resolves the queued item and refreshes live payment data
- Replay uses conservative duplicate-safe checks based on existing
  `transfer_payments` fields before inserting

## Phase 6 - Controlled Offline Transfer Creation

Status: Implemented (transfer creation only)

Implemented scope:
- Added a persistent browser-side transfer mutation queue in IndexedDB
- Limited offline mutation support to `transfer_create` records only
- Added offline transfer capture on `NewTransferPage` only
- Restricted offline transfer capture to customers already known locally from:
  - the new-transfer customer-options snapshot
  - or a previously saved customers-list snapshot
- Added controlled replay for queued transfers:
  - automatically on reconnect for pending items
  - manually from `NewTransferPage` for pending and failed items
- Added distinct UI states for:
  - locally saved pending transfers
  - transfers currently syncing
  - transfers that failed replay and need operator review
- Kept local-only pending transfers separate from:
  - confirmed server transfers
  - confirmed transfer totals
  - print-safe records

Current behavior:
- Offline transfer creation is available only on `NewTransferPage`
- The selected customer must already exist in the live database and be present
  in locally saved customer options
- If no locally known customer data exists while offline, the page fails safely
  and explains that an online visit is required first
- Queued transfers persist in IndexedDB until replay succeeds or the operator
  retries failed items
- Successful replay resolves the queued item and the server assigns the final
  `reference_number`
- Local pending transfers use a temporary local-only reference label and never
  claim to be server-confirmed
- Reconnect-triggered replay now processes pending local transfers before
  pending local payments

## Phase 7 - Sync Refinement / Dependency-Aware Replay Polishing

Status: Implemented

Implemented scope:
- Refined shared replay ordering so queued transfers are always processed before
  queued payments in the combined sync path
- Added conservative dependency-aware payment replay handling:
  - queued payments can now be marked `blocked`
  - blocked payments stay visible and retryable
  - blocked payments are not marked failed when they are only waiting on a
    related transfer
- Added clearer queue-state handling across the shared sync layer:
  - `pending`
  - `blocked`
  - `syncing`
  - `failed`
- Improved operator-facing sync messaging for:
  - blocked by dependency
  - retry needed
  - syncing now
  - local items still waiting after replay
- Added transfer-to-payment relinking:
  - when a queued transfer is confirmed by the server, dependent queued
    payments are patched with the confirmed server transfer id
  - later manual payment replay can then continue without requiring a single
    combined sync run

Current behavior:
- Manual and reconnect-triggered replay still use the same explicit queue path
- Automatic reconnect replay still triggers only when true pending work exists;
  blocked-only items do not cause noisy retry loops
- If a payment depends on an unsynced local transfer, it stays `blocked` with a
  clear reason instead of failing prematurely
- Failed items remain in the queue with retry count and last error preserved
- No new mutation types were added in this phase

## Phase 8 - iPhone QA Pass + Deployment Readiness Hardening

Status: Implemented

Implemented scope:
- Reviewed PWA/installability correctness for Safari and Add to Home Screen
- Hardened manifest paths for relative/base-safe icon and start URL handling
- Added PNG placeholder icons for iPhone and general install flows
- Hardened service worker registration and scope handling around Vite base path
- Hardened service worker precache/fallback paths so they resolve relative to
  the worker scope instead of assuming root-only deployment
- Updated offline fallback page to reopen the cached shell relative to the
  current app scope
- Added in-repo QA and deployment checklist artifacts for manual review

Current behavior:
- Manifest now uses relative URLs for `id`, `start_url`, `scope`, and icon
  paths
- Service worker registration now uses `import.meta.env.BASE_URL` and registers
  with an explicit scope
- Shell/static precache behavior remains limited to same-origin app-shell
  assets only
- Physical iPhone testing is still required; this phase prepares the app and
  docs for that testing but does not claim device validation was completed
- PNG icons are placeholders only and should still be replaced with production
  artwork before launch

Still deferred after this phase:
- Offline customer creation
- Offline transfer edit/delete
- Offline payment edit/delete
- Broader conflict resolution
- Wider sync-engine refinement beyond the current payment-on-transfer
  dependency rules

## Guardrails

- Do not change database schema as part of offline work unless explicitly
  requested.
- Do not add guessed migrations.
- Do not change routes/navigation as part of shell work.
- Do not change print flow as part of shell work.
- Do not cache Supabase mutations in the service worker.
- Keep each phase independently reviewable.

## Deployment Notes

- Current shell/PWA behavior is designed for static hosting.
- IndexedDB snapshot and mutation-queue persistence are browser-side only and
  do not require server changes.
- Service worker functionality requires HTTPS in production, or localhost in
  development.
- Browser-router deep links still require standard SPA rewrite/fallback to
  `index.html` at the host level.
- PWA asset paths are now relative/base-safe, but deploying under a non-root
  path still requires matching Vite `base` configuration and host rewrite
  rules.
