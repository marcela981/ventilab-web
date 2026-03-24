/**
 * =============================================================================
 * LessonIndexNavigator Component for VentyLab
 * =============================================================================
 * 
 * Component that displays all lesson steps/pages as a navigable index.
 * Only visible when the module is fully completed (100%).
 * 
 * Features:
 * - Shows all lesson steps as clickable items
 * - Only enabled when module is completed
 * - Direct navigation to any step
 * - Visual indication of current step
 * - Read-only navigation (doesn't mark lessons as completed)
 * 
 * @component
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  Typography,
  Chip,
  IconButton,
  Collapse,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Tooltip,
} from '@mui/material';
import {
  MenuBook as MenuBookIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';

/**
 * LessonIndexNavigator - Component for navigating between lesson steps
 */
const LessonIndexNavigator = ({
  currentPage,
  totalPages,
  pages = [],
  isModuleCompleted = false,
  onNavigateToPage,
  moduleId,
  lessonId,
}) => {
  const [expanded, setExpanded] = React.useState(false);

  // Don't render if module is not completed
  if (!isModuleCompleted) {
    return null;
  }

  const handleToggle = () => {
    setExpanded(!expanded);
  };

  const handlePageClick = (pageIndex) => {
    if (onNavigateToPage && pageIndex >= 0 && pageIndex < totalPages) {
      onNavigateToPage(pageIndex);
      // Optionally collapse after navigation
      // setExpanded(false);
    }
  };

  // Get page type label for display
  const getPageLabel = (page, index) => {
    if (page?.type) {
      const typeLabels = {
        'header-intro': 'Introducción',
        'theory': page.section?.title || `Teoría ${page.sectionIndex + 1 || index + 1}`,
        'analogies': 'Analogías',
        'analogy': `Analogía ${page.analogyIndex + 1 || index + 1}`,
        'visual-elements': 'Elementos Visuales',
        'waveforms': 'Ondas',
        'parameter-tables': 'Tablas de Parámetros',
        'practical-case': `Caso Práctico ${page.caseIndex + 1 || index + 1}`,
        'key-points': 'Puntos Clave',
        'assessment': 'Autoevaluación',
        'references': 'Referencias',
        'completion': 'Completación',
        'clinical-case': 'Caso Clínico',
      };
      return typeLabels[page.type] || `Página ${index + 1}`;
    }
    return `Página ${index + 1}`;
  };

  return (
    <Paper
      sx={{
        position: 'fixed',
        top: 80,
        right: 16,
        zIndex: 1200,
        minWidth: 280,
        maxWidth: 320,
        maxHeight: 'calc(100vh - 100px)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'rgba(18, 18, 18, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 2,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 1.5,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          cursor: 'pointer',
        }}
        onClick={handleToggle}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MenuBookIcon sx={{ fontSize: 20, color: 'rgba(255, 255, 255, 0.8)' }} />
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 600,
              color: '#ffffff',
              fontSize: '0.875rem',
            }}
          >
            Índice de Lección
          </Typography>
        </Box>
        <IconButton
          size="small"
          sx={{
            color: 'rgba(255, 255, 255, 0.7)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
        >
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      {/* Content - Collapsible */}
      <Collapse in={expanded} timeout="auto">
        <Box
          sx={{
            overflowY: 'auto',
            maxHeight: 'calc(100vh - 200px)',
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
          <List dense sx={{ p: 0 }}>
            {Array.from({ length: totalPages }, (_, index) => {
              const page = pages[index] || {};
              const isCurrentPage = index === currentPage;
              const pageLabel = getPageLabel(page, index);

              return (
                <ListItem
                  key={index}
                  disablePadding
                  sx={{
                    borderLeft: isCurrentPage
                      ? '3px solid #2196F3'
                      : '3px solid transparent',
                    backgroundColor: isCurrentPage
                      ? 'rgba(33, 150, 243, 0.15)'
                      : 'transparent',
                  }}
                >
                  <ListItemButton
                    onClick={() => handlePageClick(index)}
                    sx={{
                      py: 1,
                      px: 1.5,
                      '&:hover': {
                        backgroundColor: isCurrentPage
                          ? 'rgba(33, 150, 243, 0.25)'
                          : 'rgba(255, 255, 255, 0.08)',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        width: '100%',
                      }}
                    >
                      {/* Step number */}
                      <Chip
                        label={index + 1}
                        size="small"
                        sx={{
                          minWidth: 32,
                          height: 24,
                          fontSize: '0.75rem',
                          fontWeight: isCurrentPage ? 700 : 500,
                          backgroundColor: isCurrentPage
                            ? '#2196F3'
                            : 'rgba(255, 255, 255, 0.1)',
                          color: isCurrentPage ? '#ffffff' : 'rgba(255, 255, 255, 0.8)',
                          border: isCurrentPage
                            ? 'none'
                            : '1px solid rgba(255, 255, 255, 0.2)',
                        }}
                      />

                      {/* Page label */}
                      <ListItemText
                        primary={
                          <Typography
                            variant="body2"
                            sx={{
                              fontSize: '0.8rem',
                              fontWeight: isCurrentPage ? 600 : 400,
                              color: isCurrentPage
                                ? '#ffffff'
                                : 'rgba(255, 255, 255, 0.85)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {pageLabel}
                          </Typography>
                        }
                        sx={{ m: 0 }}
                      />

                      {/* Current page indicator */}
                      {isCurrentPage && (
                        <CheckCircleIcon
                          sx={{
                            fontSize: 16,
                            color: '#2196F3',
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </Box>
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Box>
      </Collapse>

      {/* Footer - Current page info */}
      <Box
        sx={{
          p: 1,
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '0.7rem',
            textAlign: 'center',
            display: 'block',
          }}
        >
          Página {currentPage + 1} de {totalPages}
        </Typography>
      </Box>
    </Paper>
  );
};

LessonIndexNavigator.propTypes = {
  /**
   * Current active page index (0-based)
   */
  currentPage: PropTypes.number.isRequired,

  /**
   * Total number of pages in the lesson
   */
  totalPages: PropTypes.number.isRequired,

  /**
   * Array of page objects with type and metadata
   */
  pages: PropTypes.arrayOf(
    PropTypes.shape({
      type: PropTypes.string,
      index: PropTypes.number,
      section: PropTypes.object,
      sectionIndex: PropTypes.number,
      caseIndex: PropTypes.number,
      analogyIndex: PropTypes.number,
    })
  ),

  /**
   * Whether the module is fully completed (100%)
   */
  isModuleCompleted: PropTypes.bool.isRequired,

  /**
   * Callback function when user clicks a page to navigate
   * Receives (pageIndex) as parameter
   */
  onNavigateToPage: PropTypes.func.isRequired,

  /**
   * Module ID (for context)
   */
  moduleId: PropTypes.string,

  /**
   * Lesson ID (for context)
   */
  lessonId: PropTypes.string,
};

LessonIndexNavigator.defaultProps = {
  pages: [],
  moduleId: null,
  lessonId: null,
};

export default LessonIndexNavigator;
