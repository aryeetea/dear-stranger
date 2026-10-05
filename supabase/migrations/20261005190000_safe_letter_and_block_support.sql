-- Support idempotent letter release, persisted account time zones, and block filters.
-- All changes are additive; existing rows and policies remain intact.

alter table public.hubs
  add column if not exists time_zone text;

alter table public.letters
  add column if not exists client_request_id uuid;

create unique index if not exists letters_sender_client_request_uidx
  on public.letters (sender_id, client_request_id)
  where client_request_id is not null;

create index if not exists letters_recipient_transit_arrival_idx
  on public.letters (recipient_id, arrives_at)
  where status = 'transit';

create index if not exists letters_sender_transit_arrival_idx
  on public.letters (sender_id, arrives_at)
  where status = 'transit';

create index if not exists letters_universe_arrived_created_idx
  on public.letters (created_at desc)
  where is_universe_letter is true and status = 'arrived';

create index if not exists letters_drift_created_idx
  on public.letters (paper_id, created_at desc)
  where is_universe_letter is true;

create table if not exists public.avatar_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.hubs (id) on delete cascade,
  image_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists avatar_history_user_created_idx
  on public.avatar_history (user_id, created_at desc);

create unique index if not exists avatar_history_user_image_idx
  on public.avatar_history (user_id, image_url);

alter table public.avatar_history enable row level security;
grant select, insert, delete on public.avatar_history to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'avatar_history'
      and policyname = 'Users can read their own avatar history'
  ) then
    create policy "Users can read their own avatar history"
      on public.avatar_history for select to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'avatar_history'
      and policyname = 'Users can insert their own avatar history'
  ) then
    create policy "Users can insert their own avatar history"
      on public.avatar_history for insert to authenticated
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'avatar_history'
      and policyname = 'Users can delete their own avatar history'
  ) then
    create policy "Users can delete their own avatar history"
      on public.avatar_history for delete to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint user_blocks_pkey primary key (blocker_id, blocked_id),
  constraint user_blocks_no_self_block check (blocker_id <> blocked_id)
);

alter table public.user_blocks enable row level security;
grant select, insert, delete on public.user_blocks to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_blocks'
      and policyname = 'Users can read their own blocks'
  ) then
    create policy "Users can read their own blocks"
      on public.user_blocks for select to authenticated
      using (blocker_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_blocks'
      and policyname = 'Users can create their own blocks'
  ) then
    create policy "Users can create their own blocks"
      on public.user_blocks for insert to authenticated
      with check (blocker_id = auth.uid() and blocked_id <> auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_blocks'
      and policyname = 'Users can remove their own blocks'
  ) then
    create policy "Users can remove their own blocks"
      on public.user_blocks for delete to authenticated
      using (blocker_id = auth.uid());
  end if;
end $$;

notify pgrst, 'reload schema';
