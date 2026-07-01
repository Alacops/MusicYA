const { supabase } = require('../config/supabase');
const { createNotification } = require('./notifications.controller');

// Estados válidos (enum booking_status en el schema)
const BOOKING_STATUSES = ['pendiente', 'confirmada', 'pagada', 'cancelada', 'finalizada'];
// Estados que "ocupan" la agenda del artista para detectar conflictos
const ACTIVE_STATUSES = ['pendiente', 'confirmada', 'pagada'];
// Duración por defecto de un evento si no se indica event_end ni duration_minutes
const DEFAULT_DURATION_MIN = 120;

// Calcula el rango [inicio, fin) de un evento a partir del body.
// Acepta event_end explícito o duration_minutes (default 120). Devuelve
// { start, end } como Date, o { error } con un mensaje de validación.
function resolveTimeRange({ event_date, event_end, duration_minutes }) {
  const start = new Date(event_date);
  if (Number.isNaN(start.getTime())) return { error: 'event_date no es una fecha válida' };

  let end;
  if (event_end !== undefined && event_end !== null && event_end !== '') {
    end = new Date(event_end);
    if (Number.isNaN(end.getTime())) return { error: 'event_end no es una fecha válida' };
  } else {
    const dur = Number(duration_minutes);
    const minutes = Number.isFinite(dur) && dur > 0 ? dur : DEFAULT_DURATION_MIN;
    end = new Date(start.getTime() + minutes * 60000);
  }

  if (end.getTime() <= start.getTime()) {
    return { error: 'event_end debe ser posterior a event_date' };
  }
  return { start, end };
}

// Busca una reserva activa del artista que se solape con el rango [start, end).
// Dos intervalos se solapan si  start < fin_existente  Y  inicio_existente < end.
async function findOverlap(artistId, start, end, excludeBookingId) {
  let query = supabase
    .from('bookings')
    .select('id, event_date, event_end')
    .eq('artist_id', artistId)
    .in('status', ACTIVE_STATUSES)
    .lt('event_date', end.toISOString())   // inicio_existente < end
    .gt('event_end', start.toISOString())  // fin_existente > start
    .limit(1);
  if (excludeBookingId) query = query.neq('id', excludeBookingId);

  const { data, error } = await query;
  if (error) throw error;
  return data && data.length ? data[0] : null;
}

// Transiciones permitidas por rol del solicitante.
// 'pagada' se gestiona desde el flujo de pagos, no aquí.
const ALLOWED_TRANSITIONS = {
  cliente: ['cancelada'],
  artista: ['confirmada', 'cancelada', 'finalizada'],
};

// Notifica de forma no-fatal: un fallo al notificar nunca rompe el flujo principal
async function notify(userId, title, body) {
  try {
    await createNotification(userId, title, body);
  } catch (err) {
    console.warn('⚠ No se pudo crear la notificación:', err.message);
  }
}

