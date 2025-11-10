/**
 * =============================================================================
 * Unified AI Chat Service
 * =============================================================================
 * 
 * Servicio unificado para comunicación con el backend de IA.
 * Soporta streaming (SSE/WebSocket) y modo no-stream.
 * Normaliza las llamadas de TutorAI y Chat por página.
 * 
 * @service
 */

// Detectar si estamos en Vite o Next.js
const getEnvVar = (viteVar, nextVar, fallback) => {
  try {
    // eslint-disable-next-line no-undef
    const metaEnv = import.meta?.env;
    if (metaEnv && metaEnv[viteVar]) {
      return metaEnv[viteVar];
    }
  } catch (e) {
    // Ignorar si import.meta no está disponible
  }
  
  if (typeof process !== 'undefined' && process.env) {
    return process.env[nextVar] || fallback;
  }
  return fallback;
};

const API_BASE_HTTP = getEnvVar('VITE_API_BASE_HTTP', 'NEXT_PUBLIC_API_URL', 'http://localhost:3001/api');
const API_BASE_WS = getEnvVar('VITE_API_BASE_WS', 'NEXT_PUBLIC_WS_URL', null);
const API_BASE_URL = getEnvVar('VITE_API_BASE_URL', 'NEXT_PUBLIC_API_URL', API_BASE_HTTP);

/**
 * Obtener token de autenticación
 */
const getAuthToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token') || 
         localStorage.getItem('ventilab_auth_token') || 
         sessionStorage.getItem('token') || 
         null;
};

/**
 * Determinar si un error es recuperable (se puede reintentar)
 */
const isRetryableError = (status) => {
  // Errores 5xx del servidor y 429 (rate limit) son recuperables
  // 401/403 no son recuperables (problema de autenticación/autorización)
  if (status >= 500) return true;
  if (status === 429) return true;
  if (status === 502 || status === 503 || status === 504) return true;
  return false;
};

/**
 * Manejar errores HTTP con mensajes legibles
 */
const handleHTTPError = (response, defaultMessage = 'Error desconocido') => {
  let message = defaultMessage;
  let code = null;
  
  // Intentar obtener mensaje del cuerpo de la respuesta
  let errorBody = null;
  try {
    // No podemos leer el body aquí porque ya se consumió, pero podemos intentar
    // obtener información del status
  } catch (e) {
    // Ignorar errores al leer el body
  }
  
  switch (response.status) {
    case 401:
      code = 'AUTH_ERROR';
      message = 'Error de autenticación: La clave de API no es válida o ha expirado. Por favor, verifica tu configuración.';
      break;
    case 403:
      code = 'QUOTA_ERROR';
      message = 'Error de cuota: Has excedido tu límite de uso o no tienes permisos. Por favor, verifica tu plan o contacta al administrador.';
      break;
    case 429:
      code = 'RATE_LIMIT';
      message = 'Límite de tasa excedido: Demasiadas solicitudes. Por favor, espera un momento antes de intentar de nuevo.';
      break;
    case 500:
      code = 'PROVIDER_ERROR';
      message = 'Error del proveedor de IA: El servicio está experimentando problemas. Por favor, intenta más tarde.';
      break;
    case 502:
      code = 'PROVIDER_ERROR';
      message = 'Error del proveedor: El servicio no está disponible temporalmente. Por favor, intenta más tarde.';
      break;
    case 503:
      code = 'PROVIDER_ERROR';
      message = 'Error del proveedor: El servicio está en mantenimiento. Por favor, intenta más tarde.';
      break;
    case 504:
      code = 'TIMEOUT_ERROR';
      message = 'Tiempo de espera agotado: El proveedor no respondió a tiempo. Por favor, intenta de nuevo.';
      break;
    default:
      if (response.status >= 500) {
        code = 'PROVIDER_ERROR';
        message = 'Error del proveedor de IA: El servicio está experimentando problemas. Por favor, intenta más tarde.';
      } else if (response.status >= 400) {
        code = 'CLIENT_ERROR';
        message = 'Error en la solicitud: Por favor, verifica e intenta de nuevo.';
      }
  }
  
  return { message, code, status: response.status, retryable: isRetryableError(response.status) };
};

/**
 * Recortar historial a las últimas N vueltas
 */
