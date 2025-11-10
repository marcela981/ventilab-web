/**
 * =============================================================================
 * AI Topic Expander Component
 * =============================================================================
 * 
 * Componente para expandir temas con IA. Soporta dos variantes: botón y acordeón.
 * Incluye manejo de estados, telemetría, accesibilidad y fallback offline.
 * 
 * @component
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Button,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  Link,
  IconButton,
  Stack,
  List,
  ListItem,
  ListItemText,
  Tooltip,
  Collapse,
} from '@mui/material';
import {
  AutoAwesome as SparklesIcon,
  Lightbulb as LightbulbIcon,
  Close as CloseIcon,
  Stop as StopIcon,
  ExpandMore as ExpandMoreIcon,
  OpenInNew as OpenInNewIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { sendLessonAI } from '../../../../services/ai/sharedAI';
import { buildLessonContext, toTutorAILessonContext } from '../../../../services/ai/contextBuilder';
import {
  trackExpandClick,
  trackOpenMode,
  trackExpandRequest,
  trackExpandSuccess,
  trackExpandError,
  trackOfflineFallback,
  trackSuggestionView,
  trackSuggestionClick,
  trackSuggestionsRefresh,
} from '../../../../telemetry/aiTopicExpander';
import { useTranslation } from 'react-i18next';
import { useQuestionSuggestions } from '../../../../hooks/useQuestionSuggestions';
import { normalizeText } from '../../../../utils/suggestions.es';

/**
 * Calcular topic desde el contexto usando títulos reales
 * Formato: "moduleTitle → lessonTitle → pageTitle" omitiendo niveles vacíos
 */
const calculateTopic = (context) => {
  // Construir topic desde módulo, lección y página
  const topicParts = [
    context.moduleTitle,
    context.lessonTitle,
    context.sectionTitle || context.pageTitle,
  ].filter(Boolean);
  
  if (topicParts.length === 0) {
    return 'este tema';
  }
  
  const topic = topicParts.join(' → ');
  
  // Limitar longitud del topic a 200 caracteres
  return topic.length > 200 ? topic.substring(0, 200) + '...' : topic;
};



/**
 * Componente principal AITopicExpander
 */
