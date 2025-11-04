/**
 * Achievement Routes
 * API routes for achievements and gamification system
 * Handles achievement unlocking, progress tracking, and rewards
 */

import { Router } from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validate';
import { authenticate, isAdmin } from '../middleware/auth';
import * as achievementController from '../controllers/achievement.controller';
import { config } from '../config/config';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * @route   GET /api/achievements
 * @desc    Obtener todos los logros desbloqueados del usuario autenticado
 * @access  Private - todos los usuarios autenticados
 * @returns {Array} Array de logros con:
 *          - id: Identificador único del logro
 *          - userId: ID del usuario que desbloqueó el logro
 *          - type: Tipo de logro (FIRST_LESSON, MODULE_COMPLETE, etc.)
 *          - title: Título del logro en español
 *          - description: Descripción de cómo se desbloqueó
 *          - icon: Nombre del ícono de Material Icons o ruta personalizada
 *          - points: Puntos otorgados por este logro
 *          - unlockedAt: Fecha y hora de desbloqueo
 * 
 * @example
 * GET /api/achievements
 * Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 * 
 * Response 200:
 * {
 *   "success": true,
 *   "message": "Logros obtenidos exitosamente",
 *   "data": [
 *     {
 *       "id": "clx1a2b3c4d5e6f7g8h9i0",
 *       "userId": "user_clx123456789",
 *       "type": "FIRST_LESSON",
 *       "title": "Primera Lección",
 *       "description": "Completa tu primera lección en VentyLab",
 *       "icon": "school",
 *       "points": 10,
 *       "unlockedAt": "2024-01-15T10:30:00.000Z"
 *     }
 *   ]
 * }
 * 
 * @errors  401 - Unauthorized (token inválido o ausente)
 *          500 - Internal server error
 */
router.get(
  '/',
  achievementController.getMyAchievements
);

/**
 * @route   GET /api/achievements/all
 * @desc    Obtener todos los logros disponibles del sistema indicando cuáles están 
 *          desbloqueados, cuáles bloqueados y el progreso actual hacia logros progresivos
 * @access  Private - todos los usuarios autenticados
 * @returns {Array} Array de todos los logros del sistema con:
 *          - type: Tipo de logro
 *          - title: Título del logro
 *          - description: Descripción de cómo desbloquearlo
 *          - icon: Ícono del logro
 *          - points: Puntos que otorga
 *          - rarity: Rareza (COMMON, RARE, EPIC)
 *          - category: Categoría (INICIO, PROGRESO, CONSISTENCIA, etc.)
 *          - condition: Condición para desbloquear (legible por humanos)
 *          - isUnlocked: Boolean indicando si está desbloqueado
 *          - unlockedAt: Fecha de desbloqueo (si está desbloqueado)
 *          - progress: Objeto con progreso actual (si aplica):
 *            - current: Progreso actual
 *            - target: Objetivo a alcanzar
 *            - percentage: Porcentaje completado (0-100)
 * 
 * @example
 * GET /api/achievements/all
 * Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 * 
 * Response 200:
 * {
 *   "success": true,
 *   "message": "Todos los logros obtenidos exitosamente",
 *   "data": [
 *     {
 *       "type": "LESSONS_10",
 *       "title": "Aprendiz Dedicado",
 *       "description": "Completa 10 lecciones en total",
 *       "icon": "emoji_events",
 *       "points": 30,
 *       "rarity": "COMMON",
 *       "category": "PROGRESO",
 *       "condition": "Completar 10 lecciones",
 *       "isUnlocked": false,
 *       "progress": {
 *         "current": 7,
 *         "target": 10,
 *         "percentage": 70
 *       }
 *     },
 *     {
 *       "type": "FIRST_LESSON",
 *       "title": "Primera Lección",
 *       "description": "Completa tu primera lección en VentyLab",
 *       "icon": "school",
 *       "points": 10,
 *       "rarity": "COMMON",
 *       "category": "INICIO",
 *       "condition": "Completar 1 lección",
 *       "isUnlocked": true,
 *       "unlockedAt": "2024-01-15T10:30:00.000Z"
 *     }
 *   ]
 * }
 * 
 * @algorithm Este endpoint:
 *          1. Obtiene todos los logros definidos en el sistema
 *          2. Consulta los logros desbloqueados por el usuario
 *          3. Calcula el progreso actual hacia logros progresivos
 *          4. Combina toda la información en un solo array
 * 
 * @errors  401 - Unauthorized (token inválido o ausente)
 *          500 - Internal server error
 */