const trimHistory = (history, maxTurns = 12) => {
  if (!history || history.length === 0) return [];
  
  // Una vuelta = mensaje usuario + mensaje asistente
  const maxMessages = maxTurns * 2;
  
  if (history.length <= maxMessages) {
    return history;
  }

  return history.slice(-maxMessages);
};

/**
 * Manejar Server-Sent Events (SSE)
 */
const handleSSE = async (response, onToken, onEnd, onError) => {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            
            switch (data.type) {
              case 'token':
                onToken?.(data.delta);
                break;
              case 'end':
                onEnd?.(data.messageId, data.usage, data.suggestions);
                return;
              case 'error':
                onError?.(data.message || 'Error desconocido');
                return;
            }
          } catch (e) {
            console.warn('Error parsing SSE data:', e);
          }
        } else if (line.trim() && line.startsWith(':')) {
          // Comentario SSE, ignorar
          continue;
        }
      }
    }
  } catch (error) {
    console.error('Error reading SSE:', error);
    onError?.(error.message || 'Error leyendo respuesta del servidor');
  } finally {
    reader.releaseLock();
  }
};

/**
 * Construir mensajes para el backend
 * Normaliza el formato para que ambos flujos usen la misma estructura
 */
const buildMessages = ({ system, developer, user, history }) => {
  const messages = [];
  
  // Agregar system prompt si existe
  if (system) {
    messages.push({
      role: 'system',
      content: system,
    });
  }
  
  // Agregar developer prompt si existe (como mensaje del sistema adicional)
  if (developer) {
    messages.push({
      role: 'system',
      content: developer,
    });
  }
  
  // Agregar historial (ya recortado)
  if (history && Array.isArray(history)) {
    const trimmedHistory = trimHistory(history);
    messages.push(...trimmedHistory);
  }
  
  // Agregar mensaje del usuario actual
  if (user) {
    messages.push({
      role: 'user',
      content: user,
    });
  }
  
  return messages;
};

/**
 * Enviar mensaje con streaming (SSE)
 */
