#!/usr/bin/env node

/**
 * =============================================================================
 * Authentication System Validation Script
 * =============================================================================
 * This script validates that all components of the VentyLab authentication
 * system are properly configured and ready for use.
 *
 * Run with: node scripts/validate-auth.js
 * Or add to package.json: "validate-auth": "node scripts/validate-auth.js"
 * =============================================================================
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Helper functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function logError(message) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
}

function logWarning(message) {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

function logInfo(message) {
  console.log(`${colors.blue}ℹ️  ${message}${colors.reset}`);
}

function logHeader(message) {
  console.log(`\n${colors.cyan}${colors.bright}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}${message}${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}${'='.repeat(80)}${colors.reset}\n`);
}

// Validation results
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
};

function checkExists(filePath, description) {
  results.total++;
  const fullPath = path.join(process.cwd(), filePath);

  if (fs.existsSync(fullPath)) {
    logSuccess(`${description}: ${filePath}`);
    results.passed++;
    return true;
  } else {
    logError(`${description} NO ENCONTRADO: ${filePath}`);
    results.failed++;
    return false;
  }
}

function checkEnvVar(varName, required = true) {
  results.total++;

  // Try to read .env.local
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    if (required) {
      logError(`Variable ${varName}: .env.local no existe`);
      results.failed++;
    } else {
      logWarning(`Variable ${varName}: .env.local no existe (opcional)`);
      results.warnings++;
    }
    return false;
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const regex = new RegExp(`^${varName}=(.+)$`, 'm');
  const match = envContent.match(regex);

  if (match && match[1] && match[1].trim() !== '') {
    const value = match[1].trim();
    // Don't show full value for secrets
    const maskedValue = varName.includes('SECRET') || varName.includes('PASSWORD')
      ? '***' + value.slice(-4)
      : value.length > 50
      ? value.slice(0, 47) + '...'
      : value;

    logSuccess(`Variable ${varName}: Configurada (${maskedValue})`);
    results.passed++;
    return true;
  } else {
    if (required) {
      logError(`Variable ${varName}: NO configurada en .env.local`);
      results.failed++;
    } else {
      logWarning(`Variable ${varName}: NO configurada (opcional)`);
      results.warnings++;
    }
    return false;
  }
}

function checkPackageJson() {
  results.total++;
  const pkgPath = path.join(process.cwd(), 'package.json');

  if (!fs.existsSync(pkgPath)) {
    logError('package.json no encontrado');
    results.failed++;
    return;
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const requiredDeps = {
    'next-auth': '^4.24.13',
    '@next-auth/prisma-adapter': '^1.0.7',
    '@prisma/client': '^6.18.0',
    'bcryptjs': '^3.0.2',
    'zod': '^3.25.76',
  };

  let allInstalled = true;

  for (const [dep, version] of Object.entries(requiredDeps)) {
    if (pkg.dependencies && pkg.dependencies[dep]) {
      logSuccess(`Dependencia ${dep}: ${pkg.dependencies[dep]}`);
    } else if (pkg.devDependencies && pkg.devDependencies[dep]) {
      logSuccess(`Dependencia ${dep}: ${pkg.devDependencies[dep]} (dev)`);
    } else {
      logError(`Dependencia ${dep}: NO INSTALADA (requerida: ${version})`);
      allInstalled = false;
    }
  }

  if (allInstalled) {
    results.passed++;
  } else {
    results.failed++;
  }
}

function checkPrismaSchema() {
  results.total++;
  const schemaPath = path.join(process.cwd(), '..', 'backend', 'prisma', 'schema.prisma');

  if (!fs.existsSync(schemaPath)) {
    logError('Schema de Prisma no encontrado en backend/prisma/schema.prisma');
    results.failed++;
    return;
  }

  const schemaContent = fs.readFileSync(schemaPath, 'utf8');

  // Check for required models
  const requiredModels = ['User', 'Account', 'Session', 'VerificationToken'];
  let allModelsExist = true;

  for (const model of requiredModels) {
    if (schemaContent.includes(`model ${model}`)) {
      logSuccess(`Modelo Prisma: ${model}`);
    } else {
      logError(`Modelo Prisma: ${model} NO ENCONTRADO`);
      allModelsExist = false;
    }
  }

  // Check for UserRole enum
  if (schemaContent.includes('enum UserRole')) {
    logSuccess('Enum UserRole: Configurado');
  } else {
    logError('Enum UserRole: NO ENCONTRADO');
    allModelsExist = false;
  }

  // Check provider
  if (schemaContent.includes('provider = "postgresql"')) {
    logSuccess('Database Provider: PostgreSQL');
  } else if (schemaContent.includes('provider = "sqlite"')) {
    logWarning('Database Provider: SQLite (se recomienda PostgreSQL para producción)');
    results.warnings++;
  } else {
    logError('Database Provider: NO IDENTIFICADO');
    allModelsExist = false;
  }

  if (allModelsExist) {
    results.passed++;
  } else {
    results.failed++;
  }
}

function checkGitignore() {
  results.total++;
  const gitignorePath = path.join(process.cwd(), '..', '.gitignore');

  if (!fs.existsSync(gitignorePath)) {
    logWarning('.gitignore no encontrado en la raíz del proyecto');
    results.warnings++;
    return;
  }

  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');

  if (gitignoreContent.includes('.env.local') || gitignoreContent.includes('.env*.local')) {
    logSuccess('.env.local está en .gitignore');
    results.passed++;
  } else {
    logError('.env.local NO está en .gitignore - RIESGO DE SEGURIDAD');
    results.failed++;
  }
}

// Main validation function
async function validateAuth() {
  log('\n╔════════════════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║                                                                            ║', 'cyan');
  log('║          VENTILAB AUTHENTICATION SYSTEM - VALIDATION SCRIPT               ║', 'cyan');
  log('║                                                                            ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════════════════════╝', 'cyan');

  // 1. Check Required Files
  logHeader('1. Verificando Archivos del Sistema de Autenticación');

  // API Routes
  checkExists('pages/api/auth/[...nextauth].js', 'NextAuth Config');
  checkExists('pages/api/auth/signup.js', 'Signup API');

  // Auth Pages
  checkExists('pages/auth/login.jsx', 'Login Page');
  checkExists('pages/auth/register.jsx', 'Register Page');
  checkExists('pages/auth/error.jsx', 'Error Page');
  checkExists('pages/auth/access-denied.jsx', 'Access Denied Page');

  // Components
  checkExists('src/components/auth/ProtectedRoute.jsx', 'ProtectedRoute Component');
  checkExists('src/components/common/UserProfileButton.jsx', 'UserProfileButton Component');

  // Hooks
  checkExists('src/hooks/useAuth.js', 'useAuth Hook');

  // Utils
  checkExists('src/utils/passwordValidator.js', 'Password Validator');
  checkExists('src/utils/serverAuth.js', 'Server Auth Utils');

  // Lib
  checkExists('src/lib/prisma.js', 'Prisma Client');
  checkExists('src/lib/auth-config.js', 'Auth Config');

  // Middleware
  checkExists('middleware.js', 'Next.js Middleware');

  // Config files
  checkExists('.env.example', '.env.example Template');
  checkExists('jsconfig.json', 'jsconfig.json (Path Aliases)');

  // 2. Check Environment Variables
  logHeader('2. Verificando Variables de Entorno (.env.local)');

  checkEnvVar('NEXTAUTH_URL', true);
  checkEnvVar('NEXTAUTH_SECRET', true);
  checkEnvVar('GOOGLE_CLIENT_ID', true);
  checkEnvVar('GOOGLE_CLIENT_SECRET', true);
  checkEnvVar('DATABASE_URL', true);
  checkEnvVar('NEXT_PUBLIC_API_KEY_GEMINI', false);

  // 3. Check Dependencies
  logHeader('3. Verificando Dependencias (package.json)');

  checkPackageJson();

  // 4. Check Prisma Schema
  logHeader('4. Verificando Schema de Prisma');

  checkPrismaSchema();

  // 5. Check Security
  logHeader('5. Verificando Configuración de Seguridad');

  checkGitignore();

  // Check for .env.local in git
  results.total++;
  const gitStatusPath = path.join(process.cwd(), '..', '.git');
  if (fs.existsSync(gitStatusPath)) {
    try {
      const { execSync } = require('child_process');
      const trackedFiles = execSync('git ls-files', { cwd: path.join(process.cwd(), '..') })
        .toString()
        .split('\n');

      if (trackedFiles.some(file => file.includes('.env.local'))) {
        logError('.env.local está siendo trackeado por Git - ELIMINAR INMEDIATAMENTE');
        logInfo('Ejecutar: git rm --cached frontend/.env.local && git commit -m "Remove .env.local"');
        results.failed++;
      } else {
        logSuccess('.env.local NO está en Git (correcto)');
        results.passed++;
      }
    } catch (error) {
      logWarning('No se pudo verificar Git status');
      results.warnings++;
    }
  } else {
    logInfo('Repositorio Git no detectado - saltando verificación');
  }

  // 6. Check _app.js Integration
  logHeader('6. Verificando Integración en _app.js');

  results.total++;
  const appPath = path.join(process.cwd(), 'pages', '_app.js');

  if (fs.existsSync(appPath)) {
    const appContent = fs.readFileSync(appPath, 'utf8');

    let appIntegrated = true;

    if (appContent.includes('SessionProvider')) {
      logSuccess('SessionProvider: Importado');
    } else {
      logError('SessionProvider: NO importado');
      appIntegrated = false;
    }

    if (appContent.includes('<SessionProvider')) {
      logSuccess('SessionProvider: Usado en JSX');
    } else {
      logError('SessionProvider: NO usado en JSX');
      appIntegrated = false;
    }

    if (appContent.includes('refetchInterval')) {
      logSuccess('refetchInterval: Configurado');
    } else {
      logWarning('refetchInterval: NO configurado (recomendado)');
      results.warnings++;
    }

    if (appIntegrated) {
      results.passed++;
    } else {
      results.failed++;
    }
  } else {
    logError('pages/_app.js no encontrado');
    results.failed++;
  }

  // 7. Additional Recommendations
  logHeader('7. Recomendaciones Adicionales');

  // Check for node_modules/.prisma/client
  const prismaClientPath = path.join(process.cwd(), 'node_modules', '.prisma', 'client');
  if (fs.existsSync(prismaClientPath)) {
    logSuccess('Prisma Client: Generado');
  } else {
    logWarning('Prisma Client: NO generado - Ejecutar: npx prisma generate');
    logInfo('Comando: cd frontend && npx prisma generate');
  }

  // Check for migrations
  const migrationsPath = path.join(process.cwd(), '..', 'backend', 'prisma', 'migrations');
  if (fs.existsSync(migrationsPath)) {
    const migrations = fs.readdirSync(migrationsPath);
    if (migrations.length > 0) {
      logSuccess(`Migraciones Prisma: ${migrations.length} encontrada(s)`);
    } else {
      logWarning('Migraciones Prisma: Carpeta existe pero está vacía');
      logInfo('Ejecutar: npx prisma migrate dev --name add_nextauth_models');
    }
  } else {
    logWarning('Migraciones Prisma: NO encontradas');
    logInfo('Ejecutar: npx prisma migrate dev --name add_nextauth_models');
  }

  // Final Results
  logHeader('Resultados de la Validación');

  const totalChecks = results.total;
  const passRate = ((results.passed / totalChecks) * 100).toFixed(1);

  console.log(`Total de Verificaciones: ${totalChecks}`);
  logSuccess(`Pasadas: ${results.passed}`);

  if (results.failed > 0) {
    logError(`Fallidas: ${results.failed}`);
  } else {
    log(`Fallidas: ${results.failed}`, 'green');
  }

  if (results.warnings > 0) {
    logWarning(`Advertencias: ${results.warnings}`);
  } else {
    log(`Advertencias: ${results.warnings}`, 'green');
  }

  console.log(`\nTasa de Éxito: ${passRate}%`);

  // Status Badge
  console.log('\n');
  if (results.failed === 0 && results.warnings === 0) {
    log('╔════════════════════════════════════════╗', 'green');
    log('║                                        ║', 'green');
    log('║   ✅ SISTEMA COMPLETAMENTE VALIDADO   ║', 'green');
    log('║                                        ║', 'green');
    log('╚════════════════════════════════════════╝', 'green');
  } else if (results.failed === 0) {
    log('╔════════════════════════════════════════╗', 'yellow');
    log('║                                        ║', 'yellow');
    log('║   ⚠️  SISTEMA VALIDADO CON WARNINGS   ║', 'yellow');
    log('║                                        ║', 'yellow');
    log('╚════════════════════════════════════════╝', 'yellow');
  } else {
    log('╔════════════════════════════════════════╗', 'red');
    log('║                                        ║', 'red');
    log('║      ❌ VALIDACIÓN FALLIDA            ║', 'red');
    log('║                                        ║', 'red');
    log('╚════════════════════════════════════════╝', 'red');
  }

  console.log('\n');

  // Next Steps
  if (results.failed > 0 || results.warnings > 0) {
    logHeader('Próximos Pasos');

    if (results.failed > 0) {
      logError('ACCIONES REQUERIDAS:');
      console.log('  1. Revisa los errores marcados con ❌ arriba');
      console.log('  2. Corrige los archivos faltantes o variables no configuradas');
      console.log('  3. Ejecuta este script nuevamente para verificar');
    }

    if (results.warnings > 0) {
      logWarning('RECOMENDACIONES:');
      console.log('  1. Revisa las advertencias marcadas con ⚠️');
      console.log('  2. Considera implementar las mejoras sugeridas');
      console.log('  3. Consulta la documentación para más detalles');
    }
  } else {
    logSuccess('TODO LISTO! El sistema de autenticación está correctamente configurado.');
    console.log('\nPróximos pasos:');
    console.log('  1. Ejecutar: npm run dev');
    console.log('  2. Navegar a: http://localhost:3000/auth/register');
    console.log('  3. Crear una cuenta de prueba');
    console.log('  4. Probar login con credenciales y Google OAuth');
    console.log('\nDocumentación: Ver IMPLEMENTATION_CHECKLIST.md para testing completo');
  }

  console.log('\n');

  // Exit code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run validation
validateAuth().catch((error) => {
  logError(`Error ejecutando validación: ${error.message}`);
  console.error(error);
  process.exit(1);
});
