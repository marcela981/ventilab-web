/**
 * =============================================================================
 * Expand Topic Service
 * =============================================================================
 * 
 * Servicio para expandir temas usando IA.
 * Utiliza el LLM Gateway para generar contenido ampliado con guardrails y validaciones.
 * 
 * @module
 */

import { llmGateway, LLMCallOptions, ExpandResult, LLMError } from './llmGateway';
import { ExpandTopicRequest, ExpandTopicResponse } from '../../schemas/ai/expandTopic.schema';
import { sanitizeText, sanitizePII } from '../../utils/sanitize';
import { AIProviderFactory } from './AIProviderFactory';
import { generateDeterministicExpansion } from './deterministicExpander.service';

/**
 * Parámetros del servicio
 */
interface ExpandTopicServiceParams {
  context: ExpandTopicRequest['context'];
  question: string | null;
}

/**
 * Resultado del servicio
 */
interface ExpandTopicServiceResult {
  success: boolean;
  data?: ExpandTopicResponse;
  error?: {
    code: string;
    message: string;
  };
  status?: number;
}

/**
 * Construir prompt del sistema
 * Define el rol, tono y estructura de salida
 */
function buildSystemPrompt(): string {
  return `Eres un tutor clínico-educativo especializado en ventilación mecánica. Tu rol es generar expansiones de temas educativos en lenguaje claro y accesible, sin proporcionar recomendaciones médicas para pacientes reales.

## Tu rol
- Eres un tutor educativo que explica conceptos de ventilación mecánica
- Generas contenido pedagógico, estructurado y conciso
- Utilizas bullets, títulos y formato claro para facilitar la comprensión
- No proporcionas diagnósticos ni órdenes médicas
- No reemplazas la consulta con profesionales de la salud

## Tono y estilo
- Pedagógico: explica conceptos de forma didáctica
- Estructurado: organiza la información de manera lógica
- Conciso: sé directo y evita redundancias
- Claro: usa lenguaje accesible sin sacrificar precisión técnica
- Neutro: utiliza español neutro (evita regionalismos)

## Estructura de salida (JSON)
Debes generar un JSON con la siguiente estructura:

{
  "expandedExplanation": "Explicación ampliada del tema (máximo 400-600 palabras). Debe ser clara, estructurada y pedagógica.",
  "keyPoints": ["punto clave 1", "punto clave 2", ...], // 5-8 puntos clave importantes
  "furtherReading": ["recurso 1", "recurso 2", ...], // 4-6 recursos genéricos sugeridos (solo títulos, sin URLs)
  "internalLinks": [{"title": "Título", "route": "/ruta", "description": "Descripción opcional"}], // 3-5 enlaces internos sugeridos
  "citations": ["cita 1", "cita 2", ...] // Citaciones si es relevante (opcional)
}

### Detalles de cada sección:

1. **expandedExplanation**: Explicación ampliada (400-600 palabras)
   - Usa párrafos cortos y claros
   - Incluye ejemplos conceptuales cuando sea apropiado
   - Estructura con títulos y bullets cuando sea necesario
   - Cita bases fisiológicas cuando sea relevante (sin inventar referencias)

2. **keyPoints**: Puntos clave (5-8 bullets)
   - Lista de conceptos importantes
   - Formato conciso y directo
   - Cada punto debe ser autocontenido

3. **furtherReading**: Recursos sugeridos (4-6 recursos)
   - Solo títulos o nombres genéricos de recursos
   - NO incluyas URLs a menos que sea un recurso educativo conocido
   - Ejemplos: "Guía de ventilación mecánica básica", "Principios de fisiología respiratoria"

4. **internalLinks**: Enlaces internos (3-5 enlaces)
   - Solo si hay rutas internas relacionadas
   - Deben ser relevantes al tema actual
   - Formato: {"title": "Título de la lección", "route": "/teaching/...", "description": "Descripción opcional"}

5. **citations**: Citaciones (opcional)
   - Solo si mencionas referencias específicas
   - Formato: ["Autor, Año", "Autor et al., Año"]
   - NO inventes DOIs o referencias específicas

## Guardrails y restricciones
1. NO dar diagnósticos médicos ni órdenes para pacientes reales
2. NO inventar DOIs o referencias específicas (solo citar bases fisiológicas conocidas)
3. Si el usuario pide algo fuera de la sección actual, sugiere rutas internas relacionadas
4. Si detectas ambigüedad, explica los supuestos y límites de la respuesta
5. Mantén el contenido educativo y teórico, no clínico aplicado
6. No incluyas información que pueda ser interpretada como consejo médico

## Formato de la explicación ampliada
- Máximo 400-600 palabras
- Usa párrafos cortos y claros
- Incluye ejemplos conceptuales cuando sea apropiado
- Estructura la información con títulos y bullets cuando sea necesario
- Cita bases fisiológicas cuando sea relevante (sin inventar referencias)`;
}

