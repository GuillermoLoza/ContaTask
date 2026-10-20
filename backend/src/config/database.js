import knex from 'knex';
import { config } from './env.js';

/**
 * Configuración de Knex exclusivamente para PostgreSQL
 */
function createKnexInstance() {
  return knex({
    client: 'pg',
    connection: config.db.connectionString || {
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database
    },
    pool: { min: 2, max: 10 }
  });
}

export const db = createKnexInstance();

/**
 * Inicializa y valida la conectividad con PostgreSQL
 */
export async function initDatabase() {
  try {
    await db.raw('SELECT 1');
    console.log(`🐘 Conectado exitosamente a PostgreSQL (${config.db.database} en ${config.db.host}:${config.db.port}).`);
  } catch (err) {
    console.error(`❌ Error crítico al conectar a PostgreSQL en ${config.db.host}:${config.db.port}: ${err.message}`);
    throw err;
  }

  // 1. Tabla: usuarios
  if (!(await db.schema.hasTable('usuarios'))) {
    await db.schema.createTable('usuarios', (table) => {
      table.increments('id').primary();
      table.string('nombre').notNullable();
      table.string('email').notNullable().unique();
      table.string('password_hash').notNullable();
      table.string('rol').notNullable(); // 'CONTADOR' | 'CLIENTE'
      table.string('ruc').nullable();
      table.string('empresa_nombre').nullable();
      table.string('telefono').nullable();
      table.boolean('activo').defaultTo(true);
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  // 2. Tabla: clientes
  if (!(await db.schema.hasTable('clientes'))) {
    await db.schema.createTable('clientes', (table) => {
      table.increments('id').primary();
      table.string('ruc', 11).notNullable().unique();
      table.string('razon_social').notNullable();
      table.string('nombre_comercial').nullable();
      table.string('regimen_tributario').notNullable();
      table.string('contacto_nombre').nullable();
      table.string('email').notNullable();
      table.string('celular').notNullable();
      table.string('direccion').nullable();
      table.boolean('activo').defaultTo(true);
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  // 3. Tabla: transacciones
  if (!(await db.schema.hasTable('transacciones'))) {
    await db.schema.createTable('transacciones', (table) => {
      table.increments('id').primary();
      table.integer('cliente_id').unsigned().references('id').inTable('clientes').onDelete('CASCADE').notNullable();
      table.string('periodo').notNullable();
      table.string('tipo_operacion').notNullable();
      table.string('comprobante_tipo').notNullable();
      table.string('numero_comprobante').nullable();
      table.string('emisor_ruc').nullable();
      table.string('emisor_razon_social').nullable();
      table.string('fecha_emision').notNullable();
      table.string('moneda').defaultTo('PEN');
      table.decimal('monto_total', 14, 2).notNullable();
      table.decimal('monto_igv', 14, 2).defaultTo(0);
      table.boolean('requiere_bancarizacion').defaultTo(false);
      table.string('estado_sustento').defaultTo('INFORMACION_INCOMPLETA');
      table.text('observaciones').nullable();
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
  }

  // 4. Tabla: documentos_sustento
  if (!(await db.schema.hasTable('documentos_sustento'))) {
    await db.schema.createTable('documentos_sustento', (table) => {
      table.increments('id').primary();
      table.integer('transaccion_id').unsigned().references('id').inTable('transacciones').onDelete('CASCADE').notNullable();
      table.string('nombre_archivo').notNullable();
      table.string('nombre_original').notNullable();
      table.string('ruta_archivo').notNullable();
      table.string('mime_type').notNullable();
      table.integer('tamano_bytes').notNullable();
      table.integer('subido_por_usuario_id').unsigned().references('id').inTable('usuarios').nullable();
      table.string('estado_revision').defaultTo('PENDIENTE');
      table.text('motivo_rechazo').nullable();
      table.timestamp('fecha_subida').defaultTo(db.fn.now());
    });
  }

  // 5. Tabla: notificaciones
  if (!(await db.schema.hasTable('notificaciones'))) {
    await db.schema.createTable('notificaciones', (table) => {
      table.increments('id').primary();
      table.integer('cliente_id').unsigned().references('id').inTable('clientes').nullable();
      table.integer('transaccion_id').unsigned().references('id').inTable('transacciones').nullable();
      table.string('canal').notNullable(); // 'WHATSAPP' | 'EMAIL'
      table.string('destinatario').notNullable();
      table.string('asunto').nullable();
      table.text('mensaje').notNullable();
      table.string('estado').notNullable(); // 'ENVIADO' | 'FALLIDO' | 'RESPALDO_ENVIADO'
      table.text('error_log').nullable();
      table.timestamp('fecha_envio').defaultTo(db.fn.now());
    });
  }

  // 6. Tabla: historial_auditoria
  if (!(await db.schema.hasTable('historial_auditoria'))) {
    await db.schema.createTable('historial_auditoria', (table) => {
      table.increments('id').primary();
      table.integer('transaccion_id').unsigned().references('id').inTable('transacciones').onDelete('CASCADE').notNullable();
      table.integer('usuario_id').unsigned().references('id').inTable('usuarios').nullable();
      table.string('accion').notNullable();
      table.string('estado_anterior').nullable();
      table.string('estado_nuevo').nullable();
      table.text('motivo').nullable();
      table.text('detalles').nullable();
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  // 7. Tabla: correos_recibidos (Captura y almacenamiento de correos entrantes vía IMAP)
  if (!(await db.schema.hasTable('correos_recibidos'))) {
    await db.schema.createTable('correos_recibidos', (table) => {
      table.increments('id').primary();
      table.string('message_id').nullable().index();
      table.string('uid').nullable();
      table.string('remitente').notNullable();
      table.string('remitente_email').notNullable().index();
      table.string('destinatario').nullable();
      table.string('asunto').nullable();
      table.timestamp('fecha').nullable();
      table.text('cuerpo_texto').nullable();
      table.text('cuerpo_html').nullable();
      table.boolean('leido').defaultTo(false);
      table.integer('cliente_id').unsigned().references('id').inTable('clientes').nullable();
      table.string('cliente_ruc').nullable().index();
      table.integer('transaccion_id').unsigned().references('id').inTable('transacciones').nullable();
      table.boolean('tiene_adjuntos').defaultTo(false);
      table.text('adjuntos_json').nullable();
      table.boolean('procesado_como_sustento').defaultTo(false);
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  // 8. Asegurar columnas de SUNAT en la tabla clientes
  if (await db.schema.hasTable('clientes')) {
    const hasUsuarioSol = await db.schema.hasColumn('clientes', 'usuario_sol');
    if (!hasUsuarioSol) {
      await db.schema.table('clientes', (table) => {
        table.string('usuario_sol').nullable();
        table.string('clave_sol').nullable();
        table.string('sunat_client_id').nullable();
        table.string('sunat_client_secret').nullable();
        table.text('sunat_token').nullable();
        table.timestamp('sunat_token_expires_at').nullable();
        table.string('sunat_estado_conexion').defaultTo('NO_CONFIGURADO');
        table.timestamp('sunat_ultimo_acceso').nullable();
        table.text('sunat_ultimo_error').nullable();
      });
    }
  }

  // 9. Tabla: buzon_sol_mensajes (Buzón Electrónico SUNAT: Notificaciones y Mensajes)
  if (!(await db.schema.hasTable('buzon_sol_mensajes'))) {
    await db.schema.createTable('buzon_sol_mensajes', (table) => {
      table.increments('id').primary();
      table.integer('cliente_id').unsigned().references('id').inTable('clientes').onDelete('CASCADE').notNullable();
      table.string('cliente_ruc', 11).notNullable().index();
      table.string('numero_notificacion').notNullable().index();
      table.string('categoria_buzon').defaultTo('NOTIFICACION'); // 'NOTIFICACION' | 'MENSAJE'
      table.string('tipo_documento').notNullable(); // 'CARTA_INDUCTIVA' | 'ESQUELA_CITACION' | 'ORDEN_PAGO' | 'RESOLUCION_COACTIVA' | 'AVISO_VENCIMIENTO' | 'REPORTE_SIRE' | 'INFORMATIVO'
      table.string('asunto').notNullable();
      table.text('mensaje').notNullable();
      table.timestamp('fecha_deposito').defaultTo(db.fn.now());
      table.timestamp('fecha_lectura').nullable();
      table.string('estado').defaultTo('NO_LEIDO'); // 'NO_LEIDO' | 'LEIDO' | 'URGENTE' | 'ATENDIDO'
      table.integer('plazo_dias').nullable();
      table.string('fecha_vencimiento_plazo').nullable();
      table.string('adjunto_nombre').nullable();
      table.boolean('requiere_respuesta').defaultTo(false);
      table.text('detalle_json').nullable();
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
  } else {
    const hasCategoria = await db.schema.hasColumn('buzon_sol_mensajes', 'categoria_buzon');
    if (!hasCategoria) {
      await db.schema.table('buzon_sol_mensajes', (table) => {
        table.string('categoria_buzon').defaultTo('NOTIFICACION');
      });
    }
    const hasDetalle = await db.schema.hasColumn('buzon_sol_mensajes', 'detalle_json');
    if (!hasDetalle) {
      await db.schema.table('buzon_sol_mensajes', (table) => {
        table.text('detalle_json').nullable();
      });
    }
  }

  // 10. Tabla: whatsapp_mensajes (Chat en tiempo real y registro de conversaciones)
  if (!(await db.schema.hasTable('whatsapp_mensajes'))) {
    await db.schema.createTable('whatsapp_mensajes', (table) => {
      table.increments('id').primary();
      table.string('message_id').nullable().index();
      table.string('phone_number').notNullable().index();
      table.string('contact_name').nullable();
      table.integer('cliente_id').unsigned().references('id').inTable('clientes').nullable();
      table.string('cliente_ruc').nullable().index();
      table.boolean('from_me').defaultTo(false); // true si enviado por el contador, false si recibido del cliente
      table.text('message_text').notNullable();
      table.string('media_url').nullable();
      table.string('media_type').nullable(); // 'document' | 'image' | 'audio'
      table.string('media_name').nullable();
      table.string('status').defaultTo('SENT'); // 'PENDING' | 'SENT' | 'DELIVERED' | 'READ'
      table.boolean('is_read').defaultTo(false);
      table.timestamp('timestamp').defaultTo(db.fn.now());
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  // 11. Tabla: sire_propuestas (Propuestas RVIE y RCE de SUNAT)
  if (!(await db.schema.hasTable('sire_propuestas'))) {
    await db.schema.createTable('sire_propuestas', (table) => {
      table.increments('id').primary();
      table.integer('cliente_id').unsigned().references('id').inTable('clientes').onDelete('CASCADE').notNullable();
      table.string('cliente_ruc', 11).notNullable().index();
      table.string('periodo', 10).notNullable().index(); // ej. '2026-08'
      table.string('tipo_registro', 10).notNullable(); // 'RVIE' (Ventas) | 'RCE' (Compras)
      table.string('estado', 30).defaultTo('PROPUESTA_SUNAT'); // 'PROPUESTA_SUNAT' | 'PRELIMINAR' | 'FINAL_ACEPTADA' | 'REEMPLAZADA'
      table.integer('total_comprobantes').defaultTo(0);
      table.decimal('base_imponible', 14, 2).defaultTo(0);
      table.decimal('igv', 14, 2).defaultTo(0);
      table.decimal('total', 14, 2).defaultTo(0);
      table.string('ticket_sunat', 50).nullable();
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
  }

  // 12. Tabla: sire_comprobantes (Detalle de comprobantes de la propuesta SIRE)
  if (!(await db.schema.hasTable('sire_comprobantes'))) {
    await db.schema.createTable('sire_comprobantes', (table) => {
      table.increments('id').primary();
      table.integer('sire_propuesta_id').unsigned().references('id').inTable('sire_propuestas').onDelete('CASCADE').nullable();
      table.integer('cliente_id').unsigned().references('id').inTable('clientes').onDelete('CASCADE').notNullable();
      table.string('periodo', 10).notNullable().index();
      table.string('tipo_registro', 10).notNullable(); // 'RVIE' | 'RCE'
      table.string('tipo_comprobante', 10).notNullable(); // '01'=Factura, '03'=Boleta, '07'=Nota Cred, '08'=Nota Deb, '14'=Servicios
      table.string('serie', 10).notNullable();
      table.string('numero', 20).notNullable();
      table.string('emisor_ruc', 11).nullable().index();
      table.string('emisor_razon_social', 255).nullable();
      table.date('fecha_emision').notNullable();
      table.date('fecha_vcto').nullable();
      table.string('moneda', 5).defaultTo('PEN');
      table.decimal('tipo_cambio', 10, 3).defaultTo(1.000);
      table.decimal('base_imponible', 14, 2).notNullable();
      table.decimal('igv', 14, 2).notNullable();
      table.decimal('monto_total', 14, 2).notNullable();
      table.string('estado_cruce', 30).defaultTo('COINCIDE'); // 'COINCIDE' | 'SOLO_EN_SUNAT' | 'SOLO_EN_SISTEMA' | 'DISCREPANCIA_MONTO' | 'EXCLUIDO'
      table.integer('transaccion_id').unsigned().references('id').inTable('transacciones').nullable();
      table.text('motivo_exclusion').nullable();
      table.boolean('es_manual').defaultTo(false); // Para recibos de luz, agua añadidos manualmente
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  // 13. Tabla: declaraciones_mensuales (Cálculo de IGV y Renta Mensual, Proyección SUNAT y NPS)
  if (!(await db.schema.hasTable('declaraciones_mensuales'))) {
    await db.schema.createTable('declaraciones_mensuales', (table) => {
      table.increments('id').primary();
      table.integer('cliente_id').unsigned().references('id').inTable('clientes').onDelete('CASCADE').notNullable();
      table.string('cliente_ruc', 11).notNullable().index();
      table.string('periodo', 10).notNullable().index();
      table.string('regimen_tributario', 50).notNullable();
      table.decimal('ventas_base', 14, 2).defaultTo(0);
      table.decimal('ventas_igv', 14, 2).defaultTo(0);
      table.decimal('compras_base', 14, 2).defaultTo(0);
      table.decimal('compras_igv', 14, 2).defaultTo(0);
      table.decimal('igv_determinado', 14, 2).defaultTo(0);
      table.decimal('coeficiente_renta', 6, 4).defaultTo(0.0100);
      table.decimal('renta_determinada', 14, 2).defaultTo(0);
      table.decimal('total_tributo_pagar', 14, 2).defaultTo(0);
      table.decimal('calculo_sunat_igv', 14, 2).nullable();
      table.decimal('calculo_sunat_renta', 14, 2).nullable();
      table.string('estado_coincidencia', 30).defaultTo('COINCIDE'); // 'COINCIDE' | 'DISCREPANCIA' | 'PENDIENTE_CALCULO'
      table.string('estado_declaracion', 30).defaultTo('CALCULADO'); // 'CALCULADO' | 'DECLARADO' | 'CON_NPS' | 'PAGADO'
      table.string('numero_orden_dj', 50).nullable();
      table.string('nps', 30).nullable();
      table.date('fecha_limite_pago').nullable();
      table.string('constancia_url', 255).nullable();
      table.boolean('notificado_cliente').defaultTo(false);
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
  }

  // 14. Tabla: plame_periodos (Planilla Mensual de Pagos Formulario 0601)
  if (!(await db.schema.hasTable('plame_periodos'))) {
    await db.schema.createTable('plame_periodos', (table) => {
      table.increments('id').primary();
      table.integer('cliente_id').unsigned().references('id').inTable('clientes').onDelete('CASCADE').notNullable();
      table.string('cliente_ruc', 11).notNullable().index();
      table.string('periodo', 10).notNullable().index();
      table.integer('total_trabajadores').defaultTo(0);
      table.decimal('total_remuneracion', 14, 2).defaultTo(0);
      table.decimal('total_essalud', 14, 2).defaultTo(0);
      table.decimal('total_onp', 14, 2).defaultTo(0);
      table.decimal('total_afp', 14, 2).defaultTo(0);
      table.decimal('total_renta_5ta', 14, 2).defaultTo(0);
      table.decimal('total_renta_4ta', 14, 2).defaultTo(0);
      table.string('estado', 30).defaultTo('BORRADOR'); // 'BORRADOR' | 'VALIDADO' | 'ARCHIVOS_GENERADOS' | 'DECLARADO'
      table.string('nps_plame', 30).nullable();
      table.string('archivo_rem_url', 255).nullable();
      table.string('archivo_jor_url', 255).nullable();
      table.string('archivo_snl_url', 255).nullable();
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
  }

  // 15. Tabla: plame_trabajadores (Trabajadores y cálculo de aportes y retenciones)
  if (!(await db.schema.hasTable('plame_trabajadores'))) {
    await db.schema.createTable('plame_trabajadores', (table) => {
      table.increments('id').primary();
      table.integer('plame_periodo_id').unsigned().references('id').inTable('plame_periodos').onDelete('CASCADE').notNullable();
      table.integer('cliente_id').unsigned().references('id').inTable('clientes').onDelete('CASCADE').notNullable();
      table.string('tipo_documento', 5).defaultTo('01'); // 01=DNI, 04=Carné Extranjería
      table.string('numero_documento', 15).notNullable();
      table.string('nombres', 100).notNullable();
      table.string('apellidos', 100).notNullable();
      table.string('cargo', 100).nullable();
      table.date('fecha_ingreso').nullable();
      table.integer('dias_laborados').defaultTo(30);
      table.integer('horas_ordinarias').defaultTo(240);
      table.decimal('sueldo_base', 10, 2).notNullable();
      table.decimal('asignacion_familiar', 10, 2).defaultTo(0);
      table.decimal('horas_extras', 10, 2).defaultTo(0);
      table.decimal('total_remuneracion_bruta', 10, 2).notNullable();
      table.string('regimen_pensionario', 20).defaultTo('ONP'); // 'ONP' | 'INTEGRA' | 'PRIMA' | 'PROFUTURO' | 'HABITAT'
      table.decimal('descuento_pension', 10, 2).defaultTo(0);
      table.decimal('retencion_renta_5ta', 10, 2).defaultTo(0);
      table.decimal('neto_pagar', 10, 2).notNullable();
      table.decimal('aporte_essalud', 10, 2).notNullable();
      table.boolean('es_valido').defaultTo(true);
      table.text('error_validacion').nullable();
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  // 16. Tabla: cronogramas_sunat_oficial (Vencimientos oficiales extraídos directamente del portal de SUNAT)
  if (!(await db.schema.hasTable('cronogramas_sunat_oficial'))) {
    await db.schema.createTable('cronogramas_sunat_oficial', (table) => {
      table.increments('id').primary();
      table.string('periodo', 10).notNullable().index(); // ej. '2026-08'
      table.string('digito_grupo', 30).notNullable(); // '0', '1', '2_3', '4_5', '6_7', '8_9', 'BUENOS_CONTRIBUYENTES'
      table.string('digito_label', 100).notNullable();
      table.date('fecha_vencimiento').notNullable();
      table.string('resolucion_sunat', 255).notNullable();
      table.string('fuente_oficial', 255).defaultTo('Portal Institucional SUNAT / El Peruano');
      table.string('url_oficial', 500).defaultTo('https://orientacion.sunat.gob.pe/cronograma-de-obligaciones-mensuales');
      table.string('estado', 30).defaultTo('OFICIAL_PUBLICADO');
      table.timestamp('sincronizado_at').defaultTo(db.fn.now());
      table.unique(['periodo', 'digito_grupo']);
    });
  }

  return db;
}
