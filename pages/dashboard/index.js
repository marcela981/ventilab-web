// Next.js Dashboard Page - VentyLab
import React from 'react';
import { LearningProgressProvider } from '@/features/progress/LearningProgressContext';
import VentilatorDashboard from '@/features/simulador/simuladorVentilador/dashboard/componentes/VentilatorDashboard';

export default function Dashboard() {
  return (
    <LearningProgressProvider>
      <VentilatorDashboard />
    </LearningProgressProvider>
  );
}

