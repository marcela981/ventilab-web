import React from 'react';
import PropTypes from 'prop-types';
import { Box, Chip, List, ListItem, ListItemIcon, ListItemText, Typography } from '@mui/material';
import { CheckCircle } from '@mui/icons-material';
import ModuleLessonsList from '../ModuleLessonsList/ModuleLessonsList';

/**
 * Contenido de los tabs de la ModuleCard
 */
const ModuleCardTabsContent = ({
  activeTab,
  module,
  isAvailable,
  completedLessons,
  onLessonClick
}) => {
  // Tab 0: Resumen
  if (activeTab === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        <Typography
          variant="body2"
          sx={{
            color: isAvailable ? '#ffffff' : '#9e9e9e',
            opacity: isAvailable ? 0.95 : 0.7,
            mb: 2,
            fontSize: '0.8rem',
            lineHeight: 1.6,
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
          }}
        >
          {module.learningObjectives?.[0] || module.description || 'Sin descripción disponible'}
        </Typography>
      </Box>
    );
  }

  // Tab 1: Lecciones
  if (activeTab === 1 && module.lessons && module.lessons.length > 0) {
    return (
      <ModuleLessonsList
        lessons={module.lessons}
        moduleId={module.id}
        completedLessons={completedLessons}
        onLessonClick={onLessonClick ? (lessonId) => onLessonClick(module.id, lessonId) : undefined}
        isModuleAvailable={isAvailable}
        maxLessonsToShow={999}
        showTitle={false}
      />
    );
  }

  // Tab 2: Detalles
  if (activeTab === 2) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        {/* Objetivos de Aprendizaje */}
        {module.learningObjectives && module.learningObjectives.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                fontSize: '0.75rem',
                color: '#ffffff',
                mb: 1,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
              }}
            >
              Objetivos de Aprendizaje
            </Typography>
            <List dense sx={{ py: 0 }}>
              {module.learningObjectives.map((objective, index) => (
                <ListItem key={index} sx={{ py: 0.5, px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 24 }}>
                    <CheckCircle sx={{ fontSize: 16, color: '#4CAF50' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: '0.75rem',
                          color: 'rgba(255, 255, 255, 0.9)',
                          lineHeight: 1.5,
                          wordBreak: 'break-word',
                          overflowWrap: 'break-word',
                        }}
                      >
                        {objective}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {/* Prerequisitos */}
        {module.prerequisites && module.prerequisites.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                fontSize: '0.75rem',
                color: '#ffffff',
                mb: 1,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
              }}
            >
              Prerequisitos
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {module.prerequisites.map((prereqId, index) => (
                <Chip
                  key={index}
                  label={prereqId}
                  size="small"
                  sx={{
                    fontSize: '0.65rem',
                    height: 20,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: '#ffffff !important',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    '& .MuiChip-label': {
                      color: '#ffffff !important',
                    }
                  }}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Información adicional */}
        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.7rem',
              color: 'rgba(255, 255, 255, 0.7)',
              display: 'block',
              mb: 0.5,
            }}
          >
            Nivel: {module.level || 'N/A'}
          </Typography>
          {module.bloomLevel && (
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.7rem',
                color: 'rgba(255, 255, 255, 0.7)',
                display: 'block',
                mb: 0.5,
              }}
            >
              Nivel de Bloom: {module.bloomLevel}
            </Typography>
          )}
          {module.estimatedTime && (
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.7rem',
                color: 'rgba(255, 255, 255, 0.7)',
                display: 'block',
              }}
            >
              Tiempo estimado: {module.estimatedTime}
            </Typography>
          )}
        </Box>
      </Box>
    );
  }

  return null;
};

ModuleCardTabsContent.propTypes = {
  activeTab: PropTypes.number.isRequired,
  module: PropTypes.object.isRequired,
  isAvailable: PropTypes.bool.isRequired,
  completedLessons: PropTypes.array.isRequired,
  onLessonClick: PropTypes.func
};

export default ModuleCardTabsContent;