router.get(
  '/all',
  achievementController.getAllAchievementsWithProgress
);

/**
 * @route   POST /api/achievements/check
 * @desc    Verificar y desbloquear logros basados en un evento del sistema (testing/internal)
 * @access  Private - Admin only (o entorno de desarrollo)
 * @body    {string} eventType - Tipo de evento (LESSON_COMPLETED, MODULE_COMPLETED, 
 *                                QUIZ_COMPLETED, DAILY_LOGIN, SEARCH_USED, 
 *                                FEEDBACK_SUBMITTED, LESSON_REVIEWED)
 * @body    {object} eventData - Datos específicos del evento (opcional):
 *          - lessonId: ID de la lección (para eventos de lección)
 *          - moduleId: ID del módulo (para eventos de módulo)
 *          - quizId: ID del quiz (para eventos de quiz)
 *          - score: Puntuación obtenida
 *          - timeSpent: Tiempo invertido en minutos
 *          - isReview: Si es una revisión de contenido
 * @returns {Object} Objeto con:
 *          - newAchievements: Array de logros recién desbloqueados
 *          - totalUnlocked: Número total de logros desbloqueados
 * 
 * @note    Este endpoint está diseñado principalmente para:
 *          - Testing manual del sistema de logros
 *          - Uso interno del sistema (no para llamadas directas del frontend)
 *          - Debugging y verificación de lógica de logros
 *          
 *          En producción, los logros deberían desbloquearse automáticamente
 *          cuando ocurren eventos relevantes en otros endpoints del sistema.
 * 
 * @example
 * POST /api/achievements/check
 * Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 * Content-Type: application/json
 * 
 * Body:
 * {
 *   "eventType": "LESSON_COMPLETED",
 *   "eventData": {
 *     "lessonId": "lesson_clx123456789",
 *     "moduleId": "module_clx987654321",
 *     "timeSpent": 15
 *   }
 * }
 * 
 * Response 200:
 * {
 *   "success": true,
 *   "message": "Verificación de logros completada",
 *   "data": {
 *     "newAchievements": [
 *       {
 *         "id": "clx1a2b3c4d5e6f7g8h9i0",
 *         "userId": "user_clx123456789",
 *         "type": "FIRST_LESSON",
 *         "title": "Primera Lección",
 *         "description": "Completa tu primera lección en VentyLab",
 *         "icon": "school",
 *         "points": 10,
 *         "unlockedAt": "2024-01-15T10:35:00.000Z"
 *       }
 *     ],
 *     "totalUnlocked": 1
 *   }
 * }
 * 
 * @errors  400 - Bad request (eventType inválido o ausente)
 *          401 - Unauthorized (token inválido o ausente)
 *          403 - Forbidden (solo admins en producción)
 *          500 - Internal server error
 */
router.post(
  '/check',
  // In production, only admins can trigger manual achievement checks
  // In development, all authenticated users can use this for testing
  config.nodeEnv === 'production' ? isAdmin : (_req, _res, next) => next(),
  validateRequest([
    body('eventType')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('El tipo de evento es requerido')
      .isIn([
        'LESSON_COMPLETED',
        'LESSON_ACCESSED',
        'MODULE_COMPLETED',
        'QUIZ_COMPLETED',
        'DAILY_LOGIN',
        'SEARCH_USED',
        'FEEDBACK_SUBMITTED',
        'LESSON_REVIEWED'
      ])
      .withMessage('Tipo de evento inválido'),
    body('eventData')
      .optional()
      .isObject()
      .withMessage('Los datos del evento deben ser un objeto')
  ]),
  achievementController.triggerAchievementCheck
);

export default router;

