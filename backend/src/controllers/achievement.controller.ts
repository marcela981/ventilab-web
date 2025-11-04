/**
 * Achievement Controller
 * Handles all achievement and gamification operations for VentyLab
 * Manages achievement unlocking, progress tracking, and user rewards
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { HTTP_STATUS } from '../config/constants';
import { sendSuccess } from '../utils/response';
import * as achievementService from '../services/achievement.service';

// =============================================================================
// CONTROLLER FUNCTIONS
// =============================================================================

/**
 * Get all achievements unlocked by the authenticated user
 *
 * @route   GET /api/achievements
 * @desc    Obtener todos los logros desbloqueados del usuario autenticado
 * @access  Private - todos los usuarios autenticados
 * @returns Array de logros con id, type, title, description, icon, points, unlockedAt
 * 
 * @example
 * GET /api/achievements
 * Authorization: Bearer <token>
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Logros obtenidos exitosamente",
 *   "data": [
 *     {
 *       "id": "clx...",
 *       "userId": "user123",
 *       "type": "FIRST_LESSON",
 *       "title": "Primera Lección",
 *       "description": "Completa tu primera lección en VentyLab",
 *       "icon": "school",
 *       "points": 10,
 *       "unlockedAt": "2024-01-15T10:30:00Z"
 *     }
 *   ]
 * }
 */
export const getMyAchievements = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate that user is authenticated
    if (!req.user || !req.user.id) {
      throw new AppError(
        'Usuario no autenticado',
        HTTP_STATUS.UNAUTHORIZED,
        'UNAUTHORIZED'
      );
    }

    const userId = req.user.id;

    console.log(`[Achievement Controller] Fetching achievements for user: ${userId}`);

    // Get all unlocked achievements for the user
    const achievements = await achievementService.getAchievementsByUserId(userId);

    console.log(`[Achievement Controller] Found ${achievements.length} achievements for user: ${userId}`);

    // Send success response
    sendSuccess(
      res,
      HTTP_STATUS.OK,
      'Logros obtenidos exitosamente',
      achievements
    );
  } catch (error) {
    console.error('[Achievement Controller] Error fetching user achievements:', error);
    next(error);
  }
};

/**
 * Get all available achievements with their unlock status and progress
 *
 * @route   GET /api/achievements/all
 * @desc    Obtener todos los logros disponibles del sistema indicando cuáles están 
 *          desbloqueados, cuáles bloqueados y el progreso actual hacia logros progresivos
 * @access  Private - todos los usuarios autenticados
 * @returns Array de logros con estado de desbloqueo y progreso
 * 
 * @example
 * GET /api/achievements/all
 * Authorization: Bearer <token>
 * 
 * Response:
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
 *       "unlockedAt": "2024-01-15T10:30:00Z"
 *     }
 *   ]
 * }
 */
export const getAllAchievementsWithProgress = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate that user is authenticated
    if (!req.user || !req.user.id) {
      throw new AppError(
        'Usuario no autenticado',
        HTTP_STATUS.UNAUTHORIZED,
        'UNAUTHORIZED'
      );
    }

    const userId = req.user.id;

    console.log(`[Achievement Controller] Fetching all achievements with status for user: ${userId}`);

    // Get all achievements with unlock status and progress
    const achievementsWithStatus = await achievementService.getAllAchievementsWithStatus(userId);

    console.log(
      `[Achievement Controller] Retrieved ${achievementsWithStatus.length} achievements ` +
      `(${achievementsWithStatus.filter(a => a.isUnlocked).length} unlocked, ` +
      `${achievementsWithStatus.filter(a => !a.isUnlocked).length} locked)`
    );

    // Send success response
    sendSuccess(
      res,
      HTTP_STATUS.OK,
      'Todos los logros obtenidos exitosamente',
      achievementsWithStatus
    );
  } catch (error) {
    console.error('[Achievement Controller] Error fetching all achievements with status:', error);
    next(error);
  }
};

/**
 * Trigger achievement check (internal/testing endpoint)
 * This endpoint is primarily for system use and testing purposes
 *
 * @route   POST /api/achievements/check
 * @desc    Verificar y desbloquear logros basados en un evento del sistema
 * @access  Private - Admin only (or development environment)
 * @body    eventType - Tipo de evento (LESSON_COMPLETED, MODULE_COMPLETED, etc.)
 * @body    eventData - Datos específicos del evento
 * @returns Array de logros recién desbloqueados
 * 
 * @example
 * POST /api/achievements/check
 * Authorization: Bearer <token>
 * Content-Type: application/json
 * 
 * Body:
 * {
 *   "eventType": "LESSON_COMPLETED",
 *   "eventData": {
 *     "lessonId": "lesson123",
 *     "moduleId": "module456",
 *     "timeSpent": 15
 *   }
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Verificación de logros completada",
 *   "data": {
 *     "newAchievements": [
 *       {
 *         "id": "clx...",
 *         "type": "FIRST_LESSON",
 *         "title": "Primera Lección",
 *         "description": "Completa tu primera lección en VentyLab",
 *         "points": 10,
 *         "unlockedAt": "2024-01-15T10:30:00Z"
 *       }
 *     ],
 *     "totalUnlocked": 1
 *   }
 * }
 */
export const triggerAchievementCheck = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate that user is authenticated
    if (!req.user || !req.user.id) {
      throw new AppError(
        'Usuario no autenticado',
        HTTP_STATUS.UNAUTHORIZED,
        'UNAUTHORIZED'
      );
    }

    const userId = req.user.id;
    const { eventType, eventData = {} } = req.body;

    // Validate required fields
    if (!eventType) {
      throw new AppError(
        'El tipo de evento es requerido',
        HTTP_STATUS.BAD_REQUEST,
        'VALIDATION_ERROR'
      );
    }

    // Validate eventType is valid
    const validEventTypes = [
      'LESSON_COMPLETED',
      'LESSON_ACCESSED',
      'MODULE_COMPLETED',
      'QUIZ_COMPLETED',
      'DAILY_LOGIN',
      'SEARCH_USED',
      'FEEDBACK_SUBMITTED',
      'LESSON_REVIEWED'
    ];

    if (!validEventTypes.includes(eventType)) {
      throw new AppError(
        `Tipo de evento inválido. Tipos válidos: ${validEventTypes.join(', ')}`,
        HTTP_STATUS.BAD_REQUEST,
        'VALIDATION_ERROR'
      );
    }

    console.log(
      `[Achievement Controller] Triggering achievement check for user: ${userId}, ` +
      `event: ${eventType}`
    );

    // Check and unlock achievements
    const newAchievements = await achievementService.checkAndUnlockAchievements(
      userId,
      eventType as achievementService.AchievementEventType,
      eventData
    );

    console.log(
      `[Achievement Controller] Achievement check completed. ` +
      `${newAchievements.length} new achievement(s) unlocked`
    );

    // Send success response
    sendSuccess(
      res,
      HTTP_STATUS.OK,
      'Verificación de logros completada',
      {
        newAchievements,
        totalUnlocked: newAchievements.length
      }
    );
  } catch (error) {
    console.error('[Achievement Controller] Error triggering achievement check:', error);
    next(error);
  }
};

