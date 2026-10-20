import { db } from '../config/database.js';

/**
 * Modelo Notificacion (Patrón MVC con Knex.js)
 * Gestiona el registro auditable de notificaciones multicanal (WhatsApp y Nodemailer) y contingencias.
 */
export class Notificacion {
  /**
   * Registrar notificación emitida en la bitácora
   */
  static async create({
    clienteId,
    transaccionId = null,
    canal,
    destinatario,
    asunto = null,
    mensaje,
    estado,
    errorLog = null
  }) {
    const res = await db('notificaciones').insert({
      cliente_id: clienteId ? Number(clienteId) : null,
      transaccion_id: transaccionId ? Number(transaccionId) : null,
      canal,
      destinatario,
      asunto,
      mensaje,
      estado,
      error_log: errorLog
    }).returning('id');

    const id = Array.isArray(res) ? res[0] : res;
    return typeof id === 'object' && id !== null ? id.id : id;
  }

  /**
   * Obtener lista auditable de notificaciones con filtros
   */
  static async findAll({ clienteId, canal, estado, limit = 50 } = {}) {
    let query = db('notificaciones as n')
      .leftJoin('clientes as c', 'c.id', 'n.cliente_id')
      .select(
        'n.*',
        'c.razon_social as cliente_razon_social',
        'c.ruc as cliente_ruc'
      );

    if (clienteId) {
      query = query.where('n.cliente_id', Number(clienteId));
    }

    if (canal) {
      query = query.where('n.canal', canal);
    }

    if (estado) {
      query = query.where('n.estado', estado);
    }

    return query
      .orderBy('n.fecha_envio', 'desc')
      .limit(Number(limit));
  }

  /**
   * Obtener métricas consolidadas para el Dashboard
   */
  static async getResumenMetrics() {
    const row = await db('notificaciones')
      .select(
        db.raw('COUNT(*) as total'),
        db.raw("SUM(CASE WHEN estado = 'ENVIADO' THEN 1 ELSE 0 END) as enviados"),
        db.raw("SUM(CASE WHEN estado = 'RESPALDO_ENVIADO' THEN 1 ELSE 0 END) as respaldo_contingencia"),
        db.raw("SUM(CASE WHEN estado = 'FALLIDO' THEN 1 ELSE 0 END) as fallidos"),
        db.raw("SUM(CASE WHEN canal = 'WHATSAPP' THEN 1 ELSE 0 END) as whatsapp"),
        db.raw("SUM(CASE WHEN canal = 'EMAIL' THEN 1 ELSE 0 END) as email")
      )
      .first();

    return {
      total: Number(row?.total || 0),
      enviados: Number(row?.enviados || 0),
      respaldo_contingencia: Number(row?.respaldo_contingencia || 0),
      fallidos: Number(row?.fallidos || 0),
      whatsapp: Number(row?.whatsapp || 0),
      email: Number(row?.email || 0)
    };
  }
}
