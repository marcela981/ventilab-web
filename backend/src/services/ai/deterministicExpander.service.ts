/**
 * =============================================================================
 * Deterministic Expander Service
 * =============================================================================
 * 
 * Servicio para generar expansiones de temas de forma determinista
 * sin necesidad de API keys de IA. Usa plantillas y contexto disponible.
 * 
 * Este servicio se usa como fallback cuando no hay proveedores de IA configurados.
 * 
 * @module
 */

import { ExpandTopicRequest, ExpandTopicResponse } from '../../schemas/ai/expandTopic.schema';
import { sanitizeText } from '../../utils/sanitize';

/**
 * Generar explicación expandida determinista
 */
function generateDeterministicExplanation(
  context: ExpandTopicRequest['context'],
  question: string | null
): string {
  const parts: string[] = [];
  
  // Título principal
  const topic = context.userSelection?.trim() 
    || context.sectionTitle?.trim() 
    || context.lessonTitle?.trim() 
    || 'este tema';
  
  parts.push(`## ${topic}`);
  parts.push('');
  
  // Introducción basada en el contexto
  if (context.lessonTitle) {
    parts.push(`En el contexto de **${context.lessonTitle}**, este tema es fundamental para comprender los principios de ventilación mecánica.`);
    parts.push('');
  }
  
  // Si hay pregunta del usuario, responderla directamente
  if (question && question.trim().length > 0) {
    parts.push(`### Respuesta a tu pregunta`);
    parts.push('');
    parts.push(`**${question.trim()}**`);
    parts.push('');
    parts.push(`Para responder esta pregunta sobre ${topic}, es importante considerar:`);
    parts.push('');
  }
  
  // Contenido de la sección (si está disponible)
  const visibleText = context.sectionContent || context.visibleTextBlock || '';
  if (visibleText && visibleText.trim().length > 50) {
    // Extraer primeras oraciones del contenido visible
    const sentences = visibleText.trim().split(/[.!?]+/).filter(s => s.trim().length > 20);
    const relevantSentences = sentences.slice(0, 5); // Primeras 5 oraciones
    
    parts.push('### Información clave');
    parts.push('');
    relevantSentences.forEach(sentence => {
      const cleanSentence = sentence.trim();
      if (cleanSentence.length > 0) {
        parts.push(`- ${cleanSentence}.`);
      }
    });
    parts.push('');
  }
  
  // Información adicional basada en el título
  if (context.sectionTitle) {
    const sectionTitle = context.sectionTitle.toLowerCase();
    
    // Detectar tipo de contenido y agregar información relevante
    if (sectionTitle.includes('parámetro') || sectionTitle.includes('paramentro')) {
      parts.push('### Consideraciones importantes');
      parts.push('');
      parts.push('- Los parámetros de ventilación mecánica deben ajustarse según las necesidades del paciente.');
      parts.push('- Es fundamental monitorear la respuesta del paciente a los cambios.');
      parts.push('- La interpretación debe considerar el contexto clínico completo.');
      parts.push('');
    } else if (sectionTitle.includes('modo') || sectionTitle.includes('ventilación')) {
      parts.push('### Aspectos clave');
      parts.push('');
      parts.push('- Cada modo de ventilación tiene indicaciones específicas.');
      parts.push('- La selección del modo depende de la condición del paciente.');
      parts.push('- Es importante comprender los principios fisiológicos subyacentes.');
      parts.push('');
    } else if (sectionTitle.includes('configuración') || sectionTitle.includes('ajuste')) {
      parts.push('### Puntos a considerar');
      parts.push('');
      parts.push('- La configuración inicial debe basarse en parámetros estándar.');
      parts.push('- Los ajustes deben realizarse de forma gradual y monitoreada.');
      parts.push('- Documentar todos los cambios en los parámetros.');
      parts.push('');
    }
  }
  
  // Conclusión
  parts.push('### Para profundizar');
  parts.push('');
  parts.push('Este tema requiere estudio continuo y práctica clínica supervisada. Te recomendamos revisar los recursos adicionales disponibles en la plataforma y consultar con profesionales experimentados cuando sea necesario.');
  parts.push('');
  
  return parts.join('\n');
}

/**
 * Generar puntos clave deterministas
 */
