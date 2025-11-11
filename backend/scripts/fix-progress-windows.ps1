# =============================================================================
# Script de Reparación de Progreso para Windows PowerShell
# =============================================================================
# Este script ayuda a ejecutar los scripts SQL de auditoría y reparación
# en Windows PowerShell
#
# Uso:
#   1. Edita las variables de configuración abajo
#   2. Ejecuta: .\scripts\fix-progress-windows.ps1
# =============================================================================

# =============================================================================
# CONFIGURACIÓN - EDITA ESTOS VALORES
# =============================================================================

# Credenciales de PostgreSQL
$PG_USER = "postgres"  # Cambia por tu usuario de PostgreSQL
$PG_DATABASE = "ventilab_dev"  # Cambia por el nombre de tu base de datos
$PG_HOST = "localhost"  # Cambia si tu PostgreSQL está en otro host
$PG_PORT = "5432"  # Puerto por defecto de PostgreSQL

# ID del usuario afectado (opcional, para auditoría específica)
$USER_ID = ""  # Déjalo vacío para auditar todos los usuarios

# =============================================================================
# FUNCIONES AUXILIARES
# =============================================================================

function Get-Timestamp {
    return Get-Date -Format "yyyyMMdd_HHmmss"
}

function Test-PostgreSQLConnection {
    Write-Host "`n[INFO] Verificando conexión a PostgreSQL..." -ForegroundColor Cyan
    
    $env:PGPASSWORD = Read-Host "Contraseña para usuario $PG_USER" -AsSecureString | ConvertFrom-SecureString
    $testQuery = "SELECT version();"
    
    try {
        $result = psql -U $PG_USER -d $PG_DATABASE -h $PG_HOST -p $PG_PORT -c $testQuery 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] Conexión exitosa a PostgreSQL" -ForegroundColor Green
            return $true
        } else {
            Write-Host "[ERROR] No se pudo conectar a PostgreSQL" -ForegroundColor Red
            Write-Host $result -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "[ERROR] Error al conectar: $_" -ForegroundColor Red
        return $false
    }
}

function Backup-Database {
    Write-Host "`n[INFO] Creando backup de la base de datos..." -ForegroundColor Cyan
    
    # Determinar el directorio del script o usar el directorio actual
    $scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
    $backupDir = if ($scriptDir) { Split-Path -Parent $scriptDir } else { Get-Location }
    
    $timestamp = Get-Timestamp
    $backupFile = "backup_before_fix_$timestamp.sql"
    $backupPath = Join-Path $backupDir $backupFile
    
    # Asegurar que la ruta esté entre comillas para manejar espacios
    $backupPathQuoted = "`"$backupPath`""
    
    Write-Host "Archivo de backup: $backupPath" -ForegroundColor Yellow
    
    $password = Read-Host "Contraseña para usuario $PG_USER" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
    $plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    $env:PGPASSWORD = $plainPassword
    
    try {
        # Usar formato SQL plano (más compatible) en lugar de custom
        # Construir el comando como string para evitar problemas de parsing
        $dumpCommand = "pg_dump -U $PG_USER -d $PG_DATABASE -h $PG_HOST -p $PG_PORT -f $backupPathQuoted"
        
        Write-Host "[DEBUG] Ejecutando: $dumpCommand" -ForegroundColor Gray
        
        Invoke-Expression $dumpCommand
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] Backup creado exitosamente: $backupPath" -ForegroundColor Green
            Write-Host "[INFO] Tamaño del archivo: $((Get-Item $backupPath).Length / 1MB) MB" -ForegroundColor Gray
            return $true
        } else {
            Write-Host "[ERROR] Error al crear backup (código de salida: $LASTEXITCODE)" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "[ERROR] Error al crear backup: $_" -ForegroundColor Red
        Write-Host "[ERROR] Detalles: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    } finally {
        Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    }
}

function Run-AuditScript {
    Write-Host "`n[INFO] Ejecutando script de auditoría..." -ForegroundColor Cyan
    
    $auditScript = Join-Path $PSScriptRoot "audit-progress-orphans.sql"
    
    if (-not (Test-Path $auditScript)) {
        Write-Host "[ERROR] No se encontró el script: $auditScript" -ForegroundColor Red
        return $false
    }
    
    # Crear script temporal con el USER_ID reemplazado si se proporcionó
    $tempScript = Join-Path $env:TEMP "audit-progress-temp-$(Get-Timestamp).sql"
    
    if ($USER_ID) {
        (Get-Content $auditScript) -replace 'USER_ID_AQUI', $USER_ID | Set-Content $tempScript
        Write-Host "Auditando usuario específico: $USER_ID" -ForegroundColor Yellow
    } else {
        Copy-Item $auditScript $tempScript
        Write-Host "Auditando todos los usuarios" -ForegroundColor Yellow
    }
    
    $password = Read-Host "Contraseña para usuario $PG_USER" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
    $plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    $env:PGPASSWORD = $plainPassword
    
    try {
        psql -U $PG_USER -d $PG_DATABASE -h $PG_HOST -p $PG_PORT -f $tempScript
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] Auditoría completada" -ForegroundColor Green
            return $true
        } else {
            Write-Host "[ERROR] Error en la auditoría" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "[ERROR] Error al ejecutar auditoría: $_" -ForegroundColor Red
        return $false
    } finally {
        Remove-Item $tempScript -ErrorAction SilentlyContinue
        Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    }
}

