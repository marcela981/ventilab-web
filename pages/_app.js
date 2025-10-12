import React, { useState, createContext, useContext } from 'react';
import { Box, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { PatientDataProvider } from '../src/contexts/PatientDataContext';
import Sidebar from '../src/components/navigation/Sidebar';
import '../src/App.css';

// Context para el estado del sidebar
const SidebarContext = createContext();

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

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

function MyApp({ Component, pageProps }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <ThemeProvider theme={theme}>
      <PatientDataProvider>
        <SidebarContext.Provider value={{ sidebarOpen, handleSidebarToggle }}>
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
              <Component {...pageProps} />
            </Box>
          </Box>
        </SidebarContext.Provider>
      </PatientDataProvider>
    </ThemeProvider>
  );
}

export default MyApp; 