import React from 'react';
import PropTypes from 'prop-types';
import { Box, Tabs, Tab } from '@mui/material';
import { Info, School, List as ListIcon } from '@mui/icons-material';
import ModuleCardTabsContent from './ModuleCardTabsContent';
import styles from '@/styles/curriculum.module.css';

/**
 * Body de la ModuleCard con tabs y contenido
 */
const ModuleCardBody = ({
  activeTab,
  setActiveTab,
  module,
  isAvailable,
  completedLessons,
  onLessonClick,
  handleCardBodyInteraction
}) => {
  return (
    <div
      className={styles.cardBody}
      role="region"
      aria-label="Contenido del módulo"
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
          {module.lessons && module.lessons.length > 0 && (
            <Tab icon={<School sx={{ fontSize: 14 }} />} iconPosition="start" label={`Lecciones (${module.lessons.length})`} />
          )}
          <Tab icon={<ListIcon sx={{ fontSize: 14 }} />} iconPosition="start" label="Detalles" />
        </Tabs>
      </Box>

      {/* Contenido de los tabs */}
      <Box 
        sx={{ 
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <ModuleCardTabsContent
          activeTab={activeTab}
          module={module}
          isAvailable={isAvailable}
          completedLessons={completedLessons}
          onLessonClick={onLessonClick}
        />
      </Box>
    </div>
  );
};

ModuleCardBody.propTypes = {
  activeTab: PropTypes.number.isRequired,
  setActiveTab: PropTypes.func.isRequired,
  module: PropTypes.object.isRequired,
  isAvailable: PropTypes.bool.isRequired,
  completedLessons: PropTypes.array.isRequired,
  onLessonClick: PropTypes.func,
  handleCardBodyInteraction: PropTypes.func.isRequired
};

export default ModuleCardBody;

