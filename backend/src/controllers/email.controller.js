import { emailService } from '../services/email.service.js';
import { imapService } from '../services/imap.service.js';
import { Cliente } from '../models/Cliente.js';
import { CorreoRecibido } from '../models/CorreoRecibido.js';
import { Transaccion } from '../models/Transaccion.js';
import { DocumentoSustento } from '../models/DocumentoSustento.js';
import { HistorialAuditoria } from '../models/HistorialAuditoria.js';

/**
 * Enviar correo electrónico directo o basado en plantilla
 */
export async function sendEmail(req, res, next) {
  try {
    const {
      to,
      subject,
      html,
      text,
      clienteId,
      transaccionId,
      templateId,
      templateData
    } = req.body;

    let targetEmail = to;
    let enrichedData = { ...templateData };

    if (clienteId) {
      const cliente = await Cliente.findById(clienteId);
      if (cliente) {
        if (!targetEmail) {
          targetEmail = cliente.email;
        }
        enrichedData.clienteNombre = enrichedData.clienteNombre || cliente.contacto_nombre || cliente.razon_social;
        enrichedData.ruc = enrichedData.ruc || cliente.ruc;
        enrichedData.pendientes = enrichedData.pendientes ?? cliente.pendientes_sustento ?? 0;
      }
    }

    if (!targetEmail) {
      return res.status(400).json({
        success: false,
        error: 'Debe especificar el correo electrónico del destinatario (to) o seleccionar un cliente válido.'
      });
    }

    const result = await emailService.sendEmail({
      to: targetEmail,
      subject,
      html,
      text,
      clienteId: clienteId || null,
      transaccionId: transaccionId || null,
      templateId,
      templateData: enrichedData
    });

    res.status(200).json({
      success: true,
      message: 'Correo electrónico despachado exitosamente.',
      result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Obtener catálogo de plantillas oficiales
 */
export async function getTemplates(_req, res, next) {
  try {
    const templates = emailService.getTemplates();
    res.json({ success: true, templates });
  } catch (error) {
    next(error);
  }
}

/**
 * Previsualizar una plantilla renderizada con variables de prueba o de cliente
 */
export async function previewTemplate(req, res, next) {
  try {
    const { templateId, data, clienteId } = req.body;
    let templateData = { ...data };

    if (clienteId) {
      const cliente = await Cliente.findById(clienteId);
      if (cliente) {
        templateData.clienteNombre = templateData.clienteNombre || cliente.contacto_nombre || cliente.razon_social;
        templateData.ruc = templateData.ruc || cliente.ruc;
        templateData.pendientes = templateData.pendientes ?? cliente.pendientes_sustento ?? 0;
      }
    }

    const rendered = emailService.renderTemplate(templateId, templateData);
    res.json({ success: true, ...rendered });
  } catch (error) {
    next(error);
  }
}

/**
 * Obtener configuración actual del servidor SMTP
 */
export async function getSmtpConfig(_req, res, next) {
  try {
    const config = emailService.getConfig();
    res.json({ success: true, config });
  } catch (error) {
    next(error);
  }
}

/**
 * Actualizar configuración de servidor SMTP
 */
export async function updateSmtpConfig(req, res, next) {
  try {
    const { host, port, user, pass, from, secure } = req.body;
    const config = emailService.updateConfig({ host, port, user, pass, from, secure });
    res.json({
      success: true,
      message: 'Configuración SMTP actualizada exitosamente.',
      config
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Probar conexión con el servidor SMTP y enviar correo de prueba opcional
 */
export async function testConnection(req, res, next) {
  try {
    const { testEmail, host, port, user, pass, secure } = req.body;
    const result = await emailService.testConnection({
      testEmail,
      customHost: host,
      customPort: port,
      customUser: user,
      customPass: pass,
      customSecure: secure
    });
    res.json({ success: true, result });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: `Error al verificar conexión SMTP: ${error.message}`
    });
  }
}

/**
 * Obtener historial auditable de correos enviados
 */
export async function getEmailHistory(req, res, next) {
  try {
    const { clienteId, limit } = req.query;
    const history = await emailService.getEmailHistory({ clienteId, limit });
    res.json({ success: true, history });
  } catch (error) {
    next(error);
  }
}

/**
 * =========================================================================
 * CONTROLADORES DE RECEPCIÓN DE CORREOS VÍA IMAP (BANDEJA DE ENTRADA)
 * =========================================================================
 */

/**
 * Obtener listado de correos recibidos capturados por IMAP
 */
export async function getCorreosRecibidos(req, res, next) {
  try {
    const { clienteId, ruc, soloNoLeidos, conAdjuntos, search, limit, offset } = req.query;
    const correos = await CorreoRecibido.findAll({
      clienteId,
      ruc,
      soloNoLeidos: soloNoLeidos === 'true',
      conAdjuntos: conAdjuntos === 'true',
      search,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0
    });

    const stats = await CorreoRecibido.getStats();
    const imapConfig = imapService.getConfig();

    res.json({
      success: true,
      correos,
      stats,
      imapConfig
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Obtener detalle de un correo recibido por ID
 */
export async function getCorreoRecibidoById(req, res, next) {
  try {
    const { id } = req.params;
    const correo = await CorreoRecibido.findById(id);

    if (!correo) {
      return res.status(404).json({
        success: false,
        error: 'Correo recibido no encontrado'
      });
    }

    res.json({ success: true, correo });
  } catch (error) {
    next(error);
  }
}

/**
 * Ejecutar sincronización manual inmediata de la bandeja de entrada IMAP
 */
export async function sincronizarBandeja(req, res, next) {
  try {
    const { maxDescargas, soloNoLeidos } = req.body;
    const result = await imapService.sincronizarCorreos({
      maxDescargas: maxDescargas ? Number(maxDescargas) : 25,
      soloNoLeidos: Boolean(soloNoLeidos)
    });

    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Probar conexión con el servidor IMAP
 */
export async function testImapConnection(req, res, next) {
  try {
    const result = await imapService.probarConexion();
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Marcar correo recibido como leído o no leído
 */
export async function marcarCorreoLeido(req, res, next) {
  try {
    const { id } = req.params;
    const { leido = true } = req.body;

    await CorreoRecibido.markAsRead(id, leido);
    res.json({ success: true, message: `Correo marcado como ${leido ? 'leído' : 'no leído'}` });
  } catch (error) {
    next(error);
  }
}

/**
 * Vincular un archivo adjunto del correo directamente como sustento tributario de una transacción
 */
export async function convertirAdjuntoEnSustento(req, res, next) {
  try {
    const { id } = req.params;
    const {
      transaccionId,
      nombreArchivo,
      nombreOriginal,
      rutaArchivo,
      mimeType,
      tamanoBytes
    } = req.body;

    if (!transaccionId) {
      return res.status(400).json({
        success: false,
        error: 'Debe especificar el ID de la transacción a la que vinculará el comprobante'
      });
    }

    const trx = await Transaccion.findById(transaccionId);
    if (!trx) {
      return res.status(404).json({
        success: false,
        error: 'Transacción contable no encontrada'
      });
    }

    // 1. Crear registro de documento de sustento
    const docId = await DocumentoSustento.create({
      transaccionId: trx.id,
      nombreArchivo: nombreArchivo || 'comprobante_email.pdf',
      nombreOriginal: nombreOriginal || 'comprobante_email.pdf',
      rutaArchivo: rutaArchivo || '',
      mimeType: mimeType || 'application/pdf',
      tamanoBytes: tamanoBytes ? Number(tamanoBytes) : 1024,
      subidoPorUsuarioId: req.user.id,
      estadoRevision: 'PENDIENTE'
    });

    // 2. Transicionar estado de la transacción a 'SUSTENTO_RECIBIDO'
    const estadoAnterior = trx.estado_sustento;
    await Transaccion.updateEstado(trx.id, 'SUSTENTO_RECIBIDO');

    // 3. Registrar auditoría legal SUNAT
    await HistorialAuditoria.create({
      transaccionId: trx.id,
      usuarioId: req.user.id,
      accion: 'VINCULACION_SUSTENTO_CORREO',
      estadoAnterior,
      estadoNuevo: 'SUSTENTO_RECIBIDO',
      motivo: 'Comprobante recibido por correo electrónico y vinculado al expediente',
      detalles: `Archivo: ${nombreOriginal} (Correo ID: ${id})`
    });

    // 4. Actualizar estado del correo recibido
    await CorreoRecibido.updateVinculacion(id, {
      clienteRuc: trx.cliente_ruc,
      transaccionId: trx.id,
      procesadoComoSustento: true
    });

    res.json({
      success: true,
      message: 'Comprobante vinculado exitosamente a la transacción y registrado en auditoría',
      documentoId: docId,
      transaccionId: trx.id
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Inyectar correo simulado (útil para pruebas y modo demostración)
 */
export async function inyectarCorreoSimulado(req, res, next) {
  try {
    const { remitente, email, asunto, cuerpo, ruc, adjuntos } = req.body;
    const nuevoCorreo = await imapService.inyectarCorreoSimulado({
      remitente,
      email,
      asunto,
      cuerpo,
      ruc,
      adjuntos
    });

    res.status(201).json({
      success: true,
      message: 'Correo simulado inyectado en la bandeja de entrada',
      correo: nuevoCorreo
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Eliminar registro de correo recibido
 */
export async function eliminarCorreoRecibido(req, res, next) {
  try {
    const { id } = req.params;
    await CorreoRecibido.delete(id);
    res.json({ success: true, message: 'Correo eliminado de la bandeja de entrada' });
  } catch (error) {
    next(error);
  }
}

