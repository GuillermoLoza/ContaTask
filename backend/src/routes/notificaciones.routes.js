import { Router } from 'express';
import { enviarNotificacion, getNotificacionesAudit, getNotificacionesResumen } from '../controllers/notificaciones.controller.js';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

// El contador puede disparar notificaciones y auditar
router.post('/enviar', authenticateToken, requireRole('CONTADOR'), enviarNotificacion);
router.get('/', authenticateToken, requireRole('CONTADOR'), getNotificacionesAudit);
router.get('/resumen', authenticateToken, requireRole('CONTADOR'), getNotificacionesResumen);

export default router;
