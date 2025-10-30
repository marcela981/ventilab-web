/**
 * Lesson Controller
 * HTTP handlers for lesson endpoints
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import * as lessonService from '../services/lesson.service';
import { sendSuccess, sendCreated } from '../utils/response';
import { AppError } from '../middleware/errorHandler';
import { HTTP_STATUS } from '../config/constants';
import { USER_ROLES } from '../config/constants';

/**
 * Get lesson by ID
 * GET /api/lessons/:id
 * Requires authentication
 */
export const getLessonById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(
        'Debes iniciar sesión para acceder a las lecciones',
        HTTP_STATUS.UNAUTHORIZED,
        'UNAUTHORIZED'
      );
    }

    const lesson = await lessonService.getLessonById(id, userId);

    // Record the access
    await lessonService.recordLessonAccess(userId, id);

    sendSuccess(res, HTTP_STATUS.OK, 'Lección obtenida exitosamente', lesson);
  } catch (error) {
    next(error);
  }
};

/**
 * Get next lesson in the module
 * GET /api/lessons/:id/next
 * Requires authentication
 */
export const getNextLesson = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!req.user) {
      throw new AppError(
        'Debes iniciar sesión para acceder a las lecciones',
        HTTP_STATUS.UNAUTHORIZED,
        'UNAUTHORIZED'
      );
    }

    const nextLesson = await lessonService.getNextLesson(id);

    sendSuccess(res, HTTP_STATUS.OK, nextLesson ? 'Siguiente lección encontrada' : 'No hay más lecciones en este módulo', {
      nextLesson,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get previous lesson in the module
 * GET /api/lessons/:id/previous
 * Requires authentication
 */
export const getPreviousLesson = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!req.user) {
      throw new AppError(
        'Debes iniciar sesión para acceder a las lecciones',
        HTTP_STATUS.UNAUTHORIZED,
        'UNAUTHORIZED'
      );
    }

    const previousLesson = await lessonService.getPreviousLesson(id);

    sendSuccess(res, HTTP_STATUS.OK, previousLesson ? 'Lección anterior encontrada' : 'No hay lecciones anteriores en este módulo', {
      previousLesson,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new lesson
 * POST /api/lessons
 * Requires ADMIN or TEACHER role
 */
export const createLesson = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || (req.user.role !== USER_ROLES.ADMIN && req.user.role !== USER_ROLES.INSTRUCTOR)) {
      throw new AppError(
        'No tienes permisos para crear lecciones',
        HTTP_STATUS.FORBIDDEN,
        'FORBIDDEN'
      );
    }

    const { moduleId, title, content, order, estimatedTime, aiGenerated, sourcePrompt } = req.body;

    // Validate required fields
    if (!moduleId || !title || !content || order === undefined || !estimatedTime) {
      throw new AppError(
        'Faltan campos requeridos: moduleId, title, content, order, estimatedTime',
        HTTP_STATUS.BAD_REQUEST,
        'MISSING_FIELDS'
      );
    }

    const lesson = await lessonService.createLesson({
      moduleId,
      title,
      content,
      order,
      estimatedTime,
      aiGenerated,
      sourcePrompt,
    });

    sendCreated(res, 'Lección creada exitosamente', lesson);
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing lesson
 * PUT /api/lessons/:id
 * Requires ADMIN or TEACHER role
 */
export const updateLesson = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || (req.user.role !== USER_ROLES.ADMIN && req.user.role !== USER_ROLES.INSTRUCTOR)) {
      throw new AppError(
        'No tienes permisos para actualizar lecciones',
        HTTP_STATUS.FORBIDDEN,
        'FORBIDDEN'
      );
    }

    const { id } = req.params;
    const { title, content, order, estimatedTime, aiGenerated, sourcePrompt } = req.body;

    const lesson = await lessonService.updateLesson(id, {
      title,
      content,
      order,
      estimatedTime,
      aiGenerated,
      sourcePrompt,
    });

    sendSuccess(res, HTTP_STATUS.OK, 'Lección actualizada exitosamente', lesson);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a lesson
 * DELETE /api/lessons/:id
 * Requires ADMIN role
 */
export const deleteLesson = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || req.user.role !== USER_ROLES.ADMIN) {
      throw new AppError(
        'Solo los administradores pueden eliminar lecciones',
        HTTP_STATUS.FORBIDDEN,
        'FORBIDDEN'
      );
    }

    const { id } = req.params;

    const result = await lessonService.deleteLesson(id);

    sendSuccess(res, HTTP_STATUS.OK, result.message, null);
  } catch (error) {
    next(error);
  }
};

/**
 * Mark lesson as completed
 * POST /api/lessons/:id/complete
 * Requires authentication
 */
export const markLessonCompleted = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(
        'Debes iniciar sesión para marcar lecciones como completadas',
        HTTP_STATUS.UNAUTHORIZED,
        'UNAUTHORIZED'
      );
    }

    const { id } = req.params;
    const { timeSpent } = req.body;

    if (timeSpent === undefined || typeof timeSpent !== 'number' || timeSpent < 0) {
      throw new AppError(
        'El campo timeSpent es requerido y debe ser un número positivo',
        HTTP_STATUS.BAD_REQUEST,
        'INVALID_TIME_SPENT'
      );
    }

    const result = await lessonService.markLessonAsCompleted(req.user.id, id, timeSpent);

    sendSuccess(res, HTTP_STATUS.OK, result.moduleCompleted ? 'Lección completada. ¡Felicidades, has completado todo el módulo!' : 'Lección marcada como completada', result);
  } catch (error) {
    next(error);
  }
};
