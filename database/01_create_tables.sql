-- ============================================================================
-- SCRIPT 01: DEFINICIÓN DE TABLAS E ÍNDICES (DDL)
-- Base de Datos: contatask_db
-- Motor: PostgreSQL 14+
-- ============================================================================

-- Asegurarse de estar en la base de datos correcta
-- \c contatask_db;

-- ----------------------------------------------------------------------------
-- 1. TABLA: usuarios
-- Gestión de accesos: Contadores públicos colegiados y clientes MYPE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(50) NOT NULL CHECK (rol IN ('CONTADOR', 'CLIENTE')),
    ruc VARCHAR(20),
    empresa_nombre VARCHAR(200),
    telefono VARCHAR(30),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);
CREATE INDEX IF NOT EXISTS idx_usuarios_ruc ON usuarios(ruc);

-- ----------------------------------------------------------------------------
-- 2. TABLA: clientes
-- Directorio de empresas y contribuyentes MYPE asignados al estudio contable
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    ruc VARCHAR(11) NOT NULL UNIQUE,
    razon_social VARCHAR(255) NOT NULL,
    nombre_comercial VARCHAR(255),
    regimen_tributario VARCHAR(100) NOT NULL, -- 'MYPE Tributario', 'Régimen Especial', 'Régimen General', 'Nuevo RUS'
    contacto_nombre VARCHAR(150),
    email VARCHAR(255) NOT NULL,
    celular VARCHAR(30) NOT NULL,
    direccion VARCHAR(255),
    activo BOOLEAN DEFAULT TRUE,
    
    -- Credenciales y Estado de Integración SUNAT (Clave SOL & APIs Oficiales)
    usuario_sol VARCHAR(50),
    clave_sol VARCHAR(100),
    sunat_client_id VARCHAR(100),
    sunat_client_secret VARCHAR(100),
    sunat_token TEXT,
    sunat_token_expires_at TIMESTAMPTZ,
    sunat_estado_conexion VARCHAR(50) DEFAULT 'NO_CONFIGURADO' CHECK (
        sunat_estado_conexion IN ('NO_CONFIGURADO', 'PENDIENTE_VALIDACION', 'CONECTADO', 'ERROR')
    ),
    sunat_ultimo_acceso TIMESTAMPTZ,
    sunat_ultimo_error TEXT,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clientes_ruc ON clientes(ruc);
CREATE INDEX IF NOT EXISTS idx_clientes_email ON clientes(email);
CREATE INDEX IF NOT EXISTS idx_clientes_celular ON clientes(celular);
CREATE INDEX IF NOT EXISTS idx_clientes_activo ON clientes(activo);
CREATE INDEX IF NOT EXISTS idx_clientes_sunat_estado ON clientes(sunat_estado_conexion);

