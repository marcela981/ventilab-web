/**
 * Módulos del track VentyLab
 * Aprendizaje de la plataforma: metodología, simulador y casos clínicos.
 *
 * Niveles:
 *   ventylab-principiante → Historia, fisiología aplicada y componentes
 *   ventylab-intermedio   → Programación de modos y VNI/destete
 *   ventylab-avanzado     → Raciocinio clínico e innovación tecnológica
 *
 * Los IDs de módulo y lección coinciden con los definidos en prisma/seed.ts.
 * metadata.allowEmpty = true → permite navegar aunque el objeto de lección
 * no tenga secciones embebidas (el contenido se carga desde el JSON).
 */

// ─── PRINCIPIANTE ────────────────────────────────────────────────────────────

const ventylabPrincipiante = {
  'ventylab-module-01-historia-fisiologia': {
    id: 'ventylab-module-01-historia-fisiologia',
    title: 'Historia y Fisiología Aplicada',
    level: 'ventylab-principiante',
    track: 'ventylab',
    order: 1,
    duration: 75,
    prerequisites: [],
    learningObjectives: [
      'Explicar la transición desde la recepción pasiva hacia el Aprendizaje Autodirigido (SDL).',
      'Describir la arquitectura jerárquica de memoria y su rol en la consolidación.',
      'Aplicar estrategias de recuperación (retrieval practice) para fortalecer el rastro mnémico.',
      'Diferenciar práctica espaciada, entrelazado y efecto de prueba.',
      'Reconocer las fases del Aprendizaje Basado en Equipos (TBL).',
      'Optimizar la lectura científica con el método de tres pasadas.',
    ],
    bloomLevel: 'apply',
    difficulty: 'beginner',
    estimatedTime: '1.25 horas',
    description: 'Historia de la educación médica y fisiología aplicada al aprendizaje con estrategias SDL/TBL y recuperación espaciada.',
    lessons: [
      {
        id: 'vl-historia-fisiologia-aplicada',
        title: 'Historia y fisiología aplicada: SDL/TBL y estrategias de recuperación',
        description: 'Integra contexto histórico, neurociencia del aprendizaje y estrategias basadas en la recuperación.',
        estimatedTime: 75,
        difficulty: 'intermediate',
        order: 1,
        type: 'reading',
        metadata: { allowEmpty: true },
      },
    ],
  },

  'ventylab-module-02-ventilador-componentes': {
    id: 'ventylab-module-02-ventilador-componentes',
    title: 'El Ventilador y sus Componentes',
    level: 'ventylab-principiante',
    track: 'ventylab',
    order: 2,
    duration: 70,
    prerequisites: ['ventylab-module-01-historia-fisiologia'],
    learningObjectives: [
      'Explicar cómo el aprendizaje autodirigido funciona como un panel de control.',
      'Describir la arquitectura de memoria y su relación con la consolidación.',
      'Aplicar el método de las tres pasadas para leer sin saturación.',
      'Implementar principios de recuperación activa y práctica espaciada con Anki/Leitner.',
      'Reconocer el ciclo del TBL y su rol con accountability y clarificación.',
      'Entender por qué la estructura JSON facilita la interoperabilidad semántica.',
    ],
    bloomLevel: 'apply',
    difficulty: 'beginner',
    estimatedTime: '1.2 horas',
    description: 'Metáfora del ventilador para integrar autonomía, lectura activa, recuperación espaciada y soporte colaborativo TBL.',
    lessons: [
      {
        id: 'vl-ventilador-componentes',
        title: 'El Ventilador y sus Componentes: Aprendizaje autodirigido con SDL/TBL',
        description: 'Usa la metáfora del ventilador para conectar autonomía, memoria, recuperación y TBL.',
        estimatedTime: 70,
        difficulty: 'intermediate',
        order: 1,
        type: 'reading',
        metadata: { allowEmpty: true },
      },
    ],
  },
};

// ─── INTERMEDIO ───────────────────────────────────────────────────────────────

