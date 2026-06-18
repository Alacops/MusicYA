// Mensajería (persistida) y chatbot. El envío en tiempo real se maneja en
// src/sockets, que reutiliza el helper saveMessage de este módulo.
const { supabase } = require('../config/supabase');

// Carga una conversación con el user_id del artista (para control de acceso)
async function loadConversation(conversationId) {
  const { data, error } = await supabase
    .from('conversations')
    .select('id, client_id, artist_id, artist_profiles(user_id)')
    .eq('id', conversationId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ¿El usuario participa en la conversación (es el cliente o el artista)?
function isParticipant(conv, userId) {
  return (
    Number(conv.client_id) === Number(userId) ||
    Number(conv.artist_profiles?.user_id) === Number(userId)
  );
}

// Versión asíncrona: carga la conversación y comprueba pertenencia.
// La usan los sockets para autorizar el acceso a una sala de chat.
async function userInConversation(conversationId, userId) {
  const conv = await loadConversation(conversationId);
  return Boolean(conv && isParticipant(conv, userId));
}

// Persiste un mensaje validando que el remitente participe en la conversación.
// Lo usan tanto el endpoint REST como el socket 'chat:message'.
async function saveMessage(conversationId, senderId, body) {
  const text = String(body || '').trim();
  if (!text) throw new Error('El mensaje no puede estar vacío');

  const conv = await loadConversation(conversationId);
  if (!conv) throw new Error('Conversación no encontrada');
  if (!isParticipant(conv, senderId)) throw new Error('No participas en esta conversación');

  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conv.id, sender_id: senderId, body: text })
    .select('id, conversation_id, sender_id, body, created_at')
    .single();
  if (error) throw error;
  return data;
}

// GET /api/chat  (conversaciones del usuario autenticado)
async function listConversations(req, res, next) {
  try {
    const selectCols =
      'id, created_at, client_id, artist_id, ' +
      'users!conversations_client_id_fkey(name), ' +
      'artist_profiles(genre, users(name))';

    let query = supabase
      .from('conversations')
      .select(selectCols)
      .order('created_at', { ascending: false });

    if (req.user.role === 'artista') {
      const { data: profile } = await supabase
        .from('artist_profiles')
        .select('id')
        .eq('user_id', req.user.id)
        .maybeSingle();
      if (!profile) return res.json([]);
      query = query.eq('artist_id', profile.id);
    } else {
      query = query.eq('client_id', req.user.id);
    }

    const { data, error } = await query;
    if (error) return next(error);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

// POST /api/chat  (inicia o recupera la conversación con un artista)
async function startConversation(req, res, next) {
  try {
    const { artistId } = req.body;
    if (!artistId) return res.status(400).json({ message: 'artistId es obligatorio' });

    const { data: artist, error: artistError } = await supabase
      .from('artist_profiles')
      .select('id, user_id')
      .eq('id', artistId)
      .maybeSingle();
    if (artistError) return next(artistError);
    if (!artist) return res.status(404).json({ message: 'Artista no encontrado' });

    if (Number(artist.user_id) === Number(req.user.id)) {
      return res.status(400).json({ message: 'No puedes iniciar una conversación contigo mismo' });
    }

    // Get-or-create: una sola conversación por par cliente-artista
    const { data: existing, error: findError } = await supabase
      .from('conversations')
      .select('id, client_id, artist_id, created_at')
      .eq('client_id', req.user.id)
      .eq('artist_id', artistId)
      .maybeSingle();
    if (findError) return next(findError);
    if (existing) return res.json(existing);

    const { data: created, error } = await supabase
      .from('conversations')
      .insert({ client_id: req.user.id, artist_id: artistId })
      .select('id, client_id, artist_id, created_at')
      .single();
    if (error) return next(error);

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
}

// GET /api/chat/:conversationId/messages  (historial, solo participantes)
async function history(req, res, next) {
  try {
    const conv = await loadConversation(req.params.conversationId);
    if (!conv) return res.status(404).json({ message: 'Conversación no encontrada' });
    if (!isParticipant(conv, req.user.id)) {
      return res.status(403).json({ message: 'No participas en esta conversación' });
    }

    const { data, error } = await supabase
      .from('messages')
      .select('id, sender_id, body, created_at, users(name)')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true });
    if (error) return next(error);

    res.json({ conversationId: conv.id, messages: data });
  } catch (err) {
    next(err);
  }
}

// POST /api/chat/:conversationId/messages  (enviar y persistir un mensaje)
async function sendMessage(req, res, next) {
  try {
    const message = await saveMessage(req.params.conversationId, req.user.id, req.body.body);
    res.status(201).json(message);
  } catch (err) {
    // Errores de validación del helper -> 400/403/404 según el caso
    if (/vacío/.test(err.message)) return res.status(400).json({ message: err.message });
    if (/no encontrada/.test(err.message)) return res.status(404).json({ message: err.message });
    if (/No participas/.test(err.message)) return res.status(403).json({ message: err.message });
    next(err);
  }
}

// POST /api/chat/bot
// Chatbot por palabras clave: responde dudas frecuentes de contratación
async function bot(req, res, next) {
  const text = String(req.body.message || '').toLowerCase();

  const intents = [
    { keys: ['hola', 'buenas', 'saludos'], reply: '¡Hola! Soy el asistente de MusicYA. Puedo ayudarte a reservar artistas, entender los pagos o resolver dudas. ¿Qué necesitas?' },
    { keys: ['reserv', 'contrat', 'agendar'], reply: 'Para reservar: busca un artista, abre su perfil y crea una reserva con la fecha del evento. El artista la confirmará y luego podrás pagar.' },
    { keys: ['pag', 'qr', 'yape', 'plin'], reply: 'Los pagos se hacen con QR. Genera el QR desde tu reserva confirmada, paga y sube tu comprobante para validar el pago.' },
    { keys: ['precio', 'tarifa', 'costo', 'cuánto', 'cuanto'], reply: 'Cada artista define su tarifa por hora en su perfil. El total de la reserva aparece antes de confirmar el pago.' },
    { keys: ['cancel', 'reembolso'], reply: 'Puedes cancelar una reserva desde "Mis reservas" mientras no esté finalizada. Para reembolsos, coordina directamente con el artista por el chat.' },
    { keys: ['artista', 'registr', 'unir'], reply: 'Si eres músico, regístrate como "artista", completa tu perfil (género, tarifa, portafolio) y empezarás a recibir solicitudes de reserva.' },
  ];

  const match = intents.find((i) => i.keys.some((k) => text.includes(k)));
  const reply = match
    ? match.reply
    : 'No estoy seguro de haber entendido. Puedo ayudarte con reservas, pagos, tarifas o cómo registrarte como artista. ¿Sobre cuál quieres saber?';

  res.json({ reply });
}

module.exports = {
  listConversations,
  startConversation,
  history,
  sendMessage,
  bot,
  saveMessage,
  userInConversation,
};
