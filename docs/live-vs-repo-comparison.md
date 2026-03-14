# Live vs Repo Comparison

Date: 2026-03-13

## Inspection Method

Live inspection method used in this environment:
- Supabase project URL and anon key were available locally in `.env`
- direct inspection was performed through the live PostgREST OpenAPI surface at `/rest/v1/`
- sampled read requests were made with `limit=1` against relevant relations

Limits of this inspection method:
- it confirms exposed relations, RPC paths, and visible column names
- it does not authoritatively confirm:
  - exact data types
  - defaults
  - foreign keys
  - indexes
  - trigger definitions
  - function bodies
  - grants
  - RLS policy SQL

## Confirmed Live Objects Relevant To The Current App

Confirmed live relations:
- `public.customers`
- `public.transfers`
- `public.transfer_payments`
- `public.transfer_reference_counters`
- `public.organizations`
- `public.user_profiles`
- `public.transfer_balances` view

Confirmed additional live public objects visible via OpenAPI:
- `public.fx_quotes`
- `public.audit_logs`

Confirmed live RPC paths visible via OpenAPI:
- `/rpc/current_org_id`
- `/rpc/next_transfer_reference_number`
- `/rpc/refresh_transfer_status`
- `/rpc/rls_auto_enable`

## Confirmed Matches With Repo Baseline

These repo-baseline expectations are confirmed live:
- `customers`, `transfers`, and `transfer_payments` all exist
- `transfer_reference_counters` exists
- `transfers.reference_number` exists
- the core transfer commercial fields expected by the frontend exist live:
  - `usdt_amount`
  - `market_rate`
  - `client_rate`
  - `pricing_mode`
  - `commission_pct`
  - `commission_rub`
  - `gross_rub`
  - `payable_rub`
  - `status`
  - `notes`
  - `created_at`
- the core payment fields expected by the frontend exist live:
  - `amount_rub`
  - `payment_method`
  - `note`
  - `paid_at`
  - `created_at`

## Confirmed Live Schema Differences vs Repo Baseline

### `public.customers`

Repo baseline expected:
- `id`
- `full_name`
- `phone`
- `notes`
- `created_at`

Confirmed extra live columns:
- `org_id`
- `created_by`
- `is_active`
- `updated_at`

Implication:
- the live system has tenant/ownership scaffolding not captured in repo migrations

### `public.transfers`

Repo baseline expected:
- `id`
- `customer_id`
- `reference_number`
- `usdt_amount`
- `market_rate`
- `client_rate`
- `pricing_mode`
- `commission_pct`
- `commission_rub`
- `gross_rub`
- `payable_rub`
- `status`
- `notes`
- `created_at`

Confirmed extra live columns:
- `org_id`
- `created_by`
- `updated_at`
- `fx_quote_id`

Implication:
- the live system links transfers to org/ownership context
- the live system likely has FX quote lineage not represented in the repo baseline

### `public.transfer_payments`

Repo baseline expected:
- `id`
- `transfer_id`
- `amount_rub`
- `payment_method`
- `note`
- `paid_at`
- `created_at`

Confirmed extra live columns:
- `org_id`
- `created_by`

Implication:
- payment rows are tenant/ownership-aware in live

### Tables and views missing from repo baseline

Confirmed live but not represented in repo schema snapshot:
- `public.organizations`
- `public.user_profiles`
- `public.transfer_balances`
- `public.fx_quotes`
- `public.audit_logs`

Important note:
- the current frontend does not directly query most of these objects
- however, their existence proves the live database is ahead of the repo snapshot

## Confirmed Live API Surface Differences vs Repo Documentation

Live OpenAPI shows these business-table paths:
- `/customers`
- `/transfers`
- `/transfer_payments`
- `/organizations`
- `/transfer_balances`

Live OpenAPI also shows these methods on business tables:
- `get`
- `post`
- `patch`
- `delete`

What this means:
- table-level REST exposure exists for more than the current frontend uses
- it does not prove row-level access succeeds for anonymous or authenticated callers
- it does indicate that live grants/RLS should be exported before repo policies are written

## Sampled Row Visibility Result

Sampled anonymous-role requests with `limit=1` returned zero rows for:
- `customers`
- `transfers`
- `transfer_payments`
- `organizations`
- `transfer_balances`

Interpretation:
- this does not prove the tables are empty
- this does not prove RLS is correct
- it only proves that the anon-key request used here did not see rows in the sampled queries

## What Could Not Be Confirmed Live From This Environment

Not confirmed:
- exact PostgreSQL types
- nullability beyond what the OpenAPI surface implies
- foreign-key definitions
- index definitions
- trigger definitions
- function bodies
- RLS predicates
- table grants and routine grants
- whether `next_transfer_reference_number(...)` in live matches the repo implementation exactly
- whether `refresh_transfer_status` and `rls_auto_enable` are safe or legacy-only

## Risk If Repo Alignment Is Done Blindly

High-risk mistakes right now would be:
- committing base migrations that omit `org_id`, `created_by`, `updated_at`, `is_active`, or `fx_quote_id`
- assuming there is no tenant model because the current frontend does not use org tables directly
- writing guessed RLS policies without exporting the live policy SQL
- treating `supabase/baselines/current_app_contract_snapshot.sql` as production-safe DDL
- "repairing" migration history before capturing the live database as the source of truth

## Comparison Conclusion

The repo baseline was directionally correct for the current frontend contract, but the live database is confirmed to be broader and more tenant-aware than the repo represented.

The most important confirmed live-vs-repo gaps are:
- tenant columns on all main business tables
- `organizations` and `user_profiles`
- `transfer_balances`
- additional live RPC endpoints

This means repo alignment should proceed from a live export first, not from guessed migrations.
