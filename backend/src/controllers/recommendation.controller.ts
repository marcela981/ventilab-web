/**
 * Recommendation Controller
 * Handles personalized content recommendation logic
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError } from '../middleware/errorHandler';
import { sendSuccess } from '../utils/response';
import { HTTP_STATUS, ERROR_CODES, ERROR_MESSAGES } from '../config/constants';
import { getRecommendationsForUser } from '../services/recommendation.service';

/**
 * Get personalized recommendations for the authenticated user
 * @route   GET /api/recommendations
 * @access  Private (All authenticated users)
 */
export const getRecommendations = asyncHandler(
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      throw new AppError(
        ERROR_MESSAGES.UNAUTHORIZED,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED
      );
    }

    const userId = req.user.id;

    console.log(`📚 [Recommendations] Solicitando recomendaciones para usuario: ${req.user.email}`);

    // Get recommendations from service
    const recommendations = await getRecommendationsForUser(userId);

    // Check if no recommendations available
    if (recommendations.length === 0) {
      console.log(`ℹ️  [Recommendations] No hay recomendaciones disponibles para ${req.user.email}`);

      sendSuccess(
        res,
        HTTP_STATUS.OK,
        'No hay recomendaciones disponibles en este momento. Continúa completando módulos para obtener nuevas sugerencias.',
        { recommendations: [] }
      );
      return;
    }

    console.log(`✅ [Recommendations] Retornando ${recommendations.length} recomendaciones para ${req.user.email}`);

    // Return recommendations without the internal relevanceScore
    const formattedRecommendations = recommendations.map(rec => ({
      moduleId: rec.moduleId,
      moduleTitle: rec.moduleTitle,
      reason: rec.reason,
      type: rec.type,
      estimatedTime: rec.estimatedTime,
      difficulty: rec.difficulty,
      category: rec.category,
      order: rec.order,
    }));

    sendSuccess(
      res,
      HTTP_STATUS.OK,
      'Recomendaciones generadas exitosamente',
      { recommendations: formattedRecommendations }
    );
  }
);
