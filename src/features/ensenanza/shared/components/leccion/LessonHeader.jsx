import React from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Paper,
  Typography,
  Breadcrumbs,
  Link,
  IconButton,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  Home,
  School,
  Close,
  AccessTime,
  Timer,
  Menu
} from '@mui/icons-material';

/**
 * LessonHeader - Componente de encabezado de lección
 *
 * Muestra breadcrumb, título, progreso y botones de control.
 *
 * @param {Object} lesson - Datos de la lección
 * @param {string} levelTitle - Título del nivel
 * @param {number} currentSectionIndex - Índice de la sección actual
 * @param {number} completedSectionsCount - Número de secciones completadas
 * @param {number} estimatedTimeRemaining - Tiempo estimado restante
 * @param {boolean} isMobile - Indica si está en mobile
 * @param {Function} onClose - Callback para cerrar lección
 * @param {Function} onToggleSidebar - Callback para toggle del sidebar
 * @param {Object} theme - Theme de Material UI
 * @returns {JSX.Element} Componente de encabezado
 */
const LessonHeader = ({
  lesson,
  levelTitle,
  currentSectionIndex,
  completedSectionsCount,
  estimatedTimeRemaining,
  isMobile,
  onClose,
  onToggleSidebar,
  theme
}) => {
  const router = useRouter();

  return (
    <Paper elevation={2} sx={{ p: 2, zIndex: 1200 }}>
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          {/* Breadcrumbs dinámicos */}
          <Breadcrumbs aria-label="breadcrumb" sx={{ flex: 1 }}>
            <Link
              underline="hover"
              color="inherit"
              href="/"
              sx={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                '&:hover': { color: theme.palette.primary.main }
              }}
              onClick={(e) => {
                e.preventDefault();
                router.push('/');
              }}
            >
              <Home sx={{ mr: 0.5 }} fontSize="inherit" />
              Inicio
            </Link>
            <Link
              underline="hover"
              color="inherit"
              sx={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                '&:hover': { color: theme.palette.primary.main }
              }}
              onClick={(e) => {
                e.preventDefault();
                router.push('/teaching');
              }}
            >
              <School sx={{ mr: 0.5 }} fontSize="inherit" />
              Aprender
            </Link>
            <Link
              underline="hover"
              color="inherit"
              sx={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                '&:hover': { color: theme.palette.primary.main }
              }}
              onClick={(e) => {
                e.preventDefault();
                router.push(`/teaching?level=${lesson.level}`);
              }}
            >
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                {levelTitle}
              </Typography>
            </Link>
            <Link
              underline="hover"
              color="inherit"
              sx={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                '&:hover': { color: theme.palette.primary.main }
              }}
              onClick={(e) => {
                e.preventDefault();
                router.push(`/teaching?module=${lesson.moduleId}`);
              }}
            >
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                {lesson.moduleName}
              </Typography>
            </Link>
            <Typography
              color="text.primary"
              sx={{
                display: 'flex',
                alignItems: 'center',
                fontWeight: 600
              }}
            >
              {lesson.title}
            </Typography>
          </Breadcrumbs>

          {/* Botón cerrar */}
          <IconButton onClick={onClose} size="large">
            <Close />
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          {/* Título y tiempo */}
          <div>
            <Typography variant={isMobile ? "h5" : "h4"} component="h1" gutterBottom>
              {lesson.title}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Chip
                icon={<AccessTime />}
                label={`${lesson.estimatedTime} min estimados`}
                size="small"
                variant="outlined"
                color="primary"
              />
              {estimatedTimeRemaining > 0 && (
                <Chip
                  icon={<Timer />}
                  label={`${Math.round(estimatedTimeRemaining)} min restantes`}
                  size="small"
                  variant="filled"
                  color={estimatedTimeRemaining < 5 ? 'error' : estimatedTimeRemaining < 10 ? 'warning' : 'success'}
                />
              )}
              <Typography variant="body2" color="text.secondary">
                Sección {currentSectionIndex + 1} de {lesson.sections?.length || 0}
              </Typography>
            </Box>
          </div>

          {/* Botón sidebar mobile */}
          {isMobile && (
            <IconButton onClick={onToggleSidebar}>
              <Menu />
            </IconButton>
          )}
        </Box>

        {/* Progreso de la lección */}
        <Box sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Progreso de la Lección
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {Math.round((completedSectionsCount / (lesson.sections?.length || 1)) * 100)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={(completedSectionsCount / (lesson.sections?.length || 1)) * 100}
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>
      </Container>
    </Paper>
  );
};

export default LessonHeader;
