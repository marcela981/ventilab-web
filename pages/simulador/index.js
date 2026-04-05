import React from 'react';
import { LearningProgressProvider } from '@/features/progress/LearningProgressContext';
import VentilatorDashboard from '@/features/simulador/simuladorVentilador/dashboard/componentes/VentilatorDashboard';

export default function SimuladorPage() {
  return (
    <LearningProgressProvider>
      <VentilatorDashboard />
    </LearningProgressProvider>
  );
}
