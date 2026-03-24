import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Avatar,
  Paper,
  Button,
  Collapse,
} from '@mui/material';
import {
  Person as PersonIcon,
  SmartToy as SmartToyIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  ErrorOutline as ErrorOutlineIcon,
} from '@mui/icons-material';

/**
 * Parsea markdown básico (listas, énfasis) a elementos React
 */
const parseBasicMarkdown = (text) => {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let currentList = null;
  let listItems = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <Box key={`list-${elements.length}`} component="ul" sx={{ pl: 3, my: 1, listStyleType: 'disc' }}>
          {listItems.map((item, idx) => (
            <Box key={idx} component="li" sx={{ mb: 0.5, color: '#FFFFFF' }}>
              {parseInlineFormatting(item)}
            </Box>
          ))}
        </Box>
      );
      listItems = [];
    }
  };

  const parseInlineFormatting = (line) => {
    if (!line) return null;

    // Negrita: **texto** o __texto__
    line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    line = line.replace(/__(.*?)__/g, '<strong>$1</strong>');
    
    // Cursiva: *texto* o _texto_
    line = line.replace(/\*(.*?)\*/g, '<em>$1</em>');
    line = line.replace(/_(.*?)_/g, '<em>$1</em>');
    
    // Código inline: `código`
    line = line.replace(/`(.*?)`/g, '<code>$1</code>');

    return (
      <span
        dangerouslySetInnerHTML={{ __html: line }}
        style={{
          color: '#FFFFFF',
        }}
      />
    );
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Lista no ordenada: - o * al inicio
    if (trimmed.match(/^[-*]\s+/)) {
      const item = trimmed.replace(/^[-*]\s+/, '');
      listItems.push(item);
      currentList = 'ul';
      return;
    }

    // Lista ordenada: número seguido de punto
    if (trimmed.match(/^\d+\.\s+/)) {
      const item = trimmed.replace(/^\d+\.\s+/, '');
      listItems.push(item);
      currentList = 'ol';
      return;
    }

    // Si hay una lista en progreso y esta línea no es lista, flush
    if (currentList && trimmed) {
      flushList();
      currentList = null;
    }

    // Línea vacía
    if (!trimmed) {
      if (listItems.length > 0) {
        flushList();
        currentList = null;
      }
      elements.push(<Box key={`br-${index}`} sx={{ height: '0.5rem' }} />);
      return;
    }

    // Párrafo normal
    elements.push(
      <Typography
        key={`p-${index}`}
        variant="body2"
        component="p"
        sx={{
          color: '#FFFFFF',
          lineHeight: 1.6,
          mb: 1,
          '& strong': {
            fontWeight: 600,
            color: '#BBECFC',
          },
          '& em': {
            fontStyle: 'italic',
          },
          '& code': {
            backgroundColor: 'rgba(11, 186, 244, 0.2)',
            padding: '2px 4px',
            borderRadius: 1,
            fontFamily: 'monospace',
            fontSize: '0.9em',
            color: '#BBECFC',
          },
        }}
      >
        {parseInlineFormatting(trimmed)}
      </Typography>
    );
  });

  // Flush cualquier lista pendiente
  flushList();

  return elements.length > 0 ? elements : null;
};

/**
 * ChatMessage - Componente para renderizar mensajes del chat
 * 
 * @param {Object} props
 * @param {string} props.role - Rol del mensaje: 'user' o 'assistant'
 * @param {string} props.content - Contenido del mensaje (puede llegar en fragmentos durante streaming)
 * @param {string} props.time - ISO string con la hora del mensaje
 * @param {string} props.error - Mensaje de error opcional
 */
