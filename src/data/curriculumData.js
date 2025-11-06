/**
 * Curriculum Data Structure for Mechanical Ventilation Learning Platform
 * Separated from visual components - pure data structure
 * Based on detailed research curriculum for mechanical ventilation
 *
 * HU-005: Integración con Componentes Existentes
 * Las lecciones ahora se importan desde archivos JSON individuales
 */

// Importar lecciones del módulo 01 - Fundamentos
import lessonRespiratoryAnatomy from './lessons/module-01-fundamentals/lesson-01-respiratory-anatomy.json';
import lessonRespiratoryPhysiology from './lessons/module-01-fundamentals/lesson-02-respiratory-physiology.json';
import lessonVentilationPrinciples from './lessons/module-01-fundamentals/lesson-03-ventilation-principles.json';

// Importar lecciones del módulo 02 - Intermedio
import lessonVolumeControl from './lessons/module-02-intermediate/lesson-01-volume-control.json';
import lessonPressureControl from './lessons/module-02-intermediate/lesson-02-pressure-control.json';
import lessonPSVMode from './lessons/module-02-intermediate/lesson-03-psv-mode.json';
import lessonSIMVMode from './lessons/module-02-intermediate/lesson-04-simv-mode.json';

// Importar lecciones del módulo 03 - Avanzado
import lessonARDSManagement from './lessons/module-03-advanced/lesson-01-ards-management.json';
import lessonCOPDManagement from './lessons/module-03-advanced/lesson-02-copd-management.json';
import lessonAsthmaCrisis from './lessons/module-03-advanced/lesson-03-asthma-crisis.json';
import lessonClinicalCases from './lessons/module-03-advanced/lesson-04-clinical-cases.json';

export const curriculumData = {
  levels: [
    {
      id: 'beginner',
      title: 'Nivel Principiante',
      description: 'Fundamentos fisiológicos y conceptos básicos de ventilación mecánica',
      color: '#4CAF50',
      totalModules: 3,
      estimatedDuration: '7.5 horas'
    },
    {
      id: 'intermediate',
      title: 'Nivel Intermedio',
      description: 'Modalidades ventilatorias y manejo de parámetros críticos',
      color: '#FF9800',
      totalModules: 4,
      estimatedDuration: '12 horas'
    },
    {
      id: 'advanced',
      title: 'Nivel Avanzado',
      description: 'Estrategias especializadas y casos clínicos complejos',
      color: '#F44336',
      totalModules: 4,
      estimatedDuration: '15 horas'
    }
  ],

  modules: {
    // ============================================
    // NIVEL PRINCIPIANTE - Fundamentos Fisiológicos
    // ============================================
    'respiratory-anatomy': {
      id: 'respiratory-anatomy',
      title: 'Anatomía del Sistema Respiratorio',
      level: 'beginner',
      order: 1,
      duration: 120, // minutos
      prerequisites: [],
      learningObjectives: [
        'Identificar las estructuras anatómicas del sistema respiratorio',
        'Comprender la función de cada componente anatómico',
        'Relacionar anatomía con fisiología respiratoria'
      ],
      bloomLevel: 'comprender',
      difficulty: 'básico',
      estimatedTime: '2 horas',
      lessons: [lessonRespiratoryAnatomy]
    },

    'respiratory-physiology': {
      id: 'respiratory-physiology',
      title: 'Fisiología Respiratoria',
      level: 'beginner',
      order: 2,
      duration: 150,
      prerequisites: ['respiratory-anatomy'],
      learningObjectives: [
        'Comprender los principios del intercambio gaseoso',
        'Analizar la mecánica de la ventilación',
        'Evaluar los factores que afectan la difusión'
      ],
      bloomLevel: 'analizar',
      difficulty: 'básico-intermedio',
      estimatedTime: '2.5 horas',
      lessons: [lessonRespiratoryPhysiology]
    },

    'ventilation-principles': {
      id: 'ventilation-principles',
      title: 'Principios de Ventilación Mecánica',
      level: 'beginner',
      order: 3,
      duration: 180,
      prerequisites: ['respiratory-physiology'],
      learningObjectives: [
        'Definir los objetivos de la ventilación mecánica',
        'Identificar las indicaciones y contraindicaciones',
        'Comprender los parámetros ventilatorios básicos'
      ],
      bloomLevel: 'comprender',
      difficulty: 'básico',
      estimatedTime: '3 horas',
      lessons: [lessonVentilationPrinciples]
    },

    // ============================================
    // NIVEL INTERMEDIO - Modalidades Ventilatorias
    // ============================================
    'volume-control': {
      id: 'volume-control',
      title: 'Ventilación Controlada por Volumen (VCV)',
      level: 'intermediate',
      order: 1,
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
      lessons: [lessonVolumeControl]
    },

    'pressure-control': {
      id: 'pressure-control',
      title: 'Ventilación Controlada por Presión (PCV)',
      level: 'intermediate',
      order: 2,
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
      lessons: [lessonPressureControl]
    },

    'psv-mode': {
      id: 'psv-mode',
      title: 'Ventilación con Soporte de Presión (PSV)',
      level: 'intermediate',
      order: 3,
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
      lessons: [lessonPSVMode]
    },

    'simv-mode': {
      id: 'simv-mode',
      title: 'Ventilación Mandatoria Intermitente Sincronizada (SIMV)',
      level: 'intermediate',
      order: 4,
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
      lessons: [lessonSIMVMode]
    },

    // ============================================
    // NIVEL AVANZADO - Estrategias Especializadas
    // ============================================
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
      lessons: [lessonARDSManagement]
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
      lessons: [lessonCOPDManagement]
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
      lessons: [lessonAsthmaCrisis]
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
      lessons: [lessonClinicalCases]
    }
  },

  // Metadatos adicionales
  metadata: {
    totalModules: 11,
    totalLessons: 11,
    estimatedTotalTime: '34.5 horas',
    lastUpdated: '2025-11-06',
    version: '2.0',
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

export const getModulesByLevel = (level) => {
  return Object.values(curriculumData.modules)
    .filter(module => module.level === level)
    .sort((a, b) => a.order - b.order);
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
