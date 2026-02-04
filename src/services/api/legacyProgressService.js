import httpClient, { APIError } from './httpClient';

/**
 * Servicio para gestionar progreso del usuario
 * Consume los endpoints del backend en /api/progress
 */

/**
 * Obtener overview de progreso del usuario
 */
export async function getProgressOverview() {
  try {
    const data = await httpClient.get('/api/progress/overview');
    return {
      success: true,
      data: {
        progress: data.progress,
        stats: data.stats,
        nextLessons: data.nextLessons || [],
        upcomingAchievements: data.upcomingAchievements || [],
      },
    };
  } catch (error) {
    console.error('Error al obtener overview de progreso:', error);
    return {
      success: false,
      error: error.message || 'Error al obtener progreso',
      data: null,
    };
  }
}

/**
 * Obtener progreso de un módulo específico
 */
export async function getModuleProgress(moduleId) {
  try {
    if (!moduleId) {
      throw new Error('ID del módulo es requerido');
    }

    const data = await httpClient.get(`/api/progress/modules/${moduleId}`);
    return {
      success: true,
      data: {
        module: data.module,
        progress: data.progress,
        lessons: data.lessons || [],
        quizzes: data.quizzes || [],
      },
    };
  } catch (error) {
    console.error('Error al obtener progreso del módulo:', error);
    return {
      success: false,
      error: error.message || 'Error al obtener progreso del módulo',
      data: null,
    };
  }
}

/**
 * Obtener progreso de una lección específica
 */
export async function getLessonProgress(lessonId) {
  try {
    if (!lessonId) {
      throw new Error('ID de la lección es requerido');
    }

    const data = await httpClient.get(`/api/progress/lesson/${lessonId}`);
    return {
      success: true,
      data: {
        lesson: data.lesson,
        progress: data.progress,
        quizAttempts: data.quizAttempts || [],
      },
    };
  } catch (error) {
    console.error('Error al obtener progreso de la lección:', error);
    return {
      success: false,
      error: error.message || 'Error al obtener progreso de la lección',
      data: null,
    };
  }
}

/**
 * Completar una lección
 */
export async function completeLesson(lessonId) {
  try {
    if (!lessonId) {
      throw new Error('ID de la lección es requerido');
    }

    const data = await httpClient.post(`/api/progress/lesson/${lessonId}/complete`);
    return {
      success: true,
      data: {
        lesson: data.lesson,
        xpGained: data.xpGained || 0,
        level: data.level,
        achievementsUnlocked: data.achievementsUnlocked || [],
        levelUp: data.levelUp,
      },
    };
  } catch (error) {
    console.error('Error al completar lección:', error);
    return {
      success: false,
      error: error.message || 'Error al completar la lección',
      data: null,
    };
  }
}

/**
 * Guardar progreso parcial de una lección
 */
export async function saveLessonProgress(lessonId, progressPercent) {
  try {
    if (!lessonId) {
      throw new Error('ID de la lección es requerido');
    }

    if (progressPercent < 0 || progressPercent > 100) {
      throw new Error('El porcentaje de progreso debe estar entre 0 y 100');
    }

    // Nota: Este endpoint puede no existir en el backend aún
    // Por ahora, solo completamos la lección si llega a 100%
    if (progressPercent >= 100) {
      return await completeLesson(lessonId);
    }

    // Si no está completo, podríamos guardar el progreso parcial
    // Esto requeriría un endpoint adicional en el backend
    return {
      success: true,
      data: { progress: progressPercent },
    };
  } catch (error) {
    console.error('Error al guardar progreso:', error);
    return {
      success: false,
      error: error.message || 'Error al guardar progreso',
      data: null,
    };
  }
}

/**
 * Obtener estadísticas del usuario
 */
export async function getUserStats() {
  try {
    const overview = await getProgressOverview();
    if (overview.success) {
      return {
        success: true,
        data: overview.data.stats,
      };
    }
    return overview;
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return {
      success: false,
      error: error.message || 'Error al obtener estadísticas',
      data: null,
    };
  }
}

export default {
  getProgressOverview,
  getModuleProgress,
  getLessonProgress,
  completeLesson,
  saveLessonProgress,
  getUserStats,
};

