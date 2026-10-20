-- ============================================================================
-- CONTATASK - SCRIPT CONSOLIDADO COMPLETO (ALL-IN-ONE)
-- Base de Datos: contatask_db
-- Motor: PostgreSQL 14+ (Probado en PostgreSQL 18.x)
-- Conexión predeterminada local:
--   Host: localhost
--   Puerto: 5432
--   Usuario: postgres
--   Contraseña: postgres
--   Base de Datos: contatask_db
-- ============================================================================

-- 0. Habilitar extensiones criptográficas y UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. TABLAS PRINCIPALES (DDL)
-- ============================================================================

-- 1.1 Tabla: usuarios
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

-- 1.2 Tabla: clientes
CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    ruc VARCHAR(11) NOT NULL UNIQUE,
    razon_social VARCHAR(255) NOT NULL,
    nombre_comercial VARCHAR(255),
    regimen_tributario VARCHAR(100) NOT NULL,
    contacto_nombre VARCHAR(150),
    email VARCHAR(255) NOT NULL,
    celular VARCHAR(30) NOT NULL,
    direccion VARCHAR(255),
    activo BOOLEAN DEFAULT TRUE,
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

-- 1.3 Tabla: transacciones
CREATE TABLE IF NOT EXISTS transacciones (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    periodo VARCHAR(10) NOT NULL,
    tipo_operacion VARCHAR(50) NOT NULL,
    comprobante_tipo VARCHAR(50) NOT NULL,
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

-- 1.4 Tabla: documentos_sustento
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

-- 1.5 Tabla: notificaciones
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

-- 1.6 Tabla: historial_auditoria
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

-- 1.7 Tabla: correos_recibidos
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

-- 1.8 Tabla: buzon_sol_mensajes
CREATE TABLE IF NOT EXISTS buzon_sol_mensajes (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    cliente_ruc VARCHAR(11) NOT NULL,
    numero_notificacion VARCHAR(100) NOT NULL,
    categoria_buzon VARCHAR(50) DEFAULT 'NOTIFICACION' CHECK (
        categoria_buzon IN ('NOTIFICACION', 'MENSAJE')
    ),
    tipo_documento VARCHAR(100) NOT NULL,
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
CREATE INDEX IF NOT EXISTS idx_buzon_numero_notif ON buzon_sol_mensajes(numero_notificacion);
CREATE INDEX IF NOT EXISTS idx_buzon_estado ON buzon_sol_mensajes(estado);

-- 1.9 Tabla: whatsapp_mensajes
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
    media_type VARCHAR(50),
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

-- ============================================================================
-- 2. TRIGGERS Y FUNCIONES AUTOMATIZADAS
-- ============================================================================

CREATE OR REPLACE FUNCTION actualizar_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_actualizar_usuarios_updated_at ON usuarios;
CREATE TRIGGER trg_actualizar_usuarios_updated_at
BEFORE UPDATE ON usuarios
FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp_updated_at();

DROP TRIGGER IF EXISTS trg_actualizar_clientes_updated_at ON clientes;
CREATE TRIGGER trg_actualizar_clientes_updated_at
BEFORE UPDATE ON clientes
FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp_updated_at();

DROP TRIGGER IF EXISTS trg_actualizar_transacciones_updated_at ON transacciones;
CREATE TRIGGER trg_actualizar_transacciones_updated_at
BEFORE UPDATE ON transacciones
FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp_updated_at();

-- Auto-vinculación de mensajes WhatsApp con Clientes
CREATE OR REPLACE FUNCTION auto_vincular_cliente_whatsapp()
RETURNS TRIGGER AS $$
DECLARE
    v_clean_phone VARCHAR(50);
    v_cliente_id INTEGER;
    v_cliente_ruc VARCHAR(11);
    v_contacto_nombre VARCHAR(150);
BEGIN
    v_clean_phone := regexp_replace(NEW.phone_number, '\D', '', 'g');

    IF NEW.cliente_id IS NULL THEN
        SELECT id, ruc, COALESCE(razon_social, contacto_nombre)
        INTO v_cliente_id, v_cliente_ruc, v_contacto_nombre
        FROM clientes
        WHERE celular = v_clean_phone
           OR celular = RIGHT(v_clean_phone, 9)
           OR ruc = v_clean_phone
        LIMIT 1;

        IF v_cliente_id IS NOT NULL THEN
            NEW.cliente_id := v_cliente_id;
            NEW.cliente_ruc := v_cliente_ruc;
            IF NEW.contact_name IS NULL THEN
                NEW.contact_name := v_contacto_nombre;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_vincular_whatsapp ON whatsapp_mensajes;
CREATE TRIGGER trg_auto_vincular_whatsapp
BEFORE INSERT ON whatsapp_mensajes
FOR EACH ROW EXECUTE FUNCTION auto_vincular_cliente_whatsapp();

-- ============================================================================
-- 3. VISTAS ANALÍTICAS Y OPERATIVAS
-- ============================================================================

CREATE OR REPLACE VIEW v_resumen_cumplimiento_mype AS
SELECT 
    c.id AS cliente_id,
    c.ruc,
    c.razon_social,
    c.regimen_tributario,
    c.celular,
    c.email,
    c.sunat_estado_conexion,
    COUNT(t.id) AS total_transacciones,
    COUNT(CASE WHEN t.estado_sustento = 'INFORMACION_INCOMPLETA' THEN 1 END) AS pendientes_sustento,
    COUNT(CASE WHEN t.estado_sustento = 'SUSTENTO_RECIBIDO' THEN 1 END) AS sustentos_por_evaluar,
    COUNT(CASE WHEN t.estado_sustento = 'VALIDADO' THEN 1 END) AS transacciones_validadas,
    COUNT(CASE WHEN t.estado_sustento = 'RECHAZADO' THEN 1 END) AS transacciones_rechazadas,
    COALESCE(SUM(t.monto_total), 0) AS monto_total_acumulado,
    COALESCE(SUM(CASE WHEN t.requiere_bancarizacion THEN t.monto_total ELSE 0 END), 0) AS monto_sujeto_bancarizacion
FROM clientes c
LEFT JOIN transacciones t ON c.id = t.cliente_id
GROUP BY c.id, c.ruc, c.razon_social, c.regimen_tributario, c.celular, c.email, c.sunat_estado_conexion;

CREATE OR REPLACE VIEW v_conversaciones_whatsapp_activas AS
WITH UltimosMensajes AS (
    SELECT 
        phone_number,
        message_text AS ultimo_mensaje,
        from_me AS ultimo_from_me,
        status AS ultimo_status,
        timestamp AS ultimo_timestamp,
        ROW_NUMBER() OVER(PARTITION BY phone_number ORDER BY timestamp DESC, id DESC) AS rn
    FROM whatsapp_mensajes
),
ConteoNoLeidos AS (
    SELECT 
        phone_number,
        COUNT(*) AS mensajes_no_leidos
    FROM whatsapp_mensajes
    WHERE is_read = FALSE AND from_me = FALSE
    GROUP BY phone_number
)
SELECT 
    u.phone_number,
    COALESCE(c.razon_social, m.contact_name, '+' || u.phone_number) AS contact_name,
    c.id AS cliente_id,
    c.ruc AS cliente_ruc,
    c.razon_social AS cliente_razon_social,
    u.ultimo_mensaje,
    u.ultimo_timestamp,
    u.ultimo_from_me,
    u.ultimo_status,
    COALESCE(nl.mensajes_no_leidos, 0) AS mensajes_no_leidos
FROM UltimosMensajes u
LEFT JOIN ConteoNoLeidos nl ON u.phone_number = nl.phone_number
LEFT JOIN (
    SELECT DISTINCT ON (phone_number) phone_number, cliente_id, contact_name 
    FROM whatsapp_mensajes 
    ORDER BY phone_number, id DESC
) m ON u.phone_number = m.phone_number
LEFT JOIN clientes c ON m.cliente_id = c.id
WHERE u.rn = 1
ORDER BY u.ultimo_timestamp DESC;

-- ============================================================================
-- 4. POBLACIÓN CON DATOS INICIALES (SEED DATA)
-- ============================================================================

TRUNCATE TABLE whatsapp_mensajes, buzon_sol_mensajes, correos_recibidos, 
               historial_auditoria, notificaciones, documentos_sustento, 
               transacciones, clientes, usuarios RESTART IDENTITY CASCADE;

-- Usuarios
INSERT INTO usuarios (id, nombre, email, password_hash, rol, ruc, empresa_nombre, telefono, activo)
VALUES 
(1, 'CPCC. Pedro Lozano Gasco', 'contador@contatask.pe', '$2b$10$xBCxqbnmUkSfma6tu/zm3OKXnfXbuT9LGxm.8fdEk91O2wJfye36i', 'CONTADOR', '10423456789', 'Estudio Contable Lozano & Asociados', '987112233', TRUE),
(2, 'Carlos Mendoza (Textiles Lima)', 'contacto@textileslima.com', '$2b$10$xBCxqbnmUkSfma6tu/zm3OKXnfXbuT9LGxm.8fdEk91O2wJfye36i', 'CLIENTE', '20512345671', 'Textiles Lima S.A.C.', '987654321', TRUE),
(3, 'Rosa Huamán (Ferretería El Norte)', 'ventas@ferreteriaelnorte.pe', '$2b$10$xBCxqbnmUkSfma6tu/zm3OKXnfXbuT9LGxm.8fdEk91O2wJfye36i', 'CLIENTE', '20608765432', 'Comercial El Norte E.I.R.L.', '998877665', TRUE),
(4, 'Marcos Salazar (Colegio María)', 'administracion@colegiomaria.edu.pe', '$2b$10$xBCxqbnmUkSfma6tu/zm3OKXnfXbuT9LGxm.8fdEk91O2wJfye36i', 'CLIENTE', '20491238475', 'Servicios Educativos María S.A.C.', '912345678', TRUE)
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

SELECT setval('usuarios_id_seq', (SELECT MAX(id) FROM usuarios));

-- Clientes
INSERT INTO clientes (
    id, ruc, razon_social, nombre_comercial, regimen_tributario, contacto_nombre, 
    email, celular, direccion, usuario_sol, clave_sol, sunat_estado_conexion, 
    sunat_token_expires_at, sunat_ultimo_acceso
) VALUES 
(1, '20512345671', 'Textiles Lima S.A.C.', 'Textiles Lima Confecciones', 'MYPE Tributario', 'Carlos Mendoza Quispe', 'contacto@textileslima.com', '987654321', 'Jr. Gamarra 1024, La Victoria, Lima', 'MODDATOS', 'moddatos', 'CONECTADO', CURRENT_TIMESTAMP + INTERVAL '1 hour', CURRENT_TIMESTAMP),
(2, '20608765432', 'Comercial El Norte E.I.R.L.', 'Ferretería El Norte', 'Régimen Especial', 'Rosa Huamán Torres', 'ventas@ferreteriaelnorte.pe', '998877665', 'Av. Túpac Amaru 345, Comas, Lima', 'ADMIN01', 'norte2026', 'CONECTADO', CURRENT_TIMESTAMP + INTERVAL '1 hour', CURRENT_TIMESTAMP),
(3, '20491238475', 'Servicios Educativos María S.A.C.', 'Colegio María Auxiliadora', 'Régimen General', 'Marcos Salazar Rios', 'administracion@colegiomaria.edu.pe', '912345678', 'Calle Los Jazmines 520, San Borja, Lima', 'MARIAEDU', 'colegio2026', 'PENDIENTE_VALIDACION', NULL, NULL),
(4, '20719283741', 'GastroPerú Sabores S.R.L.', 'Restaurante Sabores Criollos', 'MYPE Tributario', 'Lucía Fernández Paredes', 'administracion@gastroperu.pe', '945678123', 'Av. Angamos Este 1890, Surquillo, Lima', NULL, NULL, 'NO_CONFIGURADO', NULL, NULL)
ON CONFLICT (id) DO UPDATE SET ruc = EXCLUDED.ruc;

SELECT setval('clientes_id_seq', (SELECT MAX(id) FROM clientes));

-- Transacciones
INSERT INTO transacciones (
    id, cliente_id, periodo, tipo_operacion, comprobante_tipo, numero_comprobante, 
    emisor_ruc, emisor_razon_social, fecha_emision, moneda, monto_total, monto_igv, 
    requiere_bancarizacion, estado_sustento, observaciones
) VALUES 
(1, 1, '2026-08', 'COMPRA', 'FACTURA', 'F001-0004523', '20100012345', 'Hilanderías Andinas S.A.', '2026-08-12', 'PEN', 4850.00, 739.83, TRUE, 'INFORMACION_INCOMPLETA', 'Excede S/ 2,000: Requiere voucher bancario o cheque no negociable (Ley 30730)'),
(2, 1, '2026-08', 'SERVICIO', 'RECIBO_HONORARIOS', 'E001-45', '10234567891', 'Ing. Javier Castro Solís', '2026-08-15', 'PEN', 1200.00, 0.00, FALSE, 'SUSTENTO_RECIBIDO', 'Mantenimiento de máquinas de coser industriales'),
(3, 1, '2026-08', 'GASTO_BANCARIZADO', 'RECIBO_LUZ_AGUA', 'S001-9872', '20257891234', 'Enel Distribución Perú S.A.A.', '2026-08-20', 'PEN', 890.50, 135.84, FALSE, 'VALIDADO', 'Comprobante y constancia de débito conforme'),
(4, 2, '2026-08', 'COMPRA', 'FACTURA', 'F105-0012908', '20100155667', 'Aceros Arequipa S.A.', '2026-08-05', 'PEN', 9400.00, 1433.90, TRUE, 'INFORMACION_INCOMPLETA', 'Bancarización obligatoria: Urgente comprobante de transferencia BCP'),
(5, 2, '2026-08', 'COMPRA', 'TICKET_YAPE', 'YAPE-88231', '10456789012', 'Ferretería San Pedro', '2026-08-10', 'PEN', 350.00, 0.00, FALSE, 'RECHAZADO', 'Captura de pantalla recortada e ilegible. Reenviar constancia completa con número de operación.'),
(6, 3, '2026-08', 'COMPRA', 'FACTURA', 'F002-88741', '20334455667', 'Distribuidora Escolar del Perú', '2026-08-18', 'PEN', 3150.00, 480.51, TRUE, 'SUSTENTO_RECIBIDO', 'Adquisición de carpetas y útiles escolares')
ON CONFLICT (id) DO UPDATE SET monto_total = EXCLUDED.monto_total;

SELECT setval('transacciones_id_seq', (SELECT MAX(id) FROM transacciones));

-- Historial de Auditoría
INSERT INTO historial_auditoria (transaccion_id, usuario_id, accion, estado_anterior, estado_nuevo, motivo, created_at)
VALUES 
(3, 1, 'EVALUACION_APROBAR', 'SUSTENTO_RECIBIDO', 'VALIDADO', 'Revisión técnica conforme del comprobante de débito automático Enel.', CURRENT_TIMESTAMP - INTERVAL '2 days'),
(5, 1, 'EVALUACION_RECHAZAR', 'SUSTENTO_RECIBIDO', 'RECHAZADO', 'Comprobante Yape incompleto. No se visualiza número de operación ni fecha clara.', CURRENT_TIMESTAMP - INTERVAL '1 day');

-- Notificaciones
INSERT INTO notificaciones (cliente_id, transaccion_id, canal, destinatario, asunto, mensaje, estado)
VALUES 
(1, 1, 'WHATSAPP', '51987654321', 'Solicitud de sustento bancario', 'Recordatorio de sustento para Factura F001-0004523 por S/ 4,850.00 (Hilanderías Andinas S.A.)', 'ENVIADO'),
(2, 4, 'EMAIL', 'ventas@ferreteriaelnorte.pe', 'Urgente: Sustento de Bancarización Pendiente', 'Estimada Rosa Huamán, se requiere voucher bancario de S/ 9,400.00 por compra de Aceros Arequipa.', 'ENVIADO');

-- Buzón Electrónico SUNAT
INSERT INTO buzon_sol_mensajes (
    cliente_id, cliente_ruc, numero_notificacion, categoria_buzon, tipo_documento, 
    asunto, mensaje, fecha_deposito, estado, plazo_dias, fecha_vencimiento_plazo, requiere_respuesta
) VALUES 
(1, '20512345671', 'NOTIF-2026-SUNAT-004812', 'NOTIFICACION', 'CARTA_INDUCTIVA', 
 'Carta Inductiva N° 2026-004812: Inconsistencias en Débito Fiscal IGV Periodo Julio', 
 'Se comunica que la Administración Tributaria ha detectado discrepancias entre las ventas declaradas en el Formulario Virtual 621 y los comprobantes electrónicos emitidos en el SEE.', 
 CURRENT_TIMESTAMP - INTERVAL '1 day', 'URGENTE', 10, '2026-10-10', TRUE),

(1, '20512345671', 'AVISO-2026-SUNAT-998231', 'MENSAJE', 'AVISO_VENCIMIENTO', 
 'Recordatorio de Vencimiento de Declaración Mensual - Periodo Agosto 2026', 
 'Estimado contribuyente, de acuerdo con el último dígito de su RUC (1), la fecha de vencimiento para la presentación de su DJ mensual opera en los próximos días.', 
 CURRENT_TIMESTAMP - INTERVAL '3 days', 'LEIDO', NULL, NULL, FALSE),

(2, '20608765432', 'NOTIF-2026-SUNAT-009182', 'NOTIFICACION', 'ORDEN_PAGO', 
 'Orden de Pago N° 011-001-0049281 por Cuota de Fraccionamiento Tributario Art. 36', 
 'Se notifica Orden de Pago correspondiente a la cuota vencida de fraccionamiento tributario según Ley de Fortalecimiento MYPE.', 
 CURRENT_TIMESTAMP - INTERVAL '2 days', 'NO_LEIDO', 7, '2026-10-06', TRUE);

-- WhatsApp Mensajes
INSERT INTO whatsapp_mensajes (
    phone_number, contact_name, cliente_id, cliente_ruc, from_me, message_text, 
    status, is_read, timestamp
) VALUES 
('51987654321', 'Textiles Lima S.A.C.', 1, '20512345671', TRUE, 
 'Estimado Carlos, le recordamos que según su dígito de RUC, el vencimiento de su declaración mensual se aproxima. Por favor enviar facturas de compras pendientes.', 
 'READ', TRUE, CURRENT_TIMESTAMP - INTERVAL '2 hours'),

('51987654321', 'Textiles Lima S.A.C.', 1, '20512345671', FALSE, 
 'Buenas tardes contador Pedro, recibido. Ya le transferí el archivo zip con los comprobantes y vouchers bancarios al portal.', 
 'READ', TRUE, CURRENT_TIMESTAMP - INTERVAL '1 hour 45 minutes'),

('51987654321', 'Textiles Lima S.A.C.', 1, '20512345671', TRUE, 
 'Excelente, procedemos a realizar la liquidación de impuestos y validación ante SUNAT.', 
 'DELIVERED', TRUE, CURRENT_TIMESTAMP - INTERVAL '1 hour 30 minutes'),

('51998877665', 'Comercial El Norte E.I.R.L.', 2, '20608765432', TRUE, 
 'Hola Rosa, por favor confirmar el envío del voucher bancario por la compra de Aceros Arequipa de S/ 9,400.00.', 
 'DELIVERED', TRUE, CURRENT_TIMESTAMP - INTERVAL '4 hours');

-- Confirmación final
SELECT 
    'Base de datos PostgreSQL configurada y poblada exitosamente' AS estado,
    current_database() AS base_de_datos,
    (SELECT COUNT(*) FROM usuarios) AS usuarios_creados,
    (SELECT COUNT(*) FROM clientes) AS clientes_creados,
    (SELECT COUNT(*) FROM transacciones) AS transacciones_creadas,
    (SELECT COUNT(*) FROM buzon_sol_mensajes) AS avisos_sunat,
    (SELECT COUNT(*) FROM whatsapp_mensajes) AS chats_whatsapp;
