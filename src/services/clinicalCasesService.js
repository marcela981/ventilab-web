/**
 * =============================================================================
 * Clinical Cases Service
 * =============================================================================
 * 
 * Servicio para interactuar con el backend para casos clínicos.
 * Maneja errores silenciosamente para no romper la UX si el backend
 * aún no está implementado.
 * 
 * @module clinicalCasesService
 */

/**
 * Envía los resultados de un caso clínico al backend
 * 
 * @param {string} moduleId - ID del módulo
 * @param {Object} payload - Datos del resultado
 * @param {number} payload.score - Puntaje obtenido (0-100)
 * @param {Object} payload.breakdownByDomain - Desglose por dominios
 * @param {Object} payload.answers - Respuestas del estudiante
 * @returns {Promise<Object|null>} Respuesta del backend con id si existe, null si falla
 */
export const postResult = async (moduleId, payload) => {
  try {
    const response = await fetch('/api/clinical-cases/results', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        moduleId,
        ...payload,
        version: 1,
        submittedAt: new Date().toISOString(),
      }),
    });

    // Si la ruta no existe (404), retornar null silenciosamente
    if (response.status === 404) {
      return null;
    }

    // Si hay otro error, lanzar para que se capture
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Si la respuesta incluye un id, retornarlo
    if (data.id) {
      return data;
    }

    return data;
  } catch (error) {
    // Distinguir entre errores de red y otros errores
    // Si es un error de red (NetworkError, Failed to fetch), lanzarlo para que se maneje
    if (error instanceof TypeError && error.message.includes('fetch')) {
      // Error de red real - lanzar para que el componente lo maneje
      throw new Error('Network error: Unable to reach server');
    }
    
    // Otros errores (CORS, etc.) - retornar null silenciosamente
    console.debug('[ClinicalCasesService] Backend no disponible o error:', error.message);
    return null;
  }
};

/**
 * Obtiene el historial de resultados de un módulo desde el backend
 * 
 * @param {string} moduleId - ID del módulo
 * @returns {Promise<Array|null>} Array de resultados o null si falla
 */
export const getResults = async (moduleId) => {
  try {
    const response = await fetch(`/api/clinical-cases/results/${moduleId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.debug('[ClinicalCasesService] Error obteniendo resultados:', error.message);
    return null;
  }
};

