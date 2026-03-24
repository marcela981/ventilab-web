/**
 * Módulos de Prerrequisitos
 * Estructura estática sin contenido pesado (el contenido va en BD/Prisma)
 *
 * Estos módulos son opcionales (mandatory: false) y sirven como
 * base de conocimiento antes de comenzar el nivel principiante.
 */

export const preRequisitosModules = {
  "respiratory-physiology": {
    id: "respiratory-physiology",
    title: "Fisiología Respiratoria",
    level: "prerequisitos",
    order: 1,
    duration: 150,
    prerequisites: [],
    mandatory: false,
    learningObjectives: [
      "Comprender los principios del intercambio gaseoso",
      "Analizar la mecánica de la ventilación espontánea",
      "Evaluar los factores que afectan la difusión alveolar"
    ],
    bloomLevel: "analizar",
    difficulty: "básico-intermedio",
    estimatedTime: "2.5 horas",
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
      }
    ]
  },
  "ventilation-principles": {
    id: "ventilation-principles",
    title: "Principios de Ventilación Mecánica",
    level: "prerequisitos",
    order: 2,
    duration: 180,
    prerequisites: [],
    mandatory: false,
    learningObjectives: [
      "Definir los objetivos de la ventilación mecánica",
      "Identificar las indicaciones y contraindicaciones",
      "Comprender los parámetros ventilatorios básicos",
      "Aplicar principios de seguridad en la configuración del ventilador"
    ],
    bloomLevel: "comprender",
    difficulty: "básico",
    estimatedTime: "3 horas",
    description: "Introducción a los principios fundamentales de la ventilación mecánica, incluyendo indicaciones, objetivos y parámetros básicos de configuración.",
    lessons: [
      {
        id: "vm-indications",
        title: "Indicaciones de Ventilación Mecánica",
        description: "Aprende cuándo y por qué se indica la ventilación mecánica, así como sus objetivos principales.",
        estimatedTime: 25,
        difficulty: "básico",
        order: 1,
        type: "reading"
      },
      {
        id: "basic-parameters",
        title: "Parámetros Ventilatorios Básicos",
        description: "Explora los parámetros fundamentales del ventilador y aprende a configurarlos correctamente.",
        estimatedTime: 40,
        difficulty: "básico",
        order: 2,
        type: "interactive"
      }
    ]
  }
};
