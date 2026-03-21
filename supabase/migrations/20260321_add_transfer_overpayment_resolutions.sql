create table if not exists public.transfer_overpayment_resolutions (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null references public.transfers(id) on delete restrict,
  resolution_type text not null,
  resolved_overpaid_amount_rub numeric(18,2) not null,
  note text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists transfer_overpayment_resolutions_transfer_created_idx
on public.transfer_overpayment_resolutions (transfer_id, created_at desc);
