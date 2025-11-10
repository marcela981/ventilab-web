/**
 * =============================================================================
 * LLM Gateway Service
 * =============================================================================
 * 
 * Servicio centralizado para interactuar con proveedores de LLM (OpenAI, Anthropic, Google/Gemini).
 * Proporciona:
 * - Normalización de respuestas entre proveedores
 * - Manejo de errores robusto con reintentos
 * - Mapeo de errores a códigos HTTP consistentes
 * - Configuración de temperatura y límites de tokens
 * 
 * @module
 */

import { AIProviderFactory, AIProvider, StreamParams } from './AIProviderFactory';

/**
 * Resultado normalizado de la llamada al LLM
 */
export interface ExpandResult {
  expandedExplanation: string;
  keyPoints: string[];
  furtherReading: string[];
  internalLinks?: Array<{
    title: string;
    route: string;
    description?: string;
  }>;
  citations?: string[];
}

/**
 * Opciones de configuración para la llamada al LLM
 */
export interface LLMCallOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  provider?: 'openai' | 'anthropic' | 'google';
}

/**
 * Errores específicos del LLM Gateway
 */
export class LLMError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

/**
 * Mapear errores del proveedor a errores normalizados
 */
function mapProviderError(error: any, providerName: string): LLMError {
  const errorMessage = error?.message || error?.error || String(error);
  const statusCode = error?.status || error?.statusCode || 500;

  console.error(`[mapProviderError] Mapping error for ${providerName}:`, {
    message: errorMessage,
    statusCode,
    error: error,
  });

  // Errores de autenticación (401)
  if (statusCode === 401 || errorMessage.includes('API key') || errorMessage.includes('authentication') || errorMessage.includes('API_KEY_INVALID')) {
    return new LLMError(
      `Invalid API key for ${providerName}: ${errorMessage}`,
      'INVALID_API_KEY',
      401,
      false
    );
  }

  // Errores de rate limit (429)
  if (statusCode === 429 || errorMessage.includes('rate limit') || errorMessage.includes('quota') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
    return new LLMError(
      `Rate limit exceeded for ${providerName}: ${errorMessage}`,
      'RATE_LIMIT_EXCEEDED',
      429,
      true
    );
  }

  // Errores de modelo no encontrado (404)
  if (statusCode === 404 || errorMessage.includes('not found') || errorMessage.includes('MODEL_NOT_FOUND')) {
    return new LLMError(
      `Model not found for ${providerName}: ${errorMessage}`,
      'MODEL_NOT_FOUND',
      404,
      false
    );
  }

  // Errores de timeout
  if (errorMessage.includes('timeout') || errorMessage.includes('Timeout') || errorMessage.includes('DEADLINE_EXCEEDED')) {
    return new LLMError(
      `Request timeout for ${providerName}: ${errorMessage}`,
      'TIMEOUT',
      408,
      true
    );
  }

  // Errores de servidor (5xx) - retryable
  if (statusCode >= 500 && statusCode < 600) {
    return new LLMError(
      `Server error from ${providerName}: ${errorMessage}`,
      'PROVIDER_ERROR',
      statusCode,
      true
    );
  }

  // Errores 4xx - no retryable pero incluir mensaje
  if (statusCode >= 400 && statusCode < 500) {
    return new LLMError(
      `Client error from ${providerName}: ${errorMessage}`,
      'CLIENT_ERROR',
      statusCode,
      false
    );
  }

  // Otros errores
  return new LLMError(
    `Error from ${providerName}: ${errorMessage}`,
    'LLM_ERROR',
    statusCode >= 400 && statusCode < 500 ? statusCode : 500,
    false
  );
}

/**
 * Realizar llamada al LLM con reintentos
 */
