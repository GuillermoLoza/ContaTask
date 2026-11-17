import fs from 'node:fs';
import { DocumentoSustento } from '../models/DocumentoSustento.js';
import { Transaccion } from '../models/Transaccion.js';
import { Cliente } from '../models/Cliente.js';
import { HistorialAuditoria } from '../models/HistorialAuditoria.js';
import { DocumentoView } from '../views/documento.view.js';
import { ResponseView } from '../views/response.view.js';

/**
 * Controlador de Documentos de Sustento (Patrón MVC con Knex)
 */
export async function uploadDocumentoSustento(req, res, next) {
  try {
    const { transaccionId } = req.params;

    if (!req.file) {
      return ResponseView.error(res, 'No se ha adjuntado ningún archivo', 400);
    }

    // Verificar existencia de la transacción vía Modelo
    const trx = await Transaccion.findById(transaccionId);

    if (!trx) {
      try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
      return ResponseView.error(res, 'Transacción no encontrada', 404);
    }

    // Verificar que el cliente no se encuentre inactivo
    const cliente = await Cliente.findByRuc(trx.cliente_ruc);
    if (cliente && (cliente.activo === 0 || cliente.activo === false)) {
      try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
      return ResponseView.error(
        res,
        'Operación no permitida: La empresa se encuentra inactiva',
        403
      );
    }

    // Control de aislamiento: Si es cliente, solo puede subir a sus propias transacciones
    if (req.user.rol === 'CLIENTE' && trx.cliente_ruc !== req.user.ruc) {
      try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
      return ResponseView.error(
        res,
        'Acceso denegado: No puede adjuntar archivos a transacciones de otras empresas',
        403
      );
    }

    const { filename, originalname, path: filePath, mimetype, size } = req.file;

    // 1. Guardar metadatos (Modelo DocumentoSustento)
    const docId = await DocumentoSustento.create({
      transaccionId: trx.id,
      nombreArchivo: filename,
      nombreOriginal: originalname,
      rutaArchivo: filePath,
      mimeType: mimetype,
      tamanoBytes: size,
      subidoPorUsuarioId: req.user.id,
      estadoRevision: 'PENDIENTE'
    });

    // 2. Transicionar estado de la transacción a 'SUSTENTO_RECIBIDO' (Modelo Transaccion)
    const estadoAnterior = trx.estado_sustento;
    await Transaccion.updateEstado(trx.id, 'SUSTENTO_RECIBIDO');

    // 3. Trazabilidad y auditoría exacta con fecha, hora, tamaño y emisor (Modelo HistorialAuditoria)
    await HistorialAuditoria.create({
      transaccionId: trx.id,
      usuarioId: req.user.id,
      accion: 'SUBIDA_SUSTENTO',
      estadoAnterior,
      estadoNuevo: 'SUSTENTO_RECIBIDO',
      motivo: `Carga de sustento ${originalname} (${(size / 1024).toFixed(1)} KB)`
    });

    // 4. Delegar a la Vista
    return DocumentoView.renderUploadSuccess(res, {
      documentoId: docId,
      transaccionId: trx.id,
      nuevoEstado: 'SUSTENTO_RECIBIDO',
      archivo: req.file
    });
  } catch (error) {
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
    }
    next(error);
  }
}

/**
 * Visualización y descarga de documento en formato original (RF-C05)
 */
export async function getDocumentoFile(req, res, next) {
  try {
    const { id } = req.params;
    const download = req.query.download === 'true';

    const documento = await DocumentoSustento.findByIdWithClient(id);

    if (!documento) {
      return ResponseView.error(res, 'Documento no encontrado', 404);
    }

    // Aislamiento de datos: Si el usuario es CLIENTE, solo puede ver documentos de su RUC (RF-C05 Criterio 4)
    if (req.user.rol === 'CLIENTE' && documento.cliente_ruc !== req.user.ruc) {
      return ResponseView.error(res, 'Acceso denegado a documentos pertenecientes a otro RUC', 403);
    }

    // Verificación de archivo físico en disco (RF-C05 Criterio 3)
    if (!fs.existsSync(documento.ruta_archivo)) {
      return ResponseView.error(res, 'El archivo físico no existe o fue eliminado del servidor', 404);
    }

    res.setHeader('Content-Type', documento.mime_type);

    if (download) {
      return res.download(documento.ruta_archivo, documento.nombre_original);
    }

    // Preview inline en visor integrado
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(documento.nombre_original)}"`);
    const fileStream = fs.createReadStream(documento.ruta_archivo);
    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
}

/**
 * Listar documentos de una transacción
 */
export async function getDocumentosByTransaccion(req, res, next) {
  try {
    const { transaccionId } = req.params;

    const trx = await Transaccion.findById(transaccionId);
    if (!trx) {
      return ResponseView.error(res, 'Transacción no encontrada', 404);
    }

    if (req.user.rol === 'CLIENTE' && trx.cliente_ruc !== req.user.ruc) {
      return ResponseView.error(res, 'Acceso denegado', 403);
    }

    const documentos = await DocumentoSustento.findByTransaccionId(trx.id);
    return DocumentoView.renderList(res, documentos);
  } catch (error) {
    next(error);
  }
}

/**
 * Carga masiva de documentos de sustento para múltiples o una transacción
 */
