import { useMemo } from 'react';
import { useLearningProgress } from '@/features/progress/LearningProgressContext';

/**
 * useCurriculumProgress Hook
 * Get progress for all modules in curriculum
 * 
 * @param {Array} modules - Array of module objects with id and lessons
 * @returns {Object} Progress data by moduleId
 */
export default function useCurriculumProgress(modules) {
  const { getCurriculumProgress, progressByModule } = useLearningProgress();

  return useMemo(
    () => getCurriculumProgress(modules),
    [getCurriculumProgress, progressByModule, modules],
  );
}

