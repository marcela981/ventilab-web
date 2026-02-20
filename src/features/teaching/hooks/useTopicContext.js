/**
 * =============================================================================
 * useTopicContext Hook
 * =============================================================================
 * 
 * Hook robusto para capturar el contexto completo de la página actual.
 * Incluye: moduleId, lessonId, sectionId, títulos, breadcrumbs, URL,
 * locale, userLevel, texto visible en viewport, texto seleccionado.
 * 
 * @hook
 */

import { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/shared/hooks/useAuth';
import { getModuleById } from '@/features/teaching/data/curriculumData';

/**
 * Normaliza texto: elimina HTML, normaliza espacios, limita longitud
 * @param {string} text - Texto a normalizar
 * @param {number} maxLength - Longitud máxima
 * @returns {string} Texto normalizado
 */
const normalizeText = (text, maxLength = Infinity) => {
  if (!text || typeof text !== 'string') return '';
  
  // Crear elemento temporal para eliminar HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = text;
  let cleanText = tempDiv.textContent || tempDiv.innerText || '';
  
  // Normalizar espacios: múltiples espacios -> uno solo, eliminar saltos de línea múltiples
  cleanText = cleanText
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
  
  // Eliminar datos sensibles potenciales (emails, números de teléfono, etc.)
  cleanText = cleanText
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[email]')
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[phone]')
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[card]');
  
  // Limitar longitud
  if (cleanText.length > maxLength) {
    cleanText = cleanText.substring(0, maxLength).trim() + '...';
  }
  
  return cleanText;
};

/**
 * Extrae texto visible del viewport usando IntersectionObserver y Range
 * @param {HTMLElement} container - Contenedor a observar
 * @returns {string} Texto visible en el viewport
 */
const extractVisibleText = (container) => {
  if (!container) return '';
  
  try {
    const viewportTop = window.scrollY;
    const viewportBottom = viewportTop + window.innerHeight;
    const visibleRanges = [];
    
    // Obtener todos los nodos de texto dentro del contenedor
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Ignorar scripts, styles, etc.
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          
          const tagName = parent.tagName.toLowerCase();
          if (['script', 'style', 'noscript', 'meta', 'link'].includes(tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Solo incluir texto no vacío
          return node.textContent.trim().length > 0
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT;
        }
      }
    );
    
    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) {
      textNodes.push(node);
    }
    
    // Para cada nodo de texto, verificar si está visible
    for (const textNode of textNodes) {
      const range = document.createRange();
      range.selectNodeContents(textNode);
      const rect = range.getBoundingClientRect();
      
      // Verificar si el nodo está en el viewport
      const nodeTop = rect.top + viewportTop;
      const nodeBottom = rect.bottom + viewportTop;
      
      if (nodeBottom >= viewportTop && nodeTop <= viewportBottom) {
        // Calcular qué parte del texto está visible
        const visibleTop = Math.max(viewportTop, nodeTop);
        const visibleBottom = Math.min(viewportBottom, nodeBottom);
        const visibleRatio = Math.max(0, Math.min(1, (visibleBottom - visibleTop) / (nodeBottom - nodeTop)));
        
        if (visibleRatio > 0.1) { // Al menos 10% visible
          visibleRanges.push({
            text: textNode.textContent,
            ratio: visibleRatio
          });
        }
      }
    }
    
    // Combinar texto visible
    let visibleText = visibleRanges
      .map(r => r.text)
      .join(' ')
      .trim();
    
    // Si no se encontró texto visible, usar fallback: primeros 1500-2000 caracteres
    if (!visibleText || visibleText.length < 100) {
      const allText = normalizeText(container.textContent || container.innerText || '', 2000);
      visibleText = allText.substring(0, Math.min(2000, allText.length));
    }
    
    return normalizeText(visibleText, 2000);
  } catch (error) {
    console.warn('[useTopicContext] Error extracting visible text:', error);
    // Fallback: primeros 1500-2000 caracteres
    const fallbackText = normalizeText(container.textContent || container.innerText || '', 2000);
    return fallbackText.substring(0, Math.min(2000, fallbackText.length));
  }
};

