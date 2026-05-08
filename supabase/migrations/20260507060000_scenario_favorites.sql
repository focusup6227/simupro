-- Simu-Pro: Scenario favorites (heart toggle on the scenario library)

create table if not exists public.scenario_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  scenario_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, scenario_id)
);

alter table public.scenario_favorites enable row level security;

drop policy if exists "Users select their own favorites" on public.scenario_favorites;
create policy "Users select their own favorites"
  on public.scenario_favorites
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users insert their own favorites" on public.scenario_favorites;
create policy "Users insert their own favorites"
  on public.scenario_favorites
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users delete their own favorites" on public.scenario_favorites;
create policy "Users delete their own favorites"
  on public.scenario_favorites
  for delete
  to authenticated
  using (user_id = auth.uid());

create index if not exists scenario_favorites_user_id_idx
  on public.scenario_favorites (user_id);
