/**
 * =============================================================================
 * PanelLayout - Administrative Panel Layout
 * =============================================================================
 * Main layout wrapper for the administrative panel (/panel/*).
 * Includes a collapsible sidebar and main content area.
 *
 * This layout is visually distinct from the student dashboard and is only
 * accessible to users with teacher, admin, or superuser roles.
 * =============================================================================
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
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
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${currentDrawerWidth}px)` },
          ml: { sm: `${currentDrawerWidth}px` },
          backgroundColor: 'grey.50',
          minHeight: '100vh',
          transition: (theme) =>
            theme.transitions.create(['margin', 'width'], {
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

PanelLayout.propTypes = {
  /**
   * Page content to render in the main area
   */
  children: PropTypes.node.isRequired,
};

// Export drawer width constants for use in child components if needed
export { DRAWER_WIDTH_OPEN, DRAWER_WIDTH_CLOSED };
