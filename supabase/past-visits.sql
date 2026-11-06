-- Viaggi fatti prima di usare l'app (mappa dei paesi visitati). Eseguilo nell'SQL Editor di Supabase.
create table if not exists public.past_visits (
  id text primary key,                                   -- generato dall'app
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  country_code text not null,                            -- codice ISO minuscolo (it, jp...)
  country_name text not null,
  year int not null,
  month int,                                             -- 1-12, facoltativo
  created_at timestamptz not null default now()
);

alter table public.past_visits enable row level security;

drop policy if exists "past_visits own" on public.past_visits;
create policy "past_visits own" on public.past_visits for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
