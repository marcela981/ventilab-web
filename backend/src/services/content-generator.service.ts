/**
 * Content Generator Service
 * Genera contenido educativo clínico en español para lecciones de ventilación mecánica
 * basado en el contexto proporcionado
 * 
 * REGLAS ESTRICTAS:
 * 1. Salida: objeto JSON con claves específicas
 * 2. Solo usa información del contexto proporcionado
 * 3. Para datos ausentes usa [[MISSING]]
 * 4. Referencias solo del contexto, o [[MISSING_REF]]
 */

export interface ContextData {
  topic: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  learningObjectives?: string[];
  keyPoints?: string[];
  parameters?: string[] | Record<string, any>;
  references?: string[];
  clinicalScenarios?: string[];
  caseStudies?: string[];
  ranges?: Record<string, number[]>;
  diagrams?: string[];
  videoUrl?: string;
  transcript?: string;
  tables?: string[];
  patientData?: Record<string, any>;
  complications?: string[];
  objectives?: string[];
  text?: string;
}

export interface QuizSection {
  type: 'quiz';
  order: number;
  question: string;
  options: [string, string, string, string];
  correctAnswer: string;
  explanation: string;
}

export interface TextSection {
  type: 'text';
  order: number;
  content: string; // Markdown
}

export interface ImageSection {
  type: 'image';
  order: number;
  description: string;
  suggestedPrompt: string; // Prompt para DALL·E
}

export interface VideoSection {
  type: 'video';
  order: number;
  url: string;
  description: string;
}

export type LessonSection = TextSection | ImageSection | VideoSection | QuizSection;

export interface LessonContent {
  title: string;
  summary: string; // 30-300 caracteres, 2-3 líneas
  estimatedTime: number; // 5-60 minutos
  sections: LessonSection[]; // Mínimo 3, con order consecutivos
  keyPoints: string[]; // Mínimo 2
  references: string[]; // Mínimo 1 del contexto, o ["[[MISSING_REF]]"]
}

/**
 * Genera contenido de lección basado en contexto proporcionado
 * IMPORTANTE: Solo usa información del contexto, no inventa datos
 */
export function generateLessonContent(context: ContextData): LessonContent {
  const { topic, level, text, keyPoints, references } = context;

  // Generar summary (30-300 caracteres, 2-3 líneas)
  const summary = generateSummary(context);

  // Generar secciones (mínimo 3)
  const sections = generateSections(context);

  // Generar puntos clave (mínimo 2)
  const generatedKeyPoints = generateKeyPoints(context);

  // Procesar referencias (mínimo 1 del contexto)
  const processedReferences = processReferences(context);

  // Calcular tiempo estimado (5-60 minutos)
  const estimatedTime = calculateEstimatedTime(sections);

  return {
    title: topic || '[[MISSING]]',
    summary,
    estimatedTime,
    sections,
    keyPoints: generatedKeyPoints,
    references: processedReferences
  };
}

/**
 * Genera summary de 2-3 líneas (30-300 caracteres)
 */
function generateSummary(context: ContextData): string {
  const { text, transcript, topic, level } = context;

  let summary = '';

  // Priorizar text o transcript
  if (text && text.length > 0) {
    summary = text.substring(0, 300);
  } else if (transcript && transcript.length > 0) {
    summary = transcript.substring(0, 300);
  } else if (topic) {
    // Generar summary básico según nivel
    const levelText = {
      'Beginner': 'Conceptos fundamentales y bases teóricas de',
      'Intermediate': 'Aplicación práctica y manejo clínico de',
      'Advanced': 'Estrategias avanzadas y casos complejos en'
    };
    summary = `${levelText[level] || 'Introducción a'} ${topic}.`;
  } else {
    summary = '[[MISSING]]';
  }

  // Asegurar longitud 30-300
  if (summary.length < 30 && summary !== '[[MISSING]]') {
    summary += ' Contenido educativo para profesionales de salud.';
  }
  if (summary.length > 300) {
    summary = summary.substring(0, 297) + '...';
  }

  return summary;
}

/**
 * Genera secciones (mínimo 3, order consecutivos)
 */
