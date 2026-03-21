# Multi-Company Phased Rollout Plan

Date: 2026-03-21

Purpose:
- Translate the completed multi-company design analysis into a safe, repo-specific execution sequence.
- Define the exact next phases after documentation/spec alignment so tenant implementation can proceed conservatively.

Important:
- This plan is implementation guidance only.
- It does not authorize guessed schema changes or guessed RLS migrations.

## Rollout Principles

Keep these principles throughout the rollout:
- schema and RLS enforce isolation, not frontend filtering alone
- live tenant definitions must be captured before executable implementation starts
- first release remains one-company-per-user with no switcher
- current Arabic RTL and mobile/PWA workflows stay operationally familiar
- offline/cache/queue safety is part of tenant rollout, not an optional follow-up

## Phase B: Live Baseline Alignment

Purpose:
- capture the authoritative live tenant baseline and reconcile repo docs/specs to it

Main repo areas involved:
- `docs/live-vs-repo-comparison.md`
- `docs/supabase-schema-baseline.md`
- `docs/supabase-rls-baseline.md`
- `supabase/baselines/current_app_contract_snapshot.sql`
- new multi-company docs in `docs/`
- baseline export artifacts under `supabase/baselines/`

Major risks:
- mistaking OpenAPI-visible objects for complete schema truth
- writing guessed tenant migrations before policies/functions are exported
- locking the repo to names/shapes that differ from live

Must already be true before starting:
- repo-level Phase A analysis is complete
- scope is documentation/spec alignment only

Phase exit criteria:
- live tenant tables, helper functions, membership representation, and RLS are exported or authoritatively confirmed
- repo documentation reflects live tenant truth closely enough to author evidence-based executable changes later

## Phase C: Auth/Profile/Current-Org Bootstrap

Purpose:
- introduce app-level tenant bootstrap after login without changing the product into a multi-org switcher

Main repo areas involved:
- `src/context/AuthProvider.jsx`
- `src/components/ProtectedRoute.jsx`
- `src/App.jsx`
- new or updated tenant/bootstrap context files
- app-shell loading/provisioning states

Major risks:
- allowing protected pages to render before org context is resolved
- treating signed-in-without-membership as a valid shared workspace
- coupling bootstrap too tightly to speculative schema names before Phase B is complete

Must already be true before starting:
- Phase B live-baseline alignment is complete
- active-org resolution approach is confirmed from live

Phase exit criteria:
- the app can distinguish:
  - signed out
  - signed in and provisioned
  - signed in but not provisioned into any active organization

## Phase D: Read-Side Org Scoping

Purpose:
- make operational reads safely company-scoped while preserving current screen behavior

Main repo areas involved:
- `src/pages/DashboardPage.jsx`
- `src/pages/CustomersPage.jsx`
- `src/pages/CustomerDetailsPage.jsx`
- `src/pages/TransfersPage.jsx`
- `src/pages/NewTransferPage.jsx`
- `src/pages/TransferDetailsPage.jsx`

Major risks:
- inconsistent list/detail scoping
- relying on client-side filters instead of the real RLS boundary
- mismatched dashboard/customer/transfer aggregates if some reads are scoped and others are not

Must already be true before starting:
- Phase C current-org bootstrap exists
- live tenant column names and helper behavior are known
- initial RLS direction is confirmed

Phase exit criteria:
- every business read path behaves correctly under org-scoped access
- detail routes fail closed when a row is outside the current org

## Phase E: Write-Side Org Stamping

Purpose:
- make all business writes land in the correct organization safely

Main repo areas involved:
- `src/pages/CustomersPage.jsx`
- `src/pages/NewTransferPage.jsx`
- `src/pages/TransferDetailsPage.jsx`
- live-aligned DB defaults/triggers/functions

Major risks:
- missing org stamping on inserts
- allowing child records to carry inconsistent org values
- over-trusting client payloads for tenant ownership

Must already be true before starting:
- business table org columns are confirmed from live
- parent/child org-consistency approach is confirmed
- read-side scoping is understood and tested

Phase exit criteria:
- creates/updates follow the current-org model correctly
- child records inherit or validate org context correctly

## Phase F: Offline/Cache/Queue Org Namespacing

Purpose:
- prevent cached-data bleed and cross-org replay mistakes in browser storage

Main repo areas involved:
- `src/lib/offline/cacheKeys.js`
- `src/lib/offline/stores.js`
- `src/lib/offline/queueStores.js`
- `src/lib/offline/mutationIds.js`
- `src/lib/offline/customerQueue.js`
- `src/lib/offline/transferQueue.js`
- `src/lib/offline/paymentQueue.js`
- `src/lib/offline/replayCustomers.js`
- `src/lib/offline/replayTransfers.js`
- `src/lib/offline/replayPayments.js`
- any page code that reads/writes snapshots

Major risks:
- cached snapshots showing another company's data
- dedupe collisions across orgs
- replay targeting the wrong org context
- mixed-org browser queues after login changes or future org switching

Must already be true before starting:
- current-org bootstrap exists
- target tenant keying/namespacing strategy is decided
- write-side org stamping path is understood

Phase exit criteria:
- snapshot keys are org-aware
- queued mutations carry org context
- replay and dedupe logic are org-aware

## Phase G: RLS Hardening And Rollout Validation

Purpose:
- enforce final tenant isolation at the database boundary and validate the rollout end to end

Main repo areas involved:
- live-aligned policy SQL / baseline artifacts
- final tenant implementation docs
- manual validation notes and rollout checklist docs

Major risks:
- locking out valid operators due to incorrect policy predicates
- leaving one table/path under-scoped
- shipping partial tenant rollout where offline and RLS behavior disagree

Must already be true before starting:
- tenant schema/columns are aligned to live
- auth bootstrap and org-aware app behavior are in place
- read/write/offline org behavior has been exercised

Phase exit criteria:
- org-scoped access works for current operator workflows
- direct URL access outside the current org fails closed
- list metrics, details, payments, voids, resolutions, and offline replay behave consistently under org boundaries

## Recommended Immediate Next Step

After these docs, the next exact step is:
- perform the authoritative live export and baseline reconciliation described in
  `docs/multi-company-live-export-checklist.md`

Only after that should the repo begin any executable tenant implementation work.