export async function uploadDocumentosMasivo(req, res, next) {
  const files = req.files || [];
  if (files.length === 0) {
    return ResponseView.error(res, 'No se ha adjuntado ningún archivo para la carga masiva', 400);
  }

  try {
    // Parsear asignaciones de transacciones enviadas desde el frontend
    // Formato: [ { fileIndex: 0, transaccionId: 10 }, { fileIndex: 1, transaccionId: 12 } ]
    let asignaciones = [];
    try {
      if (typeof req.body.asignaciones === 'string') {
        asignaciones = JSON.parse(req.body.asignaciones);
      } else if (Array.isArray(req.body.asignaciones)) {
        asignaciones = req.body.asignaciones;
      }
    } catch (err) {
      console.warn('Error al parsear asignaciones en uploadDocumentosMasivo:', err);
    }

    const globalTransaccionId = req.body.transaccionId ? Number(req.body.transaccionId) : null;

    // Si el usuario es de rol CLIENTE, verificar que la empresa esté activa
    if (req.user.rol === 'CLIENTE') {
      const cliente = await Cliente.findByRuc(req.user.ruc);
      if (cliente && (cliente.activo === 0 || cliente.activo === false)) {
        for (const file of files) {
          try { fs.unlinkSync(file.path); } catch { /* ignore */ }
        }
        return ResponseView.error(
          res,
          'Operación no permitida: La empresa se encuentra inactiva',
          403
        );
      }
    }

    const detalles = [];
    let subidos = 0;
    let fallidos = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const asignacion = asignaciones.find(a => a.fileIndex === i || a.originalName === file.originalname) || {};
      const targetTrxId = asignacion.transaccionId || globalTransaccionId;

      if (!targetTrxId) {
        try { fs.unlinkSync(file.path); } catch { /* ignore */ }
        fallidos++;
        detalles.push({
          nombreOriginal: file.originalname,
          transaccionId: null,
          estado: 'ERROR',
          error: 'No se asignó ningún comprobante a este archivo.'
        });
        continue;
      }

      try {
        const trx = await Transaccion.findById(targetTrxId);
        if (!trx) {
          try { fs.unlinkSync(file.path); } catch { /* ignore */ }
          fallidos++;
          detalles.push({
            nombreOriginal: file.originalname,
            transaccionId: targetTrxId,
            estado: 'ERROR',
            error: `Transacción #${targetTrxId} no encontrada.`
          });
          continue;
        }

        // Validar aislamiento por RUC para clientes
        if (req.user.rol === 'CLIENTE' && trx.cliente_ruc !== req.user.ruc) {
          try { fs.unlinkSync(file.path); } catch { /* ignore */ }
          fallidos++;
          detalles.push({
            nombreOriginal: file.originalname,
            transaccionId: targetTrxId,
            estado: 'ERROR',
            error: 'Acceso denegado: El comprobante no pertenece a su empresa.'
          });
          continue;
        }

        // Validar si la empresa de la transacción está inactiva
        const clienteTrx = await Cliente.findByRuc(trx.cliente_ruc);
        if (clienteTrx && (clienteTrx.activo === 0 || clienteTrx.activo === false)) {
          try { fs.unlinkSync(file.path); } catch { /* ignore */ }
          fallidos++;
          detalles.push({
            nombreOriginal: file.originalname,
            transaccionId: targetTrxId,
            estado: 'ERROR',
            error: 'Operación no permitida: La empresa se encuentra inactiva.'
          });
          continue;
        }

        // 1. Guardar metadatos en base de datos
        const docId = await DocumentoSustento.create({
          transaccionId: trx.id,
          nombreArchivo: file.filename,
          nombreOriginal: file.originalname,
          rutaArchivo: file.path,
          mimeType: file.mimetype,
          tamanoBytes: file.size,
          subidoPorUsuarioId: req.user.id,
          estadoRevision: 'PENDIENTE'
        });

        // 2. Transicionar estado de la transacción a 'SUSTENTO_RECIBIDO'
        const estadoAnterior = trx.estado_sustento;
        await Transaccion.updateEstado(trx.id, 'SUSTENTO_RECIBIDO');

        // 3. Registrar auditoría
        await HistorialAuditoria.create({
          transaccionId: trx.id,
          usuarioId: req.user.id,
          accion: 'SUBIDA_SUSTENTO_MASIVO',
          estadoAnterior,
          estadoNuevo: 'SUSTENTO_RECIBIDO',
          motivo: `Carga masiva: ${file.originalname} (${(file.size / 1024).toFixed(1)} KB)`
        });

        subidos++;
        detalles.push({
          nombreOriginal: file.originalname,
          transaccionId: trx.id,
          comprobante: `${trx.comprobante_tipo} ${trx.numero_comprobante || ''}`.trim(),
          documentoId: docId,
          estado: 'EXITO',
          nuevoEstado: 'SUSTENTO_RECIBIDO'
        });
      } catch (errItem) {
        console.error(`Error procesando archivo ${file.originalname}:`, errItem);
        try { fs.unlinkSync(file.path); } catch { /* ignore */ }
        fallidos++;
        detalles.push({
          nombreOriginal: file.originalname,
          transaccionId: targetTrxId,
          estado: 'ERROR',
          error: errItem.message || 'Error al procesar el archivo.'
        });
      }
    }

    return DocumentoView.renderBulkUploadSuccess(res, {
      total: files.length,
      subidos,
      fallidos,
      detalles
    });
  } catch (error) {
    for (const file of files) {
      try { fs.unlinkSync(file.path); } catch { /* ignore */ }
    }
    next(error);
  }
}
