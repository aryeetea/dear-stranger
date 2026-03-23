create table if not exists public.hub_relics (
  user_id uuid not null references public.hubs(id) on delete cascade,
  relic_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, relic_id)
);

create table if not exists public.letter_shelf_assignments (
  user_id uuid not null references public.hubs(id) on delete cascade,
  letter_id uuid not null references public.letters(id) on delete cascade,
  shelf_id text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, letter_id)
);

create table if not exists public.constellation_hubs (
  user_id uuid not null references public.hubs(id) on delete cascade,
  hub_id uuid not null references public.hubs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, hub_id),
  constraint constellation_hubs_not_self check (user_id <> hub_id)
);

create index if not exists hub_relics_user_id_idx
  on public.hub_relics (user_id);

create index if not exists letter_shelf_assignments_user_id_idx
  on public.letter_shelf_assignments (user_id);

create index if not exists letter_shelf_assignments_letter_id_idx
  on public.letter_shelf_assignments (letter_id);

create index if not exists constellation_hubs_user_id_idx
  on public.constellation_hubs (user_id);

create index if not exists constellation_hubs_hub_id_idx
  on public.constellation_hubs (hub_id);

alter table public.hub_relics enable row level security;
alter table public.letter_shelf_assignments enable row level security;
alter table public.constellation_hubs enable row level security;

drop policy if exists "Users can read their own hub relics" on public.hub_relics;
create policy "Users can read their own hub relics"
  on public.hub_relics
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own hub relics" on public.hub_relics;
create policy "Users can insert their own hub relics"
  on public.hub_relics
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own hub relics" on public.hub_relics;
create policy "Users can delete their own hub relics"
  on public.hub_relics
  for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can read their own shelf assignments" on public.letter_shelf_assignments;
create policy "Users can read their own shelf assignments"
  on public.letter_shelf_assignments
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own shelf assignments" on public.letter_shelf_assignments;
create policy "Users can insert their own shelf assignments"
  on public.letter_shelf_assignments
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own shelf assignments" on public.letter_shelf_assignments;
create policy "Users can update their own shelf assignments"
  on public.letter_shelf_assignments
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own shelf assignments" on public.letter_shelf_assignments;
create policy "Users can delete their own shelf assignments"
  on public.letter_shelf_assignments
  for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can read their own constellations" on public.constellation_hubs;
create policy "Users can read their own constellations"
  on public.constellation_hubs
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own constellations" on public.constellation_hubs;
create policy "Users can insert their own constellations"
  on public.constellation_hubs
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own constellations" on public.constellation_hubs;
create policy "Users can delete their own constellations"
  on public.constellation_hubs
  for delete
  using (auth.uid() = user_id);
