/**
 * TutorService - Servicio para comunicación con el backend del tutor IA
 * Maneja WebSocket, caché read-through, y fallback HTTP
 */

// Detectar si estamos en Vite o Next.js
const getEnvVar = (viteVar, nextVar, fallback) => {
  // Vite usa import.meta.env
  // En Vite, import.meta está disponible directamente en módulos ES
  // Intentar acceder directamente (solo funciona en Vite)
  try {
    // Acceder a import.meta.env directamente
    // En Vite esto está disponible, en otros entornos lanzará error
    // eslint-disable-next-line no-undef
    const metaEnv = import.meta?.env;
    if (metaEnv && metaEnv[viteVar]) {
      return metaEnv[viteVar];
    }
  } catch (e) {
    // Ignorar si import.meta no está disponible (no es Vite o no es módulo ES)
  }
  
  // Next.js usa process.env
  if (typeof process !== 'undefined' && process.env) {
    return process.env[nextVar] || fallback;
  }
  return fallback;
};

const API_BASE_HTTP = getEnvVar('VITE_API_BASE_HTTP', 'NEXT_PUBLIC_API_URL', 'http://localhost:3001/api');
const API_BASE_WS = getEnvVar('VITE_API_BASE_WS', 'NEXT_PUBLIC_WS_URL', null);
// Mantener compatibilidad con VITE_API_BASE_URL
const API_BASE_URL = getEnvVar('VITE_API_BASE_URL', 'NEXT_PUBLIC_API_URL', API_BASE_HTTP);

// Versión del template de prompt (incrementar cuando cambie el prompt del sistema)
const PROMPT_TEMPLATE_VERSION = '1.0.0';

// TTL del caché en sessionStorage (30 minutos en milisegundos)
const CACHE_TTL = 30 * 60 * 1000;

/**
 * Normalizar pregunta: lowercase, trim, quitar acentos, espacios repetidos
 */
const normalizeQuestion = (question) => {
  if (!question || typeof question !== 'string') return '';
  
  return question
    .toLowerCase()
    .trim()
    .normalize('NFD') // Descomponer caracteres con acentos
    .replace(/[\u0300-\u036f]/g, '') // Eliminar diacríticos (acentos)
    .replace(/\s+/g, ' ') // Reemplazar espacios múltiples por uno solo
    .trim();
};

/**
 * Generar hash SHA-256 de una cadena
 */
const generateSHA256 = async (text) => {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback simple para entornos sin crypto.subtle
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convertir a 32bit integer
  }
  return Math.abs(hash).toString(16);
};

/**
 * Generar clave de caché: hash SHA-256 de {normalizedQuestion}|{lessonId}|{provider}|{promptTemplateVersion}
 */
const generateCacheHash = async (question, lessonContext, provider) => {
  const normalizedQuestion = normalizeQuestion(question);
  const lessonId = lessonContext?.lessonId || '';
  const cacheString = `${normalizedQuestion}|${lessonId}|${provider}|${PROMPT_TEMPLATE_VERSION}`;
  return await generateSHA256(cacheString);
};

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
 * Manejar errores HTTP con mensajes legibles en español
 */
const handleHTTPError = (response, defaultMessage = 'Error desconocido') => {
  let message = defaultMessage;
  
  switch (response.status) {
    case 401:
      message = 'Sesión expirada. Por favor, inicia sesión nuevamente.';
      break;
    case 429:
      message = 'Demasiadas solicitudes. Por favor, espera un momento antes de intentar de nuevo.';
      break;
    case 500:
      message = 'Error interno del servidor. Por favor, intenta más tarde.';
      break;
    case 502:
      message = 'Servicio temporalmente no disponible. Por favor, intenta más tarde.';
      break;
    case 503:
      message = 'Servicio en mantenimiento. Por favor, intenta más tarde.';
      break;
    case 504:
      message = 'Tiempo de espera agotado. Por favor, intenta de nuevo.';
      break;
    default:
      if (response.status >= 500) {
        message = 'Error del servidor. Por favor, intenta más tarde.';
      } else if (response.status >= 400) {
        message = 'Error en la solicitud. Por favor, verifica e intenta de nuevo.';
      }
  }
  
  return message;
};

