import { ResponseView } from './response.view.js';

/**
 * Vista de Notificaciones (Patrón MVC)
 * Serializa los registros auditables de envíos multicanal y métricas de contingencia.
 */
export class NotificacionView {
  /**
   * Renderizar resultado de envío de notificación
   */
  static renderSendResult(res, resultado) {
    return ResponseView.success(res, {
      message: 'Notificación procesada',
      resultado
    });
  }

  /**
   * Renderizar listado de notificaciones para auditoría
   */
  static renderAuditList(res, notificaciones) {
    return ResponseView.success(res, { notificaciones });
  }

  /**
   * Renderizar métricas consolidadas del Dashboard
   */
  static renderResumen(res, resumen) {
    return ResponseView.success(res, { resumen });
  }
}
