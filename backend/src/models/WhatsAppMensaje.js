import { db } from '../config/database.js';

/**
 * Modelo WhatsAppMensaje (Patrón MVC con Knex.js)
 * Gestiona el almacenamiento y consulta de chats, conversaciones y mensajes en tiempo real.
 */
export class WhatsAppMensaje {
  /**
   * Crea un nuevo mensaje de chat
   */
  static async create({
    messageId = null,
    phoneNumber,
    contactName = null,
    clienteId = null,
    clienteRuc = null,
    fromMe = false,
    messageText,
    mediaUrl = null,
    mediaType = null,
    mediaName = null,
    status = 'SENT',
    isRead = false,
    timestamp = new Date()
  }) {
    const cleanPhone = String(phoneNumber).replace(/\D/g, '');
    let finalClienteId = clienteId;
    let finalClienteRuc = clienteRuc;
    let finalContactName = contactName;

    // Si no tiene cliente asociado, intentar vincular por número de celular o RUC
    if (!finalClienteId) {
      const match = await db('clientes')
        .where(function() {
          this.where('celular', cleanPhone)
            .orWhere('celular', cleanPhone.slice(-9))
            .orWhere('ruc', cleanPhone);
        })
        .first();

      if (match) {
        finalClienteId = match.id;
        finalClienteRuc = match.ruc;
        if (!finalContactName) {
          finalContactName = match.razon_social || match.contacto_nombre;
        }
      }
    }

    const payload = {
      message_id: messageId,
      phone_number: cleanPhone,
      contact_name: finalContactName,
      cliente_id: finalClienteId,
      cliente_ruc: finalClienteRuc,
      from_me: Boolean(fromMe),
      message_text: messageText,
      media_url: mediaUrl,
      media_type: mediaType,
      media_name: mediaName,
      status: status || (fromMe ? 'SENT' : 'DELIVERED'),
      is_read: Boolean(isRead || fromMe),
      timestamp: timestamp || new Date()
    };

    const [id] = await db('whatsapp_mensajes').insert(payload);
    return this.findById(id || payload.id);
  }

  /**
   * Encuentra un mensaje por su ID
   */
  static async findById(id) {
    return db('whatsapp_mensajes as m')
      .leftJoin('clientes as c', 'c.id', 'm.cliente_id')
      .select(
        'm.*',
        'c.razon_social as cliente_razon_social',
        'c.contacto_nombre as cliente_contacto'
      )
      .where('m.id', id)
      .first();
  }

  /**
   * Obtiene la lista de conversaciones agrupadas por número telefónico
   */
  static async getConversaciones() {
    // Obtener los números distintos
    const distinctPhones = await db('whatsapp_mensajes')
      .distinct('phone_number')
      .select('phone_number');

    const conversaciones = [];

    for (const { phone_number } of distinctPhones) {
      // Último mensaje
      const ultimo = await db('whatsapp_mensajes')
        .where('phone_number', phone_number)
        .orderBy('timestamp', 'desc')
        .orderBy('id', 'desc')
        .first();

      if (!ultimo) continue;

      // Conteo de no leídos
      const noLeidosRes = await db('whatsapp_mensajes')
        .where('phone_number', phone_number)
        .where('from_me', false)
        .where('is_read', false)
        .count('* as count')
        .first();

      const noLeidos = Number(noLeidosRes?.count || 0);

      // Buscar cliente vinculado
      const cliente = await db('clientes')
        .where(function() {
          this.where('id', ultimo.cliente_id || -1)
            .orWhere('celular', phone_number)
            .orWhere('celular', phone_number.slice(-9));
        })
        .select('id', 'ruc', 'razon_social', 'nombre_comercial', 'contacto_nombre', 'celular')
        .first();

      conversaciones.push({
        phoneNumber: phone_number,
        phone_number: phone_number,
        contactName: cliente?.razon_social || ultimo.contact_name || `+${phone_number}`,
        contact_name: cliente?.razon_social || ultimo.contact_name || `+${phone_number}`,
        contactoNombre: cliente?.contacto_nombre || null,
        clienteId: cliente?.id || ultimo.cliente_id || null,
        cliente_id: cliente?.id || ultimo.cliente_id || null,
        clienteRuc: cliente?.ruc || ultimo.cliente_ruc || null,
        cliente_ruc: cliente?.ruc || ultimo.cliente_ruc || null,
        cliente_razon_social: cliente?.razon_social || ultimo.contact_name || null,
        ultimoMensaje: ultimo.message_text,
        last_message: ultimo.message_text,
        ultimoMensajeFecha: ultimo.timestamp || ultimo.created_at,
        last_timestamp: ultimo.timestamp || ultimo.created_at,
        ultimoMensajeFromMe: Boolean(ultimo.from_me),
        last_from_me: ultimo.from_me ? 1 : 0,
        ultimoMensajeStatus: ultimo.status,
        mensajesNoLeidos: noLeidos,
        unread_count: noLeidos
      });
    }

    // Ordenar por fecha del último mensaje descendente
    conversaciones.sort((a, b) => new Date(b.ultimoMensajeFecha).getTime() - new Date(a.ultimoMensajeFecha).getTime());
    return conversaciones;
  }

  /**
   * Obtiene el historial completo de mensajes con un contacto
   */
  static async getMensajesPorTelefono(phoneNumber) {
    const cleanPhone = String(phoneNumber).replace(/\D/g, '');
    return db('whatsapp_mensajes as m')
      .leftJoin('clientes as c', 'c.id', 'm.cliente_id')
      .select(
        'm.*',
        'c.razon_social as cliente_razon_social',
        'c.contacto_nombre as cliente_contacto'
      )
      .where(function() {
        this.where('m.phone_number', cleanPhone)
          .orWhere('m.phone_number', cleanPhone.slice(-9));
      })
      .orderBy('m.timestamp', 'asc')
      .orderBy('m.id', 'asc');
  }

  /**
   * Marca como leídos todos los mensajes recibidos de un número
   */
  static async marcarLeidos(phoneNumber) {
    const cleanPhone = String(phoneNumber).replace(/\D/g, '');
    return db('whatsapp_mensajes')
      .where(function() {
        this.where('phone_number', cleanPhone)
          .orWhere('phone_number', cleanPhone.slice(-9));
      })
      .where('from_me', false)
      .update({
        is_read: true,
        status: 'READ'
      });
  }
}
