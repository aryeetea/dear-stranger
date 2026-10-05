create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  category text not null check (char_length(category) between 1 and 32),
  message text not null check (char_length(message) between 1 and 5000),
  contact_email text,
  page_url text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

grant insert on table public.feedback to anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'feedback'
      and policyname = 'Anyone can submit feedback'
  ) then
    create policy "Anyone can submit feedback"
      on public.feedback
      for insert
      to anon, authenticated
      with check (true);
  end if;
end $$;
