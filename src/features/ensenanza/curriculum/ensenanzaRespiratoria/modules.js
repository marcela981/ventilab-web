/**
 * Módulos de Enseñanza Respiratoria
 * Estructura estática sin contenido pesado (el contenido va en BD/Prisma)
 *
 * Niveles:
 *   beginner     → Fundamentos fisiológicos
 *   intermediate → Modalidades y parámetros ventilatorios
 *   advanced     → Estrategias especializadas y casos clínicos
 */

// ─── NIVEL PRINCIPIANTE ──────────────────────────────────────────────────────

const beginnerModules = {
  "module-01-fundamentals": {
    id: "module-01-fundamentals",
    title: "Fundamentos Fisiológicos y Respiratorios",
    level: "beginner",
    order: 1,
    duration: 180,
    prerequisites: [],
    learningObjectives: [
      "Comprender la mecánica respiratoria y la relación presión-volumen",
      "Analizar el intercambio gaseoso y los factores que lo afectan",
      "Interpretar gasometrías arteriales en el contexto de ventilación mecánica",
      "Identificar las variables de fase del ciclo respiratorio",
      "Reconocer los efectos sistémicos de la ventilación mecánica"
    ],
    bloomLevel: "comprender",
    difficulty: "básico",
    estimatedTime: "3 horas",
    lessons: [
      {
        id: "module-01-inversion-fisiologica",
        title: "La Inversión Fisiológica: De la Presión Negativa a la Positiva",
        description: "",
        estimatedTime: 45,
        difficulty: "intermediate",
        order: 1,
        type: "reading"
      },
      {
        id: "module-02-ecuacion-movimiento",
        title: "El Santo Grial – La Ecuación del Movimiento Respiratorio",
        description: "",
        estimatedTime: 50,
        difficulty: "intermediate",
        order: 2,
        type: "reading"
      },
      {
        id: "module-03-variables-fase",
        title: "La Lógica de la Máquina: Variables de Fase y el Ciclo Respiratorio",
        description: "",
        estimatedTime: 54,
        difficulty: "intermediate",
        order: 3,
        type: "reading"
      },
      {
        id: "module-04-modos-ventilatorios",
        title: "Taxonomía de los Modos: Volumen vs. Presión (Control y Asistencia)",
        description: "",
        estimatedTime: 114,
        difficulty: "intermediate",
        order: 4,
        type: "reading"
      },
      {
        id: "module-05-monitorizacion-grafica",
        title: "Monitorización Gráfica I: Escalares, Bucles y Asincronías básicas",
        description: "",
        estimatedTime: 480,
        difficulty: "intermediate",
        order: 5,
        type: "reading"
      },
      {
        id: "module-06-efectos-sistemicos",
        title: "Efectos Sistémicos y Lesión Inducida por la Ventilación (VILI): El precio de ventilar",
        description: "",
        estimatedTime: 600,
        difficulty: "intermediate",
        order: 6,
        type: "reading"
      }
    ]
  }
};

// ─── NIVEL INTERMEDIO ─────────────────────────────────────────────────────────

