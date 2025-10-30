/**
 * VentyLab Database Seed Script
 * Populates the database with initial data for development and testing
 *
 * This script creates:
 * - Admin user and test student users
 * - Educational modules with lessons
 * - Module prerequisites
 * - Sample quizzes for assessment
 *
 * Run with: npm run prisma:seed
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Hash password helper
async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

/**
 * Clean database - Remove all existing data in correct order
 * Respects foreign key constraints by deleting in reverse dependency order
 */
async function cleanDatabase() {
  console.log('🧹 Cleaning database...');

  await prisma.quizAttempt.deleteMany({});
  await prisma.quiz.deleteMany({});
  await prisma.lessonProgress.deleteMany({});
  await prisma.learningProgress.deleteMany({});
  await prisma.achievement.deleteMany({});
  await prisma.learningSession.deleteMany({});
  await prisma.lesson.deleteMany({});
  await prisma.modulePrerequisite.deleteMany({});
  await prisma.module.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('✅ Database cleaned successfully');
}

/**
 * Create users - Admin and test students
 */
async function createUsers() {
  console.log('👥 Creating users...');

  // Create admin user
  const adminPassword = await hashPassword('Admin123');
  const admin = await prisma.user.create({
    data: {
      email: 'admin@ventilab.com',
      password: adminPassword,
      name: 'Administrador VentyLab',
      role: 'ADMIN',
      bio: 'Administrador del sistema VentyLab',
    },
  });
  console.log('  ✓ Admin created:', admin.email);

  // Create test students
  const studentPassword = await hashPassword('Student123');

  const students = await Promise.all([
    prisma.user.create({
      data: {
        email: 'estudiante1@ventilab.com',
        password: studentPassword,
        name: 'María Rodríguez',
        role: 'STUDENT',
        bio: 'Estudiante de medicina interesada en cuidados intensivos',
      },
    }),
    prisma.user.create({
      data: {
        email: 'estudiante2@ventilab.com',
        password: studentPassword,
        name: 'Carlos Méndez',
        role: 'STUDENT',
        bio: 'Residente de medicina interna',
      },
    }),
    prisma.user.create({
      data: {
        email: 'estudiante3@ventilab.com',
        password: studentPassword,
        name: 'Ana Martínez',
        role: 'STUDENT',
        bio: 'Enfermera especializada en UCI',
      },
    }),
    prisma.user.create({
      data: {
        email: 'estudiante4@ventilab.com',
        password: studentPassword,
        name: 'Jorge Silva',
        role: 'STUDENT',
        bio: 'Estudiante de terapia respiratoria',
      },
    }),
  ]);

  console.log(`  ✓ Created ${students.length} student users`);

  return { admin, students };
}

/**
 * Create Module 1: Fundamentos Fisiológicos
 */
