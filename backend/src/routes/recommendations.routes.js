const { Router } = require('express');
const ctrl = require('../controllers/recommendations.controller');
const { authRequired } = require('../middlewares/auth.middleware');

const router = Router();

router.get('/', authRequired, ctrl.forUser);     // Recomendaciones inteligentes
router.get('/history', authRequired, ctrl.history); // Historial de contrataciones

module.exports = router;