/**
 * Obtener URL del WebSocket para el tutor
 */
export const getWSUrl = ({ lessonId, sessionId, provider }) => {
  if (!lessonId || !sessionId || !provider) {
    throw new Error('lessonId, sessionId y provider son requeridos');
  }

  // Si hay VITE_API_BASE_WS configurado, usarlo directamente
  if (API_BASE_WS) {
    const separator = API_BASE_WS.includes('?') ? '&' : '?';
    return `${API_BASE_WS}${separator}lessonId=${lessonId}&sessionId=${sessionId}&provider=${provider}`;
  }

  // Fallback: construir desde API_BASE_HTTP/API_BASE_URL o window.location
  const baseUrl = (API_BASE_HTTP || API_BASE_URL || '').replace('/api', '');
  if (baseUrl) {
    const wsProtocol = baseUrl.startsWith('https') ? 'wss:' : 'ws:';
    const wsHost = baseUrl.replace(/^https?:\/\//, '').replace(/^wss?:\/\//, '');
    return `${wsProtocol}//${wsHost}/ws/ai/tutor?lessonId=${lessonId}&sessionId=${sessionId}&provider=${provider}`;
  }
  
  // Último fallback: usar window.location
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  return `${protocol}//${host}/ws/ai/tutor?lessonId=${lessonId}&sessionId=${sessionId}&provider=${provider}`;
};

/**
 * Verificar caché (read-through): primero sessionStorage, luego backend
 */
export const checkCache = async (question, lessonContext, provider) => {
  if (!question || !lessonContext || !provider) return null;

  try {
    const hash = await generateCacheHash(question, lessonContext, provider);
    const cacheKey = `tutor_cache_${hash}`;

    // 1. Intentar sessionStorage primero (30 min TTL)
    if (typeof window !== 'undefined' && sessionStorage) {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const { answer, timestamp } = JSON.parse(cached);
          const age = Date.now() - timestamp;
          
          // Si está dentro del TTL (30 min), retornar
          if (age < CACHE_TTL) {
            return { answer, cached: true, source: 'sessionStorage' };
          }
          // Si expiró, eliminar
          sessionStorage.removeItem(cacheKey);
        } catch (e) {
          console.warn('Error parsing sessionStorage cache:', e);
        }
      }
    }

    // 2. Consultar backend
    const token = getAuthToken();
    const baseUrl = API_BASE_HTTP || API_BASE_URL;
    const response = await fetch(`${baseUrl}/ai/tutor/cache?hash=${encodeURIComponent(hash)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      const errorMessage = handleHTTPError(response, 'Error al consultar caché');
      console.warn(errorMessage);
      return null;
    }

    const data = await response.json();
    
    // El backend retorna { success: true, data: { answer, usage, timestamp } }
    if (data.success && data.data && data.data.answer) {
      // Guardar en sessionStorage para próximas consultas
      if (typeof window !== 'undefined' && sessionStorage) {
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({
            answer: data.data.answer,
            timestamp: Date.now(),
          }));
        } catch (e) {
          console.warn('Error saving to sessionStorage:', e);
        }
      }
      
      return { answer: data.data.answer, cached: true, source: 'backend' };
    }

    return null;
  } catch (error) {
    console.warn('Error checking cache:', error);
    return null;
  }
};

/**
 * Guardar respuesta en caché (backend y sessionStorage)
 */
export const putCache = async (question, lessonContext, provider, answer) => {
  if (!question || !lessonContext || !provider || !answer) return;

  try {
    const hash = await generateCacheHash(question, lessonContext, provider);
    const cacheKey = `tutor_cache_${hash}`;

    // Guardar en sessionStorage inmediatamente
    if (typeof window !== 'undefined' && sessionStorage) {
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({
          answer,
          timestamp: Date.now(),
        }));
      } catch (e) {
        console.warn('Error saving to sessionStorage:', e);
      }
    }

    // Guardar en backend
    const token = getAuthToken();
    const baseUrl = API_BASE_HTTP || API_BASE_URL;
    const response = await fetch(`${baseUrl}/ai/tutor/cache`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify({
        hash,
        question: normalizeQuestion(question),
        lessonContext: {
          lessonId: lessonContext.lessonId,
          tipoDeLeccion: lessonContext.tipoDeLeccion,
        },
        provider,
        answer,
        promptTemplateVersion: PROMPT_TEMPLATE_VERSION,
      }),
    });

    if (!response.ok) {
      const errorMessage = handleHTTPError(response, 'Error al guardar en caché');
      console.warn(errorMessage);
    }
  } catch (error) {
    console.warn('Error saving to cache:', error);
  }
};

/**
 * Completions HTTP (fallback cuando WebSocket falla)
 * Soporta SSE (Server-Sent Events) o POST con respuesta chunked
 */
export const completionsHTTP = async ({ 
  messages, 
  lessonContext, 
  provider,
  onToken,
  onEnd,
  onError,
}) => {
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    onError?.('No hay mensajes para enviar');
    return;
  }

  try {
    const token = getAuthToken();
    
    // Intentar SSE primero
    const baseUrl = API_BASE_HTTP || API_BASE_URL;
    const sseResponse = await fetch(`${baseUrl}/ai/tutor/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify({
        messages: trimHistory(messages),
        lessonContext,
        provider,
      }),
    });

    if (!sseResponse.ok) {
      const errorMessage = handleHTTPError(sseResponse, 'Error en completions HTTP');
      onError?.(errorMessage);
      return;
    }

    // Si el content-type es text/event-stream, manejar SSE
    if (sseResponse.headers.get('content-type')?.includes('text/event-stream')) {
      return handleSSE(sseResponse, onToken, onEnd, onError);
    }

    // Fallback: respuesta JSON completa o chunked
    const reader = sseResponse.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      
      // Intentar parsear JSON completo
      try {
        const jsonMatch = buffer.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[0]);
          
          if (data.error) {
            onError?.(data.error);
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
          return;
        }
      } catch (e) {
        // Continuar leyendo si no es JSON completo aún
      }

      // Si hay texto pero no JSON, tratar como chunked
      if (buffer.length > 0 && !buffer.includes('{')) {
        const chunks = buffer.split('\n');
        buffer = chunks.pop() || '';
        
        for (const chunk of chunks) {
          if (chunk.trim()) {
            fullResponse += chunk;
            onToken?.(chunk);
          }
        }
      }
    }

    // Si llegamos aquí sin JSON, usar respuesta acumulada
    if (fullResponse) {
      if (onEnd) {
        onEnd(`msg-${Date.now()}`, null, null);
      }
    } else {
      if (onError) {
        onError('No se recibió respuesta del servidor');
      }
    }
  } catch (error) {
    console.error('Error in HTTP completions:', error);
    const errorMessage = error.message || 'Error de conexión. Por favor, verifica tu conexión a internet.';
    onError?.(errorMessage);
  }
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
 * Recortar historial a las últimas 10-12 vueltas para el backend
 */
export const trimHistory = (history, maxTurns = 12) => {
  if (!history || history.length === 0) return [];
  
  // Una vuelta = mensaje usuario + mensaje asistente
  // Tomar las últimas maxTurns vueltas (maxTurns * 2 mensajes)
  const maxMessages = maxTurns * 2;
  
  if (history.length <= maxMessages) {
    return history;
  }

  return history.slice(-maxMessages);
};

/**
 * Obtener proveedores disponibles del backend
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
      // Retornar proveedores por defecto si el backend no responde
      return ['google', 'openai', 'anthropic'];
    }

    const data = await response.json();
    // El backend retorna { success: true, data: { providers, default } }
    if (data.success && data.data && data.data.providers) {
      return data.data.providers;
    }
    // Fallback si la estructura es diferente
    return data.providers || ['google', 'openai', 'anthropic'];
  } catch (error) {
    console.warn('Error getting providers:', error);
    // Retornar proveedores por defecto
    return ['google', 'openai', 'anthropic'];
  }
};

const tutorService = {
  getWSUrl,
  checkCache,
  putCache,
  completionsHTTP,
  trimHistory,
  getProviders,
  // Exportar funciones de utilidad para testing
  normalizeQuestion,
  generateCacheHash,
};

export default tutorService;