/**
 * Construir prompt del usuario
 * Incluye contexto de la sección y pregunta del usuario
 */
function buildUserPrompt(
  context: ExpandTopicRequest['context'],
  question: string | null
): string {
  const parts: string[] = [];

  // Breadcrumbs y contexto de navegación
  if (context.breadcrumbs && Array.isArray(context.breadcrumbs) && context.breadcrumbs.length > 0) {
    const breadcrumbPath = context.breadcrumbs
      .map((b: any) => (typeof b === 'object' && b !== null ? (b.label || b.title || '') : String(b)))
      .filter(Boolean)
      .join(' > ');
    if (breadcrumbPath) {
      parts.push(`Ruta: ${breadcrumbPath}`);
    }
  } else {
    // Construir breadcrumbs desde los títulos
    const breadcrumbs: string[] = [];
    if (context.moduleTitle) breadcrumbs.push(context.moduleTitle);
    if (context.lessonTitle) breadcrumbs.push(context.lessonTitle);
    if (context.sectionTitle) breadcrumbs.push(context.sectionTitle);
    if (breadcrumbs.length > 0) {
      parts.push(`Ruta: ${breadcrumbs.join(' > ')}`);
    }
  }

  parts.push('');

  // Información del módulo y lección
  if (context.moduleTitle) {
    parts.push(`Módulo: ${context.moduleTitle}`);
  }
  if (context.lessonTitle) {
    parts.push(`Lección: ${context.lessonTitle}`);
  }
  if (context.sectionTitle) {
    parts.push(`Sección: ${context.sectionTitle}`);
  }
  parts.push('');

  // Contenido de la sección (sanitizado y limitado)
  const visibleText = context.sectionContent || context.visibleTextBlock || '';
  if (visibleText) {
    // Sanitizar PII antes de enviar al LLM
    const sanitizedText = sanitizePII(visibleText);
    // Limitar a 3000 caracteres para el prompt (dejando margen para el resto)
    const limitedText = sanitizedText.length > 3000 
      ? sanitizedText.substring(0, 3000) + '...' 
      : sanitizedText;
    parts.push('Contenido de la sección:');
    parts.push(limitedText);
    parts.push('');
  }

  // Selección del usuario (si existe)
  if (context.userSelection) {
    const sanitizedSelection = sanitizePII(context.userSelection);
    const limitedSelection = sanitizedSelection.length > 1000
      ? sanitizedSelection.substring(0, 1000) + '...'
      : sanitizedSelection;
    parts.push(`Texto seleccionado por el usuario: "${limitedSelection}"`);
    parts.push('');
  }

  // Pregunta del usuario (si existe)
  if (question) {
    const sanitizedQuestion = sanitizePII(question.trim());
    parts.push(`Pregunta del usuario: ${sanitizedQuestion}`);
    parts.push('');
  }

  // Instrucciones finales
  parts.push('Por favor, genera una expansión del tema siguiendo la estructura JSON especificada en el prompt del sistema.');

  return parts.join('\n');
}

/**
 * Validar y sanitizar resultado del LLM
 */
