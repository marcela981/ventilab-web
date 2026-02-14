/**
 * =============================================================================
 * ModuleLessonProgressBar - Example Usage
 * =============================================================================
 * 
 * This file demonstrates how to integrate the ModuleLessonProgressBar
 * component into your module viewer or teaching component.
 */

import React, { useState, useCallback } from 'react';
import { Box, Container } from '@mui/material';
import ModuleLessonProgressBar from './ModuleLessonProgressBar';
import LessonViewer from './LessonViewer'; // Your existing lesson viewer

/**
 * Example 1: Basic Integration in a Module Viewer
 */
export const ModuleViewerExample: React.FC = () => {
  // State from your module context or props
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const moduleId = 'module-01';
  
  // These would come from your module data/progress
  const module = {
    id: moduleId,
    title: 'Fisiología Respiratoria',
    lessons: [
      { id: 'lesson-01', title: 'Introducción' },
      { id: 'lesson-02', title: 'Mecánica Respiratoria' },
      { id: 'lesson-03', title: 'Intercambio Gaseoso' },
      { id: 'lesson-04', title: 'Control de la Respiración' },
      { id: 'lesson-05', title: 'Caso Clínico' },
    ],
  };

  // Progress data from your progress context
  const completedLessons = new Set([0, 1, 2]); // Lessons 0, 1, 2 are completed
  const isModuleCompleted = completedLessons.size === module.lessons.length;

  /**
   * Handle lesson selection from progress bar
   * This is called when user clicks on a segment (only when module is completed)
   */
  const handleSelectLesson = useCallback((lessonIndex: number) => {
    console.log(`Navigating to lesson ${lessonIndex + 1}`);
    
    // Validate access (backend should also validate)
    if (!isModuleCompleted) {
      console.warn('Cannot navigate freely - module not completed');
      return;
    }

    // Navigate to the selected lesson
    setCurrentLessonIndex(lessonIndex);
    
    // Update URL or call your navigation function
    // Example: router.push(`/teaching/module/${moduleId}/lesson/${module.lessons[lessonIndex].id}`);
  }, [isModuleCompleted, moduleId, module.lessons]);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Progress Bar - Place at the top of your module viewer */}
      <ModuleLessonProgressBar
        totalLessons={module.lessons.length}
        currentLesson={currentLessonIndex}
        isModuleCompleted={isModuleCompleted}
        onSelectLesson={handleSelectLesson}
        lessonTitles={module.lessons.map(l => l.title)}
        completedLessons={completedLessons}
      />

      {/* Your existing lesson viewer */}
      <Box sx={{ mt: 3 }}>
        <LessonViewer
          lessonId={module.lessons[currentLessonIndex].id}
          moduleId={moduleId}
          onComplete={() => {
            // Mark lesson as complete and move to next
            completedLessons.add(currentLessonIndex);
            if (currentLessonIndex < module.lessons.length - 1) {
              setCurrentLessonIndex(currentLessonIndex + 1);
            }
          }}
        />
      </Box>
    </Container>
  );
};

/**
 * Example 2: Integration with Existing Progress Context
 */
export const ModuleViewerWithContext: React.FC = () => {
  // Assuming you have a useLearningProgress hook
  const {
    moduleProgressAggregated,
    currentLessonId,
    completedLessons,
  } = useLearningProgress(); // Your existing hook

  const moduleId = 'module-01';
  const module = getModuleById(moduleId); // Your data fetching
  
  // Get module progress
  const moduleProgress = moduleProgressAggregated[moduleId];
  const isModuleCompleted = moduleProgress?.isCompleted || false;

  // Get current lesson index
  const currentLessonIndex = module.lessons.findIndex(
    (l: any) => l.id === currentLessonId
  );

  /**
   * Handle lesson navigation
   */
  const handleNavigateToLesson = useCallback((lessonIndex: number) => {
    if (!isModuleCompleted) {
      console.warn('Sequential navigation enforced - module not complete');
      return;
    }

    const targetLesson = module.lessons[lessonIndex];
    if (!targetLesson) {
      console.error('Invalid lesson index:', lessonIndex);
      return;
    }

    // Navigate using your existing navigation function
    // Example: onNavigate(targetLesson.id, moduleId);
    console.log(`Navigating to ${targetLesson.id}`);
  }, [isModuleCompleted, module.lessons, moduleId]);

  return (
    <Box sx={{ width: '100%' }}>
      {/* Sticky progress bar at top */}
      <Box
        sx={{
          position: 'sticky',
          top: 64, // Below app bar
          zIndex: 1100,
          backgroundColor: 'rgba(18, 18, 18, 0.95)',
          backdropFilter: 'blur(10px)',
          py: 2,
          px: 3,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <ModuleLessonProgressBar
          totalLessons={module.lessons.length}
          currentLesson={Math.max(0, currentLessonIndex)}
          isModuleCompleted={isModuleCompleted}
          onSelectLesson={handleNavigateToLesson}
          lessonTitles={module.lessons.map((l: any) => l.title)}
          completedLessons={completedLessons}
        />
      </Box>

      {/* Lesson content */}
      <Box sx={{ px: 3 }}>
        {/* Your lesson viewer component */}
      </Box>
    </Box>
  );
};

/**
 * Example 3: Minimal Usage (Without Titles or Completed Set)
 */
export const MinimalUsage: React.FC = () => {
  const [currentLesson, setCurrentLesson] = useState(0);
  const totalLessons = 5;
  const isModuleCompleted = false; // Not completed yet

  return (
    <Box sx={{ p: 2 }}>
      <ModuleLessonProgressBar
        totalLessons={totalLessons}
        currentLesson={currentLesson}
        isModuleCompleted={isModuleCompleted}
        onSelectLesson={(index) => {
          console.log('Cannot navigate - module not completed');
        }}
      />
      
      {/* When module is not completed, bar is passive */}
      {/* User cannot click to navigate */}
    </Box>
  );
};

/**
 * Example 4: With All Features (Completed Module)
 */
export const FullFeaturedExample: React.FC = () => {
  const [currentLesson, setCurrentLesson] = useState(3);
  
  const lessonTitles = [
    'Anatomía Respiratoria',
    'Mecánica Ventilatoria',
    'Intercambio Gaseoso',
    'Volúmenes y Capacidades',
    'Patología Respiratoria',
  ];

  const completedLessons = new Set([0, 1, 2, 3, 4]); // All completed
  const isModuleCompleted = true;

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <ModuleLessonProgressBar
        totalLessons={5}
        currentLesson={currentLesson}
        isModuleCompleted={isModuleCompleted}
        onSelectLesson={(index) => {
          setCurrentLesson(index);
          console.log(`Navigated to lesson ${index + 1}`);
        }}
        lessonTitles={lessonTitles}
        completedLessons={completedLessons}
      />

      {/* When module is completed, all segments are clickable */}
      {/* Hover over any segment to see tooltip */}
      {/* Click to navigate */}
    </Box>
  );
};

// Export examples
export default {
  ModuleViewerExample,
  ModuleViewerWithContext,
  MinimalUsage,
  FullFeaturedExample,
};
