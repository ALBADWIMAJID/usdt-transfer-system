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
- Customer details page upgraded into a customer-level follow-up workspace
- Customers page upgraded into a customer portfolio follow-up screen
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

## Active Phase

Offline / PWA work is currently at:
- Phase 11 complete: shell + status UI + snapshot reads + customer queue +
  transfer queue + payment queue + dependency-aware replay refinement +
  QA/deployment hardening + Safari/iPhone offline fallback bugfixes +
  expanded offline-read coverage for remaining major read-only operator
  surfaces

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
