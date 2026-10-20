import { Router } from 'express';
import { getTransacciones, getTransaccionById, evaluarTransaccion } from '../controllers/transacciones.controller.js';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', authenticateToken, getTransacciones);
router.get('/:id', authenticateToken, getTransaccionById);

// Solo el contador puede evaluar documentos (RF-C04)
router.patch('/:id/evaluar', authenticateToken, requireRole('CONTADOR'), evaluarTransaccion);

export default router;
