const { supabase } = require('../config/supabase');

const PORTFOLIO_TYPES = ['imagen', 'video', 'audio'];

// Recalcula y persiste el promedio de calificaciones de un artista
async function refreshRatingAverage(artistId) {
  const { data: rows, error } = await supabase
    .from('ratings')
    .select('score')
    .eq('artist_id', artistId);
  if (error) throw error;

  const avg = rows.length
    ? rows.reduce((sum, r) => sum + r.score, 0) / rows.length
    : 0;

  await supabase
    .from('artist_profiles')
    .update({ rating_avg: avg.toFixed(2) })
    .eq('id', artistId);

  return Number(avg.toFixed(2));
}

// Inserta los items de portafolio validados y vinculados a un artista
async function insertPortfolio(artistId, portfolio) {
  const items = (portfolio || [])
    .filter((it) => it && it.url && PORTFOLIO_TYPES.includes(it.type))
    .map((it) => ({
      artist_id: artistId,
      type: it.type,
      url: it.url,
      title: it.title || null,
    }));
  if (items.length === 0) return [];

  const { data, error } = await supabase
    .from('portfolio_items')
    .insert(items)
    .select('id, type, url, title');
  if (error) throw error;
  return data;
}

// GET /api/artists
// Filtros opcionales por query: ?genre=Rock&city=Cusco&available=true
async function list(req, res, next) {
  try {
    const { genre, city, available } = req.query;

    let query = supabase
      .from('artist_profiles')
      .select('*, users(name)')
      .order('rating_avg', { ascending: false })
      .limit(50);

    if (genre) query = query.ilike('genre', `%${genre}%`);
    if (city) query = query.ilike('city', `%${city}%`);
    if (available !== undefined) query = query.eq('is_available', available === 'true');

    const { data, error } = await query;
    if (error) return next(error);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

// GET /api/artists/:id  (perfil + portafolio + calificaciones)
async function getById(req, res, next) {
  try {
    const { data: artist, error } = await supabase
      .from('artist_profiles')
      .select('*, users(name, email, phone)')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) return next(error);
    if (!artist) return res.status(404).json({ message: 'Artista no encontrado' });

    const [{ data: portfolio }, { data: ratings }] = await Promise.all([
      supabase
        .from('portfolio_items')
        .select('id, type, url, title')
        .eq('artist_id', artist.id),
      supabase
        .from('ratings')
        .select('id, score, comment, created_at, users(name)')
        .eq('artist_id', artist.id)
        .order('created_at', { ascending: false }),
    ]);

    res.json({ ...artist, portfolio: portfolio || [], ratings: ratings || [] });
  } catch (err) {
    next(err);
  }
}

// POST /api/artists  (crea el perfil profesional del artista autenticado)
async function create(req, res, next) {
  try {
    // Un artista solo puede tener un perfil; el registro ya pudo haber creado uno
    const { data: existing } = await supabase
      .from('artist_profiles')
      .select('id')
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({
        message: 'Ya tienes un perfil. Usa PUT /api/artists/:id para actualizarlo',
        id: existing.id,
      });
    }

    const { genre, bio, hourly_rate, city, lat, lng, portfolio } = req.body;

    const { data: profile, error } = await supabase
      .from('artist_profiles')
      .insert({
        user_id: req.user.id,
        genre: genre || null,
        bio: bio || null,
        hourly_rate: hourly_rate ?? null,
        city: city || 'Cusco',
        lat: lat ?? null,
        lng: lng ?? null,
      })
      .select('*')
      .single();

    if (error) return next(error);

    const items = await insertPortfolio(profile.id, portfolio);

    res.status(201).json({ ...profile, portfolio: items });
  } catch (err) {
    next(err);
  }
}

// PUT /api/artists/:id  (actualiza el perfil; solo el dueño)
async function update(req, res, next) {
  try {
    const { data: profile, error: findError } = await supabase
      .from('artist_profiles')
      .select('id, user_id')
      .eq('id', req.params.id)
      .maybeSingle();

    if (findError) return next(findError);
    if (!profile) return res.status(404).json({ message: 'Artista no encontrado' });
    if (Number(profile.user_id) !== Number(req.user.id)) {
      return res.status(403).json({ message: 'No puedes editar el perfil de otro artista' });
    }

    // Solo se actualizan los campos efectivamente enviados.
    // Nota: 'is_verified'/'verified_at' NO son editables aquí (los gobierna la
    // validación comunitaria); el artista solo aporta redes y documento.
    const allowed = [
      'genre', 'bio', 'hourly_rate', 'city', 'lat', 'lng', 'is_available',
      'social_links', 'verification_doc_url',
    ];
    const updates = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    if (Object.keys(updates).length > 0) {
      const { error: updError } = await supabase
        .from('artist_profiles')
        .update(updates)
        .eq('id', profile.id);
      if (updError) return next(updError);
    }

    // Si llega 'portfolio', reemplaza por completo el material multimedia
    let items;
    if (Array.isArray(req.body.portfolio)) {
      await supabase.from('portfolio_items').delete().eq('artist_id', profile.id);
      items = await insertPortfolio(profile.id, req.body.portfolio);
    }

    const { data: updated, error: refetchError } = await supabase
      .from('artist_profiles')
      .select('*, users(name)')
      .eq('id', profile.id)
      .single();
    if (refetchError) return next(refetchError);

    res.json(items ? { ...updated, portfolio: items } : updated);
  } catch (err) {
    next(err);
  }
}

// POST /api/artists/:id/ratings  (un usuario autenticado califica a un artista)
async function addRating(req, res, next) {
  try {
    const artistId = req.params.id;
    const { score, comment } = req.body;

    const numScore = Number(score);
    if (!Number.isInteger(numScore) || numScore < 1 || numScore > 5) {
      return res.status(400).json({ message: 'score debe ser un entero entre 1 y 5' });
    }

    const { data: artist, error: artistError } = await supabase
      .from('artist_profiles')
      .select('id, user_id')
      .eq('id', artistId)
      .maybeSingle();
    if (artistError) return next(artistError);
    if (!artist) return res.status(404).json({ message: 'Artista no encontrado' });

    // El artista no puede calificarse a sí mismo
    if (Number(artist.user_id) === Number(req.user.id)) {
      return res.status(403).json({ message: 'No puedes calificar tu propio perfil' });
    }

    const { data: rating, error } = await supabase
      .from('ratings')
      .insert({
        artist_id: artist.id,
        client_id: req.user.id,
        score: numScore,
        comment: comment || null,
      })
      .select('id, score, comment, created_at')
      .single();
    if (error) return next(error);

    const rating_avg = await refreshRatingAverage(artist.id);

    res.status(201).json({ rating, rating_avg });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, create, update, addRating };