function generateDeterministicKeyPoints(
  context: ExpandTopicRequest['context'],
  question: string | null
): string[] {
  const keyPoints: string[] = [];
  
  // Puntos clave basados en el contexto
  if (context.sectionTitle) {
    keyPoints.push(`${context.sectionTitle} es un concepto fundamental en ventilación mecánica.`);
  }
  
  if (context.lessonTitle) {
    keyPoints.push(`Este tema forma parte de ${context.lessonTitle}.`);
  }
  
  // Puntos genéricos relevantes
  keyPoints.push('La comprensión de los principios básicos es esencial para la práctica clínica.');
  keyPoints.push('Los parámetros deben ajustarse según las necesidades individuales del paciente.');
  keyPoints.push('El monitoreo continuo es fundamental para evaluar la respuesta del paciente.');
  
  // Si hay pregunta, agregar puntos relacionados
  if (question && question.trim().length > 0) {
    keyPoints.push('La respuesta debe considerar el contexto clínico completo.');
    keyPoints.push('Es importante consultar fuentes actualizadas y evidencia científica.');
  }
  
  // Limitar a 6 puntos clave
  return keyPoints.slice(0, 6);
}

/**
 * Generar referencias sugeridas deterministas
 */
function generateDeterministicReferences(
  context: ExpandTopicRequest['context']
): string[] {
  const references: string[] = [];
  
  // Referencias genéricas basadas en el tema
  const topic = (context.sectionTitle || context.lessonTitle || '').toLowerCase();
  
  if (topic.includes('parámetro') || topic.includes('paramentro')) {
    references.push('Guía de parámetros de ventilación mecánica');
    references.push('Principios de ajuste de parámetros ventilatorios');
  } else if (topic.includes('modo') || topic.includes('ventilación')) {
    references.push('Manual de modos de ventilación mecánica');
    references.push('Fundamentos de ventilación mecánica');
  } else if (topic.includes('fisiología') || topic.includes('fisiologia')) {
    references.push('Fisiología respiratoria aplicada');
    references.push('Principios de mecánica respiratoria');
  } else {
    references.push('Guía de ventilación mecánica básica');
    references.push('Principios de fisiología respiratoria');
  }
  
  // Referencias genéricas adicionales
  references.push('Protocolos de ventilación mecánica');
  references.push('Evidencia actual en cuidados respiratorios');
  
  return references.slice(0, 6);
}

/**
 * Generar enlaces internos deterministas
 */
function generateDeterministicInternalLinks(
  context: ExpandTopicRequest['context']
): Array<{ title: string; url: string; description?: string }> {
  const links: Array<{ title: string; url: string; description?: string }> = [];
  
  // Si hay información de módulo/lección, generar enlaces relacionados
  if (context.moduleId && context.lessonId) {
    // Enlace a la lección actual
    if (context.lessonTitle) {
      links.push({
        title: context.lessonTitle,
        url: `/teaching/${context.moduleId}/${context.lessonId}`,
        description: 'Ver lección completa',
      });
    }
    
    // Enlace al módulo
    if (context.moduleTitle) {
      links.push({
        title: context.moduleTitle,
        url: `/teaching/${context.moduleId}`,
        description: 'Ver módulo completo',
      });
    }
  }
  
  return links.slice(0, 5);
}

/**
 * Generar expansión determinista (sin LLM)
 * Usa plantillas y contexto disponible para generar contenido básico
 */
export function generateDeterministicExpansion(
  context: ExpandTopicRequest['context'],
  question: string | null
): ExpandTopicResponse {
  // Generar explicación expandida
  const expandedExplanation = generateDeterministicExplanation(context, question);
  
  // Generar puntos clave
  const keyPoints = generateDeterministicKeyPoints(context, question);
  
  // Generar referencias sugeridas
  const suggestedReferences = generateDeterministicReferences(context);
  
  // Generar enlaces internos
  const internalLinks = generateDeterministicInternalLinks(context);
  
  return {
    expandedExplanation: sanitizeText(expandedExplanation, { trim: true }),
    keyPoints: keyPoints.map(kp => sanitizeText(kp, { trim: true })),
    suggestedReferences: suggestedReferences.map(ref => sanitizeText(ref, { trim: true })),
    internalLinks: internalLinks.map(link => ({
      title: sanitizeText(link.title, { trim: true }),
      url: sanitizeText(link.url, { trim: true }),
      description: link.description ? sanitizeText(link.description, { trim: true }) : undefined,
    })),
  };
}