function Run-FixScript {
    Write-Host "`n[INFO] Ejecutando script de reparación..." -ForegroundColor Cyan
    Write-Host "[ADVERTENCIA] Esto modificará la base de datos. ¿Continuar? (S/N)" -ForegroundColor Yellow
    
    $confirm = Read-Host
    if ($confirm -ne "S" -and $confirm -ne "s" -and $confirm -ne "Y" -and $confirm -ne "y") {
        Write-Host "[INFO] Operación cancelada" -ForegroundColor Yellow
        return $false
    }
    
    $fixScript = Join-Path $PSScriptRoot "fix-progress-orphans.sql"
    
    if (-not (Test-Path $fixScript)) {
        Write-Host "[ERROR] No se encontró el script: $fixScript" -ForegroundColor Red
        return $false
    }
    
    $password = Read-Host "Contraseña para usuario $PG_USER" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
    $plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    $env:PGPASSWORD = $plainPassword
    
    try {
        psql -U $PG_USER -d $PG_DATABASE -h $PG_HOST -p $PG_PORT -f $fixScript
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] Reparación completada" -ForegroundColor Green
            return $true
        } else {
            Write-Host "[ERROR] Error en la reparación" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "[ERROR] Error al ejecutar reparación: $_" -ForegroundColor Red
        return $false
    } finally {
        Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    }
}

# =============================================================================
# MENÚ PRINCIPAL
# =============================================================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Reparación de Progreso - VentyLab" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Configuración actual:" -ForegroundColor Yellow
Write-Host "  Usuario: $PG_USER"
Write-Host "  Base de datos: $PG_DATABASE"
Write-Host "  Host: $PG_HOST"
Write-Host "  Puerto: $PG_PORT"
if ($USER_ID) {
    Write-Host "  Usuario a auditar: $USER_ID"
} else {
    Write-Host "  Usuario a auditar: Todos"
}

Write-Host "`nOpciones:" -ForegroundColor Yellow
Write-Host "  1) Crear backup de la base de datos"
Write-Host "  2) Ejecutar auditoría (detectar problemas)"
Write-Host "  3) Ejecutar reparación (requiere backup primero)"
Write-Host "  4) Ejecutar todo (backup + auditoría + reparación)"
Write-Host "  5) Salir"

$option = Read-Host "`nSelecciona una opción (1-5)"

switch ($option) {
    "1" {
        Backup-Database
    }
    "2" {
        Run-AuditScript
    }
    "3" {
        Write-Host "`n[ADVERTENCIA] Asegúrate de haber creado un backup primero!" -ForegroundColor Red
        Run-FixScript
    }
    "4" {
        Write-Host "`n[INFO] Ejecutando proceso completo..." -ForegroundColor Cyan
        if (Backup-Database) {
            Start-Sleep -Seconds 2
            if (Run-AuditScript) {
                Start-Sleep -Seconds 2
                Run-FixScript
            }
        }
    }
    "5" {
        Write-Host "[INFO] Saliendo..." -ForegroundColor Yellow
        exit 0
    }
    default {
        Write-Host "[ERROR] Opción inválida" -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n[INFO] Proceso completado" -ForegroundColor Green

