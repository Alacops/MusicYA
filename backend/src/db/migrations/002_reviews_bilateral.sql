-- Migración 002: reseñas BILATERALES atadas a contrataciones + reputación de cliente
-- Ejecutar en el SQL Editor de Supabase (idempotente: puede correrse varias veces).
--
-- Contexto: la calificación pasa a habilitarse solo cuando la reserva está
-- 'finalizada' y es bilateral (cliente ↔ artista). La antigua tabla 'ratings'
-- queda en desuso; artist_profiles.rating_avg y users.reputation_avg se derivan
-- ahora de 'reviews'.

-- Reputación del cliente (promedio de lo que le califican los artistas)
alter table users add column if not exists reputation_avg numeric(3,2) default 0;

-- Reseñas bilaterales: rater_id califica a ratee_id (rol del calificado en
-- ratee_role). Una reseña por persona y contratación.
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

-- RLS: lectura pública (mismo criterio que calificaciones/portafolio)
alter table reviews enable row level security;
drop policy if exists "lectura pública de reseñas" on reviews;
create policy "lectura pública de reseñas"
  on reviews for select
  to anon, authenticated
  using (true);
