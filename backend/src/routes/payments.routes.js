const { Router } = require('express');
const ctrl = require('../controllers/payments.controller');
const { authRequired } = require('../middlewares/auth.middleware');

const router = Router();

router.post('/:bookingId/qr', authRequired, ctrl.generateQR); // Generar QR de pago
router.post('/:bookingId/confirm', authRequired, ctrl.confirm); // Validar comprobante

module.exports = router;