function generateSections(context: ContextData): LessonSection[] {
  const sections: LessonSection[] = [];
  let order = 1;

  // Sección 1: Introducción (text)
  sections.push({
    type: 'text',
    order: order++,
    content: generateIntroductionMarkdown(context)
  });

  // Sección 2: Conceptos clave (text)
  if (context.keyPoints && context.keyPoints.length > 0) {
    sections.push({
      type: 'text',
      order: order++,
      content: generateKeyConceptsMarkdown(context)
    });
  }

  // Sección 3: Parámetros clínicos (text si hay parámetros)
  if (context.parameters || context.ranges) {
    sections.push({
      type: 'text',
      order: order++,
      content: generateParametersMarkdown(context)
    });
  }

  // Sección adicional: Imagen (si hay diagramas o es apropiado)
  if (context.diagrams || context.topic) {
    sections.push({
      type: 'image',
      order: order++,
      description: `Diagrama ilustrativo de ${context.topic || 'concepto principal'}`,
      suggestedPrompt: generateImagePrompt(context)
    });
  }

  // Sección adicional: Video (si hay videoUrl)
  if (context.videoUrl) {
    sections.push({
      type: 'video',
      order: order++,
      url: context.videoUrl,
      description: context.transcript || `Video educativo sobre ${context.topic || 'el tema'}`
    });
  }

  // Sección adicional: Escenarios clínicos (text)
  if (context.clinicalScenarios && context.clinicalScenarios.length > 0) {
    sections.push({
      type: 'text',
      order: order++,
      content: generateClinicalScenariosMarkdown(context)
    });
  }

  // Sección adicional: Caso clínico (text)
  if (context.patientData) {
    sections.push({
      type: 'text',
      order: order++,
      content: generateCaseStudyMarkdown(context)
    });
  }

  // Última sección: Quiz (siempre al final)
  sections.push(generateQuizSection(context, order++));

  // Asegurar mínimo 3 secciones
  while (sections.length < 3) {
    sections.splice(sections.length - 1, 0, {
      type: 'text',
      order: sections.length,
      content: '## Información Adicional\n\n[[MISSING]]'
    });
  }

  // Reordenar order consecutivos
  sections.forEach((section, index) => {
    section.order = index + 1;
  });

  return sections;
}

/**
 * Genera contenido Markdown para introducción
 */
function generateIntroductionMarkdown(context: ContextData): string {
  const { text, transcript, topic, level } = context;

  let markdown = `## Introducción\n\n`;

  if (text) {
    markdown += text;
  } else if (transcript) {
    markdown += transcript;
  } else if (topic) {
    markdown += `En esta lección abordaremos ${topic}.`;
  } else {
    markdown += '[[MISSING]]';
  }

  return markdown;
}

/**
 * Genera contenido Markdown para conceptos clave
 */
function generateKeyConceptsMarkdown(context: ContextData): string {
  const { keyPoints } = context;

  let markdown = `## Conceptos Fundamentales\n\n`;

  if (keyPoints && keyPoints.length > 0) {
    keyPoints.forEach(point => {
      markdown += `- **${point}**\n`;
    });
  } else {
    markdown += '[[MISSING]]';
  }

  return markdown;
}

/**
 * Genera contenido Markdown para parámetros clínicos
 */
function generateParametersMarkdown(context: ContextData): string {
  const { parameters, ranges } = context;

  let markdown = `## Parámetros Clínicos\n\n`;

  if (parameters) {
    const paramArray = Array.isArray(parameters) ? parameters : Object.keys(parameters);
    markdown += `Los parámetros principales son:\n\n`;
    paramArray.forEach(param => {
      if (ranges && ranges[param]) {
        const [min, max] = ranges[param];
        markdown += `- **${param}**: ${min} - ${max}\n`;
      } else {
        markdown += `- **${param}**\n`;
      }
    });
  } else if (ranges) {
    markdown += `Rangos de referencia:\n\n`;
    Object.entries(ranges).forEach(([param, [min, max]]) => {
      markdown += `- **${param}**: ${min} - ${max}\n`;
    });
  } else {
    markdown += '[[MISSING]]';
  }

  return markdown;
}

