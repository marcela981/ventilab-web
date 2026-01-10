/**
 * Helpers para construir y manejar lecciones
 * 
 * NOTE: This file now uses getVisibleLessonsByLevel from selectors.js
 * which handles M03 flattening and filtering logic.
 */

import { getVisibleLessonsByLevel } from '../../../../data/curriculum/selectors.js';

/**
 * Calcula el número real de páginas que se mostrarán en una lección
 * Basándose en sectionsCount + páginas adicionales que siempre se agregan
 * 
 * useLessonPages agrega siempre:
 * - 1 página de completación
 * - 1 página de caso clínico (si hay moduleId)
 * 
 * Las secciones del JSON se mapean a páginas en useLessonPages, pero siempre
 * se agregan estas 2 páginas adicionales al final.
 * 
 * @param {Object} lesson - Objeto de lección con sectionsCount y moduleId
 * @returns {number} Número real de páginas que se mostrarán
 */
function calculateRealPages(lesson) {
  if (lesson.allowEmpty || !lesson.sectionsCount || lesson.sectionsCount === 0) {
    return 0;
  }
  
  // Páginas base: las secciones del JSON
  let pages = lesson.sectionsCount;
  
  // Páginas adicionales que siempre se agregan en useLessonPages:
  // 1. Página de completación (siempre se agrega)
  pages += 1;
  
  // 2. Página de caso clínico (siempre se agrega si hay moduleId)
  // Todas las lecciones tienen moduleId, así que siempre se agrega
  if (lesson.moduleId) {
    pages += 1;
  }
  
  return pages;
}

/**
 * Construye un arreglo plano de lecciones a partir de todos los módulos
 * Cada item expone: moduleId, lessonId, title, description, estimatedTime, difficulty, order y pages
 * 
 * El número de páginas se calcula usando calculateRealPages, que incluye:
 * - sectionsCount (número de secciones en el JSON)
 * - 1 página de completación (siempre)
 * - 1 página de caso clínico (si hay moduleId, que es siempre)
 * 
 * This function now uses getVisibleLessonsByLevel from selectors.js which:
 * 1. Flattens M03 to virtual lessons
 * 2. Filters lessons with sections.length > 0
 * 3. Excludes empty ones except when metadata.allowEmpty === true
 * 
 * @param {string} levelId - ID del nivel para filtrar módulos (opcional, null = all levels)
 * @returns {Array} Arreglo plano de lecciones con pages calculado correctamente
 */
export function buildLessonsArray(levelId = null) {
  // If levelId is provided, use getVisibleLessonsByLevel for that level
  if (levelId) {
    const lessons = getVisibleLessonsByLevel(levelId);
    // Convert to format with pages property using real page count
    return lessons.map(lesson => ({
      ...lesson,
      pages: calculateRealPages(lesson),
    }));
  }
  
  // If no levelId, get lessons for all levels
  const allLevels = ['beginner', 'intermediate', 'advanced'];
  const allLessons = [];
  
  allLevels.forEach(level => {
    const levelLessons = getVisibleLessonsByLevel(level);
    allLessons.push(...levelLessons.map(lesson => ({
      ...lesson,
      pages: calculateRealPages(lesson),
    })));
  });
  
  // Sort by level, then by order
  const levelOrder = { beginner: 1, intermediate: 2, advanced: 3 };
  allLessons.sort((a, b) => {
    const levelDiff = (levelOrder[a.moduleLevel] || 99) - (levelOrder[b.moduleLevel] || 99);
    if (levelDiff !== 0) return levelDiff;
    return (a.order || 0) - (b.order || 0);
  });
  
  return allLessons;
}

/**
 * Obtiene lecciones filtradas por nivel
 * Uses getVisibleLessonsByLevel from selectors.js
 * 
 * @param {string} levelId - ID del nivel
 * @returns {Array} Arreglo de lecciones del nivel
 */
export function getLessonsByLevel(levelId) {
  if (!levelId) {
    return [];
  }
  const lessons = getVisibleLessonsByLevel(levelId);
  // Convert to format with pages property using real page count
  return lessons.map(lesson => ({
    ...lesson,
    pages: calculateRealPages(lesson),
  }));
}

/**
 * Calcula el progreso de lecciones filtradas
 * Solo incluye lecciones con sections.length > 0 o metadata.allowEmpty === true
 * Las lecciones con allowEmpty === true NO cuentan en el denominador (no son completables)
 * 
 * @param {Object} progressByModule - Objeto con progreso por módulo: { [moduleId]: { lessonsById: { [lessonId]: LessonProgress } } }
 * @param {string} levelId - ID del nivel (opcional, si no se proporciona calcula para todos los niveles)
 * @returns {Object} Objeto con { completedLessons, totalLessons, percentage, completedPages, totalPages }
 */
