/**
 * =============================================================================
 * Prisma Seed Script
 * =============================================================================
 * Seed script para poblar la base de datos con datos iniciales de prueba
 * 
 * Incluye:
 * - 3 usuarios (1 alumno, 1 profesor, 1 admin)
 * - 2 módulos (Fundamentos, Modos Clásicos) con 3 lecciones cada uno
 * - Progress records para cada usuario
 * 
 * Ejecutar con: npm run db:seed
 * =============================================================================
 */

import { PrismaClient, UserRole, ModuleCategory, ModuleDifficulty } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Hash password helper
 */
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Create lesson content JSON with sections: text, image, quiz
 */
function createLessonContent(lessonNumber: number, moduleTitle: string): string {
  const lessonContents = {
    'Fundamentos': {
      1: {
        sections: [
          {
            id: 'intro-section',
            order: 1,
            type: 'text',
            title: 'Introducción',
            content: {
              markdown: `# Introducción a ${moduleTitle}\n\nEsta lección proporciona los conceptos fundamentales necesarios para comprender los principios básicos de la ventilación mecánica.`
            }
          },
          {
            id: 'image-section',
            order: 2,
            type: 'image',
            title: 'Diagrama del Sistema Respiratorio',
            content: {
              description: 'Diagrama ilustrativo del sistema respiratorio humano',
              url: '/images/respiratory-system.png',
              alt: 'Sistema respiratorio'
            }
          },
          {
            id: 'quiz-section',
            order: 3,
            type: 'quiz',
            title: 'Evaluación',
            content: {
              questions: [
                {
                  id: 'q1',
                  question: '¿Cuál es la función principal del sistema respiratorio?',
                  options: [
                    'Bombeo de sangre',
                    'Intercambio de gases',
                    'Digestión',
                    'Filtración de toxinas'
                  ],
                  correctAnswer: 'Intercambio de gases',
                  explanation: 'El sistema respiratorio permite el intercambio de oxígeno y dióxido de carbono.'
                }
              ]
            }
          }
        ]
      },
      2: {
        sections: [
          {
            id: 'intro-section',
            order: 1,
            type: 'text',
            title: 'Conceptos Básicos',
            content: {
              markdown: '# Conceptos Básicos\n\nEn esta sección aprenderás los principios fundamentales de la ventilación mecánica.'
            }
          },
          {
            id: 'image-section',
            order: 2,
            type: 'image',
            title: 'Ventilador Mecánico',
            content: {
              description: 'Diagrama de un ventilador mecánico',
              url: '/images/ventilator.png',
              alt: 'Ventilador mecánico'
            }
          },
          {
            id: 'quiz-section',
            order: 3,
            type: 'quiz',
            title: 'Evaluación',
            content: {
              questions: [
                {
                  id: 'q1',
                  question: '¿Qué es la ventilación mecánica?',
                  options: [
                    'Proceso natural de respiración',
                    'Asistencia artificial para la respiración',
                    'Técnica quirúrgica',
                    'Método de diagnóstico'
                  ],
                  correctAnswer: 'Asistencia artificial para la respiración',
                  explanation: 'La ventilación mecánica es la asistencia artificial para mantener la respiración del paciente.'
                }
              ]
            }
          }
        ]
      },
      3: {
        sections: [
          {
            id: 'intro-section',
            order: 1,
            type: 'text',
            title: 'Parámetros Básicos',
            content: {
              markdown: '# Parámetros Básicos\n\nLos parámetros fundamentales incluyen volumen tidal, frecuencia respiratoria y presión.'
            }
          },
          {
            id: 'image-section',
            order: 2,
            type: 'image',
            title: 'Parámetros del Ventilador',
            content: {
              description: 'Diagrama mostrando los parámetros principales',
              url: '/images/ventilator-parameters.png',
              alt: 'Parámetros del ventilador'
            }
          },
          {
            id: 'quiz-section',
            order: 3,
            type: 'quiz',
            title: 'Evaluación',
            content: {
              questions: [
                {
                  id: 'q1',
                  question: '¿Qué es el volumen tidal?',
                  options: [
                    'Volumen total de los pulmones',
                    'Volumen de aire en cada respiración',
                    'Frecuencia respiratoria',
                    'Presión máxima'
                  ],
                  correctAnswer: 'Volumen de aire en cada respiración',
                  explanation: 'El volumen tidal es el volumen de aire que se mueve en cada ciclo respiratorio.'
                }
              ]
            }
          }
        ]
      }
    },
    'Modos Clásicos': {
      1: {
        sections: [
          {
            id: 'intro-section',
            order: 1,
            type: 'text',
            title: 'Introducción a los Modos',
            content: {
              markdown: '# Introducción a los Modos Clásicos\n\nLos modos clásicos de ventilación incluyen VCV, PCV y otros modos controlados.'
            }
          },
          {
            id: 'image-section',
            order: 2,
            type: 'image',
            title: 'Modos de Ventilación',
            content: {
              description: 'Diagrama comparativo de modos de ventilación',
              url: '/images/ventilation-modes.png',
              alt: 'Modos de ventilación'
            }
          },
          {
            id: 'quiz-section',
            order: 3,
            type: 'quiz',
            title: 'Evaluación',
            content: {
              questions: [
                {
                  id: 'q1',
                  question: '¿Qué significa VCV?',
                  options: [
                    'Ventilación Controlada por Volumen',
                    'Ventilación Continua Variable',
                    'Volumen Cardíaco Variable',
                    'Ventilación Compresiva Volumétrica'
                  ],
                  correctAnswer: 'Ventilación Controlada por Volumen',
                  explanation: 'VCV significa Ventilación Controlada por Volumen, donde el volumen es el parámetro controlado.'
                }
              ]
            }
          }
        ]
      },
      2: {
        sections: [
          {
            id: 'intro-section',
            order: 1,
            type: 'text',
            title: 'VCV - Ventilación Controlada por Volumen',
            content: {
              markdown: '# VCV - Ventilación Controlada por Volumen\n\nEn este modo, el volumen tidal es fijo y la presión varía según la complacencia del paciente.'
            }
          },
          {
            id: 'image-section',
            order: 2,
            type: 'image',
            title: 'Curva de Presión VCV',
            content: {
              description: 'Curva de presión en modo VCV',
              url: '/images/vcv-pressure-curve.png',
              alt: 'Curva de presión VCV'
            }
          },
          {
            id: 'quiz-section',
            order: 3,
            type: 'quiz',
            title: 'Evaluación',
            content: {
              questions: [
                {
                  id: 'q1',
                  question: 'En VCV, ¿qué parámetro es constante?',
                  options: [
                    'Presión',
                    'Volumen',
                    'Frecuencia',
                    'Flujo'
                  ],
                  correctAnswer: 'Volumen',
                  explanation: 'En VCV, el volumen tidal es constante y la presión varía.'
                }
              ]
            }
          }
        ]
      },
      3: {
        sections: [
          {
            id: 'intro-section',
            order: 1,
            type: 'text',
            title: 'PCV - Ventilación Controlada por Presión',
            content: {
              markdown: '# PCV - Ventilación Controlada por Presión\n\nEn PCV, la presión inspiratoria es constante y el volumen varía según la complacencia.'
            }
          },
          {
            id: 'image-section',
            order: 2,
            type: 'image',
            title: 'Curva de Volumen PCV',
            content: {
              description: 'Curva de volumen en modo PCV',
              url: '/images/pcv-volume-curve.png',
              alt: 'Curva de volumen PCV'
            }
          },
          {
            id: 'quiz-section',
            order: 3,
            type: 'quiz',
            title: 'Evaluación',
            content: {
              questions: [
                {
                  id: 'q1',
                  question: 'En PCV, ¿qué parámetro es constante?',
                  options: [
                    'Volumen',
                    'Presión',
                    'Flujo',
                    'Frecuencia'
                  ],
                  correctAnswer: 'Presión',
                  explanation: 'En PCV, la presión inspiratoria es constante y el volumen varía.'
                }
              ]
            }
          }
        ]
      }
    }
  };

  const moduleKey = moduleTitle as keyof typeof lessonContents;
  const lessonKey = lessonNumber as keyof typeof lessonContents[typeof moduleKey];
  
  const content = lessonContents[moduleKey]?.[lessonKey];
  if (!content) {
    throw new Error(`No content found for module ${moduleTitle}, lesson ${lessonNumber}`);
  }

  return JSON.stringify(content);
}

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...\n');

  // Limpiar datos existentes (opcional - comentar en producción)
  console.log('🧹 Limpiando datos existentes...');
  await prisma.quizAttempt.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.lessonProgress.deleteMany();
  await prisma.learningProgress.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.module.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.learningSession.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  console.log('✅ Datos limpiados\n');

  // 1. Crear usuarios
  console.log('👥 Creando usuarios...');
  const hashedPassword = await hashPassword('password123');

  const student = await prisma.user.create({
    data: {
      email: 'alumno@ventilab.com',
      password: hashedPassword,
      name: 'Juan Estudiante',
      role: UserRole.STUDENT,
      isActive: true,
    },
  });

  const instructor = await prisma.user.create({
    data: {
      email: 'profesor@ventilab.com',
      password: hashedPassword,
      name: 'María Profesora',
      role: UserRole.INSTRUCTOR,
      isActive: true,
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: 'admin@ventilab.com',
      password: hashedPassword,
      name: 'Carlos Administrador',
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  console.log(`✅ Usuarios creados: ${student.name}, ${instructor.name}, ${admin.name}\n`);

  // 2. Crear módulos
  console.log('📚 Creando módulos...');
  const moduleFundamentos = await prisma.module.create({
    data: {
      title: 'Fundamentos',
      description: 'Módulo introductorio sobre los fundamentos de la ventilación mecánica',
      order: 1,
      category: ModuleCategory.FUNDAMENTALS,
      difficulty: ModuleDifficulty.BEGINNER,
      estimatedTime: 120,
      isActive: true,
    },
  });

  const moduleModosClasicos = await prisma.module.create({
    data: {
      title: 'Modos Clásicos',
      description: 'Módulo sobre los modos clásicos de ventilación mecánica (VCV, PCV)',
      order: 2,
      category: ModuleCategory.VENTILATION_PRINCIPLES,
      difficulty: ModuleDifficulty.INTERMEDIATE,
      estimatedTime: 150,
      isActive: true,
    },
  });

  console.log(`✅ Módulos creados: ${moduleFundamentos.title}, ${moduleModosClasicos.title}\n`);

  // 3. Crear lecciones para cada módulo
  console.log('📖 Creando lecciones...');
  const lessons = [];

  // Lecciones del módulo Fundamentos
  for (let i = 1; i <= 3; i++) {
    const lesson = await prisma.lesson.create({
      data: {
        moduleId: moduleFundamentos.id,
        title: `Lección ${i} - Fundamentos`,
        content: createLessonContent(i, 'Fundamentos'),
        order: i,
        estimatedTime: 40,
        aiGenerated: false,
      },
    });
    lessons.push({ lesson, moduleId: moduleFundamentos.id });
  }

  // Lecciones del módulo Modos Clásicos
  for (let i = 1; i <= 3; i++) {
    const lesson = await prisma.lesson.create({
      data: {
        moduleId: moduleModosClasicos.id,
        title: `Lección ${i} - Modos Clásicos`,
        content: createLessonContent(i, 'Modos Clásicos'),
        order: i,
        estimatedTime: 50,
        aiGenerated: false,
      },
    });
    lessons.push({ lesson, moduleId: moduleModosClasicos.id });
  }

  console.log(`✅ ${lessons.length} lecciones creadas\n`);

  // 4. Crear Progress records
  console.log('📊 Creando registros de progreso...');

  // Progress para el estudiante - primera lección del módulo Fundamentos
  const studentModuleProgress = await prisma.learningProgress.create({
    data: {
      userId: student.id,
      moduleId: moduleFundamentos.id,
      timeSpent: 30,
      score: 85.5,
    },
  });

  await prisma.lessonProgress.create({
    data: {
      progressId: studentModuleProgress.id,
      lessonId: lessons[0].lesson.id,
      completed: true,
      timeSpent: 30,
      lastAccessed: new Date(),
    },
  });

  // Progress para el profesor - primera lección del módulo Modos Clásicos
  const instructorModuleProgress = await prisma.learningProgress.create({
    data: {
      userId: instructor.id,
      moduleId: moduleModosClasicos.id,
      timeSpent: 25,
      score: 92.0,
    },
  });

  await prisma.lessonProgress.create({
    data: {
      progressId: instructorModuleProgress.id,
      lessonId: lessons[3].lesson.id, // Primera lección del segundo módulo
      completed: true,
      timeSpent: 25,
      lastAccessed: new Date(),
    },
  });

  // Progress para el admin - primera lección del módulo Fundamentos
  const adminModuleProgress = await prisma.learningProgress.create({
    data: {
      userId: admin.id,
      moduleId: moduleFundamentos.id,
      timeSpent: 20,
      score: 95.0,
    },
  });

  await prisma.lessonProgress.create({
    data: {
      progressId: adminModuleProgress.id,
      lessonId: lessons[0].lesson.id,
      completed: true,
      timeSpent: 20,
      lastAccessed: new Date(),
    },
  });

  console.log('✅ Registros de progreso creados\n');

  console.log('✨ Seed completado exitosamente!\n');
  console.log('📋 Resumen:');
  console.log(`   - ${3} usuarios creados`);
  console.log(`   - ${2} módulos creados`);
  console.log(`   - ${lessons.length} lecciones creadas`);
  console.log(`   - ${3} registros de progreso creados`);
  console.log('\n🔑 Credenciales de acceso:');
  console.log('   Alumno:    alumno@ventilab.com / password123');
  console.log('   Profesor:  profesor@ventilab.com / password123');
  console.log('   Admin:     admin@ventilab.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

