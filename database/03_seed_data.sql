-- ============================================================================
-- SCRIPT 03: DATOS SEMILLA (SEED DATA) DEMOSTRATIVOS
-- Base de Datos: contatask_db
-- Motor: PostgreSQL 14+
-- Contraseña unificada para usuarios demo: 'password123'
-- ============================================================================

-- Limpiar tablas en orden inverso de dependencias para permitir re-ejecución idempotente
TRUNCATE TABLE whatsapp_mensajes, buzon_sol_mensajes, correos_recibidos, 
               historial_auditoria, notificaciones, documentos_sustento, 
               transacciones, clientes, usuarios RESTART IDENTITY CASCADE;

-- ----------------------------------------------------------------------------
-- 1. POBLAR: usuarios (Contadores y Clientes del Portal)
-- Hash de contraseña pre-calculado con bcrypt para 'password123':
-- $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
-- ----------------------------------------------------------------------------
INSERT INTO usuarios (id, nombre, email, password_hash, rol, ruc, empresa_nombre, telefono, activo)
VALUES 
(1, 'CPCC. Pedro Lozano Gasco', 'contador@contatask.pe', '$2b$10$xBCxqbnmUkSfma6tu/zm3OKXnfXbuT9LGxm.8fdEk91O2wJfye36i', 'CONTADOR', '10423456789', 'Estudio Contable Lozano & Asociados', '987112233', TRUE),
(2, 'Carlos Mendoza (Textiles Lima)', 'contacto@textileslima.com', '$2b$10$xBCxqbnmUkSfma6tu/zm3OKXnfXbuT9LGxm.8fdEk91O2wJfye36i', 'CLIENTE', '20512345671', 'Textiles Lima S.A.C.', '987654321', TRUE),
(3, 'Rosa Huamán (Ferretería El Norte)', 'ventas@ferreteriaelnorte.pe', '$2b$10$xBCxqbnmUkSfma6tu/zm3OKXnfXbuT9LGxm.8fdEk91O2wJfye36i', 'CLIENTE', '20608765432', 'Comercial El Norte E.I.R.L.', '998877665', TRUE),
(4, 'Marcos Salazar (Colegio María)', 'administracion@colegiomaria.edu.pe', '$2b$10$xBCxqbnmUkSfma6tu/zm3OKXnfXbuT9LGxm.8fdEk91O2wJfye36i', 'CLIENTE', '20491238475', 'Servicios Educativos María S.A.C.', '912345678', TRUE)
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

SELECT setval('usuarios_id_seq', (SELECT MAX(id) FROM usuarios));

-- ----------------------------------------------------------------------------
-- 2. POBLAR: clientes (Directorio MYPE con credenciales SOL configuradas)
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 3. POBLAR: transacciones (Aplicación estricta de Bancarización Ley N° 30730)
-- ----------------------------------------------------------------------------
INSERT INTO transacciones (
    id, cliente_id, periodo, tipo_operacion, comprobante_tipo, numero_comprobante, 
    emisor_ruc, emisor_razon_social, fecha_emision, moneda, monto_total, monto_igv, 
    requiere_bancarizacion, estado_sustento, observaciones
) VALUES 
-- Textiles Lima S.A.C.
(1, 1, '2026-08', 'COMPRA', 'FACTURA', 'F001-0004523', '20100012345', 'Hilanderías Andinas S.A.', '2026-08-12', 'PEN', 4850.00, 739.83, TRUE, 'INFORMACION_INCOMPLETA', 'Excede S/ 2,000: Requiere voucher bancario o cheque no negociable (Ley 30730)'),
(2, 1, '2026-08', 'SERVICIO', 'RECIBO_HONORARIOS', 'E001-45', '10234567891', 'Ing. Javier Castro Solís', '2026-08-15', 'PEN', 1200.00, 0.00, FALSE, 'SUSTENTO_RECIBIDO', 'Mantenimiento de máquinas de coser industriales'),
(3, 1, '2026-08', 'GASTO_BANCARIZADO', 'RECIBO_LUZ_AGUA', 'S001-9872', '20257891234', 'Enel Distribución Perú S.A.A.', '2026-08-20', 'PEN', 890.50, 135.84, FALSE, 'VALIDADO', 'Comprobante y constancia de débito conforme'),