async function createModule1() {
  console.log('📚 Creating Module 1: Fundamentos Fisiológicos...');

  const module = await prisma.module.create({
    data: {
      title: 'Fundamentos Fisiológicos del Sistema Respiratorio',
      description:
        'Este módulo fundamental cubre los conceptos esenciales de la anatomía y fisiología respiratoria. ' +
        'Aprenderás sobre la estructura del sistema respiratorio, la mecánica de la ventilación, ' +
        'el intercambio gaseoso a nivel alveolar, y la interpretación básica de gasometrías arteriales. ' +
        'Es la base necesaria para comprender la ventilación mecánica.',
      order: 1,
      category: 'FUNDAMENTALS',
      difficulty: 'BEGINNER',
      estimatedTime: 180,
      isActive: true,
    },
  });

  // Lesson 1: Anatomía
  const lesson1 = await prisma.lesson.create({
    data: {
      moduleId: module.id,
      title: 'Anatomía del Sistema Respiratorio',
      order: 1,
      estimatedTime: 60,
      aiGenerated: false,
      content: JSON.stringify({
        type: 'lesson',
        sections: [
          {
            type: 'text',
            title: 'Introducción',
            content:
              'El sistema respiratorio es fundamental para la vida, permitiendo el intercambio de gases ' +
              'entre el ambiente y la sangre. Comprender su anatomía es esencial para el manejo de la ventilación mecánica.',
          },
          {
            type: 'heading',
            content: 'Vías Aéreas Superiores',
          },
          {
            type: 'text',
            content:
              'Las vías aéreas superiores incluyen la nariz, faringe y laringe. Estas estructuras filtran, ' +
              'calientan y humidifican el aire inspirado, además de proteger contra la aspiración.',
          },
          {
            type: 'image',
            title: 'Vías aéreas superiores',
            content: '/images/upper-airways.jpg',
            alt: 'Diagrama de vías aéreas superiores',
          },
          {
            type: 'heading',
            content: 'Tráquea y Bronquios',
          },
          {
            type: 'text',
            content:
              'La tráquea se bifurca en los bronquios principales derecho e izquierdo. El bronquio derecho ' +
              'es más vertical, lo que explica por qué los cuerpos extraños tienden a alojarse en ese lado.',
          },
          {
            type: 'heading',
            content: 'Alvéolos y Membrana Respiratoria',
          },
          {
            type: 'text',
            content:
              'Los alvéolos son las unidades funcionales del intercambio gaseoso. La membrana alveolo-capilar ' +
              'tiene un grosor de apenas 0.5 micrómetros, permitiendo una difusión eficiente de gases.',
          },
          {
            type: 'important',
            content:
              'Concepto clave: La superficie total de intercambio gaseoso en los pulmones es aproximadamente ' +
              '70 m², equivalente a media cancha de tenis.',
          },
        ],
      }),
    },
  });

  // Lesson 2: Mecánica Respiratoria
  const lesson2 = await prisma.lesson.create({
    data: {
      moduleId: module.id,
      title: 'Mecánica Respiratoria: Presión, Volumen y Flujo',
      order: 2,
      estimatedTime: 60,
      aiGenerated: false,
      content: JSON.stringify({
        type: 'lesson',
        sections: [
          {
            type: 'text',
            title: 'Introducción a la Mecánica Respiratoria',
            content:
              'La ventilación es un proceso mecánico que depende de cambios en las presiones intratorácicas. ' +
              'Comprender estos conceptos es fundamental para ajustar adecuadamente un ventilador mecánico.',
          },
          {
            type: 'heading',
            content: 'Presión Intrapulmonar e Intrapleural',
          },
          {
            type: 'text',
            content:
              'La presión alveolar varía durante el ciclo respiratorio. Durante la inspiración, se vuelve negativa ' +
              'respecto a la atmosférica, permitiendo la entrada de aire. La presión intrapleural es siempre negativa ' +
              'en condiciones normales.',
          },
          {
            type: 'interactive',
            title: 'Simulación: Ciclo de Presiones',
            content: 'pressure-volume-simulation',
            description:
              'Interactúa con el gráfico para ver cómo cambian las presiones durante inspiración y espiración.',
          },
          {
            type: 'heading',
            content: 'Compliance Pulmonar',
          },
          {
            type: 'text',
            content:
              'La compliance (distensibilidad) es la capacidad del pulmón para expandirse. Se mide como el cambio ' +
              'en volumen dividido por el cambio en presión (ΔV/ΔP). Valores normales: 100 ml/cmH2O.',
          },
          {
            type: 'formula',
            content: 'Compliance = ΔVolumen / ΔPresión',
          },
          {
            type: 'heading',
            content: 'Resistencia de las Vías Aéreas',
          },
          {
            type: 'text',
            content:
              'La resistencia al flujo aéreo depende principalmente del diámetro de las vías aéreas. ' +
              'En ventilación mecánica, también incluye la resistencia del tubo endotraqueal.',
          },
          {
            type: 'important',
            content:
              'Concepto clave: La resistencia aumenta exponencialmente cuando el radio de la vía aérea disminuye (Ley de Poiseuille).',
          },
        ],
      }),
    },
  });

  // Lesson 3: Intercambio Gaseoso
  const lesson3 = await prisma.lesson.create({
    data: {
      moduleId: module.id,
      title: 'Intercambio Gaseoso y Gasometría Arterial',
      order: 3,
      estimatedTime: 60,
      aiGenerated: false,
      content: JSON.stringify({
        type: 'lesson',
        sections: [
          {
            type: 'text',
            title: 'Difusión de Gases',
            content:
              'El intercambio gaseoso ocurre por difusión simple a través de la membrana alveolo-capilar. ' +
              'El oxígeno se mueve de los alvéolos a la sangre, mientras que el CO2 se mueve en dirección opuesta.',
          },
          {
            type: 'heading',
            content: 'Gradientes de Presión Parcial',
          },
          {
            type: 'text',
            content:
              'La PaO2 alveolar normal es ~100 mmHg, mientras que la sangre venosa llega con ~40 mmHg. ' +
              'Este gradiente de 60 mmHg impulsa la difusión de oxígeno.',
          },
          {
            type: 'table',
            content: {
              headers: ['Gas', 'Alveolar', 'Sangre Venosa', 'Sangre Arterial'],
              rows: [
                ['PO2', '100 mmHg', '40 mmHg', '100 mmHg'],
                ['PCO2', '40 mmHg', '46 mmHg', '40 mmHg'],
              ],
            },
          },
          {
            type: 'heading',
            content: 'Interpretación de Gasometría Arterial',
          },
          {
            type: 'text',
            content:
              'Una gasometría arterial (GSA) proporciona información vital sobre el estado respiratorio y metabólico del paciente.',
          },
          {
            type: 'list',
            title: 'Valores Normales',
            items: [
              'pH: 7.35 - 7.45',
              'PaO2: 80 - 100 mmHg',
              'PaCO2: 35 - 45 mmHg',
              'HCO3-: 22 - 26 mEq/L',
              'SaO2: > 95%',
            ],
          },
          {
            type: 'important',
            content:
              'Concepto clave: Una PaO2 < 60 mmHg o SaO2 < 90% indica hipoxemia severa y requiere intervención inmediata.',
          },
        ],
      }),
    },
  });

  // Create quizzes for Lesson 2
  await Promise.all([
    prisma.quiz.create({
      data: {
        lessonId: lesson2.id,
        question:
          '¿Qué sucede con la presión alveolar durante la inspiración normal?',
        options: JSON.stringify([
          'Se vuelve positiva respecto a la atmosférica',
          'Se vuelve negativa respecto a la atmosférica',
          'Permanece igual a la presión atmosférica',
          'Se vuelve igual a la presión intrapleural',
        ]),
        correctAnswer: 'Se vuelve negativa respecto a la atmosférica',
        explanation:
          'Durante la inspiración, la expansión torácica genera una presión alveolar negativa (-1 a -3 cmH2O) ' +
          'respecto a la atmosférica, lo que permite la entrada de aire por gradiente de presión.',
        order: 1,
        points: 10,
      },
    }),
    prisma.quiz.create({
      data: {
        lessonId: lesson2.id,
        question: '¿Cuál es el valor normal de compliance pulmonar en adultos?',
        options: JSON.stringify([
          '50 ml/cmH2O',
          '100 ml/cmH2O',
          '150 ml/cmH2O',
          '200 ml/cmH2O',
        ]),
        correctAnswer: '100 ml/cmH2O',
        explanation:
          'La compliance pulmonar normal en adultos es aproximadamente 100 ml/cmH2O. ' +
          'Valores más bajos indican pulmones rígidos (fibrosis, edema), valores más altos indican pérdida de retracción elástica (enfisema).',
        order: 2,
        points: 10,
      },
    }),
    prisma.quiz.create({
      data: {
        lessonId: lesson2.id,
        question:
          '¿Qué ley física explica la relación entre el diámetro de la vía aérea y la resistencia al flujo?',
        options: JSON.stringify([
          'Ley de Boyle',
          'Ley de Dalton',
          'Ley de Poiseuille',
          'Ley de Henry',
        ]),
        correctAnswer: 'Ley de Poiseuille',
        explanation:
          'La Ley de Poiseuille establece que la resistencia al flujo es inversamente proporcional a la cuarta potencia del radio. ' +
          'Esto significa que una pequeña reducción en el diámetro causa un gran aumento en la resistencia.',
        order: 3,
        points: 10,
      },
    }),
  ]);

  console.log(`  ✓ Module 1 created with ${3} lessons and ${3} quizzes`);
  return module;
}

