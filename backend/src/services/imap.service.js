import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from '../config/env.js';
import { emailService } from './email.service.js';
import { CorreoRecibido } from '../models/CorreoRecibido.js';
import { Cliente } from '../models/Cliente.js';
import { Transaccion } from '../models/Transaccion.js';

/**
 * Servicio de Recepción de Correos vía IMAP (Patrón MVC)
 * Conecta con el buzón de correo, descarga mensajes y extrae comprobantes adjuntos para auditoría contable.
 */
class ImapService {
  constructor() {
    this.customHost = null;
    this.customPort = null;
    this.customSecure = null;
    this.sincronizando = false;
    this.ultimaSincronizacion = null;
    this.ultimoError = null;
  }

  /**
   * Obtiene la configuración efectiva de IMAP calculada automáticamente o personalizada
   */
  getConfig() {
    const smtpCfg = emailService.smtpConfig;
    const user = smtpCfg.user || '';
    const pass = smtpCfg.pass || '';

    // Detección automática del host y puerto IMAP
    let host = this.customHost;
    let port = this.customPort || 993;
    let secure = this.customSecure !== null ? this.customSecure : true;

    if (!host) {
      const emailDomain = user.includes('@') ? user.split('@')[1].toLowerCase() : '';
      const smtpHost = (smtpCfg.host || '').toLowerCase();

      if (emailDomain === 'gmail.com' || smtpHost.includes('gmail')) {
        host = 'imap.gmail.com';
        port = 993;
        secure = true;
      } else if (
        emailDomain === 'outlook.com' ||
        emailDomain === 'hotmail.com' ||
        emailDomain === 'live.com' ||
        smtpHost.includes('office365') ||
        smtpHost.includes('outlook')
      ) {
        host = 'outlook.office365.com';
        port = 993;
        secure = true;
      } else if (smtpHost.startsWith('smtp.')) {
        host = smtpHost.replace(/^smtp\./, 'imap.');
        port = 993;
        secure = true;
      } else {
        host = smtpHost || 'imap.gmail.com';
      }
    }

    return {
      host,
      port: Number(port),
      secure: Boolean(secure),
      user,
      hasPassword: Boolean(pass),
      isConfigured: Boolean(user && pass),
      ultimaSincronizacion: this.ultimaSincronizacion,
      sincronizando: this.sincronizando,
      ultimoError: this.ultimoError
    };
  }

  /**
   * Actualiza parámetros específicos de IMAP
   */
  updateConfig({ host, port, secure }) {
    if (host !== undefined) this.customHost = host;
    if (port !== undefined) this.customPort = Number(port);
    if (secure !== undefined) this.customSecure = Boolean(secure);
    return this.getConfig();
  }