// Devuelve el id del perfil de artista del usuario autenticado (o null)
async function getMyArtistProfileId(userId) {
  const { data } = await supabase
    .from('artist_profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  return data ? data.id : null;
}

// GET /api/bookings  (reservas en las que participa el usuario autenticado)
async function listMine(req, res, next) {
  try {
    const selectCols =
      '*, artist_profiles(id, genre, city, rating_avg, users(name)), ' +
      'users!bookings_client_id_fkey(name, reputation_avg)';

    let query = supabase
      .from('bookings')
      .select(selectCols)
      .order('event_date', { ascending: true });

    if (req.user.role === 'artista') {
      const artistId = await getMyArtistProfileId(req.user.id);
      if (!artistId) return res.json([]); // artista sin perfil aún
      query = query.eq('artist_id', artistId);
    } else {
      query = query.eq('client_id', req.user.id);
    }

    const { data, error } = await query;
    if (error) return next(error);

    // Marca qué reservas ya calificó el usuario (para el flujo bilateral)
    const rows = data || [];
    let reviewedIds = new Set();
    if (rows.length) {
      const { data: mine } = await supabase
        .from('reviews')
        .select('booking_id')
        .eq('rater_id', req.user.id)
        .in('booking_id', rows.map((b) => b.id));
      reviewedIds = new Set((mine || []).map((r) => r.booking_id));
    }

    res.json(rows.map((b) => ({ ...b, reviewed_by_me: reviewedIds.has(b.id) })));
  } catch (err) {
    next(err);
  }
}

// Recalcula el promedio del calificado a partir de 'reviews'.
// Para artista actualiza artist_profiles.rating_avg; para cliente users.reputation_avg.
async function refreshRateeAverage({ rateeId, rateeRole, artistProfileId }) {
  const { data: rows, error } = await supabase
    .from('reviews')
    .select('score')
    .eq('ratee_id', rateeId)
    .eq('ratee_role', rateeRole);
  if (error) throw error;
  const avg = rows.length ? rows.reduce((s, r) => s + r.score, 0) / rows.length : 0;
  const value = avg.toFixed(2);

  if (rateeRole === 'artista') {
    await supabase.from('artist_profiles').update({ rating_avg: value }).eq('id', artistProfileId);
  } else {
    await supabase.from('users').update({ reputation_avg: value }).eq('id', rateeId);
  }
  return Number(value);
}

// POST /api/bookings/:id/review  (calificación bilateral tras el evento)
async function createReview(req, res, next) {
  try {
    const numScore = Number(req.body.score);
    if (!Number.isInteger(numScore) || numScore < 1 || numScore > 5) {
      return res.status(400).json({ message: 'score debe ser un entero entre 1 y 5' });
    }

    const { data: booking, error: findError } = await supabase
      .from('bookings')
      .select('*, artist_profiles(id, user_id)')
      .eq('id', req.params.id)
      .maybeSingle();
    if (findError) return next(findError);
    if (!booking) return res.status(404).json({ message: 'Reserva no encontrada' });

    const artistUserId = booking.artist_profiles?.user_id;
    const isClient = Number(booking.client_id) === Number(req.user.id);
    const isArtist = Number(artistUserId) === Number(req.user.id);
    if (!isClient && !isArtist) {
      return res.status(403).json({ message: 'No participas en esta reserva' });
    }

    // Solo se califica una vez terminado el evento
    if (booking.status !== 'finalizada') {
      return res.status(400).json({ message: 'Solo puedes calificar una reserva finalizada' });
    }

    // Cliente califica al artista; artista califica al cliente
    const ratee = isClient
      ? { id: artistUserId, role: 'artista' }
      : { id: booking.client_id, role: 'cliente' };

    const { error: insErr } = await supabase.from('reviews').insert({
      booking_id: booking.id,
      rater_id: req.user.id,
      ratee_id: ratee.id,
      ratee_role: ratee.role,
      score: numScore,
      comment: req.body.comment || null,
    });
    if (insErr) {
      if (insErr.code === '23505') {
        return res.status(409).json({ message: 'Ya calificaste esta contratación' });
      }
      return next(insErr);
    }

    const average = await refreshRateeAverage({
      rateeId: ratee.id,
      rateeRole: ratee.role,
      artistProfileId: booking.artist_profiles?.id,
    });

    await notify(
      ratee.id,
      'Nueva calificación recibida',
      `${req.user.name} te calificó con ${numScore}★ por la reserva #${booking.id}.`
    );

    res.status(201).json({ ok: true, score: numScore, average });
  } catch (err) {
    next(err);
  }
}

// POST /api/bookings  (un usuario contrata a un artista)
async function create(req, res, next) {
  try {
    const { artistId, event_type, event_date, event_end, duration_minutes, location, total } = req.body;

    if (!artistId || !event_date) {
      return res.status(400).json({ message: 'artistId y event_date son obligatorios' });
    }

    const range = resolveTimeRange({ event_date, event_end, duration_minutes });
    if (range.error) return res.status(400).json({ message: range.error });
    const { start, end } = range;

    if (start.getTime() <= Date.now()) {
      return res.status(400).json({ message: 'La fecha del evento debe ser futura' });
    }

    // El artista debe existir
    const { data: artist, error: artistError } = await supabase
      .from('artist_profiles')
      .select('id, user_id, is_available')
      .eq('id', artistId)
      .maybeSingle();
    if (artistError) return next(artistError);
    if (!artist) return res.status(404).json({ message: 'Artista no encontrado' });

    // No puedes contratarte a ti mismo
    if (Number(artist.user_id) === Number(req.user.id)) {
      return res.status(400).json({ message: 'No puedes reservarte a ti mismo' });
    }

    // Conflicto de agenda: solapamiento de rangos con una reserva activa
    const clash = await findOverlap(artistId, start, end);
    if (clash) {
      return res.status(409).json({
        message: 'El artista ya tiene una reserva que se solapa con ese horario',
      });
    }

    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
        client_id: req.user.id,
        artist_id: artistId,
        event_type: event_type || null,
        event_date: start.toISOString(),
        event_end: end.toISOString(),
        location: location || null,
        total: total ?? null,
        status: 'pendiente',
      })
      .select('*')
      .single();
    if (error) return next(error);

    // Notifica al artista de la nueva solicitud
    await notify(
      artist.user_id,
      'Nueva solicitud de reserva',
      `${req.user.name} quiere contratarte para ${event_type || 'un evento'}.`
    );

    res.status(201).json(booking);
  } catch (err) {
    next(err);
  }
}

