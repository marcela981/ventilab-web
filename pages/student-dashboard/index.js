/**
 * =============================================================================
 * Student Dashboard Page
 * =============================================================================
 * 
 * Página de ejemplo que muestra cómo integrar el StudentDashboard.
 * Esta página está protegida y solo accesible para usuarios con rol STUDENT.
 * 
 * Ruta: /student-dashboard
 * 
 * =============================================================================
 */

import React from 'react';
import { StudentDashboard } from '@/components/dashboard';

/**
 * Página del Dashboard de Estudiante
 * El componente StudentDashboard ya incluye la protección withAuth(['STUDENT'])
 */
export default function StudentDashboardPage() {
  return <StudentDashboard />;
}

