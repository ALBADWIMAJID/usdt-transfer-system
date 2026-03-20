-- Current app contract snapshot
-- Date: 2026-03-13
--
-- Purpose:
-- - Reconstruct the schema the current frontend expects.
-- - Provide a comparison artifact for live-schema alignment work.
--
-- Important:
-- - This file is NOT part of the migration chain.
-- - Do NOT apply this file blindly to a live database.
-- - RLS policies are intentionally omitted because the repo does not contain the
--   authoritative tenancy model or live policy predicates.
--
-- Notes on confidence:
-- - Table and column names come from the frontend and the existing migration.
-- - UUID primary keys and pgcrypto defaults are the safest reconstructed baseline,
--   but the live database should be treated as authoritative if it differs.
-- - Status and payment_method remain text fields here to preserve current
--   compatibility and avoid over-constraining unknown live data.

create extension if not exists pgcrypto;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  notes text,
  is_archived boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists customers_full_name_idx
on public.customers (full_name);

create index if not exists customers_is_archived_full_name_idx
on public.customers (is_archived, full_name);

create index if not exists customers_created_at_idx
on public.customers (created_at desc);

create table if not exists public.transfers (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  reference_number text not null,
  usdt_amount numeric(18,8) not null,
  market_rate numeric(18,6) not null,
  client_rate numeric(18,6) not null,
  pricing_mode text not null default 'hybrid',
  commission_pct numeric(18,6) not null default 0,
  commission_rub numeric(18,2) not null default 0,
  gross_rub numeric(18,2) not null,
  payable_rub numeric(18,2) not null,
  status text not null default 'open',
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint transfers_reference_number_format_check
    check (reference_number ~ '^TR-\d{4}-\d{4,}$')
);

create unique index if not exists transfers_reference_number_key
on public.transfers (reference_number);

create index if not exists transfers_customer_id_idx
on public.transfers (customer_id);

create index if not exists transfers_status_idx
on public.transfers (status);

create index if not exists transfers_created_at_idx
on public.transfers (created_at desc);

create index if not exists transfers_customer_created_at_idx
on public.transfers (customer_id, created_at desc);

create table if not exists public.transfer_payments (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null references public.transfers(id) on delete restrict,
  amount_rub numeric(18,2) not null,
  payment_method text not null,
  note text,
  paid_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists transfer_payments_transfer_id_idx
on public.transfer_payments (transfer_id);

create index if not exists transfer_payments_transfer_paid_created_idx
on public.transfer_payments (transfer_id, paid_at desc, created_at desc);

create table if not exists public.transfer_reference_counters (
  reference_year integer primary key,
  last_number integer not null default 0,
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.format_transfer_reference_number(
  reference_year integer,
  reference_sequence integer
)
returns text
language sql
immutable
as $$
  select format('TR-%s-%s', reference_year, lpad(reference_sequence::text, 4, '0'));
$$;

create or replace function public.next_transfer_reference_number(reference_timestamp timestamptz)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  next_reference_year integer :=
    extract(year from coalesce(reference_timestamp, timezone('utc', now())))::integer;
  next_number integer;
begin
  insert into public.transfer_reference_counters (reference_year, last_number)
  values (next_reference_year, 1)
  on conflict (reference_year)
  do update
    set last_number = public.transfer_reference_counters.last_number + 1,
        updated_at = timezone('utc', now())
  returning last_number into next_number;

  return public.format_transfer_reference_number(next_reference_year, next_number);
end;
$$;

create or replace function public.assign_transfer_reference_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(trim(new.reference_number), '') = '' then
    new.reference_number :=
      public.next_transfer_reference_number(coalesce(new.created_at, timezone('utc', now())));
  end if;

  return new;
end;
$$;

drop trigger if exists set_transfer_reference_number on public.transfers;

create trigger set_transfer_reference_number
before insert on public.transfers
for each row
execute function public.assign_transfer_reference_number();

create or replace function public.prevent_transfer_reference_number_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.reference_number is distinct from old.reference_number then
    raise exception 'Transfer reference numbers are immutable once assigned.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_transfer_reference_number on public.transfers;

create trigger protect_transfer_reference_number
before update of reference_number on public.transfers
for each row
when (old.reference_number is distinct from new.reference_number)
execute function public.prevent_transfer_reference_number_change();

create or replace function public.lock_transfer_core_fields_after_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.transfer_payments
    where transfer_id = old.id
  ) then
    if new.customer_id is distinct from old.customer_id
      or new.usdt_amount is distinct from old.usdt_amount
      or new.market_rate is distinct from old.market_rate
      or new.client_rate is distinct from old.client_rate
      or new.pricing_mode is distinct from old.pricing_mode
      or new.commission_pct is distinct from old.commission_pct
      or new.commission_rub is distinct from old.commission_rub
      or new.gross_rub is distinct from old.gross_rub
      or new.payable_rub is distinct from old.payable_rub then
      raise exception 'Core transfer fields are locked after payments exist for this transfer.'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists lock_transfer_core_fields_after_payment on public.transfers;

create trigger lock_transfer_core_fields_after_payment
before update on public.transfers
for each row
execute function public.lock_transfer_core_fields_after_payment();
