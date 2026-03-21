# Multi-Company Live Export Checklist

Date: 2026-03-21

Purpose:
- Define exactly what must be exported or confirmed from the live Supabase project before executable multi-company
  implementation begins.
- Prevent guessed tenant migrations, guessed policy predicates, or guessed helper behavior from entering the repo.

Important:
- This checklist is more specific than the earlier generic live-export checklist because it is scoped to the
  multi-company rollout.
- The first authoritative capture should be stored as baseline artifacts, not as migrations.

## Phase B Goal

Before executable multi-company work starts, the repo must capture or confirm:
- the authoritative live tenant table definitions
- the authoritative live tenant-related business columns
- the live helper functions used for current-org resolution or policy support
- the live membership representation
- the live RLS policy SQL
- the live tenant-aware defaults, triggers, and views that matter to the current app

## Minimum Required Live Objects

### Required table definitions
Export schema DDL for:
- `public.organizations`
- `public.user_profiles`
- the live membership table if one exists separately
- `public.customers`
- `public.transfers`
- `public.transfer_payments`
- `public.transfer_payment_voids`
- `public.transfer_overpayment_resolutions`
- `public.transfer_reference_counters`

### Required views
Export schema DDL for:
- `public.transfer_balances`
- any other operational view that already exposes tenant-scoped business data

### Required helper functions and routines
Export definitions for:
- `public.current_org_id()`
- `public.next_transfer_reference_number(...)`
- `public.format_transfer_reference_number(...)`
- `public.assign_transfer_reference_number()`
- `public.prevent_transfer_reference_number_change()`
- `public.lock_transfer_core_fields_after_payment()`
- `public.refresh_transfer_status(...)`
- `public.rls_auto_enable(...)`
- any function referenced by triggers, defaults, views, or policies on the objects above

## Exact Things To Confirm Per Object

### For tenant root / profile / membership objects
Confirm:
- exact table names
- primary keys
- foreign keys to `auth.users` or other public tables
- role/status columns
- whether active/default organization is stored on profile, membership, or both
- whether membership is its own table or encoded directly in `user_profiles`

### For business tables
Confirm exact presence, names, and types of:
- `org_id` or `organization_id`
- `created_by`
- `updated_at`
- `is_active` where applicable
- `fx_quote_id` where applicable
- any audit or ownership columns already used live

### For defaults and generated behavior
Confirm:
- whether `org_id` is defaulted automatically
- whether `created_by` is defaulted automatically
- whether child org values are derived from parent rows
- whether any current triggers enforce org consistency
- whether any current helper functions are used in defaults or policies

## Membership And Active-Org Questions That Must Be Answered From Live

The export or inspection must answer these exact questions:

1. What is the live representation of org membership?
- dedicated membership table
- profile-linked org only
- another pattern

2. How is the current org resolved live?
- `current_org_id()`
- profile field
- sole membership inference
- another helper

3. Can one user belong to multiple orgs live right now?
- yes or no
- if yes, how is the active org selected

4. What fields define whether a membership is active or inactive?

5. What fields define whether an organization is active or inactive?

## RLS Export Checklist

Before implementation starts, export authoritative RLS policy SQL or equivalent metadata for:
- `customers`
- `transfers`
- `transfer_payments`
- `transfer_payment_voids`
- `transfer_overpayment_resolutions`
- `organizations`
- `user_profiles`
- the membership table or equivalent tenant-link object
- `transfer_balances` if it is exposed under RLS-relevant access patterns

For each policy, capture:
- policy name
- permissive/restrictive mode if relevant
- command type (`select`, `insert`, `update`, `delete`, `all`)
- roles
- `using` predicate
- `with check` predicate

Also confirm:
- whether helper functions inside policies are `security definer`
- whether those helpers set `search_path`
- whether policies rely on JWT claims, profile lookups, or helper routines

## Trigger / Constraint / Index Checklist

For the tenant rollout, capture:

### Triggers
- all non-internal triggers on:
  - `customers`
  - `transfers`
  - `transfer_payments`
  - `transfer_payment_voids`
  - `transfer_overpayment_resolutions`
  - tenant/profile/membership tables

### Constraints and foreign keys
- all PK/FK definitions involving:
  - `org_id`
  - profile/user references
  - membership/org references
  - transfer/customer linkage
  - payment/transfer linkage
  - void/payment/transfer linkage
  - overpayment-resolution/transfer linkage

### Indexes
- all indexes on:
  - `org_id`
  - parent foreign keys used in operational reads
  - profile/membership lookup columns
  - current-org resolution support columns

## Current App-Specific Objects That Must Be Checked Against Live

Because this repo already uses these paths, Phase B must explicitly check tenant behavior for:
- `customers` list/detail/create/update/archive/delete flows
- `transfers` list/detail/create/update flows
- `transfer_payments` list/create flows
- `transfer_payment_voids` list/create flows
- `transfer_overpayment_resolutions` list/create flows

That means the live export must be sufficient to answer:
- how rows are scoped
- how rows are inserted
- how child rows inherit tenant context
- how current authenticated users are limited to their own company

## Practical Export Steps

Preferred:
1. run `supabase db pull` against the live project or an equivalent privileged schema export
2. run the read-only metadata query pack in `supabase/baselines/live_metadata_export_queries.sql`
3. separately export policy/grant metadata if the schema pull does not capture it clearly
4. store the first results as dated baseline artifacts under `supabase/baselines/`

Recommended artifact names:
- `supabase/baselines/live_schema_pull_YYYYMMDD.sql`
- `supabase/baselines/live_rls_export_YYYYMMDD.sql`
- `supabase/baselines/live_metadata_export_YYYYMMDD.md`

Do not store the first authoritative export as:
- a migration under `supabase/migrations`

## Comparison Checklist After Export

Once the live export exists, compare it directly against:
- `docs/live-vs-repo-comparison.md`
- `docs/supabase-schema-baseline.md`
- `docs/supabase-rls-baseline.md`
- `supabase/baselines/current_app_contract_snapshot.sql`
- `docs/multi-company-phase-a-gap-map.md`
- `docs/multi-company-target-architecture.md`

The reconciliation output should classify each item as:
- already aligned
- missing from repo baseline
- documented but not yet implemented
- requires a later migration
- requires a later app/bootstrap change

## Stop Conditions

Do not start executable tenant implementation if any of these remain unknown:
- the exact live membership representation
- the exact live `current_org_id()` or equivalent current-org resolution behavior
- the exact live RLS policy predicates for the business tables
- whether child tables already carry `org_id` and how it is enforced
- whether active/default org is resolved from profile, membership, or both

## Phase B Completion Criteria

Phase B live-baseline alignment is complete only when:
- live tenant objects are exported or authoritatively confirmed
- repo baseline artifacts reflect those live objects accurately
- the target tenant spec is reconciled to live naming and behavior
- executable migrations can be authored from evidence rather than guesswork
