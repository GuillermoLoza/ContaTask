/**
 * ============================================================================
 * CONTATASK - SCRIPT AUTOMATIZADO DE CONFIGURACIÓN POSTGRESQL
 * Ejecuta la creación de base de datos, tablas, triggers y datos semilla.
 * 
 * Conexión predeterminada local:
 *   Host: localhost
 *   Puerto: 5432
 *   Usuario: postgres
 *   Contraseña: postgres
 *   Base de Datos: contatask_db
 * ============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Resolver módulo 'pg' local o desde backend/node_modules
let pg;
try {
  pg = await import('pg');
} catch {
  const backendPgPath = path.resolve(__dirname, '../backend/node_modules/pg/lib/index.js');
  if (fs.existsSync(backendPgPath)) {
    pg = await import(pathToFileURL(backendPgPath).href);
  } else {
    throw new Error("No se encontró el paquete 'pg'. Ejecute 'npm install' en la carpeta backend.");
  }
}

const { Client } = pg.default || pg;

// 1. Configuración de conexión (prioriza variables de entorno o valores predeterminados)
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
const DB_NAME = process.env.DB_NAME || 'contatask_db';

console.log('============================================================');
console.log('🐘 CONTATASK - INICIALIZADOR DE BASE DE DATOS POSTGRESQL');
console.log('============================================================');
console.log(`📍 Servidor:   ${DB_HOST}:${DB_PORT}`);
console.log(`👤 Usuario:    ${DB_USER}`);
console.log(`🎯 Base Datos: ${DB_NAME}`);
console.log('------------------------------------------------------------');

async function run() {
  // PASO 1: Conectar a la base de datos de mantenimiento 'postgres' para crear 'contatask_db'
  console.log(`🔌 [1/5] Conectando a PostgreSQL (mantenimiento: 'postgres')...`);
  const adminClient = new Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: 'postgres'
  });

  try {
    await adminClient.connect();
    console.log('   ✓ Conexión establecida con el servidor PostgreSQL local.');

    // Verificar si la base de datos contatask_db existe
    const checkDb = await adminClient.query(
      "SELECT 1 FROM pg_database WHERE datname = $1;",
      [DB_NAME]
    );

    if (checkDb.rows.length === 0) {
      console.log(`📦 [2/5] Creando base de datos '${DB_NAME}'...`);
      await adminClient.query(`CREATE DATABASE "${DB_NAME}" WITH OWNER = "${DB_USER}" ENCODING = 'UTF8';`);
      console.log(`   ✓ Base de datos '${DB_NAME}' creada con éxito.`);
    } else {
      console.log(`   ✓ La base de datos '${DB_NAME}' ya existe.`);
    }
  } catch (err) {
    console.error(`❌ Error conectando a PostgreSQL en ${DB_HOST}:${DB_PORT}:`, err.message);
    console.log('\n💡 Sugerencia: Verifique que el servicio de PostgreSQL esté iniciado y que la contraseña sea correcta.');
    process.exit(1);
  } finally {
    await adminClient.end();
  }

  // PASO 2: Conectar directamente a 'contatask_db'
  console.log(`🔌 [3/5] Conectando a '${DB_NAME}'...`);
  const dbClient = new Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME
  });

  try {
    await dbClient.connect();
    console.log(`   ✓ Conectado a '${DB_NAME}'.`);

    // Habilitar extensiones
    await dbClient.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    await dbClient.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

    // PASO 3: Ejecutar Script 01 - Tablas e Índices (DDL)
    console.log('🏗️  [4/5] Creando tablas e índices relacionales (01_create_tables.sql)...');
    const sqlTables = fs.readFileSync(path.join(__dirname, '01_create_tables.sql'), 'utf-8');
    await dbClient.query(sqlTables);
    console.log('   ✓ Tablas e índices creados correctamente.');

    // PASO 4: Ejecutar Script 02 - Triggers y Funciones
    console.log('⚡  [4/5] Creando triggers, funciones y vistas (02_triggers_and_functions.sql)...');
    const sqlTriggers = fs.readFileSync(path.join(__dirname, '02_triggers_and_functions.sql'), 'utf-8');
    await dbClient.query(sqlTriggers);
    console.log('   ✓ Triggers y vistas instalados correctamente.');

    // PASO 5: Ejecutar Script 03 - Datos Semilla (Seed)
    console.log('🌱 [5/5] Insertando datos semilla demostrativos (03_seed_data.sql)...');
    const sqlSeed = fs.readFileSync(path.join(__dirname, '03_seed_data.sql'), 'utf-8');
    await dbClient.query(sqlSeed);
    console.log('   ✓ Datos iniciales insertados con éxito.');

    // Validar tablas pobladas
    console.log('------------------------------------------------------------');
    console.log('📊 RESUMEN DE REGISTROS EN POSTGRESQL:');
    const stats = await dbClient.query(`
      SELECT 
        (SELECT COUNT(*) FROM usuarios) AS usuarios,
        (SELECT COUNT(*) FROM clientes) AS clientes,
        (SELECT COUNT(*) FROM transacciones) AS transacciones,
        (SELECT COUNT(*) FROM buzon_sol_mensajes) AS buzon_sol,
        (SELECT COUNT(*) FROM whatsapp_mensajes) AS chats_whatsapp;
    `);

    const r = stats.rows[0];
    console.log(`   👥 Usuarios creados:         ${r.usuarios}`);
    console.log(`   🏢 Clientes MYPE:            ${r.clientes}`);
    console.log(`   🧾 Transacciones (Ley 30730): ${r.transacciones}`);
    console.log(`   📬 Notificaciones Buzón SOL: ${r.buzon_sol}`);
    console.log(`   💬 Mensajes WhatsApp:        ${r.chats_whatsapp}`);
    console.log('------------------------------------------------------------');
    console.log('🎉 ¡BASE DE DATOS POSTGRESQL LISTA Y 100% OPERATIVA!');
    console.log('🔑 Credenciales demo:');
    console.log('   - Contador: contador@contatask.pe / password123');
    console.log('   - Cliente:  contacto@textileslima.com / password123');
    console.log('============================================================');
  } catch (err) {
    console.error('❌ Error ejecutando los scripts SQL:', err);
    process.exit(1);
  } finally {
    await dbClient.end();
  }
}

run();
