/**
 * AI Tutor Controller
 * Handles HTTP endpoints for AI tutor functionality
 */

import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { getCache, setCache } from '../services/ai/AICacheService';
import { generateSuggestions, LessonContext } from '../services/ai/TutorPromptService';
import { getHistory as getTutorHistory, saveMessage } from '../services/ai/TutorService';
import { AIProviderFactory } from '../services/ai/AIProviderFactory';
import crypto from 'crypto';

/**
 * Normalize question for cache key generation
 */
function normalizeQuestion(question: string): string {
  return question
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
}

/**
 * Generate cache hash
 */
function generateCacheHash(
  question: string,
  lessonId: string,
  provider: string
): string {
  const normalizedQuestion = normalizeQuestion(question);
  const promptVersion = '1.0';
  const cacheString = `${normalizedQuestion}|${lessonId}|${provider}|${promptVersion}`;
  return crypto.createHash('sha256').update(cacheString).digest('hex');
}

/**
 * GET /api/ai/tutor/cache?hash=...
 * Get cached response
 */
export const getCachedResponse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { hash } = req.query;

    if (!hash || typeof hash !== 'string') {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Hash parameter is required',
        },
      });
      return;
    }

    const cached = await getCache(hash);

    if (!cached) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Cache entry not found',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        answer: cached.answer,
        usage: cached.usage,
        timestamp: cached.timestamp,
      },
    });
  } catch (error: any) {
    console.error('Error getting cache:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Error al obtener respuesta en caché',
      },
    });
  }
};

/**
 * POST /api/ai/tutor/cache
 * Store cached response
 */
export const storeCachedResponse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { hash, answer, usage, noCache } = req.body;

    if (!hash || !answer) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Hash and answer are required',
        },
      });
      return;
    }

    // Don't cache if noCache flag is set or answer is too short
    if (noCache || answer.length < 30) {
      res.status(200).json({
        success: true,
        message: 'Response not cached (too short or noCache flag)',
      });
      return;
    }

    await setCache(hash, answer, usage, noCache);

    res.status(200).json({
      success: true,
      message: 'Response cached successfully',
    });
  } catch (error: any) {
    console.error('Error storing cache:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Error al almacenar respuesta en caché',
      },
    });
  }
};

/**
 * GET /api/ai/providers
 * Get available AI providers
 */
export const getProviders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const providers = AIProviderFactory.getAvailableProviders();

    res.status(200).json({
      success: true,
      data: {
        providers,
        default: process.env.AI_PROVIDER || 'google',
      },
    });
  } catch (error: any) {
    console.error('Error getting providers:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Error al obtener proveedores disponibles',
      },
    });
  }
};

/**
 * GET /api/ai/tutor/suggestions?lessonId=...&type=...
 * Get dynamic suggestions for a lesson
 */
export const getSuggestions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { lessonId, type } = req.query;

    if (!lessonId || typeof lessonId !== 'string') {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'lessonId parameter is required',
        },
      });
      return;
    }

    // Build minimal context for suggestions
    const context: LessonContext = {
      lessonId,
      title: req.query.title as string || 'Lección',
      objectives: req.query.objectives ? (req.query.objectives as string).split(',') : [],
      tags: req.query.tags ? (req.query.tags as string).split(',') : [],
      tipoDeLeccion: (type as any) || 'teoria',
    };

    const suggestions = generateSuggestions(context);

    res.status(200).json({
      success: true,
      data: {
        suggestions,
      },
    });
  } catch (error: any) {
    console.error('Error getting suggestions:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Error al generar sugerencias',
      },
    });
  }
};

/**
 * GET /api/ai/tutor/history?lessonId=...&sessionId=...
 * Get conversation history
 */
export const getHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { lessonId, sessionId } = req.query;

    if (!lessonId || !sessionId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'lessonId and sessionId are required',
        },
      });
      return;
    }

    const history = await getTutorHistory(
      lessonId as string,
      sessionId as string
    );

    res.status(200).json({
      success: true,
      data: {
        messages: history,
      },
    });
  } catch (error: any) {
    console.error('Error getting history:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Error al obtener historial',
      },
    });
  }
};

/**
 * GET /api/ai/health
 * Health check endpoint that reports enabled providers
 */
export const getHealth = async (req: Request, res: Response): Promise<void> => {
  try {
    const providers = AIProviderFactory.getAvailableProviders();
    const defaultProvider = process.env.AI_PROVIDER || 'google';
    const redisAvailable = !!process.env.REDIS_URL;

    res.status(200).json({
      success: true,
      data: {
        status: 'healthy',
        providers: {
          available: providers,
          default: defaultProvider,
          configured: {
            openai: !!process.env.OPENAI_API_KEY,
            anthropic: !!process.env.ANTHROPIC_API_KEY,
            google: !!process.env.GOOGLE_API_KEY,
          },
        },
        cache: {
          type: redisAvailable ? 'redis' : 'lru',
          available: redisAvailable,
        },
        models: {
          openai: process.env.AI_MODEL_OPENAI || 'gpt-4o-mini',
          anthropic: process.env.AI_MODEL_ANTHROPIC || 'claude-3-5-haiku-20241022',
          google: process.env.AI_MODEL_GOOGLE || 'gemini-1.5-flash',
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error in health check:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Error al verificar estado del servicio',
      },
    });
  }
};

