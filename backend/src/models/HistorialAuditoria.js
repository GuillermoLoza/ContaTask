import { db } from '../config/database.js';

/**
 * Modelo HistorialAuditoria (Patrón MVC con Knex.js)
 * Registra inmutablemente cada cambio de estado, evaluación y carga de sustento para trazabilidad.
 */
export class HistorialAuditoria {
  /**
   * Registrar evento de auditoría
   */
  static async create({
    transaccionId,
    usuarioId = null,
    accion,
    estadoAnterior = null,
    estadoNuevo = null,
    motivo = null
  }) {
    const res = await db('historial_auditoria').insert({
      transaccion_id: Number(transaccionId),
      usuario_id: usuarioId ? Number(usuarioId) : null,
      accion,
      estado_anterior: estadoAnterior,
      estado_nuevo: estadoNuevo,
      motivo
    }).returning('id');

    const id = Array.isArray(res) ? res[0] : res;
    return typeof id === 'object' && id !== null ? id.id : id;
  }

  /**
   * Obtener historial completo de una transacción
   */
  static async findByTransaccionId(transaccionId) {
    return db('historial_auditoria as h')
      .leftJoin('usuarios as u', 'u.id', 'h.usuario_id')
      .select('h.*', 'u.nombre as usuario_nombre')
      .where('h.transaccion_id', Number(transaccionId))
      .orderBy('h.created_at', 'desc');
  }
}
