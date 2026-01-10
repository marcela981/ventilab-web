import { useMemo } from 'react';

/**
 * Hook para calcular las páginas de una lección
 * @param {Object} data - Datos de la lección
 * @param {string} [moduleId] - ID del módulo (opcional, para caso clínico)
 * @param {number} [moduleCompletion] - Porcentaje de completitud del módulo (0-100, opcional)
 * @returns {Array} Array de objetos de página con type y contenido
 */
const useLessonPages = (data, moduleId = null, moduleCompletion = 0) => {
  return useMemo(() => {
    if (!data) return [];
    
    const pages = [];
    let pageIndex = 0;
    
    // Página 0: Header + Introducción
    if (data.content?.introduction) {
      pages.push({ type: 'header-intro', index: pageIndex++ });
    }
    
    // Páginas de teoría (cada sección es una página)
    if (data.content?.theory?.sections) {
      data.content.theory.sections.forEach((section, idx) => {
        pages.push({ type: 'theory', index: pageIndex++, sectionIndex: idx, section });
      });
      
      // Analogías (una página por analogía, o todas juntas si son pocas)
      if (data.content.theory.analogies && data.content.theory.analogies.length > 0) {
        if (data.content.theory.analogies.length <= 3) {
          pages.push({ type: 'analogies', index: pageIndex++ });
        } else {
          data.content.theory.analogies.forEach((analogy, idx) => {
            pages.push({ type: 'analogy', index: pageIndex++, analogyIndex: idx, analogy });
          });
        }
      }
    }
    
    // Elementos visuales
    if (data.content?.visualElements && data.content.visualElements.length > 0) {
      pages.push({ type: 'visual-elements', index: pageIndex++ });
    }
    
    // Waveforms
    if (data.content?.waveforms) {
      pages.push({ type: 'waveforms', index: pageIndex++ });
    }
    
    // Parameter tables
    const sections = data?.sections || data?.content?.sections || [];
    const parameterTableSections = Array.isArray(sections)
      ? sections.filter(s => String(s.type).toLowerCase() === 'parameter-table')
      : [];
    if (parameterTableSections.length > 0) {
      pages.push({ type: 'parameter-tables', index: pageIndex++ });
    }
    
    // Casos prácticos (cada caso es una página)
    if (data.content?.practicalCases && data.content.practicalCases.length > 0) {
      data.content.practicalCases.forEach((practicalCase, idx) => {
        pages.push({ type: 'practical-case', index: pageIndex++, caseIndex: idx, case: practicalCase });
      });
    }
    
    // Puntos clave
    if (data.content?.keyPoints && data.content.keyPoints.length > 0) {
      pages.push({ type: 'key-points', index: pageIndex++ });
    }
    
    // Autoevaluación
    if (data.content?.assessment?.questions && data.content.assessment.questions.length > 0) {
      pages.push({ type: 'assessment', index: pageIndex++ });
    }
    
    // Referencias
    if (data.content?.references && data.content.references.length > 0) {
      pages.push({ type: 'references', index: pageIndex++ });
    }
    
    // Página final de completación (gamificada)
    pages.push({ type: 'completion', index: pageIndex++ });
    
    // Página de Caso Clínico (siempre aparece si hay moduleId, pero puede estar bloqueada)
    // Aparece después de la página de completion
    if (moduleId) {
      pages.push({ type: 'clinical-case', index: pageIndex++ });
    }
    
    return pages;
  }, [data, moduleId, moduleCompletion]);
};

export default useLessonPages;

