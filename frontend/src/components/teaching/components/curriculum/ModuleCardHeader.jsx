import React from 'react';
import PropTypes from 'prop-types';
import { Box, IconButton, Typography } from '@mui/material';
import { BookmarkBorder, Bookmark, CheckCircle, TrendingUp } from '@mui/icons-material';
import ModuleStatusIcons from './ModuleStatusIcons';
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
  onToggleFavorite
}) => {
  return (
    <>
      {/* Icono de estado para módulos completados o en progreso */}
      {status === 'completed' && (
        <Box
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 2,
            transition: 'transform 0.25s ease-in-out',
            transform: isHovered ? 'scale(1.1)' : 'scale(1)'
          }}
        >
          <CheckCircle sx={{ color: '#4CAF50', fontSize: 20 }} />
        </Box>
      )}
      {status === 'in-progress' && (
        <Box
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 2,
            transition: 'transform 0.25s ease-in-out',
            transform: isHovered ? 'scale(1.1)' : 'scale(1)'
          }}
        >
          <TrendingUp sx={{ color: '#FF9800', fontSize: 20 }} />
        </Box>
      )}
      {status === 'available' && (
        <Box
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 2,
            transition: 'transform 0.25s ease-in-out',
            transform: isHovered ? 'scale(1.1)' : 'scale(1)'
          }}
        >
          <ModuleStatusIcons isAvailable={true} size={20} color={levelColor} />
        </Box>
      )}

      {/* Botón de favorito con fondo semi-transparente */}
      <Box
        sx={{
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 2
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

      {/* Header - Título del módulo */}
      <header className={styles.cardHeader} style={{ paddingTop: '48px' }}>
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
          }}
        >
          {module.title}
          <span className="sr-only" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', borderWidth: 0 }}>
            Módulo {availabilityStatus === 'blocked' ? 'bloqueado' : 'disponible'}
          </span>
        </Typography>
      </header>
    </>
  );
};

ModuleCardHeader.propTypes = {
  module: PropTypes.object.isRequired,
  isFavorite: PropTypes.bool.isRequired,
  isAvailable: PropTypes.bool.isRequired,
  status: PropTypes.string.isRequired,
  availabilityStatus: PropTypes.string.isRequired,
  levelColor: PropTypes.string.isRequired,
  isHovered: PropTypes.bool.isRequired,
  onToggleFavorite: PropTypes.func.isRequired
};

export default ModuleCardHeader;

