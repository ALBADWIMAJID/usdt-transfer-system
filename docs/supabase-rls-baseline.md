# Supabase RLS Baseline

Date: 2026-03-13

Purpose:
- Define what the current frontend requires from row-level security.
- Separate minimum functional policy behavior from the missing tenant-model source of truth.
- Avoid inventing risky policy predicates that the repo cannot verify.

Important:
- The repo does not contain the original RLS policies.
- The repo does not contain `organizations` or `user_profiles` tables.
- The current frontend does not attach organization IDs or owner IDs when inserting rows.

## Current Frontend RLS Expectations

### `public.customers`

Current UI actions:
- select customer list
- select one customer by `id`
- insert customer rows
- count customer rows

Current UI does not require:
- update
- delete

Minimum policy behavior required:
- authenticated users can `select`
- authenticated users can `insert`

### `public.transfers`

Current UI actions:
- select transfer list
- select one transfer by `id`
- insert new transfer rows

Current UI does not require:
- update
- delete

Minimum policy behavior required:
- authenticated users can `select`
- authenticated users can `insert`

Important note:
- Future edit workflows would require `update`, but the current UI does not.

### `public.transfer_payments`

Current UI actions:
- select payments by `transfer_id`
- insert payment rows
- aggregate payment rows for dashboard and customer totals

Current UI does not require:
- update
- delete

Minimum policy behavior required:
- authenticated users can `select`
- authenticated users can `insert`

## What the Repo Cannot Safely Infer

The repo cannot safely infer:
- whether data is shared across all authenticated operators
- whether data is scoped by organization
- whether data is scoped by user profile
- whether there is a hidden ownership column not used by the frontend

Because of that, the repo cannot safely author an "authoritative" tenant predicate yet.

## Safe RLS Baseline Position

The safest current position is:
- document the minimum policy behaviors required by the UI
- do not create a guessed executable RLS migration in the repo
- first export the live database policy definitions and compare them against this baseline

## Functional Policy Matrix

For the current app to work, the effective RLS policy result must allow:

| Table | Select | Insert | Update | Delete |
| --- | --- | --- | --- | --- |
| `public.customers` | required | required | not required by current UI | not required by current UI |
| `public.transfers` | required | required | not required by current UI | not required by current UI |
| `public.transfer_payments` | required | required | not required by current UI | not required by current UI |

## Shared-Workspace vs Tenant-Scoped Modes

### Mode A: Shared authenticated workspace

Meaning:
- every authenticated operator can see and insert the same business data

If this is the intended live model:
- simple authenticated `select` and `insert` policies are enough for the current UI
- `update` and `delete` can remain disabled until explicitly needed

Risk:
- overly permissive if the real business model is tenant-scoped

### Mode B: Tenant-scoped workspace

Meaning:
- each operator should only see data for their organization or assigned scope

If this is the intended live model:
- the repo is missing the source-of-truth columns and tables needed to express safe predicates
- likely missing objects include:
  - `public.organizations`
  - `public.user_profiles`
  - row ownership or organization foreign keys on business tables

Risk:
- any guessed RLS migration would likely drift from production and could either break access or weaken isolation

## Security-Definer Function Notes

The existing migration contains these `security definer` functions:
- `public.next_transfer_reference_number(...)`
- `public.assign_transfer_reference_number()`
- `public.prevent_transfer_reference_number_change()`
- `public.lock_transfer_core_fields_after_payment()`

Safe characteristics already present:
- each function sets `search_path = public`
- each function is used by triggers, not by frontend RPC calls

Operational guidance:
- keep ownership of these functions under a trusted database role
- do not expose them as callable RPC endpoints without explicit review
- if future migrations change them, keep their scope narrow and deterministic

## Recommended Baseline for Repo Documentation

The repo should treat the current RLS source of truth as:
- unknown but required
- not safe to reconstruct from frontend code alone

The repo should record:
- minimum policy behaviors the UI depends on
- whether the live system is shared-workspace or tenant-scoped
- exported live policy SQL once it is captured

## What To Do Next

Before creating any executable RLS migration:
1. export the live policy definitions from Supabase
2. confirm whether the real tenancy model is shared or scoped
3. compare live predicates to the current frontend insert/select behavior
4. only then commit repo RLS migrations that match the live system
