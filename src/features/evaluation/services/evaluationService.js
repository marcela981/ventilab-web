/**
 * =============================================================================
 * Funcionalidad : Servicio de Evaluación (frontend) — casos clínicos + quizzes/actividades
 * Descripción   : Cliente HTTP único para los endpoints de evaluación del
 *                 backend VentyLab. Reemplaza la antigua lectura estática de
 *                 archivos JSON desde `src/features/evaluation/shared/data/`.
 *
 *                 Endpoints consumidos (resueltos contra `BACKEND_API_URL`,
 *                 que ya incluye `/api`, por lo que las rutas aquí NO repiten
 *                 ese prefijo):
 *                   /cases/*                  → casos clínicos
 *                   /evaluation/quizzes/*     → quizzes (26 ítems)
 *                   /evaluation/activities/*  → exámenes (6) + talleres (9)
 *
 *                 Todas las funciones devuelven una forma uniforme:
 *                   { success: boolean, data?: T, error?: string }
 *
 * Versión       : 2.0
 * Autor         : Marcela Mazo Castro
 * Proyecto      : VentyLab
 * Tesis         : Desarrollo de una aplicación web para la enseñanza de
 *                 mecánica ventilatoria que integre un sistema de
 *                 retroalimentación usando modelos de lenguaje
 * Institución   : Universidad del Valle
 * Contacto      : marcela.mazo@correounivalle.edu.co
 * =============================================================================
 */

import http from '@/shared/services/api/http';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers internos
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normaliza un error de Axios/red a un mensaje legible para la UI.
 * @param {unknown} error
 * @param {string} fallback
 * @returns {string}
 */
function toErrorMessage(error, fallback) {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  // Axios error → response.data.message
  const apiMsg = error?.response?.data?.message;
  if (typeof apiMsg === 'string' && apiMsg.length > 0) return apiMsg;
  if (typeof error.message === 'string' && error.message.length > 0) return error.message;
  return fallback;
}

/**
 * Construye un querystring filtrando claves vacías/undefined.
 * @param {Record<string, string | number | undefined | null>} params
 * @returns {string}
 */
function buildQuery(params) {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined || value === null || value === '') continue;
    usp.append(key, String(value));
  }
  const q = usp.toString();
  return q ? `?${q}` : '';
}

// =============================================================================
// CASOS CLÍNICOS — /api/cases (sin cambios respecto a v1.x)
// =============================================================================

/**
 * Obtener lista de casos clínicos disponibles.
 * @param {{ nivel?: string, patologia?: string, limit?: number, offset?: number }} [filters]
 */
export async function getCases(filters = {}) {
  try {
    const endpoint = `/cases${buildQuery({
      nivel: filters.nivel,
      patologia: filters.patologia,
      limit: filters.limit,
      offset: filters.offset,
    })}`;

    const { data } = await http.get(endpoint);
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
      error: toErrorMessage(error, 'Error al obtener casos clínicos'),
      data: null,
    };
  }
}

/**
 * Obtener un caso clínico específico.
 * @param {string} caseId
 */
export async function getCaseById(caseId) {
  try {
    if (!caseId) throw new Error('ID del caso es requerido');

    const { data } = await http.get(`/cases/${encodeURIComponent(caseId)}`);
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
      error: toErrorMessage(error, 'Error al obtener caso clínico'),
      data: null,
    };
  }
}

/**
 * Evaluar configuración del usuario para un caso clínico.
 * @param {string} caseId
 * @param {Record<string, unknown>} userConfiguration
 */
export async function evaluateCase(caseId, userConfiguration) {
  try {
    if (!caseId) throw new Error('ID del caso es requerido');
    if (!userConfiguration) throw new Error('La configuración del ventilador es requerida');
    if (!userConfiguration.ventilationMode) throw new Error('El modo de ventilación es requerido');

    const { data } = await http.post(
      `/cases/${encodeURIComponent(caseId)}/evaluate`,
      { configuration: userConfiguration },
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
      error: toErrorMessage(error, 'Error al evaluar caso'),
      data: null,
    };
  }
}

