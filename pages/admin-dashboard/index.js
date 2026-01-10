/**
 * =============================================================================
 * Admin Dashboard Page
 * =============================================================================
 * 
 * Página de ejemplo que muestra cómo integrar el AdminDashboard.
 * Esta página está protegida y solo accesible para usuarios con rol ADMIN.
 * 
 * Ruta: /admin-dashboard
 * 
 * =============================================================================
 */

import React from 'react';
import { AdminDashboard } from '@/components/dashboard';

/**
 * Página del Dashboard de Administrador
 * El componente AdminDashboard ya incluye la protección withAuth(['ADMIN'])
 */
export default function AdminDashboardPage() {
  return <AdminDashboard />;
}