async function callLLMWithRetry(
  provider: AIProvider,
  options: LLMCallOptions,
  maxRetries: number = 1
): Promise<string> {
  const { systemPrompt, userPrompt, temperature = 0.3 } = options;
  const providerName = provider.name;

  let lastError: LLMError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Construir mensajes
      const messages: Array<{ role: string; content: string }> = [
        { role: 'user', content: userPrompt },
      ];

      // Configurar parámetros del stream
      const streamParams: StreamParams = {
        messages,
        system: systemPrompt,
        temperature: Math.max(0.2, Math.min(0.5, temperature)), // Entre 0.2 y 0.5
        top_p: 0.9,
      };

      // Realizar llamada
      let fullResponse = '';
      let tokenCount = 0;
      let chunkCount = 0;
      const stream = provider.stream(streamParams);
      const timeoutMs = 30000; // 30 segundos timeout
      const startTime = Date.now();

      console.log(`[callLLMWithRetry] Starting stream from ${providerName} (attempt ${attempt + 1}/${maxRetries + 1})`);

      for await (const chunk of stream) {
        chunkCount++;
        
        // Verificar timeout
        if (Date.now() - startTime > timeoutMs) {
          console.error(`[callLLMWithRetry] Timeout after ${timeoutMs}ms. Received ${chunkCount} chunks, ${tokenCount} tokens, response length: ${fullResponse.length}`);
          throw new LLMError(
            `Request timeout after ${timeoutMs}ms`,
            'TIMEOUT',
            408,
            true
          );
        }

        if (chunk.type === 'token' && chunk.delta) {
          fullResponse += chunk.delta;
          tokenCount++;
        } else if (chunk.type === 'error') {
          const errorMessage = chunk.error || 'Unknown error from provider';
          console.error(`[callLLMWithRetry] Error from ${providerName}:`, errorMessage);
          console.error(`[callLLMWithRetry] Received ${chunkCount} chunks, ${tokenCount} tokens before error, response length: ${fullResponse.length}`);
          // Crear error con más contexto
          const error = new Error(errorMessage);
          (error as any).provider = providerName;
          throw error;
        } else if (chunk.type === 'end') {
          console.log(`[callLLMWithRetry] Stream ended. Received ${chunkCount} chunks, ${tokenCount} tokens, response length: ${fullResponse.length}`);
          break;
        } else {
          console.log(`[callLLMWithRetry] Received chunk type: ${chunk.type}, chunk count: ${chunkCount}`);
        }
      }

      // Si llegamos aquí, la llamada fue exitosa
      console.log(`[callLLMWithRetry] Stream completed. Final response length: ${fullResponse.length}, tokens: ${tokenCount}`);
      if (fullResponse.length === 0) {
        console.warn(`[callLLMWithRetry] WARNING: Stream completed but response is empty! Received ${chunkCount} chunks but no tokens.`);
      }
      return fullResponse;
    } catch (error: any) {
      lastError = mapProviderError(error, providerName);

      // Si no es retryable o ya hemos alcanzado el máximo de reintentos, lanzar error
      if (!lastError.retryable || attempt >= maxRetries) {
        throw lastError;
      }

      // Esperar antes de reintentar (backoff exponencial)
      const backoffMs = 1000 * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }

  // Si llegamos aquí, todos los reintentos fallaron
  throw lastError || new LLMError(
    `Failed to get response from ${providerName} after ${maxRetries + 1} attempts`,
    'MAX_RETRIES_EXCEEDED',
    500,
    false
  );
}

/**
 * Parsear respuesta del LLM a formato ExpandResult
 */
function parseLLMResponse(response: string): ExpandResult {
  // Log raw response for debugging (truncated to first 500 chars)
  const responsePreview = response.length > 500 ? response.substring(0, 500) + '...' : response;
  console.log('[parseLLMResponse] Raw response preview:', responsePreview);
  console.log('[parseLLMResponse] Response length:', response.length);

  if (!response || response.trim().length === 0) {
    console.warn('[parseLLMResponse] Empty response received');
    return {
      expandedExplanation: '',
      keyPoints: [],
      furtherReading: [],
      internalLinks: [],
      citations: [],
    };
  }

  try {
    // Intentar extraer JSON de la respuesta (mejorar regex para capturar JSON completo)
    // Buscar JSON que pueda estar dentro de markdown code blocks
    let jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || 
                    response.match(/\{[\s\S]*\}/);
    
    let parsed: any = null;
    
    if (jsonMatch) {
      try {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        parsed = JSON.parse(jsonStr);
        console.log('[parseLLMResponse] Successfully parsed JSON');
      } catch (parseError) {
        console.warn('[parseLLMResponse] Failed to parse JSON, trying alternative parsing:', parseError);
        // Intentar parsear sin el código markdown
        try {
          const cleanJson = jsonMatch[0].replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
          parsed = JSON.parse(cleanJson);
        } catch (e) {
          console.warn('[parseLLMResponse] Alternative JSON parsing also failed');
        }
      }
    }
    
    // Si no hay JSON válido, intentar parsear como texto plano
    if (!parsed) {
      console.log('[parseLLMResponse] No valid JSON found, using plain text fallback');
      // Si el texto está vacío o solo tiene whitespace, retornar vacío
      const trimmedResponse = response.trim();
      if (trimmedResponse.length === 0) {
        return {
          expandedExplanation: '',
          keyPoints: [],
          furtherReading: [],
          internalLinks: [],
          citations: [],
        };
      }
      // Fallback: crear respuesta básica desde el texto
      return {
        expandedExplanation: trimmedResponse.substring(0, 3000),
        keyPoints: [],
        furtherReading: [],
        internalLinks: [],
        citations: [],
      };
    }

    // Validar y extraer campos con múltiples variantes posibles
    const expandedExplanation = parsed.expandedExplanation || 
                                parsed.explicacion || 
                                parsed.explanation ||
                                parsed.text ||
                                parsed.content ||
                                '';
    
    console.log('[parseLLMResponse] Extracted explanation length:', expandedExplanation?.length || 0);

    const keyPoints = Array.isArray(parsed.keyPoints)
      ? parsed.keyPoints.map((p: any) => String(p || '').trim()).filter((p: string) => p.length > 0)
      : Array.isArray(parsed.puntosClave)
      ? parsed.puntosClave.map((p: any) => String(p || '').trim()).filter((p: string) => p.length > 0)
      : [];
    
    const furtherReading = Array.isArray(parsed.furtherReading)
      ? parsed.furtherReading.map((r: any) => String(r || '').trim()).filter((r: string) => r.length > 0)
      : Array.isArray(parsed.suggestedReferences)
      ? parsed.suggestedReferences.map((r: any) => {
          if (typeof r === 'string') return r.trim();
          if (r?.title) return r.title.trim();
          return '';
        }).filter((r: string) => r.length > 0)
      : Array.isArray(parsed.lecturasAdicionales)
      ? parsed.lecturasAdicionales.map((r: any) => String(r || '').trim()).filter((r: string) => r.length > 0)
      : [];
    
    const internalLinks = Array.isArray(parsed.internalLinks)
      ? parsed.internalLinks.map((link: any) => ({
          title: String(link.title || link.label || '').trim(),
          route: String(link.route || link.url || link.path || '').trim(),
          description: link.description ? String(link.description).trim() : undefined,
        })).filter((link: any) => link.title && link.route)
      : [];
    
    const citations = Array.isArray(parsed.citations)
      ? parsed.citations.map((c: any) => String(c || '').trim()).filter((c: string) => c.length > 0)
      : [];

    const result = {
      expandedExplanation: expandedExplanation.trim(),
      keyPoints: keyPoints.slice(0, 8), // Máximo 8 puntos clave
      furtherReading: furtherReading.slice(0, 6), // Máximo 6 recursos
      internalLinks: internalLinks.slice(0, 5), // Máximo 5 enlaces internos
      citations: citations.slice(0, 10), // Máximo 10 citaciones
    };

    console.log('[parseLLMResponse] Parsed result:', {
      explanationLength: result.expandedExplanation.length,
      keyPointsCount: result.keyPoints.length,
      furtherReadingCount: result.furtherReading.length,
      internalLinksCount: result.internalLinks.length,
    });

    return result;
  } catch (error) {
    console.error('[parseLLMResponse] Error parsing response:', error);
    // Si falla el parseo, retornar respuesta básica si hay contenido
    const trimmedResponse = response.trim();
    if (trimmedResponse.length === 0) {
      return {
        expandedExplanation: '',
        keyPoints: [],
        furtherReading: [],
        internalLinks: [],
        citations: [],
      };
    }
    return {
      expandedExplanation: trimmedResponse.substring(0, 3000), // Limitar a 3000 caracteres
      keyPoints: [],
      furtherReading: [],
      internalLinks: [],
      citations: [],
    };
  }
}

