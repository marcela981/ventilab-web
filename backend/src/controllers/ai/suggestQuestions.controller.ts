/**
 * =============================================================================
 * Suggest Questions Controller
 * =============================================================================
 * 
 * Controlador para el endpoint de sugerencias de preguntas.
 * Soporta modo determinista (cliente) y modo con embeddings (servidor).
 * 
 * @module
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { buildCandidateBank, SuggestionsContext } from '../../services/ai/suggestions.service';
import { rerankWithEmbeddings } from '../../services/ai/embeddings.service';
import { generateCacheKey, getCached, setCached } from '../../utils/cache';
import { AppError } from '../../middleware/errorHandler';
import { HTTP_STATUS, ERROR_CODES } from '../../config/constants';
import { sanitizeText } from '../../utils/sanitize';

/**
 * Request body para sugerencias de preguntas
 */
interface SuggestQuestionsRequest {
  context: {
    moduleId?: string | null;
    lessonId?: string | null;
    sectionId?: string | null;
    sectionTitle?: string | null;
    lessonTitle?: string | null;
    visibleText?: string | null;
  };
  seed?: string | null;
  bank?: string[] | null;
}

/**
 * Respuesta de sugerencias
 */
interface SuggestQuestionsResponse {
  suggestions: Array<{
    id: string;
    text: string;
  }>;
}

/**
 * Obtener IP del request
 */
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * POST /api/ai/suggest-questions
 * Generar sugerencias de preguntas usando motor determinista o embeddings
 */