/**
 * Obtener historial de intentos de un caso clínico.
 * @param {string} caseId
 */
export async function getCaseAttempts(caseId) {
  try {
    if (!caseId) throw new Error('ID del caso es requerido');

    const { data } = await http.get(`/cases/${encodeURIComponent(caseId)}/attempts`);
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
      error: toErrorMessage(error, 'Error al obtener intentos'),
      data: null,
    };
  }
}

// =============================================================================
// QUIZZES — /api/evaluation/quizzes
// =============================================================================

/**
 * Obtener todos los quizzes activos (opcionalmente filtrados por moduleId).
 * Backend: GET /api/evaluation/quizzes?moduleId=X → { success, data: Quiz[] }
 *
 * @param {string} [moduleId]
 */
export async function getQuizzes(moduleId) {
  try {
    const endpoint = `/evaluation/quizzes${buildQuery({ moduleId })}`;
    const { data } = await http.get(endpoint);
    return {
      success: true,
      data: {
        quizzes: Array.isArray(data?.data) ? data.data : [],
      },
    };
  } catch (error) {
    console.error('Error al obtener quizzes:', error);
    return {
      success: false,
      error: toErrorMessage(error, 'Error al obtener quizzes'),
      data: { quizzes: [] },
    };
  }
}

/**
 * Obtener un quiz específico por id (incluye preguntas y opciones).
 * Backend: GET /api/evaluation/quizzes/:quizId → { success, data: Quiz }
 *
 * @param {string} quizId
 */
export async function getQuizById(quizId) {
  try {
    if (!quizId) throw new Error('ID del quiz es requerido');

    const { data } = await http.get(`/evaluation/quizzes/${encodeURIComponent(quizId)}`);
    return {
      success: true,
      data: { quiz: data?.data ?? null },
    };
  } catch (error) {
    console.error('Error al obtener quiz:', error);
    return {
      success: false,
      error: toErrorMessage(error, 'Error al obtener quiz'),
      data: null,
    };
  }
}

/**
 * Obtener el listado de intentos del usuario autenticado para todos los quizzes.
 * Backend: GET /api/evaluation/quizzes/my-attempts → { success, attempts: QuizAttempt[] }
 */
export async function getMyQuizAttempts() {
  try {
    const { data } = await http.get('/evaluation/quizzes/my-attempts');
    return {
      success: true,
      data: { attempts: Array.isArray(data?.attempts) ? data.attempts : [] },
    };
  } catch (error) {
    console.error('Error al obtener intentos del usuario:', error);
    return {
      success: false,
      error: toErrorMessage(error, 'Error al obtener intentos'),
      data: { attempts: [] },
    };
  }
}

/**
 * Obtener el último intento del usuario para un quiz puntual.
 * Backend: GET /api/evaluation/quizzes/:quizId/my-attempt → { success, attempt: QuizAttempt | null }
 *
 * @param {string} quizId
 */
export async function getMyQuizAttempt(quizId) {
  try {
    if (!quizId) throw new Error('ID del quiz es requerido');

    const { data } = await http.get(
      `/evaluation/quizzes/${encodeURIComponent(quizId)}/my-attempt`,
    );
    return {
      success: true,
      data: { attempt: data?.attempt ?? null },
    };
  } catch (error) {
    console.error('Error al obtener intento del quiz:', error);
    return {
      success: false,
      error: toErrorMessage(error, 'Error al obtener intento del quiz'),
      data: { attempt: null },
    };
  }
}