/**
 * LLM Gateway Service
 * Servicio principal para interactuar con LLMs
 */
export class LLMGateway {
  /**
   * Expandir tema usando LLM
   */
  static async expandTopic(options: LLMCallOptions): Promise<ExpandResult> {
    // Obtener proveedor
    const providerName = options.provider || process.env.AI_PROVIDER || 'google';
    const provider = AIProviderFactory.getProvider(providerName);

    if (!provider) {
      // Intentar con el proveedor por defecto
      const defaultProvider = AIProviderFactory.getDefaultProvider();
      if (!defaultProvider) {
        throw new LLMError(
          'No AI provider available. Please configure OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, or GOOGLE_API_KEY',
          'NO_PROVIDER_AVAILABLE',
          503,
          false
        );
      }
      return this.expandTopicWithProvider(defaultProvider, options);
    }

    return this.expandTopicWithProvider(provider, options);
  }

  /**
   * Expandir tema con un proveedor específico
   */
  private static async expandTopicWithProvider(
    provider: AIProvider,
    options: LLMCallOptions
  ): Promise<ExpandResult> {
    try {
      // Realizar llamada con reintentos
      const response = await callLLMWithRetry(provider, options, 1); // 1 reintento

      // Log response length for debugging
      console.log(`[expandTopicWithProvider] Received response from ${provider.name}, length: ${response.length}`);

      // Parsear respuesta
      const result = parseLLMResponse(response);

      // Validar que la explicación no esté vacía
      if (!result.expandedExplanation || result.expandedExplanation.trim().length === 0) {
        console.error(`[expandTopicWithProvider] Empty explanation after parsing. Response length: ${response.length}, Response preview: ${response.substring(0, 200)}`);
        throw new LLMError(
          `Empty response from LLM ${provider.name}. The model returned a response but the expandedExplanation field is empty.`,
          'EMPTY_RESPONSE',
          500,
          true
        );
      }

      // Limitar longitud de la explicación (400-600 palabras aprox)
      if (result.expandedExplanation.length > 4000) {
        result.expandedExplanation = result.expandedExplanation.substring(0, 4000) + '...';
      }

      return result;
    } catch (error) {
      if (error instanceof LLMError) {
        throw error;
      }
      throw mapProviderError(error, provider.name);
    }
  }
}

/**
 * Exportar instancia del servicio
 */
export const llmGateway = LLMGateway;