function validateAndSanitizeResult(result: ExpandResult): ExpandTopicResponse {
  // Validar que la explicación exista
  if (!result.expandedExplanation || typeof result.expandedExplanation !== 'string') {
    console.error('[validateAndSanitizeResult] expandedExplanation inválida:', result.expandedExplanation);
    throw new Error('Invalid expandedExplanation in result');
  }

  // Sanitizar explicación
  const expandedExplanation = sanitizeText(result.expandedExplanation, {
    removePII: false, // Ya fue sanitizado antes
    stripHtml: false, // Permitir HTML básico
    trim: true,
  });

  // Validar que después de sanitizar no esté vacía
  if (!expandedExplanation || expandedExplanation.trim().length === 0) {
    console.error('[validateAndSanitizeResult] expandedExplanation vacía después de sanitizar');
    throw new Error('Empty expandedExplanation after sanitization');
  }

  // Validar longitud de explicación (400-600 palabras aprox)
  const wordCount = expandedExplanation.split(/\s+/).filter(w => w.length > 0).length;
  if (wordCount < 200) {
    // Si es muy corta, puede no ser útil
    console.warn('[expandTopicService] Explicación muy corta:', wordCount, 'palabras');
  }
  if (wordCount > 800) {
    // Si es muy larga, truncar
    const words = expandedExplanation.split(/\s+/);
    const truncated = words.slice(0, 800).join(' ');
    // Intentar terminar en una oración completa
    const lastPeriod = truncated.lastIndexOf('.');
    const lastExclamation = truncated.lastIndexOf('!');
    const lastQuestion = truncated.lastIndexOf('?');
    const lastSentenceEnd = Math.max(lastPeriod, lastExclamation, lastQuestion);
    
    if (lastSentenceEnd > truncated.length * 0.8) {
      return {
        expandedExplanation: truncated.substring(0, lastSentenceEnd + 1),
        keyPoints: (result.keyPoints || []).map(p => sanitizeText(p, { trim: true })),
        suggestedReferences: (result.furtherReading || []).map(r => sanitizeText(String(r), { trim: true })),
        internalLinks: (result.internalLinks || []).map(link => ({
          title: sanitizeText(link.title, { trim: true }),
          url: sanitizeText(link.route, { trim: true }),
          description: link.description ? sanitizeText(link.description, { trim: true }) : undefined,
        })),
      };
    }
  }

  // Sanitizar puntos clave
  const keyPoints = (result.keyPoints || [])
    .map(p => sanitizeText(p, { trim: true }))
    .filter(p => p.length > 0)
    .slice(0, 8); // Máximo 8 puntos

  // Sanitizar referencias sugeridas (solo strings, sin URLs)
  // furtherReading puede ser string[] según la interfaz, pero el parser puede devolver objetos
  const furtherReadingItems: any[] = Array.isArray(result.furtherReading) ? result.furtherReading : [];
  const suggestedReferences = furtherReadingItems
    .map((r: any) => {
      // Si es un objeto, extraer solo el título
      if (typeof r === 'object' && r !== null && !Array.isArray(r)) {
        return sanitizeText(String(r.title || r.label || ''), { trim: true });
      }
      // Si es un string, usar directamente
      return sanitizeText(String(r), { trim: true });
    })
    .filter((r: string) => r.length > 0)
    .slice(0, 6); // Máximo 6 recursos

  // Sanitizar enlaces internos
  const internalLinks = (result.internalLinks || [])
    .map(link => ({
      title: sanitizeText(link.title, { trim: true }),
      url: sanitizeText(link.route, { trim: true }),
      description: link.description ? sanitizeText(link.description, { trim: true }) : undefined,
    }))
    .filter(link => link.title.length > 0 && link.url.length > 0)
    .slice(0, 5); // Máximo 5 enlaces

  return {
    expandedExplanation,
    keyPoints,
    suggestedReferences,
    internalLinks,
  };
}

/**
 * Servicio principal para expandir temas
 */
