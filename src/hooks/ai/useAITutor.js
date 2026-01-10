import { useState, useEffect, useCallback, useRef } from 'react';
import tutorService from '../../service/ai/tutorService';
import chatService from '../../services/ai/chatService';

/**
 * Generar UUID v4
 */
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback para navegadores sin crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Hook useAITutor - Orquesta estado y efectos del tutor IA
 * 
 * @param {Object} lessonContext - Contexto de la lección
 * @param {string} lessonContext.lessonId - ID de la lección
 * @param {string} lessonContext.title - Título de la lección
 * @param {string[]} lessonContext.objectives - Objetivos de aprendizaje
 * @param {string[]} lessonContext.tags - Tags/temas
 * @param {string} lessonContext.tipoDeLeccion - Tipo de lección
 * 
 * @returns {Object} API del hook
 */
export const useAITutor = (lessonContext) => {
  const lessonId = lessonContext?.lessonId;

  // Estados principales
  const [open, setOpen] = useState(false);
  const [provider, setProviderState] = useState('google'); // google | openai | anthropic
  const [messages, setMessages] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  // Referencias
  const wsRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const currentAssistantMessageIdRef = useRef(null);
  const fullHistoryRef = useRef([]); // Historial completo en cliente

  /**
   * Inicializar sesión al montar
   */
  useEffect(() => {
    if (!lessonId) return;

    // Intentar recuperar sesión existente
    const lastSessionKey = `aiTutor:${lessonId}:lastSession`;
    const lastSessionData = localStorage.getItem(lastSessionKey);
    
    let newSessionId = generateUUID();
    let shouldLoadHistory = false;

    if (lastSessionData) {
      try {
        const { sessionId: lastSessionId, timestamp } = JSON.parse(lastSessionData);
        const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;
        
        // Reusar sesión si no han pasado 6 horas
        if (timestamp > sixHoursAgo) {
          newSessionId = lastSessionId;
          shouldLoadHistory = true;
        }
      } catch (error) {
        console.warn('Error parsing last session data:', error);
      }
    }

    setSessionId(newSessionId);

    // Guardar referencia de última sesión
    localStorage.setItem(lastSessionKey, JSON.stringify({
      sessionId: newSessionId,
      timestamp: Date.now(),
    }));

    // Cargar historial si reusamos sesión
    if (shouldLoadHistory) {
      loadHistoryFromStorage(newSessionId);
    }
  }, [lessonId]);

  /**
   * Cargar historial desde localStorage
   */
  const loadHistoryFromStorage = useCallback((sessionIdToLoad) => {
    if (!lessonId || !sessionIdToLoad) return;

    const storageKey = `aiTutor:${lessonId}:${sessionIdToLoad}`;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const { messages: storedMessages, suggestions: storedSuggestions } = JSON.parse(stored);
        setMessages(storedMessages || []);
        fullHistoryRef.current = storedMessages || [];
        setSuggestions(storedSuggestions || []);
      }
    } catch (error) {
      console.warn('Error loading history from storage:', error);
    }
  }, [lessonId]);

  /**
   * Guardar historial en localStorage
   */
  const saveHistoryToStorage = useCallback((messagesToSave, suggestionsToSave) => {
    if (!lessonId || !sessionId) return;

    const storageKey = `aiTutor:${lessonId}:${sessionId}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        messages: messagesToSave,
        suggestions: suggestionsToSave,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.warn('Error saving history to storage:', error);
      // Si localStorage está lleno, limpiar sesiones antiguas
      cleanupOldSessions();
    }
  }, [lessonId, sessionId]);

  /**
   * Limpiar sesiones antiguas de localStorage
   */
  const cleanupOldSessions = useCallback(() => {
    try {
      const keys = Object.keys(localStorage);
      const tutorKeys = keys.filter(k => k.startsWith('aiTutor:'));
      
      // Ordenar por timestamp y eliminar las más antiguas
      const sessions = tutorKeys.map(key => {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          return { key, timestamp: data.timestamp || 0 };
        } catch {
          return { key, timestamp: 0 };
        }
      }).sort((a, b) => a.timestamp - b.timestamp);

      // Eliminar la mitad más antigua
      const toRemove = Math.floor(sessions.length / 2);
      for (let i = 0; i < toRemove; i++) {
        localStorage.removeItem(sessions[i].key);
      }
    } catch (error) {
      console.warn('Error cleaning up old sessions:', error);
    }
  }, []);

  /**
   * Guardar historial cuando cambia
   */
  useEffect(() => {
    if (messages.length > 0 || suggestions.length > 0) {
      saveHistoryToStorage(messages, suggestions);
    }
  }, [messages, suggestions, saveHistoryToStorage]);

  /**
   * Toggle abrir/cerrar chat
   */
  const toggle = useCallback(() => {
    setOpen(prev => !prev);
  }, []);

  /**
   * Cambiar proveedor
   */
  const setProvider = useCallback((newProvider) => {
    setProviderState(newProvider);
    // Cerrar WebSocket si está abierto
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  /**
   * Conectar WebSocket
   */
  const connectWebSocket = useCallback(() => {
    if (!lessonId || !sessionId || !provider) return null;

    try {
      const wsUrl = tutorService.getWSUrl({ lessonId, sessionId, provider });
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[AITutor] WebSocket conectado');
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('[AITutor] Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[AITutor] WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('[AITutor] WebSocket cerrado');
        wsRef.current = null;
      };

      return ws;
    } catch (error) {
      console.error('[AITutor] Error creating WebSocket:', error);
      return null;
    }
  }, [lessonId, sessionId, provider]);

  /**
   * Manejar mensajes del WebSocket
   */
  const handleWebSocketMessage = useCallback((data) => {
    switch (data.type) {
      case 'start':
        setTyping(true);
        setSending(false);
        // Crear mensaje de asistente vacío
        const assistantMsgId = `msg-${Date.now()}`;
        currentAssistantMessageIdRef.current = assistantMsgId;
        setMessages(prev => [...prev, {
          id: assistantMsgId,
          role: 'assistant',
          content: '',
          time: new Date().toISOString(),
        }]);
        fullHistoryRef.current = [...fullHistoryRef.current, {
          id: assistantMsgId,
          role: 'assistant',
          content: '',
          time: new Date().toISOString(),
        }];
        break;

      case 'token':
        if (currentAssistantMessageIdRef.current) {
          setMessages(prev => 
            prev.map(msg => 
              msg.id === currentAssistantMessageIdRef.current
                ? { ...msg, content: msg.content + (data.delta || '') }
                : msg
            )
          );
          // Actualizar historial completo
          const msgIndex = fullHistoryRef.current.findIndex(
            m => m.id === currentAssistantMessageIdRef.current
          );
          if (msgIndex >= 0) {
            fullHistoryRef.current[msgIndex].content += (data.delta || '');
          }
        }
        break;

      case 'end':
        setTyping(false);
        if (currentAssistantMessageIdRef.current) {
          setMessages(prev => 
            prev.map(msg => 
              msg.id === currentAssistantMessageIdRef.current
                ? { ...msg, time: new Date().toISOString() }
                : msg
            )
          );
        }
        // Guardar en caché
        if (data.messageId && data.usage) {
          const lastUserMessage = messages[messages.length - 2];
          if (lastUserMessage && lastUserMessage.role === 'user') {
            tutorService.putCache(
              lastUserMessage.content,
              lessonContext,
              provider,
              messages.find(m => m.id === currentAssistantMessageIdRef.current)?.content || '',
              data.usage
            );
          }
        }
        // Actualizar sugerencias
        if (data.suggestions && Array.isArray(data.suggestions)) {
          setSuggestions(prev => mergeSuggestions(prev, data.suggestions));
        }
        currentAssistantMessageIdRef.current = null;
        break;

      case 'suggestions':
        if (data.items && Array.isArray(data.items)) {
          setSuggestions(prev => mergeSuggestions(prev, data.items));
        }
        break;

      case 'error':
        setTyping(false);
        setSending(false);
        if (currentAssistantMessageIdRef.current) {
          setMessages(prev => 
            prev.map(msg => 
              msg.id === currentAssistantMessageIdRef.current
                ? { 
                    ...msg, 
                    error: data.message || 'Error desconocido',
                    time: new Date().toISOString(),
                  }
                : msg
            )
          );
        }
        currentAssistantMessageIdRef.current = null;
        break;
    }
  }, [messages, lessonContext, provider]);

  /**
   * Fusionar sugerencias sin duplicados
   */
  const mergeSuggestions = useCallback((local, backend) => {
    const combined = [...local, ...backend];
    const unique = Array.from(new Set(combined.map(s => s.toLowerCase().trim())))
      .map(uniqueText => {
        return combined.find(s => s.toLowerCase().trim() === uniqueText);
      });
    return unique;
  }, []);

  /**
   * Enviar mensaje
   */
  const send = useCallback(async (text) => {
    if (!text.trim() || sending || typing || !lessonId || !sessionId) return;

    // Agregar mensaje del usuario
    const userMsg = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      time: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    fullHistoryRef.current = [...fullHistoryRef.current, userMsg];

    // Verificar caché primero
    const cachedResponse = await tutorService.checkCache(text, lessonContext, provider);
    if (cachedResponse) {
      // Respuesta instantánea desde caché
      setMessages(prev => [...prev, {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: cachedResponse.response,
        time: new Date().toISOString(),
      }]);
      fullHistoryRef.current = [...fullHistoryRef.current, {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: cachedResponse.response,
        time: new Date().toISOString(),
      }];
      return;
    }

    // Proceder con WebSocket
    setSending(true);

    // Intentar conectar WebSocket
    let ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      ws = connectWebSocket();
      if (ws) {
        wsRef.current = ws;
        // Esperar a que se abra
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('WebSocket timeout')), 5000);
          ws.onopen = () => {
            clearTimeout(timeout);
            resolve();
          };
          ws.onerror = (error) => {
            clearTimeout(timeout);
            reject(error);
          };
        });
      }
    }

    // Enviar mensaje por WebSocket
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({
          type: 'user_message',
          text: text.trim(),
          lessonContext,
          provider,
        }));
      } catch (error) {
        console.error('[AITutor] Error sending WebSocket message:', error);
        // Reintentar una vez
        await handleWebSocketRetry(text);
      }
    } else {
      // WebSocket no disponible, usar HTTP fallback
      await handleHTTPFallback(text);
    }
  }, [sending, typing, lessonId, sessionId, lessonContext, provider, connectWebSocket]);

  /**
   * Reintentar WebSocket una vez
   */
  const handleWebSocketRetry = useCallback(async (text) => {
    if (reconnectAttemptsRef.current >= 1) {
      // Ya se reintentó, usar HTTP fallback
      await handleHTTPFallback(text);
      return;
    }

    reconnectAttemptsRef.current++;
    
    // Cerrar conexión anterior
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Intentar reconectar
    const ws = connectWebSocket();
    if (ws) {
      wsRef.current = ws;
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('WebSocket retry timeout')), 5000);
        ws.onopen = () => {
          clearTimeout(timeout);
          resolve();
        };
        ws.onerror = (error) => {
          clearTimeout(timeout);
          reject(error);
        };
      });

      // Reenviar mensaje
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'user_message',
          text: text.trim(),
          lessonContext,
          provider,
        }));
      }
    } else {
      // Fallback a HTTP
      await handleHTTPFallback(text);
    }
  }, [connectWebSocket, lessonContext, provider]);

  /**
   * Fallback a HTTP cuando WebSocket falla
   * Usa chatService unificado
   */
  const handleHTTPFallback = useCallback(async (text) => {
    setTyping(true);
    setSending(false);

    const assistantMsgId = `msg-${Date.now()}`;
    currentAssistantMessageIdRef.current = assistantMsgId;

    setMessages(prev => [...prev, {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      time: new Date().toISOString(),
    }]);

    // Construir historial en formato de mensajes
    const historyMessages = chatService.trimHistory(fullHistoryRef.current).map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    try {
      await chatService.sendMessage({
        system: undefined, // El backend construirá el system prompt desde el contexto
        user: text,
        history: historyMessages,
        context: {
          lessonId: lessonContext.lessonId,
          title: lessonContext.title,
          objectives: lessonContext.objectives,
          tags: lessonContext.tags,
          tipoDeLeccion: lessonContext.tipoDeLeccion,
        },
        provider,
        stream: true,
        onToken: (delta) => {
          setMessages(prev => 
            prev.map(msg => 
              msg.id === assistantMsgId
                ? { ...msg, content: msg.content + delta }
                : msg
            )
          );
        },
        onEnd: (messageId, usage, backendSuggestions) => {
          setTyping(false);
          setMessages(prev => 
            prev.map(msg => 
              msg.id === assistantMsgId
                ? { ...msg, time: new Date().toISOString() }
                : msg
            )
          );
          // Guardar en caché
          tutorService.putCache(text, lessonContext, provider, 
            messages.find(m => m.id === assistantMsgId)?.content || '', usage);
          // Actualizar sugerencias
          if (backendSuggestions) {
            setSuggestions(prev => mergeSuggestions(prev, backendSuggestions));
          }
          currentAssistantMessageIdRef.current = null;
        },
        onError: (error) => {
          setTyping(false);
          setSending(false);
          setMessages(prev => 
            prev.map(msg => 
              msg.id === assistantMsgId
                ? { ...msg, error: error, time: new Date().toISOString() }
                : msg
            )
          );
          currentAssistantMessageIdRef.current = null;
        },
      });
    } catch (error) {
      setTyping(false);
      setSending(false);
      setMessages(prev => 
        prev.map(msg => 
          msg.id === assistantMsgId
            ? { ...msg, error: error.message || 'Error desconocido', time: new Date().toISOString() }
            : msg
        )
      );
      currentAssistantMessageIdRef.current = null;
    }
  }, [lessonContext, provider, messages, mergeSuggestions]);

  /**
   * Seleccionar sugerencia
   */
  const pickSuggestion = useCallback((suggestion) => {
    send(suggestion);
  }, [send]);

  /**
   * Cancelar stream en curso
   */
  const cancelStream = useCallback(() => {
    // Enviar mensaje de cancelación al WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ type: 'cancel' }));
      } catch (error) {
        console.error('[AITutor] Error sending cancel message:', error);
      }
    }

    // Detener el indicador de typing
    setTyping(false);
    setSending(false);

    // Marcar el mensaje actual como cancelado si existe
    if (currentAssistantMessageIdRef.current) {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === currentAssistantMessageIdRef.current
            ? {
                ...msg,
                content: msg.content || 'Respuesta cancelada por el usuario.',
                time: new Date().toISOString(),
              }
            : msg
        )
      );
      currentAssistantMessageIdRef.current = null;
    }
  }, []);

  /**
   * Limpiar historial
   */
  const clear = useCallback(() => {
    setMessages([]);
    setSuggestions([]);
    fullHistoryRef.current = [];
    currentAssistantMessageIdRef.current = null;
    
    // Limpiar localStorage
    if (lessonId && sessionId) {
      const storageKey = `aiTutor:${lessonId}:${sessionId}`;
      localStorage.removeItem(storageKey);
    }

    // Cerrar WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, [lessonId, sessionId]);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    open,
    toggle,
    provider,
    setProvider,
    messages,
    suggestions,
    sending,
    typing,
    send,
    pickSuggestion,
    clear,
    cancelStream,
    sessionId,
  };
};

export default useAITutor;

