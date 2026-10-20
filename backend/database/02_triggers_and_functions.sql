-- ============================================================================
-- SCRIPT 02: TRIGGERS, FUNCIONES Y VISTAS ANALÍTICAS
-- Base de Datos: contatask_db
-- Motor: PostgreSQL 14+
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. FUNCIÓN Y TRIGGERS: Actualización automática de updated_at
-- ----------------------------------------------------------------------------
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
FOR EACH ROW
EXECUTE FUNCTION actualizar_timestamp_updated_at();

DROP TRIGGER IF EXISTS trg_actualizar_clientes_updated_at ON clientes;
CREATE TRIGGER trg_actualizar_clientes_updated_at
BEFORE UPDATE ON clientes
FOR EACH ROW
EXECUTE FUNCTION actualizar_timestamp_updated_at();

DROP TRIGGER IF EXISTS trg_actualizar_transacciones_updated_at ON transacciones;
CREATE TRIGGER trg_actualizar_transacciones_updated_at
BEFORE UPDATE ON transacciones
FOR EACH ROW
EXECUTE FUNCTION actualizar_timestamp_updated_at();

-- ----------------------------------------------------------------------------
-- 2. FUNCIÓN: Auto-vinculación de cliente en WhatsApp por RUC o Celular
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auto_vincular_cliente_whatsapp()
RETURNS TRIGGER AS $$
DECLARE
    v_clean_phone VARCHAR(50);
    v_cliente_id INTEGER;
    v_cliente_ruc VARCHAR(11);
    v_contacto_nombre VARCHAR(150);
BEGIN
    -- Limpiar número telefónico
    v_clean_phone := regexp_replace(NEW.phone_number, '\D', '', 'g');

    -- Solo vincular si no viene cliente_id asignado
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
FOR EACH ROW
EXECUTE FUNCTION auto_vincular_cliente_whatsapp();

-- ----------------------------------------------------------------------------
-- 3. VISTA: Resumen Tributario y Cumplimiento MYPE (Ley N° 30730)
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 4. VISTA: Bandeja Activa de Conversaciones de WhatsApp
-- ----------------------------------------------------------------------------
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