export async function expandTopicService({
  context,
  question,
}: ExpandTopicServiceParams): Promise<ExpandTopicServiceResult> {
  try {
    // Validar que el contexto tenga los campos mínimos
    if (!context || !context.lessonId) {
      console.error('[expandTopicService] Contexto inválido:', { hasContext: !!context, hasLessonId: !!context?.lessonId });
      return {
        success: false,
        error: {
          code: 'INVALID_CONTEXT',
          message: 'Invalid context: lessonId is required',
        },
        status: 400,
      };
    }

    // Construir prompts
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(context, question);

    // Determinar proveedor desde env (soporta openai, anthropic, google)
    const requestedProviderName = process.env.AI_PROVIDER || 'google';
    
    // Verificar que haya proveedores disponibles
    const availableProviders = AIProviderFactory.getAvailableProviders();
    if (availableProviders.length === 0) {
      // Modo fallback: generar contenido determinista sin LLM
      console.warn('[expandTopicService] No hay proveedores de IA configurados, usando modo determinista (fallback)');
      const deterministicResult = generateDeterministicExpansion(context, question);
      return {
        success: true,
        data: deterministicResult,
      };
    }

    // Determinar qué proveedor usar
    let providerToUse: 'openai' | 'anthropic' | 'google' | undefined;
    
    // Primero intentar con el proveedor solicitado
    if (AIProviderFactory.isProviderAvailable(requestedProviderName)) {
      providerToUse = requestedProviderName as 'openai' | 'anthropic' | 'google';
      console.log(`[expandTopicService] Usando proveedor solicitado: ${providerToUse}`);
    } else {
      // Si el proveedor solicitado no está disponible, usar el proveedor por defecto disponible
      const defaultProvider = AIProviderFactory.getDefaultProvider();
      if (!defaultProvider) {
        // Modo fallback: generar contenido determinista sin LLM
        console.warn(`[expandTopicService] Proveedor "${requestedProviderName}" no disponible y no hay proveedores alternativos, usando modo determinista (fallback)`);
        const deterministicResult = generateDeterministicExpansion(context, question);
        return {
          success: true,
          data: deterministicResult,
        };
      }
      // Usar el proveedor por defecto disponible
      providerToUse = defaultProvider.name as 'openai' | 'anthropic' | 'google';
      console.warn(`[expandTopicService] Proveedor "${requestedProviderName}" no disponible, usando proveedor por defecto: ${providerToUse}`);
    }

    // Configurar opciones de llamada
    const llmOptions: LLMCallOptions = {
      systemPrompt,
      userPrompt,
      temperature: parseFloat(process.env.AI_TEMPERATURE || '0.3'), // Temperatura moderada (0.2-0.5)
      maxTokens: parseInt(process.env.AI_MAX_TOKENS || '2000', 10),
      provider: providerToUse,
    };

    // Llamar al LLM Gateway
    let result: ExpandResult;
    try {
      result = await llmGateway.expandTopic(llmOptions);
    } catch (error: any) {
      console.error('[expandTopicService] Error llamando al LLM Gateway:', error);
      
      // Si es un error de "NO_PROVIDER_AVAILABLE", usar modo determinista
      if (error instanceof LLMError && error.code === 'NO_PROVIDER_AVAILABLE') {
        console.warn('[expandTopicService] No hay proveedores disponibles, usando modo determinista (fallback)');
        const deterministicResult = generateDeterministicExpansion(context, question);
        return {
          success: true,
          data: deterministicResult,
        };
      }
      
      // Si es un LLMError, se manejará en el catch externo
      throw error;
    }

    // Validar que el resultado tenga la estructura esperada
    if (!result || typeof result !== 'object') {
      console.error('[expandTopicService] Resultado inválido del LLM:', result);
      return {
        success: false,
        error: {
          code: 'INVALID_RESPONSE',
          message: 'Invalid response from AI service',
        },
        status: 500,
      };
    }

    // Validar y sanitizar resultado
    let sanitizedResult: ExpandTopicResponse;
    try {
      sanitizedResult = validateAndSanitizeResult(result);
    } catch (error: any) {
      console.error('[expandTopicService] Error validando resultado:', error);
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Error validating AI response',
        },
        status: 500,
      };
    }

    return {
      success: true,
      data: sanitizedResult,
    };
  } catch (error: any) {
    // Manejar errores del LLM Gateway
    if (error instanceof LLMError) {
      // Mapear códigos de error a códigos HTTP
      let statusCode = error.statusCode;
      let errorCode = error.code;
      let errorMessage = error.message;

      // Si es un error de rate limit, retornar 429
      if (errorCode === 'RATE_LIMIT_EXCEEDED') {
        statusCode = 429;
      }

      // Si es un error de autenticación, retornar 401
      if (errorCode === 'INVALID_API_KEY') {
        statusCode = 401;
        const providerName = (error as any).providerName || 'AI provider';
        errorMessage = `Invalid API key for ${providerName}. Please check your API key configuration in the backend.`;
      }

      // Si es un error de proveedor no disponible, usar modo determinista
      if (errorCode === 'NO_PROVIDER_AVAILABLE') {
        console.warn('[expandTopicService] No hay proveedores disponibles, usando modo determinista (fallback)');
        const deterministicResult = generateDeterministicExpansion(context, question);
        return {
          success: true,
          data: deterministicResult,
        };
      }

      // Si es un error de respuesta vacía, usar modo determinista como fallback
      // Esto puede ocurrir si el LLM devuelve una respuesta pero no en el formato esperado
      if (errorCode === 'EMPTY_RESPONSE') {
        console.warn('[expandTopicService] LLM devolvió respuesta vacía, usando modo determinista (fallback)');
        const deterministicResult = generateDeterministicExpansion(context, question);
        return {
          success: true,
          data: deterministicResult,
        };
      }

      return {
        success: false,
        error: {
          code: errorCode,
          message: errorMessage,
        },
        status: statusCode,
      };
    }

    // Errores genéricos
    console.error('[expandTopicService] Error:', error);
    return {
      success: false,
      error: {
        code: 'AI_SERVICE_ERROR',
        message: error.message || 'Error calling AI service',
      },
      status: 500,
    };
  }
}

// Exportar instancia del servicio
export const expandTopicServiceInstance = {
  expandTopic: expandTopicService,
};
