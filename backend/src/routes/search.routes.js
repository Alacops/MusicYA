const { Router } = require('express');
const ctrl = require('../controllers/search.controller');

const router = Router();

// Búsqueda por ubicación (lat/lng + radio), género, tipo de evento y disponibilidad
router.get('/', ctrl.search);
router.get('/nearby', ctrl.nearby);

module.exports = router;
