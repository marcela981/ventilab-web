import httpClient, { APIError } from './httpClient';

/**
 * Servicio para gestionar evaluación de casos clínicos
 * Consume los endpoints del backend en /api/cases
 */

/**
 * Obtener lista de casos clínicos disponibles
 */
export async function getCases(filters = {}) {
  try {
    const params = new URLSearchParams();
    
    if (filters.nivel) params.append('nivel', filters.nivel);
    if (filters.patologia) params.append('patologia', filters.patologia);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());

    const queryString = params.toString();
    const endpoint = `/api/cases${queryString ? `?${queryString}` : ''}`;

    const data = await httpClient.get(endpoint);
    return {
      success: true,
      data: {
        cases: data.cases || [],
        pagination: data.pagination || {},
      },
    };
  } catch (error) {
    console.error('Error al obtener casos clínicos:', error);
    return {
      success: false,
      error: error.message || 'Error al obtener casos clínicos',
      data: null,
    };
  }
}

/**
 * Obtener un caso clínico específico
 */
export async function getCaseById(caseId) {
  try {
    if (!caseId) {
      throw new Error('ID del caso es requerido');
    }

    const data = await httpClient.get(`/api/cases/${caseId}`);
    return {
      success: true,
      data: {
        case: data.case,
        userAttempts: data.userAttempts || {
          total: 0,
          bestScore: null,
          lastAttempt: null,
          attempts: [],
        },
      },
    };
  } catch (error) {
    console.error('Error al obtener caso clínico:', error);
    return {
      success: false,
      error: error.message || 'Error al obtener caso clínico',
      data: null,
    };
  }
}

/**
 * Evaluar configuración del usuario para un caso
 */
export async function evaluateCase(caseId, userConfiguration) {
  try {
    if (!caseId) {
      throw new Error('ID del caso es requerido');
    }

    if (!userConfiguration) {
      throw new Error('La configuración del ventilador es requerida');
    }

    // Validar configuración mínima
    if (!userConfiguration.ventilationMode) {
      throw new Error('El modo de ventilación es requerido');
    }

    const data = await httpClient.post(
      `/api/cases/${caseId}/evaluate`,
      { configuration: userConfiguration }
    );

    return {
      success: true,
      data: {
        attempt: data.attempt,
        comparison: data.comparison,
        feedback: data.feedback,
        expertConfiguration: data.expertConfiguration,
        improvement: data.improvement,
      },
    };
  } catch (error) {
    console.error('Error al evaluar caso:', error);
    return {
      success: false,
      error: error.message || 'Error al evaluar caso',
      data: null,
    };
  }
}

/**
 * Obtener historial de intentos de un caso
 */
export async function getCaseAttempts(caseId) {
  try {
    if (!caseId) {
      throw new Error('ID del caso es requerido');
    }

    const data = await httpClient.get(`/api/cases/${caseId}/attempts`);
    return {
      success: true,
      data: {
        case: data.case,
        stats: data.stats,
        attempts: data.attempts || [],
      },
    };
  } catch (error) {
    console.error('Error al obtener intentos:', error);
    return {
      success: false,
      error: error.message || 'Error al obtener intentos',
      data: null,
    };
  }
}

export default {
  getCases,
  getCaseById,
  evaluateCase,
  getCaseAttempts,
};

