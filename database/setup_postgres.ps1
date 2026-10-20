<#
.SYNOPSIS
    Script de configuración de PostgreSQL para ContaTask.
.DESCRIPTION
    Crea la base de datos contatask_db, ejecuta las migraciones DDL, triggers, vistas y datos semilla.
.PARAMETER Host
    Servidor PostgreSQL (Predeterminado: localhost)
.PARAMETER Port
    Puerto PostgreSQL (Predeterminado: 5432)
.PARAMETER User
    Usuario de PostgreSQL (Predeterminado: postgres)
.PARAMETER Password
    Contraseña de PostgreSQL (Predeterminado: postgres)
#>

param (
    [string]$HostName = "localhost",
    [int]$Port = 5432,
    [string]$User = "postgres",
    [string]$Password = "postgres"
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "🐘 CONTATASK - INICIALIZADOR DE BASE DE DATOS POSTGRESQL" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "📍 Host:   $HostName:$Port"
Write-Host "👤 User:   $User"
Write-Host "🎯 DB:     contatask_db"
Write-Host "------------------------------------------------------------"

$env:DB_HOST = $HostName
$env:DB_PORT = $Port
$env:DB_USER = $User
$env:DB_PASSWORD = $Password
$env:DB_NAME = "contatask_db"

$setupJs = Join-Path $scriptDir "setup_postgres.js"

if (Test-Path $setupJs) {
    node $setupJs
} else {
    Write-Host "❌ No se encontró $setupJs" -ForegroundColor Red
}
