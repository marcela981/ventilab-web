import React from 'react';
import PropTypes from 'prop-types';
import {
  Card,
  CardContent,
  CardActions,
  Button,
  Typography,
  Box,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip,
  useTheme
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
  const theme = useTheme();
  
  const status = moduleProgress === 100 ? 'completed' : 
                moduleProgress > 0 ? 'in-progress' : 
                isAvailable ? 'available' : 'locked';

  return (
    <Tooltip title={`${isAvailable ? `Disponible - ${moduleProgress.toFixed(0)}% completado` : 'Módulo bloqueado'}`} arrow placement="top">
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          cursor: isAvailable ? 'pointer' : 'default',
          opacity: isAvailable ? 1 : 0.6,
          border: status === 'available' ? '2px solid #2196F3' : 
                 status === 'in-progress' ? '2px solid #FF9800' :
                 status === 'completed' ? '2px solid #4CAF50' : '1px solid #e0e0e0',
          borderRadius: 2,
          position: 'relative',
          transition: 'all 0.3s ease',
          '&:hover': isAvailable ? {
            transform: 'translateY(-4px)',
            boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
          } : {}
        }}
        onClick={() => isAvailable && onModuleClick(module.id)}
      >
        {/* Estado del módulo */}
        <Box sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 1
        }}>
          {getStatusIcon(status)}
        </Box>

        {/* Botón de favorito */}
        <Box sx={{
          position: 'absolute',
          top: 8,
          left: 8,
          zIndex: 1
        }}>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(module.id);
            }}
            sx={{
              backgroundColor: 'rgba(255,255,255,0.9)',
              '&:hover': { backgroundColor: 'rgba(255,255,255,1)' }
            }}
          >
            {isFavorite ? 
              <Bookmark sx={{ color: '#FF9800', fontSize: 16 }} /> : 
              <BookmarkBorder sx={{ color: '#666', fontSize: 16 }} />
            }
          </IconButton>
        </Box>

        <CardContent sx={{ flexGrow: 1, pt: 4 }}>
          <Typography variant="h6" sx={{ 
            fontWeight: 600, 
            mb: 1,
            color: isAvailable ? '#2c3e50' : '#9e9e9e'
          }}>
            {module.title}
          </Typography>
          
          <Typography variant="body2" sx={{ 
            color: '#6c757d', 
            mb: 2,
            fontSize: '0.85rem',
            lineHeight: 1.4
          }}>
            {module.learningObjectives?.[0] || module.description}
          </Typography>

          {/* Progreso del módulo */}
          <Box sx={{ mb: 2 }}>
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

          {/* Metadatos */}
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
        </CardContent>

        <CardActions sx={{ p: 2, pt: 0 }}>
          <Button
            variant={status === 'completed' ? 'outlined' : 'contained'}
            fullWidth
            disabled={!isAvailable}
            startIcon={getButtonIcon(status)}
            sx={{
              fontSize: '0.85rem',
              fontWeight: 600,
              backgroundColor: isAvailable ? levelColor : 'transparent',
              borderColor: isAvailable ? levelColor : '#e0e0e0',
              color: isAvailable ? '#fff' : '#9e9e9e',
              '&:hover': isAvailable ? {
                backgroundColor: levelColor,
                filter: 'brightness(0.9)'
              } : {}
            }}
          >
            {getButtonText(status)}
          </Button>
        </CardActions>
      </Card>
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
