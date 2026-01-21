/**
 * LessonViewerRouteAdapter
 * 
 * Adapter component to bridge the old route page interface with the canonical LessonViewer.
 * This allows the route page to use the same LessonViewer as TeachingModule without breaking changes.
 * 
 * @param {string} moduleId - Module identifier
 * @param {string} lessonId - Lesson identifier
 * @param {Function} onClose - Callback when closing the lesson (maps to onNavigate)
 * @param {Function} onNavigateLesson - Callback for navigating to another lesson (maps to onNavigate)
 * @param {Function} onMarkComplete - Callback when lesson is marked complete (maps to onComplete)
 */
import React from 'react';
import { useRouter } from 'next/router';
// Import canonical LessonViewer (same one used by TeachingModule)
import LessonViewer from '../../components/teaching/components/LessonViewer';

const LessonViewerRouteAdapter = ({ 
  moduleId, 
  lessonId, 
  onClose, 
  onNavigateLesson, 
  onMarkComplete 
}) => {
  const router = useRouter();

  // Map old callbacks to new interface
  const handleNavigate = React.useCallback((targetModuleId, targetLessonId) => {
    if (onNavigateLesson) {
      onNavigateLesson(targetModuleId, targetLessonId);
    } else if (targetModuleId && targetLessonId) {
      router.push(`/teaching/${targetModuleId}/${targetLessonId}`);
    }
  }, [onNavigateLesson, router]);

  const handleComplete = React.useCallback(() => {
    if (onMarkComplete) {
      onMarkComplete();
    }
    // Optionally navigate back to teaching dashboard
    if (onClose) {
      onClose();
    }
  }, [onMarkComplete, onClose]);

  const handleClose = React.useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      router.push('/teaching');
    }
  }, [onClose, router]);

  return (
    <LessonViewer
      moduleId={moduleId}
      lessonId={lessonId}
      onNavigate={handleNavigate}
      onComplete={handleComplete}
      onProgressUpdate={(progress) => {
        // Progress updates can be handled by the context
        // This is optional and can be extended if needed
      }}
    />
  );
};

export default LessonViewerRouteAdapter;
