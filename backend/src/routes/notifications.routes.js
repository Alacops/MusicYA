const { Router } = require('express');
const ctrl = require('../controllers/notifications.controller');
const { authRequired } = require('../middlewares/auth.middleware');

const router = Router();

router.get('/', authRequired, ctrl.listMine);
router.patch('/read-all', authRequired, ctrl.markAllRead); // Marcar todas como leídas
router.patch('/:id/read', authRequired, ctrl.markRead);

module.exports = router;