/**
 * Create Module 2: Principios de Ventilación Mecánica
 */
async function createModule2(prerequisiteModuleId: string) {
  console.log('📚 Creating Module 2: Principios de Ventilación Mecánica...');

  const module = await prisma.module.create({
    data: {
      title: 'Principios de Ventilación Mecánica',
      description:
        'Aprende los fundamentos de la ventilación mecánica invasiva. Este módulo cubre las principales ' +
        'modalidades ventilatorias, los parámetros básicos que debes ajustar, y cómo interpretar las alarmas ' +
        'del ventilador. Desarrollarás las habilidades necesarias para comprender y ajustar la ventilación mecánica.',
      order: 2,
      category: 'VENTILATION_PRINCIPLES',
      difficulty: 'INTERMEDIATE',
      estimatedTime: 240,
      isActive: true,
    },
  });

  // Create prerequisite relationship
  await prisma.modulePrerequisite.create({
    data: {
      moduleId: module.id,
      prerequisiteId: prerequisiteModuleId,
    },
  });

  // Lesson 1: Modalidades Ventilatorias
  await prisma.lesson.create({
    data: {
      moduleId: module.id,
      title: 'Modalidades Ventilatorias: VCV, PCV, SIMV, PSV',
      order: 1,
      estimatedTime: 80,
      aiGenerated: false,
      content: JSON.stringify({
        type: 'lesson',
        sections: [
          {
            type: 'text',
            title: 'Introducción a las Modalidades',
            content:
              'Las modalidades ventilatorias determinan cómo el ventilador interactúa con los esfuerzos respiratorios del paciente. ' +
              'Cada modalidad tiene ventajas y desventajas según la condición clínica.',
          },
          {
            type: 'heading',
            content: 'Ventilación Controlada por Volumen (VCV)',
          },
          {
            type: 'text',
            content:
              'En VCV, el ventilador entrega un volumen corriente fijo en cada respiración. ' +
              'La presión resultante varía según la compliance y resistencia del sistema respiratorio.',
          },
          {
            type: 'list',
            title: 'Ventajas de VCV',
            items: [
              'Volumen minuto garantizado',
              'Útil en pacientes sedados/paralizados',
              'Control preciso de ventilación',
            ],
          },
          {
            type: 'heading',
            content: 'Ventilación Controlada por Presión (PCV)',
          },
          {
            type: 'text',
            content:
              'En PCV, el ventilador entrega una presión inspiratoria fija. ' +
              'El volumen corriente varía según la mecánica pulmonar del paciente.',
          },
          {
            type: 'list',
            title: 'Ventajas de PCV',
            items: [
              'Menor riesgo de barotrauma',
              'Mejor distribución de gas',
              'Más cómoda para pacientes despiertos',
            ],
          },
          {
            type: 'heading',
            content: 'Ventilación Mandatoria Intermitente Sincronizada (SIMV)',
          },
          {
            type: 'text',
            content:
              'SIMV combina respiraciones mandatorias del ventilador con respiraciones espontáneas del paciente. ' +
              'Útil en el proceso de destete.',
          },
          {
            type: 'heading',
            content: 'Ventilación con Soporte de Presión (PSV)',
          },
          {
            type: 'text',
            content:
              'PSV asiste cada esfuerzo inspiratorio del paciente con un nivel de presión predeterminado. ' +
              'Requiere que el paciente tenga drive respiratorio.',
          },
        ],
      }),
    },
  });

  // Lesson 2: Parámetros Básicos
  await prisma.lesson.create({
    data: {
      moduleId: module.id,
      title: 'Parámetros Básicos: Vt, FR, PEEP, FiO2',
      order: 2,
      estimatedTime: 80,
      aiGenerated: false,
      content: JSON.stringify({
        type: 'lesson',
        sections: [
          {
            type: 'text',
            title: 'Parámetros Fundamentales',
            content:
              'El ajuste correcto de los parámetros ventilatorios es crucial para proporcionar soporte respiratorio efectivo ' +
              'sin causar lesión pulmonar.',
          },
          {
            type: 'heading',
            content: 'Volumen Corriente (Vt)',
          },
          {
            type: 'text',
            content:
              'El volumen corriente es la cantidad de aire entregada en cada respiración. ' +
              'Actualmente se recomienda ventilación protectora con 6-8 ml/kg de peso predicho.',
          },
          {
            type: 'formula',
            content: 'Vt (ml) = 6-8 ml/kg × Peso Predicho',
          },
          {
            type: 'heading',
            content: 'Frecuencia Respiratoria (FR)',
          },
          {
            type: 'text',
            content:
              'La FR determina cuántas respiraciones se entregan por minuto. Típicamente 12-20 rpm en adultos. ' +
              'Se ajusta para mantener normocapnia (PaCO2 35-45 mmHg).',
          },
          {
            type: 'heading',
            content: 'Presión Positiva al Final de la Espiración (PEEP)',
          },
          {
            type: 'text',
            content:
              'La PEEP mantiene los alvéolos abiertos al final de la espiración, mejorando la oxigenación. ' +
              'PEEP fisiológica: 5 cmH2O. Puede aumentarse en SDRA hasta 15-20 cmH2O.',
          },
          {
            type: 'important',
            content:
              'Concepto clave: La PEEP mejora la oxigenación pero puede afectar el retorno venoso y el gasto cardíaco en niveles altos.',
          },
          {
            type: 'heading',
            content: 'Fracción Inspirada de Oxígeno (FiO2)',
          },
          {
            type: 'text',
            content:
              'FiO2 es el porcentaje de oxígeno en el gas inspirado. Rango: 21% (aire ambiente) a 100%. ' +
              'Se ajusta para mantener SaO2 > 90% o PaO2 > 60 mmHg.',
          },
          {
            type: 'warning',
            content:
              'Atención: FiO2 > 60% por períodos prolongados puede causar toxicidad por oxígeno. Siempre buscar la FiO2 más baja posible.',
          },
        ],
      }),
    },
  });

  // Lesson 3: Monitorización y Alarmas
  await prisma.lesson.create({
    data: {
      moduleId: module.id,
      title: 'Monitorización y Alarmas del Ventilador',
      order: 3,
      estimatedTime: 80,
      aiGenerated: false,
      content: JSON.stringify({
        type: 'lesson',
        sections: [
          {
            type: 'text',
            title: 'Importancia de la Monitorización',
            content:
              'La monitorización continua es esencial para detectar problemas tempranamente y ajustar la ventilación. ' +
              'Las alarmas del ventilador son tu primera línea de defensa.',
          },
          {
            type: 'heading',
            content: 'Parámetros a Monitorizar',
          },
          {
            type: 'list',
            title: 'Monitorización Esencial',
            items: [
              'Presión de vía aérea (Pico, Plateau, Media)',
              'Volumen corriente entregado vs programado',
              'Volumen minuto',
              'Compliance y resistencia',
              'Auto-PEEP',
              'Capnografía (EtCO2)',
            ],
          },
          {
            type: 'heading',
            content: 'Alarmas de Alta Presión',
          },
          {
            type: 'text',
            content:
              'Se activan cuando la presión en vía aérea excede el límite programado. ' +
              'Causas: tos, secreciones, broncoespasmo, neumonía, neumotórax.',
          },
          {
            type: 'heading',
            content: 'Alarmas de Bajo Volumen',
          },
          {
            type: 'text',
            content:
              'Indican que el volumen entregado es menor al esperado. ' +
              'Causas: fugas en el circuito, desconexión, extubación accidental.',
          },
          {
            type: 'heading',
            content: 'Alarmas de Apnea',
          },
          {
            type: 'text',
            content:
              'Se activan cuando el paciente no inicia respiraciones en modos espontáneos. ' +
              'Requiere verificación inmediata del drive respiratorio del paciente.',
          },
          {
            type: 'important',
            content:
              'Regla de oro: NUNCA silencies una alarma sin identificar y corregir la causa. Las alarmas salvan vidas.',
          },
        ],
      }),
    },
  });

  console.log(`  ✓ Module 2 created with ${3} lessons`);
  return module;
}

