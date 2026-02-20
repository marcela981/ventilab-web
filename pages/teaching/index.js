// Next.js Teaching Page - VentyLab
import React from 'react';
import { LearningProgressProvider } from '@/features/progress/LearningProgressContext';
import TeachingModule from '@/features/teaching/TeachingModule';

export default function Teaching() {
  return (
    <LearningProgressProvider>
      <TeachingModule />
    </LearningProgressProvider>
  );
}

