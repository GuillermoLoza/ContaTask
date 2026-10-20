import { ResponseView } from './response.view.js';

/**
 * Vista de Transacciones (Patrón MVC)
 * Formatea listas de operaciones, alertas de bancarización y resultados de evaluación.
 */
export class TransaccionView {
  /**
   * Renderizar lista de transacciones con metadatos del sustento
   */
  static renderList(res, transacciones) {
    return ResponseView.success(res, {
      transacciones: transacciones.map((t) => ({
        id: t.id,
        cliente_id: t.cliente_id,
        periodo: t.periodo,
        tipo_operacion: t.tipo_operacion,
        comprobante_tipo: t.comprobante_tipo,
        numero_comprobante: t.numero_comprobante,
        emisor_ruc: t.emisor_ruc,
        emisor_razon_social: t.emisor_razon_social,
        fecha_emision: t.fecha_emision,
        moneda: t.moneda,
        monto_total: Number(t.monto_total),
        monto_igv: Number(t.monto_igv),
        requiere_bancarizacion: Number(t.requiere_bancarizacion),
        estado_sustento: t.estado_sustento,
        observaciones: t.observaciones || null,
        cliente_razon_social: t.cliente_razon_social,
        cliente_ruc: t.cliente_ruc,
        total_documentos: Number(t.total_documentos || 0),
        ultimo_documento_id: t.ultimo_documento_id ? Number(t.ultimo_documento_id) : null,
        ultimo_documento_nombre: t.ultimo_documento_nombre || null
      }))
    });
  }

  /**
   * Renderizar detalle completo de transacción con documentos y auditoría
   */
  static renderDetail(res, transaccion, documentos, historial) {
    return ResponseView.success(res, {
      transaccion,
      documentos,
      historial
    });
  }

  /**
   * Renderizar confirmación de evaluación (Aprobación o Rechazo)
   */
  static renderEvaluationResult(res, transaccionId, nuevoEstado, accion) {
    return ResponseView.success(res, {
      message:
        accion === 'APROBAR'
          ? 'Documento aprobado y validado con éxito'
          : 'Documento rechazado con observación registrada',
      transaccionId,
      nuevoEstado
    });
  }
}
