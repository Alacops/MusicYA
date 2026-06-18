const { Router } = require('express');
const ctrl = require('../controllers/auth.controller');
const { authRequired } = require('../middlewares/auth.middleware');

const router = Router();

router.post('/register', ctrl.register); // Registro de clientes y artistas
router.post('/login', ctrl.login);       // Inicio de sesión
router.get('/me', authRequired, ctrl.me); // Perfil del usuario autenticado

module.exports = router;
