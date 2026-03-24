import React, { useRef, useEffect } from 'react';
import {
  Button,
  Typography,
  Box,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  RocketLaunch as RocketIcon,
} from '@mui/icons-material';

/**
 * LessonNavigation - Componente para la navegación global de la lección
 * Botones al final del contenido como continuación visual.
 *
 * When the module is completed (isModuleCompleted === true), a compact numeric
 * lesson pagination strip is rendered between Previous and Next, allowing the
 * user to jump to any lesson freely.
 */
const LessonNavigation = ({
  currentPage,
  totalPages,
  data,
  onPrevPage,
  onNextPage,
  onNavigateToLesson,
  // Lesson-level navigation (only rendered when module is completed)
  isModuleCompleted = false,
  totalLessons = 0,
  currentLessonIndex = 0,
  onSelectLesson,
}) => {
  const paginationRef = useRef(null);

  // Auto-scroll the pagination strip so the active lesson is visible
  useEffect(() => {
    if (!paginationRef.current || !isModuleCompleted) return;
    const activeBtn = paginationRef.current.querySelector('[data-active="true"]');
    if (activeBtn) {
      activeBtn.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    }
  }, [currentLessonIndex, isModuleCompleted]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1.5,
        width: '100%',
        mt: 4,
        pt: 2,
      }}
    >
      {/* Numeric lesson pagination — only when module is completed */}
      {isModuleCompleted && totalLessons > 1 && onSelectLesson && (
        <Box
          ref={paginationRef}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            overflowX: 'auto',
            maxWidth: '100%',
            py: 0.5,
            px: 1,
            // Thin scrollbar for many lessons
            '&::-webkit-scrollbar': { height: 4 },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(255,255,255,0.3)',
              borderRadius: 2,
            },
          }}
        >
          {Array.from({ length: totalLessons }).map((_, index) => {
            const isActive = index === currentLessonIndex;
            return (
              <Box
                key={index}
                data-active={isActive ? 'true' : undefined}
                onClick={() => onSelectLesson(index)}
                sx={{
                  minWidth: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: isActive ? 700 : 400,
                  fontSize: '0.82rem',
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.7)',
                  backgroundColor: isActive
                    ? 'rgba(33,150,243,0.85)'
                    : 'rgba(255,255,255,0.08)',
                  border: isActive
                    ? '1.5px solid rgba(33,150,243,1)'
                    : '1px solid rgba(255,255,255,0.15)',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                  '&:hover': {
                    backgroundColor: isActive
                      ? 'rgba(33,150,243,0.95)'
                      : 'rgba(255,255,255,0.18)',
                    color: '#fff',
                  },
                }}
              >
                {index + 1}
              </Box>
            );
          })}
        </Box>
      )}

      {/* Previous / Page Info / Next row */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 2,
          width: '100%',
        }}
      >
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={onPrevPage}
          disabled={currentPage === 0}
          size="large"
          sx={{
            minWidth: { xs: 150, sm: 180 },
          }}
        >
          Anterior
        </Button>

        <Typography
          variant="body2"
          sx={{
            flex: 1,
            textAlign: 'center',
            fontWeight: 500,
          }}
        >
          Página {currentPage + 1} de {totalPages}
        </Typography>

        <Button
          variant="contained"
          endIcon={currentPage === totalPages - 1 ? <RocketIcon /> : <ArrowForwardIcon />}
          onClick={currentPage === totalPages - 1 && data?.navigation?.nextLesson
            ? () => onNavigateToLesson(data.navigation.nextLesson.id, data.moduleId)
            : onNextPage}
          disabled={currentPage === totalPages - 1 && !data?.navigation?.nextLesson}
          size="large"
          sx={{
            minWidth: { xs: 150, sm: 180 },
            background: currentPage === totalPages - 1
              ? 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)'
              : undefined,
            '&:hover': {
              background: currentPage === totalPages - 1
                ? 'linear-gradient(45deg, #1976D2 30%, #0D47A1 90%)'
                : undefined,
              boxShadow: currentPage === totalPages - 1
                ? '0 4px 12px rgba(33, 150, 243, 0.4)'
                : undefined,
            },
          }}
        >
          {currentPage === totalPages - 1
            ? (data?.navigation?.nextLesson ? 'Siguiente Lección' : 'Finalizar')
            : 'Siguiente'}
        </Button>
      </Box>
    </Box>
  );
};

export default LessonNavigation;