/**
 * Genera contenido Markdown para escenarios clínicos
 */
function generateClinicalScenariosMarkdown(context: ContextData): string {
  const { clinicalScenarios } = context;

  let markdown = `## Escenarios Clínicos\n\n`;

  if (clinicalScenarios && clinicalScenarios.length > 0) {
    clinicalScenarios.forEach((scenario, idx) => {
      markdown += `${idx + 1}. ${scenario}\n`;
    });
  } else {
    markdown += '[[MISSING]]';
  }

  return markdown;
}

/**
 * Genera contenido Markdown para caso clínico
 */
function generateCaseStudyMarkdown(context: ContextData): string {
  const { patientData } = context;

  let markdown = `## Caso Clínico\n\n`;

  if (patientData) {
    Object.entries(patientData).forEach(([key, value]) => {
      const label = key.charAt(0).toUpperCase() + key.slice(1);
      markdown += `- **${label}**: ${value}\n`;
    });
  } else {
    markdown += '[[MISSING]]';
  }

  return markdown;
}

/**
 * Genera prompt para imagen (DALL·E compatible)
 */
function generateImagePrompt(context: ContextData): string {
  const { topic, level, diagrams } = context;

  if (diagrams && diagrams.length > 0) {
    return `Medical illustration showing ${topic}, professional diagram style, clear labels, educational`;
  }

  const levelStyle = {
    'Beginner': 'simple and clear diagram',
    'Intermediate': 'detailed medical illustration',
    'Advanced': 'complex clinical diagram with multiple elements'
  };

  return `${levelStyle[level] || 'medical diagram'} of ${topic || 'respiratory system'}, professional medical illustration style, anatomical accuracy, educational purpose, clear labeling`;
}

/**
 * Genera sección de quiz
 */
function generateQuizSection(context: ContextData, order: number): QuizSection {
  const { topic, parameters, ranges, clinicalScenarios, patientData, keyPoints } = context;

  let question = '';
  let options: [string, string, string, string] = ['[[MISSING]]', '[[MISSING]]', '[[MISSING]]', '[[MISSING]]'];
  let correctAnswer = '[[MISSING]]';
  let explanation = '[[MISSING]]';

  // Intentar generar pregunta basada en el contexto
  if (patientData && patientData.diagnosis) {
    // Pregunta basada en caso clínico
    question = `En un paciente con ${patientData.diagnosis}, ¿cuál es la estrategia inicial más apropiada?`;
    options = [
      'Ventilación protectora con Vt bajo',
      'Ventilación convencional con Vt normal',
      'Ventilación con presión alta',
      'Ventilación no invasiva'
    ];
    correctAnswer = options[0];
    explanation = `En casos de ${patientData.diagnosis}, se recomienda estrategia de protección pulmonar.`;
  } else if (parameters && ranges) {
    // Pregunta sobre parámetros
    const paramArray = Array.isArray(parameters) ? parameters : Object.keys(parameters);
    if (paramArray.length > 0) {
      const param = paramArray[0];
      question = `¿Cuál es el rango recomendado para ${param} en ${topic || 'ventilación mecánica'}?`;
      
      if (ranges[param]) {
        const [min, max] = ranges[param];
        const correct = `${min} - ${max}`;
        options = [
          correct,
          `${min - 5} - ${max - 5}`,
          `${min + 5} - ${max + 5}`,
          `${min * 2} - ${max * 2}`
        ];
        correctAnswer = correct;
        explanation = `El rango recomendado para ${param} es ${correct} según el contexto clínico.`;
      }
    }
  } else if (keyPoints && keyPoints.length >= 2) {
    // Pregunta sobre concepto clave
    question = `¿Cuál de los siguientes es un concepto fundamental de ${topic || 'este tema'}?`;
    options = [
      keyPoints[0],
      'Concepto no relacionado A',
      'Concepto no relacionado B',
      'Concepto no relacionado C'
    ];
    correctAnswer = keyPoints[0];
    explanation = `${keyPoints[0]} es uno de los conceptos fundamentales del tema.`;
  } else {
    // Pregunta genérica
    question = `¿Cuál es el objetivo principal de ${topic || 'la ventilación mecánica'}?`;
    options = [
      'Mantener intercambio gaseoso adecuado',
      'Aumentar la frecuencia respiratoria',
      'Reducir el volumen tidal',
      'Eliminar la respiración espontánea'
    ];
    correctAnswer = options[0];
    explanation = '[[MISSING]]';
  }

  return {
    type: 'quiz',
    order,
    question,
    options,
    correctAnswer,
    explanation
  };
}

