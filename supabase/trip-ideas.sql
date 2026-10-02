-- Idee di viaggio mostrate nella home. Dati presi da Wikivoyage dalla Edge Function "refresh-trip-ideas"
-- e salvati qui, così l'app non chiama Wikivoyage per ogni utente.
-- Esegui tutto nell'SQL Editor di Supabase.

create table if not exists public.trip_ideas (
  wiki_title text primary key,             -- titolo della pagina su it.wikivoyage.org
  city text not null,
  country_id text not null,                -- codice ISO minuscolo (come flagcdn: pt, jp...)
  country_name text not null,
  days int not null default 4,             -- durata consigliata
  category text not null default 'citta',  -- weekend | citta | avventura | natura | mare | nightlife
  sort_order int not null default 0,
  active boolean not null default true,
  fallback_tagline text,                   -- usata finché la funzione non ha letto Wikivoyage
  -- compilati dalla funzione
  tagline text,
  image_url text,
  intro text,
  attractions jsonb not null default '[]'::jsonb,  -- [{ name, description?, lat?, lng? }]
  itinerary jsonb not null default '[]'::jsonb,    -- programma giorno per giorno generato da Gemini (vedi la funzione)
  refreshed_at timestamptz,
  created_at timestamptz not null default now()    -- le più recenti si mostrano per prime
);

-- Se la tabella esisteva già: aggiunge le colonne nuove
alter table public.trip_ideas add column if not exists itinerary jsonb not null default '[]'::jsonb;
alter table public.trip_ideas add column if not exists created_at timestamptz not null default now();
alter table public.trip_ideas add column if not exists category text not null default 'citta';

alter table public.trip_ideas enable row level security;

-- Lettura per tutti (anche senza account); la scrittura è solo della funzione (service role)
drop policy if exists "trip_ideas read" on public.trip_ideas;
create policy "trip_ideas read" on public.trip_ideas for select to anon, authenticated using (active);

insert into public.trip_ideas (wiki_title, city, country_id, country_name, days, sort_order, fallback_tagline) values
  ('Lisbona',   'Lisbona',   'pt', 'Portogallo',      4, 1, 'Tram gialli e tramonti sul Tago'),
  ('Kyoto',     'Kyoto',     'jp', 'Giappone',        6, 2, 'Templi, giardini zen e geishe'),
  ('Edimburgo', 'Edimburgo', 'gb', 'Regno Unito',     3, 3, 'Castelli e vicoli medievali'),
  ('Marrakech', 'Marrakech', 'ma', 'Marocco',         5, 4, 'Souk, spezie e deserto'),
  ('Reykjavik', 'Reykjavik', 'is', 'Islanda',         5, 5, 'Aurore, geyser e cascate'),
  ('Vienna',    'Vienna',    'at', 'Austria',         3, 6, 'Caffè storici e palazzi imperiali'),
  ('Praga',     'Praga',     'cz', 'Repubblica Ceca', 3, 7, 'Ponti, guglie e birra'),
  ('Istanbul',  'Istanbul',  'tr', 'Turchia',         4, 8, 'Tra Europa e Asia sul Bosforo')
on conflict (wiki_title) do nothing;

-- Categorie delle destinazioni di partenza (le nuove le assegna la funzione di scoperta).
-- Categorie possibili: weekend, citta, avventura, natura, mare, roadtrip, nightlife.
update public.trip_ideas set category = 'citta'     where wiki_title in ('Lisbona', 'Kyoto', 'Istanbul');
update public.trip_ideas set category = 'weekend'   where wiki_title in ('Edimburgo', 'Vienna', 'Praga');
update public.trip_ideas set category = 'avventura' where wiki_title = 'Marrakech';
update public.trip_ideas set category = 'natura'    where wiki_title = 'Reykjavik';

-- Primo road trip di esempio (il programma a tappe lo genera la funzione di refresh)
insert into public.trip_ideas (wiki_title, city, country_id, country_name, days, sort_order, category, fallback_tagline) values
  ('Scozia', 'Scozia', 'gb', 'Regno Unito', 7, 9, 'roadtrip', 'Castelli, lochs e strade panoramiche')
on conflict (wiki_title) do nothing;

-- ---------------------------------------------------------------------------
-- Automazione completa con UNA sola pianificazione (a "discover-trip-ideas"). Funzioni da distribuire: entrambe.
--  * discover-trip-ideas (ogni giorno alle 3:00): aggiunge 2 destinazioni nuove di 2 categorie diverse a rotazione
--    (weekend, citta, avventura, natura, mare, roadtrip, nightlife: il giro completo dura 7 giorni), proposte da Gemini e verificate su
--    Wikivoyage; per ogni categoria restano attive le 6 più recenti. Poi avvia refresh-trip-ideas.
--  * refresh-trip-ideas: riempie le destinazioni nuove (foto, tappe, programma) e rinnova quelle scadute (7 giorni),
--    2 per volta, richiamandosi da sola finché non resta niente da aggiornare (nessuna seconda pianificazione).
--
-- 1) Salva la service role key nel Vault UNA volta (Project Settings → API Keys → service_role):
--      select vault.create_secret('<SERVICE_ROLE_KEY>', 'service_role_key');
-- 2) Sostituisci <PROJECT_REF> e lancia (una volta sola):
--      create extension if not exists pg_cron;
--      create extension if not exists pg_net;
--      select cron.schedule('discover-trip-ideas', '0 3 * * *', $$
--        select net.http_post(
--          url := 'https://<PROJECT_REF>.supabase.co/functions/v1/discover-trip-ideas',
--          headers := jsonb_build_object('Content-Type', 'application/json',
--            'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')),
--          body := '{}'::jsonb, timeout_milliseconds := 120000);
--      $$);
-- 3) Se avevi già pianificato 'refresh-trip-ideas', toglilo (non serve più): select cron.unschedule('refresh-trip-ideas');
--
-- Prove manuali: POST con body {} a discover-trip-ideas (aggiunge destinazioni e avvia il refresh);
-- con {"categories": ["roadtrip", "mare"]} crea una destinazione nuova per ciascuna categoria indicata, al posto della rotazione del giorno
-- (categorie valide: weekend, citta, avventura, natura, mare, roadtrip, nightlife);
-- refresh-trip-ideas accetta {} (aggiorna le scadute e prosegue da sola), {"force": "Lisbona"} per rifarne una,
-- {"force": "all"} per ignorare la scadenza (2 per chiamata, le più vecchie).
-- Per controllare le pianificazioni: select * from cron.job;  — e le ultime esecuzioni: select * from cron.job_run_details order by start_time desc limit 10;
