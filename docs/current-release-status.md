# Current Release Status

Date: 2026-03-23

Purpose:
- provide one concise source of truth for the current repo release state
- summarize what is implemented, what is verified, and what still blocks
  delivery
- resolve drift between older summaries in `README.md` and
  `docs/current-system-audit.md`

Authority:
- when this document conflicts with older summary text elsewhere in the repo,
  this document should win
- use `docs/project-current-state.md` for the detailed implementation inventory
- use `docs/multi-company-rollout-readiness.md` for the tenant-rollout gate

## Implemented In Repo

- Supabase auth/session flow with protected routes
- tenant bootstrap via profile + `current_org_id()` + current organization load
- current-org read scoping on the main operational pages
- current-org stamping on main business writes
- customer create, online edit, archive, and delete
- transfer create plus safe online transfer edit rules
- payment create
- payment void workflow
- replacement-payment correction workflow
- overpayment-resolution workflow
- transfer reference numbers and print statement flow
- snapshot-backed offline reads for:
  - dashboard
  - customers
  - transfers
  - customer details
  - transfer details
  - new-transfer customer options
- org-aware offline create queues for:
  - customers
  - transfers
  - payments
- org-aware replay ordering:
  - customers
  - then transfers
  - then payments
- polished RTL mobile UI, theme system, and production service-worker shell

## Verified In This Repo

As of 2026-03-23:
- `npm run lint` passed
- `npm run build` passed
- GitHub Actions was aligned to the scripts that actually exist in
  `package.json`
- signed-out sessions no longer expose stale tenant context through
  `TenantProvider`

## Not Yet Verified

- live tenant-boundary behavior under real provisioned/unprovisioned accounts
- deployed RLS behavior with real current-org sessions
- deployment checklist items in `docs/deployment-readiness-checklist.md`
- physical iPhone/Safari/Home Screen execution in `docs/iphone-qa-checklist.md`
- production offline replay/device behavior outside repo/browser scope

## Current Release Blockers

The current repo is still not ready for the first safe tenant-aware rollout.

Blocking gate:
- execute `docs/multi-company-live-smoke-checklist.md` in a privileged live
  tenant environment and record the results

Related launch gates still pending:
- `docs/deployment-readiness-checklist.md`
- `docs/iphone-qa-checklist.md`

## Important Remaining Risks

- no automated test suite exists yet
- bundle build still emits a large-chunk warning
- repository migration history is still incomplete versus the live Supabase
  project
- simplified transfer inputs still persist into legacy schema fields
- open product/data questions still remain for:
  - canonical transfer statuses
  - `paid_at` policy
  - whether the legacy transfer schema remains the long-term model

## Exact Next Actions

1. Run `docs/multi-company-live-smoke-checklist.md` with real tenant accounts.
2. Run `docs/deployment-readiness-checklist.md` against the real deployment.
3. Run `docs/iphone-qa-checklist.md` on a physical device.
4. Save `PASS` / `FAIL` / `N/A` results back into repo docs before declaring the
   release ready.
