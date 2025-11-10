/**
 * =============================================================================
 * Expand Topic Controller
 * =============================================================================
 * 
 * Controlador para el endpoint de expansión de temas con IA.
 * Maneja la validación, rate limiting, y orquestación del servicio de IA.
 * 
 * @module
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { ExpandTopicRequestSchema, ExpandTopicRequest } from '../../schemas/ai/expandTopic.schema';
import { expandTopicService } from '../../services/ai/expandTopic.service';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../middleware/errorHandler';
import { HTTP_STATUS, ERROR_CODES } from '../../config/constants';
import { config } from '../../config/config';
import { sanitizeText } from '../../utils/sanitize';

/**
 * Estructurar log para el endpoint
 */
interface StructuredLog {
  timestamp: string;
  method: string;
  path: string;
  userId?: string;
  userEmail?: string;
  lessonId?: string;
  sectionId?: string;
  userInputLength?: number;
  visibleTextLength?: number;
  selectionTextLength?: number;
  statusCode?: number;
  errorCode?: string;
  errorMessage?: string;
  duration?: number;
  provider?: string;
}

/**
 * Log estructurado (sin payloads grandes)
 */
function logRequest(log: StructuredLog): void {
  // En desarrollo, log completo
  if (config.nodeEnv === 'development') {
    console.log('[expandTopic]', JSON.stringify(log, null, 2));
  } else {
    // En producción, log mínimo (sin datos sensibles)
    const productionLog: Partial<StructuredLog> = {
      timestamp: log.timestamp,
      method: log.method,
      path: log.path,
      userId: log.userId,
      lessonId: log.lessonId,
      statusCode: log.statusCode,
      errorCode: log.errorCode,
      duration: log.duration,
    };
    console.log('[expandTopic]', JSON.stringify(productionLog));
  }
}

/**
 * Sanitizar y preparar datos de entrada
 */
function sanitizeInput(data: ExpandTopicRequest): ExpandTopicRequest {
  // Sanitizar userInput
  if (data.userInput) {
    data.userInput = sanitizeText(data.userInput, {
      removePII: true,
      stripHtml: true,
      trim: true,
    });
  }

  // Sanitizar question (compatibilidad)
  if (data.question) {
    data.question = sanitizeText(data.question, {
      removePII: true,
      stripHtml: true,
      trim: true,
    });
  }

  // Sanitizar context
  if (data.context) {
    // Sanitizar títulos
    if (data.context.moduleTitle) {
      data.context.moduleTitle = sanitizeText(data.context.moduleTitle, {
        stripHtml: true,
        trim: true,
      });
    }
    if (data.context.lessonTitle) {
      data.context.lessonTitle = sanitizeText(data.context.lessonTitle, {
        stripHtml: true,
        trim: true,
      });
    }
    if (data.context.sectionTitle) {
      data.context.sectionTitle = sanitizeText(data.context.sectionTitle, {
        stripHtml: true,
        trim: true,
      });
    }

    // Sanitizar contenido (PII será removido en el servicio antes de enviar al LLM)
    if (data.context.sectionContent) {
      data.context.sectionContent = sanitizeText(data.context.sectionContent, {
        removePII: false, // Se removerá PII en el servicio antes de enviar al LLM
        stripHtml: true,
        trim: true,
      });
    }
    if (data.context.visibleTextBlock) {
      data.context.visibleTextBlock = sanitizeText(data.context.visibleTextBlock, {
        removePII: false,
        stripHtml: true,
        trim: true,
      });
    }
    if (data.context.userSelection) {
      data.context.userSelection = sanitizeText(data.context.userSelection, {
        removePII: false,
        stripHtml: true,
        trim: true,
      });
    }

    // Sanitizar breadcrumbs
    if (data.context.breadcrumbs) {
      data.context.breadcrumbs = data.context.breadcrumbs.map(breadcrumb => ({
        ...breadcrumb,
        label: sanitizeText(breadcrumb.label, { stripHtml: true, trim: true }),
        id: sanitizeText(breadcrumb.id, { stripHtml: true, trim: true }),
      }));
    }
  }

  return data;
}

/**
 * POST /api/ai/expand-topic
 * Expande un tema usando IA basado en el contexto de la sección
 * 
 * @param req - Request con contexto y pregunta opcional
 * @param res - Response con resultado de la expansión
 */
export const expandTopic = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const startTime = Date.now();
  const log: StructuredLog = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    userId: req.user?.id,
    userEmail: req.user?.email,
  };

  try {
    // Validar request con Zod
    const validationResult = ExpandTopicRequestSchema.safeParse(req.body);

    if (!validationResult.success) {
      log.statusCode = HTTP_STATUS.BAD_REQUEST;
      log.errorCode = ERROR_CODES.VALIDATION_ERROR;
      log.errorMessage = 'Validation failed';
      log.duration = Date.now() - startTime;
      logRequest(log);

      throw new AppError(
        'Invalid request data',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR,
        true,
        validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      );
    }

    // Sanitizar y preparar datos
    const sanitizedData = sanitizeInput(validationResult.data);
    const { context, userInput, question } = sanitizedData;

    // Usar userInput si está presente, sino question (compatibilidad)
    const userQuestion = userInput || question || null;

    // Registrar métricas (sin payloads grandes)
    log.lessonId = context.lessonId;
    log.sectionId = context.sectionId || undefined;
    log.userInputLength = userQuestion?.length || 0;
    log.visibleTextLength = (context.sectionContent || context.visibleTextBlock || '').length;
    log.selectionTextLength = context.userSelection?.length || 0;

    // Llamar al servicio de expansión
    const result = await expandTopicService({
      context,
      question: userQuestion,
    });

    // Manejar resultado del servicio
    if (!result.success) {
      log.statusCode = result.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
      log.errorCode = result.error?.code || 'UNKNOWN_ERROR';
      log.errorMessage = result.error?.message || 'Error expanding topic';
      log.duration = Date.now() - startTime;
      logRequest(log);

      // Si es un error de rate limit, retornar 429 con Retry-After
      if (result.status === 429) {
        res.setHeader('Retry-After', '60'); // 60 segundos
        throw new AppError(
          result.error?.message || 'Rate limit exceeded',
          HTTP_STATUS.TOO_MANY_REQUESTS,
          ERROR_CODES.RATE_LIMIT_EXCEEDED,
          true,
          ['Please try again later']
        );
      }

      // Si es un error de autenticación del proveedor o proveedor no disponible
      if (result.status === 401 || result.status === 503) {
        // Usar el mensaje de error del servicio si está disponible
        const errorMessage = result.error?.message || 'AI service temporarily unavailable';
        throw new AppError(
          errorMessage,
          HTTP_STATUS.SERVICE_UNAVAILABLE,
          result.error?.code || 'AI_SERVICE_UNAVAILABLE',
          true,
          ['Please check your API keys configuration']
        );
      }

      // Otros errores
      throw new AppError(
        result.error?.message || 'Error expanding topic',
        result.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
        result.error?.code || 'AI_SERVICE_ERROR',
        true
      );
    }

    // Log de éxito
    log.statusCode = HTTP_STATUS.OK;
    log.duration = Date.now() - startTime;
    logRequest(log);

    // Retornar resultado exitoso
    sendSuccess(res, HTTP_STATUS.OK, undefined, result.data);
  } catch (error: any) {
    // Log de error
    log.statusCode = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    log.errorCode = error.code || 'INTERNAL_ERROR';
    log.errorMessage = error.message || 'Unknown error';
    log.duration = Date.now() - startTime;
    logRequest(log);

    // Pasar error al error handler
    next(error);
  }
};
