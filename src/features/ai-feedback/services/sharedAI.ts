/**
 * =============================================================================
 * Shared AI Service
 * =============================================================================
 * 
 * Servicio compartido para comunicación con el backend de IA.
 * Usa el mismo endpoint, modelo, temperatura, top_p que TutorAI.
 * Soporta streaming (SSE) y modo no-stream.
 * 
 * Este servicio unifica las llamadas de TutorAI y Expansión de Tema con IA
 * para que ambos usen exactamente el mismo "cerebro".
 * 
 * @service
 */

import chatService from './chatService';

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
 * Opciones para sendLessonAI
 */
export interface SendLessonAIOptions {
  /**
   * Contexto de la lección en formato TutorAI
   */
  lessonContext: LessonContext;
  
  /**
   * Mensaje del usuario
   */
  user: string;
  
  /**
   * Historial de conversación (opcional)
   * Formato: Array de { role: 'user' | 'assistant', content: string }
   */
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  
  /**
   * Proveedor de IA (opcional, backend decide si no se especifica)
   */
  provider?: 'openai' | 'anthropic' | 'google';
  
  /**
   * Si true, usa streaming (default: true)
   */
  stream?: boolean;
  
  /**
   * Callback para tokens (solo si stream=true)
   */
  onToken?: (delta: string) => void;
  
  /**
   * Callback cuando termina (solo si stream=true)
   */
  onEnd?: (messageId?: string, usage?: any, suggestions?: string[] | null) => void;
  
  /**
   * Callback para errores (solo si stream=true)
   */
  onError?: (error: string, errorInfo?: any) => void;
  
  /**
   * AbortController para cancelar (opcional)
   */
  abortController?: AbortController;
}

/**
 * Enviar mensaje a IA usando el mismo endpoint y parámetros que TutorAI
 * 
 * Este método:
 * - Usa el mismo endpoint: /api/ai/chat/completions
 * - Usa el mismo modelo: del env var (AI_MODEL_OPENAI, AI_MODEL_GOOGLE, etc.)
 * - Usa los mismos parámetros: temperature: 0.7, top_p: 1.0
 * - Deja que el backend construya el system prompt desde lessonContext
 * - Soporta streaming (SSE) y modo no-stream
 * 
 * @param options - Opciones de la petición
 * @returns Promise con resultado (solo si stream=false)
 */
export const sendLessonAI = async (options: SendLessonAIOptions): Promise<any> => {
  const {
    lessonContext,
    user,
    history = [],
    provider = null,
    stream = true,
    onToken,
    onEnd,
    onError,
    abortController,
  } = options;

  // Validar que user no esté vacío
  if (!user || typeof user !== 'string' || user.trim().length === 0) {
    const error = new Error('user message is required');
    if (onError) {
      onError(error.message, { code: 'VALIDATION_ERROR' });
      return;
    }
    throw error;
  }

  // Validar que lessonContext tenga lessonId
  if (!lessonContext || !lessonContext.lessonId) {
    const error = new Error('lessonContext with lessonId is required');
    if (onError) {
      onError(error.message, { code: 'VALIDATION_ERROR' });
      return;
    }
    throw error;
  }

  // Construir historial en formato de mensajes
  // El backend espera mensajes sin system prompt (lo construye desde lessonContext)
  const historyMessages = (history || []).map(msg => ({
    role: msg.role,
    content: msg.content,
  }));

  // Agregar mensaje del usuario actual
  const messages = [
    ...historyMessages,
    {
      role: 'user' as const,
      content: user.trim(),
    },
  ];

  // Llamar a chatService.sendMessage con formato TutorAI
  // El backend construirá el system prompt desde lessonContext usando buildPromptTemplate
  // Pasamos lessonContext directamente en el context, y chatService lo convertirá al formato correcto
  return chatService.sendMessage({
    system: undefined, // El backend construirá el system prompt desde lessonContext
    developer: undefined, // No se usa en TutorAI
    user: user.trim(),
    history: historyMessages,
    // chatService detecta lessonId y construye lessonContext automáticamente
    context: {
      lessonId: lessonContext.lessonId,
      title: lessonContext.title || '',
      objectives: lessonContext.objectives || [],
      tags: lessonContext.tags || [],
      tipoDeLeccion: lessonContext.tipoDeLeccion || 'teoria',
    },
    provider: provider || undefined, // Backend decide si no se especifica
    stream,
    onToken,
    onEnd,
    onError,
    abortController,
  });
};

/**
 * Tipo para contexto de lección (formato TutorAI)
 * Este formato es el que espera el backend para construir el system prompt
 */
export interface LessonContext {
  lessonId: string;
  title?: string;
  objectives?: string[];
  tags?: string[];
  tipoDeLeccion?: 'teoria' | 'caso_clinico' | 'simulacion' | 'evaluacion';
}

// Exportar por defecto
export default {
  sendLessonAI,
};

