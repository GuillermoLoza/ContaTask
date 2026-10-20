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
