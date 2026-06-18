const { Router } = require('express');
const ctrl = require('../controllers/bookings.controller');
const { authRequired } = require('../middlewares/auth.middleware');

const router = Router();

router.get('/', authRequired, ctrl.listMine);          // Reservas del usuario
router.post('/', authRequired, ctrl.create);           // Crear reserva
router.get('/availability', ctrl.checkAvailability);   // Validar disponibilidad
router.patch('/:id/status', authRequired, ctrl.updateStatus);

module.exports = router;
