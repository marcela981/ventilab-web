import React, { useState } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { BookmarkBorder, Bookmark, CheckCircle, TrendingUp } from '@mui/icons-material';
import ModuleStatusIcons from './ModuleStatusIcons';
import PrerequisiteTooltip from './PrerequisiteTooltip';
import EmojiPicker from '@/features/ensenanza/shared/components/edit/EmojiPicker/EmojiPicker';
import styles from '@/styles/curriculum.module.css';

/**
 * Header de la ModuleCard con título, favorito e iconos de estado
 */
const ModuleCardHeader = ({
  module,
  isFavorite,
  isAvailable,
  status,
  availabilityStatus,
  levelColor,
  isHovered,
  onToggleFavorite,
  completedAt,
  missingPrerequisites = []
}) => {
  const [emoji, setEmoji] = useState(module.emoji || '');

  const handleEmojiChange = (newEmoji) => {
    setEmoji(newEmoji);
    // TODO Fase 3: PATCH /api/modules/{module.id} { emoji: newEmoji }
  };

  return (
    <>
      {/* Icono de estado para módulos completados o en progreso */}
      {status === 'completed' && (
        <Box
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 11,
            pointerEvents: 'auto',
            transition: 'transform 0.25s ease-in-out',
            transform: isHovered ? 'scale(1.1)' : 'scale(1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 0.5
          }}
          title={completedAt ? `Completado el ${new Date(completedAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })}` : 'Módulo completado'}
        >
          <CheckCircle sx={{ color: '#4CAF50', fontSize: 20 }} />
          {completedAt && (
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.65rem',
                color: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.15)',
                padding: '2px 4px',
                borderRadius: 1,
                fontWeight: 600,
                whiteSpace: 'nowrap'
              }}
            >
              {new Date(completedAt).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
            </Typography>
          )}
        </Box>
      )}
      {status === 'in-progress' && (
        <Box
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 11,
            pointerEvents: 'auto',
            transition: 'transform 0.25s ease-in-out',
            transform: isHovered ? 'scale(1.1)' : 'scale(1)'
          }}
        >
          <TrendingUp sx={{ color: '#FF9800', fontSize: 20 }} />
        </Box>
      )}
      {/* Icono de estado de disponibilidad (Lock/LockOpen) */}
      {(status === 'available' || status === 'locked') && (
        <Box
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 11, // Mayor que el contenido para permitir interacción con tooltip
            transition: 'transform 0.25s ease-in-out',
            transform: isHovered ? 'scale(1.1)' : 'scale(1)',
            pointerEvents: 'auto', // Permitir eventos incluso cuando el contenido está bloqueado
          }}
        >
          {status === 'locked' ? (
            <PrerequisiteTooltip
              missing={missingPrerequisites}
              side="top"
              maxWidth={280}
            >
              <span style={{ display: 'inline-flex', cursor: 'help' }}>
                <ModuleStatusIcons 
                  isAvailable={false} 
                  size={20} 
                  color={undefined} 
                />
              </span>
            </PrerequisiteTooltip>
          ) : (
            <ModuleStatusIcons 
              isAvailable={true} 
              size={20} 
              color={levelColor} 
            />
          )}
        </Box>
      )}

      {/* Botón de favorito con fondo semi-transparente */}
      <Box
        sx={{
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 11, // Mayor que el contenido para permitir interacción incluso cuando está bloqueado
          pointerEvents: 'auto', // Permitir eventos incluso cuando el contenido está bloqueado
        }}
      >
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(module.id);
          }}
          aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          aria-pressed={isFavorite}
          sx={{
            width: 32,
            height: 32,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(4px)',
            transition: 'all 0.25s ease-in-out',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              transform: 'scale(1.1)'
            }
          }}
        >
          {isFavorite ? (
            <Bookmark sx={{ color: '#FF9800', fontSize: 18 }} />
          ) : (
            <BookmarkBorder sx={{ color: '#e8f4fd', fontSize: 18 }} />
          )}
        </IconButton>
      </Box>

      {/* Header - Título del módulo con EmojiPicker en modo edición */}
      <header className={styles.cardHeader} style={{ paddingTop: '48px' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
          <EmojiPicker value={emoji} onChange={handleEmojiChange} />
          <Typography
            variant="h6"
            component="h3"
            style={{
              fontWeight: 700,
              fontSize: '1.05rem',
              lineHeight: 1.35,
              color: isAvailable ? '#ffffff' : '#9e9e9e',
              textShadow: isAvailable ? '0 2px 4px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.3)' : 'none',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              margin: 0,
              flex: 1,
            }}
          >
            {module.title}
            <span className="sr-only" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', borderWidth: 0 }}>
              Módulo {availabilityStatus === 'blocked' ? 'bloqueado' : 'disponible'}
            </span>
          </Typography>
        </Box>
      </header>
    </>
  );
};

export default ModuleCardHeader;

