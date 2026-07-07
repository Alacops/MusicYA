-- Esquema inicial de MusicYA (PostgreSQL / Supabase)
-- Ejecutar en el SQL Editor de Supabase, o con:  psql "$SUPABASE_DB_URL" -f src/db/schema.sql

-- Tipos enumerados (idempotentes)
do $$ begin
  create type user_role as enum ('cliente','artista','admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type booking_status as enum ('pendiente','confirmada','pagada','cancelada','finalizada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('pendiente','pagado','rechazado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type portfolio_type as enum ('imagen','video','audio');
exception when duplicate_object then null; end $$;

-- Usuarios (clientes y artistas)
create table if not exists users (
  id            bigint generated always as identity primary key,
  name          varchar(120)  not null,
  email         varchar(160)  not null unique,
  password_hash varchar(255)  not null,
  role          user_role     not null default 'cliente',
  phone         varchar(30),
  created_at    timestamptz default now()
);

-- Perfil profesional del artista
create table if not exists artist_profiles (
  id           bigint generated always as identity primary key,
  user_id      bigint not null references users(id) on delete cascade,
  genre        varchar(80),
  bio          text,
  hourly_rate  numeric(10,2),
  city         varchar(80) default 'Cusco',
  district     varchar(80),        -- distrito de Cusco (filtro de búsqueda)
  event_types  text[],             -- tipos de evento que atiende (filtro de búsqueda)
  lat          double precision,
  lng          double precision,
  rating_avg   numeric(3,2) default 0,
  is_available boolean default true,
  avatar_url   varchar(500),   -- foto de perfil del artista
  -- Verificación por validación comunitaria
  is_verified          boolean default false,
  verified_at          timestamptz,
  social_links         jsonb,          -- { instagram, youtube, tiktok, ... }
  verification_doc_url varchar(500),   -- documento básico de respaldo
  created_at   timestamptz default now()
);

-- Migración idempotente de verificación para bases ya creadas
alter table artist_profiles add column if not exists is_verified boolean default false;
alter table artist_profiles add column if not exists verified_at timestamptz;
alter table artist_profiles add column if not exists social_links jsonb;
alter table artist_profiles add column if not exists verification_doc_url varchar(500);
alter table artist_profiles add column if not exists avatar_url varchar(500);
alter table artist_profiles add column if not exists district varchar(80);
alter table artist_profiles add column if not exists event_types text[];

-- Respaldos comunitarios: un artista verificado avala la autenticidad de otro.
-- Al reunir suficientes respaldos de artistas verificados, el perfil se verifica.
create table if not exists artist_endorsements (
  id          bigint generated always as identity primary key,
  artist_id   bigint not null references artist_profiles(id) on delete cascade, -- respaldado
  endorser_id bigint not null references artist_profiles(id) on delete cascade, -- quien respalda
  comment     text,
  created_at  timestamptz default now(),
  constraint endorsement_unique unique (artist_id, endorser_id),
  constraint endorsement_not_self check (artist_id <> endorser_id)
);
create index if not exists idx_endorsements_artist on artist_endorsements (artist_id);

-- Portafolio / material multimedia
create table if not exists portfolio_items (
  id         bigint generated always as identity primary key,
  artist_id  bigint not null references artist_profiles(id) on delete cascade,
  type       portfolio_type not null,
  url        varchar(500) not null,
  title      varchar(160)
);

-- Calificaciones (LEGADO): antes el cliente calificaba al artista de forma abierta.
-- Sustituida por 'reviews' (bilateral y atada a una contratación finalizada). Se
-- conserva la DDL para no romper bases existentes, pero la app ya no la usa.
create table if not exists ratings (
  id         bigint generated always as identity primary key,
  artist_id  bigint not null references artist_profiles(id) on delete cascade,
  client_id  bigint not null references users(id) on delete cascade,
  score      smallint not null check (score between 1 and 5),
  comment    text,
  created_at timestamptz default now()
);

-- Reservas / contrataciones
-- event_date = inicio del evento, event_end = fin. El rango [event_date, event_end)
-- permite detectar solapamientos de agenda (no solo coincidencias exactas).
create table if not exists bookings (
  id          bigint generated always as identity primary key,
  client_id   bigint not null references users(id) on delete cascade,
  artist_id   bigint not null references artist_profiles(id) on delete cascade,
  event_type  varchar(80),
  event_date  timestamptz not null,
  event_end   timestamptz,
  location    varchar(200),
  status      booking_status not null default 'pendiente',
  total       numeric(10,2),
  created_at  timestamptz default now(),
  constraint bookings_time_valid check (event_end is null or event_end > event_date)
);

-- Migración idempotente para bases ya creadas (añade la columna, el check y un
-- índice que acelera la consulta de solapamiento por artista y rango horario).
alter table bookings add column if not exists event_end timestamptz;
do $$ begin
  alter table bookings
    add constraint bookings_time_valid check (event_end is null or event_end > event_date);
exception when duplicate_object then null; end $$;
create index if not exists idx_bookings_artist_time
  on bookings (artist_id, event_date, event_end);

-- Reseñas BILATERALES atadas a una contratación finalizada (flujo tipo Uber:
-- después del evento, cliente y artista se califican mutuamente).
-- rater_id califica a ratee_id; ratee_role = rol del calificado. Una reseña por
-- persona y contratación (review_unique). Se declara aquí porque referencia bookings.
create table if not exists reviews (
  id         bigint generated always as identity primary key,
  booking_id bigint not null references bookings(id) on delete cascade,
  rater_id   bigint not null references users(id) on delete cascade,
  ratee_id   bigint not null references users(id) on delete cascade,
  ratee_role user_role not null,            -- 'artista' | 'cliente'
  score      smallint not null check (score between 1 and 5),
  comment    text,
  created_at timestamptz default now(),
  constraint review_unique unique (booking_id, rater_id),
  constraint review_not_self check (rater_id <> ratee_id)
);
create index if not exists idx_reviews_ratee on reviews (ratee_id, ratee_role);

-- Reputación del cliente: promedio de lo que le califican los artistas.
alter table users add column if not exists reputation_avg numeric(3,2) default 0;

-- Métricas de la hipótesis Lean Startup (eficiencia de búsqueda y contratación).
-- Cada fila es un evento del embudo de una sesión de búsqueda:
--   search_started   → el usuario empieza a buscar (t0)
--   filter_applied   → aplica/cambia un filtro
--   artist_opened    → abre el perfil de un candidato (elapsed_ms = tiempo hasta encontrar)
--   request_initiated→ pulsa "Solicitar contratación"
-- Con estos eventos se calculan: tiempo medio para encontrar un artista, tasa de
-- éxito (sesiones con resultado) y tasa de solicitud (sesiones que contratan).
create table if not exists search_events (
  id         bigint generated always as identity primary key,
  user_id    bigint references users(id) on delete set null,
  session_id text not null,
  event_type text not null,
  artist_id  bigint references artist_profiles(id) on delete set null,
  elapsed_ms integer,
  filters    jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_search_events_session on search_events (session_id);
create index if not exists idx_search_events_type on search_events (event_type);
alter table search_events enable row level security;
-- Sin políticas: solo el backend (service_role) lee/escribe estas métricas.

-- Pagos (QR / comprobante)
create table if not exists payments (
  id          bigint generated always as identity primary key,
  booking_id  bigint not null references bookings(id) on delete cascade,
  method      varchar(40) default 'qr',
  amount      numeric(10,2),
  status      payment_status default 'pendiente',
  receipt_url varchar(500),
  created_at  timestamptz default now()
);

-- Conversaciones y mensajes
create table if not exists conversations (
  id         bigint generated always as identity primary key,
  client_id  bigint not null references users(id) on delete cascade,
  artist_id  bigint not null references artist_profiles(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists messages (
  id              bigint generated always as identity primary key,
  conversation_id bigint not null references conversations(id) on delete cascade,
  sender_id       bigint not null references users(id) on delete cascade,
  body            text not null,
  created_at      timestamptz default now()
);

-- Notificaciones
create table if not exists notifications (
  id         bigint generated always as identity primary key,
  user_id    bigint not null references users(id) on delete cascade,
  title      varchar(160),
  body       text,
  is_read    boolean default false,
  created_at timestamptz default now()
);

-- Búsqueda geolocalizada (Haversine). Se llama vía supabase.rpc('artists_nearby', ...)
create or replace function artists_nearby(in_lat double precision, in_lng double precision, in_radius_km double precision)
returns table (
  id bigint,
  user_id bigint,
  genre varchar,
  city varchar,
  lat double precision,
  lng double precision,
  rating_avg numeric,
  is_available boolean,
  distance_km double precision
)
language sql stable
as $$
  select * from (
    select a.id, a.user_id, a.genre, a.city, a.lat, a.lng, a.rating_avg, a.is_available,
      (6371 * acos(
        cos(radians(in_lat)) * cos(radians(a.lat)) *
        cos(radians(a.lng) - radians(in_lng)) +
        sin(radians(in_lat)) * sin(radians(a.lat))
      )) as distance_km
    from artist_profiles a
    where a.lat is not null and a.lng is not null
  ) t
  where t.distance_km <= in_radius_km
  order by t.distance_km asc;
$$;

-- ============================================================================
-- SEGURIDAD: Row Level Security (RLS)
-- ----------------------------------------------------------------------------
-- Modelo de seguridad de MusicYA:
--   * El BACKEND se conecta con la service_role key, que OMITE RLS. Toda la
--     autorización de negocio se aplica en la API (JWT + middlewares de rol).
--   * RLS actúa como defensa en profundidad: si alguien usara la anon key para
--     conectarse directamente a la base de datos, solo podría LEER los datos
--     públicos de promoción de artistas, nunca datos privados.
--
-- Regla general: al activar RLS sin políticas, una tabla queda BLOQUEADA para
-- los roles anon/authenticated (acceso denegado por defecto). Solo definimos
-- políticas de LECTURA pública sobre la información que el plan busca difundir.
-- ============================================================================

-- Activar RLS en todas las tablas
alter table users           enable row level security;
alter table artist_profiles enable row level security;
alter table portfolio_items enable row level security;
alter table ratings         enable row level security;
alter table bookings        enable row level security;
alter table payments        enable row level security;
alter table conversations   enable row level security;
alter table messages        enable row level security;
alter table notifications   enable row level security;
alter table artist_endorsements enable row level security;
alter table reviews         enable row level security;

-- Datos PÚBLICOS (visibilidad/promoción de artistas): lectura para todos.
-- La tabla users NO se expone (contiene password_hash y datos personales).
drop policy if exists "lectura pública de perfiles" on artist_profiles;
create policy "lectura pública de perfiles"
  on artist_profiles for select
  to anon, authenticated
  using (true);

drop policy if exists "lectura pública de portafolio" on portfolio_items;
create policy "lectura pública de portafolio"
  on portfolio_items for select
  to anon, authenticated
  using (true);

drop policy if exists "lectura pública de respaldos" on artist_endorsements;
create policy "lectura pública de respaldos"
  on artist_endorsements for select
  to anon, authenticated
  using (true);

drop policy if exists "lectura pública de calificaciones" on ratings;
create policy "lectura pública de calificaciones"
  on ratings for select
  to anon, authenticated
  using (true);

drop policy if exists "lectura pública de reseñas" on reviews;
create policy "lectura pública de reseñas"
  on reviews for select
  to anon, authenticated
  using (true);

-- El resto de tablas (users, bookings, payments, conversations, messages,
-- notifications) quedan SIN políticas: acceso denegado a anon/authenticated.
-- Solo el backend (service_role) puede leerlas y escribirlas.
--
-- NOTA: este MVP usa autenticación propia (JWT + tabla users), no Supabase Auth.
-- Si en el futuro se migra a Supabase Auth, se podrían añadir políticas por
-- usuario del tipo:  using (auth.uid() = user_id)  para acceso directo seguro.
