'use client';

import { useContext, useMemo } from 'react';
import LearningProgressContext from '@/contexts/LearningProgressContext';

export default function useCurriculumProgress(modules) {
  const { getCurriculumProgress, progressVersion } = useContext(LearningProgressContext);

  return useMemo(
    () => getCurriculumProgress(modules),
    [getCurriculumProgress, progressVersion, modules],
  );
}