const intermediateModules = {
  "module-02-modalidades-parametros": {
    id: "module-02-modalidades-parametros",
    title: "Modalidades Ventilatorias y Parámetros",
    level: "intermediate",
    order: 1,
    duration: 240,
    prerequisites: ["module-01-fundamentals"],
    learningObjectives: [
      "Comprender las modalidades ventilatorias controladas por volumen y presión",
      "Dominar la configuración de parámetros ventilatorios",
      "Interpretar curvas ventilatorias y resolver asincronías",
      "Aplicar estrategias de ventilación protectora"
    ],
    bloomLevel: "aplicar",
    difficulty: "intermedio",
    estimatedTime: "4 horas",
    description: "Modalidades ventilatorias y manejo de parámetros críticos en ventilación mecánica",
    lessons: [
      {
        id: "lesson-01-volume-ventilation",
        title: "Ventilación Controlada por Volumen (VCV)",
        description: "",
        estimatedTime: 60,
        difficulty: "intermediate",
        order: 1,
        type: "reading"
      },
      {
        id: "lesson-02-pressure-controlled-ventilation",
        title: "Ventilación Controlada por Presión (PCV)",
        description: "",
        estimatedTime: 60,
        difficulty: "intermediate",
        order: 2,
        type: "reading"
      },
      {
        id: "lesson-03-pressure-support-ventilation",
        title: "Ventilación con Soporte de Presión (PSV)",
        description: "",
        estimatedTime: 60,
        difficulty: "intermediate",
        order: 3,
        type: "reading"
      },
      {
        id: "lesson-04-simv-destete-evidencia",
        title: "SIMV y Destete – Evidencia Clínica",
        description: "",
        estimatedTime: 60,
        difficulty: "intermediate",
        order: 4,
        type: "reading"
      }
    ]
  },
  "module-03-configuracion-avanzada": {
    id: "module-03-configuracion-avanzada",
    title: "Configuración Avanzada y Estrategias de Protección",
    level: "intermediate",
    order: 2,
    duration: 200,
    prerequisites: ["module-02-modalidades-parametros"],
    learningObjectives: [
      "Aplicar estrategias de protección pulmonar en SDRA",
      "Configurar parámetros para patologías específicas (EPOC, asma, neumonía)",
      "Implementar criterios y protocolos de destete ventilatorio",
      "Evaluar hipercapnia permisiva y bajo volumen tidal"
    ],
    bloomLevel: "aplicar",
    difficulty: "intermedio",
    estimatedTime: "3.5 horas",
    description: "Estrategias de configuración avanzada, protocolos por patología y criterios de destete",
    lessons: [
      {
        id: "lung-protective-ventilation",
        title: "Ventilación Protectora Pulmonar",
        description: "",
        estimatedTime: 40,
        difficulty: "intermediate",
        order: 1,
        type: "reading"
      },
      {
        id: "low-tidal-volume",
        title: "Bajo Volumen Tidal: Evidencia y Aplicación",
        description: "",
        estimatedTime: 35,
        difficulty: "intermediate",
        order: 2,
        type: "reading"
      },
      {
        id: "peep-strategies",
        title: "Estrategias de PEEP",
        description: "",
        estimatedTime: 35,
        difficulty: "intermediate",
        order: 3,
        type: "interactive"
      },
      {
        id: "permissive-hypercapnia",
        title: "Hipercapnia Permisiva",
        description: "",
        estimatedTime: 30,
        difficulty: "intermediate",
        order: 4,
        type: "reading"
      },
      {
        id: "readiness-criteria",
        title: "Criterios de Preparación para el Destete",
        description: "",
        estimatedTime: 30,
        difficulty: "intermediate",
        order: 5,
        type: "reading"
      },
      {
        id: "sbt-protocol",
        title: "Protocolo de Prueba de Respiración Espontánea (SBT)",
        description: "",
        estimatedTime: 30,
        difficulty: "intermediate",
        order: 6,
        type: "interactive"
      }
    ]
  }
};

// ─── NIVEL AVANZADO ───────────────────────────────────────────────────────────

