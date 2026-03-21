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

create table if not exists public.transfer_payment_voids (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.transfer_payments(id) on delete restrict,
  transfer_id uuid not null references public.transfers(id) on delete restrict,
  -- Live tenant alignment hardening: org-scoped child rows derive org from the parent transfer/payment chain.
  org_id uuid not null,
  void_reason_type text not null,
  note text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists transfer_payment_voids_payment_id_key
on public.transfer_payment_voids (payment_id);

create index if not exists transfer_payment_voids_org_id_idx
on public.transfer_payment_voids (org_id);

create index if not exists transfer_payment_voids_transfer_created_idx
on public.transfer_payment_voids (transfer_id, created_at desc);

create table if not exists public.transfer_overpayment_resolutions (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null references public.transfers(id) on delete restrict,
  -- Live tenant alignment hardening: org-scoped child rows derive org from the parent transfer.
  org_id uuid not null,
  resolution_type text not null,
  resolved_overpaid_amount_rub numeric(18,2) not null,
  note text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists transfer_overpayment_resolutions_org_id_idx
on public.transfer_overpayment_resolutions (org_id);

create index if not exists transfer_overpayment_resolutions_transfer_created_idx
on public.transfer_overpayment_resolutions (transfer_id, created_at desc);

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

-- Active-payment truth:
-- - a confirmed payment counts only when no row exists in public.transfer_payment_voids for that payment_id
-- - DB-level balances and status refresh must match the app's confirmed-vs-voided payment model

create or replace view public.transfer_balances as
select
  t.id,
  t.org_id,
  t.customer_id,
  t.usdt_amount,
  t.market_rate,
  t.client_rate,
  t.pricing_mode,
  t.commission_pct,
  t.commission_rub,
  t.gross_rub,
  t.payable_rub,
  coalesce(sum(tp.amount_rub), 0)::numeric(18,2) as paid_rub,
  (t.payable_rub - coalesce(sum(tp.amount_rub), 0))::numeric(18,2) as remaining_rub,
  t.status,
  t.created_at,
  t.updated_at
from public.transfers t
left join public.transfer_payments tp
  on tp.transfer_id = t.id
 and not exists (
   select 1
   from public.transfer_payment_voids tpv
   where tpv.payment_id = tp.id
 )
group by t.id;

create or replace function public.refresh_transfer_status(p_transfer_id uuid)
returns void
language plpgsql
as $$
declare
  v_payable numeric(18,2);
  v_paid numeric(18,2);
begin
  select payable_rub
  into v_payable
  from public.transfers
  where id = p_transfer_id;

  select coalesce(sum(tp.amount_rub), 0)::numeric(18,2)
  into v_paid
  from public.transfer_payments tp
  where tp.transfer_id = p_transfer_id
    and not exists (
      select 1
      from public.transfer_payment_voids tpv
      where tpv.payment_id = tp.id
    );

  update public.transfers
  set status = case
    when v_paid <= 0 then 'open'
    when v_paid < v_payable then 'partial'
    else 'paid'
  end,
  updated_at = now()
  where id = p_transfer_id;
end;
$$;

create or replace function public.after_payment_void_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.refresh_transfer_status(new.transfer_id);
    return new;
  end if;

  if tg_op = 'DELETE' then
    perform public.refresh_transfer_status(old.transfer_id);
    return old;
  end if;

  if tg_op = 'UPDATE' then
    perform public.refresh_transfer_status(old.transfer_id);

    if new.transfer_id is distinct from old.transfer_id then
      perform public.refresh_transfer_status(new.transfer_id);
    end if;

    return new;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_transfer_payment_voids_refresh_status_ins on public.transfer_payment_voids;

create trigger trg_transfer_payment_voids_refresh_status_ins
after insert on public.transfer_payment_voids
for each row
execute function public.after_payment_void_mutation();

drop trigger if exists trg_transfer_payment_voids_refresh_status_del on public.transfer_payment_voids;

create trigger trg_transfer_payment_voids_refresh_status_del
after delete on public.transfer_payment_voids
for each row
execute function public.after_payment_void_mutation();

drop trigger if exists trg_transfer_payment_voids_refresh_status_upd on public.transfer_payment_voids;

create trigger trg_transfer_payment_voids_refresh_status_upd
after update of payment_id, transfer_id on public.transfer_payment_voids
for each row
execute function public.after_payment_void_mutation();
