# Supabase Schema Baseline

Date: 2026-03-13

Purpose:
- Define the database contract the current frontend already expects.
- Capture the server-side reference-number and payment-lock logic currently present in the repo.
- Reconstruct a conservative baseline without changing working UI behavior.

Important:
- This is a compatibility baseline, not proof of the live database state.
- The repo does not contain the original base schema migrations.
- If the live database differs, the live database wins and the repo should be aligned to it deliberately.

## Scope

Tables used by the current frontend:
- `public.customers`
- `public.transfers`
- `public.transfer_payments`

Server-side support table already implied by the existing migration:
- `public.transfer_reference_counters`

Tables not used by the current frontend:
- `public.organizations`
- `public.user_profiles`

Auth dependency:
- The app depends on Supabase Auth session state.
- It does not query `auth.users` directly from page code.

## Frontend Expectation Matrix

### `public.customers`

Used by:
- customer list page
- customer details page
- new transfer page
- dashboard customer lookup

Required columns:
- `id`
  - frontend treats this as an opaque string identifier
  - UUID is the safest reconstructed baseline type
- `full_name`
  - required by customer creation and customer selectors
- `phone`
  - optional
- `notes`
  - optional
- `created_at`
  - required for customer details display

Required behaviors:
- selectable as full rows
- insertable with `full_name`, `phone`, `notes`
- countable with `select('*', { count: 'exact', head: true })`

Recommended baseline shape:
- `id uuid primary key default gen_random_uuid()`
- `full_name text not null`
- `phone text null`
- `notes text null`
- `created_at timestamptz not null default timezone('utc', now())`

Recommended baseline indexes:
- primary key on `id`
- index on `full_name`
- index on `created_at desc`

### `public.transfers`

Used by:
- dashboard
- transfer list
- customer details page
- new transfer page
- transfer details page
- printable transfer statement

Required columns:
- `id`
  - opaque identifier in the UI
- `reference_number`
  - professional transfer reference
- `customer_id`
  - relation to `public.customers.id`
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

Required behaviors:
- insertable without manually supplying `reference_number`
- selectable for list/detail views
- filterable by `status`
- orderable by `created_at`
- joinable to customer by `customer_id`

Recommended baseline shape:
- `id uuid primary key default gen_random_uuid()`
- `reference_number text not null`
- `customer_id uuid not null references public.customers(id) on delete restrict`
- `usdt_amount numeric(18,8) not null`
- `market_rate numeric(18,6) not null`
- `client_rate numeric(18,6) not null`
- `pricing_mode text not null default 'hybrid'`
- `commission_pct numeric(18,6) not null default 0`
- `commission_rub numeric(18,2) not null default 0`
- `gross_rub numeric(18,2) not null`
- `payable_rub numeric(18,2) not null`
- `status text not null default 'open'`
- `notes text null`
- `created_at timestamptz not null default timezone('utc', now())`

Compatibility notes:
- The current UI recognizes these transfer statuses:
  - `open`
  - `partial`
  - `partially_paid`
  - `paid`
  - `cancelled`
  - `canceled`
- Do not convert this column to a strict enum in the repo until live data is reviewed.
- The current UI always writes `pricing_mode = 'hybrid'`, but legacy rows may contain other values.

Required baseline indexes and constraints:
- primary key on `id`
- unique index or constraint on `reference_number`
- format check for `reference_number` matching `TR-YYYY-NNNN+`
- index on `customer_id`
- index on `created_at desc`
- index on `status`
- index on `(customer_id, created_at desc)`

### `public.transfer_payments`

Used by:
- dashboard
- customer details totals
- transfer details page
- printable transfer statement

Required columns:
- `id`
- `transfer_id`
- `amount_rub`
- `payment_method`
- `note`
- `paid_at`
- `created_at`

Required behaviors:
- insertable from transfer details page
- selectable by `transfer_id`
- orderable by `paid_at desc`, then `created_at desc`
- aggregatable by `transfer_id`

Recommended baseline shape:
- `id uuid primary key default gen_random_uuid()`
- `transfer_id uuid not null references public.transfers(id) on delete restrict`
- `amount_rub numeric(18,2) not null`
- `payment_method text not null`
- `note text null`
- `paid_at timestamptz not null default timezone('utc', now())`
- `created_at timestamptz not null default timezone('utc', now())`

Compatibility notes:
- The current UI offers these payment methods:
  - `Sberbank`
  - `Tinkoff`
  - `VTB`
  - `Alfa Bank`
  - `Raiffeisen`
  - `Cash`
  - `Other bank`
