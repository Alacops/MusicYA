const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { saveMessage, userInConversation } = require('../controllers/chat.controller');
const { setIO } = require('./io');

// Extrae el token del handshake: auth.token (recomendado), cabecera Bearer o query
function extractToken(socket) {
  const { auth, headers, query } = socket.handshake;
  if (auth && auth.token) return auth.token;
  const header = headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return query && query.token ? query.token : null;
}

// Servicios en tiempo real: mensajería, notificaciones y disponibilidad
function initSockets(server) {
  const io = new Server(server, {
    cors: { origin: process.env.CLIENT_ORIGIN || '*' },
  });

  // Comparte la instancia para que los controladores emitan en tiempo real
  setIO(io);

  // Autenticación del handshake: sin un JWT válido la conexión se rechaza.
  // A partir de aquí la identidad vive en socket.user (no se confía en payloads).
  io.use((socket, next) => {
    const token = extractToken(socket);
    if (!token) return next(new Error('Token no proporcionado'));
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
      next();
    } catch (err) {
      next(new Error('Token inválido o expirado'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`• Usuario conectado: ${socket.user.id} (${socket.id})`);

    // Cada usuario recibe sus notificaciones en su propia sala automáticamente
    socket.join(`user:${socket.user.id}`);

    // Unirse a una sala de conversación solo si participa en ella
    socket.on('chat:join', async (conversationId) => {
      try {
        if (await userInConversation(conversationId, socket.user.id)) {
          socket.join(`conv:${conversationId}`);
        } else {
          socket.emit('chat:error', { message: 'No participas en esta conversación' });
        }
      } catch (err) {
        socket.emit('chat:error', { message: err.message });
      }
    });

    // Enviar mensaje: el remitente es SIEMPRE el usuario autenticado del token.
    // Se persiste (validando pertenencia) y luego se reenvía a la sala.
    socket.on('chat:message', async (payload) => {
      try {
        const saved = await saveMessage(payload.conversationId, socket.user.id, payload.body);
        io.to(`conv:${payload.conversationId}`).emit('chat:message', saved);
      } catch (err) {
        socket.emit('chat:error', { message: err.message });
      }
    });

    socket.on('disconnect', () => {
      console.log(`• Usuario desconectado: ${socket.user.id} (${socket.id})`);
    });
  });

  return io;
}

module.exports = { initSockets };
