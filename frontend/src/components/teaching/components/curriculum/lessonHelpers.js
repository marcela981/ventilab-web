/**
 * Helpers para construir y manejar lecciones
 */

import { getAllModules } from '../../../../data/curriculum/index.js';
import { getVirtualLessonsArray } from '../../../../data/curriculum/selectors.js';

/**
 * Construye un arreglo plano de lecciones a partir de todos los módulos
 * Cada item expone: moduleId, lessonId, title, description, estimatedTime, difficulty, order y pages (sections.length)
 * 
 * @param {string} levelId - ID del nivel para filtrar módulos (opcional)
 * @returns {Array} Arreglo plano de lecciones
 */
export function buildLessonsArray(levelId = null) {
  const allModules = getAllModules();
  
  // Filtrar por nivel si se proporciona
  const modules = levelId 
    ? allModules.filter(module => module.level === levelId)
    : allModules;
  
  const lessonsArray = [];
  
  // Process regular modules with lessons array
  modules.forEach(module => {
    if (!module.lessons || module.lessons.length === 0) {
      return;
    }
    
    module.lessons.forEach(lesson => {
      // Obtener el número de páginas (sections.length) desde lessonData si está disponible
      let pages = 0;
      let sections = [];
      if (lesson.lessonData && lesson.lessonData.sections) {
        sections = lesson.lessonData.sections;
        pages = sections.length;
      } else if (lesson.sections) {
        sections = lesson.sections;
        pages = sections.length;
      }
      
      // Obtener metadata.allowEmpty
      const metadata = lesson.lessonData?.metadata || lesson.metadata || {};
      const allowEmpty = metadata.allowEmpty === true;
      
      // Filtrar: solo incluir si sections.length > 0 OR metadata.allowEmpty === true
      if (sections.length === 0 && !allowEmpty) {
        return; // No incluir esta lección
      }
      
      // Construir el objeto de lección con todas las propiedades requeridas
      const lessonItem = {
        moduleId: module.id,
        lessonId: lesson.id,
        title: lesson.title || lesson.lessonData?.title || 'Sin título',
        description: lesson.description || lesson.lessonData?.description || '',
        estimatedTime: lesson.estimatedTime || lesson.lessonData?.estimatedTime || 0,
        difficulty: lesson.difficulty || lesson.lessonData?.difficulty || module.difficulty || 'intermedio',
        order: lesson.order || lesson.lessonData?.order || 0,
        pages: allowEmpty ? 0 : pages, // Mostrar 0 solo cuando allowEmpty === true
        allowEmpty: allowEmpty,
        // Propiedades adicionales que pueden ser útiles
        lessonData: lesson.lessonData || lesson,
        moduleLevel: module.level,
        moduleTitle: module.title,
        sections: sections
      };
      
      lessonsArray.push(lessonItem);
    });
  });
  
  // Add virtual lessons from module-03-configuration
  // These are flattened from the category-based structure
  const virtualLessons = getVirtualLessonsArray();
  virtualLessons.forEach(virtualLesson => {
    // Filter by level if specified
    if (levelId && virtualLesson.moduleLevel !== levelId) {
      return;
    }
    
    // Obtener sections y metadata
    const sections = virtualLesson.sections || [];
    const metadata = virtualLesson.metadata || {};
    const allowEmpty = metadata.allowEmpty === true;
    
    // Filtrar: solo incluir si sections.length > 0 OR metadata.allowEmpty === true
    if (sections.length === 0 && !allowEmpty) {
      return; // No incluir esta lección
    }
    
    // Convert virtual lesson to lesson array format
    const lessonItem = {
      moduleId: virtualLesson.moduleId,
      lessonId: virtualLesson.lessonId,
      title: virtualLesson.title,
      description: virtualLesson.description,
      estimatedTime: virtualLesson.estimatedTime,
      difficulty: virtualLesson.difficulty,
      order: virtualLesson.order,
      pages: allowEmpty ? 0 : sections.length, // Mostrar 0 solo cuando allowEmpty === true
      allowEmpty: allowEmpty,
      lessonData: virtualLesson.lessonData,
      moduleLevel: virtualLesson.moduleLevel,
      moduleTitle: 'Configuración y Manejo del Ventilador Mecánico',
      // Additional virtual lesson properties
      category: virtualLesson.category,
      isPlaceholder: virtualLesson.isPlaceholder || false,
      sections: sections,
      keyPoints: virtualLesson.keyPoints,
      references: virtualLesson.references,
    };
    
    lessonsArray.push(lessonItem);
  });
  
  // Ordenar por nivel del módulo, luego por orden dentro del módulo
  const levelOrder = { beginner: 1, intermediate: 2, advanced: 3 };
  lessonsArray.sort((a, b) => {
    const levelDiff = (levelOrder[a.moduleLevel] || 99) - (levelOrder[b.moduleLevel] || 99);
    if (levelDiff !== 0) return levelDiff;
    
    // Si son del mismo nivel, ordenar por order
    return (a.order || 0) - (b.order || 0);
  });
  
  return lessonsArray;
}

/**
 * Obtiene lecciones filtradas por nivel
 * @param {string} levelId - ID del nivel
 * @returns {Array} Arreglo de lecciones del nivel
 */
export function getLessonsByLevel(levelId) {
  return buildLessonsArray(levelId);
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

