create table if not exists public.transfer_payment_voids (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.transfer_payments(id) on delete restrict,
  transfer_id uuid not null references public.transfers(id) on delete restrict,
  void_reason_type text not null,
  note text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists transfer_payment_voids_payment_id_key
on public.transfer_payment_voids (payment_id);

create index if not exists transfer_payment_voids_transfer_created_idx
on public.transfer_payment_voids (transfer_id, created_at desc);
