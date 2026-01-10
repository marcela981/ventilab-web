import React from 'react';
import PropTypes from 'prop-types';
import { Box, Tabs, Tab, Typography } from '@mui/material';
import { Info, List as ListIcon } from '@mui/icons-material';
import styles from '@/styles/curriculum.module.css';

/**
 * Body de la LessonCard con tabs y contenido
 */
const LessonCardBody = ({
  activeTab,
  setActiveTab,
  lesson,
  isAvailable,
  handleCardBodyInteraction
}) => {
  return (
    <div
      className={styles.cardBody}
      role="region"
      aria-label="Contenido de la lección"
      tabIndex={isAvailable ? 0 : -1}
      onClick={handleCardBodyInteraction}
      onWheel={handleCardBodyInteraction}
      onTouchMove={handleCardBodyInteraction}
      onMouseDown={handleCardBodyInteraction}
    >
      {/* Tabs para organizar el contenido */}
      <Box sx={{ borderBottom: 1, borderColor: 'rgba(255, 255, 255, 0.2)', mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => {
            e.stopPropagation();
            setActiveTab(newValue);
          }}
          sx={{
            minHeight: 36,
            '& .MuiTab-root': {
              minHeight: 36,
              fontSize: '0.7rem',
              fontWeight: 500,
              color: 'rgba(255, 255, 255, 0.7)',
              textTransform: 'none',
              py: 0.5,
              px: 1,
              minWidth: 'auto',
              '&.Mui-selected': {
                color: '#ffffff',
                fontWeight: 600,
              },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#ffffff',
              height: 2,
            }
          }}
        >
          <Tab icon={<Info sx={{ fontSize: 14 }} />} iconPosition="start" label="Resumen" />
          <Tab icon={<ListIcon sx={{ fontSize: 14 }} />} iconPosition="start" label="Detalles" />
        </Tabs>
      </Box>

      {/* Contenido de los tabs */}
      <Box 
        sx={{ 
          display: 'flex',
          flexDirection: 'column',
          minHeight: '80px'
        }}
      >
        {activeTab === 0 && (
          <Typography
            variant="body2"
            sx={{
              color: isAvailable ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.5)',
              fontSize: '0.85rem',
              lineHeight: 1.6,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {lesson.description || 'Descripción no disponible'}
          </Typography>
        )}
        {activeTab === 1 && (
          <Box>
            <Typography
              variant="caption"
              sx={{
                color: isAvailable ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.5)',
                fontSize: '0.75rem'
              }}
            >
              {lesson.pages !== undefined && `Páginas: ${lesson.pages}`}
              {lesson.pages !== undefined && lesson.estimatedTime && ' • '}
              {lesson.estimatedTime && `Duración: ${Math.round(lesson.estimatedTime)} min`}
            </Typography>
          </Box>
        )}
      </Box>
    </div>
  );
};

LessonCardBody.propTypes = {
  activeTab: PropTypes.number.isRequired,
  setActiveTab: PropTypes.func.isRequired,
  lesson: PropTypes.object.isRequired,
  isAvailable: PropTypes.bool.isRequired,
  handleCardBodyInteraction: PropTypes.func.isRequired
};

export default LessonCardBody;