-- Comercial El Norte E.I.R.L.
(4, 2, '2026-08', 'COMPRA', 'FACTURA', 'F105-0012908', '20100155667', 'Aceros Arequipa S.A.', '2026-08-05', 'PEN', 9400.00, 1433.90, TRUE, 'INFORMACION_INCOMPLETA', 'Bancarización obligatoria: Urgente comprobante de transferencia BCP'),
(5, 2, '2026-08', 'COMPRA', 'TICKET_YAPE', 'YAPE-88231', '10456789012', 'Ferretería San Pedro', '2026-08-10', 'PEN', 350.00, 0.00, FALSE, 'RECHAZADO', 'Captura de pantalla recortada e ilegible. Reenviar constancia completa con número de operación.'),

-- Colegio María Auxiliadora
(6, 3, '2026-08', 'COMPRA', 'FACTURA', 'F002-88741', '20334455667', 'Distribuidora Escolar del Perú', '2026-08-18', 'PEN', 3150.00, 480.51, TRUE, 'SUSTENTO_RECIBIDO', 'Adquisición de carpetas y útiles escolares')
ON CONFLICT (id) DO UPDATE SET monto_total = EXCLUDED.monto_total;

SELECT setval('transacciones_id_seq', (SELECT MAX(id) FROM transacciones));

-- ----------------------------------------------------------------------------
-- 4. POBLAR: historial_auditoria (Trazabilidad de aprobaciones y rechazos)
-- ----------------------------------------------------------------------------
INSERT INTO historial_auditoria (transaccion_id, usuario_id, accion, estado_anterior, estado_nuevo, motivo, created_at)
VALUES 
(3, 1, 'EVALUACION_APROBAR', 'SUSTENTO_RECIBIDO', 'VALIDADO', 'Revisión técnica conforme del comprobante de débito automático Enel.', CURRENT_TIMESTAMP - INTERVAL '2 days'),
(5, 1, 'EVALUACION_RECHAZAR', 'SUSTENTO_RECIBIDO', 'RECHAZADO', 'Comprobante Yape incompleto. No se visualiza número de operación ni fecha clara.', CURRENT_TIMESTAMP - INTERVAL '1 day');

-- ----------------------------------------------------------------------------
-- 5. POBLAR: notificaciones (Registro histórico de despachos multicanal)
-- ----------------------------------------------------------------------------
INSERT INTO notificaciones (cliente_id, transaccion_id, canal, destinatario, asunto, mensaje, estado, error_log)
VALUES 
(1, 1, 'WHATSAPP', '51987654321', 'Solicitud de sustento bancario', 'Recordatorio de sustento para Factura F001-0004523 por S/ 4,850.00 (Hilanderías Andinas S.A.)', 'ENVIADO', NULL),
(2, 4, 'EMAIL', 'ventas@ferreteriaelnorte.pe', 'Urgente: Sustento de Bancarización Pendiente', 'Estimada Rosa Huamán, se requiere voucher bancario de S/ 9,400.00 por compra de Aceros Arequipa.', 'ENVIADO', NULL);

-- ----------------------------------------------------------------------------
-- 6. POBLAR: buzon_sol_mensajes (Buzón Electrónico SUNAT con datos oficiales)
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 7. POBLAR: whatsapp_mensajes (Historial inicial para el Chat en Tiempo Real)
-- ----------------------------------------------------------------------------
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

-- Resumen de inserción
SELECT '✅ Datos semilla cargados exitosamente en PostgreSQL.' AS resultado,
       (SELECT COUNT(*) FROM usuarios) AS total_usuarios,
       (SELECT COUNT(*) FROM clientes) AS total_clientes,
       (SELECT COUNT(*) FROM transacciones) AS total_transacciones,
       (SELECT COUNT(*) FROM buzon_sol_mensajes) AS total_notif_sunat,
       (SELECT COUNT(*) FROM whatsapp_mensajes) AS total_chats_whatsapp;
