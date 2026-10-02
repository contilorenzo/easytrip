-- Schema del database Supabase di EasyTrips. Da eseguire in "SQL Editor".

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  city text,
  country jsonb,
  start_date timestamptz,
  end_date timestamptz,
  steps jsonb not null default '[]',
  client_updated_at timestamptz not null default now(), -- quando l'utente ha modificato (orologio del telefono)
  updated_at timestamptz not null default now(),         -- quando il server ha ricevuto la modifica
  deleted_at timestamptz                                  -- eliminazione logica
);

create index if not exists trips_user_updated_idx on public.trips (user_id, updated_at);

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trips_set_updated_at on public.trips;
create trigger trips_set_updated_at
before insert or update on public.trips
for each row execute function public.set_updated_at();

alter table public.trips enable row level security;

drop policy if exists "own trips select" on public.trips;
drop policy if exists "own trips insert" on public.trips;
drop policy if exists "own trips update" on public.trips;
drop policy if exists "own trips delete" on public.trips;
create policy "own trips select" on public.trips for select using (auth.uid() = user_id);
create policy "own trips insert" on public.trips for insert with check (auth.uid() = user_id);
create policy "own trips update" on public.trips for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own trips delete" on public.trips for delete using (auth.uid() = user_id);

-- Eliminazione dell'account da parte dell'utente: cancella l'utente e, a cascata, i suoi viaggi.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- CONDIVISIONE DEI VIAGGI
-- Il proprietario invita altri utenti con un codice, con ruolo "editor" (può modificare) o "viewer" (solo lettura).
-- Da eseguire una volta in "SQL Editor", dopo la parte precedente.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

