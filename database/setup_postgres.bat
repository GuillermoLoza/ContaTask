@echo off
chcp 65001 > nul
title ContaTask - Inicializador de Base de Datos PostgreSQL

echo ============================================================
echo  🐘 CONTATASK - INICIALIZADOR DE BASE DE DATOS POSTGRESQL
echo ============================================================
echo.

set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%.."

echo [1/3] Verificando entorno de ejecucion...
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo    ✓ Node.js detectado en el sistema.
    echo.
    echo [2/3] Ejecutando configuracion automatizada con Node.js...
    node "%SCRIPT_DIR%setup_postgres.js"
    goto :fin
)

echo.
echo [2/3] Node.js no encontrado directamente en PATH. Probando con psql nativo...
set PSQL_BIN=""

if exist "C:\Program Files\PostgreSQL\18\bin\psql.exe" set PSQL_BIN="C:\Program Files\PostgreSQL\18\bin\psql.exe"
if exist "C:\Program Files\PostgreSQL\17\bin\psql.exe" set PSQL_BIN="C:\Program Files\PostgreSQL\17\bin\psql.exe"
if exist "C:\Program Files\PostgreSQL\16\bin\psql.exe" set PSQL_BIN="C:\Program Files\PostgreSQL\16\bin\psql.exe"
if exist "C:\Program Files\PostgreSQL\15\bin\psql.exe" set PSQL_BIN="C:\Program Files\PostgreSQL\15\bin\psql.exe"

if %PSQL_BIN%=="" (
    echo.
    echo ❌ No se encontro ni Node.js ni psql.exe en las rutas estandar.
    echo Por favor asegurese de tener Node.js o PostgreSQL instalado en su sistema.
    pause
    exit /b 1
)

echo    ✓ psql detectado en: %PSQL_BIN%
echo.
echo Configurando variables de conexion predeterminadas:
set PGHOST=localhost
set PGPORT=5432
set PGUSER=postgres
set PGPASSWORD=postgres

echo.
echo [3/3] Ejecutando script consolidado 04_full_setup.sql...
%PSQL_BIN% -h localhost -p 5432 -U postgres -d postgres -c "SELECT 'CREATE DATABASE contatask_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'contatask_db');"
%PSQL_BIN% -h localhost -p 5432 -U postgres -d contatask_db -f "%SCRIPT_DIR%04_full_setup.sql"

:fin
echo.
echo ============================================================
echo  Proceso completado. Presione cualquier tecla para salir.
echo ============================================================
pause > nul
