import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Box, Alert, AlertTitle, Button } from '@mui/material';
import useLesson from '../hooks/useLesson';

/**
 * Wrapper component for LessonViewer that handles errors
 * This component wraps LessonViewer to capture loading errors
 * and display them in a user-friendly manner
 *
 * @param {Object} props
 * @param {string} props.lessonId - ID of the lesson to display
 * @param {string} props.moduleId - ID of the module containing the lesson
 * @param {Function} props.onComplete - Callback when lesson is completed
 * @param {Function} props.onNavigate - Callback for navigation between lessons
 * @param {Function} props.onError - Callback when an error occurs
 * @param {Function} props.onBackToDashboard - Callback to return to dashboard
 * @param {Function} props.onProgressUpdate - Callback for progress updates
 * @param {React.ComponentType} props.LessonViewerComponent - The LessonViewer component to render
 */
const LessonViewerWrapper = ({
  lessonId,
  moduleId,
  onComplete,
  onNavigate,
  onError,
  onBackToDashboard,
  onProgressUpdate,
  LessonViewerComponent
}) => {
  const router = useRouter();
  const { data, isLoading, error, refetch } = useLesson(lessonId, moduleId);

  // Notify parent of errors
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  // Show error state if there's an error
  if (error && !isLoading) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={refetch}>
            Reintentar
          </Button>
        }
        sx={{ mb: 3 }}
      >
        <AlertTitle>Error al cargar la lección</AlertTitle>
        {error}
        {onBackToDashboard && (
          <Box sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={onBackToDashboard}
            >
              Volver al Curriculum
            </Button>
          </Box>
        )}
      </Alert>
    );
  }

  if (!LessonViewerComponent) {
    return null;
  }

  return (
    <LessonViewerComponent
      lessonId={lessonId}
      moduleId={moduleId}
      onComplete={onComplete}
      onNavigate={onNavigate}
      onProgressUpdate={onProgressUpdate}
    />
  );
};

export default LessonViewerWrapper;
