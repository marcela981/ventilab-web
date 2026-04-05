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
    
    // ============================================
    // UNIFIED FORMAT (data.sections array)
    // ============================================
    if (data.sections && Array.isArray(data.sections) && data.sections.length > 0) {
      data.sections.forEach((section, idx) => {
        // Skip 'case' and 'clinical-case' type sections — the interactive clinical
        // case UI is not implemented, so these would render as blank pages.
        if (section.type === 'case' || section.type === 'clinical-case') return;

        // We map the first section (often introduction) to header-intro to get the big header
        if (idx === 0 || section.type === 'introduction') {
          pages.push({ 
            type: 'header-intro', 
            index: pageIndex++, 
            sectionIndex: idx,
            section 
          });
        } else {
          // Everything else map to theory format which renders Markdown correctly
          pages.push({ 
            type: 'theory', 
            index: pageIndex++, 
            sectionIndex: idx, 
            section 
          });
        }
      });
      
      if (data.quiz && data.quiz.questions && data.quiz.questions.length > 0) {
        pages.push({ type: 'assessment', index: pageIndex++ });
      }

      if (data.resources && data.resources.references && data.resources.references.length > 0) {
        pages.push({ type: 'references', index: pageIndex++ });
      }

    } else {
      // ============================================
      // LEGACY FORMAT (data.content.theory.sections)
      // ============================================
      if (data.content?.introduction) {
        pages.push({ type: 'header-intro', index: pageIndex++ });
      }
      
      if (data.content?.theory?.sections) {
        data.content.theory.sections.forEach((section, idx) => {
          pages.push({ type: 'theory', index: pageIndex++, sectionIndex: idx, section });
        });
        
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
      
      if (data.content?.visualElements && data.content.visualElements.length > 0) {
        pages.push({ type: 'visual-elements', index: pageIndex++ });
      }
      
      if (data.content?.waveforms) {
        pages.push({ type: 'waveforms', index: pageIndex++ });
      }
      
      const parameterTableSections = data.content?.sections 
        ? data.content.sections.filter(s => String(s.type).toLowerCase() === 'parameter-table')
        : [];
      if (parameterTableSections.length > 0) {
        pages.push({ type: 'parameter-tables', index: pageIndex++ });
      }
      
      
      if (data.content?.keyPoints && data.content.keyPoints.length > 0) {
        pages.push({ type: 'key-points', index: pageIndex++ });
      }
      
      if (data.content?.assessment?.questions && data.content.assessment.questions.length > 0) {
        pages.push({ type: 'assessment', index: pageIndex++ });
      }
      
      if (data.content?.references && data.content.references.length > 0) {
        pages.push({ type: 'references', index: pageIndex++ });
      }
    }
    
    // Página final de completación (gamificada)
    pages.push({ type: 'completion', index: pageIndex++ });

    return pages;
  }, [data, moduleId, moduleCompletion]);
};

export default useLessonPages;

