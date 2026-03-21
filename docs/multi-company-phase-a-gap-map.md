# Multi-Company Phase A Gap Map

Date: 2026-03-21

Purpose:
- Record the current repo-vs-live tenant gap before any executable multi-company work begins.
- Lock the specific app-layer and data-layer assumptions that make the repo behave like a single shared workspace today.
- Provide a factual Phase A reference for Phase B live-baseline alignment and later tenant implementation.

Important:
- This document is design/spec only.
- It does not authorize guessed migrations.
- It does not replace the live Supabase schema or policy exports.

## Repo Baseline Today

Current repo behavior is still effectively single-workspace:
- auth gates access at the session level only
- protected routes require a signed-in user, not a resolved organization
- business pages query all rows visible to the session or fetch by entity id
- the offline layer uses global snapshot keys and one browser-side queue namespace
- the repo migration chain does not contain authoritative tenant tables, org columns, or RLS policies

Key current repo facts:
- `src/context/AuthProvider.jsx` exposes `user`, session, sign-in, and sign-out only
- `src/components/ProtectedRoute.jsx` checks `user` presence only
- `src/pages/DashboardPage.jsx`, `CustomersPage.jsx`, `TransfersPage.jsx`, `CustomerDetailsPage.jsx`,
  `NewTransferPage.jsx`, and `TransferDetailsPage.jsx` read/write operational tables directly from the browser
- `supabase/baselines/current_app_contract_snapshot.sql` is a compatibility snapshot, not an authoritative live schema export
- `docs/supabase-rls-baseline.md` explicitly states the repo does not contain the original tenant truth

## Tenant-Aware Objects Confirmed Live But Missing Or Incomplete In Repo

Confirmed from `docs/live-vs-repo-comparison.md`:

### Live tables/views missing from repo schema truth
- `public.organizations`
- `public.user_profiles`
- `public.transfer_balances`
- `public.fx_quotes`
- `public.audit_logs`

### Live RPC/helper surface missing from repo schema truth
- `public.current_org_id()`
- `public.refresh_transfer_status(...)`
- `public.rls_auto_enable(...)`

### Live tenant-aware business columns missing from repo schema snapshot

`public.customers`
- `org_id`
- `created_by`
- `is_active`
- `updated_at`

`public.transfers`
- `org_id`
- `created_by`
- `updated_at`
- `fx_quote_id`

`public.transfer_payments`
- `org_id`
- `created_by`

Implication:
- the live system already contains tenant/ownership scaffolding that the repo has not captured as authoritative baseline artifacts yet
- repo implementation work must align to live, not invent a parallel tenant model

## Current App-Layer Single-Workspace Assumptions

### Auth/session assumptions
- `AuthProvider` resolves only the Supabase session and `user`
- no profile bootstrap exists after sign-in
- no current-organization bootstrap exists
- no membership state exists in React context
- the app shell does not know which company is active

### Protected routing assumptions
- `ProtectedRoute` allows entry whenever `user` exists
- it does not block on unresolved tenant context
- it does not handle "signed in but not provisioned into any company"

### Query assumptions on main pages
- `DashboardPage` reads broad lists/counts from `customers`, `transfers`, and `transfer_payments`, then loads
  `transfer_payment_voids` and `transfer_overpayment_resolutions` by transfer ids
- `CustomersPage` loads the full visible customer list, then visible transfers/payments/voids/resolutions to derive metrics
- `TransfersPage` loads the visible transfer list plus related customer names and payment-derived state
- `CustomerDetailsPage` reads one customer, its transfers, related payments, voids, and overpayment resolutions
- `NewTransferPage` loads active customer options and inserts transfers
- `TransferDetailsPage` reads one transfer, related customer name, payments, payment voids, and overpayment resolutions;
  it also inserts payments, voids, and overpayment resolutions and updates transfers

Current repo query pattern implication:
- pages assume all rows visible to the session belong to one operational workspace
- the frontend currently relies on RLS being correct, but the repo does not version that tenant truth

## Offline / Cache / Queue Areas That Must Become Org-Aware Later

### Snapshot key assumptions
Current keys in `src/lib/offline/cacheKeys.js` are global:
- `dashboard:main`
- `customers:list`
- `customers:new-transfer-options`
- `transfers:list`
- `customers:detail:{id}`
- `transfers:detail:{id}`

Future implication:
- if one browser profile can access more than one organization, these keys would allow cross-org cached data bleed

### Browser database/store assumptions
Current offline store baseline:
- `src/lib/offline/stores.js` uses one IndexedDB database name: `usdt-transfer-system-offline`
- `src/lib/offline/queueStores.js` uses one mutation queue store namespace

Future implication:
- queue and snapshot records need tenant namespacing even if the app keeps one browser database

### Queue/dedupe assumptions
Current queue/dedupe logic omits tenant context:
- `src/lib/offline/mutationIds.js`
- `src/lib/offline/customerQueue.js`
- `src/lib/offline/transferQueue.js`
- `src/lib/offline/paymentQueue.js`
- `src/lib/offline/replayCustomers.js`
- `src/lib/offline/replayTransfers.js`
- `src/lib/offline/replayPayments.js`

Current repo behavior:
- queued records do not include `org_id`
- dedupe keys do not include `org_id`
- replay duplicate checks only compare business payload fields and parent ids
- replay assumes one operational workspace for the signed-in browser session

Future implication:
- queued records, dedupe keys, and replay lookup logic must all become tenant-aware before multi-company behavior is safe

## RLS / Policy Areas Missing From Repo Truth

Repo limitations today:
- the repo does not include the original live RLS policy SQL
- the repo does not include authoritative grants for tenant helpers/tables/functions
- the repo does not include authoritative org-aware trigger/default definitions

Current RLS documentation gap:
- `docs/supabase-rls-baseline.md` was written before the current app expanded to customer update/delete/archive,
  transfer update, payment void insertion, and overpayment resolution insertion
- future tenant alignment must account for current actual UI verbs, not only the old select/insert baseline

Tables that will need authoritative RLS review:
- `customers`
- `transfers`
- `transfer_payments`
- `transfer_payment_voids`
- `transfer_overpayment_resolutions`
- `organizations`
- `user_profiles`
- any live membership table or equivalent membership representation

## Parent/Child Org-Consistency Risks

Future tenant work must preserve these consistency rules:
- a transfer must belong to the same org as its customer
- a payment must belong to the same org as its transfer
- a payment void must belong to the same org as its payment and transfer
- an overpayment resolution must belong to the same org as its transfer

The repo does not currently express these invariants because it does not yet contain the authoritative tenant schema truth.

## Phase A Conclusion

The primary Phase A problem is not "how to invent tenancy."

It is:
- how to align the repo to the tenant-aware live Supabase baseline already indicated by the docs
- how to capture the missing tables, columns, helper functions, grants, triggers, and policies as authoritative
  repo truth before executable implementation starts

That means:
- no guessed multi-company migrations yet
- no frontend-only isolation
- no company switcher yet
- live export and repo baseline alignment must happen first
