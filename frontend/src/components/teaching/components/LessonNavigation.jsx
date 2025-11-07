import React from 'react';
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
 * Botones al final del contenido como continuación visual
 */
const LessonNavigation = ({
  currentPage,
  totalPages,
  data,
  onPrevPage,
  onNextPage,
  onNavigateToLesson,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 2,
        width: '100%',
        mt: 4,
        pt: 2,
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
  );
};

export default LessonNavigation;

