import React from 'react';
import PropTypes from 'prop-types';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Avatar,
  Stack,
  useTheme
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
 * - Próxima lección óptima
 * - Módulos para reforzar
 * - Contenido para repasar
 * 
 * @param {Array} recommendations - Array de recomendaciones generadas
 * @param {Function} onRecommendationClick - Callback para manejar clicks en recomendaciones
 */
const RecommendationsPanel = ({ 
  recommendations = [], 
  onRecommendationClick 
}) => {
  const theme = useTheme();

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
          Recomendaciones Inteligentes
        </Typography>
        
        <Stack spacing={2}>
          {recommendations.map((rec, index) => (
            <Box 
              key={index}
              sx={{ 
                p: 2,
                backgroundColor: 'rgba(255,255,255,0.7)',
                borderRadius: 2,
                border: '1px solid #e1bee7',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                }
              }}
              onClick={() => onRecommendationClick && onRecommendationClick(rec)}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ 
                  width: 32, 
                  height: 32, 
                  backgroundColor: rec.priority === 'high' ? '#e53935' :
                                 rec.priority === 'medium' ? '#ff9800' : '#2196f3'
                }}>
                  {rec.icon}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ 
                    color: '#7b1fa2', 
                    fontWeight: 600,
                    mb: 0.5
                  }}>
                    {rec.title}
                  </Typography>
                  <Typography variant="caption" sx={{ 
                    color: '#7b1fa2',
                    display: 'block'
                  }}>
                    {rec.description}
                  </Typography>
                </Box>
                <Lightbulb sx={{ color: '#7b1fa2', fontSize: 20 }} />
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
              <Typography variant="body2" sx={{ color: '#7b1fa2' }}>
                ¡Excelente progreso! Continúa aprendiendo para obtener recomendaciones personalizadas.
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
