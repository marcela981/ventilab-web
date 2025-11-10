/**
 * =============================================================================
 * AI Service Types
 * =============================================================================
 * 
 * Tipos compartidos para servicios de IA.
 */

/**
 * Contexto de lección (formato TutorAI)
 */
export interface LessonContext {
  lessonId: string;
  title?: string;
  objectives?: string[];
  tags?: string[];
  tipoDeLeccion?: 'teoria' | 'caso_clinico' | 'simulacion' | 'evaluacion';
}

