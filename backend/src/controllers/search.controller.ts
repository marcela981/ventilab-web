/**
 * Search Controller
 * HTTP request handlers for search-related endpoints
 * Delegates business logic to search.service
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as searchService from '../services/search.service';
import { sendSuccess } from '../utils/response';
import { AppError } from '../middleware/errorHandler';
import { HTTP_STATUS, ERROR_CODES } from '../config/constants';
import { ModuleCategory, ModuleDifficulty } from '@prisma/client';

/**
 * Helper function to convert duration string to duration filter array
 *
 * @param duration - Duration string (SHORT, MEDIUM, LONG)
 * @returns Array of duration values in minutes
 */
const parseDuration = (duration: string): number[] | undefined => {
  switch (duration.toUpperCase()) {
    case 'SHORT':
      return [15]; // Less than 15 minutes
    case 'MEDIUM':
      return [30]; // 15-30 minutes
    case 'LONG':
      return [999]; // Greater than 30 minutes (using high value as max)
    default:
      return undefined;
  }
};

/**
 * Search for content across modules and lessons
 *
 * @route GET /api/search
 * @access Private (All authenticated users)
 */
export const searchContent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract userId from authenticated user
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(
        'Autenticación requerida',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED,
        true,
        ['Debes iniciar sesión para realizar búsquedas']
      );
    }

    // Extract query parameters
    const {
      q: query,
      category,
      difficulty,
      duration,
      status,
      type,
      page,
      limit,
      sortBy,
    } = req.query;

    // Validate required query parameter
    if (!query || typeof query !== 'string') {
      throw new AppError(
        'El parámetro de búsqueda "q" es requerido',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT,
        true,
        ['Proporciona un término de búsqueda en el parámetro "q"']
      );
    }

    // Build filters object
    const filters: any = {};

    // Parse categories (can be comma-separated or array)
    if (category) {
      if (Array.isArray(category)) {
        filters.categories = category as ModuleCategory[];
      } else if (typeof category === 'string') {
        filters.categories = category.split(',').map(c => c.trim()) as ModuleCategory[];
      }
    }

    // Parse difficulties (can be comma-separated or array)
    if (difficulty) {
      if (Array.isArray(difficulty)) {
        filters.difficulties = difficulty as ModuleDifficulty[];
      } else if (typeof difficulty === 'string') {
        filters.difficulties = difficulty.split(',').map(d => d.trim()) as ModuleDifficulty[];
      }
    }

    // Parse duration
    if (duration && typeof duration === 'string') {
      filters.durations = parseDuration(duration);
    }

    // Parse status filter
    if (status && typeof status === 'string' && status !== 'all') {
      if (['not_started', 'in_progress', 'completed'].includes(status)) {
        filters.statuses = [status as 'not_started' | 'in_progress' | 'completed'];
      }
    }

    // Parse type filter (for future use if needed to filter by lesson/module/both)
    // Currently the service returns both by default
    const searchType = typeof type === 'string' ? type : 'both';

    // Parse pagination parameters
    const pageNum = page ? parseInt(page as string, 10) : 1;
    const limitNum = limit ? parseInt(limit as string, 10) : 10;

    // Validate sortBy parameter
    const sortByParam = sortBy && typeof sortBy === 'string' 
      ? sortBy as 'relevance' | 'date' | 'popularity' | 'duration'
      : 'relevance';

    // Call search service
    const result = await searchService.searchContent({
      query: query as string,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      page: pageNum,
      limit: limitNum,
      sortBy: sortByParam,
      userId,
    });

    // Send success response with search results and pagination metadata
    sendSuccess(res, HTTP_STATUS.OK, undefined, {
      results: result.results,
      pagination: result.pagination,
      total: result.total,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get search suggestions for autocomplete
 *
 * @route GET /api/search/suggestions
 * @access Private (All authenticated users)
 */
export const getSearchSuggestions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract userId from authenticated user (optional for suggestions)
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(
        'Autenticación requerida',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED,
        true,
        ['Debes iniciar sesión para obtener sugerencias']
      );
    }

    // Extract query parameters
    const { q: query, limit } = req.query;

    // Validate required query parameter
    if (!query || typeof query !== 'string') {
      throw new AppError(
        'El parámetro de búsqueda "q" es requerido',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT,
        true,
        ['Proporciona un término de búsqueda en el parámetro "q"']
      );
    }

    // Parse limit parameter
    const limitNum = limit ? parseInt(limit as string, 10) : 5;

    // Validate limit is within reasonable bounds
    if (limitNum < 1 || limitNum > 20) {
      throw new AppError(
        'El límite debe estar entre 1 y 20',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT,
        true,
        ['El parámetro "limit" debe ser un número entre 1 y 20']
      );
    }

    // Call search service for suggestions
    const suggestions = await searchService.getSearchSuggestions(
      query as string,
      limitNum,
      userId
    );

    // Send success response with suggestions
    sendSuccess(res, HTTP_STATUS.OK, undefined, {
      suggestions,
    });
  } catch (error) {
    next(error);
  }
};

