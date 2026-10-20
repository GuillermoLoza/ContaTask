import { whatsappService } from '../services/whatsapp.service.js';
import { Notificacion } from '../models/Notificacion.js';
import { WhatsAppMensaje } from '../models/WhatsAppMensaje.js';
import { ResponseView } from '../views/response.view.js';

/**
 * Controlador de WhatsApp Web JS (Patrón MVC en Tiempo Real)
 */
export async function getWhatsAppStatus(_req, res) {
  const status = whatsappService.getStatus();
  return ResponseView.success(res, { whatsapp: status });
}

/**
 * Canal en tiempo real SSE (Server-Sent Events) para transmitir actualizaciones
 * del código QR, cambios de estado y mensajes de chat en vivo sin recargar la página.
 */
export function streamWhatsAppEvents(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  const sendStatus = () => {
    const data = JSON.stringify({ type: 'status', data: whatsappService.getStatus() });
    res.write(`data: ${data}\n\n`);
  };

  const onChatMessage = (payload) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  // Enviar estado inmediato al conectarse
  sendStatus();

  const onUpdate = () => sendStatus();

  whatsappService.on('qr', onUpdate);
  whatsappService.on('pairing-code', onUpdate);
  whatsappService.on('connected', onUpdate);
  whatsappService.on('disconnected', onUpdate);
  whatsappService.on('status', onUpdate);
  whatsappService.on('chat_message', onChatMessage);

  // Heartbeat cada 10 segundos para mantener la conexión activa
  const timer = setInterval(() => {
    res.write(': ping\n\n');
  }, 10000);

  req.on('close', () => {
    clearInterval(timer);
    whatsappService.off('qr', onUpdate);
    whatsappService.off('pairing-code', onUpdate);
    whatsappService.off('connected', onUpdate);
    whatsappService.off('disconnected', onUpdate);
    whatsappService.off('status', onUpdate);
    whatsappService.off('chat_message', onChatMessage);
  });
}

export async function configureWhatsAppAccount(req, res, next) {
  try {
    const { phoneNumber, pushname } = req.body;
    const status = await whatsappService.updateConfig({ phoneNumber, pushname });
    return ResponseView.success(res, {
      message: 'Configuración de cuenta y número de WhatsApp actualizada correctamente.',
      whatsapp: status
    });
  } catch (error) {
    next(error);
  }
}

export async function requestPairingCodeWhatsApp(req, res, next) {
  try {
    const { phoneNumber, pushname } = req.body;
    if (!phoneNumber) {
      return ResponseView.error(res, 'Debe ingresar el número de teléfono para generar el código de vinculación.', 400);
    }
    const result = await whatsappService.requestPairingCode(phoneNumber, pushname);
    return ResponseView.success(res, {
      message: 'Código de vinculación generado con éxito.',
      ...result,
      whatsapp: whatsappService.getStatus()
    });
  } catch (error) {
    next(error);
  }
}

export async function initializeWhatsApp(_req, res, next) {
  try {
    const result = await whatsappService.initialize();
    return ResponseView.success(res, {
      message: 'Sesión de WhatsApp Web iniciada. Escanee el código QR.',
      result
    });
  } catch (error) {
    next(error);
  }
}

export async function confirmScanWhatsApp(req, res, next) {
  try {
    const { phoneNumber, pushname } = req.body;
    const status = await whatsappService.confirmScan({
      phoneNumber: phoneNumber || '51987112233',
      pushname: pushname || 'Estudio Contable Lozano & Asociados'
    });

    return ResponseView.success(res, {
      message: 'WhatsApp Web conectado exitosamente.',
      whatsapp: status
    });
  } catch (error) {
    next(error);
  }
}

export async function disconnectWhatsApp(_req, res, next) {
  try {
    const result = await whatsappService.disconnect();
    return ResponseView.success(res, result);
  } catch (error) {
    next(error);
  }
}

export async function sendTestMessage(req, res, next) {
  try {
    const { to, message, mensaje } = req.body;
    const msg = message || mensaje;

    if (!to || !msg) {
      return ResponseView.error(res, 'Debe especificar el número de destino y el mensaje.', 400);
    }

    // Enviar a través de la instancia de WhatsAppWebJS
    const result = await whatsappService.sendMessage(to, msg);

    // Registrar en la tabla de notificaciones para auditoría (RF-C03 Criterio 4)
    await Notificacion.create({
      clienteId: null,
      transaccionId: null,
      canal: 'WHATSAPP',
      destinatario: result.to,
      asunto: 'Mensaje de prueba directo',
      mensaje: msg,
      estado: 'ENVIADO'
    });

    return ResponseView.success(res, {
      message: 'Mensaje de WhatsApp enviado directamente con éxito.',
      result
    });
  } catch (error) {
    return ResponseView.error(res, error.message, 400);
  }
}

/**
 * Obtener lista de conversaciones agrupadas por contacto
 */
export async function getConversaciones(_req, res, next) {
  try {
    const conversaciones = await WhatsAppMensaje.getConversaciones();
    return ResponseView.success(res, { conversaciones });
  } catch (error) {
    next(error);
  }
}

/**
 * Obtener historial de mensajes de un chat específico
 */
export async function getMensajesPorTelefono(req, res, next) {
  try {
    const { phoneNumber } = req.params;
    const mensajes = await WhatsAppMensaje.getMensajesPorTelefono(phoneNumber);
    // Auto-marcar como leídos los mensajes recibidos
    await WhatsAppMensaje.marcarLeidos(phoneNumber);
    return ResponseView.success(res, { mensajes });
  } catch (error) {
    next(error);
  }
}

/**
 * Enviar mensaje de chat interactivo en tiempo real
 */
export async function enviarMensajeChat(req, res, next) {
  try {
    const { to, message, mensaje } = req.body;
    const text = message || mensaje;

    if (!to || !text) {
      return ResponseView.error(res, 'Debe especificar el número de destino y el mensaje.', 400);
    }

    const result = await whatsappService.sendMessage(to, text);
    return ResponseView.success(res, {
      message: 'Mensaje enviado exitosamente vía WhatsApp.',
      ...result
    });
  } catch (error) {
    return ResponseView.error(res, error.message, 400);
  }
}

/**
 * Marcar chat como leído
 */
export async function marcarChatLeido(req, res, next) {
  try {
    const { phoneNumber } = req.params;
    await WhatsAppMensaje.marcarLeidos(phoneNumber);
    return ResponseView.success(res, { message: 'Chat marcado como leído.' });
  } catch (error) {
    next(error);
  }
}

/**
 * Simular mensaje recibido de un cliente (para demostración o pruebas en vivo)
 */
export async function simularMensajeEntrante(req, res, next) {
  try {
    const { from, senderName, text, mediaUrl, mediaType, mediaName } = req.body;
    const result = await whatsappService.simularMensajeEntrante({
      from,
      senderName,
      text,
      mediaUrl,
      mediaType,
      mediaName
    });
    return ResponseView.success(res, {
      message: 'Mensaje de WhatsApp simulado recibido con éxito en tiempo real.',
      mensaje: result
    });
  } catch (error) {
    next(error);
  }
}