create table if not exists public.trip_members (
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

create table if not exists public.trip_invites (
  code text primary key,
  trip_id uuid not null references public.trips(id) on delete cascade,
  role text not null check (role in ('editor', 'viewer')),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  expires_at timestamptz not null default now() + interval '7 days',
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.trip_members enable row level security;
alter table public.trip_invites enable row level security;

-- Funzioni di appoggio (security definer: leggono senza passare dalle regole, così non si creano riferimenti circolari)
create or replace function public.is_trip_owner(p_trip_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.trips where id = p_trip_id and user_id = auth.uid())
$$;

create or replace function public.can_edit_trip(p_trip_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.trips where id = p_trip_id and user_id = auth.uid())
      or exists (select 1 from public.trip_members where trip_id = p_trip_id and user_id = auth.uid() and role = 'editor')
$$;

create or replace function public.can_view_trip(p_trip_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.trips where id = p_trip_id and user_id = auth.uid())
      or exists (select 1 from public.trip_members where trip_id = p_trip_id and user_id = auth.uid())
$$;

-- Viaggi: li vede chi è proprietario o membro; li modifica chi è proprietario o editor; li elimina solo il proprietario
drop policy if exists "own trips select" on public.trips;
drop policy if exists "own trips update" on public.trips;
-- Il controllo `user_id = auth.uid()` sta per primo e legge la riga stessa: le funzioni, dentro la stessa operazione, non
-- vedono ancora una riga appena inserita e farebbero fallire "insert ... returning" per i viaggi nuovi.
create policy "trips select" on public.trips for select
  using (user_id = auth.uid() or public.can_view_trip(id));
create policy "trips update" on public.trips for update
  using (user_id = auth.uid() or public.can_edit_trip(id))
  with check (user_id = auth.uid() or public.can_edit_trip(id));

-- Un editor non può cambiare il proprietario né eliminare il viaggio: quei campi restano quelli di prima
create or replace function public.guard_trip_editor() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is distinct from old.user_id then
    new.user_id := old.user_id;
    new.deleted_at := old.deleted_at;
  end if;
  return new;
end $$;

drop trigger if exists trips_guard_editor on public.trips;
create trigger trips_guard_editor before update on public.trips
for each row execute function public.guard_trip_editor();

-- Membri: li vede il proprietario e il membro stesso; li gestisce il proprietario; ognuno può uscire
drop policy if exists "members select" on public.trip_members;
drop policy if exists "members update" on public.trip_members;
drop policy if exists "members delete" on public.trip_members;
create policy "members select" on public.trip_members for select
  using (user_id = auth.uid() or public.is_trip_owner(trip_id));
create policy "members update" on public.trip_members for update
  using (public.is_trip_owner(trip_id)) with check (public.is_trip_owner(trip_id));
create policy "members delete" on public.trip_members for delete
  using (user_id = auth.uid() or public.is_trip_owner(trip_id));

-- Inviti: solo il proprietario li vede e li revoca; si creano e si accettano con le funzioni qui sotto
drop policy if exists "invites select" on public.trip_invites;
drop policy if exists "invites update" on public.trip_invites;
create policy "invites select" on public.trip_invites for select using (public.is_trip_owner(trip_id));
create policy "invites update" on public.trip_invites for update
  using (public.is_trip_owner(trip_id)) with check (public.is_trip_owner(trip_id));

-- Crea un invito (solo il proprietario) e restituisce il codice
create or replace function public.create_trip_invite(p_trip_id uuid, p_role text) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_code text;
begin
  if not public.is_trip_owner(p_trip_id) then
    raise exception 'Solo il proprietario può invitare';
  end if;
  if p_role not in ('editor', 'viewer') then
    raise exception 'Ruolo non valido';
  end if;
  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  insert into public.trip_invites (code, trip_id, role) values (v_code, p_trip_id, p_role);
  return v_code;
end $$;

-- Accetta un invito: aggiunge l'utente ai membri e restituisce l'id del viaggio
create or replace function public.accept_trip_invite(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_invite public.trip_invites;
begin
  if auth.uid() is null then
    raise exception 'Accesso richiesto';
  end if;
  select * into v_invite from public.trip_invites
    where code = upper(trim(p_code)) and not revoked and expires_at > now();
  if not found then
    raise exception 'Invito non valido o scaduto';
  end if;
  -- Il proprietario non diventa membro del proprio viaggio
  if public.is_trip_owner(v_invite.trip_id) then
    return v_invite.trip_id;
  end if;
  insert into public.trip_members (trip_id, user_id, role)
    values (v_invite.trip_id, auth.uid(), v_invite.role)
    on conflict (trip_id, user_id) do update set role = excluded.role;
  return v_invite.trip_id;
end $$;

-- Elenco di chi ha accesso a un viaggio (proprietario compreso): nome e foto per tutti, email solo per il proprietario
drop function if exists public.list_trip_members(uuid);
create or replace function public.list_trip_members(p_trip_id uuid)
returns table (user_id uuid, role text, name text, email text, photo_url text, is_owner boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_is_owner boolean;
begin
  if not public.can_view_trip(p_trip_id) then
    raise exception 'Accesso negato';
  end if;
  select exists (select 1 from public.trips where id = p_trip_id and trips.user_id = auth.uid()) into v_is_owner;
  return query
    select t.user_id, 'owner'::text,
      coalesce(nullif(u.raw_user_meta_data->>'custom_name', ''), u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1))::text,
      (case when v_is_owner then u.email else null end)::text,
      coalesce(u.raw_user_meta_data->>'custom_avatar_url', u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture')::text,
      true
      from public.trips t join auth.users u on u.id = t.user_id where t.id = p_trip_id
    union all
    select m.user_id, m.role,
      coalesce(nullif(u.raw_user_meta_data->>'custom_name', ''), u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1))::text,
      (case when v_is_owner then u.email else null end)::text,
      coalesce(u.raw_user_meta_data->>'custom_avatar_url', u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture')::text,
      false
      from public.trip_members m join auth.users u on u.id = m.user_id where m.trip_id = p_trip_id;
end $$;

-- Foto profilo personalizzate: bucket pubblico in lettura (gli URL sono impossibili da indovinare), ognuno scrive solo nella propria cartella
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;
-- Serve anche in lettura: l'upload fa INSERT ... RETURNING
drop policy if exists "avatars read" on storage.objects;
create policy "avatars read" on storage.objects for select using (bucket_id = 'avatars');
drop policy if exists "avatars upload own" on storage.objects;
create policy "avatars upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars delete own" on storage.objects;
create policy "avatars delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

revoke all on function public.create_trip_invite(uuid, text) from public, anon;
revoke all on function public.accept_trip_invite(text) from public, anon;
revoke all on function public.list_trip_members(uuid) from public, anon;
grant execute on function public.create_trip_invite(uuid, text) to authenticated;
grant execute on function public.accept_trip_invite(text) to authenticated;
grant execute on function public.list_trip_members(uuid) to authenticated;
