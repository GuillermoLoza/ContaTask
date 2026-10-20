import { Notificacion } from '../models/Notificacion.js';
import { NotificacionView } from '../views/notificacion.view.js';
import { ResponseView } from '../views/response.view.js';
import { enviarNotificacionSustento } from '../services/notification.service.js';

/**
 * Controlador de Notificaciones (Patrón MVC con Knex)
 */
export async function enviarNotificacion(req, res, next) {
  try {
    const { clienteId, transaccionId, canal, forzarFalloWhatsApp, customMensaje } = req.body;

    if (!clienteId) {
      return ResponseView.error(res, 'Debe especificar el clienteId', 400);
    }

    // Invocar Servicio de Negocio
    const resultado = await enviarNotificacionSustento({
      clienteId: Number(clienteId),
      transaccionId: transaccionId ? Number(transaccionId) : null,
      canal: canal || 'WHATSAPP',
      forzarFalloWhatsApp: Boolean(forzarFalloWhatsApp),
      customMensaje
    });

    // Delegar a la Vista
    return NotificacionView.renderSendResult(res, resultado);
  } catch (error) {
    next(error);
  }
}

export async function getNotificacionesAudit(req, res, next) {
  try {
    const { clienteId, canal, estado, limit = 50 } = req.query;

    // Invocar Modelo
    const notificaciones = await Notificacion.findAll({
      clienteId,
      canal,
      estado,
      limit
    });

    // Delegar a la Vista
    return NotificacionView.renderAuditList(res, notificaciones);
  } catch (error) {
    next(error);
  }
}

export async function getNotificacionesResumen(_req, res, next) {
  try {
    // Invocar Modelo
    const resumen = await Notificacion.getResumenMetrics();

    // Delegar a la Vista
    return NotificacionView.renderResumen(res, resumen);
  } catch (error) {
    next(error);
  }
}