- Do not enforce this list in a database enum or strict check until live data is reviewed.
- The frontend does not explicitly send `paid_at`, so a default is strongly recommended.

Recommended baseline indexes:
- primary key on `id`
- index on `transfer_id`
- index on `(transfer_id, paid_at desc, created_at desc)`

### `public.transfer_reference_counters`

Used by:
- transfer reference-number generation only

Required columns:
- `reference_year integer primary key`
- `last_number integer not null default 0`
- `updated_at timestamptz not null default timezone('utc', now())`

## Required Functions and Triggers

The current repo already contains these database functions and triggers.

### `public.format_transfer_reference_number(reference_year integer, reference_sequence integer)`

Purpose:
- Format reference values as `TR-YYYY-NNNN`.

Security:
- `language sql`
- `immutable`
- not `security definer`

### `public.next_transfer_reference_number(reference_timestamp timestamptz)`

Purpose:
- Increment the yearly counter safely and return the next formatted reference number.

Security:
- `language plpgsql`
- `security definer`
- `set search_path = public`

Why it matters:
- Prevents duplicate references under concurrent inserts.

### `public.assign_transfer_reference_number()`

Purpose:
- Insert trigger function that assigns `reference_number` when the insert payload does not provide one.

Security:
- `language plpgsql`
- `security definer`
- `set search_path = public`

Trigger:
- `set_transfer_reference_number`
- `before insert on public.transfers`

### `public.prevent_transfer_reference_number_change()`

Purpose:
- Prevent later edits to `reference_number`.

Security:
- `language plpgsql`
- `security definer`
- `set search_path = public`

Trigger:
- `protect_transfer_reference_number`
- `before update of reference_number on public.transfers`

### `public.lock_transfer_core_fields_after_payment()`

Purpose:
- Prevent changes to core transfer commercial fields once any payment exists for the transfer.

Blocked fields:
- `customer_id`
- `usdt_amount`
- `market_rate`
- `client_rate`
- `pricing_mode`
- `commission_pct`
- `commission_rub`
- `gross_rub`
- `payable_rub`

Security:
- `language plpgsql`
- `security definer`
- `set search_path = public`

Trigger:
- `lock_transfer_core_fields_after_payment`
- `before update on public.transfers`

## Required Reference-Number Rules

Current repo baseline:
- prefix is `TR`
- year comes from `created_at` if present, otherwise current UTC timestamp
- sequence is zero-padded to at least 4 digits
- references must be unique
- references are immutable after assignment
- missing historical references are backfilled

## Dashboard Query Contract

The dashboard currently depends on these query capabilities:
- count `public.customers`
- select from `public.transfers`:
  - `id`
  - `reference_number`
  - `customer_id`
  - `status`
  - `payable_rub`
  - `created_at`
- select from `public.transfer_payments`:
  - `transfer_id`
  - `amount_rub`
- select customer names from `public.customers`:
  - `id`
  - `full_name`

There is no separate reporting table, view, materialized view, or RPC in the current repo.

## Print-Related Field Contract

The printable transfer statement currently depends on:
- `transfers.reference_number`
- `transfers.id`
- `transfers.status`
- `transfers.notes`
- `transfers.usdt_amount`
- `transfers.market_rate`
- `transfers.client_rate`
- `transfers.commission_pct`
- `transfers.gross_rub`
- `transfers.payable_rub`
- `transfers.created_at`
- `customers.full_name`
- `transfer_payments.amount_rub`
- `transfer_payments.payment_method`
- `transfer_payments.note`
- `transfer_payments.paid_at`
- `transfer_payments.created_at`

There are no print-specific database tables or print-only columns in the current repo.

## Authoritative Contract Recommendation

For repo alignment purposes, the authoritative contract should be:
- `customers`, `transfers`, and `transfer_payments` remain the only business tables required by the current frontend
- no `organizations` or `user_profiles` table should be introduced in repo migrations unless confirmed from the live database
- `reference_number` remains server-generated and immutable
- `paid_at` should exist and default server-side
- transfer status should remain a text compatibility field until live data is standardized
- payment method should remain free text at the database level until live data is reviewed

## Reference Snapshot

The repo now includes a non-migration snapshot file:
- `supabase/baselines/current_app_contract_snapshot.sql`

Use it as:
- a comparison target
- a schema review artifact
- a starting point for reconstructing missing migrations

Do not use it as:
- an automatically applied migration
- a blind production bootstrap script