const advancedModules = {
  "ards-management": {
    id: "ards-management",
    title: "Manejo de ARDS y Estrategias de Protección Pulmonar",
    level: "advanced",
    order: 1,
    duration: 240,
    prerequisites: ["module-03-configuracion-avanzada"],
    learningObjectives: [
      "Aplicar protocolo ARDSnet",
      "Implementar estrategias de protección pulmonar",
      "Manejar complicaciones del ARDS"
    ],
    bloomLevel: "sintetizar",
    difficulty: "avanzado",
    estimatedTime: "4 horas",
    lessons: [
      {
        id: "ardsnet-protocol",
        title: "Protocolo ARDSnet",
        description: "",
        estimatedTime: 45,
        difficulty: "advanced",
        order: 1,
        type: "reading"
      },
      {
        id: "sdra-protocol",
        title: "Manejo Clínico del SDRA: Caso Integrado",
        description: "",
        estimatedTime: 60,
        difficulty: "advanced",
        order: 2,
        type: "case-study"
      },
      {
        id: "lung-protection-simulation",
        title: "Simulación de Protección Pulmonar",
        description: "",
        estimatedTime: 60,
        difficulty: "advanced",
        order: 3,
        type: "simulation"
      }
    ]
  },
  "copd-management": {
    id: "copd-management",
    title: "Manejo Ventilatorio en EPOC",
    level: "advanced",
    order: 2,
    duration: 200,
    prerequisites: ["ards-management"],
    learningObjectives: [
      "Comprender las particularidades fisiopatológicas del EPOC",
      "Aplicar estrategias ventilatorias específicas para EPOC",
      "Manejar auto-PEEP e hiperinsuflación dinámica"
    ],
    bloomLevel: "sintetizar",
    difficulty: "avanzado",
    estimatedTime: "3.5 horas",
    lessons: [
      {
        id: "copd-physiology",
        title: "Fisiopatología del EPOC en Ventilación Mecánica",
        description: "",
        estimatedTime: 40,
        difficulty: "advanced",
        order: 1,
        type: "reading"
      },
      {
        id: "copd-protocol",
        title: "Protocolo Ventilatorio EPOC",
        description: "",
        estimatedTime: 40,
        difficulty: "advanced",
        order: 2,
        type: "reading"
      },
      {
        id: "copd-simulation",
        title: "Simulación EPOC: Auto-PEEP y Ajuste de Parámetros",
        description: "",
        estimatedTime: 60,
        difficulty: "advanced",
        order: 3,
        type: "simulation"
      }
    ]
  },
  "asthma-crisis": {
    id: "asthma-crisis",
    title: "Manejo de Crisis Asmática",
    level: "advanced",
    order: 3,
    duration: 180,
    prerequisites: ["copd-management"],
    learningObjectives: [
      "Identificar crisis asmática severa con indicación de intubación",
      "Aplicar ventilación permisiva en el paciente asmático",
      "Manejar complicaciones ventilatorias (hiperinsuflación, barotrauma)"
    ],
    bloomLevel: "sintetizar",
    difficulty: "avanzado",
    estimatedTime: "3 horas",
    lessons: [
      {
        id: "asthma-protocol",
        title: "Protocolo de Crisis Asmática",
        description: "",
        estimatedTime: 40,
        difficulty: "advanced",
        order: 1,
        type: "reading"
      },
      {
        id: "asthma-crisis-case",
        title: "Caso Clínico: Crisis Asmática Severa",
        description: "",
        estimatedTime: 60,
        difficulty: "advanced",
        order: 2,
        type: "case-study"
      }
    ]
  },
  "clinical-cases": {
    id: "clinical-cases",
    title: "Casos Clínicos Complejos",
    level: "advanced",
    order: 4,
    duration: 300,
    prerequisites: ["asthma-crisis"],
    learningObjectives: [
      "Integrar conocimientos en escenarios clínicos complejos",
      "Tomar decisiones ventilatorias fundamentadas en evidencia",
      "Manejar múltiples patologías simultáneas en el paciente crítico"
    ],
    bloomLevel: "evaluar",
    difficulty: "avanzado",
    estimatedTime: "5 horas",
    lessons: [
      {
        id: "complex-case-1",
        title: "Paciente con ARDS + Sepsis",
        description: "",
        estimatedTime: 60,
        difficulty: "advanced",
        order: 1,
        type: "case-study"
      },
      {
        id: "complex-case-2",
        title: "Paciente Post-Quirúrgico con Complicaciones",
        description: "",
        estimatedTime: 60,
        difficulty: "advanced",
        order: 2,
        type: "case-study"
      },
      {
        id: "pneumonia-protocol",
        title: "Neumonía Grave: Optimización Ventilatoria",
        description: "",
        estimatedTime: 50,
        difficulty: "advanced",
        order: 3,
        type: "case-study"
      }
    ]
  }
};

// ─── EXPORT UNIFICADO ─────────────────────────────────────────────────────────

export const respiratoriaModules = {
  ...beginnerModules,
  ...intermediateModules,
  ...advancedModules
};
