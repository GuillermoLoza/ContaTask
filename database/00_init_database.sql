-- ============================================================================
-- SCRIPT 00: INICIALIZACIÓN DE LA BASE DE DATOS CONTATASK
-- Motor: PostgreSQL 14+ (Compatible con PostgreSQL 18.x)
-- Conexión inicial recomendada: database 'postgres', usuario 'postgres'
-- ============================================================================

-- 1. Crear base de datos contatask_db si no existe
SELECT 'CREATE DATABASE contatask_db WITH OWNER = postgres ENCODING = ''UTF8'' TEMPLATE = template1'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'contatask_db')\gexec

-- 2. Conectarse a la base de datos (para clientes interactivos como psql)
\c contatask_db

-- 3. Habilitar extensiones requeridas para generación de UUIDs y funciones criptográficas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Confirmar inicialización
SELECT current_database() AS base_de_datos, current_user AS usuario_actual, version() AS version_postgresql;
