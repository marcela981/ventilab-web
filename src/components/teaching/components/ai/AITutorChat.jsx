import React, { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  IconButton,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Fade,
  CircularProgress,
} from '@mui/material';
import {
  Chat as ChatIcon,
  Close as CloseIcon,
  Send as SendIcon,
  SmartToy as SmartToyIcon,
  Stop as StopIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import useAITutor from '../../hooks/useAITutor';
import ChatMessage from './ChatMessage';
import SuggestedQuestions from './SuggestedQuestions';

/**
 * FAB (Floating Action Button) estilizado
 */
const StyledFAB = styled(IconButton)(({ theme }) => ({
  position: 'fixed',
  right: 24,
  bottom: 24,
  width: 56,
  height: 56,
  backgroundColor: '#0BBAF4',
  color: '#FFFFFF',
  zIndex: 1600,
  boxShadow: '0 4px 12px rgba(11, 186, 244, 0.4)',
  '&:hover': {
    backgroundColor: '#0288d1',
    boxShadow: '0 6px 16px rgba(11, 186, 244, 0.5)',
  },
  '&:focus-visible': {
    outline: '2px solid #BBECFC',
    outlineOffset: '2px',
  },
}));

/**
 * Panel del chat estilizado
 */
const ChatPanel = styled(Paper)(({ theme }) => ({
  position: 'fixed',
  right: 24,
  bottom: 24,
  width: 400,
  height: 500,
  zIndex: 1600,
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: 'rgba(31, 31, 31, 0.95)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(11, 186, 244, 0.3)',
  borderRadius: 16,
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
  overflow: 'hidden',
}));

/**
 * AITutorChat - Componente de chat flotante para tutor IA
 * 
 * @param {Object} props
 * @param {Object} props.lessonContext - Contexto de la lección
 * @param {string} props.lessonContext.lessonId - ID de la lección
 * @param {string} props.lessonContext.title - Título de la lección
 * @param {string[]} props.lessonContext.objectives - Objetivos de aprendizaje
 * @param {string[]} props.lessonContext.tags - Tags/temas de la lección
 * @param {string} props.lessonContext.tipoDeLeccion - Tipo de lección (teoria | caso_clinico | simulacion | evaluacion)
 * @param {boolean} props.defaultOpen - Si es true, el chat se abre automáticamente al montar
 */
const AITutorChat = ({ lessonContext, defaultOpen = false }) => {
  const {
    open,
    messages,
    typing: isStreaming,
    provider,
    toggle,
    setProvider: changeProvider,
    send: sendMessage,
    cancelStream,
  } = useAITutor(lessonContext);

  // Mapear nombres para compatibilidad
  const isOpen = open;
  const openChat = useCallback(() => {
    if (!open) toggle();
  }, [open, toggle]);
  const closeChat = useCallback(() => {
    if (open) toggle();
  }, [open, toggle]);

  // Extraer error del último mensaje si existe
  const error = messages.length > 0 && messages[messages.length - 1]?.error 
    ? messages[messages.length - 1].error 
    : null;

  // Abrir automáticamente si defaultOpen es true
  useEffect(() => {
    if (defaultOpen && !isOpen) {
      toggle();
    }
  }, [defaultOpen, isOpen, toggle]);

  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  /**
   * Scroll automático al final de los mensajes
   */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isStreaming]);

  /**
   * Re-habilitar input y mover foco cuando termine el streaming
   */
  useEffect(() => {
    if (!isStreaming && isOpen && inputRef.current) {
      // Pequeño delay para asegurar que el DOM se haya actualizado
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isStreaming, isOpen]);

  /**
   * Enfocar input cuando se abre el chat
   */
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  /**
   * Manejar envío de mensaje
   */
  const handleSend = () => {
    if (!inputValue.trim() || isStreaming) return;
    
    const message = inputValue.trim();
    setInputValue('');
    sendMessage(message);
    
    // Regresar foco al input después de enviar
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  /**
   * Manejar tecla Enter
   */
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /**
   * Manejar selección de pregunta sugerida
   */
  const handleSuggestedQuestionPick = (question) => {
    setInputValue(question);
    // Enviar automáticamente
    setTimeout(() => {
      sendMessage(question);
      setInputValue('');
    }, 100);
  };

  return (
    <>
      {/* FAB - Siempre visible */}
      {!isOpen && (
        <StyledFAB
          onClick={openChat}
          aria-label="Abrir chat del tutor IA"
          size="large"
        >
          <ChatIcon />
        </StyledFAB>
      )}

      {/* Panel del chat */}
      <Fade in={isOpen}>
        <Box>
          {isOpen && (
            <ChatPanel>
              {/* Encabezado */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 2,
                  borderBottom: '1px solid rgba(11, 186, 244, 0.2)',
                  backgroundColor: 'rgba(11, 186, 244, 0.1)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SmartToyIcon sx={{ color: '#0BBAF4', fontSize: 24 }} />
                  <Typography
                    variant="h6"
                    sx={{
                      color: '#FFFFFF',
                      fontWeight: 600,
                      fontSize: '1rem',
                    }}
                  >
                    Tutor IA
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {/* Selector de proveedor */}
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <Select
                      value={provider}
                      onChange={(e) => changeProvider(e.target.value)}
                      sx={{
                        color: '#FFFFFF',
                        fontSize: '0.75rem',
                        height: 32,
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(11, 186, 244, 0.3)',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(11, 186, 244, 0.5)',
                        },
                        '& .MuiSvgIcon-root': {
                          color: '#BBECFC',
                        },
                      }}
                      MenuProps={{
                        PaperProps: {
                          sx: {
                            backgroundColor: 'rgba(31, 31, 31, 0.95)',
                            border: '1px solid rgba(11, 186, 244, 0.3)',
                          },
                        },
                      }}
                    >
                      <MenuItem value="openai" sx={{ color: '#FFFFFF', fontSize: '0.75rem' }}>
                        OpenAI
                      </MenuItem>
                      <MenuItem value="anthropic" sx={{ color: '#FFFFFF', fontSize: '0.75rem' }}>
                        Anthropic
                      </MenuItem>
                      <MenuItem value="google" sx={{ color: '#FFFFFF', fontSize: '0.75rem' }}>
                        Google
                      </MenuItem>
                    </Select>
                  </FormControl>

                  {/* Botón cerrar */}
                  <IconButton
                    onClick={closeChat}
                    size="small"
                    sx={{
                      color: '#BBECFC',
                      '&:hover': {
                        backgroundColor: 'rgba(11, 186, 244, 0.2)',
                      },
                    }}
                    aria-label="Cerrar chat"
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>

              {/* Área de mensajes - Scrollable */}
              <Box
                sx={{
                  flex: 1,
                  overflowY: 'auto',
                  p: 2,
                  '&::-webkit-scrollbar': {
                    width: 8,
                  },
                  '&::-webkit-scrollbar-track': {
                    backgroundColor: 'rgba(11, 186, 244, 0.1)',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'rgba(11, 186, 244, 0.3)',
                    borderRadius: 4,
                    '&:hover': {
                      backgroundColor: 'rgba(11, 186, 244, 0.5)',
                    },
                  },
                }}
                aria-live="polite"
                aria-atomic="false"
              >
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    role={message.role}
                    content={message.content}
                    time={message.time || message.timestamp}
                    error={message.error}
                  />
                ))}
                
                {/* Indicador de escritura con animación */}
                {isStreaming && (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: '0.75rem',
                      mt: 1.5,
                      mb: 1.5,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        gap: 0.5,
                        alignItems: 'center',
                        '@keyframes bounce': {
                          '0%, 80%, 100%': {
                            transform: 'scale(0)',
                            opacity: 0.5,
                          },
                          '40%': {
                            transform: 'scale(1)',
                            opacity: 1,
                          },
                        },
                      }}
                    >
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: '#0BBAF4',
                          animation: 'bounce 1.4s infinite ease-in-out',
                          animationDelay: '0s',
                        }}
                      />
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: '#0BBAF4',
                          animation: 'bounce 1.4s infinite ease-in-out',
                          animationDelay: '0.2s',
                        }}
                      />
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: '#0BBAF4',
                          animation: 'bounce 1.4s infinite ease-in-out',
                          animationDelay: '0.4s',
                        }}
                      />
                    </Box>
                    <Typography variant="caption" sx={{ ml: 0.5 }}>
                      La IA está escribiendo...
                    </Typography>
                  </Box>
                )}

                {/* Referencia para scroll automático */}
                <div ref={messagesEndRef} />
              </Box>

              {/* Preguntas sugeridas */}
              {messages.length <= 1 && (
                <Box sx={{ px: 2, py: 1, borderTop: '1px solid rgba(11, 186, 244, 0.2)' }}>
                  <SuggestedQuestions
                    lessonContext={lessonContext}
                    suggestions={[]}
                    onPick={handleSuggestedQuestionPick}
                  />
                </Box>
              )}

              {/* Input y botones */}
              <Box
                sx={{
                  p: 2,
                  borderTop: '1px solid rgba(11, 186, 244, 0.2)',
                  backgroundColor: 'rgba(11, 186, 244, 0.05)',
                  display: 'flex',
                  gap: 1,
                }}
              >
                <TextField
                  inputRef={inputRef}
                  fullWidth
                  size="small"
                  placeholder={isStreaming ? "La IA está respondiendo..." : "Escribe tu pregunta..."}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isStreaming}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                      fontSize: '0.875rem',
                      '& fieldset': {
                        borderColor: 'rgba(11, 186, 244, 0.3)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(11, 186, 244, 0.5)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#0BBAF4',
                      },
                      '&.Mui-disabled': {
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        color: 'rgba(255, 255, 255, 0.4)',
                      },
                    },
                    '& .MuiInputBase-input::placeholder': {
                      color: 'rgba(255, 255, 255, 0.5)',
                      opacity: 1,
                    },
                  }}
                />
                {isStreaming ? (
                  <Button
                    variant="contained"
                    onClick={cancelStream}
                    sx={{
                      minWidth: 48,
                      height: 40,
                      backgroundColor: '#f44336',
                      color: '#FFFFFF',
                      '&:hover': {
                        backgroundColor: '#d32f2f',
                      },
                    }}
                    aria-label="Detener respuesta"
                  >
                    <StopIcon fontSize="small" />
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    onClick={handleSend}
                    disabled={!inputValue.trim()}
                    sx={{
                      minWidth: 48,
                      height: 40,
                      backgroundColor: '#0BBAF4',
                      color: '#FFFFFF',
                      '&:hover': {
                        backgroundColor: '#0288d1',
                      },
                      '&:disabled': {
                        backgroundColor: 'rgba(11, 186, 244, 0.3)',
                        color: 'rgba(255, 255, 255, 0.5)',
                      },
                    }}
                    aria-label="Enviar mensaje"
                  >
                    <SendIcon fontSize="small" />
                  </Button>
                )}
              </Box>

              {/* Mensaje de error */}
              {error && (
                <Box
                  sx={{
                    p: 1,
                    backgroundColor: 'rgba(244, 67, 54, 0.2)',
                    borderTop: '1px solid rgba(244, 67, 54, 0.3)',
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: '#ffcdd2',
                      fontSize: '0.75rem',
                    }}
                  >
                    {error}
                  </Typography>
                </Box>
              )}
            </ChatPanel>
          )}
        </Box>
      </Fade>
    </>
  );
};

AITutorChat.propTypes = {
  lessonContext: PropTypes.shape({
    lessonId: PropTypes.string,
    title: PropTypes.string,
    objectives: PropTypes.arrayOf(PropTypes.string),
    tags: PropTypes.arrayOf(PropTypes.string),
    tipoDeLeccion: PropTypes.oneOf(['teoria', 'caso_clinico', 'simulacion', 'evaluacion']),
  }),
  defaultOpen: PropTypes.bool,
};

export default AITutorChat;

