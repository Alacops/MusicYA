const { supabase } = require('../config/supabase');

const COLS = 'id, user_id, genre, city, bio, hourly_rate, rating_avg, is_available, lat, lng, users(name)';
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

// Normaliza límite/paginación dentro de rangos seguros
function paginationFrom(query) {
  let limit = Number.parseInt(query.limit, 10);
  if (!Number.isFinite(limit) || limit <= 0) limit = DEFAULT_LIMIT;
  limit = Math.min(limit, MAX_LIMIT);

  let offset = Number.parseInt(query.offset, 10);
  if (!Number.isFinite(offset) || offset < 0) offset = 0;

  return { limit, offset };
}

// GET /api/search
// Filtros: genre, city, available, minRate, maxRate, minRating, q (texto libre)
// Orden:   sort = rating (default) | price_asc | price_desc
// Página:  limit (default 20, máx 50), offset
async function search(req, res, next) {
  try {
    const { genre, city, available, minRate, maxRate, minRating, q, sort } = req.query;
    const { limit, offset } = paginationFrom(req.query);

    let query = supabase.from('artist_profiles').select(COLS, { count: 'exact' });

    if (genre) query = query.ilike('genre', `%${genre}%`);
    if (city) query = query.ilike('city', `%${city}%`);
    if (available !== undefined) query = query.eq('is_available', available === 'true');

    const min = Number(minRate);
    if (Number.isFinite(min)) query = query.gte('hourly_rate', min);
    const max = Number(maxRate);
    if (Number.isFinite(max)) query = query.lte('hourly_rate', max);

    const minR = Number(minRating);
    if (Number.isFinite(minR)) query = query.gte('rating_avg', minR);

    // Búsqueda de texto libre sobre género, ciudad y bio
    if (q) {
      const term = q.replace(/[%,()]/g, ''); // evita romper el filtro PostgREST
      query = query.or(`genre.ilike.*${term}*,city.ilike.*${term}*,bio.ilike.*${term}*`);
    }

    // Ordenamiento
    if (sort === 'price_asc') query = query.order('hourly_rate', { ascending: true, nullsFirst: false });
    else if (sort === 'price_desc') query = query.order('hourly_rate', { ascending: false, nullsFirst: false });
    else query = query.order('rating_avg', { ascending: false });

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) return next(error);

    res.json({ count: count ?? data.length, limit, offset, results: data });
  } catch (err) {
    next(err);
  }
}

// GET /api/search/nearby?lat=&lng=&radiusKm=&genre=&available=
// Búsqueda por geolocalización. Usa la función SQL artists_nearby (Haversine)
// definida en src/db/schema.sql y expuesta vía RPC de Supabase.
async function nearby(req, res, next) {
  try {
    const { lat, lng, radiusKm = 10, genre, available } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ message: 'lat y lng son obligatorios' });
    }

    const { data, error } = await supabase.rpc('artists_nearby', {
      in_lat: Number(lat),
      in_lng: Number(lng),
      in_radius_km: Number(radiusKm),
    });
    if (error) return next(error);

    // Filtros opcionales aplicados sobre el resultado de la RPC
    let results = data;
    if (genre) {
      const g = genre.toLowerCase();
      results = results.filter((a) => (a.genre || '').toLowerCase().includes(g));
    }
    if (available !== undefined) {
      const want = available === 'true';
      results = results.filter((a) => a.is_available === want);
    }

    res.json(results);
  } catch (err) {
    next(err);
  }
}

module.exports = { search, nearby };
