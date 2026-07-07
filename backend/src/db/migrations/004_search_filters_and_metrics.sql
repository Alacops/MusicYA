-- Migración 004: filtros de búsqueda (distrito + tipo de evento) y métricas Lean Startup
-- Ejecutar en el SQL Editor de Supabase (idempotente: puede correrse varias veces).
--
-- Contexto: la hipótesis principal de la tesis pasa a medir la EFICIENCIA de búsqueda
-- y contratación. Esta migración añade:
--   1) Dos campos al perfil del artista para filtrar la búsqueda por distrito y por
--      tipo de evento que atiende.
--   2) La tabla search_events, que registra el embudo de cada sesión de búsqueda
--      (search_started → filter_applied → artist_opened → request_initiated) y con la
--      que el backend calcula el tiempo medio para encontrar un artista, la tasa de
--      éxito y la tasa de solicitud (GET /api/metrics/summary).
--
-- Tras correrla:  cd backend && npm run seed   (rellena distrito y tipos de evento).

-- 1) Filtros de búsqueda en el perfil del artista
alter table artist_profiles add column if not exists district varchar(80);
alter table artist_profiles add column if not exists event_types text[];

-- 2) Métricas del embudo de búsqueda/contratación
create table if not exists search_events (
  id         bigint generated always as identity primary key,
  user_id    bigint references users(id) on delete set null,
  session_id text not null,
  event_type text not null,   -- search_started | filter_applied | artist_opened | request_initiated
  artist_id  bigint references artist_profiles(id) on delete set null,
  elapsed_ms integer,
  filters    jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_search_events_session on search_events (session_id);
create index if not exists idx_search_events_type on search_events (event_type);

-- RLS activado sin políticas: solo el backend (service_role) lee/escribe estas métricas.
alter table search_events enable row level security;
