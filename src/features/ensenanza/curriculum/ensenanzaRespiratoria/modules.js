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
        type: "reading",
        metadata: { allowEmpty: true }
      },
      {
        id: "module-02-ecuacion-movimiento",
        title: "El Santo Grial – La Ecuación del Movimiento Respiratorio",
        description: "",
        estimatedTime: 50,
        difficulty: "intermediate",
        order: 2,
        type: "reading",
        metadata: { allowEmpty: true }
      },
      {
        id: "module-03-variables-fase",
        title: "La Lógica de la Máquina: Variables de Fase y el Ciclo Respiratorio",
        description: "",
        estimatedTime: 54,
        difficulty: "intermediate",
        order: 3,
        type: "reading",
        metadata: { allowEmpty: true }
      },
      {
        id: "module-04-modos-ventilatorios",
        title: "Taxonomía de los Modos: Volumen vs. Presión (Control y Asistencia)",
        description: "",
        estimatedTime: 114,
        difficulty: "intermediate",
        order: 4,
        type: "reading",
        metadata: { allowEmpty: true }
      },
      {
        id: "module-05-monitorizacion-grafica",
        title: "Monitorización Gráfica I: Escalares, Bucles y Asincronías básicas",
        description: "",
        estimatedTime: 480,
        difficulty: "intermediate",
        order: 5,
        type: "reading",
        metadata: { allowEmpty: true }
      },
      {
        id: "module-06-efectos-sistemicos",
        title: "Efectos Sistémicos y Lesión Inducida por la Ventilación (VILI): El precio de ventilar",
        description: "",
        estimatedTime: 600,
        difficulty: "intermediate",
        order: 6,
        type: "reading",
        metadata: { allowEmpty: true }
      }
    ]
  }
};

// ─── NIVEL INTERMEDIO ─────────────────────────────────────────────────────────
// IDs de módulo y lección coinciden con los definidos en ventylab-server/prisma/seed.ts.
// metadata.allowEmpty = true → permite navegar aunque el objeto de lección
// no tenga secciones embebidas (el contenido se carga desde el JSON).

