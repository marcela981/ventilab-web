/**
 * Lesson Improvement Service
 * Mejora contenido de lecciones existentes según tipo de mejora solicitado
 * 
 * TIPOS DE MEJORA:
 * - simplify: Simplificar contenido (reducir complejidad)
 * - expand: Expandir/profundizar contenido
 * - add_examples: Agregar más ejemplos clínicos
 * - update_references: Actualizar referencias bibliográficas
 * 
 * REGLAS:
 * - Solo usar información del contexto proporcionado
 * - No inventar datos
 * - Conservar estructura original (title, summary, sections, keyPoints, references)
 * - Mantener coherencia con dificultad
 */

import { LessonContent, ContextData } from './content-generator.service';

export type ImprovementType = 'simplify' | 'expand' | 'add_examples' | 'update_references';

export interface ImprovementRequest {
  lessonId: string;
  improvementType: ImprovementType;
  currentLesson: LessonContent;
  contextSnippet: ContextData;
}

/**
 * Mejora una lección existente según el tipo especificado
 */
export function improveLesson(request: ImprovementRequest): LessonContent {
  const { improvementType, currentLesson, contextSnippet } = request;

  switch (improvementType) {
    case 'simplify':
      return simplifyLesson(currentLesson, contextSnippet);
    case 'expand':
      return expandLesson(currentLesson, contextSnippet);
    case 'add_examples':
      return addExamples(currentLesson, contextSnippet);
    case 'update_references':
      return updateReferences(currentLesson, contextSnippet);
    default:
      throw new Error(`Tipo de mejora no válido: ${improvementType}`);
  }
}

/**
 * TIPO 1: Simplificar contenido
 * - Reducir complejidad técnica
 * - Usar lenguaje más accesible
 * - Acortar explicaciones
 * - Remover detalles muy técnicos
 */
function simplifyLesson(lesson: LessonContent, context: ContextData): LessonContent {
  const simplifiedSections = lesson.sections.map(section => {
    if (section.type === 'text') {
      return {
        ...section,
        content: simplifyTextContent(section.content)
      };
    }
    return section;
  });

  // Reducir keyPoints a los más esenciales (máximo 3-4)
  const simplifiedKeyPoints = lesson.keyPoints.slice(0, 4);

  // Ajustar summary a más simple
  const simplifiedSummary = simplifyText(lesson.summary);

  // Reducir tiempo estimado (contenido más simple = más rápido)
  const simplifiedTime = Math.max(5, Math.floor(lesson.estimatedTime * 0.8));

  return {
    ...lesson,
    summary: simplifiedSummary,
    estimatedTime: simplifiedTime,
    sections: simplifiedSections,
    keyPoints: simplifiedKeyPoints
  };
}

/**
 * TIPO 2: Expandir contenido
 * - Agregar más detalle técnico
 * - Explicaciones más profundas
 * - Más sub-secciones
 * - Detalles de fisiopatología o mecanismos
 */
function expandLesson(lesson: LessonContent, context: ContextData): LessonContent {
  const expandedSections = lesson.sections.map((section, index) => {
    if (section.type === 'text') {
      return {
        ...section,
        content: expandTextContent(section.content, context)
      };
    }
    return section;
  });

  // Agregar secciones adicionales del contexto si disponibles
  const additionalSections = createAdditionalSections(lesson, context, expandedSections.length + 1);
  const allSections = [...expandedSections, ...additionalSections];

  // Reordenar orders consecutivos
  allSections.forEach((section, index) => {
    section.order = index + 1;
  });

  // Agregar más keyPoints del contexto si disponibles
  const expandedKeyPoints = expandKeyPoints(lesson.keyPoints, context);

  // Aumentar tiempo estimado (más contenido = más tiempo)
  const expandedTime = Math.min(60, Math.floor(lesson.estimatedTime * 1.3));

  return {
    ...lesson,
    estimatedTime: expandedTime,
    sections: allSections,
    keyPoints: expandedKeyPoints
  };
}

/**
 * TIPO 3: Agregar ejemplos clínicos
 * - Insertar casos clínicos
 * - Ejemplos numéricos con cálculos
 * - Escenarios prácticos
 * - Datos de pacientes
 */