export const suggestQuestions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const startTime = Date.now();
  let useEmbeddings = false;
  let embeddingsError: string | null = null;

  try {
    const { context, seed, bank } = req.body as SuggestQuestionsRequest;
    
    // Validar contexto
    if (!context) {
      throw new AppError(
        'Context is required',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR,
        true,
        ['El contexto es requerido']
      );
    }
    
    // Validar que al menos tenga lessonId o sectionTitle
    if (!context.lessonId && !context.sectionTitle && !context.lessonTitle) {
      throw new AppError(
        'Invalid context',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR,
        true,
        ['El contexto debe incluir al menos lessonId, sectionTitle o lessonTitle']
      );
    }
    
    // Sanitizar contexto (truncar visibleText a 1500-2000 chars, filtrar PII)
    // Truncar visibleText a máximo 2000 caracteres antes de sanitizar
    const MAX_VISIBLE_TEXT_LENGTH = 2000;
    const sanitizedContext: SuggestionsContext = {
      moduleId: context.moduleId ? sanitizeText(context.moduleId, { trim: true }) : null,
      lessonId: context.lessonId ? sanitizeText(context.lessonId, { trim: true }) : null,
      sectionId: context.sectionId ? sanitizeText(context.sectionId, { trim: true }) : null,
      sectionTitle: context.sectionTitle ? sanitizeText(context.sectionTitle, { trim: true, removePII: true }) : null,
      lessonTitle: context.lessonTitle ? sanitizeText(context.lessonTitle, { trim: true, removePII: true }) : null,
      visibleText: context.visibleText && context.visibleText.length > 0
        ? sanitizeText(
            context.visibleText.substring(0, MAX_VISIBLE_TEXT_LENGTH), 
            { trim: true, removePII: true, stripHtml: true }
          ).substring(0, MAX_VISIBLE_TEXT_LENGTH) // Asegurar que no exceda después de sanitizar
        : null,
      selectionText: null, // No se envía desde el frontend por seguridad
    };
    
    // Sanitizar seed (limitar a 1000 chars, filtrar PII)
    const sanitizedSeed = seed 
      ? sanitizeText(seed.substring(0, 1000), { trim: true, removePII: true, stripHtml: true }) 
      : '';
    
    // Sanitizar bank
    const sanitizedBank = bank && Array.isArray(bank) 
      ? bank
          .map(q => sanitizeText(q, { trim: true, removePII: true, stripHtml: true }))
          .filter(q => q.length >= 10 && q.length <= 80)
          .slice(0, 20) // Limitar a 20 preguntas del bank
      : null;
    
    // Generar clave de cache
    const cacheKey = generateCacheKey(sanitizedContext.lessonId || null, sanitizedContext.sectionId || null, sanitizedSeed);
    
    // Intentar obtener del cache
    const cached = getCached<SuggestQuestionsResponse>(cacheKey);
    if (cached) {
      // Log sin textos completos (solo IDs y longitudes)
      const clientIp = getClientIp(req);
      console.log('[SuggestQuestions] Cache hit', {
        lessonId: sanitizedContext.lessonId,
        sectionId: sanitizedContext.sectionId,
        seedLength: sanitizedSeed.length,
        suggestionsCount: cached.suggestions.length,
        clientIp: clientIp.substring(0, 15) + '...', // Solo primeros 15 chars del IP
        cached: true,
      });
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: cached,
      });
      return;
    }
    
    // Generar pool de candidatos (igual que en cliente)
    const candidates = buildCandidateBank(sanitizedContext, sanitizedBank);
    
    if (candidates.length === 0) {
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          suggestions: [],
        },
      });
      return;
    }
    
    // Intentar re-ranking con embeddings si hay seed y API key disponible
    const openaiApiKey = process.env.OPENAI_API_KEY;
    let rankedSuggestions: Array<{ id: string; text: string; score?: number }> = [];
    
    if (sanitizedSeed && openaiApiKey && candidates.length > 0) {
      try {
        useEmbeddings = true;
        const embeddingsModel = process.env.OPENAI_EMBEDDINGS_MODEL || 'text-embedding-3-small';
        
        // Re-rankear con embeddings (top-6)
        rankedSuggestions = await rerankWithEmbeddings(
          sanitizedSeed,
          candidates,
          openaiApiKey,
          embeddingsModel,
          6 // Retornar top-6 (el frontend usa 2 + refresh)
        );
      } catch (error: any) {
        // Fallback a modo heurístico si falla embeddings
        embeddingsError = error.message;
        console.warn('[SuggestQuestions] Embeddings failed, using heuristic fallback:', {
          lessonId: sanitizedContext.lessonId,
          sectionId: sanitizedContext.sectionId,
          error: error.message.substring(0, 100), // Solo primeros 100 chars del error
        });
        
        // Usar rerank heurístico del servicio
        const { rerankCandidates } = await import('../../services/ai/suggestions.service');
        rankedSuggestions = rerankCandidates(sanitizedSeed, candidates, 6);
      }
    } else {
      // Sin seed o sin API key: usar orden original (por contexto)
      rankedSuggestions = candidates.slice(0, 6).map(c => ({ ...c, score: 0 }));
    }
    
    // Formatear respuesta
    const response: SuggestQuestionsResponse = {
      suggestions: rankedSuggestions.map(s => ({
        id: s.id,
        text: s.text,
      })),
    };
    
    // Guardar en cache (60s TTL)
    setCached(cacheKey, response);
    
    // Log sin textos completos (solo IDs, longitudes, metadata)
    const clientIp = getClientIp(req);
    const duration = Date.now() - startTime;
    console.log('[SuggestQuestions] Generated suggestions', {
      lessonId: sanitizedContext.lessonId,
      sectionId: sanitizedContext.sectionId,
      seedLength: sanitizedSeed.length,
      candidatesCount: candidates.length,
      suggestionsCount: response.suggestions.length,
      useEmbeddings,
      embeddingsError: embeddingsError?.substring(0, 50) || null,
      duration,
      clientIp: clientIp.substring(0, 15) + '...', // Solo primeros 15 chars del IP
      cached: false,
    });
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: response,
    });
  } catch (error: any) {
    // Log de error sin textos completos
    const clientIp = getClientIp(req);
    const requestContext = (req.body as SuggestQuestionsRequest)?.context;
    console.error('[SuggestQuestions] Error', {
      error: error.message?.substring(0, 100) || 'Unknown error',
      lessonId: requestContext?.lessonId,
      sectionId: requestContext?.sectionId,
      clientIp: clientIp.substring(0, 15) + '...',
    });
    
    next(error);
  }
};

