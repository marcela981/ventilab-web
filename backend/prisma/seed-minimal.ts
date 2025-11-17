/**
 * VentyLab Database Seed Script - Minimal Version
 * Creates 1 module with 3 lessons for testing
 *
 * Run with: npx tsx prisma/seed-minimal.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting minimal database seed...\n');

  try {
    // Create a test module
    const module = await prisma.module.create({
      data: {
        title: 'Fundamentos de Ventilación Mecánica',
        description: 'Módulo introductorio sobre los conceptos básicos de ventilación mecánica',
        order: 1,
        category: 'FUNDAMENTALS',
        difficulty: 'BEGINNER',
        estimatedTime: 180,
        isActive: true,
        status: 'available',
        lessons: {
          create: [
            {
              title: 'Introducción a la Ventilación Mecánica',
              content: {
                type: 'lesson',
                sections: [
                  {
                    type: 'text',
                    title: '¿Qué es la ventilación mecánica?',
                    content: 'La ventilación mecánica es una técnica de soporte vital que utiliza un ventilador mecánico para asistir o reemplazar la respiración espontánea del paciente.',
                  },
                ],
              },
              order: 1,
              difficulty: 'BEGINNER',
              estimatedTime: 60,
            },
            {
              title: 'Componentes del Ventilador',
              content: {
                type: 'lesson',
                sections: [
                  {
                    type: 'text',
                    title: 'Partes principales',
                    content: 'Un ventilador mecánico consta de varios componentes esenciales: circuito respiratorio, válvulas, sensores y controles.',
                  },
                ],
              },
              order: 2,
              difficulty: 'BEGINNER',
              estimatedTime: 60,
            },
            {
              title: 'Parámetros Básicos',
              content: {
                type: 'lesson',
                sections: [
                  {
                    type: 'text',
                    title: 'Configuración inicial',
                    content: 'Los parámetros básicos incluyen volumen corriente, frecuencia respiratoria, PEEP y FiO2.',
                  },
                ],
              },
              order: 3,
              difficulty: 'INTERMEDIATE',
              estimatedTime: 60,
            },
          ],
        },
      },
    });

    console.log(`✅ Created module: ${module.title}`);
    console.log(`   - Module ID: ${module.id}`);
    console.log(`   - Lessons created: 3`);

    // Get lesson count
    const lessonCount = await prisma.lesson.count({
      where: { moduleId: module.id },
    });

    console.log(`\n📊 Summary:`);
    console.log(`   • Modules: 1`);
    console.log(`   • Lessons: ${lessonCount}`);
    console.log(`\n✅ Seed completed successfully!`);
  } catch (error) {
    console.error('\n❌ Error seeding database:', error);
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