function addExamples(lesson: LessonContent, context: ContextData): LessonContent {
  const sectionsWithExamples = [...lesson.sections];
  
  // Buscar secciones de texto donde podemos insertar ejemplos
  const textSections = sectionsWithExamples.filter(s => s.type === 'text');
  
  if (textSections.length > 0 && (context.clinicalScenarios || context.patientData || context.caseStudies)) {
    // Crear nueva sección de ejemplos
    const exampleSection = createExampleSection(context, sectionsWithExamples.length);
    sectionsWithExamples.push(exampleSection);
  }

  // Enriquecer secciones existentes con ejemplos en contexto
  const enrichedSections = sectionsWithExamples.map(section => {
    if (section.type === 'text') {
      return {
        ...section,
        content: addExamplesToContent(section.content, context)
      };
    }
    return section;
  });

  // Reordenar orders
  enrichedSections.forEach((section, index) => {
    section.order = index + 1;
  });

  // Ajustar tiempo (más ejemplos = más tiempo)
  const adjustedTime = Math.min(60, lesson.estimatedTime + 10);

  return {
    ...lesson,
    estimatedTime: adjustedTime,
    sections: enrichedSections
  };
}

/**
 * TIPO 4: Actualizar referencias
 * - Agregar nuevas referencias del contexto
 * - Reemplazar referencias obsoletas
 * - Marcar [[MISSING_REF]] si no hay nuevas disponibles
 */
