import bcrypt from 'bcryptjs';
import { db, initDatabase } from '../config/database.js';
import { SunatService } from '../services/sunat.service.js';

console.log('🌱 Inicializando datos semilla (Seed) en ContaTask con Knex.js...');

await initDatabase();

// Limpiar tablas para un seed limpio en PostgreSQL
const tablesToClean = [
  'whatsapp_mensajes',
  'buzon_sol_mensajes',
  'correos_recibidos',
  'historial_auditoria',
  'notificaciones',
  'documentos_sustento',
  'transacciones',
  'clientes',
  'usuarios'
];

for (const table of tablesToClean) {
  if (await db.schema.hasTable(table)) {
    await db.raw(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`);
  }
}

const passwordHash = bcrypt.hashSync('password123', 10);

// Helper para extraer ID generado en PostgreSQL
function getId(res) {
  const id = Array.isArray(res) ? res[0] : res;
  return typeof id === 'object' && id !== null ? id.id : id;
}

// 1. Usuarios demo
const contadorId = getId(await db('usuarios').insert({
  nombre: 'CPCC. Pedro Lozano Gasco',
  email: 'contador@contatask.pe',
  password_hash: passwordHash,
  rol: 'CONTADOR',
  ruc: '10423456789',
  empresa_nombre: 'Estudio Contable Lozano & Asociados',
  telefono: '987112233'
}).returning('id'));

const cliente1UserId = getId(await db('usuarios').insert({
  nombre: 'Carlos Mendoza (Textiles Lima)',
  email: 'contacto@textileslima.com',
  password_hash: passwordHash,
  rol: 'CLIENTE',
  ruc: '20512345671',
  empresa_nombre: 'Textiles Lima S.A.C.',
  telefono: '987654321'
}).returning('id'));

const cliente2UserId = getId(await db('usuarios').insert({
  nombre: 'Rosa Huamán (Ferretería El Norte)',
  email: 'ventas@ferreteriaelnorte.pe',
  password_hash: passwordHash,
  rol: 'CLIENTE',
  ruc: '20608765432',
  empresa_nombre: 'Comercial El Norte E.I.R.L.',
  telefono: '998877665'
}).returning('id'));

const cliente3UserId = getId(await db('usuarios').insert({
  nombre: 'Marcos Salazar (Colegio María Auxiliadora)',
  email: 'administracion@colegiomaria.edu.pe',
  password_hash: passwordHash,
  rol: 'CLIENTE',
  ruc: '20491238475',
  empresa_nombre: 'Servicios Educativos María S.A.C.',
  telefono: '912345678'
}).returning('id'));

// 2. Clientes (MYPEs)
const cliente1Id = getId(await db('clientes').insert({
  ruc: '20512345671',
  razon_social: 'Textiles Lima S.A.C.',
  nombre_comercial: 'Textiles Lima Confecciones',
  regimen_tributario: 'MYPE Tributario',
  contacto_nombre: 'Carlos Mendoza Quispe',
  email: 'contacto@textileslima.com',
  celular: '987654321',
  direccion: 'Jr. Gamarra 1024, La Victoria, Lima',
  usuario_sol: 'MODDATOS',
  clave_sol: 'moddatos',
  sunat_estado_conexion: 'CONECTADO',
  sunat_token_expires_at: new Date(Date.now() + 3600 * 1000),
  sunat_ultimo_acceso: new Date()
}).returning('id'));

const cliente2Id = getId(await db('clientes').insert({
  ruc: '20608765432',
  razon_social: 'Comercial El Norte E.I.R.L.',
  nombre_comercial: 'Ferretería El Norte',
  regimen_tributario: 'Régimen Especial',
  contacto_nombre: 'Rosa Huamán Torres',
  email: 'ventas@ferreteriaelnorte.pe',
  celular: '998877665',
  direccion: 'Av. Túpac Amaru 345, Comas, Lima',
  usuario_sol: 'ADMIN01',
  clave_sol: 'norte2026',
  sunat_estado_conexion: 'CONECTADO',
  sunat_token_expires_at: new Date(Date.now() + 3600 * 1000),
  sunat_ultimo_acceso: new Date()
}).returning('id'));

const cliente3Id = getId(await db('clientes').insert({
  ruc: '20491238475',
  razon_social: 'Servicios Educativos María S.A.C.',
  nombre_comercial: 'Colegio María Auxiliadora',
  regimen_tributario: 'Régimen General',
  contacto_nombre: 'Marcos Salazar Rios',
  email: 'administracion@colegiomaria.edu.pe',
  celular: '912345678',
  direccion: 'Calle Los Jazmines 520, San Borja, Lima',
  usuario_sol: 'MARIAEDU',
  clave_sol: 'colegio2026',
  sunat_estado_conexion: 'PENDIENTE_VALIDACION'
}).returning('id'));

const cliente4Id = getId(await db('clientes').insert({
  ruc: '20719283741',
  razon_social: 'GastroPerú Sabores S.R.L.',
  nombre_comercial: 'Restaurante Sabores Criollos',
  regimen_tributario: 'MYPE Tributario',
  contacto_nombre: 'Lucía Fernández Paredes',
  email: 'administracion@gastroperu.pe',
  celular: '945678123',
  direccion: 'Av. Angamos Este 1890, Surquillo, Lima',
  usuario_sol: null,
  clave_sol: null,
  sunat_estado_conexion: 'NO_CONFIGURADO'
}).returning('id'));

// 3. Transacciones con aplicación de Bancarización (Ley N° 30730: >= S/ 2000 o $500)
const trx1 = getId(await db('transacciones').insert({
  cliente_id: cliente1Id,
  periodo: '2026-08',
  tipo_operacion: 'COMPRA',
  comprobante_tipo: 'FACTURA',
  numero_comprobante: 'F001-0004523',
  emisor_ruc: '20100012345',
  emisor_razon_social: 'Hilanderías Andinas S.A.',
  fecha_emision: '2026-08-12',
  moneda: 'PEN',
  monto_total: 4850.00,
  monto_igv: 739.83,
  requiere_bancarizacion: 1,
  estado_sustento: 'INFORMACION_INCOMPLETA',
  observaciones: 'Excede S/ 2,000: Requiere voucher bancario o cheque no negociable (Ley 30730)'
}).returning('id'));

const trx2 = getId(await db('transacciones').insert({
  cliente_id: cliente1Id,
  periodo: '2026-08',
  tipo_operacion: 'SERVICIO',
  comprobante_tipo: 'RECIBO_HONORARIOS',
  numero_comprobante: 'E001-45',
  emisor_ruc: '10234567891',
  emisor_razon_social: 'Ing. Javier Castro Solís',
  fecha_emision: '2026-08-15',
  moneda: 'PEN',
  monto_total: 1200.00,
  monto_igv: 0,
  requiere_bancarizacion: 0,
  estado_sustento: 'SUSTENTO_RECIBIDO',
  observaciones: 'Mantenimiento de máquinas de coser industriales'
}).returning('id'));

const trx3 = getId(await db('transacciones').insert({
  cliente_id: cliente1Id,
  periodo: '2026-08',
  tipo_operacion: 'GASTO_BANCARIZADO',
  comprobante_tipo: 'RECIBO_LUZ_AGUA',
  numero_comprobante: 'S001-9872',
  emisor_ruc: '20257891234',
  emisor_razon_social: 'Enel Distribución Perú S.A.A.',
  fecha_emision: '2026-08-20',
  moneda: 'PEN',
  monto_total: 890.50,
  monto_igv: 135.84,
  requiere_bancarizacion: 0,
  estado_sustento: 'VALIDADO',
  observaciones: 'Comprobante y constancia de débito conforme'
}).returning('id'));

// Transacciones Comercial El Norte
const trx4 = getId(await db('transacciones').insert({
  cliente_id: cliente2Id,
  periodo: '2026-08',
  tipo_operacion: 'COMPRA',
  comprobante_tipo: 'FACTURA',
  numero_comprobante: 'F105-0012908',
  emisor_ruc: '20100155667',
  emisor_razon_social: 'Aceros Arequipa S.A.',
  fecha_emision: '2026-08-05',
  moneda: 'PEN',
  monto_total: 9400.00,
  monto_igv: 1433.90,
  requiere_bancarizacion: 1,
  estado_sustento: 'INFORMACION_INCOMPLETA',
  observaciones: 'Bancarización obligatoria: Urgente comprobante de transferencia BCP'
}).returning('id'));

const trx5 = getId(await db('transacciones').insert({
  cliente_id: cliente2Id,
  periodo: '2026-08',
  tipo_operacion: 'COMPRA',
  comprobante_tipo: 'TICKET_YAPE',
  numero_comprobante: 'YAPE-88231',
  emisor_ruc: '10456789012',
  emisor_razon_social: 'Ferretería San Pedro',
  fecha_emision: '2026-08-10',
  moneda: 'PEN',
  monto_total: 350.00,
  monto_igv: 0,
  requiere_bancarizacion: 0,
  estado_sustento: 'RECHAZADO',
  observaciones: 'Captura de pantalla recortada e ilegible. Reenviar constancia completa con número de operación.'
}).returning('id'));

// Transacciones Colegio María Auxiliadora
const trx6 = getId(await db('transacciones').insert({
  cliente_id: cliente3Id,
  periodo: '2026-08',
  tipo_operacion: 'COMPRA',
  comprobante_tipo: 'FACTURA',
  numero_comprobante: 'F002-88741',
  emisor_ruc: '20334455667',
  emisor_razon_social: 'Distribuidora Escolar del Perú',
  fecha_emision: '2026-08-18',
  moneda: 'PEN',
  monto_total: 3150.00,
  monto_igv: 480.51,
  requiere_bancarizacion: 1,
  estado_sustento: 'SUSTENTO_RECIBIDO',
  observaciones: 'Adquisición de carpetas y útiles escolares'
}).returning('id'));

// 4. Historial de Auditoría inicial
await db('historial_auditoria').insert([
  {
    transaccion_id: trx3,
    usuario_id: contadorId,
    accion: 'EVALUACION_APROBAR',
    estado_anterior: 'SUSTENTO_RECIBIDO',
    estado_nuevo: 'VALIDADO',
    motivo: 'Revisión técnica conforme.'
  },
  {
    transaccion_id: trx5,
    usuario_id: contadorId,
    accion: 'EVALUACION_RECHAZAR',
    estado_anterior: 'SUSTENTO_RECIBIDO',
    estado_nuevo: 'RECHAZADO',
    motivo: 'Captura recortada e ilegible.'
  }
]);

// 5. Notificación inicial demostrativa
await db('notificaciones').insert({
  cliente_id: cliente1Id,
  transaccion_id: trx1,
  canal: 'WHATSAPP',
  destinatario: '987654321',
  asunto: 'Solicitud de sustento',
  mensaje: 'Recordatorio de sustento para Factura F001-0004523 por S/ 4,850.00',
  estado: 'ENVIADO',
  error_log: null
});

// 6. Notificaciones iniciales de Buzón SOL de SUNAT
await SunatService.asegurarNotificacionesInicialesBuzon({
  id: cliente1Id,
  ruc: '20512345671',
  razon_social: 'Textiles Lima S.A.C.'
});

await SunatService.asegurarNotificacionesInicialesBuzon({
  id: cliente2Id,
  ruc: '20608765432',
  razon_social: 'Comercial El Norte E.I.R.L.'
});

console.log('✅ Seed completado con éxito con Knex.js.');
console.log('📊 Cuentas demo creadas:');
console.log('   - Contador: contador@contatask.pe / password123');
console.log('   - Cliente 1 (Textiles Lima): contacto@textileslima.com / password123 (RUC 20512345671)');
console.log('   - Cliente 2 (El Norte): ventas@ferreteriaelnorte.pe / password123 (RUC 20608765432)');
console.log('   - Cliente 3 (Colegio): administracion@colegiomaria.edu.pe / password123 (RUC 20491238475)');

process.exit(0);
