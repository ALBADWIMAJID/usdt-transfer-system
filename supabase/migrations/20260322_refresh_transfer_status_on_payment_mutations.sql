do $$
begin
  if to_regclass('public.transfer_payments') is null then
    raise exception 'public.transfer_payments must exist before refreshing transfer status on payment mutations.';
  end if;

  if to_regclass('public.transfers') is null then
    raise exception 'public.transfers must exist before refreshing transfer status on payment mutations.';
  end if;

  if to_regprocedure('public.refresh_transfer_status(uuid)') is null then
    raise exception 'public.refresh_transfer_status(uuid) must exist before refreshing transfer status on payment mutations.';
  end if;
end;
$$;

create or replace function public.after_transfer_payment_mutation_refresh_status()
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
    if old.transfer_id is not null then
      perform public.refresh_transfer_status(old.transfer_id);
    end if;

    if new.transfer_id is distinct from old.transfer_id and new.transfer_id is not null then
      perform public.refresh_transfer_status(new.transfer_id);
    elsif new.transfer_id is not null then
      perform public.refresh_transfer_status(new.transfer_id);
    end if;

    return new;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_transfer_payments_refresh_status_ins on public.transfer_payments;
drop trigger if exists trg_transfer_payments_refresh_status_del on public.transfer_payments;
drop trigger if exists trg_transfer_payments_refresh_status_upd on public.transfer_payments;

create trigger trg_transfer_payments_refresh_status_ins
after insert on public.transfer_payments
for each row
execute function public.after_transfer_payment_mutation_refresh_status();

create trigger trg_transfer_payments_refresh_status_del
after delete on public.transfer_payments
for each row
execute function public.after_transfer_payment_mutation_refresh_status();

create trigger trg_transfer_payments_refresh_status_upd
after update of transfer_id, amount_rub
on public.transfer_payments
for each row
execute function public.after_transfer_payment_mutation_refresh_status();