/**
 * Enviar respuestas de un intento de quiz para calificación inmediata.
 * Política del backend: 1 sólo intento por usuario por quiz (409 si repite).
 *
 * Backend: POST /api/evaluation/quizzes/:quizId/attempt
 *   body: { answers: Array<{ questionId, selectedOptionId }> }
 *   resp: { success, attemptId, score, passed, totalQuestions, correctAnswers, gradedQuestions }
 *
 * @param {string} quizId
 * @param {Array<{ questionId: string, selectedOptionId: string }>} answers
 */
export async function submitQuizAttempt(quizId, answers) {
  try {
    if (!quizId) throw new Error('ID del quiz es requerido');
    if (!Array.isArray(answers) || answers.length === 0) {
      throw new Error('Se requieren respuestas para enviar el intento');
    }

    const { data } = await http.post(
      `/evaluation/quizzes/${encodeURIComponent(quizId)}/attempt`,
      { answers },
    );

    return {
      success: true,
      data: {
        attemptId: data?.attemptId ?? null,
        score: data?.score ?? 0,
        passed: Boolean(data?.passed),
        totalQuestions: data?.totalQuestions ?? 0,
        correctAnswers: data?.correctAnswers ?? 0,
        gradedQuestions: Array.isArray(data?.gradedQuestions) ? data.gradedQuestions : [],
      },
    };
  } catch (error) {
    // Caso especial: 409 → ya completó este quiz; el backend devuelve attempt previo
    const status = error?.response?.status;
    if (status === 409) {
      return {
        success: false,
        error: error?.response?.data?.message ?? 'Ya completaste este quiz',
        alreadyAttempted: true,
        data: { attempt: error?.response?.data?.attempt ?? null },
      };
    }
    console.error('Error al enviar intento del quiz:', error);
    return {
      success: false,
      error: toErrorMessage(error, 'Error al enviar intento del quiz'),
      data: null,
    };
  }
}

// =============================================================================
// ACTIVIDADES (exámenes / talleres) — /api/evaluation/activities
// =============================================================================

/**
 * Listar actividades (exámenes y talleres). Filtra por tipo si se indica.
 * Backend: GET /api/evaluation/activities?type=EXAM|TALLER → { success, data: Activity[] }
 *
 * @param {'EXAM' | 'TALLER' | 'QUIZ' | 'WORKSHOP'} [type]
 */
export async function getActivities(type) {
  try {
    const endpoint = `/evaluation/activities${buildQuery({ type })}`;
    const { data } = await http.get(endpoint);
    return {
      success: true,
      data: {
        activities: Array.isArray(data?.data) ? data.data : [],
      },
    };
  } catch (error) {
    console.error('Error al obtener actividades:', error);
    return {
      success: false,
      error: toErrorMessage(error, 'Error al obtener actividades'),
      data: { activities: [] },
    };
  }
}

/**
 * Obtener una actividad (examen/taller) por id; el campo `instructions` viene
 * como JSON string serializado por el seed (questions, caseStudy, etc.).
 *
 * Backend: GET /api/evaluation/activities/:id → { success, activity: Activity }
 *
 * @param {string} activityId
 */
export async function getActivityById(activityId) {
  try {
    if (!activityId) throw new Error('ID de la actividad es requerido');

    const { data } = await http.get(
      `/evaluation/activities/${encodeURIComponent(activityId)}`,
    );
    return {
      success: true,
      data: { activity: data?.activity ?? null },
    };
  } catch (error) {
    console.error('Error al obtener actividad:', error);
    return {
      success: false,
      error: toErrorMessage(error, 'Error al obtener actividad'),
      data: null,
    };
  }
}

// =============================================================================
// Default export — mantiene compatibilidad con consumidores existentes
// =============================================================================

export default {
  // Casos clínicos
  getCases,
  getCaseById,
  evaluateCase,
  getCaseAttempts,
  // Quizzes
  getQuizzes,
  getQuizById,
  getMyQuizAttempts,
  getMyQuizAttempt,
  submitQuizAttempt,
  // Actividades (exámenes / talleres)
  getActivities,
  getActivityById,
};
