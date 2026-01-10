import { useState, useCallback, useRef, useEffect } from 'react';
import AIServiceManager from '../../../service/ai/AIServiceManager.js';

/**
 * Hook personalizado para gestionar el chat del tutor IA
 * Maneja el estado del chat, historial, streaming por WebSocket y proveedores
 * 
 * @param {Object} lessonContext - Contexto de la lección actual
 * @param {string} lessonContext.lessonId - ID de la lección
 * @param {string} lessonContext.title - Título de la lección
 * @param {string[]} lessonContext.objectives - Objetivos de aprendizaje
 * @param {string[]} lessonContext.tags - Tags/temas de la lección
 * @param {string} lessonContext.tipoDeLeccion - Tipo de lección (teoria | caso_clinico | simulacion | evaluacion)
 * @returns {Object} Estado y funciones del hook
 */
export const useAITutor = (lessonContext) => {
  // Estados principales
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [provider, setProvider] = useState('google'); // openai | anthropic | google (mapeado internamente a gemini)
  const [error, setError] = useState(null);

  // Referencias
  const wsRef = useRef(null);
  const currentMessageRef = useRef('');
  const sessionIdRef = useRef(`session-${Date.now()}`);

  /**
   * Mapear nombre de proveedor UI a nombre interno del servicio
   */
  const mapProviderToService = useCallback((uiProvider) => {
    const mapping = {
      'openai': 'openai',
      'anthropic': 'claude',
      'google': 'gemini',
    };
    return mapping[uiProvider] || 'gemini';
  }, []);

  /**
   * Mapear nombre interno del servicio a nombre de proveedor UI
   */
  const mapServiceToProvider = useCallback((serviceProvider) => {
    const mapping = {
      'openai': 'openai',
      'claude': 'anthropic',
      'gemini': 'google',
    };
    return mapping[serviceProvider] || 'google';
  }, []);

  // Obtener instancia singleton de AIServiceManager
  const aiManagerRef = useRef(null);
  useEffect(() => {
    if (!aiManagerRef.current) {
      // AIServiceManager es una instancia singleton, no una clase
      aiManagerRef.current = AIServiceManager;
      // Cambiar al proveedor deseado si es necesario
      if (provider) {
        const serviceProvider = mapProviderToService(provider);
        aiManagerRef.current.switchModel(serviceProvider);
      }
    }
  }, [provider, mapProviderToService]);


  /**
   * Construir el contexto del sistema para el prompt
   */
  const buildSystemContext = useCallback(() => {
    if (!lessonContext) return '';

    const contextParts = [
      `Eres un tutor IA especializado en ventilación mecánica.`,
      `Lección actual: ${lessonContext.title || 'Sin título'}`,
    ];

    if (lessonContext.objectives && lessonContext.objectives.length > 0) {
      contextParts.push(`Objetivos de aprendizaje: ${lessonContext.objectives.join(', ')}`);
    }

    if (lessonContext.tags && lessonContext.tags.length > 0) {
      contextParts.push(`Temas: ${lessonContext.tags.join(', ')}`);
    }

    if (lessonContext.tipoDeLeccion) {
      const typeMap = {
        teoria: 'teoría',
        caso_clinico: 'caso clínico',
        simulacion: 'simulación',
        evaluacion: 'evaluación',
      };
      contextParts.push(`Tipo de lección: ${typeMap[lessonContext.tipoDeLeccion] || lessonContext.tipoDeLeccion}`);
    }

    return contextParts.join('\n');
  }, [lessonContext]);

  /**
   * Abrir el chat
   */
  const openChat = useCallback(() => {
    setIsOpen(true);
    setError(null);
    
    // Inicializar con mensaje de bienvenida si no hay mensajes
    setMessages(prev => {
      if (prev.length === 0) {
        const welcomeMessage = {
          id: Date.now(),
          role: 'assistant',
          content: `¡Hola! Soy tu tutor IA. Estoy aquí para ayudarte con "${lessonContext?.title || 'esta lección'}". ¿En qué puedo ayudarte?`,
          time: new Date().toISOString(),
        };
        return [welcomeMessage];
      }
      return prev;
    });
  }, [lessonContext?.title]);

  /**
   * Cerrar el chat
   */
  const closeChat = useCallback(() => {
    setIsOpen(false);
    // Cerrar WebSocket si está abierto
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsStreaming(false);
    currentMessageRef.current = '';
  }, []);

  /**
   * Toggle abrir/cerrar chat
   */
  const toggle = useCallback(() => {
    setIsOpen(prev => {
      const newValue = !prev;
      if (newValue) {
        // Si se está abriendo, inicializar con mensaje de bienvenida si no hay mensajes
        setMessages(currentMessages => {
          if (currentMessages.length === 0) {
            const welcomeMessage = {
              id: Date.now(),
              role: 'assistant',
              content: `¡Hola! Soy tu tutor IA. Estoy aquí para ayudarte con "${lessonContext?.title || 'esta lección'}". ¿En qué puedo ayudarte?`,
              time: new Date().toISOString(),
            };
            return [welcomeMessage];
          }
          return currentMessages;
        });
        setError(null);
      } else {
        // Si se está cerrando, limpiar
        if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
        }
        setIsStreaming(false);
        currentMessageRef.current = '';
      }
      return newValue;
    });
  }, [lessonContext?.title]);

  /**
   * Cancelar streaming actual
   */
  const cancelStream = useCallback(() => {
    setIsStreaming(false);
    currentMessageRef.current = '';
    // Cerrar WebSocket si está abierto
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  /**
   * Enviar mensaje (simulación con AIServiceManager)
   * Nota: En producción, esto debería usar WebSocket para streaming real
   */
  const sendMessage = useCallback(async (userMessage) => {
    if (!userMessage.trim() || isStreaming) return;

    // Agregar mensaje del usuario
    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: userMessage,
      time: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);
    setError(null);
    currentMessageRef.current = '';

    // Crear mensaje de asistente en streaming
    const assistantMsgId = Date.now() + 1;
    const assistantMsg = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      time: new Date().toISOString(),
      isStreaming: true,
    };
    setMessages(prev => [...prev, assistantMsg]);

    try {
      // Construir prompt con contexto
      const systemContext = buildSystemContext();
      const conversationHistory = messages
        .map(msg => `${msg.role === 'user' ? 'Usuario' : 'Asistente'}: ${msg.content}`)
        .join('\n');
      
      const fullPrompt = systemContext 
        ? `${systemContext}\n\nHistorial de conversación:\n${conversationHistory}\n\nUsuario: ${userMessage}\nAsistente:`
        : `${conversationHistory}\n\nUsuario: ${userMessage}\nAsistente:`;

      // Usar AIServiceManager para generar respuesta
      const serviceProvider = mapProviderToService(provider);
      const result = await aiManagerRef.current.generateResponse(fullPrompt, {
        provider: serviceProvider,
      });

      if (result.success) {
        // Simular streaming token por token
        const responseText = result.response || 'Lo siento, no pude generar una respuesta.';
        let accumulatedText = '';
        
        // Actualizar mensaje con streaming simulado
        for (let i = 0; i < responseText.length; i += 3) {
          accumulatedText = responseText.substring(0, i + 3);
          setMessages(prev => 
            prev.map(msg => 
              msg.id === assistantMsgId 
                ? { ...msg, content: accumulatedText, isStreaming: true }
                : msg
            )
          );
          // Pequeño delay para simular streaming
          await new Promise(resolve => setTimeout(resolve, 20));
        }

        // Finalizar mensaje
        setMessages(prev => 
          prev.map(msg => 
            msg.id === assistantMsgId 
              ? { ...msg, content: responseText, isStreaming: false, time: new Date().toISOString() }
              : msg
          )
        );
      } else {
        throw new Error(result.error || 'Error al generar respuesta');
      }
    } catch (err) {
      console.error('Error en sendMessage:', err);
      setError(err.message || 'Error al enviar mensaje');
      
      // Actualizar mensaje con error
      setMessages(prev => 
        prev.map(msg => 
          msg.id === assistantMsgId 
            ? { 
                ...msg, 
                content: 'Lo siento, ocurrió un error al procesar tu mensaje. Por favor, intenta de nuevo.', 
                error: err.message || 'Error al procesar mensaje',
                isStreaming: false,
                time: new Date().toISOString(),
              }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
      currentMessageRef.current = '';
    }
  }, [isStreaming, messages, buildSystemContext, provider, mapProviderToService]);

  /**
   * Cambiar proveedor de IA
   */
  const changeProvider = useCallback((newProvider) => {
    setProvider(newProvider);
    if (aiManagerRef.current) {
      const serviceProvider = mapProviderToService(newProvider);
      aiManagerRef.current.switchModel(serviceProvider);
    }
  }, [mapProviderToService]);

  /**
   * Limpiar historial de chat
   */
  const clearHistory = useCallback(() => {
    setMessages([]);
    sessionIdRef.current = `session-${Date.now()}`;
  }, []);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    // Estado
    open: isOpen, // Alias para compatibilidad
    isOpen,
    messages,
    typing: isStreaming, // Alias para compatibilidad
    isStreaming,
    provider,
    error,

    // Acciones
    toggle,
    openChat,
    closeChat,
    send: sendMessage, // Alias para compatibilidad
    sendMessage,
    setProvider: changeProvider, // Alias para compatibilidad
    changeProvider,
    clearHistory,
    cancelStream,
  };
};

export default useAITutor;

