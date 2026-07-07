const { supabase } = require('../config/supabase');

// Tipos de evento válidos del embudo de búsqueda/contratación.
const EVENT_TYPES = ['search_started', 'filter_applied', 'artist_opened', 'request_initiated'];

// POST /api/metrics/event
// Registra un evento de la sesión de búsqueda. Público (funciona también para el
// invitado); la medición se agrupa por session_id, no por usuario.
async function record(req, res, next) {
  try {
    const { session_id, event_type, elapsed_ms, artist_id, filters } = req.body;
    if (!session_id || !event_type) {
      return res.status(400).json({ message: 'session_id y event_type son obligatorios' });
    }
    if (!EVENT_TYPES.includes(event_type)) {
      return res.status(400).json({ message: `event_type inválido (usa: ${EVENT_TYPES.join(', ')})` });
    }

    const row = {
      session_id: String(session_id),
      event_type,
      elapsed_ms: Number.isFinite(Number(elapsed_ms)) ? Math.round(Number(elapsed_ms)) : null,
      artist_id: artist_id != null && Number.isFinite(Number(artist_id)) ? Number(artist_id) : null,
      filters: filters ?? null,
      user_id: req.user?.id ?? null,
    };

    const { error } = await supabase.from('search_events').insert(row);
    if (error) return next(error);
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// GET /api/metrics/summary
// Indicadores accionables de la hipótesis: tiempo medio para encontrar un artista,
// tasa de éxito (sesiones con resultado) y tasa de solicitud (sesiones que contratan).
async function summary(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('search_events')
      .select('session_id, event_type, elapsed_ms');
    if (error) return next(error);

    const rows = data || [];
    const sessions = new Set(rows.map((r) => r.session_id));
    const opened = rows.filter((r) => r.event_type === 'artist_opened');
    const requested = rows.filter((r) => r.event_type === 'request_initiated');
    const sessionsWithResult = new Set(opened.map((r) => r.session_id));
    const sessionsWithRequest = new Set(requested.map((r) => r.session_id));

    // Tiempo hasta encontrar: primer 'artist_opened' de cada sesión.
    const firstOpen = {};
    for (const r of opened) {
      if (r.elapsed_ms == null) continue;
      if (firstOpen[r.session_id] == null || r.elapsed_ms < firstOpen[r.session_id]) {
        firstOpen[r.session_id] = r.elapsed_ms;
      }
    }
    const times = Object.values(firstOpen);
    const avgMs = times.length ? times.reduce((a, b) => a + b, 0) / times.length : null;

    const total = sessions.size;
    res.json({
      sessions: total,
      sessions_with_result: sessionsWithResult.size,
      sessions_with_request: sessionsWithRequest.size,
      success_rate: total ? +(sessionsWithResult.size / total).toFixed(3) : 0,
      request_rate: total ? +(sessionsWithRequest.size / total).toFixed(3) : 0,
      avg_time_to_find_ms: avgMs != null ? Math.round(avgMs) : null,
      avg_time_to_find_s: avgMs != null ? +(avgMs / 1000).toFixed(1) : null,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { record, summary };
