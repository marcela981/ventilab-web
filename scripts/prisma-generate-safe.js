/*
 * Funcionalidad: Prisma Generate Safe
 * Descripción: Ejecuta prisma generate eliminando primero archivos .tmp bloqueados
 *              para evitar el error EPERM en Windows al renombrar el query engine DLL.
 * Versión: 1.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PRISMA_CLIENT_DIR = path.join(__dirname, '..', 'node_modules', '.prisma', 'client');

function cleanTmpFiles() {
  if (!fs.existsSync(PRISMA_CLIENT_DIR)) return;

  const files = fs.readdirSync(PRISMA_CLIENT_DIR);
  const tmpFiles = files.filter(f => f.endsWith('.tmp') || f.includes('.tmp'));

  for (const file of tmpFiles) {
    const fullPath = path.join(PRISMA_CLIENT_DIR, file);
    try {
      fs.unlinkSync(fullPath);
      console.log(`🧹 Eliminado archivo bloqueado: ${file}`);
    } catch {
      console.warn(`⚠️  No se pudo eliminar ${file} — continúa de todas formas`);
    }
  }
}

function runPrismaGenerate() {
  console.log('⚙️  Ejecutando prisma generate...');
  try {
    execSync('npx prisma generate --schema=./prisma/schema.prisma', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });
    console.log('✅ Prisma client generado correctamente');
  } catch (err) {
    // Si ya existe el cliente generado, no es un error fatal
    const clientExists = fs.existsSync(path.join(PRISMA_CLIENT_DIR, 'index.js'));
    if (clientExists) {
      console.warn('⚠️  prisma generate falló pero el cliente ya existe — continuando build');
    } else {
      console.error('❌ prisma generate falló y no hay cliente previo');
      process.exit(1);
    }
  }
}

cleanTmpFiles();
runPrismaGenerate();
