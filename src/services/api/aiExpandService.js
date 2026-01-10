/**
 * =============================================================================
 * AI Expand Service
 * =============================================================================
 * 
 * Servicio para realizar llamadas al backend para expandir temas con IA.
 * Incluye manejo de errores, abort controller, reintentos y sanitización.
 * 
 * @service
 * @contract
 * - POST /api/ai/expand-topic
 * - Request: { userInput: string, context: TopicContext }
 * - Response: ExpandResult
 */

import { getAuthToken } from '../authService';

/**
 * API Base URL
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

/**
 * Timeout en milisegundos (25 segundos)
 */
const REQUEST_TIMEOUT = 25000;

/**
 * Número máximo de reintentos (1 reintento)
 */
const MAX_RETRIES = 1;

/**
 * Delay entre reintentos en milisegundos
 */
const RETRY_DELAY = 1000;

/**
 * Límite de palabras para la explicación (800-1200 palabras)
 */
const MIN_WORDS = 800;
const MAX_WORDS = 1200;

/**
 * Contar palabras en un texto
 * @param {string} text - Texto a contar
 * @returns {number} Número de palabras
 */
function countWords(text) {
  if (!text || typeof text !== 'string') return 0;
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Limitar texto a un rango de palabras (800-1200)
 * @param {string} text - Texto a limitar
 * @param {number} minWords - Mínimo de palabras (default: 800)
 * @param {number} maxWords - Máximo de palabras (default: 1200)
 * @returns {string} Texto limitado
 */
function limitWords(text, minWords = MIN_WORDS, maxWords = MAX_WORDS) {
  if (!text || typeof text !== 'string') return '';
  
  const words = text.trim().split(/\s+/);
  const wordCount = words.length;
  
  // Si está dentro del rango, retornar tal cual
  if (wordCount >= minWords && wordCount <= maxWords) {
    return text.trim();
  }
  
  // Si es menor al mínimo, retornar tal cual (no agregar contenido)
  if (wordCount < minWords) {
    return text.trim();
  }
  
  // Si excede el máximo, truncar en la última palabra completa antes del límite
  if (wordCount > maxWords) {
    const truncated = words.slice(0, maxWords).join(' ');
    // Intentar terminar en un punto o signo de puntuación
    const lastPunctuation = truncated.lastIndexOf('.');
    const lastExclamation = truncated.lastIndexOf('!');
    const lastQuestion = truncated.lastIndexOf('?');
    const lastSentenceEnd = Math.max(lastPunctuation, lastExclamation, lastQuestion);
    
    if (lastSentenceEnd > maxWords * 0.8) { // Si hay un punto cerca del final (80% del texto)
      return truncated.substring(0, lastSentenceEnd + 1).trim();
    }
    
    return truncated.trim() + '...';
  }
  
  return text.trim();
}

/**
 * Sanitizar texto: eliminar HTML peligroso y normalizar espacios
 * @param {string} text - Texto a sanitizar
 * @returns {string} Texto sanitizado
 */
function sanitizeText(text) {
  if (!text || typeof text !== 'string') return '';
  
  // Crear elemento temporal para eliminar HTML
  const tempDiv = document.createElement('div');
  tempDiv.textContent = text;
  let cleanText = tempDiv.textContent || tempDiv.innerText || '';
  
  // Normalizar espacios: múltiples espacios -> uno solo
  cleanText = cleanText.replace(/\s+/g, ' ').trim();
  
  // Eliminar caracteres de control excepto saltos de línea y tabs
  cleanText = cleanText.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
  
  return cleanText;
}

/**
 * Verificar si un error es transitorio (5xx) y debe reintentarse
 * @param {number} status - Código de estado HTTP
 * @param {Error} error - Error original
 * @returns {boolean} True si es un error transitorio
 */
function isTransientError(status, error) {
  // Errores 5xx son transitorios
  if (status >= 500 && status < 600) {
    return true;
  }
  
  // Errores de red (sin status) pueden ser transitorios
  if (!status && error && (
    error.message?.includes('fetch') ||
    error.message?.includes('network') ||
    error.message?.includes('Failed to fetch')
  )) {
    return true;
  }
  
  return false;
}

/**
 * Realizar petición con reintentos
 * @param {string} url - URL del endpoint
 * @param {Object} options - Opciones de fetch
 * @param {AbortController} abortController - Controlador de abort
 * @param {number} retryCount - Número de reintento actual
 * @returns {Promise<Response>}
 */
async function fetchWithRetry(url, options, abortController, retryCount = 0) {
  try {
    const response = await fetch(url, {
      ...options,
      signal: abortController.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Si es exitoso, retornar
    if (response.ok) {
      return response;
    }

    const status = response.status;

    // Intentar parsear el cuerpo de error para obtener el mensaje
    let errorMessage = `Request failed: ${status}`;
    let errorData = null;
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        errorData = await response.json().catch(() => null);
        if (errorData) {
          errorMessage = errorData.error?.message || errorData.message || errorMessage;
        }
      }
    } catch (e) {
      // Si no se puede parsear, usar el mensaje por defecto
    }

    // Errores 4xx (excepto 429) no se reintentan
    if (status >= 400 && status < 500 && status !== 429) {
      const error = new Error(errorMessage);
      error.status = status;
      error.data = errorData;
      throw error;
    }

    // Errores 429 (rate limit) no se reintentan
    if (status === 429) {
      const error = new Error(errorMessage || 'Rate limit exceeded');
      error.status = 429;
      error.data = errorData;
      throw error;
    }

    // Errores 5xx: reintentar si no hemos excedido el máximo (excepto 503 que no es transitorio)
    // 503 (Service Unavailable) generalmente indica configuración incorrecta, no un error transitorio
    if (status === 503) {
      // No reintentar errores 503 - generalmente son problemas de configuración
      const error = new Error(errorMessage);
      error.status = 503;
      error.data = errorData;
      throw error;
    }

    if (isTransientError(status) && retryCount < MAX_RETRIES) {
      // Esperar antes de reintentar (backoff exponencial)
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
      
      // Reintentar
      return fetchWithRetry(url, options, abortController, retryCount + 1);
    }

    // Si llegamos aquí, no se puede reintentar
    const error = new Error(errorMessage);
    error.status = status;
    error.data = errorData;
    throw error;
  } catch (error) {
    // Si fue abortado, no reintentar
    if (error.name === 'AbortError') {
      throw error;
    }

    // Si es un error de red transitorio y no hemos excedido el máximo, reintentar
    if (isTransientError(null, error) && retryCount < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
      return fetchWithRetry(url, options, abortController, retryCount + 1);
    }

    throw error;
  }
}

/**
 * Mapear contexto del formato TopicContext al formato del backend
 * @param {Object} context - Contexto en formato TopicContext
 * @returns {Object} Contexto en formato del backend
 */
function mapContextToBackend(context) {
  // Mapear breadcrumbs: si son strings, convertirlos a objetos con formato del backend
  let breadcrumbs = [];
  if (Array.isArray(context.breadcrumbs)) {
    breadcrumbs = context.breadcrumbs.map((crumb, index) => {
      // Si ya es un objeto, usar tal cual
      if (typeof crumb === 'object' && crumb !== null) {
        return {
          label: crumb.label || String(crumb),
          id: crumb.id || String(crumb),
          type: crumb.type || (index === 0 ? 'module' : index === 1 ? 'lesson' : 'section'),
        };
      }
      // Si es un string, crear objeto
      return {
        label: String(crumb),
        id: String(crumb),
        type: index === 0 ? 'module' : index === 1 ? 'lesson' : 'section',
      };
    });
  }

  // El backend requiere lessonId como string no vacío
  const lessonId = context.lessonId;

  return {
    moduleId: context.moduleId || null,
    lessonId: lessonId, // Requerido por el backend
    sectionId: context.sectionId || null,
    moduleTitle: context.moduleTitle || null,
    lessonTitle: context.lessonTitle || null,
    sectionTitle: context.sectionTitle || null,
    route: context.pageUrl || null,
    breadcrumbs: breadcrumbs.length > 0 ? breadcrumbs : undefined,
    pageType: null, // No está en el contrato especificado
    sectionContent: context.visibleText || null,
    sectionType: null, // No está en el contrato especificado
    userSelection: context.selectionText || null,
    visibleTextBlock: context.visibleText || null,
    lessonDescription: null, // No está en el contrato especificado
    sectionOrder: null, // No está en el contrato especificado
    estimatedTime: null, // No está en el contrato especificado
  };
}

/**
 * Mapear respuesta del backend al formato ExpandResult
 * @param {Object} backendResponse - Respuesta del backend
 * @returns {Object} Respuesta en formato ExpandResult
 */
function mapBackendToExpandResult(backendResponse) {
  const { expandedExplanation, keyPoints, suggestedReferences, internalLinks } = backendResponse;

  // Sanitizar y limitar explicación
  const explanation = limitWords(sanitizeText(expandedExplanation || ''));

  // Sanitizar puntos clave
  const sanitizedKeyPoints = Array.isArray(keyPoints)
    ? keyPoints.map(point => sanitizeText(String(point || ''))).filter(p => p.length > 0)
    : [];

  // Mapear referencias sugeridas a furtherReading
  const furtherReading = Array.isArray(suggestedReferences)
    ? suggestedReferences
        .map(ref => {
          if (typeof ref === 'string') {
            return sanitizeText(ref);
          }
          if (ref && typeof ref === 'object') {
            // Si tiene URL, crear un string con título y URL
            if (ref.url) {
              const title = sanitizeText(ref.title || '');
              const url = String(ref.url || '');
              return title ? `${title} (${url})` : url;
            }
            // Si solo tiene título
            if (ref.title) {
              return sanitizeText(ref.title);
            }
          }
          return null;
        })
        .filter(ref => ref && ref.length > 0)
    : [];

  // Mapear enlaces internos
  const mappedInternalLinks = Array.isArray(internalLinks)
    ? internalLinks
        .map(link => {
          if (link && typeof link === 'object') {
            return {
              title: sanitizeText(link.title || ''),
              route: String(link.url || link.route || ''),
            };
          }
          return null;
        })
        .filter(link => link && link.title && link.route)
    : [];

  // Extraer citaciones si existen en la explicación o puntos clave
  const citations = [];
  const allText = [explanation, ...sanitizedKeyPoints].join(' ');
  
  // Buscar patrones de citación comunes (ej: [1], (Smith, 2020), etc.)
  const citationPatterns = [
    /\[(\d+)\]/g, // [1], [2], etc.
    /\(([A-Z][a-z]+,\s*\d{4})\)/g, // (Smith, 2020)
    /\(([A-Z][a-z]+\s+et\s+al\.?,\s*\d{4})\)/g, // (Smith et al., 2020)
  ];
  
  citationPatterns.forEach(pattern => {
    const matches = allText.match(pattern);
    if (matches) {
      citations.push(...matches.map(m => sanitizeText(m)));
    }
  });

  // Eliminar duplicados de citaciones
  const uniqueCitations = [...new Set(citations)];

  return {
    explanation,
    keyPoints: sanitizedKeyPoints,
    furtherReading,
    ...(mappedInternalLinks.length > 0 && { internalLinks: mappedInternalLinks }),
    ...(uniqueCitations.length > 0 && { citations: uniqueCitations }),
  };
}

/**
 * Expandir un tema usando IA
 * 
 * @param {Object} params - Parámetros de la expansión
 * @param {string} params.userInput - Input del usuario
 * @param {Object} params.context - Contexto del tema (TopicContext)
 * @param {AbortController} [params.abortController] - Controlador de abort opcional (se crea uno nuevo si no se proporciona)
 * @returns {Promise<Object>} Resultado de la expansión (ExpandResult)
 * 
 * @typedef {Object} TopicContext
 * @property {string} moduleId - ID del módulo
 * @property {string} lessonId - ID de la lección
 * @property {string} sectionId - ID de la sección
 * @property {string} moduleTitle - Título del módulo
 * @property {string} lessonTitle - Título de la lección
 * @property {string} sectionTitle - Título de la sección
 * @property {string[]} breadcrumbs - Breadcrumbs
 * @property {string} pageUrl - URL de la página
 * @property {string} locale - Locale (ej: "es-CO")
 * @property {string} userLevel - Nivel del usuario ("beginner", "intermediate", "advanced")
 * @property {string} visibleText - Texto visible
 * @property {string|null} selectionText - Texto seleccionado
 * @property {number} contentLength - Longitud del contenido
 * 
 * @typedef {Object} ExpandResult
 * @property {string} explanation - Explicación expandida (800-1200 palabras)
 * @property {string[]} keyPoints - Puntos clave
 * @property {string[]} furtherReading - Lecturas adicionales
 * @property {Array<{title: string, route: string}>} [internalLinks] - Enlaces internos (opcional)
 * @property {string[]} [citations] - Citaciones (opcional)
 */
export async function expandTopic({ userInput, context, abortController: providedAbortController }) {
  // Validar parámetros
  if (!context) {
    throw new Error('context is required');
  }

  if (typeof userInput !== 'string') {
    throw new Error('userInput must be a string');
  }

  // Validar que el contexto tenga los campos mínimos requeridos
  if (!context.lessonId) {
    throw new Error('context.lessonId is required');
  }

  // Crear AbortController si no se proporciona uno
  const abortController = providedAbortController || new AbortController();
  const shouldCleanupTimeout = !providedAbortController; // Solo limpiar timeout si lo creamos nosotros

  // Configurar timeout solo si creamos el AbortController
  let timeoutId = null;
  if (shouldCleanupTimeout) {
    timeoutId = setTimeout(() => {
      abortController.abort();
    }, REQUEST_TIMEOUT);
  }

  try {
    // Mapear contexto al formato del backend
    const backendContext = mapContextToBackend(context);

    // Construir URL
    const url = `${API_BASE_URL}/ai/expand-topic`;

    // Construir body de la petición
    // El backend ahora acepta 'userInput' según el contrato especificado
    const requestBody = {
      userInput: userInput || null,
      context: backendContext,
    };

    // Obtener token de autenticación
    const token = getAuthToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };

    // Realizar petición con reintentos
    const response = await fetchWithRetry(
      url,
      {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers,
      },
      abortController
    );

    // Limpiar timeout solo si lo creamos nosotros
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Parsear respuesta
    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error('[aiExpandService] Error parseando respuesta:', parseError);
      throw new Error('Invalid response from server');
    }

    // Validar estructura de respuesta
    if (!data.success || !data.data) {
      const errorMessage = data.error?.message || data.message || 'Error expanding topic';
      const errorCode = data.error?.code || 'UNKNOWN_ERROR';
      const errorStatus = data.error?.status || response.status;
      console.error('[aiExpandService] Error del backend:', { errorMessage, errorCode, errorStatus, data });
      
      // Crear error con código y status para mejor manejo
      const error = new Error(errorMessage);
      error.code = errorCode;
      error.status = errorStatus;
      throw error;
    }

    // Mapear respuesta al formato ExpandResult
    const expandResult = mapBackendToExpandResult(data.data);

    return expandResult;
  } catch (error) {
    // Limpiar timeout solo si lo creamos nosotros
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Si fue abortado (incluyendo timeout)
    if (error.name === 'AbortError') {
      throw new Error('Request timeout: The request took too long to complete');
    }

    // Si es un error de red
    if (!error.status && (
      error.message?.includes('fetch') ||
      error.message?.includes('network') ||
      error.message?.includes('Failed to fetch')
    )) {
      throw new Error('Network error: Please check your internet connection');
    }

    // Si es un error 429 (rate limit)
    if (error.status === 429) {
      throw new Error('Rate limit exceeded: Please try again later');
    }

    // Si es un error 500 (servidor)
    if (error.status === 500) {
      console.error('[aiExpandService] Error 500 del servidor:', error);
      throw new Error('Server error: Please try again later. If the problem persists, contact support.');
    }

    // Si es un error 503 (servicio no disponible)
    if (error.status === 503) {
      console.error('[aiExpandService] Error 503 - Servicio no disponible:', error);
      // El mensaje del error ya viene del backend con detalles específicos
      throw new Error(error.message || 'AI service temporarily unavailable. Please check backend configuration.');
    }

    // Si es un error 4xx
    if (error.status >= 400 && error.status < 500) {
      throw new Error(`Request failed: ${error.message || `HTTP ${error.status}`}`);
    }

    // Otros errores
    throw new Error(error.message || 'An unexpected error occurred');
  }
}

// Exportar por defecto
export default {
  expandTopic,
};
