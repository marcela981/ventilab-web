/**
 * =============================================================================
 * Tutor Suggestions Service
 * =============================================================================
 * 
 * Servicio para generar sugerencias inteligentes contextuales para el TutorAI Pop-Up.
 * Las sugerencias pueden ser acciones IA (que envían prompts) o acciones locales.
 * 
 * @service
 */

import { buildLessonContext, toTutorAILessonContext } from './contextBuilder';
import { sendLessonAI, LessonContext } from './sharedAI';

export interface SuggestionContext {
  userId?: string;
  moduleId?: string;
  lessonId?: string;
  pageId?: string;
  moduleTitle?: string;
  lessonTitle?: string;
  pageTitle?: string;
  results?: any; // Resultados del quiz/ejercicio final (opcional)
}

export interface Suggestion {
  id: string;
  label: string;
  type: 'ai' | 'local';
  icon?: string;
  onClick: () => void | Promise<void>;
  description?: string;
}

/**
 * Obtener sugerencias estándar para una página
 */
export const getStandardSuggestions = async (
  ctx: SuggestionContext,
  onAISuggestion: (prompt: string, lessonContext: LessonContext) => Promise<void>
): Promise<Suggestion[]> => {
  const suggestions: Suggestion[] = [];

  // 1. Resumen de página (IA)
  suggestions.push({
    id: 'summarize-page',
    label: 'Resúmeme esta página en 5 bullets accionables para repasar antes del examen, destacando fórmulas/valores críticos si aplican.',
    type: 'ai',
    icon: 'summary',
    description: 'Obtén un resumen estructurado de la página',
    onClick: async () => {
      try {
        const lessonContextPayload = await buildLessonContext({
          moduleId: ctx.moduleId || null,
          lessonId: ctx.lessonId || null,
          pageId: ctx.pageId || null,
        });
        const tutorAIContext = toTutorAILessonContext(lessonContextPayload);
        const prompt = 'Resúmeme esta página en 5 bullets accionables para repasar antes del examen, destacando fórmulas/valores críticos si aplican.';
        await onAISuggestion(prompt, tutorAIContext);
      } catch (error) {
        console.error('[suggestions] Error generating summary:', error);
      }
    },
  });

  // 2. Preguntas tipo quiz (IA)
  suggestions.push({
    id: 'generate-quiz',
    label: 'Genera 3 preguntas tipo quiz con respuesta y breve justificación, basadas exclusivamente en esta página.',
    type: 'ai',
    icon: 'quiz',
    description: 'Crea preguntas de práctica',
    onClick: async () => {
      try {
        const lessonContextPayload = await buildLessonContext({
          moduleId: ctx.moduleId || null,
          lessonId: ctx.lessonId || null,
          pageId: ctx.pageId || null,
        });
        const tutorAIContext = toTutorAILessonContext(lessonContextPayload);
        const prompt = 'Genera 3 preguntas tipo quiz con respuesta y breve justificación, basadas exclusivamente en esta página.';
        await onAISuggestion(prompt, tutorAIContext);
      } catch (error) {
        console.error('[suggestions] Error generating quiz:', error);
      }
    },
  });

  // 3. Mini-guía paso a paso (IA)
  suggestions.push({
    id: 'step-by-step-guide',
    label: 'Hazme una mini-guía paso a paso para calcular Vt/FR/PEEP cuando [condición del contexto].',
    type: 'ai',
    icon: 'guide',
    description: 'Guía práctica paso a paso',
    onClick: async () => {
      try {
        const lessonContextPayload = await buildLessonContext({
          moduleId: ctx.moduleId || null,
          lessonId: ctx.lessonId || null,
          pageId: ctx.pageId || null,
        });
        const tutorAIContext = toTutorAILessonContext(lessonContextPayload);
        const prompt = 'Hazme una mini-guía paso a paso para calcular Vt/FR/PEEP cuando [condición del contexto].';
        await onAISuggestion(prompt, tutorAIContext);
      } catch (error) {
        console.error('[suggestions] Error generating guide:', error);
      }
    },
  });

  // 4. Mapa mental textual (IA)
  suggestions.push({
    id: 'mind-map',
    label: 'Dame un mapa mental textual (jerárquico) de los conceptos clave de esta página.',
    type: 'ai',
    icon: 'mindmap',
    description: 'Visualiza los conceptos clave',
    onClick: async () => {
      try {
        const lessonContextPayload = await buildLessonContext({
          moduleId: ctx.moduleId || null,
          lessonId: ctx.lessonId || null,
          pageId: ctx.pageId || null,
        });
        const tutorAIContext = toTutorAILessonContext(lessonContextPayload);
        const prompt = 'Dame un mapa mental textual (jerárquico) de los conceptos clave de esta página.';
        await onAISuggestion(prompt, tutorAIContext);
      } catch (error) {
        console.error('[suggestions] Error generating mind map:', error);
      }
    },
  });

  // 5. Tomar apunte (local)
  suggestions.push({
    id: 'take-note',
    label: 'Tomar apunte',
    type: 'local',
    icon: 'note',
    description: 'Crea una nueva nota',
    onClick: () => {
      // Esta acción se manejará en el componente
      const event = new CustomEvent('tutor:create-note', { detail: { ctx } });
      window.dispatchEvent(event);
    },
  });

  // 6. Añadir a resumen (local)
  suggestions.push({
    id: 'add-to-summary',
    label: 'Añadir a mi Resumen',
    type: 'local',
    icon: 'summary',
    description: 'Duplica el último guardado del chat como nota',
    onClick: () => {
      const event = new CustomEvent('tutor:add-to-summary', { detail: { ctx } });
      window.dispatchEvent(event);
    },
  });

  return suggestions;
};

