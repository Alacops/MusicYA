const { Router } = require('express');
const ctrl = require('../controllers/metrics.controller');

const router = Router();

router.post('/event', ctrl.record);   // Registrar evento del embudo de búsqueda
router.get('/summary', ctrl.summary); // Indicadores de la hipótesis (Lean Startup)

module.exports = router;