const ventylabIntermedio = {
  'ventylab-module-03-programacion-modos': {
    id: 'ventylab-module-03-programacion-modos',
    title: 'Programación de Modos Clásicos',
    level: 'ventylab-intermedio',
    track: 'ventylab',
    order: 1,
    duration: 65,
    prerequisites: [],
    learningObjectives: [
      'Sintetizar la transición de datos crudos a conocimiento consolidado mediante LTP.',
      'Estandarizar la gestión de información educativa con JSON para interoperabilidad.',
      'Implementar el algoritmo de las tres pasadas como protocolo de ingesta de alta fidelidad.',
      'Aplicar principios de memoria y buffers biológicos para comprender límites del procesamiento.',
      'Reconocer el ciclo del TBL como entorno seguro de práctica.',
      'Entender por qué parsear y validar JSON habilita automatización y escalabilidad.',
    ],
    bloomLevel: 'apply',
    difficulty: 'intermediate',
    estimatedTime: '1.1 horas',
    description: 'Arquitectura del aprendizaje activo y estructuración con JSON: recuperación, memoria y estandarización para herramientas como Anki y flujos TBL.',
    lessons: [
      {
        id: 'vl-programacion-modos-clasicos',
        title: 'Arquitectura del Aprendizaje Activo y Estructuración con JSON (Programación de modos clásicos)',
        description: 'Organiza el aprendizaje activo como un sistema: recuperación, memoria y JSON.',
        estimatedTime: 65,
        difficulty: 'intermediate',
        order: 1,
        type: 'reading',
        metadata: { allowEmpty: true },
      },
    ],
  },

  'ventylab-module-04-vni-destete': {
    id: 'ventylab-module-04-vni-destete',
    title: 'Ventilación No Invasiva y Destete',
    level: 'ventylab-intermedio',
    track: 'ventylab',
    order: 2,
    duration: 68,
    prerequisites: ['ventylab-module-03-programacion-modos'],
    learningObjectives: [
      'Explicar por qué el aprendizaje autodirigido es crítico para dominar protocolos de VNI y destete.',
      'Describir la arquitectura de memoria aplicada al razonamiento clínico en destete.',
      'Aplicar el método de las tres pasadas a literatura sobre VNI, asincronía y weaning.',
      'Usar práctica espaciada, interleaving y recuperación para retener criterios clínicos.',
      'Reconocer el rol del TBL y la simulación como entornos seguros de práctica.',
      'Entender cómo JSON, Python, Docling y jq aportan interoperabilidad al currículo.',
    ],
    bloomLevel: 'apply',
    difficulty: 'intermediate',
    estimatedTime: '1.1 horas',
    description: 'Guía maestra de estrategias de aprendizaje para VNI y destete con SDL, neurobiología, lectura activa y TBL/simulación.',
    lessons: [
      {
        id: 'vl-vni-destete',
        title: 'Guía maestra de estrategias de aprendizaje para ventilación no invasiva y destete',
        description: 'Transforma la formación en VNI y Destete desde recepción pasiva hacia gestión autodirigida.',
        estimatedTime: 68,
        difficulty: 'intermediate',
        order: 1,
        type: 'reading',
        metadata: { allowEmpty: true },
      },
    ],
  },
};

// ─── AVANZADO ─────────────────────────────────────────────────────────────────

const ventylabAvanzado = {
  'ventylab-module-05-raciocinio-clinico': {
    id: 'ventylab-module-05-raciocinio-clinico',
    title: 'Raciocinio Clínico en Patologías Críticas',
    level: 'ventylab-avanzado',
    track: 'ventylab',
    order: 1,
    duration: 72,
    prerequisites: [],
    learningObjectives: [
      'Explicar cómo la limitación de la memoria de trabajo condiciona el juicio clínico bajo estrés en UCI.',
      'Relacionar LTP y conocimiento encapsulado con razonamiento clínico fluido en presentaciones atípicas.',
      'Aplicar el método de las tres pasadas a literatura de medicina crítica.',
      'Usar práctica espaciada, recuperación encubierta y entrelazado para diagnósticos diferenciales complejos.',
      'Reconocer el rol de TBL, simulación y debriefing en la disminución del error clínico.',
      'Entender por qué JSON, Docling y jq permiten convertir protocolos en soporte consultable.',
    ],
    bloomLevel: 'apply',
    difficulty: 'advanced',
    estimatedTime: '1.2 horas',
    description: 'Fundamentos neurobiológicos del juicio clínico, lectura activa, recuperación espaciada y TBL/simulación para patologías críticas.',
    lessons: [
      {
        id: 'vl-raciocinio-clinico-patologias',
        title: 'Raciocinio clínico en patologías críticas: neurobiología, recuperación y arquitectura de datos',
        description: 'Razonamiento clínico consolidado para resistir la presión extrema en UCI.',
        estimatedTime: 72,
        difficulty: 'advanced',
        order: 1,
        type: 'reading',
        metadata: { allowEmpty: true },
      },
    ],
  },

  'ventylab-module-06-innovacion-tecnologia': {
    id: 'ventylab-module-06-innovacion-tecnologia',
    title: 'Innovación, Tecnología y Gestión del Aprendizaje',
    level: 'ventylab-avanzado',
    track: 'ventylab',
    order: 2,
    duration: 88,
    prerequisites: ['ventylab-module-05-raciocinio-clinico'],
    learningObjectives: [
      'Explicar cómo la teoría de la carga cognitiva condiciona el diseño instruccional en medicina.',
      'Aplicar el método de las tres pasadas para convertir lectura clínica en procesamiento crítico.',
      'Usar recuperación activa, práctica espaciada y entrelazado para mejorar retención diagnóstica.',
      'Comprender cómo Anki y algoritmos como SuperMemo 2.0 optimizan el almacenamiento factual.',
      'Reconocer el rol de TBL, simulación y SDL en el aprendizaje colaborativo y reflexivo.',
      'Entender por qué JSON, Python/Docling y jq son herramientas clave para gestión clínica escalable.',
    ],
    bloomLevel: 'apply',
    difficulty: 'advanced',
    estimatedTime: '1.5 horas',
    description: 'Neurobiología del aprendizaje, lectura activa, recuperación espaciada, Anki, TBL y gestión técnica con JSON/Python/jq.',
    lessons: [
      {
        id: 'vl-innovacion-tecnologia-gestion',
        title: 'Innovación, tecnología y gestión del aprendizaje clínico',
        description: 'Integra neurobiología, Anki, TBL, simulación y datos estructurados para una práctica eficiente.',
        estimatedTime: 88,
        difficulty: 'advanced',
        order: 1,
        type: 'reading',
        metadata: { allowEmpty: true },
      },
    ],
  },
};

// ─── Export ───────────────────────────────────────────────────────────────────

export const ventylabModules = {
  ...ventylabPrincipiante,
  ...ventylabIntermedio,
  ...ventylabAvanzado,
};
