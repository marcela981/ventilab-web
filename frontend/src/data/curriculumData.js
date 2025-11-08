/**
 * Curriculum Data Structure for Mechanical Ventilation Learning Platform
 * Separated from visual components - pure data structure
 * Based on detailed research curriculum for mechanical ventilation
 */

// =============================================================================
// IMPORTAR LECCIONES DESDE ARCHIVOS JSON
// =============================================================================

// Módulo 01: Fundamentos Fisiológicos y Respiratorios
import lesson01Mechanics from './lessons/module-01-fundamentals/lesson-01-respiratory-mechanics.json';
import lesson02GasExchange from './lessons/module-01-fundamentals/lesson-02-gas-exchange.json';
import lesson03ArterialBloodGas from './lessons/module-01-fundamentals/lesson-03-arterial-blood-gas.json';

export const curriculumData = {
  levels: [
    {
      id: 'beginner',
      title: 'Nivel Principiante',
      description: 'Fundamentos fisiológicos y conceptos básicos de ventilación mecánica',
      color: '#4CAF50',
      emoji: '🌱',
      // totalModules is now computed dynamically via selectors
      estimatedDuration: '20-25 horas'
    },
    {
      id: 'intermediate',
      title: 'Nivel Intermedio',
      description: 'Modalidades ventilatorias y manejo de parámetros críticos',
      color: '#FF9800',
      emoji: '🎯',
      // totalModules is now computed dynamically via selectors
      estimatedDuration: '30-35 horas'
    },
    {
      id: 'advanced',
      title: 'Nivel Avanzado',
      description: 'Estrategias especializadas y casos clínicos complejos',
      color: '#F44336',
      emoji: '🚀',
      // totalModules is now computed dynamically via selectors
      estimatedDuration: '25-30 horas'
    }
  ],

  modules: {
    // NIVEL PRINCIPIANTE - Fundamentos Fisiológicos y Respiratorios
    // Módulo principal que agrupa todas las lecciones de fundamentos
    'module-01-fundamentals': {
      id: 'module-01-fundamentals',
      title: 'Fundamentos Fisiológicos y Respiratorios',
      level: 'beginner',
      order: 1,
      duration: 180, // minutos (suma de todas las lecciones)
      prerequisites: [],
      learningObjectives: [
        'Comprender la mecánica respiratoria y la relación presión-volumen',
        'Analizar el intercambio gaseoso y los factores que lo afectan',
        'Interpretar gasometrías arteriales en el contexto de ventilación mecánica'
      ],
      bloomLevel: 'comprender',
      difficulty: 'básico',
      estimatedTime: '3 horas',
      // ✅ CONECTAR LECCIONES REALES DESDE JSON
      lessons: [
        {
          id: 'respiratory-mechanics',
          title: lesson01Mechanics.title || 'Mecánica Respiratoria',
          description: lesson01Mechanics.description || '',
          estimatedTime: lesson01Mechanics.estimatedTime || 75,
          difficulty: lesson01Mechanics.difficulty || 'intermediate',
          order: lesson01Mechanics.order || 1,
          lessonData: lesson01Mechanics
        },
        {
          id: 'gas-exchange',
          title: lesson02GasExchange.title || 'Intercambio Gaseoso',
          description: lesson02GasExchange.description || 'Principios del intercambio gaseoso alveolar',
          estimatedTime: lesson02GasExchange.estimatedTime || 85,
          difficulty: lesson02GasExchange.difficulty || 'intermediate',
          order: lesson02GasExchange.order || 2,
          lessonData: lesson02GasExchange
        },
        {
          id: 'arterial-blood-gas',
          title: lesson03ArterialBloodGas.title || 'Gasometría Arterial',
          description: lesson03ArterialBloodGas.description || 'Interpretación de gasometrías arteriales en ventilación mecánica',
          estimatedTime: lesson03ArterialBloodGas.estimatedTime || 60,
          difficulty: lesson03ArterialBloodGas.difficulty || 'intermediate',
          order: lesson03ArterialBloodGas.order || 3,
          lessonData: lesson03ArterialBloodGas
        }
      ]
    },

    // Módulo de Anatomía (comentado - archivo JSON no existe aún)
    // 'respiratory-anatomy': {
    //   id: 'respiratory-anatomy',
    //   title: 'Anatomía del Sistema Respiratorio',
    //   level: 'beginner',
    //   order: 1,
    //   duration: 120, // minutos
    //   prerequisites: [],
    //   learningObjectives: [
    //     'Identificar las estructuras anatómicas del sistema respiratorio',
    //     'Comprender la función de cada componente anatómico',
    //     'Relacionar anatomía con fisiología respiratoria'
    //   ],
    //   bloomLevel: 'comprender',
    //   difficulty: 'básico',
    //   estimatedTime: '45 min',
    //   lessons: []
    // },

    'respiratory-physiology': {
      id: 'respiratory-physiology',
      title: 'Fisiología Respiratoria',
      level: 'beginner',
      order: 2,
      duration: 150,
      prerequisites: [], // Removed 'respiratory-anatomy' as it doesn't exist
      learningObjectives: [
        'Comprender los principios del intercambio gaseoso',
        'Analizar la mecánica de la ventilación',
        'Evaluar los factores que afectan la difusión'
      ],
      bloomLevel: 'analizar',
      difficulty: 'básico-intermedio',
      estimatedTime: '2.5 horas',
      // ✅ Usar lecciones JSON reales
      lessons: [
        {
          id: 'respiratory-mechanics',
          title: lesson01Mechanics.title || 'Mecánica Respiratoria',
          description: lesson01Mechanics.description || '',
          estimatedTime: lesson01Mechanics.estimatedTime || 75,
          difficulty: lesson01Mechanics.difficulty || 'intermediate',
          order: lesson01Mechanics.order || 1,
          lessonData: lesson01Mechanics
        },
        {
          id: 'gas-exchange',
          title: lesson02GasExchange.title || 'Intercambio Gaseoso',
          description: lesson02GasExchange.description || 'Principios del intercambio gaseoso alveolar',
          estimatedTime: lesson02GasExchange.estimatedTime || 85,
          difficulty: lesson02GasExchange.difficulty || 'intermediate',
          order: lesson02GasExchange.order || 2,
          lessonData: lesson02GasExchange
        },
        {
          id: 'arterial-blood-gas',
          title: lesson03ArterialBloodGas.title || 'Gasometría Arterial',
          description: lesson03ArterialBloodGas.description || 'Interpretación de gasometrías arteriales en ventilación mecánica',
          estimatedTime: lesson03ArterialBloodGas.estimatedTime || 60,
          difficulty: lesson03ArterialBloodGas.difficulty || 'intermediate',
          order: lesson03ArterialBloodGas.order || 3,
          lessonData: lesson03ArterialBloodGas
        }
      ],
      quiz: {
        id: 'physiology-quiz',
        type: 'formative',
        questions: [
          {
            id: 'q1',
            type: 'mcq',
            question: '¿Qué factor NO afecta la difusión de gases?',
            options: [
              'Grosor de la membrana alveolar',
              'Superficie de intercambio',
              'Velocidad del flujo sanguíneo',
              'Gradiente de presión parcial'
            ],
            correct: 2,
            explanation: 'La velocidad del flujo sanguíneo afecta la perfusión, no la difusión.'
          }
        ]
      }
    },

    'ventilation-principles': {
      id: 'ventilation-principles',
      title: 'Principios de Ventilación Mecánica',
      level: 'beginner',
      order: 3,
      duration: 180, // minutos (suma de todas las lecciones)
      prerequisites: ['respiratory-physiology'],
      learningObjectives: [
        'Definir los objetivos de la ventilación mecánica',
        'Identificar las indicaciones y contraindicaciones',
        'Comprender los parámetros ventilatorios básicos',
        'Aplicar principios de seguridad en la configuración del ventilador'
      ],
      bloomLevel: 'comprender',
      difficulty: 'básico',
      estimatedTime: '3 horas',
      description: 'Introducción a los principios fundamentales de la ventilación mecánica, incluyendo indicaciones, objetivos y parámetros básicos de configuración.',
      lessons: [
        {
          id: 'vm-indications',
          type: 'reading',
          title: 'Indicaciones de Ventilación Mecánica',
          description: 'Aprende cuándo y por qué se indica la ventilación mecánica, así como sus objetivos principales.',
          estimatedTime: 25, // Convertir duration a estimatedTime
          difficulty: 'básico',
          order: 1,
          duration: 25,
          content: {
            text: 'La ventilación mecánica se indica cuando...',
            caseStudies: ['fallo respiratorio agudo', 'coma', 'shock'],
            references: ['ARDSnet guidelines']
          }
        },
        {
          id: 'basic-parameters',
          type: 'interactive',
          title: 'Parámetros Ventilatorios Básicos',
          description: 'Explora los parámetros fundamentales del ventilador y aprende a configurarlos correctamente.',
          estimatedTime: 40, // Convertir duration a estimatedTime
          difficulty: 'básico',
          order: 2,
          duration: 40,
          content: {
            interactiveType: 'parameter-explorer',
            parameters: ['Vt', 'f', 'FiO2', 'PEEP'],
            ranges: {
              'Vt': [6, 8],
              'f': [12, 20],
              'FiO2': [21, 100],
              'PEEP': [5, 15]
            }
          }
        }
      ]
    },

    // NIVEL INTERMEDIO - Modalidades Ventilatorias
    'principles-mechanical-ventilation': {
      id: 'principles-mechanical-ventilation',
      title: 'Principios de Ventilación Mecánica',
      level: 'intermediate',
      order: 1,
      duration: 180, // minutos
      prerequisites: ['ventilation-principles'],
      learningObjectives: [
        'Comprender las diferencias entre modalidades controladas por volumen y por presión',
        'Identificar las indicaciones clínicas para cada modalidad ventilatoria',
        'Interpretar curvas de presión, flujo y volumen en tiempo real',
        'Reconocer y resolver alarmas del ventilador',
        'Seleccionar parámetros ventilatorios apropiados según la patología'
      ],
      bloomLevel: 'aplicar',
      difficulty: 'intermedio',
      estimatedTime: '3 horas',
      lessons: [
        {
          id: 'ventilation-modes-vcv-pcv',
          type: 'reading',
          title: 'Modalidades VCV y PCV',
          duration: 30,
          content: {
            text: '',
            keyPoints: [],
            documentId: 'documento-2-principios-ventilacion'
          }
        },
        {
          id: 'ventilation-modes-assisted',
          type: 'reading',
          title: 'Modalidades Asistidas SIMV y PSV',
          duration: 35,
          content: {
            text: '',
            keyPoints: [],
            documentId: 'documento-2-principios-ventilacion'
          }
        },
        {
          id: 'ventilation-parameters',
          type: 'interactive',
          title: 'Parámetros Ventilatorios Fundamentales',
          duration: 25,
          content: {
            interactiveType: 'parameter-explorer',
            checkpoints: [
              'Volumen tidal (VT)',
              'Frecuencia respiratoria (FR)',
              'PEEP',
              'FiO2',
              'Relación I:E'
            ],
            documentId: 'documento-2-principios-ventilacion'
          }
        },
        {
          id: 'waveform-interpretation',
          type: 'video',
          title: 'Interpretación de Curvas Ventilatorias',
          duration: 40,
          content: {
            videoUrl: '/videos/waveform-interpretation.mp4',
            transcript: '',
            keyPoints: [
              'Curva Presión-Tiempo',
              'Curva Flujo-Tiempo',
              'Curva Volumen-Tiempo',
              'Lazo Presión-Volumen'
            ],
            documentId: 'documento-2-principios-ventilacion'
          }
        },
        {
          id: 'alarm-management',
          type: 'interactive',
          title: 'Sistema de Alarmas y Resolución',
          duration: 30,
          content: {
            interactiveType: 'alarm-troubleshooting',
            checkpoints: [
              'Alarmas de presión',
              'Alarmas de volumen',
              'Alarmas de apnea',
              'Alarmas técnicas',
              'Protocolo de resolución'
            ],
            documentId: 'documento-2-principios-ventilacion'
          }
        },
        {
          id: 'mode-comparison-practice',
          type: 'practice',
          title: 'Práctica Comparación de Modalidades',
          duration: 20,
          content: {
            practiceType: 'mode-comparison',
            scenarios: [
              'SDRA severo',
              'EPOC exacerbado',
              'Destete ventilatorio',
              'Postoperatorio sin complicaciones'
            ],
            documentId: 'documento-2-principios-ventilacion'
          }
        }
      ]
    },

    'volume-control': {
      id: 'volume-control',
      title: 'Ventilación Controlada por Volumen (VCV)',
      level: 'intermediate',
      order: 2,
      duration: 200,
      prerequisites: ['ventilation-principles'],
      learningObjectives: [
        'Comprender el funcionamiento de VCV',
        'Configurar parámetros en VCV',
        'Identificar ventajas y desventajas de VCV'
      ],
      bloomLevel: 'aplicar',
      difficulty: 'intermedio',
      estimatedTime: '3.5 horas',
      lessons: [
        {
          id: 'vcv-mechanics',
          type: 'video',
          title: 'Mecánica de VCV',
          duration: 30,
          content: {
            videoUrl: '/videos/vcv-mechanics.mp4',
            transcript: 'En VCV, el ventilador entrega un volumen fijo...',
            keyPoints: ['Volumen constante', 'Presión variable', 'Flujo cuadrado']
          }
        },
        {
          id: 'vcv-simulation',
          type: 'simulation',
          title: 'Simulación VCV',
          duration: 50,
          content: {
            simulationType: 'vcv-ventilator',
            objectives: ['Configurar VCV', 'Observar curvas de presión'],
            clinicalScenarios: ['paciente con ARDS', 'paciente con EPOC']
          }
        }
      ],
      quiz: {
        id: 'vcv-quiz',
        type: 'formative',
        questions: [
          {
            id: 'q1',
            type: 'case-based',
            question: 'Paciente de 70 años con ARDS. Peso ideal 70kg. ¿Qué volumen tidal inicial recomendarías?',
            caseContext: 'Paciente intubado, compliance disminuida, requiere ventilación protectora',
            options: ['420-490ml', '500-600ml', '350-420ml', '600-700ml'],
            correct: 2,
            explanation: 'En ARDS se recomienda Vt de 6ml/kg peso ideal (6x70=420ml) para ventilación protectora.'
          }
        ]
      }
    },

    'pressure-control': {
      id: 'pressure-control',
      title: 'Ventilación Controlada por Presión (PCV)',
      level: 'intermediate',
      order: 3,
      duration: 180,
      prerequisites: ['volume-control'],
      learningObjectives: [
        'Dominar la configuración de PCV',
        'Comprender la relación presión-volumen en PCV',
        'Manejar complicaciones de PCV'
      ],
      bloomLevel: 'aplicar',
      difficulty: 'intermedio',
      estimatedTime: '3 horas',
      lessons: [
        {
          id: 'pcv-mechanics',
          type: 'video',
          title: 'Mecánica de PCV',
          duration: 35,
          content: {
            videoUrl: '/videos/pcv-mechanics.mp4',
            transcript: 'En PCV, el ventilador mantiene una presión constante...',
            keyPoints: ['Presión constante', 'Volumen variable', 'Flujo decelerado']
          }
        },
        {
          id: 'pcv-simulation',
          type: 'simulation',
          title: 'Simulación PCV',
          duration: 45,
          content: {
            simulationType: 'pcv-ventilator',
            objectives: ['Configurar PCV', 'Ajustar según compliance'],
            clinicalScenarios: ['paciente con compliance variable', 'monitoreo de volumen']
          }
        }
      ]
    },

    'psv-mode': {
      id: 'psv-mode',
      title: 'Ventilación con Soporte de Presión (PSV)',
      level: 'intermediate',
      order: 4,
      duration: 160,
      prerequisites: ['pressure-control'],
      learningObjectives: [
        'Comprender el funcionamiento de PSV',
        'Configurar niveles de soporte apropiados',
        'Monitorear eficacia de PSV'
      ],
      bloomLevel: 'aplicar',
      difficulty: 'intermedio',
      estimatedTime: '2.5 horas',
      lessons: [
        {
          id: 'psv-mechanics',
          type: 'interactive',
          title: 'Mecánica de PSV',
          duration: 30,
          content: {
            interactiveType: 'psv-explorer',
            parameters: ['PS', 'Trigger', 'Cycle-off'],
            scenarios: ['destete', 'soporte parcial']
          }
        }
      ]
    },

    'simv-mode': {
      id: 'simv-mode',
      title: 'Ventilación Mandatoria Intermitente Sincronizada (SIMV)',
      level: 'intermediate',
      order: 5,
      duration: 170,
      prerequisites: ['psv-mode'],
      learningObjectives: [
        'Comprender SIMV y sus aplicaciones',
        'Configurar parámetros en SIMV',
        'Manejar destete con SIMV'
      ],
      bloomLevel: 'aplicar',
      difficulty: 'intermedio',
      estimatedTime: '3 horas',
      lessons: [
        {
          id: 'simv-mechanics',
          type: 'video',
          title: 'Mecánica de SIMV',
          duration: 40,
          content: {
            videoUrl: '/videos/simv-mechanics.mp4',
            transcript: 'SIMV combina respiraciones mandatorias y espontáneas...',
            keyPoints: ['Respiración mandatoria', 'Respiración espontánea', 'Sincronización']
          }
        }
      ]
    },

    // NIVEL AVANZADO - Estrategias Especializadas
    'ards-management': {
      id: 'ards-management',
      title: 'Manejo de ARDS y Estrategias de Protección Pulmonar',
      level: 'advanced',
      order: 1,
      duration: 240,
      prerequisites: ['simv-mode'],
      learningObjectives: [
        'Aplicar protocolo ARDSnet',
        'Implementar estrategias de protección pulmonar',
        'Manejar complicaciones del ARDS'
      ],
      bloomLevel: 'sintetizar',
      difficulty: 'avanzado',
      estimatedTime: '4 horas',
      lessons: [
        {
          id: 'ardsnet-protocol',
          type: 'reading',
          title: 'Protocolo ARDSnet',
          duration: 30,
          content: {
            text: 'El protocolo ARDSnet establece...',
            tables: ['tabla-ventilacion-protectora'],
            references: ['ARDSnet Study Group (2000)']
          }
        },
        {
          id: 'lung-protection',
          type: 'simulation',
          title: 'Simulación de Protección Pulmonar',
          duration: 60,
          content: {
            simulationType: 'lung-protection',
            objectives: ['Aplicar Vt 6ml/kg', 'Optimizar PEEP', 'Limitar presión plateau'],
            clinicalScenarios: ['ARDS leve', 'ARDS moderado', 'ARDS severo']
          }
        }
      ],
      quiz: {
        id: 'ards-quiz',
        type: 'case-based',
        questions: [
          {
            id: 'q1',
            type: 'case-based',
            question: 'Paciente de 45 años, 80kg, con ARDS moderado. Compliance 25ml/cmH2O. ¿Cuál es la estrategia inicial?',
            caseContext: 'PaO2/FiO2 = 150, presión plateau = 28 cmH2O',
            options: [
              'Aumentar PEEP a 15 cmH2O',
              'Reducir Vt a 6ml/kg y PEEP 8-10 cmH2O',
              'Cambiar a PCV con PIP 30 cmH2O',
              'Mantener configuración actual'
            ],
            correct: 1,
            explanation: 'En ARDS moderado, se debe aplicar ventilación protectora: Vt 6ml/kg (480ml) y PEEP 8-10 cmH2O según protocolo ARDSnet.'
          }
        ]
      }
    },

    'copd-management': {
      id: 'copd-management',
      title: 'Manejo Ventilatorio en EPOC',
      level: 'advanced',
      order: 2,
      duration: 200,
      prerequisites: ['ards-management'],
      learningObjectives: [
        'Comprender las particularidades del EPOC',
        'Aplicar estrategias ventilatorias específicas',
        'Manejar auto-PEEP y hiperinsuflación'
      ],
      bloomLevel: 'sintetizar',
      difficulty: 'avanzado',
      estimatedTime: '3.5 horas',
      lessons: [
        {
          id: 'copd-physiology',
          type: 'video',
          title: 'Fisiopatología del EPOC',
          duration: 35,
          content: {
            videoUrl: '/videos/copd-physiology.mp4',
            transcript: 'El EPOC se caracteriza por...',
            keyPoints: ['Obstrucción crónica', 'Auto-PEEP', 'Hiperinsuflación']
          }
        },
        {
          id: 'copd-simulation',
          type: 'simulation',
          title: 'Simulación EPOC',
          duration: 50,
          content: {
            simulationType: 'copd-ventilation',
            objectives: ['Detectar auto-PEEP', 'Optimizar Ti/Te', 'Manejar hiperinsuflación'],
            clinicalScenarios: ['EPOC agudizado', 'asma severo']
          }
        }
      ]
    },

    'asthma-crisis': {
      id: 'asthma-crisis',
      title: 'Manejo de Crisis Asmática',
      level: 'advanced',
      order: 3,
      duration: 180,
      prerequisites: ['copd-management'],
      learningObjectives: [
        'Identificar crisis asmática severa',
        'Aplicar ventilación permisiva',
        'Manejar complicaciones ventilatorias'
      ],
      bloomLevel: 'sintetizar',
      difficulty: 'avanzado',
      estimatedTime: '3 horas',
      lessons: [
        {
          id: 'asthma-crisis',
          type: 'case-study',
          title: 'Caso Clínico: Crisis Asmática',
          duration: 45,
          content: {
            caseType: 'interactive-case',
            patientData: {
              age: 35,
              weight: 70,
              diagnosis: 'Crisis asmática severa',
              gasometry: 'pH 7.25, PaCO2 65, PaO2 85'
            },
            objectives: ['Establecer ventilación permisiva', 'Manejar auto-PEEP', 'Monitorear barotrauma']
          }
        }
      ]
    },

    'clinical-cases': {
      id: 'clinical-cases',
      title: 'Casos Clínicos Complejos',
      level: 'advanced',
      order: 4,
      duration: 300,
      prerequisites: ['asthma-crisis'],
      learningObjectives: [
        'Integrar conocimientos en casos complejos',
        'Tomar decisiones clínicas fundamentadas',
        'Manejar múltiples patologías simultáneas'
      ],
      bloomLevel: 'evaluar',
      difficulty: 'avanzado',
      estimatedTime: '5 horas',
      lessons: [
        {
          id: 'complex-case-1',
          type: 'case-study',
          title: 'Paciente con ARDS + Sepsis',
          duration: 60,
          content: {
            caseType: 'complex-scenario',
            patientData: {
              age: 60,
              weight: 75,
              diagnosis: 'ARDS + Sepsis + Fallo multiorgánico',
              complications: ['Shock séptico', 'Fallo renal', 'Coagulopatía']
            },
            objectives: ['Ventilación protectora', 'Manejo hemodinámico', 'Coordinación multidisciplinaria']
          }
        },
        {
          id: 'complex-case-2',
          type: 'case-study',
          title: 'Paciente Post-Quirúrgico con Complicaciones',
          duration: 60,
          content: {
            caseType: 'post-surgical',
            patientData: {
              age: 70,
              weight: 80,
              diagnosis: 'Post-CABG con complicaciones respiratorias',
              complications: ['Atelectasia', 'Derrame pleural', 'Arritmias']
            },
            objectives: ['Manejo post-quirúrgico', 'Prevención de complicaciones', 'Optimización ventilatoria']
          }
        }
      ]
    }
  },

  // Metadatos adicionales
  // NOTE: totalModules, totalLessons, and estimatedTotalTime are now computed dynamically
  // Use getCurriculumMetadata() from data/curriculum/selectors.js instead
  metadata: {
    // totalModules: computed via getCurriculumMetadata()
    // totalLessons: computed via getCurriculumMetadata()
    // estimatedTotalTime: computed via getCurriculumMetadata()
    lastUpdated: '2024-01-15',
    version: '1.0',
    difficultyProgression: {
      beginner: 'Conceptos fundamentales y fisiología básica',
      intermediate: 'Modalidades ventilatorias y parámetros',
      advanced: 'Estrategias especializadas y casos complejos'
    },
    assessmentStrategy: {
      formative: 'Quizzes formativos después de cada módulo',
      summative: 'Evaluaciones al final de cada nivel',
      practical: 'Simulaciones y casos clínicos'
    }
  }
};

