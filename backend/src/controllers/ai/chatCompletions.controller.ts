/**
 * =============================================================================
 * Chat Completions Controller
 * =============================================================================
 * 
 * Controlador unificado para completions de chat IA.
 * Soporta streaming (SSE) y modo no-stream.
 * Usa el mismo servicio de IA que TutorAI.
 * 
 * @module
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { AIProviderFactory } from '../../services/ai/AIProviderFactory';
import { AppError } from '../../middleware/errorHandler';
import { HTTP_STATUS, ERROR_CODES } from '../../config/constants';
import { buildPrompt as buildPromptTemplate } from '../../services/ai/prompts/lessonTemplates';
import { LessonContext } from '../../services/ai/TutorPromptService';

/**
 * Request body schema (validación básica)
 * Soporta tanto 'context' como 'lessonContext' para compatibilidad con TutorAI
 */
interface ChatCompletionsRequest {
  messages: Array<{ role: string; content: string }>;
  context?: Record<string, any>;
  lessonContext?: {
    lessonId: string;
    title?: string;
    objectives?: string[];
    tags?: string[];
    tipoDeLeccion?: string;
  };
  provider?: 'openai' | 'anthropic' | 'google';
  strategy?: string;
  stream?: boolean;
}

/**
 * Validar request
 */
