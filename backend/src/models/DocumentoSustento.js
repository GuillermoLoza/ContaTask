import { db } from '../config/database.js';

/**
 * Modelo DocumentoSustento (Patrón MVC con Knex.js)
 * Gestiona los registros de archivos de sustento (facturas, vouchers, recibos) y su estado de revisión.
 */
export class DocumentoSustento {
  /**
   * Registrar metadatos de un archivo subido
   */
  static async create({
    transaccionId,
    nombreArchivo,
    nombreOriginal,
    rutaArchivo,
    mimeType,
    tamanoBytes,
    subidoPorUsuarioId,
    estadoRevision = 'PENDIENTE'
  }) {
    const res = await db('documentos_sustento').insert({
      transaccion_id: Number(transaccionId),
      nombre_archivo: nombreArchivo,
      nombre_original: nombreOriginal,
      ruta_archivo: rutaArchivo,
      mime_type: mimeType,
      tamano_bytes: Number(tamanoBytes),
      subido_por_usuario_id: subidoPorUsuarioId ? Number(subidoPorUsuarioId) : null,
      estado_revision: estadoRevision
    }).returning('id');

    const id = Array.isArray(res) ? res[0] : res;
    return typeof id === 'object' && id !== null ? id.id : id;
  }

  /**
   * Buscar documento por su ID junto con la información del cliente asociado para control de acceso
   */
  static async findByIdWithClient(id) {
    return db('documentos_sustento as ds')
      .join('transacciones as t', 't.id', 'ds.transaccion_id')
      .join('clientes as c', 'c.id', 't.cliente_id')
      .select('ds.*', 't.cliente_id', 'c.ruc as cliente_ruc')
      .where('ds.id', Number(id))
      .first();
  }

  /**
   * Obtener todos los documentos asociados a una transacción
   */
  static async findByTransaccionId(transaccionId) {
    return db('documentos_sustento')
      .where({ transaccion_id: Number(transaccionId) })
      .orderBy('fecha_subida', 'desc');
  }

  /**
   * Actualizar el estado de revisión de los sustentos de una transacción (APROBADO / RECHAZADO)
   */
  static async updateRevision(transaccionId, estadoRevision, motivoRechazo = null) {
    return db('documentos_sustento')
      .where({ transaccion_id: Number(transaccionId) })
      .update({
        estado_revision: estadoRevision,
        motivo_rechazo: motivoRechazo
      });
  }
}
