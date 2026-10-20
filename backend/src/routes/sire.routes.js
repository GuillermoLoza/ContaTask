import { Router } from 'express';
import { SireController } from '../controllers/sire.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticateToken);

// Propuestas SIRE y Comprobantes
router.get('/:clienteId/propuesta', SireController.getPropuesta);
router.post('/:clienteId/extraer', SireController.extraerPropuesta);
router.patch('/comprobantes/:comprobanteId/excluir', SireController.excluirComprobante);
router.patch('/comprobantes/:comprobanteId/incluir', SireController.incluirComprobante);
router.post('/:clienteId/comprobantes/manual', SireController.agregarManual);
router.post('/:clienteId/consolidar', SireController.consolidarPropuesta);

// Liquidación Mensual de Impuestos (Formulario 621) y NPS
router.get('/:clienteId/liquidacion', SireController.calcularLiquidacion);
router.post('/:clienteId/declarar-nps', SireController.declararNps);
router.get('/:clienteId/archivo-plano', SireController.descargarPlano);

export default router;
