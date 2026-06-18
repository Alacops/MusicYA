// Accessor compartido de la instancia de Socket.IO.
// Permite que los controladores emitan eventos en tiempo real sin crear
// dependencias circulares con sockets/index.js.
let io = null;

function setIO(instance) {
  io = instance;
}

function getIO() {
  return io;
}

// Emite un evento a la sala personal de un usuario (user:<id>).
// Es no-op si los sockets aún no se han inicializado.
function emitToUser(userId, event, payload) {
  if (io) io.to(`user:${userId}`).emit(event, payload);
}

module.exports = { setIO, getIO, emitToUser };
