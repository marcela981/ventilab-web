import React from 'react';
import PropTypes from 'prop-types';
import {
  Button,
  Typography,
  Box,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  CheckCircle,
  TrendingUp,
  LockOpen,
  Lock,
  BookmarkBorder,
  Bookmark,
  PlayArrow,
  Refresh,
  AccessTime
} from '@mui/icons-material';
import styles from '@/styles/curriculum.module.css';

/**
 * ModuleCard - Card individual de módulo de aprendizaje
 * 
 * Muestra información de un módulo específico incluyendo:
 * - Estado (completado, en progreso, disponible, bloqueado)
 * - Progreso visual
 * - Metadatos (dificultad, tiempo estimado)
 * - Botón de favorito
 * - Acción principal
 * 
 * @param {Object} module - Datos del módulo
 * @param {Object} moduleProgress - Progreso del módulo
 * @param {boolean} isAvailable - Si el módulo está disponible
 * @param {boolean} isFavorite - Si es favorito del usuario
 * @param {Function} onModuleClick - Callback para click en el módulo
 * @param {Function} onToggleFavorite - Callback para toggle de favorito
 * @param {Function} getStatusIcon - Función para obtener icono de estado
 * @param {Function} getButtonText - Función para obtener texto del botón
 * @param {Function} getButtonIcon - Función para obtener icono del botón
 * @param {string} levelColor - Color del nivel del módulo
 */
