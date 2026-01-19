/**
 * SWR Keys - Claves centralizadas para invalidación de caché
 *
 * Este archivo centraliza todas las claves de SWR para facilitar
 * la invalidación de caché cuando se actualiza el progreso.
 */

export const SWR_KEYS = {
  // Progreso de una lección específica
  lessonProgress: (lessonId: string) => `lesson-progress-${lessonId}`,

  // Progreso de un módulo específico (usado por useModuleProgress.ts)
  moduleProgress: (moduleId: string) => `module-progress-${moduleId}`,

  // Overview general del usuario (dashboard)
  userOverview: 'user-progress-overview',

  // Todas las lecciones de un módulo (para calcular %)
  moduleLessonsProgress: (moduleId: string) => `module-lessons-progress-${moduleId}`,

  // Progreso general (usado por useProgress.js)
  allProgress: 'all-progress',
};

/**
 * Extrae el moduleId de un lessonId
 * Soporta formatos como "module-01-leccion-x" o IDs simples
 */
export function extractModuleIdFromLessonId(lessonId: string): string {
  // Formato: "module-XX-resto"
  const match = lessonId.match(/^(module-\d+)/);
  if (match) return match[1];

  // Fallback: intentar extraer primeras dos partes
  const parts = lessonId.split('-');
  if (parts.length >= 2 && parts[0] === 'module') {
    return `${parts[0]}-${parts[1]}`;
  }

  return 'unknown-module';
}

/**
 * Obtiene un patrón regex para invalidar todas las claves de progreso
 */
export function getProgressInvalidationMatcher() {
  return (key: unknown): boolean => {
    if (typeof key !== 'string') return false;
    return (
      key.includes('progress') ||
      key.includes('lesson-progress') ||
      key.includes('module-progress')
    );
  };
}
