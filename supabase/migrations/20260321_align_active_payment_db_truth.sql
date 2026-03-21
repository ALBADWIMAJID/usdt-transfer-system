do $$
begin
  if to_regclass('public.transfer_payments') is null then
    raise exception 'public.transfer_payments must exist before aligning active payment DB truth.';
  end if;

  if to_regclass('public.transfer_payment_voids') is null then
    raise exception 'public.transfer_payment_voids must exist before aligning active payment DB truth.';
  end if;

  if to_regclass('public.transfers') is null then
    raise exception 'public.transfers must exist before aligning active payment DB truth.';
  end if;

  if to_regprocedure('public.refresh_transfer_status(uuid)') is null then
    raise exception 'public.refresh_transfer_status(uuid) must exist before aligning active payment DB truth.';
  end if;
end;
$$;

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
drop trigger if exists trg_transfer_payment_voids_refresh_status_del on public.transfer_payment_voids;
drop trigger if exists trg_transfer_payment_voids_refresh_status_upd on public.transfer_payment_voids;

create trigger trg_transfer_payment_voids_refresh_status_ins
after insert on public.transfer_payment_voids
for each row
execute function public.after_payment_void_mutation();

create trigger trg_transfer_payment_voids_refresh_status_del
after delete on public.transfer_payment_voids
for each row
execute function public.after_payment_void_mutation();

create trigger trg_transfer_payment_voids_refresh_status_upd
after update of payment_id, transfer_id
on public.transfer_payment_voids
for each row
execute function public.after_payment_void_mutation();
