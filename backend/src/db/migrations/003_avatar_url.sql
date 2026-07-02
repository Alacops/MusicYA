-- Migración 003: foto de perfil (avatar) del artista
-- Ejecutar en el SQL Editor de Supabase (idempotente: puede correrse varias veces).
--
-- Contexto: para que los perfiles y el catálogo se vean más reales, el artista
-- puede tener una foto de perfil. El portafolio (imágenes/videos) ya existía en
-- portfolio_items; esto añade solo el avatar de cabecera.

alter table artist_profiles add column if not exists avatar_url varchar(500);
