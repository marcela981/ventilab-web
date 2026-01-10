import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Box, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import Sidebar from './components/navigation/Sidebar';
import VentilatorDashboard from './components/VentilatorDashboard';
import TeachingModule from './components/teaching/TeachingModule';
import { LearningProgressProvider } from './contexts/LearningProgressContext';
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

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <ThemeProvider theme={theme}>
      <LearningProgressProvider>
        <BrowserRouter>
          <Box sx={{ display: 'flex' }}>
            <CssBaseline />
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
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<VentilatorDashboard />} />
                <Route path="/teaching" element={<TeachingModule />} />
                <Route path="/evaluation" element={<div>Módulo de Evaluación (En desarrollo)</div>} />
                <Route path="/settings" element={<div>Configuración (En desarrollo)</div>} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Box>
          </Box>
        </BrowserRouter>
      </LearningProgressProvider>
    </ThemeProvider>
  );
}

export default App; 