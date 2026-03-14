# Migration State Assessment

Date: 2026-03-13

## Current Repo State

What exists in versioned SQL:
- one additive migration:
  - `supabase/migrations/20260313_add_transfer_reference_numbers_and_payment_lock.sql`

What does not exist in versioned SQL:
- original `public.customers` table creation
- original `public.transfers` table creation
- original `public.transfer_payments` table creation
- original indexes and foreign keys for those tables
- original RLS policies

## What The Existing Migration Covers

The current migration adds or maintains:
- `public.transfer_reference_counters`
- `public.transfers.reference_number`
- reference-number formatter/generator functions
- insert trigger for automatic transfer reference-number assignment
- backfill for missing/invalid/duplicate transfer references
- unique/index/check/not-null enforcement for `reference_number`
- immutability trigger for transfer references
- payment-lock trigger for core transfer fields after payments exist

## What The Existing Migration Does Not Cover

It does not prove:
- the live base column types
- the live primary-key types
- the live foreign-key delete behavior
- the live RLS model
- the live policy predicates
- the live status-domain contract
- the live payment-method domain contract

## Migration-History Risk

Risk level: high

Reason:
- the repo cannot recreate the full database from scratch
- the repo cannot prove that the live database matches the current frontend assumptions
- adding guessed base migrations directly into `supabase/migrations` could create destructive drift

Typical failure modes if handled incorrectly:
- duplicate-object migrations on environments that already have the schema
- incorrect RLS that breaks operator access
- incorrect column types or constraints that reject existing data
- incorrect foreign keys or cascade rules
- schema history that looks complete in git but does not match production reality

## Why A Snapshot Approach Is Safer Than Editing Old Migrations

Safest current approach:
- create a schema baseline document
- create an RLS baseline document
- create a non-migration SQL snapshot file
- compare all of that against the live database before authoring executable base migrations

Why:
- it is non-destructive
- it does not pretend the repo already knows the live truth
- it gives future work a stable reference without rewriting history

## Safe Path To Align Repo And Live Database

Recommended order:
1. Export the live schema for the relevant public tables and functions.
2. Export the live RLS policies.
3. Compare the exports to:
   - `docs/supabase-schema-baseline.md`
   - `docs/supabase-rls-baseline.md`
   - `supabase/baselines/current_app_contract_snapshot.sql`
4. Record the live-vs-repo differences explicitly.
5. Only after that, decide whether to:
   - add a true base migration chain for new environments
   - add narrow corrective migrations for live environments
   - or keep the snapshot as the source-of-truth reference until a controlled rebuild window exists

## What Should Not Be Done Yet

Do not:
- edit the existing additive migration to pretend it is a full baseline
- add guessed organization or user-profile tables
- add guessed tenant-scoped RLS predicates
- enforce a new enum for `status` or `payment_method` without live data review
- run the snapshot SQL blindly against a live project

## Recommended Repo Baseline Position

Current repo position should be:
- migration history is incomplete
- schema contract is now documented
- RLS contract is now documented at the behavior level
- live schema export is still required before executable baseline migrations are made authoritative
