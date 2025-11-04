/**
 * =============================================================================
 * Search Analytics Controller
 * =============================================================================
 * Handles HTTP requests for search analytics
 * =============================================================================
 */

import { Request, Response, NextFunction } from 'express';
import { logResultClick, getSearchAnalytics, getTotalSearchCount } from '../services/searchAnalytics.service';
import { HTTP_STATUS } from '../config/constants';
import { AppError } from '../middleware/errorHandler';

/**
 * Log a click on a search result
 * POST /api/search/log-click
 * 
 * @param req - Express request with click data
 * @param res - Express response
 * @param next - Express next function
 */
export const logClick = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { query, selectedResult, selectedType, sessionId } = req.body;

    // Validate required fields
    if (!query || !selectedResult || !selectedType) {
      throw new AppError(
        'Faltan campos requeridos',
        HTTP_STATUS.BAD_REQUEST,
        'INVALID_INPUT',
        true,
        ['Se requieren los campos: query, selectedResult, selectedType']
      );
    }

    // Validate selectedType
    if (selectedType !== 'module' && selectedType !== 'lesson') {
      throw new AppError(
        'Tipo de resultado inválido',
        HTTP_STATUS.BAD_REQUEST,
        'INVALID_INPUT',
        true,
        ['selectedType debe ser "module" o "lesson"']
      );
    }

    // Get userId from auth middleware (req.user)
    const userId = (req as any).user?.id;

    // Log the click
    await logResultClick({
      userId,
      query,
      selectedResult,
      selectedType,
      sessionId,
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Click registrado exitosamente',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get search analytics for admin dashboard
 * GET /api/admin/search-analytics
 * 
 * @param req - Express request with optional date range query params
 * @param res - Express response
 * @param next - Express next function
 */
export const getAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Check if user is admin or teacher
    const user = (req as any).user;
    if (!user || (user.role !== 'ADMIN' && user.role !== 'TEACHER')) {
      throw new AppError(
        'Acceso denegado',
        HTTP_STATUS.FORBIDDEN,
        'FORBIDDEN',
        true,
        ['Solo administradores y profesores pueden acceder a las analíticas']
      );
    }

    // Parse date range from query params
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    // Get analytics
    const analytics = await getSearchAnalytics(start, end);
    const totalSearches = await getTotalSearchCount(start, end);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        ...analytics,
        totalSearches,
        dateRange: {
          startDate: start?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: end?.toISOString() || new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

