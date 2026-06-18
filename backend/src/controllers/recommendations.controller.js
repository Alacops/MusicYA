// Recomendaciones inteligentes e historial de contrataciones
const { supabase } = require('../config/supabase');

const LIMIT = 10;
const RECO_COLS = 'id, genre, city, hourly_rate, rating_avg, is_available, users(name)';

// Devuelve el id del perfil de artista del usuario (o null)
async function getMyArtistProfileId(userId) {
  const { data } = await supabase
    .from('artist_profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  return data ? data.id : null;
}

// Consulta artistas mejor calificados y disponibles, excluyendo ids dados
function topRatedQuery(excludeIds) {
  let q = supabase
    .from('artist_profiles')
    .select(RECO_COLS)
    .eq('is_available', true)
    .order('rating_avg', { ascending: false })
    .limit(LIMIT);
  if (excludeIds.length) q = q.not('id', 'in', `(${excludeIds.join(',')})`);
  return q;
}

// GET /api/recommendations
// Recomienda artistas según el historial de contrataciones del usuario:
//  - Deriva sus géneros preferidos de las reservas previas.
//  - Sugiere artistas mejor calificados de esos géneros (excluye los ya contratados).
//  - Cold start / sin coincidencias: cae a los mejor calificados en general.
async function forUser(req, res, next) {
  try {
    // 1) Historial del usuario como cliente
    const { data: past, error } = await supabase
      .from('bookings')
      .select('artist_id, artist_profiles(genre)')
      .eq('client_id', req.user.id);
    if (error) return next(error);

    const bookedArtistIds = [...new Set(past.map((b) => b.artist_id))];
    const genres = [
      ...new Set(past.map((b) => b.artist_profiles?.genre).filter(Boolean)),
    ];

    // Excluir lo ya contratado y el propio perfil (si el usuario es artista)
    const excludeIds = [...bookedArtistIds];
    const ownProfileId = await getMyArtistProfileId(req.user.id);
    if (ownProfileId) excludeIds.push(ownProfileId);

    // 2) Recomendación basada en géneros preferidos
    let basis = 'top_rated';
    let query = topRatedQuery(excludeIds);
    if (genres.length) {
      query = query.in('genre', genres);
      basis = 'genre_history';
    }

    let { data, error: qError } = await query;
    if (qError) return next(qError);

    // 3) Fallback: si el filtro por género no arrojó resultados, top rated general
    if (basis === 'genre_history' && data.length === 0) {
      const fb = await topRatedQuery(excludeIds);
      if (fb.error) return next(fb.error);
      data = fb.data;
      basis = 'top_rated';
    }

    res.json({ basis, preferred_genres: genres, recommendations: data });
  } catch (err) {
    next(err);
  }
}

// GET /api/recommendations/history
// Historial de contrataciones del usuario (como cliente o como artista)
async function history(req, res, next) {
  try {
    let query = supabase
      .from('bookings')
      .select(
        'id, event_type, event_date, location, status, total, created_at, ' +
          'artist_profiles(genre, city, users(name)), ' +
          'users!bookings_client_id_fkey(name)'
      )
      .order('event_date', { ascending: false });

    if (req.user.role === 'artista') {
      const artistId = await getMyArtistProfileId(req.user.id);
      if (!artistId) return res.json({ count: 0, history: [] });
      query = query.eq('artist_id', artistId);
    } else {
      query = query.eq('client_id', req.user.id);
    }

    const { data, error } = await query;
    if (error) return next(error);

    res.json({ count: data.length, history: data });
  } catch (err) {
    next(err);
  }
}

module.exports = { forUser, history };
