/**
 * Module Controller
 * HTTP request handlers for module-related endpoints
 * Delegates business logic to module.service
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as moduleService from '../services/module.service';
import { sendSuccess, sendCreated } from '../utils/response';
import { AppError } from '../middleware/errorHandler';
import { HTTP_STATUS, ERROR_CODES } from '../config/constants';

/**
 * Get all modules with filtering and pagination
 *
 * @route GET /api/modules
 * @access Public
 */
export const getAllModules = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { category, difficulty, page, limit } = req.query;

    const result = await moduleService.getAllModules({
      category: category as string,
      difficulty: difficulty as string,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    sendSuccess(res, HTTP_STATUS.OK, undefined, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single module by ID
 *
 * @route GET /api/modules/:id
 * @access Public (progress included if authenticated)
 */
export const getModuleById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id; // Optional - includes progress if authenticated

    if (!id) {
      throw new AppError(
        'ID de módulo requerido',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT,
        true,
        ['Proporciona un ID de módulo válido']
      );
    }

    const module = await moduleService.getModuleById(id, userId);

    sendSuccess(res, HTTP_STATUS.OK, undefined, module);
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new module
 *
 * @route POST /api/modules
 * @access Private (ADMIN or TEACHER)
 */
export const createModule = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate user is authenticated and authorized
    if (!req.user) {
      throw new AppError(
        'Autenticación requerida',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED,
        true,
        ['Debes iniciar sesión para crear módulos']
      );
    }

    if (req.user.role !== 'ADMIN' && req.user.role !== 'TEACHER') {
      throw new AppError(
        'No tienes permisos para crear módulos',
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN,
        true,
        ['Solo administradores y profesores pueden crear módulos']
      );
    }

    const {
      title,
      description,
      category,
      difficulty,
      estimatedTime,
      order,
      prerequisiteIds,
      thumbnail,
    } = req.body;

    // Validate required fields
    if (!title || !category || !difficulty || !estimatedTime || order === undefined) {
      throw new AppError(
        'Datos incompletos',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR,
        true,
        [
          'Los campos title, category, difficulty, estimatedTime y order son requeridos',
        ]
      );
    }

    const module = await moduleService.createModule({
      title,
      description,
      category,
      difficulty,
      estimatedTime: parseInt(estimatedTime, 10),
      order: parseInt(order, 10),
      prerequisiteIds,
      thumbnail,
    });

    sendCreated(res, 'Módulo creado exitosamente', module);
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing module
 *
 * @route PUT /api/modules/:id
 * @access Private (ADMIN or TEACHER)
 */
export const updateModule = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate authentication and authorization
    if (!req.user) {
      throw new AppError(
        'Autenticación requerida',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED,
        true,
        ['Debes iniciar sesión para actualizar módulos']
      );
    }

    if (req.user.role !== 'ADMIN' && req.user.role !== 'TEACHER') {
      throw new AppError(
        'No tienes permisos para actualizar módulos',
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN,
        true,
        ['Solo administradores y profesores pueden actualizar módulos']
      );
    }

    const { id } = req.params;
    const updateData = req.body;

    if (!id) {
      throw new AppError(
        'ID de módulo requerido',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT,
        true,
        ['Proporciona un ID de módulo válido']
      );
    }

    // Parse numeric fields if present
    if (updateData.estimatedTime) {
      updateData.estimatedTime = parseInt(updateData.estimatedTime, 10);
    }
    if (updateData.order !== undefined) {
      updateData.order = parseInt(updateData.order, 10);
    }

    const module = await moduleService.updateModule(id, updateData);

    sendSuccess(res, HTTP_STATUS.OK, 'Módulo actualizado exitosamente', module);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a module (soft delete)
 *
 * @route DELETE /api/modules/:id
 * @access Private (ADMIN only)
 */
export const deleteModule = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate authentication and authorization (ADMIN only)
    if (!req.user) {
      throw new AppError(
        'Autenticación requerida',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED,
        true,
        ['Debes iniciar sesión para eliminar módulos']
      );
    }

    if (req.user.role !== 'ADMIN') {
      throw new AppError(
        'No tienes permisos para eliminar módulos',
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN,
        true,
        ['Solo administradores pueden eliminar módulos']
      );
    }

    const { id } = req.params;

    if (!id) {
      throw new AppError(
        'ID de módulo requerido',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT,
        true,
        ['Proporciona un ID de módulo válido']
      );
    }

    const message = await moduleService.deleteModule(id);

    sendSuccess(res, HTTP_STATUS.OK, message);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all lessons for a module
 *
 * @route GET /api/modules/:id/lessons
 * @access Public (progress included if authenticated)
 */
export const getModuleLessons = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id; // Optional - includes progress if authenticated

    if (!id) {
      throw new AppError(
        'ID de módulo requerido',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT,
        true,
        ['Proporciona un ID de módulo válido']
      );
    }

    const lessons = await moduleService.getModuleLessons(id, userId);

    sendSuccess(res, HTTP_STATUS.OK, undefined, lessons);
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's progress in a module
 *
 * @route GET /api/modules/:id/progress
 * @access Private (authenticated users)
 */
export const getUserModuleProgress = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate authentication
    if (!req.user) {
      throw new AppError(
        'Autenticación requerida',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED,
        true,
        ['Debes iniciar sesión para ver tu progreso']
      );
    }

    const { id } = req.params;
    const userId = req.user.id;

    if (!id) {
      throw new AppError(
        'ID de módulo requerido',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT,
        true,
        ['Proporciona un ID de módulo válido']
      );
    }

    const progress = await moduleService.getUserModuleProgress(userId, id);

    sendSuccess(res, HTTP_STATUS.OK, undefined, progress);
  } catch (error) {
    next(error);
  }
};

/**
 * Add a prerequisite to a module
 *
 * @route POST /api/modules/:id/prerequisites
 * @access Private (ADMIN or TEACHER)
 */
export const addPrerequisite = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate authentication and authorization
    if (!req.user) {
      throw new AppError(
        'Autenticación requerida',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED,
        true,
        ['Debes iniciar sesión para modificar prerequisitos']
      );
    }

    if (req.user.role !== 'ADMIN' && req.user.role !== 'TEACHER') {
      throw new AppError(
        'No tienes permisos para modificar prerequisitos',
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN,
        true,
        ['Solo administradores y profesores pueden modificar prerequisitos']
      );
    }

    const { id } = req.params;
    const { prerequisiteId } = req.body;

    if (!id || !prerequisiteId) {
      throw new AppError(
        'Datos incompletos',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR,
        true,
        ['Proporciona el ID del módulo y el ID del prerequisito']
      );
    }

    const module = await moduleService.addPrerequisite(id, prerequisiteId);

    sendSuccess(res, HTTP_STATUS.OK, 'Prerequisito agregado exitosamente', module);
  } catch (error) {
    next(error);
  }
};

/**
 * Remove a prerequisite from a module
 *
 * @route DELETE /api/modules/:id/prerequisites/:prerequisiteId
 * @access Private (ADMIN or TEACHER)
 */
export const removePrerequisite = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate authentication and authorization
    if (!req.user) {
      throw new AppError(
        'Autenticación requerida',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED,
        true,
        ['Debes iniciar sesión para modificar prerequisitos']
      );
    }

    if (req.user.role !== 'ADMIN' && req.user.role !== 'TEACHER') {
      throw new AppError(
        'No tienes permisos para modificar prerequisitos',
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN,
        true,
        ['Solo administradores y profesores pueden modificar prerequisitos']
      );
    }

    const { id, prerequisiteId } = req.params;

    if (!id || !prerequisiteId) {
      throw new AppError(
        'Datos incompletos',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR,
        true,
        ['Proporciona el ID del módulo y el ID del prerequisito']
      );
    }

    const message = await moduleService.removePrerequisite(id, prerequisiteId);

    sendSuccess(res, HTTP_STATUS.OK, message);
  } catch (error) {
    next(error);
  }
};