const ModuleCard = ({
  module,
  moduleProgress,
  isAvailable,
  isFavorite,
  onModuleClick,
  onToggleFavorite,
  getStatusIcon,
  getButtonText,
  getButtonIcon,
  levelColor
}) => {
  const status = moduleProgress === 100 ? 'completed' :
                moduleProgress > 0 ? 'in-progress' :
                isAvailable ? 'available' : 'locked';

  // Manejador de click en la card
  const handleCardClick = () => {
    if (isAvailable) {
      onModuleClick(module.id);
    }
  };

  // Prevenir propagación del click en el área de scroll
  const handleBodyClick = (e) => {
    e.stopPropagation();
  };

  // Estilos dinámicos para el borde según estado
  const borderStyle = {
    borderColor: status === 'available' ? '#2196F3' :
                 status === 'in-progress' ? '#FF9800' :
                 status === 'completed' ? '#4CAF50' : 'rgba(0,0,0,0.08)',
    borderWidth: status === 'locked' ? '1px' : '2px'
  };

  return (
    <Tooltip title={`${isAvailable ? `Disponible - ${moduleProgress.toFixed(0)}% completado` : 'Módulo bloqueado'}`} arrow placement="top">
      <article
        className={styles.card}
        role="article"
        aria-label={`Módulo: ${module.title}`}
        onClick={handleCardClick}
        style={{
          ...borderStyle,
          cursor: isAvailable ? 'pointer' : 'default',
          opacity: isAvailable ? 1 : 0.6,
          position: 'relative'
        }}
      >
        {/* Encabezado con título, favorito e icono de estado */}
        <div className={styles.cardHeader}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
            {/* Botón de favorito */}
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(module.id);
              }}
              sx={{
                padding: '4px',
                marginLeft: '-4px'
              }}
              aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            >
              {isFavorite ?
                <Bookmark sx={{ color: '#FF9800', fontSize: 18 }} /> :
                <BookmarkBorder sx={{ color: '#666', fontSize: 18 }} />
              }
            </IconButton>

            {/* Icono de estado */}
            <Box sx={{ marginRight: '-4px' }}>
              {getStatusIcon(status)}
            </Box>
          </Box>

          <Typography variant="h6" component="h3" sx={{
            fontSize: '1.05rem',
            fontWeight: 600,
            lineHeight: 1.35,
            color: isAvailable ? '#2c3e50' : '#9e9e9e',
            marginTop: 0
          }}>
            {module.title}
          </Typography>
        </div>

        {/* Metadatos: progreso, dificultad y duración */}
        <div className={styles.cardMeta}>
          {/* Barra de progreso */}
          <Box sx={{ mb: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" sx={{ color: '#6c757d', fontSize: '0.75rem' }}>
                Progreso
              </Typography>
              <Typography variant="caption" sx={{
                color: status === 'completed' ? '#4CAF50' :
                       status === 'in-progress' ? '#FF9800' : '#9e9e9e',
                fontWeight: 600,
                fontSize: '0.75rem'
              }}>
                {moduleProgress.toFixed(0)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={moduleProgress}
              sx={{
                height: 4,
                borderRadius: 2,
                backgroundColor: '#e0e0e0',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: status === 'completed' ? '#4CAF50' :
                                 status === 'in-progress' ? '#FF9800' : '#9e9e9e',
                  borderRadius: 2,
                }
              }}
            />
          </Box>

          {/* Chips de metadatos */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label={module.difficulty}
              size="small"
              sx={{
                fontSize: '0.7rem',
                height: 20,
                backgroundColor: isAvailable ? '#e3f2fd' : '#f5f5f5',
                color: isAvailable ? '#1976d2' : '#9e9e9e'
              }}
            />
            <Chip
              icon={<AccessTime sx={{ fontSize: 12 }} />}
              label={`${Math.round(module.duration / 60)}h`}
              size="small"
              sx={{
                fontSize: '0.7rem',
                height: 20,
                backgroundColor: isAvailable ? '#e8f5e8' : '#f5f5f5',
                color: isAvailable ? '#388e3c' : '#9e9e9e'
              }}
            />
          </Box>
        </div>

        {/* Cuerpo con scroll interno para descripción/objetivos */}
        <div
          className={styles.cardBody}
          onClick={handleBodyClick}
          tabIndex={0}
          role="region"
          aria-label="Descripción del módulo"
        >
          <Typography variant="body2" sx={{
            color: '#6c757d',
            fontSize: '0.9rem',
            lineHeight: 1.5
          }}>
            {module.learningObjectives?.[0] || module.description || 'Sin descripción disponible'}
          </Typography>
        </div>

        {/* Pie con botón de acción */}
        <div className={styles.cardFooter}>
          <Button
            variant={status === 'completed' ? 'outlined' : 'contained'}
            fullWidth
            disabled={!isAvailable}
            startIcon={getButtonIcon(status)}
            onClick={(e) => e.stopPropagation()}
            sx={{
              fontSize: '0.85rem',
              fontWeight: 600,
              backgroundColor: isAvailable && status !== 'completed' ? levelColor : 'transparent',
              borderColor: isAvailable ? levelColor : '#e0e0e0',
              color: isAvailable ? (status === 'completed' ? levelColor : '#fff') : '#9e9e9e',
              '&:hover': isAvailable ? {
                backgroundColor: status === 'completed' ? 'rgba(0,0,0,0.04)' : levelColor,
                filter: status === 'completed' ? 'none' : 'brightness(0.9)'
              } : {}
            }}
          >
            {getButtonText(status)}
          </Button>
        </div>
      </article>
    </Tooltip>
  );
};

ModuleCard.propTypes = {
  module: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    learningObjectives: PropTypes.array,
    difficulty: PropTypes.string.isRequired,
    duration: PropTypes.number.isRequired
  }).isRequired,
  moduleProgress: PropTypes.number.isRequired,
  isAvailable: PropTypes.bool.isRequired,
  isFavorite: PropTypes.bool.isRequired,
  onModuleClick: PropTypes.func.isRequired,
  onToggleFavorite: PropTypes.func.isRequired,
  getStatusIcon: PropTypes.func.isRequired,
  getButtonText: PropTypes.func.isRequired,
  getButtonIcon: PropTypes.func.isRequired,
  levelColor: PropTypes.string.isRequired
};

export default ModuleCard;
