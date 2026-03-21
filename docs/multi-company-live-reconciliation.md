# Multi-Company Live Reconciliation

Date: 2026-03-21

Purpose:
- Reconcile the current repo tenant baseline against the live evidence currently available.
- Record what is already known, what is missing from repo baseline artifacts, and what remains unknown until a
  privileged live export is captured.

Important:
- This document is evidence-based only.
- It does not claim that a privileged live export has been completed in this environment.
- Unknown items remain explicitly unknown until exported from live.

## Environment Result

Live export was **not** authoritatively executable in this environment.

What was available:
- existing repo baseline docs and query-pack files
- local public Supabase URL and anon-key configuration
- prior OpenAPI-based live inspection results already documented in `docs/live-vs-repo-comparison.md`

What was not available:
- Supabase CLI in the current shell environment
- local Supabase linkage/config files for `supabase db pull`
- evidence of privileged database credentials or a linked project session capable of exporting authoritative schema,
  grants, triggers, or RLS policy SQL

Implication:
- no new authoritative live schema/RLS export artifact was captured from this environment
- this pass prepares the export path, improves the metadata query pack, and reconciles repo artifacts against the
  live evidence already documented

## Current Authoritative Evidence Sources

Evidence currently available to the repo:
- `docs/live-vs-repo-comparison.md`
- `docs/supabase-schema-baseline.md`
- `docs/supabase-rls-baseline.md`
- `supabase/baselines/current_app_contract_snapshot.sql`
- `supabase/baselines/live_metadata_export_queries.sql`
- multi-company Phase A docs created for this repo

Evidence not yet captured authoritatively:
- privileged live schema pull SQL
- privileged live RLS/policy export SQL
- privileged live trigger/grant/default/function export beyond the older OpenAPI-surface inspection

## Reconciliation Classification

### Already aligned enough for planning
- repo docs now explicitly recognize that tenant alignment must proceed from live export first
- the first-release product model is locked to one company per user with no switcher yet
- the repo now records that operational tables must eventually become org-scoped
- the repo now records that auth bootstrap, offline namespacing, and RLS must change later

### Present live but missing from repo baseline artifacts
- `public.organizations`
- `public.user_profiles`
- `public.transfer_balances`
- `public.fx_quotes`
- `public.audit_logs`
- `public.current_org_id()`
- `public.refresh_transfer_status(...)`
- `public.rls_auto_enable(...)`
- `org_id` columns on:
  - `customers`
  - `transfers`
  - `transfer_payments`
- ownership/audit columns confirmed by prior live inspection:
  - `created_by`
  - `updated_at`
  - `is_active` on customers
  - `fx_quote_id` on transfers

### Documented but not implemented
- one-company-per-user first release shape
- membership-capable data model direction
- active-org bootstrap requirement
- org-scoped operational rows
- parent/child org-consistency expectations
- org-aware offline/cache/queue requirements

### Needs later migration work
- bringing authoritative tenant table definitions into executable repo schema history
- adding or aligning org columns on operational tables where needed
- backfilling existing production rows to a default organization
- tightening not-null constraints after backfill/validation
- introducing org-consistency constraints/triggers aligned to live

### Needs later app/bootstrap work
- resolving current org after login
- blocking protected routes until tenant bootstrap is resolved
- treating signed-in-without-membership as a failed-closed provisioning state
- ensuring detail routes fail closed outside the current org
- namespacing snapshots and queue records by org
- including org context in replay and dedupe logic

## Tenant Objects: Known vs Unknown

### Known from current evidence
- live has `organizations`
- live has `user_profiles`
- live has `org_id` on `customers`, `transfers`, and `transfer_payments`
- live exposes `current_org_id()` via RPC surface
- live is ahead of the repo on tenant-aware schema

### Still unknown
- whether live uses a separate membership table and its exact name
- whether active/default org lives on profile, membership, or both
- exact table DDL for `organizations` and `user_profiles`
- exact foreign keys and indexes for tenant objects
- exact RLS predicates for business tables
- exact org-stamping defaults and child-row org inheritance behavior
- exact org-consistency triggers or constraints
- whether `transfer_payment_voids` and `transfer_overpayment_resolutions` are already tenant-aware in live

## Current RLS Reconciliation

Current repo status:
- `docs/supabase-rls-baseline.md` remains intentionally non-authoritative
- it still documents only a minimal historic UI contract and predates newer app verbs

Known gap:
- current app behavior now includes customer update/delete/archive, transfer update, payment void insertion, and
  overpayment resolution insertion
- authoritative live export must capture policies covering those real verbs before repo RLS alignment can be treated
  as complete

Current reconciliation status:
- repo correctly treats RLS truth as unknown
- repo is not yet ready to author final tenant policy SQL

## Query-Pack Reconciliation

This pass updated `supabase/baselines/live_metadata_export_queries.sql` to better support the tenant rollout by:
- adding public relation discovery queries
- adding candidate tenant-helper discovery queries
- extending the export scope to include:
  - `transfer_payment_voids`
  - `transfer_overpayment_resolutions`
  - `audit_logs`
- extending trigger/grant/policy/index/constraint coverage for the new operational tables and tenant objects

What this means:
- the repo now has a stronger manual export query pack ready for a privileged environment
- but the results still need to be run and saved from a real live-capable session

## Readiness Assessment

The repo is ready for:
- authoritative live export in a privileged environment
- baseline reconciliation after that export is captured

The repo is not yet ready for:
- executable tenant schema alignment
- executable tenant RLS migrations
- auth/bootstrap implementation
- offline tenant namespacing

## Exact Next Step

The next exact step is:
- run the live export described in `docs/multi-company-live-export-checklist.md` and the updated
  `supabase/baselines/live_metadata_export_queries.sql` from a privileged environment
- save the real outputs under `supabase/baselines/`
- then update this reconciliation document with exported facts instead of current "unknown" placeholders
