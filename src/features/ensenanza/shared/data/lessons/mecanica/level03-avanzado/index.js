/**
 * Level 03: Avanzado - Content Exports
 *
 * Módulos organizados en dos grupos:
 *   - coreModules:      contenido principal avanzado (módulos 01-04)
 *   - pathologyModules: patologías específicas (módulos 05-08)
 *
 * La información canónica proviene de la BD; estos JSON son la fuente
 * de contenido detallado que el lessonLoader consume como fallback/legacy.
 */

// ============================================================================
// CORE MODULES (01-04)
// ============================================================================

import module01 from './module-01-daño-pulmonar-vili-ventilacion-protectora.json';
import module02 from './module-02-monitorizacion-alto-nivel.json';
import module03 from './module-03-advertencias-asincronias-situaciones-complejas.json';
import module04 from './module-04-destete-complejo-vmni.json';

export const coreModules = {
  module01,
  module02,
  module03,
  module04,
};

// ============================================================================
// PATHOLOGY MODULES (05-08)
// ============================================================================

import module05 from './pathologies/module-05-obesidad-sedentarismo.json';
import module06 from './pathologies/module-06-epoc-asma-fumadores.json';
import module07 from './pathologies/module-07-sdra.json';
import module08 from './pathologies/module-08-recuperacion-proteccion.json';

export const pathologyModules = {
  module05,
  module06,
  module07,
  module08,
};

// ============================================================================
// MODULE METADATA
// ============================================================================

import metadata from './metadata.json';

export { metadata };

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  coreModules,
  pathologyModules,
  metadata,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Devuelve todas las lecciones del nivel avanzado (core + patologías).
 * @returns {Array} Array de todos los objetos de lección
 */
export function getAllLessons() {
  return [
    ...Object.values(coreModules),
    ...Object.values(pathologyModules),
  ];
}

/**
 * Busca una lección por título.
 * @param {string} title
 * @returns {Object|null}
 */
export function getLessonByTitle(title) {
  return getAllLessons().find(lesson => lesson.title === title) ?? null;
}

/**
 * Devuelve las lecciones de una categoría ('coreModules' | 'pathologyModules').
 * @param {string} category
 * @returns {Object}
 */
export function getLessonsByCategory(category) {
  const categories = { coreModules, pathologyModules };
  return categories[category] ?? {};
}