const ChatMessage = ({ role, content, time, error }) => {
  const isUser = role === 'user';
  const isAssistant = role === 'assistant';
  const [isExpanded, setIsExpanded] = useState(false);
  const messageRef = useRef(null);

  // Auto-scroll cuando se actualiza el contenido durante streaming
  useEffect(() => {
    if (isAssistant && messageRef.current) {
      // Scroll suave al final del mensaje
      // Usar setTimeout para asegurar que el DOM se haya actualizado
      setTimeout(() => {
        messageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 50);
    }
  }, [content, isAssistant]);

  // Determinar si el contenido es largo (más de 500 caracteres o más de 10 líneas)
  const isLongContent = content && (content.length > 500 || content.split('\n').length > 10);
  const shouldShowCollapse = isLongContent && isAssistant;

  // Contenido a mostrar (colapsado o expandido)
  const displayContent = shouldShowCollapse && !isExpanded
    ? content.substring(0, 500) + '...'
    : content;

  // Formatear tiempo
  const formatTime = (timeString) => {
    if (!timeString) return '';
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Renderizar contenido
  const renderContent = () => {
    if (error) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <ErrorOutlineIcon sx={{ color: '#ff9800', fontSize: 18, mt: 0.5 }} />
          <Typography
            variant="body2"
            sx={{
              color: '#ff9800',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            <strong>Error:</strong> {content || error}
          </Typography>
        </Box>
      );
    }

    if (isAssistant) {
      // Para el asistente, renderizar con formato básico
      const parsedContent = parseBasicMarkdown(displayContent);
      return (
        <Box>
          {parsedContent || (
            <Typography
              variant="body2"
              sx={{
                color: '#FFFFFF',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {displayContent}
            </Typography>
          )}
          {shouldShowCollapse && (
            <Button
              size="small"
              onClick={() => setIsExpanded(!isExpanded)}
              endIcon={isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              sx={{
                mt: 1,
                color: '#BBECFC',
                fontSize: '0.75rem',
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: 'rgba(187, 236, 252, 0.1)',
                },
              }}
            >
              {isExpanded ? 'Mostrar menos' : 'Mostrar más'}
            </Button>
          )}
        </Box>
      );
    }

    // Para el usuario, texto simple
    return (
      <Typography
        variant="body2"
        sx={{
          color: '#FFFFFF',
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {content}
      </Typography>
    );
  };

  // Estilos del bubble según si hay error
  const getBubbleStyles = () => {
    if (error) {
      return {
        backgroundColor: 'rgba(255, 152, 0, 0.15)',
        border: '1px solid rgba(255, 152, 0, 0.4)',
      };
    }
    if (isUser) {
      return {
        backgroundColor: 'rgba(11, 186, 244, 0.15)',
        border: '1px solid rgba(11, 186, 244, 0.3)',
      };
    }
    return {
      backgroundColor: 'rgba(187, 236, 252, 0.1)',
      border: '1px solid rgba(187, 236, 252, 0.2)',
    };
  };

  return (
    <Box
      ref={messageRef}
      sx={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        gap: 1.5,
        mb: 1.5, // 12px mínimo de padding entre bubbles (1.5 * 8px = 12px)
        alignItems: 'flex-start',
      }}
    >
      {/* Avatar */}
      <Avatar
        sx={{
          width: 32,
          height: 32,
          bgcolor: isUser ? '#0BBAF4' : '#BBECFC',
          color: isUser ? '#FFFFFF' : '#0288d1',
          flexShrink: 0,
        }}
      >
        {isUser ? (
          <PersonIcon sx={{ fontSize: 20 }} />
        ) : (
          <SmartToyIcon sx={{ fontSize: 20 }} />
        )}
      </Avatar>

      {/* Mensaje */}
      <Box sx={{ maxWidth: '75%', minWidth: 0 }}>
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            ...getBubbleStyles(),
            borderRadius: 2,
          }}
        >
          <Box>
            {renderContent()}
          </Box>
        </Paper>

        {/* Timestamp */}
        {time && (
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mt: 0.5,
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '0.7rem',
              textAlign: isUser ? 'right' : 'left',
            }}
          >
            {formatTime(time)}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

ChatMessage.propTypes = {
  role: PropTypes.oneOf(['user', 'assistant']).isRequired,
  content: PropTypes.string.isRequired,
  time: PropTypes.string,
  error: PropTypes.string,
};

export default ChatMessage;
