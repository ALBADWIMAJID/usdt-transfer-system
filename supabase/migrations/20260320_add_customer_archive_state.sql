alter table public.customers
add column if not exists is_archived boolean not null default false;

alter table public.customers
add column if not exists archived_at timestamptz;

create index if not exists customers_is_archived_full_name_idx
on public.customers (is_archived, full_name);