  /**
   * Crea una instancia de ImapFlow con la configuración actual
   */
  createClient() {
    const imapCfg = this.getConfig();
    const smtpCfg = emailService.smtpConfig;

    if (!imapCfg.user || !smtpCfg.pass) {
      throw new Error('Debe configurar su correo y contraseña de aplicación en Ajustes de Correo');
    }

    return new ImapFlow({
      host: imapCfg.host,
      port: imapCfg.port,
      secure: imapCfg.secure,
      auth: {
        user: imapCfg.user,
        pass: smtpCfg.pass
      },
      logger: false,
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  /**
   * Prueba de conectividad con el servidor IMAP
   */
  async probarConexion() {
    const client = this.createClient();
    try {
      await client.connect();
      const status = await client.status('INBOX', { messages: true, unseen: true });
      await client.logout();
      return {
        success: true,
        message: 'Conexión IMAP establecida exitosamente',
        totalMensajes: status.messages,
        mensajesNoLeidos: status.unseen
      };
    } catch (err) {
      await client.logout().catch(() => {});
      throw new Error(`Error al conectar con el servidor IMAP: ${err.message}`);
    }
  }

  /**
   * Sincroniza correos de la bandeja de entrada y descarga adjuntos
   */
  async sincronizarCorreos({ maxDescargas = 25, soloNoLeidos = false } = {}) {
    if (this.sincronizando) {
      return { status: 'busy', message: 'Ya hay una sincronización en curso' };
    }

    const imapCfg = this.getConfig();
    if (!imapCfg.isConfigured) {
      throw new Error('No se puede sincronizar: Debe configurar su cuenta de correo y contraseña');
    }

    this.sincronizando = true;
    this.ultimoError = null;

    const client = this.createClient();
    let procesados = 0;
    let nuevos = 0;

    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');

      try {
        const total = client.mailbox?.exists || 0;
        if (total === 0) {
          return {
            success: true,
            procesados: 0,
            nuevos: 0,
            ultimaSincronizacion: new Date().toISOString(),
            message: 'El buzón de entrada está vacío.'
          };
        }

        let sequenceRange;
        if (soloNoLeidos) {
          const unseen = await client.search({ unseen: true });
          if (!unseen || unseen.length === 0) {
            return {
              success: true,
              procesados: 0,
              nuevos: 0,
              ultimaSincronizacion: new Date().toISOString(),
              message: 'No hay mensajes no leídos en el servidor.'
            };
          }
          // Tomar los últimos maxDescargas no leídos (los más recientes)
          sequenceRange = unseen.slice(-maxDescargas);
        } else {
          // Tomar los últimos maxDescargas mensajes del buzón (los más recientes)
          const startSeq = Math.max(1, total - maxDescargas + 1);
          sequenceRange = `${startSeq}:${total}`;
        }

        const messages = [];
        // Iterar los mensajes correspondientes al rango más reciente
        for await (const message of client.fetch(sequenceRange, { uid: true, envelope: true, source: true })) {
          messages.push(message);
        }

        // Ordenar en orden descendente para procesar los más recientes primero
        messages.reverse();

        // Procesar los mensajes obtenidos
        for (const msg of messages) {
          procesados++;
          const messageId = msg.envelope?.messageId || `msg_${msg.uid}_${Date.now()}`;

          // 1. Verificar si ya fue registrado previamente en la base de datos
          const existente = await CorreoRecibido.findByMessageId(messageId);
          if (existente) {
            continue; // Ya guardado previamente
          }

          // 2. Parsear el correo completo con mailparser
          const parsed = await simpleParser(msg.source);

          const remitenteNombre = parsed.from?.value?.[0]?.name || parsed.from?.text || 'Desconocido';
          const remitenteEmail = parsed.from?.value?.[0]?.address?.toLowerCase() || '';
          const asunto = parsed.subject || '(Sin Asunto)';
          const fecha = parsed.date || new Date();
          const cuerpoTexto = parsed.text || '';
          const cuerpoHtml = parsed.html || null;

          // 3. Procesar y guardar archivos adjuntos en /uploads
          const adjuntosGuardados = [];
          if (parsed.attachments && parsed.attachments.length > 0) {
            const uploadDir = path.resolve(config.uploadDir || './uploads');
            if (!fs.existsSync(uploadDir)) {
              fs.mkdirSync(uploadDir, { recursive: true });
            }

            for (const att of parsed.attachments) {
              const fileExt = path.extname(att.filename || '').toLowerCase() || '.bin';
              const uniqueName = `correo_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${fileExt}`;
              const targetPath = path.join(uploadDir, uniqueName);

              try {
                fs.writeFileSync(targetPath, att.content);
                adjuntosGuardados.push({
                  nombre_archivo: uniqueName,
                  nombre_original: att.filename || `archivo${fileExt}`,
                  mime_type: att.contentType || 'application/octet-stream',
                  tamano_bytes: att.size || att.content.length,
                  ruta_archivo: targetPath,
                  url: `/api/documentos/archivo/${uniqueName}`
                });
              } catch (errFile) {
                console.error('Error al guardar archivo adjunto de correo:', errFile);
              }
            }
          }

          // 4. Intentar emparejar automáticamente con una MYPE y transacción
          let matchedClienteId = null;
          let matchedClienteRuc = null;
          let matchedTransaccionId = null;

          // A. Emparejar por correo del cliente
          if (remitenteEmail) {
            try {
              const clientePorEmail = await Cliente.findByEmail(remitenteEmail);
              if (clientePorEmail) {
                matchedClienteId = clientePorEmail.id;
                matchedClienteRuc = clientePorEmail.ruc;
              }
            } catch (errCli) {
              console.warn('Error al buscar cliente por email:', errCli.message);
            }
          }

          // B. Emparejar por RUC en el asunto o cuerpo (11 dígitos comenzando en 10 o 20)
          const textToSearch = `${asunto} ${cuerpoTexto}`;
          const rucMatch = textToSearch.match(/\b(10|20)\d{9}\b/);
          if (rucMatch && !matchedClienteRuc) {
            try {
              const rucEncontrado = rucMatch[0];
              const clientePorRuc = await Cliente.findByRuc(rucEncontrado);
              if (clientePorRuc) {
                matchedClienteId = clientePorRuc.id;
                matchedClienteRuc = clientePorRuc.ruc;
              }
            } catch (errRuc) {
              console.warn('Error al buscar cliente por RUC:', errRuc.message);
            }
          }

          // C. Emparejar por código de transacción (ej: TRX-12 o ID de transacción)
          const trxMatch = textToSearch.match(/(?:TRX|OP|OPERACION)[-\s:]*(\d+)/i);
          if (trxMatch) {
            try {
              const trxId = Number(trxMatch[1]);
              const trx = await Transaccion.findById(trxId);
              if (trx) {
                matchedTransaccionId = trx.id;
                if (!matchedClienteRuc) {
                  matchedClienteRuc = trx.cliente_ruc;
                  const cli = await Cliente.findByRuc(trx.cliente_ruc);
                  if (cli) matchedClienteId = cli.id;
                }
              }
            } catch (errTrx) {
              console.warn('Error al buscar transacción:', errTrx.message);
            }
          }

          // 5. Insertar en la base de datos
          await CorreoRecibido.create({
            messageId,
            uid: msg.uid,
            remitente: remitenteNombre,
            remitenteEmail,
            destinatario: imapCfg.user,
            asunto,
            fecha,
            cuerpoTexto,
            cuerpoHtml,
            leido: false,
            clienteId: matchedClienteId,
            clienteRuc: matchedClienteRuc,
            transaccionId: matchedTransaccionId,
            tieneAdjuntos: adjuntosGuardados.length > 0,
            adjuntosJson: adjuntosGuardados,
            procesadoComoSustento: false
          });

          nuevos++;
        }
      } finally {
        lock.release();
      }

      await client.logout();
      this.ultimaSincronizacion = new Date().toISOString();

      return {
        success: true,
        procesados,
        nuevos,
        ultimaSincronizacion: this.ultimaSincronizacion,
        message: `Sincronización completada: ${nuevos} correo(s) nuevo(s) descargados.`
      };
    } catch (err) {
      await client.logout().catch(() => {});
      this.ultimoError = err.message;
      console.error('Error durante la sincronización IMAP:', err);
      throw new Error(`Fallo en la sincronización IMAP: ${err.message}`);
    } finally {
      this.sincronizando = false;
    }
  }

  /**
   * Inyectar correo simulado (útil para pruebas y modo demostración)
   */
  async inyectarCorreoSimulado({ remitente, email, asunto, cuerpo, ruc, adjuntos = [] }) {
    let matchedClienteId = null;
    let matchedClienteRuc = ruc || null;

    if (ruc) {
      const cli = await Cliente.findByRuc(ruc);
      if (cli) {
        matchedClienteId = cli.id;
        matchedClienteRuc = cli.ruc;
      }
    } else if (email) {
      const cli = await Cliente.findByEmail(email);
      if (cli) {
        matchedClienteId = cli.id;
        matchedClienteRuc = cli.ruc;
      }
    }

    const messageId = `sim_${Date.now()}_${crypto.randomBytes(4).toString('hex')}@contatask.local`;

    const id = await CorreoRecibido.create({
      messageId,
      uid: Date.now(),
      remitente: remitente || 'Cliente Demo',
      remitenteEmail: email || 'cliente@demo.com',
      destinatario: this.getConfig().user || 'contador@contatask.pe',
      asunto: asunto || 'Envío de sustento de pago',
      fecha: new Date(),
      cuerpoTexto: cuerpo || 'Adjunto constancia de transferencia solicitada.',
      cuerpoHtml: null,
      leido: false,
      clienteId: matchedClienteId,
      clienteRuc: matchedClienteRuc,
      tieneAdjuntos: adjuntos.length > 0,
      adjuntosJson: adjuntos,
      procesadoComoSustento: false
    });

    return CorreoRecibido.findById(id);
  }
}

export const imapService = new ImapService();
