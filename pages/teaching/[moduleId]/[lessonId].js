// Next.js Dynamic Lesson Page - VentyLab
// Route: /teaching/[moduleId]/[lessonId]
import React from 'react';
import { useRouter } from 'next/router';
import { LearningProgressProvider } from '../../../src/contexts/LearningProgressContext';
// Use the canonical LessonViewer via adapter (same one used by TeachingModule)
import LessonViewerRouteAdapter from '../../../src/features/teaching/pages/LessonViewerRouteAdapter';

export default function LessonPage() {
  const router = useRouter();
  const { moduleId, lessonId } = router.query;

  // Handler para cerrar la lección y volver al módulo de enseñanza
  const handleClose = () => {
    router.push('/teaching');
  };

  // Handler para navegar a otra lección
  const handleNavigateLesson = (targetModuleId, targetLessonId) => {
    router.push(`/teaching/${targetModuleId}/${targetLessonId}`);
  };

  // Handler para marcar lección como completada
  const handleMarkComplete = () => {
    // Esta funcionalidad es manejada por el contexto LearningProgress
    // No necesita implementación adicional aquí
  };

  // Mostrar loading mientras se obtienen los parámetros de la ruta
  if (!moduleId || !lessonId) {
    return null;
  }

  return (
    <LearningProgressProvider>
      <LessonViewerRouteAdapter
        moduleId={moduleId}
        lessonId={lessonId}
        onClose={handleClose}
        onNavigateLesson={handleNavigateLesson}
        onMarkComplete={handleMarkComplete}
      />
    </LearningProgressProvider>
  );
}
