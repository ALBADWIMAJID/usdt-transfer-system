# Current System Audit

Date: 2026-03-23

Scope:
- this audit is based on repository contents only
- it reflects the code and docs currently present on `main`
- it does not claim live-environment proof where the repo only shows
  code-alignment

Authority:
- for the shortest current summary, read `docs/current-release-status.md` first
- for the detailed feature inventory, read `docs/project-current-state.md`
- for tenant rollout readiness, read `docs/multi-company-rollout-readiness.md`

## 1. Current Architecture

Frontend structure:
- React + Vite single-page app
- routing defined in `src/App.jsx`
- shared providers wrap the app in this order:
  - `ThemePreferenceProvider`
  - `NetworkProvider`
  - `AuthProvider`
  - `TenantProvider`
  - `SyncProvider`
- protected workspace shell via `ProtectedRoute` + `AppShell`

Supabase integration:
- the browser app talks directly to Supabase through `@supabase/supabase-js`
- auth uses the anon key from env vars
- tenant bootstrap depends on:
  - `user_profiles`
  - `organizations`
  - `current_org_id()`
- reads and writes remain mostly page-local, with small shared helpers for org
  scoping, offline storage, payment-state derivation, and overpayment-state
  derivation

Offline/PWA architecture:
- service worker is shell/static-asset oriented
- IndexedDB stores:
  - read snapshots
  - queued offline mutations
- replay is current-org scoped and ordered customers -> transfers -> payments

Routing structure:
- `/`
- `/login`
- `/dashboard`
- `/customers`
- `/customers/:customerId`
- `/transfers`
- `/transfers/new`
- `/transfers/:transferId`

## 2. Implemented Workflow Coverage

Authentication and tenant safety:
- email/password sign-in
- protected routes
- tenant bootstrap before protected screens render
- fail-closed handling for missing profile/current-org and bootstrap errors

Customers:
- customer create
- customer portfolio/listing/search
- customer details workspace
- online customer edit
- online customer archive/delete with linked-transfer safety checks
- offline customer creation queue

Transfers:
- transfers list/search/filtering
- online transfer creation
- offline transfer creation for locally known customers
- transfer details workspace
- safe online transfer edit with narrower scope after confirmed payments exist

Payments and follow-up:
- payment creation
- offline payment creation
- payment void workflow
- replacement-payment correction workflow
- overpayment visibility and resolution workflow
- active-vs-voided payment truth adopted in major operational pages

Printing and UI:
- printable statement flow
- professional transfer reference numbers
- Arabic RTL desktop/mobile UI
- theme preference: light / dark / auto

## 3. Database / Repo Baseline State

The repo now includes more than the original March 13 migration set. The visible
repo-side database history includes, at minimum:
- transfer reference numbers and payment lock
- customer archive state
- transfer payment voids
- transfer overpayment resolutions
- active-payment DB-truth alignment
- tenant hardening for payment voids and overpayment resolutions
- trigger refresh for transfer status after payment-void mutations

Still true:
- the base schema for older core tables is not fully reconstructed from scratch
  in this repo
- the live Supabase project remains the authoritative source for some schema,
  function, and RLS truth
- supporting baseline material lives under `supabase/baselines/`

## 4. Verification Status

Verified in repo on 2026-03-23:
- `npm run lint` passed
- `npm run build` passed

Also aligned in this repo:
- GitHub Actions now runs `npm run lint` and `npm run build`, matching the
  scripts that actually exist
- `TenantProvider` no longer exposes stale tenant context when the session is
  signed out

Not yet verified from this environment:
- live tenant smoke validation
- deployment readiness checklist
- physical iPhone/Safari/Home Screen validation

## 5. Known Limitations And Risks

- no automated tests currently exist
- the build still emits a large chunk-size warning
- the simplified transfer workflow still persists into legacy transfer-schema
  fields
- live tenant/RLS/runtime behavior still needs privileged environment proof
- open product/data questions remain around:
  - canonical transfer statuses
  - `paid_at` behavior
  - long-term legacy-schema direction

## 6. Practical Conclusion

This repo is feature-rich and materially beyond a basic MVP, but it is still not
at a clean final-release state yet.

Current reality:
- the codebase already implements the main operational workflows
- the remaining gates are mainly release-validation, environment-proof, and
  documentation/quality issues rather than missing core screens

Before declaring the tenant-aware release ready:
- execute `docs/multi-company-live-smoke-checklist.md`
- execute `docs/deployment-readiness-checklist.md`
- execute `docs/iphone-qa-checklist.md`