const sendMessageStream = async ({
  system,
  developer,
  user,
  history,
  context,
  strategy = 'auto', // 'auto', 'sse', 'websocket', 'http'
  provider = null, // Si es null, el backend decide
  onToken,
  onEnd,
  onError,
  abortController,
  maxRetries = 2,
}) => {
  try {
    const token = getAuthToken();
    const baseUrl = API_BASE_HTTP || API_BASE_URL;
    
    // Construir mensajes normalizados
    const messages = buildMessages({ system, developer, user, history });
    
    // Construir body del request (mismo formato que TutorAI)
    // TutorAI envía: { messages, lessonContext, provider }
    // Para compatibilidad, si context tiene lessonId (directo o en lesson.id), construir lessonContext
    const lessonId = context?.lessonId || context?.lesson?.id;
    const requestBody = {
      messages,
      // Si context tiene lessonId, construir lessonContext como TutorAI
      ...(lessonId ? {
        lessonContext: {
          lessonId: lessonId,
          title: context.lesson?.title || context.title || '',
          objectives: context.learningObjectives || context.objectives || [],
          tags: context.lesson?.tags || context.tags || [],
          tipoDeLeccion: context.lesson?.tipoDeLeccion || context.tipoDeLeccion || 'teoria',
        },
      } : {
        context: context || {}, // Fallback para contexto genérico
      }),
      provider: provider || undefined, // Backend decide si no se especifica
      strategy: strategy === 'auto' ? undefined : strategy,
    };
    
    // Realizar petición SSE con reintentos
    // Usar el mismo endpoint que TutorAI: /ai/chat/completions
    const response = await fetchWithRetry(
      `${baseUrl}/ai/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify(requestBody),
      },
      maxRetries,
      abortController
    );

    // Si el content-type es text/event-stream, manejar SSE
    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      return handleSSE(response, onToken, onEnd, (errorMessage) => {
        // Procesar error y obtener información estructurada
        const errorInfo = typeof errorMessage === 'string' 
          ? { message: errorMessage, code: 'STREAM_ERROR' }
          : errorMessage;
        onError?.(errorInfo.message || errorMessage, errorInfo);
      });
    }

    // Fallback: respuesta JSON completa
    const data = await response.json();
    
    if (data.error) {
      const errorInfo = {
        message: data.error,
        code: 'API_ERROR',
      };
      onError?.(errorInfo.message, errorInfo);
      return;
    }

    // Si hay respuesta completa, simular streaming
    if (data.response) {
      const tokens = data.response.split(/(\s+)/);
      for (const token of tokens) {
        if (token.trim()) {
          onToken?.(token);
          await new Promise(resolve => setTimeout(resolve, 20));
        }
      }
    }

    onEnd?.(data.messageId, data.usage, data.suggestions);
  } catch (error) {
    if (error.name === 'AbortError') {
      onError?.('Request cancelled', { code: 'CANCELLED' });
      return;
    }
    
    console.error('Error in sendMessageStream:', error);
    // Si el error tiene información estructurada, usarla
    const errorMessage = error.message || 'Error de conexión. Por favor, verifica tu conexión a internet.';
    const errorCode = error.code || 'NETWORK_ERROR';
    onError?.(errorMessage, { code: errorCode, status: error.status });
  }
};

/**
 * Calcular delay para backoff exponencial
 */
const calculateBackoffDelay = (attempt, baseDelay = 1000) => {
  // Exponencial: baseDelay * 2^attempt
  // Máximo 10 segundos
  const delay = Math.min(baseDelay * Math.pow(2, attempt), 10000);
  // Agregar jitter aleatorio (0-30% del delay)
  const jitter = delay * 0.3 * Math.random();
  return delay + jitter;
};

/**
 * Realizar petición HTTP con reintentos
 */
const fetchWithRetry = async (url, options, maxRetries = 2, abortController = null) => {
  let lastError = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: abortController?.signal,
      });

      // Si la respuesta es exitosa, retornarla
      if (response.ok) {
        return response;
      }

      // Si no es recuperable, no reintentar
      const errorInfo = handleHTTPError(response, 'Error en completions');
      if (!errorInfo.retryable || attempt === maxRetries) {
        // Crear un error con información estructurada
        const error = new Error(errorInfo.message);
        error.code = errorInfo.code;
        error.status = errorInfo.status;
        error.retryable = errorInfo.retryable;
        throw error;
      }

      // Si es recuperable y no es el último intento, esperar y reintentar
      if (attempt < maxRetries) {
        const delay = calculateBackoffDelay(attempt);
        console.log(`[chatService] Reintentando en ${delay.toFixed(0)}ms (intento ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // Si llegamos aquí, es el último intento y falló
      const error = new Error(errorInfo.message);
      error.code = errorInfo.code;
      error.status = errorInfo.status;
      error.retryable = errorInfo.retryable;
      throw error;
    } catch (error) {
      // Si es AbortError, no reintentar
      if (error.name === 'AbortError') {
        throw new Error('Request cancelled');
      }

      // Si es error de red y no es el último intento, reintentar
      if (attempt < maxRetries && !error.code) {
        const delay = calculateBackoffDelay(attempt);
        console.log(`[chatService] Error de red, reintentando en ${delay.toFixed(0)}ms (intento ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        lastError = error;
        continue;
      }

      // Si es el último intento o no es recuperable, lanzar el error
      throw error;
    }
  }

  // Esto no debería alcanzarse, pero por seguridad
  throw lastError || new Error('Error desconocido');
};

/**
 * Enviar mensaje sin streaming (respuesta completa)
 */
const sendMessageNoStream = async ({
  system,
  developer,
  user,
  history,
  context,
  strategy = 'auto',
  provider = null,
  abortController,
  maxRetries = 2,
}) => {
  try {
    const token = getAuthToken();
    const baseUrl = API_BASE_HTTP || API_BASE_URL;
    
    // Construir mensajes normalizados
    const messages = buildMessages({ system, developer, user, history });
    
    // Construir body del request (mismo formato que TutorAI)
    // TutorAI envía: { messages, lessonContext, provider }
    // Para compatibilidad, si context tiene lessonId (directo o en lesson.id), construir lessonContext
    const lessonId = context?.lessonId || context?.lesson?.id;
    const requestBody = {
      messages,
      // Si context tiene lessonId, construir lessonContext como TutorAI
      ...(lessonId ? {
        lessonContext: {
          lessonId: lessonId,
          title: context.lesson?.title || context.title || '',
          objectives: context.learningObjectives || context.objectives || [],
          tags: context.lesson?.tags || context.tags || [],
          tipoDeLeccion: context.lesson?.tipoDeLeccion || context.tipoDeLeccion || 'teoria',
        },
      } : {
        context: context || {}, // Fallback para contexto genérico
      }),
      provider: provider || undefined,
      strategy: strategy === 'auto' ? undefined : strategy,
      stream: false, // Forzar no-stream
    };
    
    // Realizar petición HTTP con reintentos
    // Usar el mismo endpoint que TutorAI: /ai/chat/completions
    const response = await fetchWithRetry(
      `${baseUrl}/ai/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify(requestBody),
      },
      maxRetries,
      abortController
    );

    const data = await response.json();
    
    if (data.error) {
      const error = new Error(data.error);
      error.code = 'API_ERROR';
      throw error;
    }

    return {
      response: data.response || data.content || '',
      usage: data.usage || null,
      suggestions: data.suggestions || null,
      messageId: data.messageId || null,
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request cancelled');
    }
    
    console.error('Error in sendMessageNoStream:', error);
    // Re-lanzar el error con su información estructurada
    throw error;
  }
};

/**
 * Enviar mensaje (API principal)
 * 
 * @param {Object} params
 * @param {string} params.system - System prompt
 * @param {string} params.developer - Developer prompt (opcional)
 * @param {string} params.user - Mensaje del usuario
 * @param {Array} params.history - Historial de conversación (opcional)
 * @param {Object} params.context - Contexto adicional (lessonId, etc.)
 * @param {string} params.strategy - Estrategia: 'auto', 'sse', 'websocket', 'http'
 * @param {string} params.provider - Proveedor: 'openai', 'anthropic', 'google' (opcional, backend decide si no se especifica)
 * @param {boolean} params.stream - Si true, usa streaming (default: true)
 * @param {Function} params.onToken - Callback para tokens (solo si stream=true)
 * @param {Function} params.onEnd - Callback cuando termina (solo si stream=true)
 * @param {Function} params.onError - Callback para errores (solo si stream=true)
 * @param {AbortController} params.abortController - AbortController para cancelar
 * 
 * @returns {Promise} Si stream=false, retorna { response, usage, suggestions, messageId }
 */
export const sendMessage = async ({
  system,
  developer,
  user,
  history = [],
  context = {},
  strategy = 'auto',
  provider = null,
  stream = true,
  onToken,
  onEnd,
  onError,
  abortController,
  maxRetries = 2,
}) => {
  // Validar parámetros requeridos
  if (!user || typeof user !== 'string' || user.trim().length === 0) {
    const error = new Error('user message is required');
    if (onError) {
      onError(error.message, { code: 'VALIDATION_ERROR' });
      return;
    }
    throw error;
  }

  if (stream) {
    // Modo streaming
    if (!onToken || !onEnd || !onError) {
      throw new Error('onToken, onEnd, and onError callbacks are required for streaming mode');
    }
    
    return sendMessageStream({
      system,
      developer,
      user,
      history,
      context,
      strategy,
      provider,
      onToken,
      onEnd,
      onError,
      abortController,
      maxRetries,
    });
  } else {
    // Modo no-stream
    return sendMessageNoStream({
      system,
      developer,
      user,
      history,
      context,
      strategy,
      provider,
      abortController,
      maxRetries,
    });
  }
};

/**
 * Obtener proveedores disponibles
 */
export const getProviders = async () => {
  try {
    const token = getAuthToken();
    const baseUrl = API_BASE_HTTP || API_BASE_URL;
    const response = await fetch(`${baseUrl}/ai/providers`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      const errorMessage = handleHTTPError(response, 'Error al obtener proveedores');
      console.warn(errorMessage);
      return ['google', 'openai', 'anthropic'];
    }

    const data = await response.json();
    if (data.success && data.data && data.data.providers) {
      return data.data.providers;
    }
    return data.providers || ['google', 'openai', 'anthropic'];
  } catch (error) {
    console.warn('Error getting providers:', error);
    return ['google', 'openai', 'anthropic'];
  }
};

// Exportar funciones de utilidad
export { trimHistory };

// Exportar por defecto
export default {
  sendMessage,
  getProviders,
  trimHistory,
};

