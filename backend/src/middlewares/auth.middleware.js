const jwt = require('jsonwebtoken');

// Protege rutas verificando el token JWT enviado en Authorization: Bearer <token>
function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Token no proporcionado' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
}

// Restringe el acceso según el rol del usuario (ej. 'artista', 'cliente')
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'No autorizado para esta acción' });
    }
    next();
  };
}

module.exports = { authRequired, requireRole };