/**
 * Create Module 3: Configuración y Manejo Avanzado
 */
async function createModule3(prerequisiteModuleId: string) {
  console.log('📚 Creating Module 3: Configuración y Manejo Avanzado...');

  const module = await prisma.module.create({
    data: {
      title: 'Configuración y Manejo del Ventilador',
      description:
        'Domina las técnicas avanzadas de ventilación mecánica. Aprende a realizar el ajuste inicial del ventilador, ' +
        'cómo adaptar la configuración según diferentes patologías (SDRA, EPOC, asma), y las estrategias de ' +
        'ventilación protectora para minimizar la lesión pulmonar inducida por ventilador.',
      order: 3,
      category: 'CONFIGURATION',
      difficulty: 'ADVANCED',
      estimatedTime: 300,
      isActive: true,
    },
  });

  // Create prerequisite relationship
  await prisma.modulePrerequisite.create({
    data: {
      moduleId: module.id,
      prerequisiteId: prerequisiteModuleId,
    },
  });

  // Lesson 1: Ajuste Inicial
  await prisma.lesson.create({
    data: {
      moduleId: module.id,
      title: 'Ajuste Inicial del Ventilador',
      order: 1,
      estimatedTime: 100,
      aiGenerated: false,
      content: JSON.stringify({
        type: 'lesson',
        sections: [
          {
            type: 'text',
            title: 'Protocolo de Inicio',
            content:
              'El ajuste inicial correcto del ventilador es crucial para proporcionar soporte adecuado desde el primer momento. ' +
              'Sigue un enfoque sistemático y considera las características del paciente.',
          },
          {
            type: 'heading',
            content: 'Paso 1: Selección de Modalidad',
          },
          {
            type: 'text',
            content:
              'Elige la modalidad según la condición del paciente:\n' +
              '- Paciente sedado/paralizado: VCV o PCV\n' +
              '- Paciente con drive respiratorio: SIMV o PSV\n' +
              '- Destete: PSV con PEEP baja',
          },
          {
            type: 'heading',
            content: 'Paso 2: Configuración de Parámetros Iniciales',
          },
          {
            type: 'table',
            content: {
              headers: ['Parámetro', 'Valor Inicial', 'Rango Típico'],
              rows: [
                ['Vt', '6-8 ml/kg PP', '400-600 ml'],
                ['FR', '12-16 rpm', '10-20 rpm'],
                ['FiO2', '100%', 'Luego titular'],
                ['PEEP', '5 cmH2O', '5-15 cmH2O'],
                ['I:E', '1:2', '1:1.5 a 1:3'],
              ],
            },
          },
          {
            type: 'heading',
            content: 'Paso 3: Ajustes Según Gasometría',
          },
          {
            type: 'text',
            content:
              'Después de 15-30 minutos, obtén una gasometría arterial y ajusta:\n' +
              '- Si PaO2 < 60: Aumentar FiO2 o PEEP\n' +
              '- Si PaCO2 > 45: Aumentar Vt o FR\n' +
              '- Si PaCO2 < 35: Disminuir Vt o FR',
          },
          {
            type: 'important',
            content:
              'Nunca olvides: El objetivo es mantener oxigenación y ventilación adecuadas con la menor agresión pulmonar posible.',
          },
        ],
      }),
    },
  });

  // Lesson 2: Configuración por Patologías
  await prisma.lesson.create({
    data: {
      moduleId: module.id,
      title: 'Configuración por Patologías Específicas',
      order: 2,
      estimatedTime: 100,
      aiGenerated: false,
      content: JSON.stringify({
        type: 'lesson',
        sections: [
          {
            type: 'text',
            title: 'Ventilación Personalizada',
            content:
              'Diferentes patologías requieren estrategias ventilatorias específicas. Adapta tu configuración ' +
              'según la fisiopatología subyacente para optimizar resultados.',
          },
          {
            type: 'heading',
            content: 'Síndrome de Distrés Respiratorio Agudo (SDRA)',
          },
          {
            type: 'text',
            content:
              'El SDRA requiere ventilación protectora estricta para prevenir más daño pulmonar.',
          },
          {
            type: 'list',
            title: 'Estrategia en SDRA',
            items: [
              'Vt: 6 ml/kg peso predicho (puede bajar a 4 ml/kg)',
              'PEEP: 10-15 cmH2O (según tabla PEEP/FiO2)',
              'Presión plateau < 30 cmH2O',
              'Driving pressure < 15 cmH2O',
              'Permitir hipercapnia permisiva si es necesario',
              'Considerar prono si PaO2/FiO2 < 150',
            ],
          },
          {
            type: 'heading',
            content: 'Enfermedad Pulmonar Obstructiva Crónica (EPOC)',
          },
          {
            type: 'text',
            content:
              'En EPOC exacerbado, el objetivo principal es permitir tiempo espiratorio adecuado.',
          },
          {
            type: 'list',
            title: 'Estrategia en EPOC',
            items: [
              'FR baja (8-12 rpm) para permitir espiración completa',
              'Relación I:E de 1:3 o 1:4',
              'Monitorizar auto-PEEP',
              'PEEP externa: 80% del auto-PEEP',
              'Broncodilatadores optimizados',
            ],
          },
          {
            type: 'heading',
            content: 'Asma Severa',
          },
          {
            type: 'text',
            content:
              'El asma agudo grave requiere estrategia similar a EPOC pero con mayor énfasis en broncodilatación.',
          },
          {
            type: 'list',
            title: 'Estrategia en Asma',
            items: [
              'FR muy baja (6-10 rpm)',
              'Tiempo espiratorio prolongado',
              'Vt normal a alto (8-10 ml/kg)',
              'Evitar hiperinflación dinámica',
              'Hipercapnia permisiva (pH > 7.20)',
            ],
          },
          {
            type: 'warning',
            content:
              'En patologías obstructivas, la presión de plateau puede subestimar la presión alveolar real debido al atrapamiento aéreo.',
          },
        ],
      }),
    },
  });

  // Lesson 3: Estrategias de Protección Pulmonar
  await prisma.lesson.create({
    data: {
      moduleId: module.id,
      title: 'Estrategias de Protección Pulmonar',
      order: 3,
      estimatedTime: 100,
      aiGenerated: false,
      content: JSON.stringify({
        type: 'lesson',
        sections: [
          {
            type: 'text',
            title: 'Prevención de VILI',
            content:
              'La lesión pulmonar inducida por ventilador (VILI) es una complicación seria pero prevenible. ' +
              'Las estrategias de protección pulmonar han demostrado reducir mortalidad.',
          },
          {
            type: 'heading',
            content: 'Principios de Ventilación Protectora',
          },
          {
            type: 'list',
            title: 'Los 5 Pilares',
            items: [
              'Volumen corriente bajo (6-8 ml/kg peso predicho)',
              'Presión plateau < 30 cmH2O',
              'Driving pressure < 15 cmH2O',
              'PEEP adecuada para mantener reclutamiento',
              'FiO2 mínima efectiva',
            ],
          },
          {
            type: 'heading',
            content: 'Mecanismos de VILI',
          },
          {
            type: 'text',
            content:
              'La VILI ocurre por cuatro mecanismos principales:',
          },
          {
            type: 'list',
            items: [
              'Volutrauma: Sobredistensión alveolar',
              'Atelectrauma: Apertura/cierre repetitivo de alvéolos',
              'Barotrauma: Presiones excesivas',
              'Biotrauma: Respuesta inflamatoria sistémica',
            ],
          },
          {
            type: 'heading',
            content: 'Driving Pressure: El Marcador Clave',
          },
          {
            type: 'text',
            content:
              'El driving pressure (ΔP = Plateau - PEEP) es el mejor predictor de mortalidad en SDRA. ' +
              'Cada aumento de 1 cmH2O en ΔP aumenta mortalidad en 7%.',
          },
          {
            type: 'formula',
            content: 'Driving Pressure = Presión Plateau - PEEP',
          },
          {
            type: 'heading',
            content: 'Hipercapnia Permisiva',
          },
          {
            type: 'text',
            content:
              'En ocasiones, es necesario aceptar hipercapnia (PaCO2 > 45 mmHg) para mantener ventilación protectora. ' +
              'Generalmente se tolera hasta pH 7.20-7.25.',
          },
          {
            type: 'important',
            content:
              'Recuerda: La ventilación protectora puede salvar vidas. Los beneficios de evitar VILI superan ampliamente ' +
              'los riesgos de hipercapnia moderada.',
          },
          {
            type: 'heading',
            content: 'Checklist Diario de Ventilación Protectora',
          },
          {
            type: 'list',
            items: [
              '¿Vt ≤ 8 ml/kg peso predicho?',
              '¿Presión plateau < 30 cmH2O?',
              '¿Driving pressure < 15 cmH2O?',
              '¿PEEP optimizada?',
              '¿FiO2 < 60% si es posible?',
              '¿Considerar destete/extubación?',
            ],
          },
        ],
      }),
    },
  });

  console.log(`  ✓ Module 3 created with ${3} lessons`);
  return module;
}

