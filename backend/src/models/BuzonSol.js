import { db } from '../config/database.js';

/**
 * Modelo BuzonSol (Patrón MVC con Knex.js)
 * Almacena y gestiona las notificaciones oficiales depositadas en el Buzón Electrónico SOL de SUNAT.
 */
export class BuzonSol {
  /**
   * Obtener notificaciones y mensajes del Buzón SOL con filtros
   */
  static async findAll({ clienteId, ruc, estado, categoria, limit = 100, offset = 0 } = {}) {
    let query = db('buzon_sol_mensajes as b')
      .leftJoin('clientes as c', 'c.id', 'b.cliente_id')
      .select(
        'b.*',
        'c.razon_social as cliente_razon_social',
        'c.email as cliente_email',
        'c.celular as cliente_celular'
      );

    if (clienteId) {
      query = query.where('b.cliente_id', Number(clienteId));
    }

    if (ruc) {
      query = query.where('b.cliente_ruc', String(ruc).trim());
    }

    if (estado && estado !== 'TODOS') {
      query = query.where('b.estado', estado);
    }

    if (categoria && categoria !== 'TODOS') {
      query = query.where('b.categoria_buzon', categoria);
    }

    const records = await query
      .orderBy('b.fecha_deposito', 'desc')
      .limit(Number(limit))
      .offset(Number(offset));

    return records;
  }

  /**
   * Obtener una notificación por su ID
   */
  static async findById(id) {
    return db('buzon_sol_mensajes as b')
      .leftJoin('clientes as c', 'c.id', 'b.cliente_id')
      .select(
        'b.*',
        'c.razon_social as cliente_razon_social',
        'c.email as cliente_email',
        'c.celular as cliente_celular'
      )
      .where('b.id', Number(id))
      .first();
  }

  /**
   * Buscar por número oficial de notificación y cliente
   */
  static async findByNumeroAndCliente(numeroNotificacion, clienteId) {
    return db('buzon_sol_mensajes')
      .where({
        numero_notificacion: String(numeroNotificacion).trim(),
        cliente_id: Number(clienteId)
      })
      .first();
  }

  /**
   * Buscar por número oficial de notificación
   */
  static async findByNumero(numeroNotificacion) {
    return db('buzon_sol_mensajes')
      .where({ numero_notificacion: String(numeroNotificacion).trim() })
      .first();
  }

  /**
   * Eliminar notificaciones mock generadas previamente para dar paso a las reales de SUNAT
   */
  static async deleteMockByCliente(clienteId) {
    return db('buzon_sol_mensajes')
      .where('cliente_id', Number(clienteId))
      .andWhere('numero_notificacion', 'like', 'NOT-%')
      .del();
  }

  /**
   * Registrar nueva notificación o mensaje de SUNAT
   */
  static async create(data) {
    const res = await db('buzon_sol_mensajes').insert({
      cliente_id: Number(data.cliente_id),
      cliente_ruc: String(data.cliente_ruc).trim(),
      numero_notificacion: String(data.numero_notificacion).trim(),
      categoria_buzon: data.categoria_buzon || 'NOTIFICACION',
      tipo_documento: data.tipo_documento,
      asunto: (data.asunto || '').trim(),
      mensaje: (data.mensaje || data.asunto || '').trim(),
      fecha_deposito: data.fecha_deposito || db.fn.now(),
      fecha_lectura: data.fecha_lectura || null,
      estado: data.estado || 'NO_LEIDO',
      plazo_dias: data.plazo_dias ? Number(data.plazo_dias) : null,
      fecha_vencimiento_plazo: data.fecha_vencimiento_plazo || null,
      adjunto_nombre: data.adjunto_nombre || null,
      requiere_respuesta: data.requiere_respuesta ? 1 : 0,
      detalle_json: data.detalle_json ? (typeof data.detalle_json === 'string' ? data.detalle_json : JSON.stringify(data.detalle_json)) : null
    }).returning('id');

    const id = Array.isArray(res) ? res[0] : res;
    return typeof id === 'object' && id !== null ? id.id : id;
  }

  /**
   * Actualizar mensaje del buzón
   */
  static async update(id, data) {
    await db('buzon_sol_mensajes')
      .where({ id: Number(id) })
      .update(data);
    return this.findById(id);
  }

  /**
   * Marcar notificación como leída
   */
  static async marcarLeido(id) {
    await db('buzon_sol_mensajes')
      .where({ id: Number(id) })
      .update({
        estado: 'LEIDO',
        fecha_lectura: db.fn.now()
      });

    return this.findById(id);
  }

  /**
   * Métricas y estadísticas del Buzón SOL
   */
  static async getStats({ clienteId } = {}) {
    let query = db('buzon_sol_mensajes');
    if (clienteId) {
      query = query.where('cliente_id', Number(clienteId));
    }

    const [stats] = await query.select(
      db.raw('COUNT(id) as total'),
      db.raw("SUM(CASE WHEN estado = 'NO_LEIDO' THEN 1 ELSE 0 END) as no_leidos"),
      db.raw("SUM(CASE WHEN estado = 'URGENTE' THEN 1 ELSE 0 END) as urgentes"),
      db.raw("SUM(CASE WHEN estado = 'LEIDO' THEN 1 ELSE 0 END) as leidos"),
      db.raw("SUM(CASE WHEN requiere_respuesta = TRUE AND estado != 'ATENDIDO' THEN 1 ELSE 0 END) as requieren_respuesta"),
      db.raw("SUM(CASE WHEN categoria_buzon = 'NOTIFICACION' THEN 1 ELSE 0 END) as total_notificaciones"),
      db.raw("SUM(CASE WHEN categoria_buzon = 'MENSAJE' THEN 1 ELSE 0 END) as total_mensajes")
    );

    return {
      total: Number(stats?.total || 0),
      no_leidos: Number(stats?.no_leidos || 0),
      urgentes: Number(stats?.urgentes || 0),
      leidos: Number(stats?.leidos || 0),
      requieren_respuesta: Number(stats?.requieren_respuesta || 0),
      total_notificaciones: Number(stats?.total_notificaciones || 0),
      total_mensajes: Number(stats?.total_mensajes || 0)
    };
  }
}
