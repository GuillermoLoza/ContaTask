import { Router } from 'express';
import {
  getWhatsAppStatus,
  streamWhatsAppEvents,
  initializeWhatsApp,
  confirmScanWhatsApp,
  disconnectWhatsApp,
  sendTestMessage,
  configureWhatsAppAccount,
  requestPairingCodeWhatsApp,
  getConversaciones,
  getMensajesPorTelefono,
  enviarMensajeChat,
  marcarChatLeido,
  simularMensajeEntrante
} from '../controllers/whatsapp.controller.js';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

// Canal de streaming en tiempo real SSE (Server-Sent Events)
router.get('/stream', streamWhatsAppEvents);

// Rutas de administración de WhatsApp Web JS
router.get('/status', authenticateToken, getWhatsAppStatus);
router.post('/initialize', authenticateToken, requireRole('CONTADOR'), initializeWhatsApp);
router.post('/confirm-scan', authenticateToken, requireRole('CONTADOR'), confirmScanWhatsApp);
router.post('/disconnect', authenticateToken, requireRole('CONTADOR'), disconnectWhatsApp);
router.post('/send-test', authenticateToken, requireRole('CONTADOR'), sendTestMessage);
router.post('/config', authenticateToken, requireRole('CONTADOR'), configureWhatsAppAccount);
router.post('/pairing-code', authenticateToken, requireRole('CONTADOR'), requestPairingCodeWhatsApp);

// Rutas del Chat Interactivo en Tiempo Real
router.get('/chat/conversaciones', authenticateToken, getConversaciones);
router.get('/chat/:phoneNumber/mensajes', authenticateToken, getMensajesPorTelefono);
router.post('/chat/send', authenticateToken, enviarMensajeChat);
router.patch('/chat/:phoneNumber/read', authenticateToken, marcarChatLeido);
router.post('/chat/simulate-incoming', authenticateToken, simularMensajeEntrante);

export default router;