const intermediateModules = {
  "module-01-vcv-vs-pcv": {
    id: "module-01-vcv-vs-pcv",
    title: "VCV vs PCV en el Paciente de Alta Complejidad",
    level: "intermediate",
    order: 1,
    duration: 75,
    prerequisites: [],
    learningObjectives: [
      "Seleccionar estratégicamente el modo ventilatorio en el paciente crítico obeso",
      "Comparar fisiopatología de VCV y PCV en el contexto clínico",
      "Programar ventilación por peso predicho y optimización de PEEP"
    ],
    bloomLevel: "aplicar",
    difficulty: "intermedio",
    estimatedTime: "1.25 horas",
    description: "Selección estratégica del modo ventilatorio en el paciente crítico obeso: fisiopatología, análisis comparativo VCV/PCV y optimización de PEEP.",
    lessons: [
      {
        id: "lesson-vcv-vs-pcv",
        title: "Ventilación por Control de Volumen (VCV) vs. Control de Presión (PCV) en el Paciente de Alta Complejidad",
        description: "",
        estimatedTime: 75,
        difficulty: "intermediate",
        order: 1,
        type: "reading",
        metadata: { allowEmpty: true }
      }
    ]
  },
  "module-02-peep-optimizar-oxigenacion": {
    id: "module-02-peep-optimizar-oxigenacion",
    title: "PEEP: Fisiopatología y Optimización de la Oxigenación",
    level: "intermediate",
    order: 2,
    duration: 80,
    prerequisites: ["module-01-vcv-vs-pcv"],
    learningObjectives: [
      "Distinguir PEEP extrínseca e intrínseca en el paciente obeso",
      "Aplicar estrategias de optimización del intercambio gaseoso",
      "Ejecutar maniobras de reclutamiento alveolar"
    ],
    bloomLevel: "aplicar",
    difficulty: "intermedio",
    estimatedTime: "1.3 horas",
    description: "Fisiopatología de PEEP extrínseca e intrínseca en el paciente obeso, estrategias de optimización del intercambio gaseoso y maniobras de reclutamiento alveolar.",
    lessons: [
      {
        id: "lesson-peep-optimizar-oxigenacion",
        title: "PEEP: fisiopatología y optimización de la oxigenación en el paciente obeso",
        description: "",
        estimatedTime: 80,
        difficulty: "intermediate",
        order: 1,
        type: "reading",
        metadata: { allowEmpty: true }
      }
    ]
  },
  "module-03-soporte-psv-cpap": {
    id: "module-03-soporte-psv-cpap",
    title: "Soporte Ventilatorio: PSV, CPAP y Protección Pulmonar",
    level: "intermediate",
    order: 3,
    duration: 75,
    prerequisites: ["module-02-peep-optimizar-oxigenacion"],
    learningObjectives: [
      "Integrar PSV y CPAP en la gestión ventilatoria del obeso",
      "Aplicar protección pulmonar con titulación de PEEP",
      "Ejecutar maniobras de reclutamiento en el postoperatorio"
    ],
    bloomLevel: "aplicar",
    difficulty: "intermedio",
    estimatedTime: "1.25 horas",
    description: "Gestión ventilatoria del paciente obeso integrando PSV, CPAP postoperatorio y estrategias de protección pulmonar.",
    lessons: [
      {
        id: "lesson-soporte-psv-cpap",
        title: "Soporte ventilatorio en el paciente obeso: PSV, CPAP y estrategias de protección pulmonar",
        description: "",
        estimatedTime: 75,
        difficulty: "intermediate",
        order: 1,
        type: "reading",
        metadata: { allowEmpty: true }
      }
    ]
  },
  "module-04-duales-simv": {
    id: "module-04-duales-simv",
    title: "Modos Duales y SIMV: Fisiopatología Avanzada",
    level: "intermediate",
    order: 4,
    duration: 80,
    prerequisites: ["module-03-soporte-psv-cpap"],
    learningObjectives: [
      "Comprender fisiopatología avanzada del paciente crítico obeso",
      "Aplicar ventilación protectora con modos duales y SIMV",
      "Usar marcos pedagógicos de andamiaje para competencia autónoma"
    ],
    bloomLevel: "aplicar",
    difficulty: "intermedio",
    estimatedTime: "1.3 horas",
    description: "Fundamentos fisiopatológicos del paciente crítico obeso con estrategias de ventilación protectora y modos duales/SIMV.",
    lessons: [
      {
        id: "lesson-duales-simv",
        title: "Modos duales y SIMV: fisiopatología avanzada, ventilación protectora y andamiaje pedagógico",
        description: "",
        estimatedTime: 80,
        difficulty: "intermediate",
        order: 1,
        type: "reading",
        metadata: { allowEmpty: true }
      }
    ]
  },
  "module-05-graficas-fine-tuning": {
    id: "module-05-graficas-fine-tuning",
    title: "Monitorización Gráfica y Fine Tuning",
    level: "intermediate",
    order: 5,
    duration: 80,
    prerequisites: ["module-04-duales-simv"],
    learningObjectives: [
      "Interpretar monitorización gráfica de precisión en el obeso",
      "Calcular y optimizar Driving Pressure",
      "Ejecutar titulación de PEEP decremental con maniobras de reclutamiento"
    ],
    bloomLevel: "aplicar",
    difficulty: "intermedio",
    estimatedTime: "1.3 horas",
    description: "Monitorización gráfica de precisión y ajuste fino del ventilador en el paciente obeso: Driving Pressure, maniobras de reclutamiento y titulación de PEEP decremental.",
    lessons: [
      {
        id: "lesson-graficas-fine-tuning",
        title: "Monitorización gráfica y Fine Tuning en el paciente con obesidad",
        description: "",
        estimatedTime: 80,
        difficulty: "intermediate",
        order: 1,
        type: "reading",
        metadata: { allowEmpty: true }
      }
    ]
  },
  "module-06-avanzado-evaluacion-destete": {
    id: "module-06-avanzado-evaluacion-destete",
    title: "Mecánicas Avanzadas y Evaluación para el Destete",
    level: "intermediate",
    order: 6,
    duration: 85,
    prerequisites: ["module-05-graficas-fine-tuning"],
    learningObjectives: [
      "Analizar fisiopatología restrictiva extrapulmonar avanzada",
      "Aplicar estrategias de protección alveolar basadas en evidencia (PROBESE, IMPROVE, LOV-ED)",
      "Evaluar criterios clínicos para el inicio del destete ventilatorio"
    ],
    bloomLevel: "aplicar",
    difficulty: "intermedio",
    estimatedTime: "1.4 horas",
    description: "Fisiopatología restrictiva extrapulmonar avanzada con estrategias de protección alveolar basadas en evidencia y evaluación para el destete.",
    lessons: [
      {
        id: "lesson-avanzado-evaluacion-destete",
        title: "Mecánicas avanzadas y evaluación para el destete en el paciente obeso",
        description: "",
        estimatedTime: 85,
        difficulty: "intermediate",
        order: 1,
        type: "reading",
        metadata: { allowEmpty: true }
      }
    ]
  }
};

// ─── NIVEL AVANZADO ───────────────────────────────────────────────────────────
// IDs de módulo y lección coinciden con los definidos en ventylab-server/prisma/seed.ts.
// metadata.allowEmpty = true → permite navegar aunque el objeto de lección
// no tenga secciones embebidas (el contenido se carga desde el JSON).

