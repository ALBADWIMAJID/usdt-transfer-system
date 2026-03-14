create table if not exists public.transfer_reference_counters (
  reference_year integer primary key,
  last_number integer not null default 0,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.transfers
add column if not exists reference_number text;

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

with candidate_references as (
  select
    t.id,
    t.reference_number,
    extract(year from coalesce(t.created_at, timezone('utc', now())))::integer as reference_year,
    coalesce(t.created_at, timezone('utc', now())) as reference_created_at,
    regexp_match(coalesce(t.reference_number, ''), '^TR-(\d{4})-(\d{4,})$') as reference_match,
    row_number() over (
      partition by t.reference_number
      order by coalesce(t.created_at, timezone('utc', now())), t.id
    ) as reference_rank
  from public.transfers t
),
existing_sequences as (
  select
    (reference_match)[1]::integer as reference_year,
    max((reference_match)[2]::integer) as last_number
  from candidate_references
  where reference_match is not null
    and reference_rank = 1
  group by 1
),
transfers_to_backfill as (
  select
    c.id,
    c.reference_year,
    row_number() over (
      partition by c.reference_year
      order by c.reference_created_at, c.id
    ) as row_offset
  from candidate_references c
  where coalesce(trim(c.reference_number), '') = ''
    or c.reference_match is null
    or c.reference_rank > 1
),
assigned_references as (
  select
    b.id,
    public.format_transfer_reference_number(
      b.reference_year,
      coalesce(e.last_number, 0) + b.row_offset
    ) as reference_number
  from transfers_to_backfill b
  left join existing_sequences e
    on e.reference_year = b.reference_year
)
update public.transfers t
set reference_number = assigned_references.reference_number
from assigned_references
where t.id = assigned_references.id;

insert into public.transfer_reference_counters (reference_year, last_number)
select
  (reference_match)[1]::integer as reference_year,
  max((reference_match)[2]::integer) as last_number
from (
  select regexp_match(reference_number, '^TR-(\d{4})-(\d{4,})$') as reference_match
  from public.transfers
) existing_references
where reference_match is not null
group by 1
on conflict (reference_year)
do update
set last_number = greatest(public.transfer_reference_counters.last_number, excluded.last_number),
    updated_at = timezone('utc', now());

create unique index if not exists transfers_reference_number_key
on public.transfers (reference_number);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'transfers_reference_number_format_check'
      and conrelid = 'public.transfers'::regclass
  ) then
    alter table public.transfers
    add constraint transfers_reference_number_format_check
    check (reference_number ~ '^TR-\d{4}-\d{4,}$');
  end if;
end;
$$;

alter table public.transfers
alter column reference_number set not null;

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
