import React from 'react';
import PropTypes from 'prop-types';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Avatar,
  Stack,
  Button
} from '@mui/material';
import {
  Psychology,
  Lightbulb,
  AutoAwesome
} from '@mui/icons-material';

/**
 * RecommendationsPanel - Panel de recomendaciones inteligentes
 * 
 * Muestra recomendaciones personalizadas basadas en el progreso del usuario:
 * - Próxima lección óptima (priority: high)
 * - Módulos para reforzar (priority: medium)
 * - Contenido para repasar (priority: low)
 * 
 * @param {Array} recommendations - Array de recomendaciones generadas
 * @param {Function} onRecommendationClick - Callback para manejar clicks en recomendaciones
 */
const RecommendationsPanel = ({ 
  recommendations = [], 
  onRecommendationClick 
}) => {
  // Ordenar recomendaciones por prioridad
  const sortedRecommendations = recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#e53935'; // error
      case 'medium': return '#ff9800'; // warning
      case 'low': return '#2196f3'; // info
      default: return '#7b1fa2';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Baja';
      default: return '';
    }
  };

  return (
    <Card sx={{ 
      height: '100%', 
      backgroundColor: '#f3e5f5',
      border: '2px solid #e1bee7',
      borderRadius: 2
    }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ 
          color: '#7b1fa2', 
          fontWeight: 600, 
          mb: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <Psychology sx={{ fontSize: 20 }} />
          Recomendaciones para Ti
        </Typography>
        
        <Stack spacing={2}>
          {sortedRecommendations.map((rec, index) => (
            <Box 
              key={index}
              sx={{ 
                p: 2,
                backgroundColor: 'rgba(255,255,255,0.7)',
                borderRadius: 2,
                border: '1px solid #e1bee7',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Avatar sx={{ 
                  width: 40, 
                  height: 40, 
                  backgroundColor: getPriorityColor(rec.priority),
                  border: `2px solid ${getPriorityColor(rec.priority)}20`
                }}>
                  {rec.icon}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="body2" sx={{ 
                      color: '#7b1fa2', 
                      fontWeight: 600
                    }}>
                      {rec.title}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: getPriorityColor(rec.priority),
                        fontWeight: 600,
                        backgroundColor: `${getPriorityColor(rec.priority)}20`,
                        px: 1,
                        py: 0.25,
                        borderRadius: 1,
                        fontSize: '0.7rem'
                      }}
                    >
                      {getPriorityLabel(rec.priority)}
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ 
                    color: '#7b1fa2',
                    display: 'block',
                    mb: 1.5
                  }}>
                    {rec.description}
                  </Typography>
                  {rec.action && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => rec.action()}
                      sx={{
                        borderColor: getPriorityColor(rec.priority),
                        color: getPriorityColor(rec.priority),
                        fontSize: '0.75rem',
                        height: 24,
                        '&:hover': {
                          backgroundColor: `${getPriorityColor(rec.priority)}10`,
                          borderColor: getPriorityColor(rec.priority)
                        }
                      }}
                    >
                      {rec.type === 'next-optimal' ? 'Continuar' :
                       rec.type === 'weak-module' ? 'Reforzar' :
                       rec.type === 'review' ? 'Repasar' : 'Ver'}
                    </Button>
                  )}
                </Box>
                <Lightbulb sx={{ color: '#7b1fa2', fontSize: 20, opacity: 0.7 }} />
              </Box>
            </Box>
          ))}
          
          {recommendations.length === 0 && (
            <Box sx={{ 
              p: 3,
              textAlign: 'center',
              backgroundColor: 'rgba(255,255,255,0.7)',
              borderRadius: 2
            }}>
              <AutoAwesome sx={{ fontSize: 32, color: '#7b1fa2', mb: 1 }} />
              <Typography variant="body2" sx={{ color: '#7b1fa2', fontWeight: 600, mb: 1 }}>
                ¡Excelente progreso!
              </Typography>
              <Typography variant="caption" sx={{ color: '#7b1fa2' }}>
                Continúa aprendiendo para obtener recomendaciones personalizadas.
              </Typography>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

RecommendationsPanel.propTypes = {
  recommendations: PropTypes.arrayOf(PropTypes.shape({
    type: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    icon: PropTypes.element.isRequired,
    action: PropTypes.func,
    priority: PropTypes.oneOf(['high', 'medium', 'low']).isRequired
  })),
  onRecommendationClick: PropTypes.func
};

export default RecommendationsPanel;
