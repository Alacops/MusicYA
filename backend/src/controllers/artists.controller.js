const { supabase } = require('../config/supabase');

const PORTFOLIO_TYPES = ['imagen', 'video', 'audio'];

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
// Filtros opcionales por query:
//   ?genre=Rock&city=Cusco&available=true&maxPrice=200&district=Wanchaq&eventType=Bodas
async function list(req, res, next) {
  try {
    const { genre, city, available, maxPrice, district, eventType } = req.query;

    let query = supabase
      .from('artist_profiles')
      .select('*, users(name)')
      .order('rating_avg', { ascending: false })
      .limit(50);

    if (genre) query = query.ilike('genre', `%${genre}%`);
    if (city) query = query.ilike('city', `%${city}%`);
    if (available !== undefined) query = query.eq('is_available', available === 'true');
    if (maxPrice !== undefined && maxPrice !== '' && Number.isFinite(Number(maxPrice))) {
      query = query.lte('hourly_rate', Number(maxPrice));
    }
    if (district) query = query.ilike('district', `%${district}%`);
    // event_types es un arreglo: filtra a los artistas que atienden ese tipo de evento
    if (eventType) query = query.contains('event_types', [eventType]);

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
      // Reseñas que recibió el artista (bilaterales, atadas a contrataciones)
      supabase
        .from('reviews')
        .select('id, score, comment, created_at, users!reviews_rater_id_fkey(name)')
        .eq('ratee_id', artist.user_id)
        .eq('ratee_role', 'artista')
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

    const { genre, bio, hourly_rate, city, district, event_types, lat, lng, avatar_url, portfolio } = req.body;

    const { data: profile, error } = await supabase
      .from('artist_profiles')
      .insert({
        user_id: req.user.id,
        genre: genre || null,
        bio: bio || null,
        hourly_rate: hourly_rate ?? null,
        city: city || 'Cusco',
        district: district || null,
        event_types: Array.isArray(event_types) ? event_types : null,
        lat: lat ?? null,
        lng: lng ?? null,
        avatar_url: avatar_url || null,
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
      'genre', 'bio', 'hourly_rate', 'city', 'district', 'event_types', 'lat', 'lng',
      'is_available', 'social_links', 'verification_doc_url', 'avatar_url',
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

module.exports = { list, getById, create, update };
