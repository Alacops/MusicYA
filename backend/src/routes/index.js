const { Router } = require('express');

const auth = require('./auth.routes');
const artists = require('./artists.routes');
const search = require('./search.routes');
const bookings = require('./bookings.routes');
const payments = require('./payments.routes');
const chat = require('./chat.routes');
const notifications = require('./notifications.routes');
const recommendations = require('./recommendations.routes');
const metrics = require('./metrics.routes');

const router = Router();

// Healthcheck de la API (la app móvil lo usa para verificar la conexión)
router.get('/', (req, res) => {
  res.json({ service: 'MusicYA API', status: 'ok', version: '1.0.0' });
});

router.use('/auth', auth);                       // Registro / login (artistas y clientes)
router.use('/artists', artists);                 // Perfiles, portafolio, calificaciones
router.use('/search', search);                   // Geolocalización, filtros, disponibilidad
router.use('/bookings', bookings);               // Reservas y validación de disponibilidad
router.use('/payments', payments);               // Pagos con código QR
router.use('/chat', chat);                        // Mensajería y chatbot
router.use('/notifications', notifications);     // Notificaciones
router.use('/recommendations', recommendations); // Recomendaciones e historial
router.use('/metrics', metrics);                 // Métricas de la hipótesis (Lean Startup)

module.exports = router;
