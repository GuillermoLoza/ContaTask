import { db } from '../config/database.js';

/**
 * Modelo Transaccion (Patrón MVC con Knex.js)
 * Gestiona operaciones contables, control de bancarización y transiciones de estado de sustento.
 */
export class Transaccion {
  /**
   * Buscar transacciones según filtros dinámicos (clienteId, ruc, periodo, estado, bancarizacion)
   */
  static async findAll({ clienteId, ruc, periodo, estado, requiereBancarizacion } = {}) {
    let query = db('transacciones as t')
      .join('clientes as c', 'c.id', 't.cliente_id')
      .select(
        't.id',
        't.cliente_id',
        't.periodo',
        't.tipo_operacion',
        't.comprobante_tipo',
        't.numero_comprobante',
        't.emisor_ruc',
        't.emisor_razon_social',
        't.fecha_emision',
        't.moneda',
        't.monto_total',
        't.monto_igv',
        't.requiere_bancarizacion',
        't.estado_sustento',
        't.observaciones',
        't.created_at',
        't.updated_at',
        'c.razon_social as cliente_razon_social',
        'c.ruc as cliente_ruc',
        db.raw('(SELECT COUNT(*) FROM documentos_sustento ds WHERE ds.transaccion_id = t.id) as total_documentos'),
        db.raw('(SELECT ds.id FROM documentos_sustento ds WHERE ds.transaccion_id = t.id ORDER BY ds.id DESC LIMIT 1) as ultimo_documento_id'),
        db.raw('(SELECT ds.nombre_original FROM documentos_sustento ds WHERE ds.transaccion_id = t.id ORDER BY ds.id DESC LIMIT 1) as ultimo_documento_nombre')
      );

    if (clienteId) {
      query = query.where('t.cliente_id', Number(clienteId));
    } else if (ruc) {
      query = query.where('c.ruc', String(ruc).trim());
    }

    if (periodo) {
      query = query.where('t.periodo', String(periodo).trim());
    }

    if (estado) {
      query = query.where('t.estado_sustento', estado);
    }

    if (requiereBancarizacion !== undefined) {
      const isBancarizado = requiereBancarizacion === true || requiereBancarizacion === 1 || requiereBancarizacion === '1';
      query = query.where('t.requiere_bancarizacion', isBancarizado ? 1 : 0);
    }

    const records = await query.orderBy('t.fecha_emision', 'desc');

    return records.map(r => ({
      ...r,
      monto_total: parseFloat(r.monto_total),
      monto_igv: parseFloat(r.monto_igv || 0),
      requiere_bancarizacion: Boolean(r.requiere_bancarizacion),
      total_documentos: Number(r.total_documentos || 0)
    }));
  }

  /**
   * Buscar transacción por ID con datos del cliente asociado
   */
  static async findById(id) {
    const record = await db('transacciones as t')
      .join('clientes as c', 'c.id', 't.cliente_id')
      .select(
        't.*',
        'c.razon_social as cliente_razon_social',
        'c.ruc as cliente_ruc',
        'c.celular as cliente_celular',
        'c.email as cliente_email'
      )
      .where('t.id', Number(id))
      .first();

    if (!record) return null;

    return {
      ...record,
      monto_total: parseFloat(record.monto_total),
      monto_igv: parseFloat(record.monto_igv || 0),
      requiere_bancarizacion: Boolean(record.requiere_bancarizacion)
    };
  }

  /**
   * Actualizar el estado de sustento y observaciones
   */
  static async updateEstado(id, nuevoEstado, observaciones = null) {
    return db('transacciones')
      .where({ id: Number(id) })
      .update({
        estado_sustento: nuevoEstado,
        observaciones,
        updated_at: db.fn.now()
      });
  }

  /**
   * Crear nueva transacción
   */
  static async create({
    cliente_id,
    periodo,
    tipo_operacion,
    comprobante_tipo,
    numero_comprobante,
    emisor_ruc,
    emisor_razon_social,
    fecha_emision,
    moneda = 'PEN',
    monto_total,
    monto_igv = 0,
    requiere_bancarizacion = 0,
    estado_sustento = 'INFORMACION_INCOMPLETA',
    observaciones = null
  }) {
    const res = await db('transacciones').insert({
      cliente_id: Number(cliente_id),
      periodo,
      tipo_operacion,
      comprobante_tipo,
      numero_comprobante: numero_comprobante || null,
      emisor_ruc: emisor_ruc || null,
      emisor_razon_social: emisor_razon_social || null,
      fecha_emision,
      moneda,
      monto_total: Number(monto_total),
      monto_igv: Number(monto_igv),
      requiere_bancarizacion: requiere_bancarizacion ? 1 : 0,
      estado_sustento,
      observaciones
    }).returning('id');

    const id = Array.isArray(res) ? res[0] : res;
    return typeof id === 'object' && id !== null ? id.id : id;
  }
}