const advancedModules = {
  "module-01-vili-ventilacion-protectora": {
    id: "module-01-vili-ventilacion-protectora",
    title: "VILI y Ventilación Protectora en el Paciente con Obesidad",
    level: "advanced",
    order: 1,
    duration: 85,
    prerequisites: [],
    learningObjectives: [
      "Sintetizar la interacción entre obesidad y mecánica ventilatoria para mitigar el VILI",
      "Aplicar estrategias de ventilación protectora adaptadas al paciente obeso",
      "Programar titulación LOV-ED y gestión postoperatoria"
    ],
    bloomLevel: "sintetizar",
    difficulty: "avanzado",
    estimatedTime: "1.4 horas",
    description: "Síntesis de la interacción entre obesidad y mecánica ventilatoria para mitigar VILI mediante estrategias de ventilación protectora adaptadas.",
    lessons: [
      {
        id: "lesson-vili-ventilacion-protectora",
        title: "VILI y ventilación protectora en el paciente con obesidad",
        description: "",
        estimatedTime: 85,
        difficulty: "advanced",
        order: 1,
        type: "reading",
        metadata: { allowEmpty: true }
      }
    ]
  },
  "module-02-monitorizacion-alto-nivel": {
    id: "module-02-monitorizacion-alto-nivel",
    title: "Monitorización de Alto Nivel: Driving Pressure y Poder Mecánico",
    level: "advanced",
    order: 2,
    duration: 90,
    prerequisites: ["module-01-vili-ventilacion-protectora"],
    learningObjectives: [
      "Integrar la monitorización dinámica de Driving Pressure",
      "Aplicar el concepto de Poder Mecánico como suma de vectores de lesión",
      "Ejecutar titulación granular de PEEP en el paciente obeso"
    ],
    bloomLevel: "sintetizar",
    difficulty: "avanzado",
    estimatedTime: "1.5 horas",
    description: "Monitorización dinámica de Driving Pressure como predictor de protección pulmonar, titulación granular de PEEP y concepto de Poder Mecánico.",
    lessons: [
      {
        id: "lesson-monitorizacion-alto-nivel",
        title: "Monitorización de alto nivel: Driving Pressure y Poder Mecánico",
        description: "",
        estimatedTime: 90,
        difficulty: "advanced",
        order: 1,
        type: "reading",
        metadata: { allowEmpty: true }
      }
    ]
  },
  "module-03-advertencias-asincronias": {
    id: "module-03-advertencias-asincronias",
    title: "Advertencias, Asincronías y Situaciones Complejas",
    level: "advanced",
    order: 3,
    duration: 90,
    prerequisites: ["module-02-monitorizacion-alto-nivel"],
    learningObjectives: [
      "Detectar asincronías por PEEPi en el paciente obeso",
      "Resolver situaciones complejas con programación avanzada",
      "Ejecutar maniobras de reclutamiento progresivas en escalera"
    ],
    bloomLevel: "sintetizar",
    difficulty: "avanzado",
    estimatedTime: "1.5 horas",
    description: "Resolución de situaciones complejas: detección de asincronías por PEEPi, programación avanzada y optimización cognitiva avanzada.",
    lessons: [
      {
        id: "lesson-advertencias-asincronias",
        title: "Advertencias, asincronías y resolución de situaciones complejas",
        description: "",
        estimatedTime: 90,
        difficulty: "advanced",
        order: 1,
        type: "reading",
        metadata: { allowEmpty: true }
      }
    ]
  },
  "module-04-destete-complejo-vmni": {
    id: "module-04-destete-complejo-vmni",
    title: "Destete Ventilatorio Complejo y VMNI en el Paciente con Obesidad",
    level: "advanced",
    order: 4,
    duration: 90,
    prerequisites: ["module-03-advertencias-asincronias"],
    learningObjectives: [
      "Aplicar evidencia PROBESE/PROVHILO/IMPROVE en el destete del obeso",
      "Gestionar rebote REM de AOS y VMNI/CPAP profiláctica",
      "Detectar SDRA postoperatorio en el paciente obeso crítico"
    ],
    bloomLevel: "sintetizar",
    difficulty: "avanzado",
    estimatedTime: "1.5 horas",
    description: "Destete complejo del paciente obeso crítico: fisiopatología restrictiva, evidencia PROBESE/PROVHILO/IMPROVE, VMNI/CPAP profiláctica y detección de SDRA.",
    lessons: [
      {
        id: "lesson-destete-complejo-vmni",
        title: "Destete ventilatorio complejo y uso de VMNI en el paciente con obesidad",
        description: "",
        estimatedTime: 90,
        difficulty: "advanced",
        order: 1,
        type: "reading",
        metadata: { allowEmpty: true }
      }
    ]
  },
  "module-05-obesidad-sedentarismo": {
    id: "module-05-obesidad-sedentarismo",
    title: "Ventilación en Obesidad y Sedentarismo: Patologías Avanzadas",
    level: "advanced",
    order: 5,
    duration: 90,
    prerequisites: ["module-04-destete-complejo-vmni"],
    learningObjectives: [
      "Analizar epidemiología crítica de la obesidad y mecánica vertical vs. supino",
      "Aplicar programación con PBW y gestión avanzada de PEEP",
      "Manejar comorbilidades AOS/SDRA con las 5 Recomendaciones de Oro"
    ],
    bloomLevel: "sintetizar",
    difficulty: "avanzado",
    estimatedTime: "1.5 horas",
    description: "Epidemiología crítica de la obesidad, mecánica vertical vs. supino, programación con PBW, gestión avanzada de PEEP y comorbilidades AOS/SDRA.",
    lessons: [
      {
        id: "lesson-obesidad-sedentarismo",
        title: "Ventilación en el paciente con obesidad y sedentarismo: perspectiva de patologías avanzadas",
        description: "",
        estimatedTime: 90,
        difficulty: "advanced",
        order: 1,
        type: "reading",
        metadata: { allowEmpty: true }
      }
    ]
  },
  "module-06-epoc-asma-fumadores": {
    id: "module-06-epoc-asma-fumadores",
    title: "Estrategias en Enfermedades Obstructivas: EPOC, Asma y Fumadores",
    level: "advanced",
    order: 6,
    duration: 90,
    prerequisites: ["module-05-obesidad-sedentarismo"],
    learningObjectives: [
      "Analizar epidemiología OCDE y 5 impactos críticos sobre mecánica pulmonar",
      "Aplicar tabla LOV-ED en enfermedades obstructivas con obesidad",
      "Implementar prevención nutricional APEPOC"
    ],
    bloomLevel: "sintetizar",
    difficulty: "avanzado",
    estimatedTime: "1.5 horas",
    description: "Estrategias ventilatorias en enfermedades obstructivas con obesidad: epidemiología OCDE, 5 impactos críticos, tabla LOV-ED y prevención nutricional APEPOC.",
    lessons: [
      {
        id: "lesson-epoc-asma-fumadores",
        title: "Estrategias en enfermedades obstructivas: EPOC, asma y fumadores",
        description: "",
        estimatedTime: 90,
        difficulty: "advanced",
        order: 1,
        type: "reading",
        metadata: { allowEmpty: true }
      }
    ]
  },
  "module-07-sdra": {
    id: "module-07-sdra",
    title: "SDRA en el Paciente Obeso: Ventilación Protectora Avanzada",
    level: "advanced",
    order: 7,
    duration: 95,
    prerequisites: ["module-06-epoc-asma-fumadores"],
    learningObjectives: [
      "Analizar SDRA sobreañadido al obeso con epidemiología OMS/ENSANUT",
      "Aplicar PEEPi posicional (Pankow et al.) y debate PROBESE",
      "Manejar controversia FiO₂ >80% y segunda maniobra de reapertura"
    ],
    bloomLevel: "sintetizar",
    difficulty: "avanzado",
    estimatedTime: "1.6 horas",
    description: "SDRA sobreañadido al paciente obeso: epidemiología OMS/ENSANUT, PEEPi posicional, debate PROBESE, controversia FiO₂ y segunda maniobra de reapertura.",
    lessons: [
      {
        id: "lesson-sdra",
        title: "SDRA en el paciente obeso: ventilación protectora avanzada y monitoreo de alta precisión",
        description: "",
        estimatedTime: 95,
        difficulty: "advanced",
        order: 1,
        type: "reading",
        metadata: { allowEmpty: true }
      }
    ]
  },
  "module-08-recuperacion-proteccion": {
    id: "module-08-recuperacion-proteccion",
    title: "Protección Extrema: Sinergia entre Fisiología Respiratoria y Arquitectura Cognitiva",
    level: "advanced",
    order: 8,
    duration: 95,
    prerequisites: ["module-07-sdra"],
    learningObjectives: [
      "Integrar paradigma de protección extrema como personalización absoluta",
      "Aplicar tabla dual de PEEP LOV-ED vs. Extreme Protection",
      "Reconocer alerta para mujeres de baja estatura y hábitos APEPOC"
    ],
    bloomLevel: "evaluar",
    difficulty: "avanzado",
    estimatedTime: "1.6 horas",
    description: "Paradigma de protección extrema: tabla dual PEEP LOV-ED vs. Extreme Protection, alerta para mujeres de baja estatura y hábitos APEPOC.",
    lessons: [
      {
        id: "lesson-recuperacion-proteccion",
        title: "Protección extrema: sinergia entre fisiología respiratoria y arquitectura cognitiva",
        description: "",
        estimatedTime: 95,
        difficulty: "advanced",
        order: 1,
        type: "reading",
        metadata: { allowEmpty: true }
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
