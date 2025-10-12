// Next.js Teaching Page - VentyLab
import React from 'react';
import { LearningProgressProvider } from '../src/contexts/LearningProgressContext';
import TeachingModule from '../src/components/teaching/TeachingModule';

export default function Teaching() {
  return (
    <LearningProgressProvider>
      <TeachingModule />
    </LearningProgressProvider>
  );
}