/**
 * Main seed function
 */
async function main() {
  console.log('🌱 Starting database seed...\n');

  try {
    // Step 1: Clean database
    await cleanDatabase();
    console.log();

    // Step 2: Create users
    const { admin, students } = await createUsers();
    console.log();

    // Step 3: Create modules with lessons
    const module1 = await createModule1();
    const module2 = await createModule2(module1.id);
    const module3 = await createModule3(module2.id);
    console.log();

    // Get statistics
    const stats = {
      users: await prisma.user.count(),
      modules: await prisma.module.count(),
      lessons: await prisma.lesson.count(),
      quizzes: await prisma.quiz.count(),
      modulePrerequisites: await prisma.modulePrerequisite.count(),
    };

    // Print summary
    console.log('═'.repeat(60));
    console.log('✅ DATABASE SEEDED SUCCESSFULLY!');
    console.log('═'.repeat(60));
    console.log('\n📊 Summary:');
    console.log(`  • Users created: ${stats.users} (1 admin, ${students.length} students)`);
    console.log(`  • Modules created: ${stats.modules}`);
    console.log(`  • Lessons created: ${stats.lessons}`);
    console.log(`  • Quizzes created: ${stats.quizzes}`);
    console.log(`  • Module prerequisites: ${stats.modulePrerequisites}`);
    console.log('\n🔐 Admin Credentials:');
    console.log('  Email: admin@ventilab.com');
    console.log('  Password: Admin123');
    console.log('\n👨‍🎓 Student Credentials:');
    console.log('  Email: estudiante1@ventilab.com (or estudiante2, 3, 4)');
    console.log('  Password: Student123');
    console.log('\n💡 Next steps:');
    console.log('  1. Start the server: npm run dev');
    console.log('  2. Test the API: POST /api/auth/login');
    console.log('  3. Open Prisma Studio: npm run prisma:studio');
    console.log('═'.repeat(60));
  } catch (error) {
    console.error('\n❌ Error seeding database:', error);
    throw error;
  }
}

// Execute seed
main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
