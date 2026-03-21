do $$
begin
  if to_regclass('public.organizations') is null then
    raise exception 'public.organizations must exist before hardening transfer_overpayment_resolutions org scope.';
  end if;

  if to_regclass('public.transfers') is null then
    raise exception 'public.transfers must exist before hardening transfer_overpayment_resolutions org scope.';
  end if;

  if to_regprocedure('public.current_org_id()') is null then
    raise exception 'public.current_org_id() must exist before hardening transfer_overpayment_resolutions org scope.';
  end if;
end;
$$;

alter table public.transfer_overpayment_resolutions
add column if not exists org_id uuid;

update public.transfer_overpayment_resolutions tor
set org_id = t.org_id
from public.transfers t
where tor.transfer_id = t.id
  and tor.org_id is distinct from t.org_id;

do $$
begin
  if exists (
    select 1
    from public.transfer_overpayment_resolutions tor
    left join public.transfers t
      on t.id = tor.transfer_id
    where t.id is null
      or t.org_id is null
      or tor.org_id is null
      or tor.org_id is distinct from t.org_id
  ) then
    raise exception
      'transfer_overpayment_resolutions org backfill validation failed; review parent transfer linkage and org assignments.'
      using errcode = 'check_violation';
  end if;
end;
$$;

create or replace function public.set_transfer_overpayment_resolution_org_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transfer_org_id uuid;
begin
  select org_id
  into v_transfer_org_id
  from public.transfers
  where id = new.transfer_id;

  if not found then
    raise exception 'Transfer overpayment resolution requires an existing parent transfer.'
      using errcode = 'foreign_key_violation';
  end if;

  if v_transfer_org_id is null then
    raise exception 'Transfer overpayment resolution parent transfer must already have an org_id value.'
      using errcode = 'check_violation';
  end if;

  if new.org_id is not null and new.org_id is distinct from v_transfer_org_id then
    raise exception 'Transfer overpayment resolution org_id must match the parent transfer org.'
      using errcode = 'check_violation';
  end if;

  new.org_id := v_transfer_org_id;
  return new;
end;
$$;

drop trigger if exists trg_transfer_overpayment_resolutions_set_org_id on public.transfer_overpayment_resolutions;

create trigger trg_transfer_overpayment_resolutions_set_org_id
before insert or update of transfer_id, org_id
on public.transfer_overpayment_resolutions
for each row
execute function public.set_transfer_overpayment_resolution_org_id();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'transfer_overpayment_resolutions_org_id_fkey'
      and conrelid = 'public.transfer_overpayment_resolutions'::regclass
  ) then
    alter table public.transfer_overpayment_resolutions
    add constraint transfer_overpayment_resolutions_org_id_fkey
    foreign key (org_id)
    references public.organizations(id)
    on delete restrict;
  end if;
end;
$$;

create index if not exists transfer_overpayment_resolutions_org_id_idx
on public.transfer_overpayment_resolutions (org_id);

alter table public.transfer_overpayment_resolutions
alter column org_id set not null;

alter table public.transfer_overpayment_resolutions
enable row level security;

drop policy if exists authenticated_insert_transfer_overpayment_resolutions on public.transfer_overpayment_resolutions;
drop policy if exists authenticated_select_transfer_overpayment_resolutions on public.transfer_overpayment_resolutions;
drop policy if exists transfer_overpayment_resolutions_all_same_org on public.transfer_overpayment_resolutions;

create policy transfer_overpayment_resolutions_all_same_org
on public.transfer_overpayment_resolutions
as permissive
for all
to public
using (org_id = current_org_id())
with check (org_id = current_org_id());
