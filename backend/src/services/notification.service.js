import nodemailer from 'nodemailer';
import { config } from '../config/env.js';
import { Cliente } from '../models/Cliente.js';
import { Transaccion } from '../models/Transaccion.js';
import { Notificacion } from '../models/Notificacion.js';
import { whatsappService } from './whatsapp.service.js';

// Configuración de transporte de Nodemailer
let transporter = null;

function getTransporter() {
  if (!transporter) {
    if (!config.smtp.user) {
      // Modo desarrollo/prueba local: simula el transporte sin bloquear por falta de servidor SMTP externo
      transporter = nodemailer.createTransport({
        jsonTransport: true
      });
    } else {
      transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.port === 465,
        auth: {
          user: config.smtp.user,
          pass: config.smtp.pass
        }
      });
    }
  }
  return transporter;
}

/**
 * Genera el enlace oficial de WhatsApp con mensaje formateado
 */
export function generarEnlaceWhatsApp(celular, mensaje) {
  // Limpiar número: solo dígitos, asegurar prefijo Perú (+51)
  const limpio = celular.replace(/\D/g, '');
  const numeroCompleto = limpio.startsWith('51') ? limpio : `51${limpio}`;
  const textoCodificado = encodeURIComponent(mensaje);
  return `https://wa.me/${numeroCompleto}?text=${textoCodificado}`;
}

/**
 * Servicio para enviar o registrar notificación de sustento (RF-C03)
 * Incluye mecanismo de contingencia/fallback automático a Nodemailer si WhatsApp falla
 */
export async function enviarNotificacionSustento({
  clienteId,
  transaccionId,
  canal = 'WHATSAPP',
  forzarFalloWhatsApp = false,
  customMensaje = null
}) {
  // Obtener datos del cliente y transacción mediante Modelos
  const cliente = await Cliente.findById(clienteId);

  if (!cliente) {
    throw new Error('Cliente no encontrado');
  }

  let transaccion = null;
  if (transaccionId) {
    transaccion = await Transaccion.findById(transaccionId);
  }

  const comprobanteInfo = transaccion 
    ? `${transaccion.comprobante_tipo} ${transaccion.numero_comprobante || ''} por S/ ${transaccion.monto_total.toFixed(2)} (${transaccion.emisor_razon_social || 'Proveedor'})`
    : 'comprobantes pendientes del periodo';

  const portalUrl = `${config.corsOrigin}/portal-cliente?ruc=${cliente.ruc}`;

  const mensajeTexto = customMensaje || 
`Estimado(a) ${cliente.contacto_nombre || cliente.razon_social},
Le recordamos que se requiere el sustento digital (voucher/factura) para:
*${comprobanteInfo}*.

Por favor, cargue el documento en su portal de cliente:
${portalUrl}

Atentamente,
Estudio Contable - ContaTask`;

  let resultado = {
    canal,
    destinatario: canal === 'WHATSAPP' ? cliente.celular : cliente.email,
    estado: 'ENVIADO',
    waLink: null,
    contingenciaActivada: false
  };

  if (canal === 'WHATSAPP') {
    resultado.waLink = generarEnlaceWhatsApp(cliente.celular, mensajeTexto);

    if (forzarFalloWhatsApp) {
      // Simular falla de conexión en WhatsApp y activar contingencia (RF-C03 Criterio 3)
      resultado.estado = 'FALLIDO';
      await Notificacion.create({
        clienteId,
        transaccionId: transaccionId || null,
        canal: 'WHATSAPP',
        destinatario: cliente.celular,
        asunto: 'Solicitud de sustento',
        mensaje: mensajeTexto,
        estado: 'FALLIDO',
        errorLog: 'Fallo de conexión en servicio WhatsApp Web / API. Activando fallback a correo.'
      });

      // Contingencia a Email
      try {
        await enviarEmailNodemailer({
          to: cliente.email,
          subject: `[CON CONTINGENCIA] Solicitud de Sustento Contable - ${cliente.razon_social}`,
          text: mensajeTexto,
          html: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #2563eb;">Solicitud de Sustento Contable</h2>
            <p>Estimado(a) <strong>${cliente.contacto_nombre || cliente.razon_social}</strong>,</p>
            <p>Se requiere adjuntar el documento de sustento contable para la siguiente operación:</p>
            <blockquote style="background: #f1f5f9; padding: 12px; border-left: 4px solid #2563eb;">
              ${comprobanteInfo}
            </blockquote>
            <p>Acceda directamente a su portal para adjuntar el comprobante:</p>
            <p><a href="${portalUrl}" style="display:inline-block; padding: 10px 18px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px;">Cargar Sustento</a></p>
            <p style="font-size: 12px; color: #64748b;">Aviso enviado automáticamente como contingencia por ContaTask.</p>
          </div>`
        });

        resultado.contingenciaActivada = true;
        resultado.estado = 'RESPALDO_ENVIADO';

        await Notificacion.create({
          clienteId,
          transaccionId: transaccionId || null,
          canal: 'EMAIL',
          destinatario: cliente.email,
          asunto: 'Solicitud de sustento (Respaldo por contingencia)',
          mensaje: mensajeTexto,
          estado: 'RESPALDO_ENVIADO',
          errorLog: 'Enviado exitosamente vía correo electrónico tras fallo en WhatsApp.'
        });
      } catch (errEmail) {
        resultado.errorEmail = errEmail.message;
      }
    } else {
      let directSendResult = null;
      if (whatsappService.status === 'CONNECTED') {
        try {
          directSendResult = await whatsappService.sendMessage(cliente.celular, mensajeTexto);
          resultado.directSend = directSendResult;
          resultado.metodoEnvio = 'WHATSAPP_WEB_JS_DIRECT';
        } catch (wsErr) {
          console.warn('Fallo envío directo WhatsApp Web JS:', wsErr.message);
        }
      }

      // Envío exitoso registrado en Modelo Notificacion
      await Notificacion.create({
        clienteId,
        transaccionId: transaccionId || null,
        canal: 'WHATSAPP',
        destinatario: cliente.celular,
        asunto: 'Solicitud de sustento',
        mensaje: mensajeTexto,
        estado: 'ENVIADO'
      });
    }
  } else {
    // Envío directo por Nodemailer (EMAIL)
    try {
      await enviarEmailNodemailer({
        to: cliente.email,
        subject: `Solicitud de Sustento Contable - ${cliente.razon_social}`,
        text: mensajeTexto,
        html: `<p>${mensajeTexto.replace(/\n/g, '<br>')}</p>`
      });

      await Notificacion.create({
        clienteId,
        transaccionId: transaccionId || null,
        canal: 'EMAIL',
        destinatario: cliente.email,
        asunto: 'Solicitud de sustento',
        mensaje: mensajeTexto,
        estado: 'ENVIADO'
      });
    } catch (err) {
      resultado.estado = 'FALLIDO';
      resultado.error = err.message;
      Notificacion.create({
        clienteId,
        transaccionId: transaccionId || null,
        canal: 'EMAIL',
        destinatario: cliente.email,
        asunto: 'Solicitud de sustento',
        mensaje: mensajeTexto,
        estado: 'FALLIDO',
        errorLog: err.message
      });
    }
  }

  return resultado;
}

/**
 * Función interna para enviar correo con Nodemailer
 */
async function enviarEmailNodemailer({ to, subject, text, html }) {
  const mail = getTransporter();
  return mail.sendMail({
    from: config.smtp.from,
    to,
    subject,
    text,
    html
  });
}
