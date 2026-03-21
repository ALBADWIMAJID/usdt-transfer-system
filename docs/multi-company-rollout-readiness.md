# Multi-Company Rollout Readiness

Date: 2026-03-21

Purpose:
- record the final Phase G validation assessment for the current first-release multi-company shape
- distinguish code-aligned areas from remaining release blockers
- provide the exact next action before a first safe rollout and point to the final live smoke-validation gate

Important:
- this document validates the current repo state and completed rollout phases through Phase F
- it does not introduce new schema, a company switcher, or broad new implementation work
- where live multi-account behavior was not executable from this environment, that gap remains explicit
- the authoritative manual gate is now `docs/multi-company-live-smoke-checklist.md`

## Scope Validated

This Phase G assessment covers:
- auth/profile/current-org bootstrap
- read-side org scoping
- write-side org stamping
- offline/cache/queue org namespacing
- database/live alignment for payment voids, overpayment resolutions, and active-payment truth
- direct URL fail-closed behavior in detail routes
- first-release rollout readiness for the locked one-company-per-user product shape

## Completed Rollout Phases

Completed in repo:
- Phase C: auth/profile/current-org bootstrap
- Phase D: read-side org scoping
- Phase E: write-side org stamping
- Phase F: offline/cache/queue org namespacing

Previously completed supporting hardening:
- `transfer_payment_voids` tenant hardening
- `transfer_overpayment_resolutions` tenant hardening
- database payment-truth alignment for active vs voided payments

## Validation Assessment

### 1. Auth / Bootstrap

Status:
- code-aligned
- still requires runtime confirmation in a real tenant environment

What is aligned now:
- signed-out users are kept out by `ProtectedRoute`
- signed-in users do not reach protected screens until tenant bootstrap resolves
- signed-in users without a valid profile or current org fail closed as `unprovisioned`
- bootstrap query failures fail closed as `error` with retry/sign-out actions
- profile/current-org mismatch fails closed instead of falling back to a shared workspace

Evidence:
- `src/context/TenantProvider.jsx`
- `src/components/ProtectedRoute.jsx`
- `src/App.jsx`

### 2. Read-Side Org Scoping

Status:
- code-aligned
- direct URL fail-closed behavior is implemented

What is aligned now:
- dashboard reads are explicitly current-org scoped as defense in depth
- customers, transfers, and detail pages guard on missing `orgId`
- customer and transfer details fail closed when the parent row is unavailable under the current org
- child reads do not continue after a missing/out-of-scope parent record

Evidence:
- `src/lib/orgScope.js`
- `src/pages/DashboardPage.jsx`
- `src/pages/CustomersPage.jsx`
- `src/pages/CustomerDetailsPage.jsx`
- `src/pages/TransfersPage.jsx`
- `src/pages/NewTransferPage.jsx`
- `src/pages/TransferDetailsPage.jsx`

### 3. Write-Side Org Stamping

Status:
- code-aligned
- no shared-workspace write assumption remains in the main operational paths

What is aligned now:
- customer create is explicitly stamped with current `org_id`
- customer edit/archive/delete paths require same-org guards
- transfer create and transfer edit paths are org-scoped
- payment create, payment void, replacement payment, and overpayment resolution inserts are explicitly stamped
- client writes remain secondary to DB-side org enforcement and RLS

Evidence:
- `src/lib/orgScope.js`
- `src/pages/CustomersPage.jsx`
- `src/pages/CustomerDetailsPage.jsx`
- `src/pages/NewTransferPage.jsx`
- `src/pages/TransferDetailsPage.jsx`

### 4. Offline / Cache / Queue

Status:
- code-aligned for new org-aware records and legacy no-`orgId` quarantine
- still requires real tenant-environment runtime confirmation

What is aligned now:
- read snapshots use org-aware keys
- snapshot load/save fails safely when no org-scoped key is available
- queued customer, transfer, and payment records now carry `orgId`
- dedupe keys are org-aware
- replay stays current-org scoped and preserves customer -> transfer -> payment ordering
- sync summaries and replay runs are no-oped when no current org is available

