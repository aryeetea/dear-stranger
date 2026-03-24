alter table public.hubs
add column if not exists last_seen_at timestamptz;

update public.hubs
set last_seen_at = coalesce(last_seen_at, now());

alter table public.hubs
alter column last_seen_at set default now();
