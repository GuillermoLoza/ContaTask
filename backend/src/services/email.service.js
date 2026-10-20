import nodemailer from 'nodemailer';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config/env.js';
import { Notificacion } from '../models/Notificacion.js';
import { Cliente } from '../models/Cliente.js';
import { Transaccion } from '../models/Transaccion.js';

class EmailService {
  constructor() {
    this.configFile = path.resolve('./data/email_config.json');
    let savedConfig = {};

    try {
      if (fs.existsSync(this.configFile)) {
        savedConfig = JSON.parse(fs.readFileSync(this.configFile, 'utf-8'));
      }
    } catch (e) {
      console.warn('No se pudo cargar email_config.json:', e.message);
    }

    this.smtpConfig = {
      host: savedConfig.host || config.smtp.host || 'smtp.ethereal.email',
      port: savedConfig.port || config.smtp.port || 587,
      secure: savedConfig.secure !== undefined ? Boolean(savedConfig.secure) : config.smtp.port === 465,
      user: savedConfig.user || config.smtp.user || '',
      pass: savedConfig.pass || config.smtp.pass || '',
      from: savedConfig.from || config.smtp.from || '"Estudio Contable Lozano & Asociados" <notificaciones@contatask.pe>'
    };
    this.transporter = null;
  }

  /**
   * Guarda la configuración actual en disco para que no se pierda al reiniciar
   */
  _saveConfigToDisk() {
    try {
      const dataDir = path.dirname(this.configFile);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(this.configFile, JSON.stringify(this.smtpConfig, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Error al persistir email_config.json:', e.message);
    }
  }

  /**
   * Obtener o inicializar el transportador de Nodemailer
   */
  getTransporter() {
    if (this.transporter) return this.transporter;

    if (!this.smtpConfig.user) {
      // Modo desarrollo / simulación: JSON transport para no bloquear ejecuciones locales
      this.transporter = nodemailer.createTransport({
        jsonTransport: true
      });
    } else {
      this.transporter = nodemailer.createTransport({
        host: this.smtpConfig.host,
        port: Number(this.smtpConfig.port),
        secure: Boolean(this.smtpConfig.secure),
        auth: {
          user: this.smtpConfig.user,
          pass: this.smtpConfig.pass
        },
        tls: {
          rejectUnauthorized: false
        }
      });
    }

    return this.transporter;
  }

  /**
   * Actualiza la configuración SMTP en memoria
   */
  updateConfig({ host, port, user, pass, from, secure }) {
    if (host !== undefined) this.smtpConfig.host = host;
    if (port !== undefined) this.smtpConfig.port = Number(port);
    if (user !== undefined) this.smtpConfig.user = user;
    if (pass !== undefined) this.smtpConfig.pass = pass;
    if (from !== undefined) this.smtpConfig.from = from;
    if (secure !== undefined) {
      this.smtpConfig.secure = Boolean(secure);
    } else if (port !== undefined) {
      this.smtpConfig.secure = Number(port) === 465;
    }

    // Resetear transporter para recrearlo en el siguiente envío
    this.transporter = null;
    this._saveConfigToDisk();
    return this.getConfig();
  }

  /**
   * Obtiene la configuración pública (ocultando credenciales sensibles)
   */
  getConfig() {
    return {
      host: this.smtpConfig.host,
      port: this.smtpConfig.port,
      secure: this.smtpConfig.secure,
      user: this.smtpConfig.user ? `${this.smtpConfig.user.substring(0, 3)}***@${this.smtpConfig.user.split('@')[1] || 'smtp'}` : '',
      rawUser: this.smtpConfig.user || '',
      from: this.smtpConfig.from,
      isConfigured: Boolean(this.smtpConfig.user && this.smtpConfig.pass),
      mode: !this.smtpConfig.user ? 'SIMULADO_LOCAL' : 'SMTP_ACTIVO'
    };
  }

  /**
   * Probar conexión SMTP
   */
  async testConnection({ testEmail, customHost, customPort, customUser, customPass, customSecure }) {
    const host = customHost || this.smtpConfig.host;
    const port = customPort ? Number(customPort) : this.smtpConfig.port;
    const user = customUser !== undefined ? customUser : this.smtpConfig.user;
    const pass = customPass !== undefined ? customPass : this.smtpConfig.pass;
    const secure = customSecure !== undefined ? Boolean(customSecure) : port === 465;

    let testTransporter;

    if (!user) {
      testTransporter = nodemailer.createTransport({ jsonTransport: true });
    } else {
      testTransporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        tls: { rejectUnauthorized: false }
      });
      await testTransporter.verify();
    }

    let sendResult = null;
    if (testEmail) {
      const info = await testTransporter.sendMail({
        from: this.smtpConfig.from,
        to: testEmail,
        subject: 'Prueba de Conexión SMTP - ContaTask',
        text: 'Este es un correo de prueba enviado desde el sistema de gestión contable ContaTask para validar la operatividad del servidor de correo.',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
            <div style="background-color: #1e3a8a; padding: 20px; text-align: center; color: white;">
              <h2 style="margin: 0; font-size: 20px;">ContaTask • Estudio Contable</h2>
              <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.85;">Prueba de Conexión de Correo Electrónico</p>
            </div>
            <div style="padding: 24px; color: #334155; font-size: 14px; line-height: 1.6;">
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 12px; margin-bottom: 16px; color: #166534; font-weight: bold; text-align: center;">
                ✓ ¡Conexión SMTP Establecida con Éxito!
              </div>
              <p>El servidor de correo ha sido configurado correctamente en <strong>ContaTask</strong>. Ahora puede despachar notificaciones tributarias SUNAT, avisos de vencimiento y requerimientos de sustento contable.</p>
              <div style="margin-top: 16px; padding: 12px; background: #f8fafc; border-radius: 6px; font-size: 12px; color: #64748b;">
                <strong>Servidor:</strong> ${host}:${port} (${secure ? 'SSL' : 'TLS/STARTTLS'})<br/>
                <strong>Usuario emisor:</strong> ${user || 'Simulador local'}<br/>
                <strong>Fecha y hora:</strong> ${new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })}
              </div>
            </div>
            <div style="background-color: #f1f5f9; padding: 14px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
              ContaTask — Sistema Integral de Control Tributario y Gestión Contable MYPE
            </div>
          </div>
        `
      });

      sendResult = {
        messageId: info.messageId,
        previewUrl: nodemailer.getTestMessageUrl ? nodemailer.getTestMessageUrl(info) : null
      };
    }

    return {
      success: true,
      message: user ? 'Conexión SMTP validada correctamente con el servidor.' : 'Modo desarrollo simulado activo (sin credenciales SMTP configuradas).',
      host,
      port,
      sendResult
    };
  }

  /**
   * Catálogo de plantillas oficiales
   */
  getTemplates() {
    return [
      {
        id: 'sunat_vencimiento',
        name: 'Recordatorio de Vencimiento SUNAT',
        description: 'Alerta formal con cronograma tributario por dígito de RUC y requerimientos pendientes.',
        defaultSubject: '🚨 [SUNAT] Vencimiento de Declaración Tributaria - Período Agosto 2026 - {{clienteNombre}}',
        variables: ['clienteNombre', 'ruc', 'vencimiento', 'pendientes', 'portalUrl', 'periodo']
      },
      {
        id: 'solicitud_sustento',
        name: 'Solicitud de Comprobante / Sustento Digital',
        description: 'Requerimiento específico de sustento y bancarización (Ley N° 30730) para un comprobante.',
        defaultSubject: '📎 Solicitud Urgente de Sustento Digital Contable - {{clienteNombre}}',
        variables: ['clienteNombre', 'comprobanteTipo', 'comprobanteNumero', 'monto', 'proveedor', 'portalUrl', 'leyBancarizacion']
      },
      {
        id: 'reporte_mensual',
        name: 'Resumen Mensual de Declaración y Estatus',
        description: 'Informe consolidado de compras, ventas y situación tributaria del período.',
        defaultSubject: '📊 Resumen y Estatus de Declaración Mensual - {{clienteNombre}}',
        variables: ['clienteNombre', 'ruc', 'periodo', 'validados', 'pendientes', 'portalUrl']
      },
      {
        id: 'personalizado',
        name: 'Mensaje Personalizado Formal',
        description: 'Comunicación libre con membrete oficial del Estudio Contable Lozano & Asociados.',
        defaultSubject: 'Comunicación Oficial del Estudio Contable - {{clienteNombre}}',
        variables: ['clienteNombre', 'mensajeLibre', 'portalUrl']
      }
    ];
  }

  /**
   * Renderiza el contenido HTML y de texto de una plantilla según datos
   */
  renderTemplate(templateId, data = {}) {
    const portalUrl = data.portalUrl || `${config.corsOrigin}/portal-cliente?ruc=${data.ruc || '20601234567'}`;
    const clienteNombre = data.clienteNombre || 'Estimado(a) Cliente';
    const periodo = data.periodo || 'Agosto 2026';
    const estudioNombre = 'Estudio Contable Lozano & Asociados';

    let subject = '';
    let bodyHtml = '';
    let text = '';

    const wrapHtml = (contentHtml, headerTitle, badgeText = 'Aviso Tributario') => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${headerTitle}</title>
      </head>
      <body style="margin: 0; padding: 20px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Encabezado Membrete -->
          <div style="background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%); color: #ffffff; padding: 26px 28px; text-align: left;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; background: rgba(255, 255, 255, 0.15); padding: 4px 10px; border-radius: 9999px; font-weight: 700; color: #93c5fd;">
                ${badgeText}
              </span>
              <span style="font-size: 12px; color: #cbd5e1;">ContaTask v1.0</span>
            </div>
            <h1 style="margin: 0; font-size: 22px; font-weight: 800; tracking-tight; line-height: 1.2;">
              ${estudioNombre}
            </h1>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8;">
              Gestión y Asesoría Contable, Tributaria y Financiera para Empresas MYPE
            </p>
          </div>

          <!-- Contenido Central -->
          <div style="padding: 28px 28px 24px 28px; line-height: 1.6; font-size: 14px;">
            ${contentHtml}
          </div>

          <!-- Pie de página Oficial -->
          <div style="background-color: #f1f5f9; padding: 20px 28px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center;">
            <p style="margin: 0 0 6px 0; font-weight: 600; color: #475569;">
              ${estudioNombre} • RUC: 20556677889
            </p>
            <p style="margin: 0 0 10px 0;">
              Av. Javier Prado Este 2465, Of. 802, San Borja, Lima — Tel: +51 920 843 098
            </p>
            <p style="margin: 0; font-size: 11px; color: #94a3b8;">
              Este mensaje ha sido emitido de manera automática y certificada por el sistema ContaTask. Para soporte directo, responda a este correo o contacte a su contador asignado.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    switch (templateId) {
      case 'sunat_vencimiento': {
        const vencimiento = data.vencimiento || '18/09/2026';
        const pendientes = data.pendientes ?? 3;
        const ruc = data.ruc || '20601234567';

        subject = `🚨 [SUNAT] Vencimiento de Declaración Tributaria - Período ${periodo} - ${clienteNombre}`;
        text = `Estimado(a) ${clienteNombre},\n\nLe recordamos que la fecha límite fijada por la SUNAT para la presentación de su declaración mensual de impuestos (Período ${periodo}) vence el ${vencimiento}.\n\nActualmente cuenta con ${pendientes} requerimiento(s) de sustento digital y comprobantes pendientes de adjuntar.\n\nPor favor ingrese al portal de clientes para regularizar:\n${portalUrl}\n\nAtentamente,\n${estudioNombre}`;

        const contentHtml = `
          <p style="font-size: 15px; margin-top: 0;">Estimado(a) <strong>${clienteNombre}</strong>,</p>
          
          <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 14px 16px; border-radius: 6px; margin: 18px 0;">
            <p style="margin: 0; color: #991b1b; font-weight: 700; font-size: 14px;">
              ⚠️ ALERTA DE CRONOGRAMA TRIBUTARIO SUNAT
            </p>
            <p style="margin: 6px 0 0 0; color: #b91c1c; font-size: 13px;">
              El plazo perentorio para la declaración y pago de impuestos del período <strong>${periodo}</strong> está por expirar.
            </p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
            <tbody>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; color: #64748b;">Razón Social / MYPE:</td>
                <td style="padding: 10px 0; font-weight: 600; text-align: right; color: #0f172a;">${clienteNombre}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; color: #64748b;">RUC:</td>
                <td style="padding: 10px 0; font-family: monospace; font-weight: 700; text-align: right; color: #1e3a8a;">${ruc}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; color: #64748b;">Fecha Límite de Declaración:</td>
                <td style="padding: 10px 0; font-weight: 800; text-align: right; color: #dc2626;">${vencimiento}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #64748b;">Comprobantes Pendientes:</td>
                <td style="padding: 10px 0; font-weight: 700; text-align: right; color: #ea580c;">${pendientes} documento(s)</td>
              </tr>
            </tbody>
          </table>

          <p style="font-size: 13px; color: #475569;">
            Para evitar contingencias, infracciones y multas tributarias tipificadas en el <strong>Artículo 176 del Código Tributario</strong>, le solicitamos cargar con urgencia los documentos pendientes en su portal de autogestión.
          </p>

          <div style="text-align: center; margin: 28px 0 16px 0;">
            <a href="${portalUrl}" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 13px 26px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.25);">
              Ingresar al Portal del Cliente →
            </a>
          </div>
        `;
        bodyHtml = wrapHtml(contentHtml, subject, 'Vencimiento SUNAT');
        break;
      }

      case 'solicitud_sustento': {
        const compTipo = data.comprobanteTipo || 'Factura Electrónica';
        const compNum = data.comprobanteNumero || 'F001-0004523';
        const monto = data.monto ? Number(data.monto).toFixed(2) : '3,500.00';
        const proveedor = data.proveedor || 'Servicios y Logística SAC';

        subject = `📎 Solicitud Urgente de Sustento Digital Contable - ${compTipo} ${compNum} - ${clienteNombre}`;
        text = `Estimado(a) ${clienteNombre},\n\nLe solicitamos el sustento digital (voucher de pago bancario o comprobante) para la siguiente operación contable:\n- Comprobante: ${compTipo} ${compNum}\n- Monto: S/ ${monto}\n- Emisor/Proveedor: ${proveedor}\n\nPor favor adjunte el documento en su portal: ${portalUrl}\n\nAtentamente,\n${estudioNombre}`;

        const contentHtml = `
          <p style="font-size: 15px; margin-top: 0;">Estimado(a) <strong>${clienteNombre}</strong>,</p>
          <p>Durante la revisión contable del período en curso, se ha identificado una transacción que <strong>requiere acreditación de sustento bancario obligatorio</strong> conforme a la <strong>Ley N° 30730 (Ley de Bancarización)</strong>.</p>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0;">
            <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.5px;">
              Detalle de la Operación Observada
            </h3>
            <div style="font-size: 13px; line-height: 1.8;">
              <div><strong>Comprobante:</strong> ${compTipo} <span style="font-family: monospace; font-weight: bold; color: #2563eb;">${compNum}</span></div>
              <div><strong>Emisor / Proveedor:</strong> ${proveedor}</div>
              <div><strong>Monto Total:</strong> <span style="font-size: 16px; font-weight: 800; color: #059669;">S/ ${monto}</span></div>
              <div><strong>Requisito Tributario:</strong> Sustento fehaciente de medio de pago bancario (Depósito, Transferencia o Cheque 'No Negociable').</div>
            </div>
          </div>

          <p style="font-size: 13px; color: #475569;">
            Por favor, tome una foto nítida o escaneo del voucher bancario y súbalo a través del siguiente botón:
          </p>

          <div style="text-align: center; margin: 26px 0 14px 0;">
            <a href="${portalUrl}" style="background-color: #059669; color: #ffffff; text-decoration: none; padding: 13px 26px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.25);">
              Cargar Voucher de Sustento Digital →
            </a>
          </div>
        `;
        bodyHtml = wrapHtml(contentHtml, subject, 'Sustento Bancario');
        break;
      }

      case 'reporte_mensual': {
        const validados = data.validados ?? 14;
        const pendientes = data.pendientes ?? 0;
        const ruc = data.ruc || '20549876543';

        subject = `📊 Resumen Tributario y Liquidación Preliminar - Período ${periodo} - ${clienteNombre}`;
        text = `Estimado(a) ${clienteNombre},\n\nLe enviamos el resumen contable del período ${periodo}.\nComprobantes validados: ${validados}\nPendientes: ${pendientes}\n\nPuede consultar el detalle ingresando al portal: ${portalUrl}\n\nAtentamente,\n${estudioNombre}`;

        const contentHtml = `
          <p style="font-size: 15px; margin-top: 0;">Estimado(a) <strong>${clienteNombre}</strong>,</p>
          <p>Nos complace remitirle el estatus consolidado de su contabilidad y liquidación previa correspondiente al período <strong>${periodo}</strong>.</p>

          <div style="display: flex; gap: 12px; margin: 20px 0;">
            <div style="flex: 1; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 14px; text-align: center;">
              <span style="font-size: 26px; font-weight: 800; color: #047857; display: block;">${validados}</span>
              <span style="font-size: 11px; text-transform: uppercase; color: #065f46; font-weight: 600;">Validados Conforme</span>
            </div>
            <div style="flex: 1; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 14px; text-align: center;">
              <span style="font-size: 26px; font-weight: 800; color: #b45309; display: block;">${pendientes}</span>
              <span style="font-size: 11px; text-transform: uppercase; color: #92400e; font-weight: 600;">Pendientes de Revisión</span>
            </div>
          </div>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0; font-size: 13px;">
            <p style="margin: 0 0 8px 0; font-weight: 700; color: #1e293b;">Resumen de Obligaciones:</p>
            <ul style="margin: 0; padding-left: 20px; color: #475569;">
              <li>Registro de Compras y Ventas procesados en el sistema.</li>
              <li>Validación de comprobantes de pago electrónicos en SUNAT.</li>
              <li>Auditoría de bancarización y operaciones afectas a detracción.</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 26px 0 14px 0;">
            <a href="${portalUrl}" style="background-color: #1e3a8a; color: #ffffff; text-decoration: none; padding: 13px 26px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">
              Acceder a Documentos del Mes →
            </a>
          </div>
        `;
        bodyHtml = wrapHtml(contentHtml, subject, 'Resumen Contable');
        break;
      }

      case 'personalizado':
      default: {
        const mensajeLibre = data.mensajeLibre || data.mensaje || 'Le enviamos un cordial saludo de parte del equipo contable.';
        subject = data.asunto || `Comunicación Oficial del Estudio Contable - ${clienteNombre}`;
        text = `Estimado(a) ${clienteNombre},\n\n${mensajeLibre}\n\nPortal de clientes: ${portalUrl}\n\nAtentamente,\n${estudioNombre}`;

        const paragraphs = mensajeLibre.split('\n').filter(p => p.trim()).map(p => `<p style="margin: 0 0 12px 0;">${p}</p>`).join('');

        const contentHtml = `
          <p style="font-size: 15px; margin-top: 0;">Estimado(a) <strong>${clienteNombre}</strong>,</p>
          <div style="color: #334155; font-size: 14px; line-height: 1.7; margin: 18px 0;">
            ${paragraphs}
          </div>
          <div style="text-align: center; margin: 28px 0 14px 0;">
            <a href="${portalUrl}" style="background-color: #1e3a8a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 13px; display: inline-block;">
              Abrir Portal ContaTask →
            </a>
          </div>
        `;
        bodyHtml = wrapHtml(contentHtml, subject, 'Comunicado');
        break;
      }
    }

    return { subject, html: bodyHtml, text };
  }

  /**
   * Enviar un correo electrónico con registro en bitácora de auditoría
   */
  async sendEmail({
    to,
    subject,
    html,
    text,
    clienteId = null,
    transaccionId = null,
    templateId = null,
    templateData = {}
  }) {
    if (!to || !to.includes('@')) {
      throw new Error('Dirección de correo electrónico inválida o no proporcionada.');
    }

    let finalSubject = subject;
    let finalHtml = html;
    let finalText = text;

    // Si se especifica una plantilla, generar el contenido a menos que venga especificado
    if (templateId) {
      const rendered = this.renderTemplate(templateId, templateData);
      if (!finalSubject) finalSubject = rendered.subject;
      if (!finalHtml) finalHtml = rendered.html;
      if (!finalText) finalText = rendered.text;
    }

    if (!finalSubject) finalSubject = 'Notificación Contable - ContaTask';
    if (!finalHtml && finalText) {
      finalHtml = `<div style="font-family: Arial, sans-serif; padding: 16px;">${finalText.replace(/\n/g, '<br>')}</div>`;
    }

    const mailOptions = {
      from: this.smtpConfig.from,
      to,
      subject: finalSubject,
      text: finalText,
      html: finalHtml
    };

    let sendInfo = null;
    let notificacionId = null;

    let validClienteId = null;
    if (clienteId) {
      try {
        const cli = await Cliente.findById(clienteId);
        if (cli) validClienteId = Number(clienteId);
      } catch {}
    }

    let validTransaccionId = null;
    if (transaccionId) {
      try {
        const trx = await Transaccion.findById(transaccionId);
        if (trx) validTransaccionId = Number(transaccionId);
      } catch {}
    }

    try {
      const transporter = this.getTransporter();
      sendInfo = await transporter.sendMail(mailOptions);

      // Registrar notificación exitosa en la base de datos relacional
      notificacionId = await Notificacion.create({
        clienteId: validClienteId,
        transaccionId: validTransaccionId,
        canal: 'EMAIL',
        destinatario: to,
        asunto: finalSubject,
        mensaje: finalText || finalSubject,
        estado: 'ENVIADO',
        errorLog: null
      });

      return {
        success: true,
        messageId: sendInfo?.messageId,
        destinatario: to,
        asunto: finalSubject,
        notificacionId,
        previewUrl: nodemailer.getTestMessageUrl ? nodemailer.getTestMessageUrl(sendInfo) : null,
        mode: this.getConfig().mode
      };
    } catch (error) {
      // Registrar falla en auditoría para trazabilidad
      try {
        await Notificacion.create({
          clienteId: validClienteId,
          transaccionId: validTransaccionId,
          canal: 'EMAIL',
          destinatario: to,
          asunto: finalSubject,
          mensaje: finalText || finalSubject,
          estado: 'FALLIDO',
          errorLog: error.message
        });
      } catch (logErr) {
        console.error('Error al registrar notificación fallida en DB:', logErr);
      }

      throw new Error(`Fallo en el envío del correo: ${error.message}`);
    }
  }

  /**
   * Obtener historial de correos enviados
   */
  async getEmailHistory({ clienteId, limit = 50 } = {}) {
    return Notificacion.findAll({
      clienteId,
      canal: 'EMAIL',
      limit
    });
  }
}

export const emailService = new EmailService();
export { EmailService };