/**
 * Obtiene texto seleccionado por el usuario
 * @returns {string|null} Texto seleccionado o null
 */
const getSelectionText = () => {
  try {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    
    const selectedText = selection.toString().trim();
    if (selectedText.length === 0) return null;
    
    return normalizeText(selectedText, 1500);
  } catch (error) {
    console.warn('[useTopicContext] Error getting selection:', error);
    return null;
  }
};

/**
 * Hook para obtener el contexto completo de la página actual
 * 
 * @param {Object} params - Parámetros del hook
 * @param {React.RefObject<HTMLElement>} params.contentRef - Ref al contenedor de contenido
 * @param {string} [params.moduleId] - ID del módulo (opcional, se obtiene de router si no se provee)
 * @param {string} [params.lessonId] - ID de la lección (opcional, se obtiene de router si no se provee)
 * @param {string} [params.sectionId] - ID de la sección (opcional)
 * @param {Object} [params.moduleData] - Datos del módulo (opcional, se obtiene si no se provee)
 * @param {Object} [params.lessonData] - Datos de la lección (opcional)
 * @param {Object} [params.sectionData] - Datos de la sección actual (opcional)
 * @returns {Object} Contexto de la página
 */
export const useTopicContext = ({
  contentRef,
  moduleId: providedModuleId,
  lessonId: providedLessonId,
  sectionId: providedSectionId,
  moduleData: providedModuleData,
  lessonData,
  sectionData,
}) => {
  const router = useRouter();
  const { user } = useAuth();
  const [visibleText, setVisibleText] = useState('');
  const [selectionText, setSelectionText] = useState(null);
  const observerRef = useRef(null);
  const updateTimeoutRef = useRef(null);
  
  // Obtener IDs de router o props
  const moduleId = providedModuleId || router.query?.moduleId || null;
  const lessonId = providedLessonId || router.query?.lessonId || null;
  const sectionId = providedSectionId || sectionData?.id || null;
  
  // Obtener datos del módulo
  const moduleData = useMemo(() => {
    if (providedModuleData) return providedModuleData;
    if (moduleId) return getModuleById(moduleId);
    return null;
  }, [providedModuleData, moduleId]);
  
  // Obtener títulos
  const moduleTitle = moduleData?.title || null;
  const lessonTitle = lessonData?.title || null;
  const sectionTitle = sectionData?.title || sectionData?.name || null;
  
  // Construir breadcrumbs
  const breadcrumbs = useMemo(() => {
    const crumbs = [];
    if (moduleTitle) crumbs.push(moduleTitle);
    if (lessonTitle) crumbs.push(lessonTitle);
    if (sectionTitle) crumbs.push(sectionTitle);
    return crumbs;
  }, [moduleTitle, lessonTitle, sectionTitle]);
  
  // Obtener URL de la página
  const pageUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return window.location.pathname + window.location.search;
  }, []);
  
  // Obtener locale (por defecto 'es' si no se puede determinar)
  const locale = useMemo(() => {
    if (typeof window === 'undefined') return 'es';
    return router.locale || window.navigator.language?.split('-')[0] || 'es';
  }, [router.locale]);
  
  // Obtener userLevel
  const userLevel = useMemo(() => {
    if (!user?.userLevel) return null;
    const level = user.userLevel.toLowerCase();
    if (['beginner', 'intermediate', 'advanced'].includes(level)) {
      return level;
    }
    // Mapear desde formato backend (BEGINNER, INTERMEDIATE, ADVANCED)
    const levelMap = {
      'beginner': 'beginner',
      'intermediate': 'intermediate',
      'advanced': 'advanced',
    };
    return levelMap[level] || null;
  }, [user]);
  
  // Calcular contenido total del contenedor
  const contentLength = useMemo(() => {
    if (!contentRef?.current) return 0;
    const text = contentRef.current.textContent || contentRef.current.innerText || '';
    return text.length;
  }, [contentRef]);
  
  // Actualizar texto visible cuando cambia el scroll o el contenido
  useEffect(() => {
    if (!contentRef?.current) {
      setVisibleText('');
      return;
    }
    
    const updateVisibleText = () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      
      // Throttle updates
      updateTimeoutRef.current = setTimeout(() => {
        const text = extractVisibleText(contentRef.current);
        setVisibleText(text);
      }, 100);
    };
    
    // Actualizar inmediatamente
    updateVisibleText();
    
    // Observar cambios en el scroll
    window.addEventListener('scroll', updateVisibleText, { passive: true });
    window.addEventListener('resize', updateVisibleText, { passive: true });
    
    // Observar cambios en el contenido usando MutationObserver
    const mutationObserver = new MutationObserver(updateVisibleText);
    mutationObserver.observe(contentRef.current, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    
    // Usar IntersectionObserver para detectar cambios de visibilidad
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(() => {
          updateVisibleText();
        });
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: [0, 0.1, 0.5, 1.0],
      }
    );
    
    // Observar elementos hijos importantes
    const importantElements = contentRef.current.querySelectorAll(
      'p, h1, h2, h3, h4, h5, h6, li, td, th, div[role="article"], article'
    );
    importantElements.forEach(el => intersectionObserver.observe(el));
    
    observerRef.current = {
      mutationObserver,
      intersectionObserver,
      elements: importantElements,
    };
    
    return () => {
      window.removeEventListener('scroll', updateVisibleText);
      window.removeEventListener('resize', updateVisibleText);
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      if (observerRef.current) {
        observerRef.current.mutationObserver.disconnect();
        observerRef.current.intersectionObserver.disconnect();
      }
    };
  }, [contentRef, sectionId]); // Re-evaluar cuando cambia la sección
  
  // Actualizar texto seleccionado
  useEffect(() => {
    const handleSelectionChange = () => {
      const selected = getSelectionText();
      setSelectionText(selected);
    };
    
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);
  
  // Obtener contenido de la sección para compatibilidad con servicios
  const sectionContent = useMemo(() => {
    if (sectionData?.content?.markdown) {
      return sectionData.content.markdown;
    }
    if (typeof sectionData?.content === 'string') {
      return sectionData.content;
    }
    // Si no hay contenido de sección, usar texto visible como fallback
    return visibleText || '';
  }, [sectionData, visibleText]);
  
  // Construir contexto completo con nueva API y campos de compatibilidad
  const context = useMemo(() => {
    return {
      // Nueva API (especificada)
      moduleId: moduleId || null,
      lessonId: lessonId || null,
      sectionId: sectionId || null,
      moduleTitle: moduleTitle || null,
      lessonTitle: lessonTitle || null,
      sectionTitle: sectionTitle || null,
      breadcrumbs: breadcrumbs || [],
      pageUrl: pageUrl || '',
      locale: locale || 'es',
      userLevel: userLevel || null,
      visibleText: visibleText || '',
      selectionText: selectionText || null,
      contentLength: contentLength || 0,
      
      // Campos de compatibilidad con servicios existentes
      route: pageUrl || '', // Mapear pageUrl a route para compatibilidad
      pageType: sectionData?.type || null,
      sectionType: sectionData?.type || null,
      sectionContent: sectionContent || '',
      userSelection: selectionText || null, // Mapear selectionText a userSelection
      visibleTextBlock: visibleText || null, // Mapear visibleText a visibleTextBlock
      lessonDescription: lessonData?.description || null,
      sectionOrder: sectionData?.order || null,
      estimatedTime: sectionData?.estimatedTime || null,
    };
  }, [
    moduleId,
    lessonId,
    sectionId,
    moduleTitle,
    lessonTitle,
    sectionTitle,
    breadcrumbs,
    pageUrl,
    locale,
    userLevel,
    visibleText,
    selectionText,
    contentLength,
    sectionContent,
    sectionData,
    lessonData,
  ]);
  
  return context;
};

export default useTopicContext;
