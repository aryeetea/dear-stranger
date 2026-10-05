create table if not exists public.avatar_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.hubs(id) on delete cascade,
  image_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists avatar_history_user_created_idx
  on public.avatar_history (user_id, created_at desc);

create unique index if not exists avatar_history_user_image_idx
  on public.avatar_history (user_id, image_url);

alter table public.avatar_history enable row level security;

create policy "Users can read their own avatar history"
  on public.avatar_history
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own avatar history"
  on public.avatar_history
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete their own avatar history"
  on public.avatar_history
  for delete
  to authenticated
  using (auth.uid() = user_id);