// GET /api/bookings/availability?artistId=&date=&duration_minutes=  (público)
// 'date' es el inicio; el fin se deriva de duration_minutes (default 120) o 'end'.
async function checkAvailability(req, res, next) {
  try {
    const { artistId, date, end, duration_minutes } = req.query;
    if (!artistId || !date) {
      return res.status(400).json({ message: 'artistId y date son obligatorios' });
    }

    const range = resolveTimeRange({ event_date: date, event_end: end, duration_minutes });
    if (range.error) return res.status(400).json({ message: range.error });
    const { start, end: rangeEnd } = range;

    const { data: artist, error: artistError } = await supabase
      .from('artist_profiles')
      .select('id, is_available')
      .eq('id', artistId)
      .maybeSingle();
    if (artistError) return next(artistError);
    if (!artist) return res.status(404).json({ message: 'Artista no encontrado' });

    const clash = await findOverlap(artistId, start, rangeEnd);

    res.json({
      artistId: Number(artistId),
      start: start.toISOString(),
      end: rangeEnd.toISOString(),
      available: artist.is_available && !clash,
    });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/bookings/:id/status  (cambiar estado; solo participantes)
async function updateStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!BOOKING_STATUSES.includes(status)) {
      return res.status(400).json({
        message: `status inválido. Valores: ${BOOKING_STATUSES.join(', ')}`,
      });
    }

    const { data: booking, error: findError } = await supabase
      .from('bookings')
      .select('*, artist_profiles(user_id)')
      .eq('id', req.params.id)
      .maybeSingle();
    if (findError) return next(findError);
    if (!booking) return res.status(404).json({ message: 'Reserva no encontrada' });

    // ¿El solicitante es el cliente o el artista de esta reserva?
    const isClient = Number(booking.client_id) === Number(req.user.id);
    const isArtist = Number(booking.artist_profiles?.user_id) === Number(req.user.id);
    if (!isClient && !isArtist) {
      return res.status(403).json({ message: 'No participas en esta reserva' });
    }

    const role = isArtist ? 'artista' : 'cliente';
    if (!ALLOWED_TRANSITIONS[role].includes(status)) {
      return res.status(403).json({
        message: `Como ${role} no puedes cambiar el estado a '${status}'`,
      });
    }

    const { data: updated, error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', booking.id)
      .select('*')
      .single();
    if (error) return next(error);

    // Notifica a la otra parte del cambio de estado
    const counterpartId = isArtist ? booking.client_id : booking.artist_profiles?.user_id;
    if (counterpartId) {
      await notify(counterpartId, 'Reserva actualizada', `La reserva #${booking.id} cambió a '${status}'.`);
    }

    // Al finalizar el evento, invita a AMBAS partes a calificarse (flujo bilateral)
    if (status === 'finalizada') {
      const inviteBoth = [booking.client_id, booking.artist_profiles?.user_id].filter(Boolean);
      for (const uid of inviteBoth) {
        await notify(uid, 'Califica tu experiencia', `El evento de la reserva #${booking.id} terminó. Deja tu calificación.`);
      }
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

module.exports = { listMine, create, checkAvailability, updateStatus, createReview };
