import { Router } from 'express';
import { PlameController } from '../controllers/plame.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticateToken);

// Nómina de trabajadores y periodo PLAME
router.get('/:clienteId/periodo', PlameController.getPeriodo);
router.post('/:clienteId/trabajadores', PlameController.guardarTrabajador);
router.delete('/trabajadores/:trabajadorId', PlameController.eliminarTrabajador);

// Validación y generación de estructuras PDT PLAME
router.get('/:clienteId/validar', PlameController.validarPlanilla);
router.post('/:clienteId/generar-archivos', PlameController.generarArchivos);
router.post('/:clienteId/declarar', PlameController.declararPlame);

export default router;
