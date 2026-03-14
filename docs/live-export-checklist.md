# Live Export Checklist

Date: 2026-03-13

Purpose:
- Define the minimum artifacts still needed from the live Supabase project to align git safely.
- Avoid guessing missing schema, indexes, triggers, or RLS.

## What This Environment Already Confirmed

Confirmed from live OpenAPI:
- relevant table and view names
- relevant RPC names
- visible column names for key relations
- evidence of tenant-aware columns such as `org_id` and `created_by`

Still required from a privileged export:
- exact column types
- defaults
- foreign keys
- indexes
- trigger definitions
- function bodies
- grants
- RLS policy SQL

## Minimum Required Live Artifacts

1. Schema DDL snapshot for relevant public objects
- `customers`
- `transfers`
- `transfer_payments`
- `transfer_reference_counters`
- `organizations`
- `user_profiles`
- `transfer_balances`
- `fx_quotes`
- any functions referenced by these objects

2. Index export
- all indexes on the tables above

3. Trigger export
- all non-internal triggers on:
  - `transfers`
  - `transfer_payments`
  - `customers`

4. Function export
- `format_transfer_reference_number`
- `next_transfer_reference_number`
- `assign_transfer_reference_number`
- `prevent_transfer_reference_number_change`
- `lock_transfer_core_fields_after_payment`
- `current_org_id`
- `refresh_transfer_status`
- `rls_auto_enable`
- any function referenced by triggers or views above

5. Policy export
- all rows from `pg_policies` for:
  - `customers`
  - `transfers`
  - `transfer_payments`
  - `organizations`
  - `user_profiles`
  - `transfer_reference_counters`

6. Grant export
- table grants for the objects above
- routine grants for the functions above

## Safest Ways To Capture The Live Database

Preferred:
1. Use Supabase CLI linked to the real project and run `supabase db pull`.
2. Run the read-only query pack in `supabase/baselines/live_metadata_export_queries.sql`.
3. Commit the outputs as dated baseline artifacts, not migrations.

Fallback:
1. Use Supabase SQL editor with the read-only query pack.
2. Save the results to files in the repo.

## Recommended Artifact Names

When the live export is captured, store it as:
- `supabase/baselines/live_schema_pull_YYYYMMDD.sql`
- `supabase/baselines/live_metadata_export_YYYYMMDD.md` or `.json`

Do not store the first live export as:
- a migration under `supabase/migrations`

## Comparison Sequence

After the live export is captured:
1. compare it to `docs/supabase-schema-baseline.md`
2. compare it to `docs/supabase-rls-baseline.md`
3. compare it to `supabase/baselines/current_app_contract_snapshot.sql`
4. compare it to `docs/live-vs-repo-comparison.md`
5. produce a reconciliation list:
   - keep as-is
   - add to repo baseline
   - document only
   - migrate later

## What Not To Do

Do not:
- create guessed base migrations before the live export exists
- remove live-only columns because the current frontend does not use them
- create guessed tenant tables or guessed tenant policies
- apply the repo snapshot file to the live database

## Safe Alignment Strategy

The safest repo-alignment strategy is:
- live export first
- snapshot comparison second
- staged migration authoring last

That means:
- `db pull` or equivalent schema capture is safer than migration repair right now
- documentation plus snapshots should lead migrations, not the other way around
