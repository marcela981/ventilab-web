import React from 'react';
import {
  Button,
  Typography,
  Container,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  RocketLaunch as RocketIcon,
} from '@mui/icons-material';

/**
 * LessonNavigation - Componente para la navegación global de la lección
 * Botones fijos al final del contenido sin superponerse al sidebar
 */
const LessonNavigation = ({
  currentPage,
  totalPages,
  data,
  onPrevPage,
  onNextPage,
  onNavigateToLesson,
}) => {
  const theme = useTheme();
  
  return (
    <Container
      sx={{
        position: 'fixed',
        bottom: 0,
        left: { xs: 0, sm: '240px' }, // Respeta el espacio del sidebar
        right: { xs: 0, sm: 'auto' },
        width: { xs: '100%', sm: 'calc(100% - 240px)' }, // Ancho menos el sidebar
        maxWidth: { xs: '100%', sm: '1200px' }, // max-width estándar de lg
        zIndex: theme.zIndex.appBar + 5,
        p: 2,
        px: 3,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 2,
        backgroundColor: 'transparent', // Sin fondo
        margin: '0 auto', // Centra el contenido
      }}
    >
      <Button
        variant="outlined"
        startIcon={<ArrowBackIcon />}
        onClick={onPrevPage}
        disabled={currentPage === 0}
        size="large"
        sx={{
          minWidth: { xs: 120, sm: 150 },
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
          minWidth: { xs: 150, sm: 200 },
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
    </Container>
  );
};

export default LessonNavigation;

