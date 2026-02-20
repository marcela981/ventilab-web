import React, { Suspense, lazy } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  Box,
  Typography,
  Alert,
  AlertTitle,
  IconButton,
  Breadcrumbs,
  Link,
  Button,
  CircularProgress,
  LinearProgress,
  Fade
} from '@mui/material';
import {
  ArrowBack,
  Home as HomeIcon,
  NavigateNext
} from '@mui/icons-material';
import LessonViewerWrapper from './LessonViewerWrapper';

// Lazy load LessonViewer for better performance
const LessonViewer = lazy(() => import('./LessonViewer'));

/**
 * TeachingLessonView - Displays a lesson with breadcrumbs, navigation, and progress
 *
 * This component handles the full lesson viewing experience including:
 * - SEO meta tags
 * - Breadcrumb navigation
 * - Back button
 * - Progress bar
 * - Error handling for prerequisites
 * - LessonViewer wrapper with Suspense
 *
 * @param {Object} props
 * @param {string} props.lessonId - ID of the lesson being viewed
 * @param {string} props.moduleId - ID of the module containing the lesson
 * @param {Object} props.lessonInfo - Information about the lesson (moduleTitle, lessonTitle, moduleLevel)
 * @param {Object} props.lessonProgress - Current progress ({ currentPage, totalPages })
 * @param {Object|null} props.lessonError - Error object if there's an error
 * @param {Function} props.onBackToDashboard - Callback to return to dashboard
 * @param {Function} props.onLessonComplete - Callback when lesson is completed
 * @param {Function} props.onNavigateLesson - Callback for navigating between lessons
 * @param {Function} props.onLessonError - Callback when lesson error occurs
 * @param {Function} props.onProgressUpdate - Callback for progress updates
 */
const TeachingLessonView = ({
  lessonId,
  moduleId,
  lessonInfo,
  lessonProgress,
  lessonError,
  onBackToDashboard,
  onLessonComplete,
  onNavigateLesson,
  onLessonError,
  onProgressUpdate
}) => {
  const router = useRouter();

  const progressPercentage = lessonProgress.totalPages > 0
    ? ((lessonProgress.currentPage + 1) / lessonProgress.totalPages) * 100
    : 0;

  return (
    <>
      {/* SEO Head */}
      {lessonInfo && (
        <Head>
          <title>{`${lessonInfo.lessonTitle} - VentyLab`}</title>
          <meta
            name="description"
            content={`Aprende sobre ${lessonInfo.lessonTitle} en el módulo ${lessonInfo.moduleTitle}. Curso de ventilación mecánica para profesionales de la salud.`}
          />
          <meta
            name="keywords"
            content={`ventilación mecánica, ${lessonInfo.lessonTitle}, ${lessonInfo.moduleTitle}, medicina intensiva, respiración artificial`}
          />
          <meta property="og:title" content={`${lessonInfo.lessonTitle} - VentyLab`} />
          <meta property="og:description" content={`Aprende sobre ${lessonInfo.lessonTitle} en VentyLab`} />
          <meta property="og:type" content="article" />
        </Head>
      )}

      <Fade in timeout={500}>
        <Box>
          {/* Breadcrumbs de navegación */}
          {lessonInfo && (
            <Breadcrumbs
              separator={<NavigateNext fontSize="small" />}
              aria-label="breadcrumb"
              sx={{ mb: 3 }}
            >
              <Link
                component="button"
                variant="body1"
                onClick={() => router.push('/teaching')}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  color: 'text.secondary',
                  textDecoration: 'none',
                  '&:hover': { color: 'primary.main' },
                  cursor: 'pointer'
                }}
              >
                <HomeIcon sx={{ mr: 0.5, fontSize: 20 }} />
                Inicio
              </Link>
              <Link
                component="button"
                variant="body1"
                onClick={onBackToDashboard}
                sx={{
                  color: 'text.secondary',
                  textDecoration: 'none',
                  '&:hover': { color: 'primary.main' },
                  cursor: 'pointer'
                }}
              >
                Módulo de Enseñanza
              </Link>
              <Link
                component="button"
                variant="body1"
                onClick={() => {
                  // Volver al curriculum pero manteniendo el módulo
                  const { lessonId: _lessonId, category, ...restQuery } = router.query;
                  router.push(
                    {
                      pathname: router.pathname,
                      query: { ...restQuery, tab: 'curriculum' }
                    },
                    undefined,
                    { shallow: true }
                  );
                }}
                sx={{
                  color: 'text.secondary',
                  textDecoration: 'none',
                  '&:hover': { color: 'primary.main' },
                  cursor: 'pointer'
                }}
              >
                {lessonInfo.moduleTitle}
              </Link>
              <Typography color="text.primary" sx={{ fontWeight: 600 }}>
                {lessonInfo.lessonTitle}
              </Typography>
            </Breadcrumbs>
          )}

          {/* Botón para volver */}
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton
              onClick={onBackToDashboard}
              sx={{
                backgroundColor: 'background.paper',
                boxShadow: 2,
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              }}
              aria-label="Volver"
            >
              <ArrowBack />
            </IconButton>
            <Typography
              component="span"
              sx={{ color: 'text.secondary', fontWeight: 500 }}
            >
              Volver
            </Typography>
          </Box>

          {/* Barra de progreso de la lección */}
          {lessonProgress.totalPages > 0 && (
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                  Progreso de la lección
                </Typography>
                <Typography variant="caption" fontWeight={600} sx={{ color: '#ffffff' }}>
                  {Math.round(progressPercentage)}% ({lessonProgress.currentPage + 1} / {lessonProgress.totalPages})
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={progressPercentage}
                sx={{
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: progressPercentage >= 100 ? '#4CAF50' : '#2196f3',
                    borderRadius: 5,
                    boxShadow: progressPercentage >= 100
                      ? '0 2px 4px rgba(76, 175, 80, 0.4)'
                      : '0 2px 4px rgba(33, 150, 243, 0.3)',
                    transition: 'transform 0.3s ease-in-out, background-color 0.3s ease',
                  },
                }}
              />
            </Box>
          )}

          {/* Manejo de errores de prerequisitos */}
          {lessonError && lessonError.missingPrerequisites && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              <AlertTitle>Lección no disponible</AlertTitle>
              {lessonError.details}
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                  Prerequisitos pendientes:
                </Typography>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {lessonError.missingPrerequisites.map((prereq, index) => (
                    <li key={index}>
                      <Typography variant="body2">{prereq}</Typography>
                    </li>
                  ))}
                </ul>
              </Box>
              <Button
                variant="outlined"
                size="small"
                onClick={onBackToDashboard}
                sx={{ mt: 2 }}
              >
                Volver al Curriculum
              </Button>
            </Alert>
          )}

          {/* Componente LessonViewer con Suspense y manejo de errores */}
          {!lessonError && (
            <Suspense
              fallback={
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                  <CircularProgress />
                </Box>
              }
            >
              <LessonViewerWrapper
                lessonId={lessonId}
                moduleId={moduleId}
                onComplete={onLessonComplete}
                onNavigate={onNavigateLesson}
                onError={onLessonError}
                onBackToDashboard={onBackToDashboard}
                onProgressUpdate={onProgressUpdate}
                LessonViewerComponent={LessonViewer}
              />
            </Suspense>
          )}
        </Box>
      </Fade>
    </>
  );
};

export default TeachingLessonView;
