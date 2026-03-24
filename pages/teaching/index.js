// Next.js Teaching Page - VentyLab
import React from 'react';
import { LearningProgressProvider } from '@/features/progress/LearningProgressContext';
import TeachingModule from '@/features/ensenanza/shared/components/pages/TeachingModule';

export default function Teaching() {
  return (
    <LearningProgressProvider>
      <TeachingModule />
    </LearningProgressProvider>
  );
}