-- ----------------------------------------------------------------------------
-- 3. TABLA: transacciones
-- Registro de comprobantes, compras, ventas y aplicación de Ley N° 30730 (Bancarización)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transacciones (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    periodo VARCHAR(10) NOT NULL, -- Formato: 'AAAA-MM' ej. '2026-08'
    tipo_operacion VARCHAR(50) NOT NULL, -- 'COMPRA', 'VENTA', 'SERVICIO', 'GASTO_BANCARIZADO'
    comprobante_tipo VARCHAR(50) NOT NULL, -- 'FACTURA', 'BOLETA', 'RECIBO_HONORARIOS', 'TICKET_YAPE', 'RECIBO_LUZ_AGUA'
    numero_comprobante VARCHAR(50),
    emisor_ruc VARCHAR(11),
    emisor_razon_social VARCHAR(255),
    fecha_emision DATE NOT NULL,
    moneda VARCHAR(10) DEFAULT 'PEN' CHECK (moneda IN ('PEN', 'USD')),
    monto_total NUMERIC(14, 2) NOT NULL,
    monto_igv NUMERIC(14, 2) DEFAULT 0,
    requiere_bancarizacion BOOLEAN DEFAULT FALSE,
    estado_sustento VARCHAR(50) DEFAULT 'INFORMACION_INCOMPLETA' CHECK (
        estado_sustento IN ('INFORMACION_INCOMPLETA', 'SUSTENTO_RECIBIDO', 'VALIDADO', 'RECHAZADO')
    ),
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transacciones_cliente_id ON transacciones(cliente_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_periodo ON transacciones(periodo);
CREATE INDEX IF NOT EXISTS idx_transacciones_estado_sustento ON transacciones(estado_sustento);
CREATE INDEX IF NOT EXISTS idx_transacciones_fecha_emision ON transacciones(fecha_emision);
CREATE INDEX IF NOT EXISTS idx_transacciones_bancarizacion ON transacciones(requiere_bancarizacion);

-- ----------------------------------------------------------------------------
-- 4. TABLA: documentos_sustento
-- Archivos adjuntos, vouchers, constancias de depósito y sustentos bancarios
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documentos_sustento (
    id SERIAL PRIMARY KEY,
    transaccion_id INTEGER NOT NULL REFERENCES transacciones(id) ON DELETE CASCADE,
    nombre_archivo VARCHAR(255) NOT NULL,
    nombre_original VARCHAR(255) NOT NULL,
    ruta_archivo VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    tamano_bytes BIGINT NOT NULL,
    subido_por_usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    estado_revision VARCHAR(50) DEFAULT 'PENDIENTE' CHECK (
        estado_revision IN ('PENDIENTE', 'APROBADO', 'RECHAZADO')
    ),
    motivo_rechazo TEXT,
    fecha_subida TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_documentos_transaccion_id ON documentos_sustento(transaccion_id);
CREATE INDEX IF NOT EXISTS idx_documentos_estado ON documentos_sustento(estado_revision);

-- ----------------------------------------------------------------------------
-- 5. TABLA: notificaciones
-- Registro de auditoría y despachos fehacientes por WhatsApp y Correo
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notificaciones (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER REFERENCES clientes(id) ON DELETE CASCADE,
    transaccion_id INTEGER REFERENCES transacciones(id) ON DELETE SET NULL,
    canal VARCHAR(50) NOT NULL CHECK (canal IN ('WHATSAPP', 'EMAIL')),
    destinatario VARCHAR(150) NOT NULL,
    asunto VARCHAR(255),
    mensaje TEXT NOT NULL,
    estado VARCHAR(50) NOT NULL CHECK (estado IN ('ENVIADO', 'FALLIDO', 'RESPALDO_ENVIADO')),
    error_log TEXT,
    fecha_envio TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_cliente_id ON notificaciones(cliente_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_transaccion_id ON notificaciones(transaccion_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_canal ON notificaciones(canal);
CREATE INDEX IF NOT EXISTS idx_notificaciones_estado ON notificaciones(estado);
CREATE INDEX IF NOT EXISTS idx_notificaciones_fecha ON notificaciones(fecha_envio);

-- ----------------------------------------------------------------------------
-- 6. TABLA: historial_auditoria
-- Trazabilidad de decisiones contables (Aprobaciones, Rechazos y Evaluaciones)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS historial_auditoria (
    id SERIAL PRIMARY KEY,
    transaccion_id INTEGER NOT NULL REFERENCES transacciones(id) ON DELETE CASCADE,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    accion VARCHAR(100) NOT NULL,
    estado_anterior VARCHAR(50),
    estado_nuevo VARCHAR(50),
    motivo TEXT,
    detalles TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auditoria_transaccion_id ON historial_auditoria(transaccion_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario_id ON historial_auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_created_at ON historial_auditoria(created_at);

-- ----------------------------------------------------------------------------
-- 7. TABLA: correos_recibidos
-- Captura y almacenamiento de correos entrantes de clientes vía IMAP
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS correos_recibidos (
    id SERIAL PRIMARY KEY,
    message_id VARCHAR(255),
    uid VARCHAR(100),
    remitente VARCHAR(255) NOT NULL,
    remitente_email VARCHAR(255) NOT NULL,
    destinatario VARCHAR(255),
    asunto VARCHAR(500),
    fecha TIMESTAMPTZ,
    cuerpo_texto TEXT,
    cuerpo_html TEXT,
    leido BOOLEAN DEFAULT FALSE,
    cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
    cliente_ruc VARCHAR(11),
    transaccion_id INTEGER REFERENCES transacciones(id) ON DELETE SET NULL,
    tiene_adjuntos BOOLEAN DEFAULT FALSE,
    adjuntos_json TEXT,
    procesado_como_sustento BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_correos_remitente_email ON correos_recibidos(remitente_email);
CREATE INDEX IF NOT EXISTS idx_correos_cliente_ruc ON correos_recibidos(cliente_ruc);
CREATE INDEX IF NOT EXISTS idx_correos_leido ON correos_recibidos(leido);
CREATE INDEX IF NOT EXISTS idx_correos_fecha ON correos_recibidos(fecha);

-- ----------------------------------------------------------------------------
-- 8. TABLA: buzon_sol_mensajes
-- Buzón Electrónico SOL de SUNAT (Notificaciones Administrativas y Mensajes Informativos)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS buzon_sol_mensajes (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    cliente_ruc VARCHAR(11) NOT NULL,
    numero_notificacion VARCHAR(100) NOT NULL,
    categoria_buzon VARCHAR(50) DEFAULT 'NOTIFICACION' CHECK (
        categoria_buzon IN ('NOTIFICACION', 'MENSAJE')
    ),
    tipo_documento VARCHAR(100) NOT NULL, -- 'CARTA_INDUCTIVA', 'ESQUELA_CITACION', 'ORDEN_PAGO', 'AVISO_VENCIMIENTO', 'INFORMATIVO'
    asunto VARCHAR(500) NOT NULL,
    mensaje TEXT NOT NULL,
    fecha_deposito TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_lectura TIMESTAMPTZ,
    estado VARCHAR(50) DEFAULT 'NO_LEIDO' CHECK (
        estado IN ('NO_LEIDO', 'LEIDO', 'URGENTE', 'ATENDIDO')
    ),
    plazo_dias INTEGER,
    fecha_vencimiento_plazo VARCHAR(50),
    adjunto_nombre VARCHAR(255),
    requiere_respuesta BOOLEAN DEFAULT FALSE,
    detalle_json TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_buzon_cliente_id ON buzon_sol_mensajes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_buzon_cliente_ruc ON buzon_sol_mensajes(cliente_ruc);
CREATE INDEX IF NOT EXISTS idx_buzon_categoria ON buzon_sol_mensajes(categoria_buzon);
CREATE INDEX IF NOT EXISTS idx_buzon_numero_notif ON buzon_sol_mensajes(numero_notificacion);
CREATE INDEX IF NOT EXISTS idx_buzon_estado ON buzon_sol_mensajes(estado);
CREATE INDEX IF NOT EXISTS idx_buzon_fecha_deposito ON buzon_sol_mensajes(fecha_deposito);

-- ----------------------------------------------------------------------------
-- 9. TABLA: whatsapp_mensajes
-- Chat en tiempo real, trazabilidad de conversaciones y mensajería con Baileys
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS whatsapp_mensajes (
    id SERIAL PRIMARY KEY,
    message_id VARCHAR(255),
    phone_number VARCHAR(50) NOT NULL,
    contact_name VARCHAR(200),
    cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
    cliente_ruc VARCHAR(11),
    from_me BOOLEAN DEFAULT FALSE,
    message_text TEXT NOT NULL,
    media_url VARCHAR(500),
    media_type VARCHAR(50), -- 'document', 'image', 'audio', etc.
    media_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'SENT' CHECK (
        status IN ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED')
    ),
    is_read BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_phone ON whatsapp_mensajes(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_cliente_id ON whatsapp_mensajes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_cliente_ruc ON whatsapp_mensajes(cliente_ruc);
CREATE INDEX IF NOT EXISTS idx_whatsapp_is_read ON whatsapp_mensajes(is_read);
CREATE INDEX IF NOT EXISTS idx_whatsapp_timestamp ON whatsapp_mensajes(timestamp);

-- ----------------------------------------------------------------------------
-- 10. TABLA: cronogramas_sunat_oficial
-- Almacena los cronogramas oficiales de obligaciones mensuales extraídos de SUNAT
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cronogramas_sunat_oficial (
    id SERIAL PRIMARY KEY,
    periodo VARCHAR(10) NOT NULL, -- ej. '2026-08'
    digito_grupo VARCHAR(30) NOT NULL, -- '0', '1', '2_3', '4_5', '6_7', '8_9', 'BUENOS_CONTRIBUYENTES'
    digito_label VARCHAR(100) NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    resolucion_sunat VARCHAR(255) NOT NULL,
    fuente_oficial VARCHAR(255) DEFAULT 'Portal Institucional SUNAT / El Peruano',
    url_oficial VARCHAR(500) DEFAULT 'https://orientacion.sunat.gob.pe/cronograma-de-obligaciones-mensuales',
    estado VARCHAR(30) DEFAULT 'OFICIAL_PUBLICADO',
    sincronizado_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_periodo_digito UNIQUE (periodo, digito_grupo)
);

CREATE INDEX IF NOT EXISTS idx_crono_periodo ON cronogramas_sunat_oficial(periodo);
CREATE INDEX IF NOT EXISTS idx_crono_fecha ON cronogramas_sunat_oficial(fecha_vencimiento);