/**
 * Obtener sugerencias post-lección (después del ejercicio final/quiz)
 */
export const getPostLessonSuggestions = async (
  ctx: SuggestionContext,
  onAISuggestion: (prompt: string, lessonContext: LessonContext) => Promise<void>
): Promise<Suggestion[]> => {
  const suggestions: Suggestion[] = [];

  // 1. Analizar errores (IA)
  if (ctx.results) {
    suggestions.push({
      id: 'analyze-errors',
      label: 'Analiza mis errores y dame un plan de repaso focalizado en 3 puntos.',
      type: 'ai',
      icon: 'analyze',
      description: 'Análisis personalizado de errores',
      onClick: async () => {
        try {
          const lessonContextPayload = await buildLessonContext({
            moduleId: ctx.moduleId || null,
            lessonId: ctx.lessonId || null,
            pageId: ctx.pageId || null,
          });
          const tutorAIContext = toTutorAILessonContext(lessonContextPayload);
          const resultsText = JSON.stringify(ctx.results, null, 2);
          const prompt = `Analiza mis errores del quiz y dame un plan de repaso focalizado en 3 puntos. Resultados del quiz:\n\n${resultsText}`;
          await onAISuggestion(prompt, tutorAIContext);
        } catch (error) {
          console.error('[suggestions] Error analyzing errors:', error);
        }
      },
    });
  }

  // 2. Generar flashcards (IA)
  suggestions.push({
    id: 'generate-flashcards',
    label: 'Genera 5 flashcards con las definiciones más débiles según el quiz.',
    type: 'ai',
    icon: 'flashcards',
    description: 'Crea tarjetas de estudio',
    onClick: async () => {
      try {
        const lessonContextPayload = await buildLessonContext({
          moduleId: ctx.moduleId || null,
          lessonId: ctx.lessonId || null,
          pageId: ctx.pageId || null,
        });
        const tutorAIContext = toTutorAILessonContext(lessonContextPayload);
        const resultsText = ctx.results ? JSON.stringify(ctx.results, null, 2) : '';
        const prompt = `Genera 5 flashcards con las definiciones más débiles según el quiz.${resultsText ? `\n\nResultados del quiz:\n\n${resultsText}` : ''}`;
        await onAISuggestion(prompt, tutorAIContext);
      } catch (error) {
        console.error('[suggestions] Error generating flashcards:', error);
      }
    },
  });

  // 3. Checklist de lección (local)
  suggestions.push({
    id: 'lesson-checklist',
    label: "Crear nota 'Checklist de la lección'",
    type: 'local',
    icon: 'checklist',
    description: 'Crea una nota con template de checklist',
    onClick: () => {
      const event = new CustomEvent('tutor:create-checklist', {
        detail: {
          ctx,
          template: `# Checklist de la lección: ${ctx.lessonTitle || 'Lección'}\n\n## Conceptos a repasar\n- [ ] \n- [ ] \n- [ ] \n\n## Fórmulas clave\n- [ ] \n- [ ] \n\n## Puntos débiles\n- [ ] \n- [ ] \n`,
        },
      });
      window.dispatchEvent(event);
    },
  });

  return suggestions;
};

/**
 * Obtener todas las sugerencias para un contexto
 */
export const getSuggestions = async (
  ctx: SuggestionContext,
  onAISuggestion: (prompt: string, lessonContext: LessonContext) => Promise<void>,
  isPostLesson: boolean = false
): Promise<Suggestion[]> => {
  if (isPostLesson) {
    return getPostLessonSuggestions(ctx, onAISuggestion);
  }
  return getStandardSuggestions(ctx, onAISuggestion);
};

export default {
  getSuggestions,
  getStandardSuggestions,
  getPostLessonSuggestions,
};

