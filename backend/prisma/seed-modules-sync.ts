/**
 * Module Synchronization Script
 * Syncs 11 real modules from frontend to backend database
 * This script uses upsert to ensure idempotency
 * 
 * Run with: npx ts-node prisma/seed-modules-sync.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Map frontend module IDs to backend data
// Only the 11 unique modules (excluding duplicates)
const modulesToSync = [
  {
    id: 'module-01-fundamentals',
    title: 'Fundamentos Fisiológicos y Respiratorios',
    description: 'Este módulo fundamental cubre los conceptos esenciales de la anatomía y fisiología respiratoria. Aprenderás sobre la estructura del sistema respiratorio, la mecánica de la ventilación, el intercambio gaseoso a nivel alveolar, y la interpretación básica de gasometrías arteriales.',
    level: 'beginner',
    order: 1,
    duration: 180,
    status: 'available',
    isPlaceholder: false,
  },
  {
    id: 'ventilation-principles',
    title: 'Principios de Ventilación Mecánica',
    description: 'Introducción a los principios fundamentales de la ventilación mecánica, incluyendo indicaciones, objetivos y parámetros básicos de configuración.',
    level: 'beginner',
    order: 2,
    duration: 180,
    status: 'available',
    isPlaceholder: false,
  },
  {
    id: 'principles-mechanical-ventilation',
    title: 'Principios de Ventilación Mecánica',
    description: 'Aprende los fundamentos de la ventilación mecánica invasiva. Este módulo cubre las principales modalidades ventilatorias, los parámetros básicos que debes ajustar, y cómo interpretar las alarmas del ventilador.',
    level: 'intermediate',
    order: 1,
    duration: 180,
    status: 'available',
    isPlaceholder: false,
  },
  {
    id: 'volume-control',
    title: 'Ventilación Controlada por Volumen (VCV)',
    description: 'Comprende el funcionamiento de VCV, configura parámetros y identifica ventajas y desventajas.',
    level: 'intermediate',
    order: 2,
    duration: 200,
    status: 'available',
    isPlaceholder: false,
  },
  {
    id: 'pressure-control',
    title: 'Ventilación Controlada por Presión (PCV)',
    description: 'Domina la configuración de PCV, comprende la relación presión-volumen y maneja complicaciones.',
    level: 'intermediate',
    order: 3,
    duration: 180,
    status: 'available',
    isPlaceholder: false,
  },
  {
    id: 'psv-mode',
    title: 'Ventilación con Soporte de Presión (PSV)',
    description: 'Comprende el funcionamiento de PSV, configura niveles de soporte apropiados y monitorea eficacia.',
    level: 'intermediate',
    order: 4,
    duration: 160,
    status: 'available',
    isPlaceholder: false,
  },
  {
    id: 'simv-mode',
    title: 'Ventilación Mandatoria Intermitente Sincronizada (SIMV)',
    description: 'Comprende SIMV y sus aplicaciones, configura parámetros y maneja destete.',
    level: 'intermediate',
    order: 5,
    duration: 170,
    status: 'available',
    isPlaceholder: false,
  },
  {
    id: 'ards-management',
    title: 'Manejo de ARDS y Estrategias de Protección Pulmonar',
    description: 'Aplica protocolo ARDSnet, implementa estrategias de protección pulmonar y maneja complicaciones del ARDS.',
    level: 'advanced',
    order: 1,
    duration: 240,
    status: 'available',
    isPlaceholder: false,
  },
  {
    id: 'copd-management',
    title: 'Manejo Ventilatorio en EPOC',
    description: 'Comprende las particularidades del EPOC, aplica estrategias ventilatorias específicas y maneja auto-PEEP y hiperinsuflación.',
    level: 'advanced',
    order: 2,
    duration: 200,
    status: 'available',
    isPlaceholder: false,
  },
  {
    id: 'asthma-crisis',
    title: 'Manejo de Crisis Asmática',
    description: 'Identifica crisis asmática severa, aplica ventilación permisiva y maneja complicaciones ventilatorias.',
    level: 'advanced',
    order: 3,
    duration: 180,
    status: 'available',
    isPlaceholder: false,
  },
  {
    id: 'clinical-cases',
    title: 'Casos Clínicos Complejos',
    description: 'Integra conocimientos en casos complejos, toma decisiones clínicas fundamentadas y maneja múltiples patologías simultáneas.',
    level: 'advanced',
    order: 4,
    duration: 300,
    status: 'available',
    isPlaceholder: false,
  },
];

function mapLevelToDifficulty(level: string): 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' {
  switch (level) {
    case 'beginner':
      return 'BEGINNER';
    case 'intermediate':
      return 'INTERMEDIATE';
    case 'advanced':
      return 'ADVANCED';
    default:
      return 'BEGINNER';
  }
}

function mapLevelToCategory(level: string): 'FUNDAMENTALS' | 'VENTILATION_PRINCIPLES' | 'CLINICAL_APPLICATIONS' | 'ADVANCED_TECHNIQUES' {
  switch (level) {
    case 'beginner':
      return 'FUNDAMENTALS';
    case 'intermediate':
      return 'VENTILATION_PRINCIPLES';
    case 'advanced':
      return 'CLINICAL_APPLICATIONS';
    default:
      return 'FUNDAMENTALS';
  }
}

async function syncModules() {
  console.log('🔄 Syncing 11 modules from frontend to backend...\n');

  for (const moduleData of modulesToSync) {
    try {
      const module = await prisma.module.upsert({
        where: { id: moduleData.id },
        update: {
          title: moduleData.title,
          description: moduleData.description,
          order: moduleData.order,
          category: mapLevelToCategory(moduleData.level),
          difficulty: mapLevelToDifficulty(moduleData.level),
          estimatedTime: moduleData.duration,
          isActive: true,
          status: moduleData.status,
          isPlaceholder: moduleData.isPlaceholder,
        },
        create: {
          id: moduleData.id,
          title: moduleData.title,
          description: moduleData.description,
          order: moduleData.order,
          category: mapLevelToCategory(moduleData.level),
          difficulty: mapLevelToDifficulty(moduleData.level),
          estimatedTime: moduleData.duration,
          isActive: true,
          status: moduleData.status,
          isPlaceholder: moduleData.isPlaceholder,
        },
      });

      console.log(`  ✓ ${module.id}: ${module.title}`);
    } catch (error) {
      console.error(`  ✗ Error syncing ${moduleData.id}:`, error);
    }
  }

  console.log('\n✅ Module sync completed!');
}

async function main() {
  try {
    await syncModules();
    
    const stats = {
      total: await prisma.module.count(),
      available: await prisma.module.count({ where: { status: 'available', isPlaceholder: false } }),
      placeholders: await prisma.module.count({ where: { isPlaceholder: true } }),
    };

    console.log('\n📊 Database Statistics:');
    console.log(`  • Total modules: ${stats.total}`);
    console.log(`  • Available modules: ${stats.available}`);
    console.log(`  • Placeholder modules: ${stats.placeholders}`);
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

