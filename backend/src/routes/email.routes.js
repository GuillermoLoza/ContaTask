import { Router } from 'express';
import {
  sendEmail,
  getTemplates,
  previewTemplate,
  getSmtpConfig,
  updateSmtpConfig,
  testConnection,
  getEmailHistory,
  getCorreosRecibidos,
  getCorreoRecibidoById,
  sincronizarBandeja,
  testImapConnection,
  marcarCorreoLeido,
  convertirAdjuntoEnSustento,
  eliminarCorreoRecibido,
  inyectarCorreoSimulado
} from '../controllers/email.controller.js';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

// Todas las rutas de correo requieren autenticación de contador
router.use(authenticateToken);
router.use(requireRole('CONTADOR'));

// Rutas de Salida (SMTP)
router.post('/send', sendEmail);
router.get('/templates', getTemplates);
router.post('/templates/preview', previewTemplate);
router.get('/config', getSmtpConfig);
router.post('/config', updateSmtpConfig);
router.post('/test', testConnection);
router.get('/history', getEmailHistory);

// Rutas de Entrada (IMAP - Buzón de Correos Recibidos)
router.get('/recibidos', getCorreosRecibidos);
router.get('/recibidos/:id', getCorreoRecibidoById);
router.post('/sincronizar', sincronizarBandeja);
router.post('/test-imap', testImapConnection);
router.patch('/recibidos/:id/leido', marcarCorreoLeido);
router.post('/recibidos/:id/convertir-sustento', convertirAdjuntoEnSustento);
router.delete('/recibidos/:id', eliminarCorreoRecibido);
router.post('/simular', inyectarCorreoSimulado);

export default router;

