import { db } from '../config/database.js';

/**
 * Modelo CorreoRecibido (Patrón MVC con Knex.js)
 * Gestiona el almacenamiento de correos capturados por IMAP, asociación con MYPEs y adjuntos.
 */
export class CorreoRecibido {
  /**
   * Registrar correo capturado en la base de datos
   */
  static async create({
    messageId,
    uid,
    remitente,
    remitenteEmail,
    destinatario,
    asunto,
    fecha,
    cuerpoTexto,
    cuerpoHtml,
    leido = false,
    clienteId = null,
    clienteRuc = null,
    transaccionId = null,
    tieneAdjuntos = false,
    adjuntosJson = null,
    procesadoComoSustento = false
  }) {
    const res = await db('correos_recibidos').insert({
      message_id: messageId || null,
      uid: uid ? String(uid) : null,
      remitente: remitente || 'Desconocido',
      remitente_email: remitenteEmail || '',
      destinatario: destinatario || null,
      asunto: asunto || '(Sin Asunto)',
      fecha: fecha ? new Date(fecha) : new Date(),
      cuerpo_texto: cuerpoTexto || '',
      cuerpo_html: cuerpoHtml || null,
      leido: Boolean(leido),
      cliente_id: clienteId ? Number(clienteId) : null,
      cliente_ruc: clienteRuc || null,
      transaccion_id: transaccionId ? Number(transaccionId) : null,
      tiene_adjuntos: Boolean(tieneAdjuntos),
      adjuntos_json: typeof adjuntosJson === 'object' && adjuntosJson !== null ? JSON.stringify(adjuntosJson) : adjuntosJson,
      procesado_como_sustento: Boolean(procesadoComoSustento)
    }).returning('id');

    const id = Array.isArray(res) ? res[0] : res;
    return typeof id === 'object' && id !== null ? id.id : id;
  }

  /**
   * Buscar por Message-ID para prevenir duplicados
   */
  static async findByMessageId(messageId) {
    if (!messageId) return null;
    return db('correos_recibidos').where('message_id', messageId).first();
  }

  /**
   * Buscar por ID único
   */
  static async findById(id) {
    const record = await db('correos_recibidos as cr')
      .leftJoin('clientes as c', 'c.id', 'cr.cliente_id')
      .leftJoin('transacciones as t', 't.id', 'cr.transaccion_id')
      .select(
        'cr.*',
        'c.razon_social as cliente_razon_social',
        'c.ruc as cliente_ruc_relacionado',
        't.numero_comprobante as transaccion_comprobante',
        't.periodo as transaccion_periodo'
      )
      .where('cr.id', Number(id))
      .first();

    if (record && record.adjuntos_json) {
      try {
        record.adjuntos = JSON.parse(record.adjuntos_json);
      } catch {
        record.adjuntos = [];
      }
    } else if (record) {
      record.adjuntos = [];
    }

    return record;
  }

  /**
   * Obtener listado de correos con filtros y estadísticas
   */
  static async findAll({
    clienteId,
    ruc,
    soloNoLeidos = false,
    conAdjuntos = false,
    search,
    limit = 50,
    offset = 0
  } = {}) {
    let query = db('correos_recibidos as cr')
      .leftJoin('clientes as c', 'c.id', 'cr.cliente_id')
      .leftJoin('transacciones as t', 't.id', 'cr.transaccion_id')
      .select(
        'cr.id',
        'cr.message_id',
        'cr.uid',
        'cr.remitente',
        'cr.remitente_email',
        'cr.destinatario',
        'cr.asunto',
        'cr.fecha',
        'cr.cuerpo_texto',
        'cr.leido',
        'cr.cliente_id',
        'cr.cliente_ruc',
        'cr.transaccion_id',
        'cr.tiene_adjuntos',
        'cr.adjuntos_json',
        'cr.procesado_como_sustento',
        'cr.created_at',
        'c.razon_social as cliente_razon_social',
        'c.ruc as cliente_ruc_relacionado',
        't.numero_comprobante as transaccion_comprobante'
      );

    if (clienteId) {
      query = query.where('cr.cliente_id', Number(clienteId));
    }

    if (ruc) {
      query = query.where('cr.cliente_ruc', ruc);
    }

    if (soloNoLeidos) {
      query = query.where('cr.leido', false);
    }

    if (conAdjuntos) {
      query = query.where('cr.tiene_adjuntos', true);
    }

    if (search) {
      const term = `%${search}%`;
      query = query.where(function() {
        this.where('cr.remitente', 'like', term)
          .orWhere('cr.remitente_email', 'like', term)
          .orWhere('cr.asunto', 'like', term)
          .orWhere('c.razon_social', 'like', term)
          .orWhere('cr.cliente_ruc', 'like', term);
      });
    }

    const records = await query
      .orderBy('cr.fecha', 'desc')
      .limit(Number(limit))
      .offset(Number(offset));

    return records.map((r) => {
      let adjuntos = [];
      if (r.adjuntos_json) {
        try {
          adjuntos = JSON.parse(r.adjuntos_json);
        } catch {
          adjuntos = [];
        }
      }
      return {
        ...r,
        adjuntos
      };
    });
  }

  /**
   * Marcar como leído o no leído
   */
  static async markAsRead(id, leido = true) {
    return db('correos_recibidos')
      .where('id', Number(id))
      .update({ leido: Boolean(leido) });
  }

  /**
   * Actualizar asociación del correo con una MYPE y transacción
   */
  static async updateVinculacion(id, { clienteId, clienteRuc, transaccionId, procesadoComoSustento }) {
    const updateData = {};
    if (clienteId !== undefined) updateData.cliente_id = clienteId ? Number(clienteId) : null;
    if (clienteRuc !== undefined) updateData.cliente_ruc = clienteRuc || null;
    if (transaccionId !== undefined) updateData.transaccion_id = transaccionId ? Number(transaccionId) : null;
    if (procesadoComoSustento !== undefined) updateData.procesado_como_sustento = Boolean(procesadoComoSustento);

    return db('correos_recibidos')
      .where('id', Number(id))
      .update(updateData);
  }

  /**
   * Actualizar adjuntos JSON
   */
  static async updateAdjuntosJson(id, adjuntos) {
    return db('correos_recibidos')
      .where('id', Number(id))
      .update({
        adjuntos_json: JSON.stringify(adjuntos),
        tiene_adjuntos: adjuntos && adjuntos.length > 0
      });
  }

  /**
   * Eliminar registro de correo recibido
   */
  static async delete(id) {
    return db('correos_recibidos').where('id', Number(id)).del();
  }

  /**
   * Obtener métricas y contadores de la bandeja de entrada
   */
  static async getStats() {
    const total = await db('correos_recibidos').count('* as count').first();
    const noLeidos = await db('correos_recibidos').where('leido', false).count('* as count').first();
    const conAdjuntos = await db('correos_recibidos').where('tiene_adjuntos', true).count('* as count').first();
    const procesados = await db('correos_recibidos').where('procesado_como_sustento', true).count('* as count').first();

    return {
      total: Number(total?.count || 0),
      noLeidos: Number(noLeidos?.count || 0),
      conAdjuntos: Number(conAdjuntos?.count || 0),
      procesados: Number(procesados?.count || 0)
    };
  }
}
