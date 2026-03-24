/**
 * =============================================================================
 * ModuleLessonNavigator Component for VentyLab
 * =============================================================================
 * 
 * Component that displays all lessons in a completed module as a navigable sidebar.
 * Only visible when the module is fully completed (100%).
 * 
 * Features:
 * - Shows all lessons as clickable items
 * - Only enabled when module is completed
 * - Direct navigation to any lesson
 * - Visual indication of current lesson
 * - Progress indicator for each lesson
 * - Free navigation (doesn't require sequential completion)
 * 
 * @component
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Chip,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  MenuBook as MenuBookIcon,
  CheckCircle as CheckCircleIcon,
  PlayCircleOutline as PlayCircleOutlineIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  Close as CloseIcon,
  LibraryBooks as LibraryBooksIcon,
} from '@mui/icons-material';

/**
 * ModuleLessonNavigator - Component for navigating between lessons in a completed module
 */
const ModuleLessonNavigator = ({
  open,
  onClose,
  lessons = [],
  currentLessonId,
  completedLessons = new Set(),
  isModuleCompleted = false,
  onNavigateToLesson,
  moduleTitle,
}) => {
  // Don't render if module is not completed
  if (!isModuleCompleted) {
    return null;
  }

  const handleLessonClick = (lessonId) => {
    if (onNavigateToLesson && lessonId) {
      onNavigateToLesson(lessonId);
      // Optionally close drawer after navigation
      if (onClose) {
        onClose();
      }
    }
  };

  const getLessonIcon = (lessonId) => {
    const isCompleted = completedLessons.has(lessonId);
    const isCurrent = lessonId === currentLessonId;

    if (isCompleted) {
      return <CheckCircleIcon sx={{ color: '#4caf50' }} />;
    } else if (isCurrent) {
      return <PlayCircleOutlineIcon sx={{ color: '#2196F3' }} />;
    } else {
      return <RadioButtonUncheckedIcon sx={{ color: 'rgba(255, 255, 255, 0.4)' }} />;
    }
  };

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: 320,
          backgroundColor: 'rgba(18, 18, 18, 0.98)',
          color: '#ffffff',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LibraryBooksIcon sx={{ color: '#2196F3' }} />
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
            Lecciones del Módulo
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            color: 'rgba(255, 255, 255, 0.7)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Module Title */}
      {moduleTitle && (
        <Box sx={{ p: 2, pb: 1 }}>
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.85rem',
              fontStyle: 'italic',
            }}
          >
            {moduleTitle}
          </Typography>
        </Box>
      )}

      {/* Completion Badge */}
      <Box sx={{ px: 2, pb: 2 }}>
        <Chip
          icon={<CheckCircleIcon sx={{ fontSize: 16, color: '#4caf50' }} />}
          label="Módulo Completado - Navegación Libre"
          size="small"
          sx={{
            backgroundColor: 'rgba(76, 175, 80, 0.15)',
            color: '#4caf50',
            border: '1px solid rgba(76, 175, 80, 0.3)',
            fontWeight: 500,
            fontSize: '0.75rem',
          }}
        />
      </Box>

      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

      {/* Lessons List */}
      <List
        sx={{
          flex: 1,
          overflowY: 'auto',
          py: 1,
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'rgba(255, 255, 255, 0.05)',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: 3,
            '&:hover': {
              background: 'rgba(255, 255, 255, 0.3)',
            },
          },
        }}
      >
        {lessons.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
              No hay lecciones disponibles
            </Typography>
          </Box>
        ) : (
          lessons.map((lesson, index) => {
            const isCompleted = completedLessons.has(lesson.id);
            const isCurrent = lesson.id === currentLessonId;

            return (
              <ListItem key={lesson.id} disablePadding>
                <Tooltip
                  title={isCompleted ? 'Lección completada' : 'Lección disponible'}
                  placement="right"
                  arrow
                >
                  <ListItemButton
                    onClick={() => handleLessonClick(lesson.id)}
                    sx={{
                      py: 1.5,
                      px: 2,
                      borderLeft: isCurrent
                        ? '3px solid #2196F3'
                        : '3px solid transparent',
                      backgroundColor: isCurrent
                        ? 'rgba(33, 150, 243, 0.15)'
                        : 'transparent',
                      '&:hover': {
                        backgroundColor: isCurrent
                          ? 'rgba(33, 150, 243, 0.25)'
                          : 'rgba(255, 255, 255, 0.05)',
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      {getLessonIcon(lesson.id)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: isCurrent ? 600 : 400,
                            color: isCurrent
                              ? '#ffffff'
                              : 'rgba(255, 255, 255, 0.85)',
                            fontSize: '0.9rem',
                          }}
                        >
                          {lesson.title || `Lección ${index + 1}`}
                        </Typography>
                      }
                      secondary={
                        lesson.estimatedTime ? (
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'rgba(255, 255, 255, 0.5)',
                              fontSize: '0.75rem',
                            }}
                          >
                            {lesson.estimatedTime} min
                          </Typography>
                        ) : null
                      }
                    />
                  </ListItemButton>
                </Tooltip>
              </ListItem>
            );
          })
        )}
      </List>

      {/* Footer */}
      <Box
        sx={{
          p: 2,
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '0.7rem',
            display: 'block',
            textAlign: 'center',
          }}
        >
          {completedLessons.size} de {lessons.length} lecciones completadas
        </Typography>
      </Box>
    </Drawer>
  );
};

ModuleLessonNavigator.propTypes = {
  /**
   * Whether the drawer is open
   */
  open: PropTypes.bool.isRequired,

  /**
   * Callback function when drawer is closed
   */
  onClose: PropTypes.func.isRequired,

  /**
   * Array of lesson objects
   */
  lessons: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string,
      estimatedTime: PropTypes.number,
    })
  ),

  /**
   * Current active lesson ID
   */
  currentLessonId: PropTypes.string,

  /**
   * Set of completed lesson IDs
   */
  completedLessons: PropTypes.instanceOf(Set),

  /**
   * Whether the module is fully completed (100%)
   */
  isModuleCompleted: PropTypes.bool.isRequired,

  /**
   * Callback function when user clicks a lesson to navigate
   * Receives (lessonId) as parameter
   */
  onNavigateToLesson: PropTypes.func.isRequired,

  /**
   * Module title for display
   */
  moduleTitle: PropTypes.string,
};

ModuleLessonNavigator.defaultProps = {
  lessons: [],
  currentLessonId: null,
  completedLessons: new Set(),
  moduleTitle: null,
};

export default ModuleLessonNavigator;