export function calculateFilteredProgress(progressByModule, levelId = null) {
  const filteredLessons = buildLessonsArray(levelId);
  
  // Lecciones completables (excluye allowEmpty === true del denominador)
  // Las allowEmpty son no completables y no deben entrar en el denominador
  const completableLessons = filteredLessons.filter(lesson => !lesson.allowEmpty);
  
  let completedLessons = 0;
  let totalPages = 0;
  let completedPages = 0;
  let weightedProgressSum = 0;
  
  // Procesar SOLO lecciones completables (excluye allowEmpty)
  completableLessons.forEach(lesson => {
    const { moduleId, lessonId, pages } = lesson;
    const moduleData = progressByModule[moduleId];
    const lessonProgress = moduleData?.lessonsById?.[lessonId];
    
    // Contar todas las lecciones completables en totalPages y totalLessons
    totalPages += pages;
    
    if (lessonProgress) {
      const lessonProgressValue = lessonProgress.completed 
        ? 1 
        : Math.max(0, Math.min(1, lessonProgress.progress || 0));
      
      // Si la lección está completada, contar como completada
      if (lessonProgress.completed) {
        completedLessons++;
      }
      
      // Calcular páginas completadas basado en progress (0-1)
      // progress representa completedPages / totalPages a nivel de lección
      const lessonCompletedPages = Math.round(lessonProgressValue * pages);
      completedPages += lessonCompletedPages;
      
      // Para promedio ponderado: sumar progress * pages
      weightedProgressSum += lessonProgressValue * pages;
    }
  });
  
  // Las lecciones allowEmpty NO se cuentan en ningún cálculo de progreso
  // (ni en completedLessons, ni en totalLessons, ni en páginas)
  
  const totalLessons = completableLessons.length;
  
  // Calcular porcentaje: promedio ponderado por páginas si hay páginas, sino por lecciones
  let percentage = 0;
  if (totalPages > 0) {
    // Promedio ponderado por páginas a nivel de lección, luego promedio ponderado por páginas a nivel de nivel
    percentage = weightedProgressSum / totalPages;
  } else if (totalLessons > 0) {
    // Fallback: promedio simple por lecciones
    percentage = completedLessons / totalLessons;
  }
  
  return {
    completedLessons,
    totalLessons,
    percentage: percentage * 100, // Convertir a porcentaje (0-100)
    completedPages,
    totalPages,
  };
}

/**
 * Calcula el progreso por módulo con lecciones filtradas
 * Las lecciones con allowEmpty === true NO cuentan en el denominador (no son completables)
 * 
 * @param {Object} progressByModule - Objeto con progreso por módulo
 * @param {string} moduleId - ID del módulo
 * @returns {Object} Objeto con { completedLessons, totalLessons, percentage, completedPages, totalPages }
 */
export function calculateModuleFilteredProgress(progressByModule, moduleId) {
  const allLessons = buildLessonsArray();
  const moduleLessons = allLessons.filter(lesson => lesson.moduleId === moduleId);
  
  // Lecciones completables (excluye allowEmpty === true del denominador)
  const completableLessons = moduleLessons.filter(lesson => !lesson.allowEmpty);
  
  const moduleData = progressByModule[moduleId];
  
  let completedLessons = 0;
  let totalPages = 0;
  let completedPages = 0;
  let weightedProgressSum = 0;
  
  // Procesar SOLO lecciones completables (excluye allowEmpty)
  completableLessons.forEach(lesson => {
    const { lessonId, pages } = lesson;
    
    // Contar todas las lecciones completables
    totalPages += pages;
    
    const lessonProgress = moduleData?.lessonsById?.[lessonId];
    
    if (lessonProgress) {
      const lessonProgressValue = lessonProgress.completed 
        ? 1 
        : Math.max(0, Math.min(1, lessonProgress.progress || 0));
      
      if (lessonProgress.completed) {
        completedLessons++;
      }
      
      // Calcular páginas completadas basado en progress (0-1)
      const lessonCompletedPages = Math.round(lessonProgressValue * pages);
      completedPages += lessonCompletedPages;
      
      // Para promedio ponderado: sumar progress * pages
      weightedProgressSum += lessonProgressValue * pages;
    }
  });
  
  // Las lecciones allowEmpty NO se cuentan en ningún cálculo de progreso
  
  const totalLessons = completableLessons.length;
  
  // Calcular porcentaje: promedio ponderado por páginas si hay páginas
  let percentage = 0;
  if (totalPages > 0) {
    // Promedio ponderado por páginas
    percentage = weightedProgressSum / totalPages;
  } else if (totalLessons > 0) {
    // Fallback: promedio simple por lecciones
    percentage = completedLessons / totalLessons;
  }
  
  return {
    completedLessons,
    totalLessons,
    percentage: percentage * 100,
    completedPages,
    totalPages,
  };
}

