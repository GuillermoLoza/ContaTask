import { ResponseView } from './response.view.js';

/**
 * Vista de Documentos de Sustento (Patrón MVC)
 * Formatea respuestas de carga, metadatos y listados de archivos.
 */
export class DocumentoView {
  /**
   * Renderizar confirmación de carga de sustento exitosa
   */
  static renderUploadSuccess(res, { documentoId, transaccionId, nuevoEstado, archivo }) {
    return ResponseView.success(
      res,
      {
        message: 'Sustento subido correctamente. Estado actualizado a SUSTENTO_RECIBIDO.',
        documentoId,
        transaccionId,
        nuevoEstado,
        archivo: {
          nombreOriginal: archivo.originalname,
          tamanoBytes: archivo.size,
          mimeType: archivo.mimetype
        }
      },
      201
    );
  }

  /**
   * Renderizar listado de sustentos de una transacción
   */
  static renderList(res, documentos) {
    return ResponseView.success(res, { documentos });
  }
}