function validateRequest(body: any): ChatCompletionsRequest {
  if (!body || typeof body !== 'object') {
    throw new AppError(
      'Invalid request body',
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    throw new AppError(
      'messages array is required and must not be empty',
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  // Validar que el último mensaje sea del usuario
  const lastMessage = body.messages[body.messages.length - 1];
  if (!lastMessage || lastMessage.role !== 'user' || !lastMessage.content) {
    throw new AppError(
      'Last message must be from user with content',
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  return {
    messages: body.messages,
    context: body.context || {},
    lessonContext: body.lessonContext || undefined, // Soportar formato TutorAI
    provider: body.provider || undefined,
    strategy: body.strategy || undefined,
    stream: body.stream !== false, // Default: true
  };
}

/**
 * Extraer system prompt de los mensajes o construir desde contexto de lección
 */
function extractSystemPrompt(
  messages: Array<{ role: string; content: string }>,
  context?: Record<string, any>
): {
  systemPrompt: string;
  userMessages: Array<{ role: string; content: string }>;
} {
  const systemMessages: string[] = [];
  const userMessages: Array<{ role: string; content: string }> = [];

  // Extraer system prompts de los mensajes
  for (const msg of messages) {
    if (msg.role === 'system') {
      systemMessages.push(msg.content);
    } else {
      userMessages.push(msg);
    }
  }

  // Si hay system prompt en los mensajes, usarlo
  if (systemMessages.length > 0) {
    return {
      systemPrompt: systemMessages.join('\n\n'),
      userMessages,
    };
  }

  // Si no hay system prompt pero hay contexto de lección, construir desde contexto
  if (context && context.lessonId) {
    try {
      const lessonContext: LessonContext = {
        lessonId: context.lessonId,
        title: context.title || '',
        objectives: context.objectives || [],
        tags: context.tags || [],
        tipoDeLeccion: context.tipoDeLeccion || 'teoria',
      };

      const provider = (context.provider as 'openai' | 'anthropic' | 'google') || 'google';
      
      // Construir historial desde userMessages (excluyendo el último que es el mensaje actual)
      const historyMessages = userMessages.slice(0, -1).map(msg => ({
        role: msg.role,
        content: msg.content,
      }));
      
      const promptData = buildPromptTemplate(
        provider,
        lessonContext,
        historyMessages,
        lessonContext.tipoDeLeccion
      );

      // El último mensaje es el mensaje actual del usuario
      const currentUserMessage = userMessages[userMessages.length - 1];

      return {
        systemPrompt: promptData.system,
        userMessages: [...promptData.messages, currentUserMessage],
      };
    } catch (error) {
      console.warn('[chatCompletions] Error building prompt from context:', error);
      // Continuar sin system prompt
    }
  }

  // Si no hay system prompt, retornar vacío
  return {
    systemPrompt: '',
    userMessages,
  };
}

/**
 * POST /api/ai/chat/completions
 * Unified chat completions endpoint
 * 
 * @param req - Request con messages, context, provider, stream
 * @param res - Response con streaming (SSE) o JSON completo
 */
export const chatCompletions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validar request
    const validated = validateRequest(req.body);
    const { messages, context, lessonContext, provider: requestedProvider, stream } = validated;

    // Determinar proveedor (mismo que TutorAI)
    const providerName = requestedProvider || process.env.AI_PROVIDER || 'google';
    const aiProvider = AIProviderFactory.getProvider(providerName);
    
    if (!aiProvider) {
      throw new AppError(
        `Provider "${providerName}" not available`,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    // Normalizar contexto: si viene lessonContext (formato TutorAI), convertirlo a context
    // Si viene context (formato chat por página), usarlo directamente
    const normalizedContext = lessonContext 
      ? {
          lessonId: lessonContext.lessonId,
          title: lessonContext.title,
          objectives: lessonContext.objectives,
          tags: lessonContext.tags,
          tipoDeLeccion: lessonContext.tipoDeLeccion,
          // Mapear a formato interno
          ...context, // Permitir campos adicionales del context
        }
      : context;

    // Extraer system prompt y mensajes de usuario (construir desde contexto si es necesario)
    const { systemPrompt, userMessages } = extractSystemPrompt(messages, normalizedContext);

    // Configurar streaming
    if (stream && req.headers.accept?.includes('text/event-stream')) {
      // Modo streaming (SSE)
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Deshabilitar buffering en nginx

      let fullContent = '';
      let usage: { promptTokens: number; completionTokens: number; totalTokens: number } | undefined;

      try {
        // Stream desde el proveedor
        for await (const chunk of aiProvider.stream({
          messages: userMessages,
          system: systemPrompt || undefined,
          temperature: 0.7, // Mismo que TutorAI
          top_p: 1.0,
        })) {
          if (chunk.type === 'token' && chunk.delta) {
            fullContent += chunk.delta;
            // Enviar token por SSE
            res.write(`data: ${JSON.stringify({ type: 'token', delta: chunk.delta })}\n\n`);
          } else if (chunk.type === 'end') {
            usage = chunk.usage;
            // Enviar evento end
            res.write(`data: ${JSON.stringify({ 
              type: 'end', 
              messageId: chunk.messageId || `msg-${Date.now()}`,
              usage,
              suggestions: null, // Se puede agregar si es necesario
            })}\n\n`);
            break;
          } else if (chunk.type === 'error') {
            // Enviar error
            res.write(`data: ${JSON.stringify({ 
              type: 'error', 
              message: chunk.error || 'Unknown error' 
            })}\n\n`);
            res.end();
            return;
          }
        }

        res.end();
      } catch (error: any) {
        console.error('[chatCompletions] Stream error:', error);
        res.write(`data: ${JSON.stringify({ 
          type: 'error', 
          message: error.message || 'Stream error' 
        })}\n\n`);
        res.end();
      }
    } else {
      // Modo no-stream (respuesta completa)
      let fullContent = '';
      let usage: { promptTokens: number; completionTokens: number; totalTokens: number } | undefined;

      try {
        // Stream desde el proveedor pero acumular
        for await (const chunk of aiProvider.stream({
          messages: userMessages,
          system: systemPrompt || undefined,
          temperature: 0.7,
          top_p: 1.0,
        })) {
          if (chunk.type === 'token' && chunk.delta) {
            fullContent += chunk.delta;
          } else if (chunk.type === 'end') {
            usage = chunk.usage;
            break;
          } else if (chunk.type === 'error') {
            throw new Error(chunk.error || 'Unknown error');
          }
        }

        // Retornar respuesta completa
        res.status(HTTP_STATUS.OK).json({
          success: true,
          response: fullContent,
          usage,
          messageId: `msg-${Date.now()}`,
          suggestions: null,
        });
      } catch (error: any) {
        console.error('[chatCompletions] Error:', error);
        throw new AppError(
          error.message || 'Error generating response',
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          ERROR_CODES.INTERNAL_ERROR
        );
      }
    }
  } catch (error: any) {
    next(error);
  }
};

