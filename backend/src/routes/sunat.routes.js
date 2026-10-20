import { Router } from 'express';
import { SunatController } from '../controllers/sunat.controller.js';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

// Credenciales Clave SOL
router.get('/credenciales/:clienteId', authenticateToken, SunatController.getCredenciales);
router.post('/credenciales/:clienteId', authenticateToken, requireRole('CONTADOR'), SunatController.guardarCredenciales);

// Validación de Conexión & Generación de Token
router.post('/validar-conexion/:clienteId', authenticateToken, requireRole('CONTADOR'), SunatController.validarConexion);
router.post('/generar-token', authenticateToken, SunatController.generarTokenDirecto);

// Autologin en SUNAT SOL
router.get('/autologin/:clienteId', authenticateToken, SunatController.getAutologin);
router.get('/autologin/:clienteId/launch', SunatController.renderAutologinHtml);

// Buzón SOL (Mensajes y Notificaciones Electrónicas)
router.get('/buzon', authenticateToken, SunatController.getBuzonMensajes);
router.get('/buzon/:mensajeId/detalle', authenticateToken, SunatController.getDetalleBuzon);
router.get('/buzon/adjunto/:mensajeId/:codArchivo', authenticateToken, SunatController.descargarAdjunto);
router.post('/buzon/sincronizar-todos', authenticateToken, requireRole('CONTADOR'), SunatController.sincronizarBuzonTodos);
router.post('/buzon/sincronizar/:clienteId', authenticateToken, SunatController.sincronizarBuzon);
router.patch('/buzon/:mensajeId/leido', authenticateToken, SunatController.marcarLeido);

// Cronograma de Obligaciones Tributarias Mensuales SUNAT
router.get('/cronograma', authenticateToken, SunatController.getCronogramaOficial);
router.post('/cronograma/sincronizar', authenticateToken, SunatController.sincronizarCronogramaPortal);
router.get('/cronograma/clientes', authenticateToken, SunatController.getCronogramaClientes);
router.get('/cronograma/ruc/:ruc', authenticateToken, SunatController.getVencimientoRuc);

export default router;

