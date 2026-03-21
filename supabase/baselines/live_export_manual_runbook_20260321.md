# Live Export Manual Runbook

Date: 2026-03-21

Purpose:
- Provide the exact next manual steps for capturing the authoritative live tenant baseline when this repo is opened
  in a privileged environment.
- Avoid guessed migrations or guessed RLS implementation when direct export is not possible in the current shell.

Status:
- Prepared because the current environment did not have Supabase CLI or a linked privileged project session.
- No authoritative live schema or RLS export was captured by this file.

## Expected Output Files

When the export is run successfully, save the outputs as:
- `supabase/baselines/live_schema_pull_20260321.sql`
- `supabase/baselines/live_rls_export_20260321.sql`
- `supabase/baselines/live_metadata_export_20260321.md`

If you rerun later on a different date, replace the date suffix consistently.

## Option A: Supabase CLI + Linked Project

Preconditions:
- Supabase CLI installed
- authenticated CLI session
- correct live project reference available
- permission to pull schema from the live project

Suggested commands:

```powershell
supabase login
supabase link --project-ref <PROJECT_REF>
supabase db pull --linked -f "supabase/baselines/live_schema_pull_20260321.sql"
```

Notes:
- use the real live project ref
- do not save the first authoritative pull under `supabase/migrations/`
- keep the pulled file as a baseline artifact first

## Option B: Privileged SQL Editor Or psql Export

Use the updated query pack:
- `supabase/baselines/live_metadata_export_queries.sql`

Suggested `psql`-style command with a privileged connection string:

```powershell
psql "<PRIVILEGED_CONNECTION_STRING>" -f "supabase/baselines/live_metadata_export_queries.sql" > "supabase/baselines/live_metadata_export_20260321.md"
```

If using Supabase SQL editor instead:
1. open the live project SQL editor
2. run the full contents of `supabase/baselines/live_metadata_export_queries.sql`
3. save the result grids or exported text into `supabase/baselines/live_metadata_export_20260321.md`

## Focused RLS Export

If the schema pull does not capture RLS clearly, run this separately from a privileged SQL environment and save it as:
- `supabase/baselines/live_rls_export_20260321.sql`

Recommended query:

```sql
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

Also export RLS-enabled flags:

```sql
select
  n.nspname as table_schema,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n
  on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by c.relname;
```

## Required Review Checklist After Export

Once the export files exist:
1. compare them to `docs/live-vs-repo-comparison.md`
2. compare them to `docs/supabase-schema-baseline.md`
3. compare them to `docs/supabase-rls-baseline.md`
4. compare them to `supabase/baselines/current_app_contract_snapshot.sql`
5. compare them to `docs/multi-company-live-reconciliation.md`
6. update any remaining unknowns in the reconciliation document with exported facts

## Stop Conditions

Do not start executable multi-company implementation if any of these are still unknown after export:
- exact membership representation
- exact `current_org_id()` or equivalent helper behavior
- exact business-table RLS predicates
- exact org-consistency defaults/triggers/constraints for parent-child rows
- whether `transfer_payment_voids` and `transfer_overpayment_resolutions` are tenant-aware in live

## Important Reminders

- Do not invent tenant migrations from this runbook.
- Do not treat manual export output as a migration.
- Do not weaken security by replacing missing facts with guessed policy logic.
