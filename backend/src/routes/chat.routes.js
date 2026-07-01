const { Router } = require('express');
const ctrl = require('../controllers/chat.controller');
const { authRequired } = require('../middlewares/auth.middleware');

const router = Router();

router.get('/', authRequired, ctrl.listConversations);               // Mis conversaciones
router.post('/', authRequired, ctrl.startConversation);              // Iniciar conversación
router.post('/bot', ctrl.bot);                                       // Chatbot instantáneo (público: también para invitados)
router.get('/:conversationId/messages', authRequired, ctrl.history); // Historial de chat
router.post('/:conversationId/messages', authRequired, ctrl.sendMessage); // Enviar mensaje

module.exports = router;
