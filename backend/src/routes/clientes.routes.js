import { Router } from 'express';
import {
  getAllClientes,
  getClienteById,
  createCliente,
  updateCliente,
  updateClienteEstado,
  deleteCliente
} from '../controllers/clientes.controller.js';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

// El contador puede ver todos los clientes y registrar nuevos
router.get('/', authenticateToken, requireRole('CONTADOR'), getAllClientes);
router.post('/', authenticateToken, requireRole('CONTADOR'), createCliente);

// Actualizar información completa de cliente
router.put('/:id', authenticateToken, requireRole('CONTADOR'), updateCliente);

// Actualizar estado (activar / desactivar) y soft delete
router.patch('/:id/estado', authenticateToken, requireRole('CONTADOR'), updateClienteEstado);
router.delete('/:id', authenticateToken, requireRole('CONTADOR'), deleteCliente);

// Obtener cliente por ID o por RUC
router.get('/:idOrRuc', authenticateToken, getClienteById);

export default router;
