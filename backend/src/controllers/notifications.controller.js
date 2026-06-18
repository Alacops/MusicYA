const { supabase } = require('../config/supabase');
const { emitToUser } = require('../sockets/io');

// Helper reutilizable para crear una notificación: la persiste y la emite en
// tiempo real a la sala personal del usuario (user:<id>). Es el único punto
// de creación de notificaciones; lo importan bookings y payments.
async function createNotification(userId, title, body) {
  const { data, error } = await supabase
    .from('notifications')
    .insert({ user_id: userId, title, body })
    .select('id, title, body, is_read, created_at')
    .single();
  if (error) throw error;

  emitToUser(userId, 'notification:new', data);
  return data;
}

// GET /api/notifications?unread=true
// Lista las notificaciones del usuario autenticado + contador de no leídas
async function listMine(req, res, next) {
  try {
    let query = supabase
      .from('notifications')
      .select('id, title, body, is_read, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (req.query.unread === 'true') query = query.eq('is_read', false);

    const { data, error } = await query;
    if (error) return next(error);

    // Conteo de no leídas (independiente del filtro aplicado al listado)
    const { count, error: countError } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .eq('is_read', false);
    if (countError) return next(countError);

    res.json({ unread_count: count || 0, notifications: data });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/notifications/:id/read
// Marca una notificación como leída (solo si pertenece al usuario)
async function markRead(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id) // garantiza la propiedad
      .select('id, title, body, is_read, created_at')
      .maybeSingle();

    if (error) return next(error);
    if (!data) return res.status(404).json({ message: 'Notificación no encontrada' });

    res.json(data);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/notifications/read-all
// Marca todas las notificaciones no leídas del usuario como leídas
async function markAllRead(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', req.user.id)
      .eq('is_read', false)
      .select('id');

    if (error) return next(error);
    res.json({ updated: data.length });
  } catch (err) {
    next(err);
  }
}

module.exports = { listMine, markRead, markAllRead, createNotification };
