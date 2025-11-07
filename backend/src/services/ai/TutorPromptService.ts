/**
 * Tutor Prompt Service
 * Generates system prompts and context based on lesson type
 */

export interface LessonContext {
  lessonId: string;
  title: string;
  objectives?: string[];
  tags?: string[];
  tipoDeLeccion?: 'teoria' | 'caso_clinico' | 'simulacion' | 'evaluacion';
}

const PROMPT_TEMPLATE_VERSION = '1.0';

/**
 * Build system prompt based on lesson type
 */
export function buildSystemPrompt(context: LessonContext): string {
  const { title, objectives = [], tags = [], tipoDeLeccion = 'teoria' } = context;

  const objectivesText = objectives.length > 0
    ? `\nObjetivos de aprendizaje:\n${objectives.map((obj, i) => `- ${obj}`).join('\n')}`
    : '';

  const tagsText = tags.length > 0
    ? `\nTemas relacionados: ${tags.join(', ')}`
    : '';

  const basePrompt = `Eres un tutor experto en ventilación mecánica que ayuda a estudiantes a comprender conceptos complejos de manera clara y práctica. Tu objetivo es facilitar el aprendizaje activo mediante explicaciones claras, ejemplos relevantes y preguntas que promuevan el pensamiento crítico.

Contexto de la lección:
Título: ${title}${objectivesText}${tagsText}

Instrucciones:
- Responde de manera clara, concisa y didáctica
- Usa ejemplos clínicos cuando sea relevante
- Si el estudiante tiene dudas, haz preguntas que lo guíen hacia la respuesta
- Evita respuestas excesivamente largas; prioriza la claridad
- Si no estás seguro de algo, admítelo y sugiere consultar fuentes adicionales
- Mantén un tono profesional pero accesible`;

  switch (tipoDeLeccion) {
    case 'caso_clinico':
      return `${basePrompt}

Tipo de lección: Caso clínico
- Enfócate en la aplicación práctica de conceptos
- Ayuda a interpretar datos clínicos y curvas ventilatorias
- Sugiere ajustes de parámetros basados en la situación presentada
- Relaciona los conceptos teóricos con la práctica clínica`;

    case 'simulacion':
      return `${basePrompt}

Tipo de lección: Simulación
- Ayuda a entender cómo los cambios en parámetros afectan el sistema
- Explica las relaciones causa-efecto en tiempo real
- Guía en la interpretación de resultados de la simulación
- Sugiere experimentos o variaciones para explorar`;

    case 'evaluacion':
      return `${basePrompt}

Tipo de lección: Evaluación
- Proporciona retroalimentación constructiva
- Explica por qué una respuesta es correcta o incorrecta
- Sugiere áreas de estudio adicional si hay errores
- Refuerza conceptos clave cuando el estudiante responde correctamente`;

    case 'teoria':
    default:
      return `${basePrompt}

Tipo de lección: Teoría
- Explica conceptos fundamentales de manera estructurada
- Usa analogías cuando ayuden a la comprensión
- Relaciona conceptos abstractos con aplicaciones prácticas
- Proporciona ejemplos numéricos cuando sea relevante`;
  }
}

/**
 * Build context string for cache key generation
 */
export function buildContextString(context: LessonContext): string {
  const { lessonId, title, objectives = [], tags = [], tipoDeLeccion = 'teoria' } = context;
  return `${title}|${objectives.join(',')}|${tags.join(',')}|${tipoDeLeccion}|${lessonId}`;
}

/**
 * Get prompt template version
 */
export function getPromptTemplateVersion(): string {
  return PROMPT_TEMPLATE_VERSION;
}

/**
 * Generate dynamic suggestions based on lesson context
 */
export function generateSuggestions(context: LessonContext): string[] {
  const { title, objectives = [], tags = [], tipoDeLeccion = 'teoria' } = context;
  const suggestions: string[] = [];

  switch (tipoDeLeccion) {
    case 'caso_clinico':
      suggestions.push(
        '¿Qué ajuste de PEEP justificarías si la compliancia cae a 25 mL/cmH₂O?',
        '¿Cómo interpretarías una curva de presión que muestra auto-PEEP?',
        '¿Qué modalidad ventilatoria elegirías para este caso y por qué?',
        '¿Qué parámetros monitorearías para evaluar la respuesta del paciente?'
      );
      break;

    case 'simulacion':
      suggestions.push(
        '¿Qué ocurre si aumento la PEEP manteniendo el volumen tidal constante?',
        '¿Cómo afecta el tiempo inspiratorio a la presión media?',
        '¿Qué pasa con el volumen minuto si cambio la frecuencia respiratoria?',
        '¿Cómo se relacionan la compliance y la presión plateau?'
      );
      break;

    case 'evaluacion':
      suggestions.push(
        '¿Puedes explicar por qué esta respuesta es correcta?',
        '¿Qué conceptos clave debo repasar?',
        '¿Hay algún error común que debo evitar?',
        '¿Qué ejercicios adicionales me recomiendas?'
      );
      break;

    case 'teoria':
    default:
      if (objectives.length > 0) {
        suggestions.push(
          `¿Puedes explicar "${objectives[0]}" con un ejemplo numérico sencillo?`,
          '¿Cómo se relaciona este concepto con la práctica clínica?',
          '¿Qué diferencias hay entre los distintos modos ventilatorios?',
          '¿Puedes darme una analogía para entender mejor este concepto?'
        );
      } else {
        suggestions.push(
          `¿Puedes explicar "${title}" con un ejemplo práctico?`,
          '¿Cómo se aplica esto en la práctica clínica?',
          '¿Qué parámetros son más importantes en este contexto?',
          '¿Puedes ayudarme a entender la relación entre estos conceptos?'
        );
      }
      break;
  }

  // Add tag-based suggestions if available
  if (tags.length > 0) {
    const tagSuggestions = tags.slice(0, 2).map(tag => 
      `¿Cómo se relaciona "${tag}" con este tema?`
    );
    suggestions.push(...tagSuggestions);
  }

  return suggestions.slice(0, 6); // Limit to 6 suggestions
}

