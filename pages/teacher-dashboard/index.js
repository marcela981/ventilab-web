/**
 * =============================================================================
 * Teacher Dashboard Page
 * =============================================================================
 * 
 * Página de ejemplo que muestra cómo integrar el TeacherDashboard.
 * Esta página está protegida y solo accesible para usuarios con roles 
 * TEACHER o ADMIN.
 * 
 * Ruta: /teacher-dashboard
 * 
 * =============================================================================
 */

import React from 'react';
import { TeacherDashboard } from '../src/components/dashboard';

/**
 * Página del Dashboard de Profesor
 * El componente TeacherDashboard ya incluye la protección withAuth(['TEACHER', 'ADMIN'])
 */
export default function TeacherDashboardPage() {
  return <TeacherDashboard />;
}