function updateReferences(lesson: LessonContent, context: ContextData): LessonContent {
  const { references: contextReferences } = context;

  let updatedReferences: string[];

  if (contextReferences && contextReferences.length > 0) {
    // Combinar referencias existentes con nuevas del contexto
    // Eliminar duplicados
    const combined = [...lesson.references, ...contextReferences];
    updatedReferences = [...new Set(combined)].filter(ref => ref !== '[[MISSING_REF]]');
  } else {
    // No hay nuevas referencias en contexto
    // Conservar existentes y agregar marcador si no hay suficientes
    updatedReferences = lesson.references;
    if (updatedReferences.length === 0 || updatedReferences[0] === '[[MISSING_REF]]') {
      updatedReferences = ['[[MISSING_REF]]'];
    }
  }

  return {
    ...lesson,
    references: updatedReferences
  };
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Simplifica contenido de texto (Markdown)
 */
function simplifyTextContent(content: string): string {
  // Reducir secciones muy técnicas
  // Remover fórmulas complejas o explicarlas más simple
  // Acortar párrafos largos
  
  let simplified = content;

  // Remover explicaciones técnicas avanzadas (entre **Técnico:** y final de párrafo)
  simplified = simplified.replace(/\*\*Técnico:\*\*[^\n]+\n/g, '');

  // Simplificar listas muy largas (mantener solo primeros 3-4 ítems)
  simplified = simplified.replace(/^((?:- .+\n){4})(?:- .+\n)+/gm, '$1');

  // Remover sub-secciones muy detalladas (######## o más)
  simplified = simplified.replace(/^#{4,} .+\n[\s\S]*?(?=\n#{1,3} |\n\n|$)/gm, '');

  return simplified;
}

/**
 * Simplifica texto general
 */
function simplifyText(text: string): string {
  // Acortar si es muy largo
  if (text.length > 250) {
    return text.substring(0, 247) + '...';
  }
  return text;
}

/**
 * Expande contenido de texto con más detalle
 */
function expandTextContent(content: string, context: ContextData): string {
  let expanded = content;

  // Si hay parámetros en contexto, agregar más detalle sobre ellos
  if (context.parameters) {
    const params = Array.isArray(context.parameters) 
      ? context.parameters 
      : Object.keys(context.parameters);
    
    // Si el contenido menciona parámetros, expandir
    params.forEach(param => {
      if (expanded.includes(param) && context.ranges && context.ranges[param]) {
        const [min, max] = context.ranges[param];
        // Ya está en contenido, no duplicar
      }
    });
  }

  // Si hay complicaciones en contexto, agregar sección
  if (context.complications && context.complications.length > 0) {
    const hasComplicationsSection = expanded.toLowerCase().includes('complicaciones');
    if (!hasComplicationsSection) {
      expanded += `\n\n### Complicaciones Potenciales\n\n`;
      context.complications.forEach(comp => {
        expanded += `- **${comp}**\n`;
      });
    }
  }

  return expanded;
}

/**
 * Crea secciones adicionales del contexto
 */
function createAdditionalSections(lesson: LessonContent, context: ContextData, startOrder: number): any[] {
  const additionalSections: any[] = [];

  // Si hay escenarios clínicos no incluidos, agregar
  if (context.clinicalScenarios && context.clinicalScenarios.length > 0) {
    const hasScenariosSection = lesson.sections.some(s => 
      s.type === 'text' && s.content.toLowerCase().includes('escenarios')
    );
    
    if (!hasScenariosSection) {
      additionalSections.push({
        type: 'text',
        order: startOrder,
        content: `## Escenarios Clínicos Adicionales\n\n${context.clinicalScenarios.map((sc, i) => `${i + 1}. ${sc}`).join('\n')}`
      });
      startOrder++;
    }
  }

  // Si hay objetivos no incluidos, agregar
  if (context.objectives && context.objectives.length > 0) {
    const hasObjectivesSection = lesson.sections.some(s => 
      s.type === 'text' && s.content.toLowerCase().includes('objetivos')
    );
    
    if (!hasObjectivesSection) {
      additionalSections.push({
        type: 'text',
        order: startOrder,
        content: `## Objetivos de Aprendizaje Ampliados\n\n${context.objectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}`
      });
    }
  }

  return additionalSections;
}

/**
 * Expande keyPoints con información del contexto
 */
function expandKeyPoints(currentPoints: string[], context: ContextData): string[] {
  const expanded = [...currentPoints];

  // Agregar learningObjectives si disponibles y no duplicados
  if (context.learningObjectives) {
    context.learningObjectives.forEach(obj => {
      if (!expanded.includes(obj) && expanded.length < 8) {
        expanded.push(obj);
      }
    });
  }

  // Agregar keyPoints del contexto si hay y no duplicados
  if (context.keyPoints) {
    context.keyPoints.forEach(kp => {
      if (!expanded.includes(kp) && expanded.length < 8) {
        expanded.push(kp);
      }
    });
  }

  return expanded.slice(0, 8); // Máximo 8 puntos
}

/**
 * Crea sección de ejemplos clínicos
 */
function createExampleSection(context: ContextData, order: number): any {
  let content = '## Ejemplos Clínicos\n\n';

  // Si hay datos de paciente
  if (context.patientData) {
    content += '### Caso Clínico\n\n';
    Object.entries(context.patientData).forEach(([key, value]) => {
      const label = key.charAt(0).toUpperCase() + key.slice(1);
      content += `- **${label}**: ${value}\n`;
    });
    content += '\n';
  }

  // Si hay escenarios clínicos
  if (context.clinicalScenarios && context.clinicalScenarios.length > 0) {
    content += '### Escenarios de Aplicación\n\n';
    context.clinicalScenarios.forEach((scenario, i) => {
      content += `**Escenario ${i + 1}**: ${scenario}\n\n`;
    });
  }

  // Si hay casos de estudio
  if (context.caseStudies && context.caseStudies.length > 0) {
    content += '### Casos de Estudio\n\n';
    context.caseStudies.forEach((caseStudy, i) => {
      content += `${i + 1}. ${caseStudy}\n`;
    });
  }

  return {
    type: 'text',
    order,
    content
  };
}

/**
 * Agrega ejemplos al contenido existente
 */
function addExamplesToContent(content: string, context: ContextData): string {
  let enriched = content;

  // Si hay parámetros y rangos, agregar ejemplo numérico
  if (context.parameters && context.ranges) {
    const params = Array.isArray(context.parameters) 
      ? context.parameters 
      : Object.keys(context.parameters);
    
    if (params.length > 0 && !enriched.includes('Ejemplo numérico')) {
      enriched += '\n\n**Ejemplo numérico**:\n\n';
      params.slice(0, 2).forEach(param => {
        if (context.ranges && context.ranges[param]) {
          const [min, max] = context.ranges[param];
          enriched += `- Si ${param} está en rango normal (${min}-${max}), el sistema funciona óptimamente.\n`;
        }
      });
    }
  }

  return enriched;
}

export default {
  improveLesson
};

