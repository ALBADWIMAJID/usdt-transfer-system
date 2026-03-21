do $$
begin
  if to_regclass('public.organizations') is null then
    raise exception 'public.organizations must exist before hardening transfer_payment_voids org scope.';
  end if;

  if to_regclass('public.transfer_payments') is null then
    raise exception 'public.transfer_payments must exist before hardening transfer_payment_voids org scope.';
  end if;

  if to_regclass('public.transfers') is null then
    raise exception 'public.transfers must exist before hardening transfer_payment_voids org scope.';
  end if;

  if to_regprocedure('public.current_org_id()') is null then
    raise exception 'public.current_org_id() must exist before hardening transfer_payment_voids org scope.';
  end if;
end;
$$;

alter table public.transfer_payment_voids
add column if not exists org_id uuid;

do $$
begin
  if exists (
    select 1
    from public.transfer_payment_voids tpv
    join public.transfer_payments tp
      on tp.id = tpv.payment_id
    where tp.transfer_id is distinct from tpv.transfer_id
  ) then
    raise exception
      'transfer_payment_voids contains rows where payment_id does not belong to transfer_id; aborting org hardening.'
      using errcode = 'check_violation';
  end if;
end;
$$;

update public.transfer_payment_voids tpv
set org_id = t.org_id
from public.transfer_payments tp
join public.transfers t
  on t.id = tp.transfer_id
where tpv.payment_id = tp.id
  and tpv.transfer_id = t.id
  and tpv.org_id is distinct from t.org_id;

do $$
begin
  if exists (
    select 1
    from public.transfer_payment_voids tpv
    left join public.transfer_payments tp
      on tp.id = tpv.payment_id
    left join public.transfers t
      on t.id = tpv.transfer_id
    where tp.id is null
      or t.id is null
      or tp.org_id is null
      or t.org_id is null
      or tp.org_id is distinct from t.org_id
      or tp.transfer_id is distinct from tpv.transfer_id
      or tpv.org_id is null
      or tpv.org_id is distinct from t.org_id
  ) then
    raise exception
      'transfer_payment_voids org backfill validation failed; review parent payment/transfer linkage and org assignments.'
      using errcode = 'check_violation';
  end if;
end;
$$;

create or replace function public.set_transfer_payment_void_org_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment_transfer_id uuid;
  v_payment_org_id uuid;
  v_transfer_org_id uuid;
begin
  select transfer_id, org_id
  into v_payment_transfer_id, v_payment_org_id
  from public.transfer_payments
  where id = new.payment_id;

  if not found then
    raise exception 'Transfer payment void requires an existing parent payment.'
      using errcode = 'foreign_key_violation';
  end if;

  select org_id
  into v_transfer_org_id
  from public.transfers
  where id = new.transfer_id;

  if not found then
    raise exception 'Transfer payment void requires an existing parent transfer.'
      using errcode = 'foreign_key_violation';
  end if;

  if v_payment_transfer_id is distinct from new.transfer_id then
    raise exception 'Transfer payment void payment_id must belong to the supplied transfer_id.'
      using errcode = 'check_violation';
  end if;

  if v_payment_org_id is null or v_transfer_org_id is null then
    raise exception 'Transfer payment void parent rows must already have org_id values.'
      using errcode = 'check_violation';
  end if;

  if v_payment_org_id is distinct from v_transfer_org_id then
    raise exception 'Transfer payment void parent payment and transfer must belong to the same org.'
      using errcode = 'check_violation';
  end if;

  if new.org_id is not null and new.org_id is distinct from v_transfer_org_id then
    raise exception 'Transfer payment void org_id must match the parent transfer/payment org.'
      using errcode = 'check_violation';
  end if;

  new.org_id := v_transfer_org_id;
  return new;
end;
$$;

drop trigger if exists trg_transfer_payment_voids_set_org_id on public.transfer_payment_voids;

create trigger trg_transfer_payment_voids_set_org_id
before insert or update of payment_id, transfer_id, org_id
on public.transfer_payment_voids
for each row
execute function public.set_transfer_payment_void_org_id();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'transfer_payment_voids_org_id_fkey'
      and conrelid = 'public.transfer_payment_voids'::regclass
  ) then
    alter table public.transfer_payment_voids
    add constraint transfer_payment_voids_org_id_fkey
    foreign key (org_id)
    references public.organizations(id)
    on delete restrict;
  end if;
end;
$$;

create index if not exists transfer_payment_voids_org_id_idx
on public.transfer_payment_voids (org_id);

alter table public.transfer_payment_voids
alter column org_id set not null;

alter table public.transfer_payment_voids
enable row level security;

drop policy if exists authenticated_insert_transfer_payment_voids on public.transfer_payment_voids;
drop policy if exists authenticated_select_transfer_payment_voids on public.transfer_payment_voids;
drop policy if exists transfer_payment_voids_all_same_org on public.transfer_payment_voids;

create policy transfer_payment_voids_all_same_org
on public.transfer_payment_voids
as permissive
for all
to public
using (org_id = current_org_id())
with check (org_id = current_org_id());
