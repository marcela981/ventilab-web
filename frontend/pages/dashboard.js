// Next.js Dashboard Page - VentyLab
import React from 'react';
import { LearningProgressProvider } from '../src/contexts/LearningProgressContext';
import VentilatorDashboard from '../src/components/VentilatorDashboard';

export default function Dashboard() {
  return (
    <LearningProgressProvider>
      <VentilatorDashboard />
    </LearningProgressProvider>
  );
}