Confirmed blocker in current upgrade path:
- resolved in code: legacy queued offline mutations without `orgId` are no longer auto-adopted into the active org
- current handling:
  - records that already carry org context continue to participate in queue summaries and replay normally
  - legacy records with no `orgId` or payload `org_id` are ignored by org-scoped queue listing/summary/replay paths and therefore cannot replay into the active org
- this keeps rollout fail-closed without changing replay ordering for valid records

Required before rollout:
- retain a small operational note that very old browser queue entries may need manual local cleanup if they should no longer be kept on the device

### 5. DB / Live Alignment

Status:
- schema/baseline alignment appears correct for the hardened areas
- live runtime confirmation is still required in a privileged tenant-capable environment

What is aligned now:
- `transfer_payment_voids` carries `org_id`, validates against parent payment + transfer, and uses same-org RLS
- `transfer_overpayment_resolutions` carries `org_id`, derives it from the parent transfer, and uses same-org RLS
- `transfer_balances` excludes voided payments from paid/remaining calculations
- `refresh_transfer_status()` excludes voided payments from paid totals
- `transfer_payment_voids` insert/delete/update triggers refresh transfer status

Evidence:
- `supabase/migrations/20260321_harden_transfer_payment_voids_org_scope.sql`
- `supabase/migrations/20260321_harden_transfer_overpayment_resolutions_org_scope.sql`
- `supabase/migrations/20260321_align_active_payment_db_truth.sql`
- `supabase/baselines/current_app_contract_snapshot.sql`

### 6. Current Workflow Coverage

Covered by the current code path:
- dashboard and summary metrics
- customers list and customer details
- transfers list, new transfer, and transfer details
- payment create
- payment void
- overpayment resolution
- offline customer/transfer/payment queueing and replay

Still missing as executable evidence:
- real multi-account validation proving the live RLS policies, `current_org_id()`, and frontend bootstrap all agree under actual tenant accounts
- runtime proof that direct URL access outside the current org returns the expected fail-closed UX in the deployed environment

## Blocking Findings

Release blockers for the first safe tenant rollout:

1. No real tenant-environment end-to-end validation evidence exists yet.
   - This repo pass confirms code alignment, but not actual behavior under real provisioned and unprovisioned accounts, direct out-of-org URLs, or live RLS enforcement.
   - A first multi-company release should not proceed without that manual validation pass.

## Non-Blocking Follow-Up

These should be tracked, but they do not block the first release once the blockers above are resolved:
- explicit post-rollout monitoring for bootstrap failures and RLS-denied business actions
- optional cleanup of old snapshot entries using now-obsolete global keys
- optional manual cleanup of pre-Phase-F browser queue entries that remain stored locally without org context
- future switch-aware browser storage and queue UX only if a company switcher is introduced later
- the existing bundle-size warning from `vite build`

## Readiness Verdict

Verdict:
- not ready for first safe tenant rollout

Exact blocker list:
- missing real privileged/live tenant-boundary validation across signed-out, provisioned, unprovisioned, bootstrap-failure, direct-URL, payment-void, overpayment, and offline replay flows

## Recommended Next Action

Smallest next phase:
- execute `docs/multi-company-live-smoke-checklist.md` in a privileged live tenant environment using real accounts
- save the completed checklist results and any blockers back into repo docs

Final manual gate:
- `docs/multi-company-live-smoke-checklist.md`

Expected result to bring back:
- completed `PASS` / `FAIL` / `N/A` results for the live smoke checklist
- exact blocker list, if any
- final verdict:
  - `Ready for first safe tenant rollout`
  - or `Not ready, blocker(s) found`

## Verification Performed In This Phase

- code inspection across the Phase C-F tenant implementation areas
- review of the hardened SQL migrations and current baseline snapshot
- `npm run build` - passed
