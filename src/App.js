import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Box, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import Sidebar from './components/navigation/Sidebar';
import VentilatorDashboard from './components/VentilatorDashboard';
import TeachingModule from './components/teaching/TeachingModule';
import { LearningProgressProvider } from './contexts/LearningProgressContext';

// Admin Panel Components
import {
  PanelLayout,
  ProtectedPanelRoute,
  PanelDashboard,
  PanelTeaching,
  PanelStudents,
  PanelStudentDetail,
  PanelStatistics,
  PanelSettings,
} from './components/panel';

import './App.css';

// Create a theme for consistent styling
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

/**
 * Main App Layout Component
 * Wraps content with the student-facing sidebar
 */
function MainLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <Sidebar open={sidebarOpen} onToggle={handleSidebarToggle} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${sidebarOpen ? 240 : 64}px)` },
          ml: { sm: `${sidebarOpen ? 240 : 64}px` },
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

function App() {
  return (
    <ThemeProvider theme={theme}>
      <LearningProgressProvider>
        <BrowserRouter>
          <CssBaseline />
          <Routes>
            {/* Admin Panel Routes - Protected, requires teacher+ role */}
            {/* These routes use their own PanelLayout, separate from student sidebar */}
            <Route
              path="/panel"
              element={
                <ProtectedPanelRoute>
                  <PanelLayout>
                    <PanelDashboard />
                  </PanelLayout>
                </ProtectedPanelRoute>
              }
            />
            <Route
              path="/panel/teaching"
              element={
                <ProtectedPanelRoute>
                  <PanelLayout>
                    <PanelTeaching />
                  </PanelLayout>
                </ProtectedPanelRoute>
              }
            />
            <Route
              path="/panel/students"
              element={
                <ProtectedPanelRoute>
                  <PanelLayout>
                    <PanelStudents />
                  </PanelLayout>
                </ProtectedPanelRoute>
              }
            />
            <Route
              path="/panel/students/:id"
              element={
                <ProtectedPanelRoute>
                  <PanelLayout>
                    <PanelStudentDetail />
                  </PanelLayout>
                </ProtectedPanelRoute>
              }
            />
            <Route
              path="/panel/statistics"
              element={
                <ProtectedPanelRoute>
                  <PanelLayout>
                    <PanelStatistics />
                  </PanelLayout>
                </ProtectedPanelRoute>
              }
            />
            {/* Settings requires admin role */}
            <Route
              path="/panel/settings"
              element={
                <ProtectedPanelRoute requiredRole="admin">
                  <PanelLayout>
                    <PanelSettings />
                  </PanelLayout>
                </ProtectedPanelRoute>
              }
            />

            {/* Main App Routes - Use student-facing sidebar layout */}
            <Route
              path="/*"
              element={
                <MainLayout>
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<VentilatorDashboard />} />
                    <Route path="/teaching" element={<TeachingModule />} />
                    <Route path="/evaluation" element={<div>Módulo de Evaluación (En desarrollo)</div>} />
                    <Route path="/settings" element={<div>Configuración (En desarrollo)</div>} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </MainLayout>
              }
            />
          </Routes>
        </BrowserRouter>
      </LearningProgressProvider>
    </ThemeProvider>
  );
}

export default App; 