// Funciones auxiliares para acceder a los datos
export const getModuleById = (moduleId) => {
  return curriculumData.modules[moduleId] || null;
};

// NOTE: getModulesByLevel is now also exported from selectors.js
// Keeping this for backward compatibility, but prefer using selectors
export const getModulesByLevel = (level) => {
  if (!curriculumData?.modules) {
    return [];
  }
  return Object.values(curriculumData.modules)
    .filter(module => module.level === level)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
};

export const getPrerequisites = (moduleId) => {
  const module = getModuleById(moduleId);
  if (!module) return [];
  
  return module.prerequisites.map(prereqId => getModuleById(prereqId)).filter(Boolean);
};

export const getNextModule = (moduleId) => {
  const module = getModuleById(moduleId);
  if (!module) return null;
  
  const modulesInLevel = getModulesByLevel(module.level);
  const currentIndex = modulesInLevel.findIndex(m => m.id === moduleId);
  
  if (currentIndex < modulesInLevel.length - 1) {
    return modulesInLevel[currentIndex + 1];
  }
  
  return null;
};

export const getLevelProgress = (completedModules) => {
  const progress = {};
  
  curriculumData.levels.forEach(level => {
    const modulesInLevel = getModulesByLevel(level.id);
    const completedInLevel = completedModules.filter(id => {
      const module = getModuleById(id);
      return module && module.level === level.id;
    });
    
    progress[level.id] = {
      total: modulesInLevel.length,
      completed: completedInLevel.length,
      percentage: (completedInLevel.length / modulesInLevel.length) * 100
    };
  });
  
  return progress;
};

export default curriculumData;
