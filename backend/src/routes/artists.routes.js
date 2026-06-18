const { Router } = require('express');
const ctrl = require('../controllers/artists.controller');
const { authRequired, requireRole } = require('../middlewares/auth.middleware');

const router = Router();

router.get('/', ctrl.list);                                   // Listar artistas
router.get('/:id', ctrl.getById);                             // Perfil de un artista
router.post('/', authRequired, requireRole('artista'), ctrl.create);
router.put('/:id', authRequired, requireRole('artista'), ctrl.update);
router.post('/:id/ratings', authRequired, ctrl.addRating);    // Calificar a un artista

module.exports = router;
