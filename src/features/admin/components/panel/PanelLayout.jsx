/*
* Funcionalidad: PanelLayout - Administrative Panel Layout
* Descripción: Main layout wrapper for the administrative panel (/panel/*): collapsible PanelSidebar plus the main content area with the dark gradient. Visually distinct from the student area; only for teacher, admin and superuser roles. v1.1: the main area carries the global `vl-legacy-dark` scope (src/index.css) so raw headings/paragraphs/inputs keep their legacy light text now that the global body follows the light MUI theme.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import React, { useState } from 'react';
import { Box, CssBaseline } from '@mui/material';
import PanelSidebar from './PanelSidebar';

// Sidebar width constants
const DRAWER_WIDTH_OPEN = 260;
const DRAWER_WIDTH_CLOSED = 72;

/**
 * PanelLayout Component
 *
 * Provides the base layout structure for all admin panel pages.
 * Features a collapsible sidebar and responsive main content area.
 *
 * @component
 * @example
 * <PanelLayout>
 *   <DashboardContent />
 * </PanelLayout>
 */
export default function PanelLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleSidebarToggle = () => {
    setSidebarOpen((prev) => !prev);
  };

  // Calculate current drawer width based on open state
  const currentDrawerWidth = sidebarOpen ? DRAWER_WIDTH_OPEN : DRAWER_WIDTH_CLOSED;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />

      {/* Admin Panel Sidebar */}
      <PanelSidebar
        open={sidebarOpen}
        onToggle={handleSidebarToggle}
        drawerWidth={currentDrawerWidth}
      />

      {/* Main Content Area */}
      <Box
        component="main"
        className="vl-legacy-dark"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          p: 3,
          background: 'linear-gradient(160deg, #080d1a 0%, #0f1c35 55%, #0a1220 100%)',
          minHeight: '100vh',
          transition: (theme) =>
            theme.transitions.create(['width'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

// Export drawer width constants for use in child components if needed
export { DRAWER_WIDTH_OPEN, DRAWER_WIDTH_CLOSED };