/**
 * Genera puntos clave (mínimo 2)
 */
function generateKeyPoints(context: ContextData): string[] {
  const { keyPoints, learningObjectives, parameters } = context;

  let points: string[] = [];

  // Prioridad 1: keyPoints del contexto
  if (keyPoints && keyPoints.length > 0) {
    points = [...keyPoints];
  }

  // Prioridad 2: learningObjectives
  if (points.length < 2 && learningObjectives && learningObjectives.length > 0) {
    points = [...points, ...learningObjectives];
  }

  // Prioridad 3: parámetros
  if (points.length < 2 && parameters) {
    const paramArray = Array.isArray(parameters) ? parameters : Object.keys(parameters);
    points = [...points, ...paramArray.slice(0, 2)];
  }

  // Asegurar mínimo 2
  while (points.length < 2) {
    points.push('[[MISSING]]');
  }

  // Tomar solo los primeros 5 para no saturar
  return points.slice(0, 5);
}

/**
 * Procesa referencias (mínimo 1 del contexto)
 */
function processReferences(context: ContextData): string[] {
  const { references } = context;

  if (references && references.length > 0) {
    return references;
  }

  return ['[[MISSING_REF]]'];
}

/**
 * Calcula tiempo estimado (5-60 minutos)
 */
function calculateEstimatedTime(sections: LessonSection[]): number {
  let time = 0;

  sections.forEach(section => {
    switch (section.type) {
      case 'text':
        time += 5; // 5 min por sección de texto
        break;
      case 'image':
        time += 2; // 2 min para analizar imagen
        break;
      case 'video':
        time += 10; // 10 min para video
        break;
      case 'quiz':
        time += 3; // 3 min para quiz
        break;
    }
  });

  // Asegurar rango 5-60
  time = Math.max(5, Math.min(60, time));

  return time;
}

/**
 * Genera documento base: Fundamentos Fisiológicos y Respiratorios
 */
export function generatePhysiologyFoundations(context: ContextData): LessonContent {
  const enhancedContext: ContextData = {
    ...context,
    topic: 'Fundamentos Fisiológicos y Respiratorios',
    level: 'Beginner',
    keyPoints: context.keyPoints || [
      'Anatomía del sistema respiratorio',
      'Mecánica ventilatoria',
      'Intercambio gaseoso',
      'Control de la respiración'
    ]
  };

  return generateLessonContent(enhancedContext);
}

/**
 * Genera documento base: Principios de la Ventilación Mecánica
 */
export function generateVentilationPrinciples(context: ContextData): LessonContent {
  const enhancedContext: ContextData = {
    ...context,
    topic: 'Principios de la Ventilación Mecánica',
    level: 'Intermediate',
    keyPoints: context.keyPoints || [
      'Objetivos de la ventilación mecánica',
      'Indicaciones y contraindicaciones',
      'Parámetros ventilatorios básicos',
      'Modos ventilatorios fundamentales'
    ]
  };

  return generateLessonContent(enhancedContext);
}

/**
 * Genera documento base: Configuración y Manejo del Ventilador
 */
export function generateVentilatorConfiguration(context: ContextData): LessonContent {
  const enhancedContext: ContextData = {
    ...context,
    topic: 'Configuración y Manejo del Ventilador',
    level: 'Advanced',
    keyPoints: context.keyPoints || [
      'Modos ventilatorios avanzados',
      'Configuración según patología',
      'Monitorización y ajustes',
      'Manejo de complicaciones'
    ]
  };

  return generateLessonContent(enhancedContext);
}

export default {
  generateLessonContent,
  generatePhysiologyFoundations,
  generateVentilationPrinciples,
  generateVentilatorConfiguration
};