const AITopicExpander = ({
  context,
  variant = 'button',
  enabled = true,
}) => {
  const theme = useTheme();
  const { t, i18n } = useTranslation('ai');
  const locale = context?.locale || 'es';
  
  // Sincronizar idioma de i18n con el locale del contexto
  useEffect(() => {
    if (locale && i18n.language !== locale) {
      i18n.changeLanguage(locale).catch(err => {
        console.warn('[AITopicExpander] Error changing language:', err);
      });
    }
  }, [locale, i18n]);
  
  // Estados
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [messageId, setMessageId] = useState(null);
  const [response, setResponse] = useState(null);
  const [controller, setController] = useState(null);
  const [debouncedInput, setDebouncedInput] = useState('');
  const [hasPrefilled, setHasPrefilled] = useState(false);
  const [userMessage, setUserMessage] = useState(null); // Mensaje del usuario enviado
  const [chatHistory, setChatHistory] = useState([]); // Historial del chat
  const [threadId, setThreadId] = useState(null); // ID del hilo para persistencia
  
  const inputRef = useRef(null);
  const buttonRef = useRef(null);
  const resultAreaRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const panelId = 'ai-topic-expander-panel';
  const resultId = 'ai-topic-expander-result';
  
  // Generar threadId determinístico: ai:thread:${moduleId}:${lessonId}:${pageId}
  const calculatedThreadId = useMemo(() => {
    const pageId = context.sectionId || context.pageId || 'default';
    const moduleId = context.moduleId || 'default';
    const lessonId = context.lessonId || 'default';
    return `ai:thread:${moduleId}:${lessonId}:${pageId}`;
  }, [context.moduleId, context.lessonId, context.sectionId, context.pageId]);
  
  // Cargar historial desde localStorage al montar
  useEffect(() => {
    if (calculatedThreadId) {
      setThreadId(calculatedThreadId);
      try {
        const stored = localStorage.getItem(`aiExpansion:${calculatedThreadId}`);
        if (stored) {
          const { history } = JSON.parse(stored);
          setChatHistory(history || []);
        }
      } catch (error) {
        console.warn('[AITopicExpander] Error loading history:', error);
      }
    }
  }, [calculatedThreadId]);
  
  // Guardar historial en localStorage cuando cambia
  useEffect(() => {
    if (threadId && chatHistory.length > 0) {
      try {
        localStorage.setItem(`aiExpansion:${threadId}`, JSON.stringify({
          history: chatHistory,
          timestamp: Date.now(),
        }));
      } catch (error) {
        console.warn('[AITopicExpander] Error saving history:', error);
      }
    }
  }, [threadId, chatHistory]);
  
  // Validar que context esté presente
  if (!context) {
    console.warn('[AITopicExpander] context prop is required');
    return null;
  }

  // Generar texto prellenado usando títulos reales calculados en runtime
  // Formato: "Bríndame más información sobre {moduleTitle} → {lessonTitle} → {pageTitle}"
  const prefilledText = useMemo(() => {
    const topicParts = [
      context.moduleTitle,
      context.lessonTitle,
      context.sectionTitle || context.pageTitle,
    ].filter(Boolean);
    
    if (topicParts.length === 0) {
      return i18n.language === 'en' 
        ? 'Give me more information about this topic'
        : 'Bríndame más información sobre este tema';
    }
    
    const topicString = topicParts.join(' → ');
    return i18n.language === 'en' 
      ? `Give me more information about ${topicString}`
      : `Bríndame más información sobre ${topicString}`;
  }, [context.moduleTitle, context.lessonTitle, context.sectionTitle, context.pageTitle, i18n.language]);

  // Usar hook de sugerencias
  // Nota: el bank de metadata se puede pasar si está disponible en el contexto
  const {
    suggestions: currentSuggestions,
    rankedSuggestions: allSuggestions,
    refresh: refreshSuggestions,
    rerank: rerankSuggestions,
    reset: resetSuggestions,
    candidateBank,
  } = useQuestionSuggestions({
    context,
    initialSeed: prefilledText,
    bank: null, // Se puede pasar desde props o contexto si está disponible
  });

  // Debounce del input (250ms) para re-puntuar sugerencias
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedInput(input);
      // Re-rankear sugerencias con el nuevo input
      rerankSuggestions(input);
    }, 250);
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [input, rerankSuggestions]);

  // Pre-llenar input cuando se abre el panel (solo una vez)
  useEffect(() => {
    if (open && !hasPrefilled) {
      setInput(prefilledText);
      setHasPrefilled(true);
      setDebouncedInput(prefilledText);
      // Inicializar rerank con el texto prellenado
      rerankSuggestions(prefilledText);
      
      // Focus en el input después de un pequeño delay
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    } else if (!open) {
      // Resetear flags cuando se cierra el panel
      setHasPrefilled(false);
      setDebouncedInput('');
      resetSuggestions();
    }
  }, [open, prefilledText, hasPrefilled, rerankSuggestions, resetSuggestions]);

  // Trackear visualización de sugerencias al abrir el panel
  useEffect(() => {
    if (open && candidateBank && candidateBank.length > 0) {
      trackSuggestionView({
        moduleId: context.moduleId,
        lessonId: context.lessonId,
        sectionId: context.sectionId,
        suggestionsCount: candidateBank.length,
      });
    }
  }, [open, candidateBank, context]);

  // Manejar tecla Escape para cerrar
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && open) {
        handleClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [open]);

  // Manejar apertura del panel
  const handleOpen = useCallback(() => {
    // Trackear evento antes de abrir
    trackExpandClick({
      moduleId: context.moduleId,
      lessonId: context.lessonId,
      sectionId: context.sectionId,
      pageType: context.pageType,
      sectionType: context.sectionType,
    });
    
    trackOpenMode(variant, {
      moduleId: context.moduleId,
      lessonId: context.lessonId,
      sectionId: context.sectionId,
    });
    
    setOpen(true);
    setError(null);
    setResponse(null);
    setMessageId(null);
  }, [variant, context]);

  // Manejar cierre del panel
  const handleClose = useCallback(() => {
    // Cancelar petición en curso si existe
    if (controller) {
      controller.abort();
      setController(null);
    }
    
    // Limpiar debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    setOpen(false);
    setLoading(false);
    setError(null);
    // NO limpiar response ni chatHistory - se mantienen para mostrar historial
    setMessageId(null);
    // NO limpiar input completamente - mantener para continuar conversación
    setDebouncedInput('');
    setUserMessage(null);
    setHasPrefilled(false);
    resetSuggestions();
    
    // Devolver foco al botón
    setTimeout(() => {
      if (buttonRef.current) {
        buttonRef.current.focus();
      }
    }, 100);
  }, [controller, resetSuggestions]);
  
  // Manejar rotación de sugerencias (refresh)
  const handleRotateSuggestions = useCallback(() => {
    refreshSuggestions();
    
    // Trackear refresh de sugerencias
    trackSuggestionsRefresh({
      moduleId: context.moduleId,
      lessonId: context.lessonId,
      sectionId: context.sectionId,
      suggestionsRefreshIndex: 0, // El hook maneja el índice interno
      suggestionsCount: candidateBank?.length || 0,
    });
  }, [refreshSuggestions, candidateBank, context]);

  // Manejar detener generación
  const handleStop = useCallback(() => {
    if (controller) {
      controller.abort();
      setController(null);
      setLoading(false);
    }
  }, [controller]);

  // Construir system prompt (mismo que usa expandTopic.service.ts)
  // Construir system prompt usando el servicio centralizado
  // Nota: Este prompt se construye después de obtener el contexto de la lección
  // Se usa en handleSubmit después de buildLessonContext

  // Función interna para enviar mensaje (reutilizable desde handleSubmit y handleSuggestionClick)
  const handleSubmitInternal = useCallback(async (userInputText) => {
    if (loading) return;

    const userInput = (userInputText || input.trim()) || null;
    if (!userInput) return;

    const abortController = new AbortController();
    setController(abortController);
    setLoading(true);
    setError(null);
    setResponse(null);
    setUserMessage(userInput);
    const currentMessageId = `msg-${Date.now()}`;
    setMessageId(currentMessageId);
    
    // Agregar mensaje del usuario al historial
    const userMsg = {
      role: 'user',
      content: userInput,
    };
    setChatHistory(prev => [...prev, userMsg]);
    
    // Trackear solicitud
    trackExpandRequest({
      moduleId: context.moduleId,
      lessonId: context.lessonId,
      sectionId: context.sectionId,
      pageType: context.pageType,
      sectionType: context.sectionType,
      hasUserSelection: !!context.selectionText || !!context.userSelection,
      hasVisibleTextBlock: !!context.visibleText || !!context.visibleTextBlock,
    });

    try {
      // Construir contexto enriquecido de la lección/página
      const pageIdentifier = context.sectionId || context.pageId || null;
      let lessonContextPayload;

      if (!context.lessonId) {
        console.warn('[AITopicExpander] lessonId no disponible; usando contexto mínimo.');
        lessonContextPayload = {
          module: context.moduleTitle
            ? {
                id: context.moduleId || null,
                title: context.moduleTitle,
                level: null,
                objectives: [],
              }
            : null,
          lesson: {
            id: context.lessonId || null,
            title: context.lessonTitle || context.sectionTitle || 'Lección sin título',
            description: null,
            tags: [],
          },
          page: context.sectionTitle
            ? {
                id: pageIdentifier,
                title: context.sectionTitle,
                type: context.sectionType || context.pageType || null,
              }
            : null,
          learningObjectives: [],
          keyPoints: [],
          pageTextChunk: '',
        };
      } else {
        try {
          lessonContextPayload = await buildLessonContext({
            moduleId: context.moduleId || null,
            lessonId: context.lessonId,
            pageId: pageIdentifier,
          });
        } catch (builderError) {
          console.warn('[AITopicExpander] Error construyendo contexto de la lección:', builderError);
          lessonContextPayload = {
            module: context.moduleTitle
              ? {
                  id: context.moduleId || null,
                  title: context.moduleTitle,
                  level: null,
                  objectives: [],
                }
              : null,
            lesson: {
              id: context.lessonId,
              title: context.lessonTitle || 'Lección sin título',
              description: null,
              tags: [],
            },
            page: context.sectionTitle
              ? {
                  id: pageIdentifier,
                  title: context.sectionTitle,
                  type: context.sectionType || context.pageType || null,
                }
              : null,
            learningObjectives: [],
            keyPoints: [],
            pageTextChunk: '',
          };
        }

        if (!pageIdentifier) {
          console.warn('[AITopicExpander] pageId/sectionId no disponible; contexto se construyó sin página específica.');
        }
      }

      // Convertir a formato TutorAI
      const tutorAIContext = toTutorAILessonContext(lessonContextPayload);
      
      // Construir historial en formato de mensajes para el backend
      const historyMessages = chatHistory.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      // Llamar al servicio compartido con streaming
      let fullResponse = '';
      let assistantMessageId = null;
      
      await sendLessonAI({
        lessonContext: tutorAIContext,
        user: userInput,
        history: historyMessages,
        provider: null, // Backend decide
        stream: true,
        onToken: (delta) => {
          fullResponse += delta;
          // Actualizar respuesta en tiempo real
          setResponse(prev => {
            // Si no hay respuesta previa, crear estructura básica
            if (!prev) {
              return {
                expandedExplanation: delta,
                keyPoints: [],
                deeperDive: [],
                suggestedReferences: [],
                internalLinks: [],
                citations: [],
              };
            }
            // Actualizar explicación expandida
            return {
              ...prev,
              expandedExplanation: (prev.expandedExplanation || '') + delta,
            };
          });
        },
        onEnd: (messageId, usage, suggestions) => {
          setLoading(false);
          setController(null);
          assistantMessageId = messageId;
          
          // Agregar respuesta del asistente al historial
          setChatHistory(prev => [...prev, {
            role: 'assistant',
            content: fullResponse,
          }]);
          
          // Parsear respuesta si es JSON (el backend puede devolver JSON estructurado)
          try {
            const parsed = JSON.parse(fullResponse);
            setResponse({
              expandedExplanation: parsed.expandedExplanation || fullResponse,
              keyPoints: parsed.keyPoints || [],
              deeperDive: parsed.furtherReading || [],
              suggestedReferences: parsed.furtherReading || [],
              internalLinks: parsed.internalLinks || [],
              citations: parsed.citations || [],
            });
          } catch (parseError) {
            // Si no es JSON, usar respuesta completa como texto
            setResponse(prev => ({
              ...prev,
              expandedExplanation: fullResponse,
            }));
          }
          
          // Scroll al final del chat cuando llega la respuesta
          setTimeout(() => {
            if (resultAreaRef.current) {
              resultAreaRef.current.scrollTop = resultAreaRef.current.scrollHeight;
            }
          }, 100);
          
          trackExpandSuccess({
            moduleId: context.moduleId,
            lessonId: context.lessonId,
            sectionId: context.sectionId,
            requestDuration: 0,
          });
        },
        onError: (errorMessage, errorInfo) => {
          setLoading(false);
          setController(null);
          
          const errorCode = errorInfo?.code || 'UNKNOWN_ERROR';
          const errorStatus = errorInfo?.status;
          
          setError({
            code: errorCode,
            message: errorMessage || t('topicExpander.panel.tryAgain'),
            status: errorStatus,
          });
          
          // Scroll para mostrar el error
          setTimeout(() => {
            if (resultAreaRef.current) {
              resultAreaRef.current.scrollTop = resultAreaRef.current.scrollHeight;
            }
          }, 100);
          
          trackExpandError({
            moduleId: context.moduleId,
            lessonId: context.lessonId,
            sectionId: context.sectionId,
            errorCode: errorCode,
            errorStatus: errorStatus,
          });
        },
        abortController,
      });

      // Verificar si fue abortado
      if (abortController.signal.aborted) {
        return;
      }
    } catch (err) {
      console.error('[AITopicExpander] Error completo:', err);
      
      // Verificar si fue abortado
      if (abortController.signal.aborted) {
        return;
      }
      
      // Extraer código y mensaje del error
      const errorCode = err.code || (err.status >= 400 ? `HTTP_${err.status}` : 'UNKNOWN_ERROR');
      const errorStatus = err.status || (err.code?.startsWith('HTTP_') ? parseInt(err.code.replace('HTTP_', '')) : undefined);
      const errorMessage = err.message || t('topicExpander.panel.tryAgain');
      
      setError({
        code: errorCode,
        message: errorMessage,
        status: errorStatus,
      });
      
      trackExpandError({
        moduleId: context.moduleId,
        lessonId: context.lessonId,
        sectionId: context.sectionId,
        errorCode: errorCode,
        errorStatus: errorStatus,
      });
    } finally {
      setLoading(false);
      setController(null);
    }
  }, [loading, input, context, t, chatHistory]);

  // Manejar click en sugerencia - copiar al input y enviar automáticamente
  const handleSuggestionClick = useCallback((suggestion) => {
    const suggestionText = normalizeText(suggestion.text);
    setInput(suggestionText);
    setDebouncedInput(suggestionText);
    
    // Trackear click en sugerencia
    trackSuggestionClick({
      moduleId: context.moduleId,
      lessonId: context.lessonId,
      sectionId: context.sectionId,
      suggestionId: suggestion.id,
      suggestionLength: suggestionText.length,
    });
    
    // Enviar automáticamente después de un pequeño delay
    setTimeout(() => {
      handleSubmitInternal(suggestionText);
    }, 100);
  }, [context, handleSubmitInternal]);

  // Manejar teclado en sugerencias (Enter/Espacio)
  const handleSuggestionKeyDown = useCallback((e, suggestion) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSuggestionClick(suggestion);
    }
  }, [handleSuggestionClick]);

  // Manejar envío de pregunta
  const handleSubmit = useCallback(async () => {
    await handleSubmitInternal();
  }, [handleSubmitInternal]);

  // Renderizar resultados (diseño compacto para chat)
  const renderResults = () => {
    if (!response) return null;

    // Asegurar que expandedExplanation existe y no está vacío
    if (!response.expandedExplanation || response.expandedExplanation.trim().length === 0) {
      return (
          <Typography variant="body2" sx={{ color: '#a0a0a0', fontStyle: 'italic' }}>
            {t('topicExpander.results.noResults')}
          </Typography>
      );
    }

    return (
      <Box
        id={resultId}
        role="region"
        aria-live="polite"
        aria-atomic="true"
        sx={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          color: '#1a1a1a',
        }}
      >
        {/* Explicación */}
        {response.expandedExplanation && (
          <Box>
            <Typography variant="subtitle2" sx={{ color: '#0BBAF4', fontWeight: 600, mb: 1 }}>
              {t('topicExpander.results.expandedExplanation')}
            </Typography>
            <Box sx={{ color: '#e0e0e0', lineHeight: 1.7, fontSize: '0.95rem', '& p': { color: '#e0e0e0' }, '& strong': { color: '#ffffff' } }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {response.expandedExplanation}
              </ReactMarkdown>
            </Box>
          </Box>
        )}

        {/* Puntos Clave */}
        {response.keyPoints && response.keyPoints.length > 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ color: '#0BBAF4', fontWeight: 600, mb: 1 }}>
              {t('topicExpander.results.keyPoints')}
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2, listStyle: 'none' }}>
              {response.keyPoints.map((point, index) => (
                <Box key={index} component="li" sx={{ mb: 1, position: 'relative', pl: 1.5 }}>
                  <Box
                    component="span"
                    sx={{
                      position: 'absolute',
                      left: 0,
                      top: '0.5em',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: '#0BBAF4',
                    }}
                  />
                  <Box sx={{ color: '#e0e0e0', lineHeight: 1.6, fontSize: '0.9rem', '& p': { color: '#e0e0e0' } }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {point}
                    </ReactMarkdown>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Para profundizar */}
        {response.deeperDive && response.deeperDive.length > 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ color: '#0BBAF4', fontWeight: 600, mb: 1 }}>
              {t('topicExpander.results.deeperDive')}
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2, listStyle: 'none' }}>
              {response.deeperDive.map((item, index) => (
                <Box key={index} component="li" sx={{ mb: 1, position: 'relative', pl: 1.5 }}>
                  <Box
                    component="span"
                    sx={{
                      position: 'absolute',
                      left: 0,
                      top: '0.5em',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: '#0BBAF4',
                    }}
                  />
                  <Box sx={{ color: '#1a1a1a', lineHeight: 1.6, fontSize: '0.9rem' }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {item}
                    </ReactMarkdown>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Referencias sugeridas */}
        {response.suggestedReferences && response.suggestedReferences.length > 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ color: '#0BBAF4', fontWeight: 600, mb: 1 }}>
              {t('topicExpander.results.suggestedReferences')}
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2 }}>
              {response.suggestedReferences.map((ref, index) => (
                <Box key={index} component="li" sx={{ mb: 0.5 }}>
                  <Typography sx={{ color: '#e0e0e0', fontSize: '0.9rem' }}>
                    {typeof ref === 'string' ? ref : ref.title || ref}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Enlaces internos */}
        {response.internalLinks && response.internalLinks.length > 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ color: '#0BBAF4', fontWeight: 600, mb: 1 }}>
              {t('topicExpander.results.internalLinks')}
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2 }}>
              {response.internalLinks.map((link, index) => (
                <Box key={index} component="li" sx={{ mb: 0.5 }}>
                  <Link
                    href={link.url || link.route}
                    sx={{ 
                      color: '#0BBAF4', 
                      fontSize: '0.9rem',
                      textDecoration: 'none',
                      '&:hover': {
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    {link.title || link.url || link.route}
                  </Link>
                  {link.description && (
                    <Typography variant="caption" sx={{ color: '#a0a0a0', display: 'block', ml: 1 }}>
                      {link.description}
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Nota offline */}
        {response.isOffline && (
          <Typography variant="caption" sx={{ color: '#666666', fontStyle: 'italic', mt: 1 }}>
            {t('topicExpander.results.offlineNote')}
          </Typography>
        )}
      </Box>
    );
  };

  // Si no está habilitado, no renderizar
  if (!enabled) return null;

  // Modo botón
  if (variant === 'button') {
    return (
      <Box sx={{ width: '100%' }}>
        {/* Botón centrado */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: open ? 3 : 0 }}>
        <Tooltip title={t('topicExpander.panel.tooltip')}>
            <Button
            ref={buttonRef}
              startIcon={<SparklesIcon />}
            onClick={handleOpen}
              variant="outlined"
            sx={{
              cursor: 'pointer',
                color: '#ffffff',
                borderColor: 'rgba(255, 255, 255, 0.3)',
                borderRadius: '50px',
                px: 4,
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 500,
                textTransform: 'none',
                transition: 'all 0.3s ease',
              '&:hover': {
                  backgroundColor: 'rgba(11, 186, 244, 0.15)',
                  borderColor: '#0BBAF4',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px rgba(11, 186, 244, 0.3)',
              },
            }}
            aria-label={t('topicExpander.button.ariaLabel')}
            aria-controls={open ? panelId : undefined}
            aria-expanded={open}
            >
              {t('topicExpander.button.label')}
            </Button>
        </Tooltip>
        </Box>

        {/* Chat desplegable - Diseño tipo chat */}
        <Collapse in={open} timeout="auto" unmountOnExit>
          <Box
            id={panelId}
            role="region"
            sx={{
              width: '100%',
              mt: 3,
              backgroundColor: '#1a2332',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
              height: '600px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Header del chat con botón de cerrar */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 2,
                borderBottom: '1px solid rgba(11, 186, 244, 0.2)',
                backgroundColor: '#16202d',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SparklesIcon sx={{ color: '#0BBAF4', fontSize: 20 }} />
                <Typography variant="h6" sx={{ color: '#e0e0e0', fontWeight: 600 }}>
                  {t('topicExpander.panel.title')}
                </Typography>
              </Box>
              <IconButton
                onClick={handleClose}
                aria-label={t('topicExpander.panel.closeAria')}
                size="small"
                sx={{
                  color: '#a0a0a0',
                  '&:hover': {
                    backgroundColor: 'rgba(11, 186, 244, 0.2)',
                    color: '#0BBAF4',
                  },
                }}
              >
                <CloseIcon />
              </IconButton>
            </Box>

            {/* Área de mensajes del chat con scroll */}
            <Box
              ref={resultAreaRef}
              sx={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                backgroundColor: '#1a2332',
                '&::-webkit-scrollbar': {
                  width: '8px',
                },
                '&::-webkit-scrollbar-track': {
                  backgroundColor: '#16202d',
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: '#2a3441',
                  borderRadius: '4px',
                  '&:hover': {
                    backgroundColor: '#3a4451',
                  },
                },
              }}
            >
              {/* Sugerencias como mensajes del sistema */}
              {currentSuggestions.length > 0 && !response && (
                <Box
                  role="group"
                  aria-label={t('suggestions.ariaLabel')}
                  aria-live="polite"
                  sx={{
                    alignSelf: 'center',
                    maxWidth: '80%',
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="caption" sx={{ color: '#a0a0a0', mb: 1, display: 'block' }}>
                    {t('suggestions.ariaLabel')}
                  </Typography>
                  <Stack 
                    direction="row" 
                    spacing={1} 
                    sx={{ flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}
                    role="list"
                  >
                    {currentSuggestions.map((suggestion, index) => (
                      <Chip
                        key={suggestion.id}
                        label={suggestion.text}
                        onClick={() => handleSuggestionClick(suggestion)}
                        onKeyDown={(e) => handleSuggestionKeyDown(e, suggestion)}
                        role="button"
                        tabIndex={0}
                        aria-label={`${t('suggestions.ariaLabel')} ${index + 1}: ${suggestion.text}`}
                        sx={{
                          cursor: 'pointer',
                          backgroundColor: '#2a3441',
                          color: '#0BBAF4',
                          border: '1px solid rgba(11, 186, 244, 0.4)',
                          fontWeight: 500,
                          fontSize: '0.875rem',
                          '&:hover': {
                            backgroundColor: '#0BBAF4',
                            color: '#ffffff',
                            border: '1px solid #0BBAF4',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 2px 8px rgba(11, 186, 244, 0.4)',
                          },
                          transition: 'all 0.2s ease',
                        }}
                      />
                    ))}
                  </Stack>
                  {candidateBank && candidateBank.length > 2 && (
                    <Link
                      component="button"
                      type="button"
                      onClick={handleRotateSuggestions}
                      sx={{
                        color: '#0BBAF4',
                        fontSize: '0.75rem',
                        textDecoration: 'none',
                        cursor: 'pointer',
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        fontFamily: 'inherit',
                        mt: 1,
                        display: 'block',
                        '&:hover': {
                          textDecoration: 'underline',
                          color: '#4dd0e1',
                        },
                      }}
                    >
                      {t('suggestions.seeMore')}
                    </Link>
                  )}
                </Box>
              )}

              {/* Historial de mensajes */}
              {chatHistory.map((msg, index) => {
                if (msg.role === 'user') {
                  return (
                    <Box
                      key={`user-${index}`}
                      sx={{
                        alignSelf: 'flex-end',
                        maxWidth: '75%',
                        backgroundColor: '#0BBAF4',
                        color: '#ffffff',
                        p: 2,
                        borderRadius: '18px 18px 4px 18px',
                        boxShadow: '0 2px 8px rgba(11, 186, 244, 0.2)',
                        mb: 1,
                      }}
                    >
                      <Typography variant="body1" sx={{ color: '#ffffff', wordBreak: 'break-word' }}>
                        {msg.content}
                      </Typography>
                    </Box>
                  );
                } else if (msg.role === 'assistant') {
                  // Solo mostrar la última respuesta del asistente en el formato estructurado
                  // Las anteriores se pueden mostrar como texto simple si se quiere
                  if (index === chatHistory.length - 1 && response) {
                    return null; // Se mostrará en el bloque de response
                  }
                  return (
                    <Box
                      key={`assistant-${index}`}
                      sx={{
                        alignSelf: 'flex-start',
                        maxWidth: '75%',
                        backgroundColor: '#2a3441',
                        p: 2.5,
                        borderRadius: '18px 18px 18px 4px',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                        mb: 1,
                      }}
                    >
                      <Typography variant="body2" sx={{ color: '#e0e0e0', wordBreak: 'break-word' }}>
                        {msg.content}
                      </Typography>
                    </Box>
                  );
                }
                return null;
              })}
              
              {/* Mensaje del usuario actual (si hay uno en curso) */}
              {userMessage && chatHistory.length === 0 && (
                <Box
                  sx={{
                    alignSelf: 'flex-end',
                    maxWidth: '75%',
                    backgroundColor: '#0BBAF4',
                    color: '#ffffff',
                    p: 2,
                    borderRadius: '18px 18px 4px 18px',
                    boxShadow: '0 2px 8px rgba(11, 186, 244, 0.2)',
                    mb: 1,
                  }}
                >
                  <Typography variant="body1" sx={{ color: '#ffffff', wordBreak: 'break-word' }}>
                    {userMessage}
                  </Typography>
                </Box>
              )}

              {/* Indicador de escritura de la IA */}
              {loading && (
                <Box
                  sx={{
                    alignSelf: 'flex-start',
                    maxWidth: '75%',
                    backgroundColor: '#2a3441',
                    p: 2,
                    borderRadius: '18px 18px 18px 4px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <CircularProgress size={16} sx={{ color: '#0BBAF4' }} />
                  <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
                    {t('topicExpander.panel.loading')}
                  </Typography>
                  <Button
                    onClick={handleStop}
                    startIcon={<StopIcon />}
                    size="small"
                    variant="text"
                    sx={{ 
                      ml: 'auto',
                      color: '#a0a0a0',
                      minWidth: 'auto',
                      '&:hover': {
                        backgroundColor: 'rgba(11, 186, 244, 0.1)',
                        color: '#0BBAF4',
                      },
                    }}
                  >
                    {t('topicExpander.panel.stopButton')}
                  </Button>
                </Box>
              )}

              {/* Respuesta de la IA */}
              {response && (
                <Box
                  sx={{
                    alignSelf: 'flex-start',
                    maxWidth: '75%',
                    backgroundColor: '#2a3441',
                    p: 2.5,
                    borderRadius: '18px 18px 18px 4px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  {renderResults()}
                </Box>
              )}

              {/* Error como mensaje del sistema */}
              {error && (
                <Box
                  sx={{
                    alignSelf: 'center',
                    maxWidth: '80%',
                    backgroundColor: 'rgba(244, 67, 54, 0.2)',
                    border: '1px solid rgba(244, 67, 54, 0.5)',
                    p: 2,
                    borderRadius: '12px',
                  }}
                >
                  <Typography variant="body2" sx={{ color: '#ff6b6b' }}>
                    {error.code === 'RATE_LIMIT_EXCEEDED' || error.code === 'HTTP_429'
                      ? t('topicExpander.panel.rateLimit')
                      : error.code === 'NETWORK_ERROR'
                      ? t('topicExpander.panel.networkError')
                      : error.code === 'TIMEOUT'
                      ? t('topicExpander.panel.timeoutError')
                      : error.message || t('topicExpander.panel.error')}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Input fijo en la parte inferior */}
            <Box
              sx={{
                p: 2,
                borderTop: '1px solid rgba(11, 186, 244, 0.2)',
                backgroundColor: '#16202d',
              }}
            >
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                <TextField
                  inputRef={inputRef}
                  fullWidth
                  multiline
                  minRows={2}
                  maxRows={4}
                  placeholder={prefilledText || t('topicExpander.panel.inputPlaceholder')}
                  value={input}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    const normalized = normalizeText(newValue);
                    if (normalized.length <= 1000) {
                      setInput(newValue);
                    }
                  }}
                  disabled={loading}
                  inputProps={{
                    maxLength: 1000,
                    'aria-label': t('topicExpander.panel.inputLabel'),
                  }}
                  sx={{
                    '& .MuiInputBase-root': {
                      backgroundColor: '#2a3441',
                      borderRadius: '24px',
                      color: '#e0e0e0',
                      '& fieldset': {
                        borderColor: 'rgba(11, 186, 244, 0.3)',
                      },
                      '&:hover fieldset': {
                        borderColor: '#0BBAF4',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#0BBAF4',
                      },
                    },
                    '& .MuiInputBase-input': {
                      color: '#e0e0e0',
                      '&::placeholder': {
                        color: '#a0a0a0',
                        opacity: 1,
                      },
                    },
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
                      e.preventDefault();
                      if (input.trim() && !loading) {
                        handleSubmit();
                      }
                    }
                  }}
                />
                <IconButton
                  onClick={handleSubmit}
                  disabled={(!input.trim() && !context.sectionContent && !context.visibleText) || loading}
                  sx={{
                    backgroundColor: '#0BBAF4',
                    color: '#ffffff',
                    width: 48,
                    height: 48,
                    '&:hover': {
                      backgroundColor: '#0aa5d4',
                    },
                    '&:disabled': {
                      backgroundColor: '#2a3441',
                      color: '#666666',
                    },
                  }}
                  aria-label={t('topicExpander.panel.submitButton')}
                >
                  <SparklesIcon />
                </IconButton>
              </Box>
              <Typography variant="caption" sx={{ color: '#a0a0a0', mt: 0.5, ml: 1, display: 'block' }}>
                {input.length}/1000
              </Typography>
            </Box>
          </Box>
        </Collapse>
      </Box>
    );
  }

  // Modo acordeón
  return (
    <Accordion
      expanded={open}
      onChange={(e, expanded) => {
        if (expanded) {
          handleOpen();
        } else {
          handleClose();
        }
      }}
      sx={{
        backgroundColor: 'transparent',
        boxShadow: 'none',
        '&:before': {
          display: 'none',
        },
        '&.Mui-expanded': {
          margin: 0,
        },
      }}
    >
      <AccordionSummary
        ref={buttonRef}
        expandIcon={<ExpandMoreIcon sx={{ color: '#0BBAF4' }} />}
        aria-label={t('topicExpander.accordion.ariaLabel')}
        aria-controls={panelId}
        aria-expanded={open}
        role="button"
        sx={{
          '& .MuiAccordionSummary-content': {
            alignItems: 'center',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LightbulbIcon sx={{ color: '#0BBAF4', fontSize: 20 }} />
          <Typography variant="body2" sx={{ color: '#ffffff' }}>
            {t('topicExpander.accordion.title')}
          </Typography>
        </Box>
      </AccordionSummary>

      <AccordionDetails id={panelId}>
        <Box>
          <Box sx={{ position: 'relative', mb: 2 }}>
            <TextField
              inputRef={inputRef}
              fullWidth
              multiline
              minRows={3}
              maxRows={6}
              label={t('topicExpander.panel.inputLabel')}
              placeholder={t('topicExpander.panel.inputPlaceholder')}
              value={input}
              onChange={(e) => {
                const newValue = e.target.value;
                if (newValue.length <= 1000) {
                  setInput(newValue);
                }
              }}
              disabled={loading}
              inputProps={{
                maxLength: 1000,
              }}
              sx={{
                '& .MuiInputBase-root': {
                  color: '#ffffff',
                },
                '& .MuiInputLabel-root': {
                  color: '#ffffff',
                },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#0BBAF4',
                  },
                },
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
            <Typography
              variant="caption"
              sx={{
                position: 'absolute',
                bottom: 8,
                right: 14,
                color: 'rgba(255, 255, 255, 0.6)',
                pointerEvents: 'none',
              }}
            >
              {input.length}/1000
            </Typography>
          </Box>

          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 2 }}
              onClose={() => setError(null)}
            >
              {error.code === 'RATE_LIMIT_EXCEEDED' || error.code === 'HTTP_429'
                ? t('topicExpander.panel.rateLimit')
                : error.code === 'NETWORK_ERROR'
                ? t('topicExpander.panel.networkError')
                : error.code === 'TIMEOUT'
                ? t('topicExpander.panel.timeoutError')
                : error.message || t('topicExpander.panel.error')}
            </Alert>
          )}

          {loading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" sx={{ color: '#ffffff' }}>
                {t('topicExpander.panel.loading')}
              </Typography>
              <Button
                onClick={handleStop}
                startIcon={<StopIcon />}
                size="small"
                variant="outlined"
                color="secondary"
              >
                {t('topicExpander.panel.stopButton')}
              </Button>
            </Box>
          )}

          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <Button
              onClick={handleSubmit}
              variant="contained"
              color="primary"
              disabled={loading || (!input.trim() && !context.sectionContent && !context.visibleText)}
              startIcon={<SparklesIcon />}
            >
              {t('topicExpander.panel.submitButton')}
            </Button>
          </Stack>

          {renderResults()}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};

AITopicExpander.propTypes = {
  context: PropTypes.shape({
    moduleId: PropTypes.string,
    lessonId: PropTypes.string,
    sectionId: PropTypes.string,
    moduleTitle: PropTypes.string,
    lessonTitle: PropTypes.string,
    sectionTitle: PropTypes.string,
    breadcrumbs: PropTypes.arrayOf(PropTypes.string),
    pageUrl: PropTypes.string,
    locale: PropTypes.string,
    userLevel: PropTypes.oneOf(['beginner', 'intermediate', 'advanced']),
    visibleText: PropTypes.string,
    selectionText: PropTypes.string,
    contentLength: PropTypes.number,
    sectionContent: PropTypes.string,
    userSelection: PropTypes.string,
    visibleTextBlock: PropTypes.string,
    pageType: PropTypes.string,
    sectionType: PropTypes.string,
  }).isRequired,
  variant: PropTypes.oneOf(['button', 'accordion']),
  enabled: PropTypes.bool,
};

AITopicExpander.defaultProps = {
  variant: 'button',
  enabled: true,
};

export default AITopicExpander;
