import React, { useState, createContext, useContext } from 'react';
import { Box, CssBaseline, ThemeProvider } from '@mui/material';
import { SessionProvider } from 'next-auth/react';
import { AuthProvider } from '../src/contexts/AuthContext';
import { PatientDataProvider } from '../src/contexts/PatientDataContext';
import { NotificationProvider } from '../src/contexts/NotificationContext';
import Sidebar from '../src/components/navigation/Sidebar';
import ErrorBoundary from '../src/components/common/ErrorBoundary';
import { useRouter } from 'next/router';
import theme from '../src/theme/theme';
import '../src/App.css';
// Importar y inicializar i18n
import '../src/i18n/i18n';

// Context para el estado del sidebar
const SidebarContext = createContext();

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

function MyApp({ Component, pageProps: { session, ...pageProps } }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Check if current page is an auth page (no sidebar)
  const isAuthPage = router.pathname.startsWith('/auth');

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Manejo de errores para HMR
  React.useEffect(() => {
    const handleError = (error) => {
      if (error.message?.includes('HMR') || error.message?.includes('Invalid message')) {
        console.warn('HMR Error (ignorando):', error.message);
        return;
      }
      console.error('Error en la aplicación:', error);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleError);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
    };
  }, []);

  return (
    <ErrorBoundary>
      {/*
        SessionProvider: Provides NextAuth.js session to all components
        - session: Initial session from getServerSideProps (SSR optimization)
        - refetchInterval: Refetch session every 5 minutes to keep it updated
        - refetchOnWindowFocus: Revalidate session when user returns to window
      */}
      <SessionProvider
        session={session}
        refetchInterval={5 * 60} // 5 minutes in seconds
        refetchOnWindowFocus={true}
      >
        <AuthProvider>
          <ThemeProvider theme={theme}>
            <NotificationProvider>
              <PatientDataProvider>
                <CssBaseline />
                {/* Auth pages: render without sidebar */}
                {isAuthPage ? (
                  <ErrorBoundary>
                    <Component {...pageProps} />
                  </ErrorBoundary>
                ) : (
                  /* Regular pages: render with sidebar */
                  <SidebarContext.Provider value={{ sidebarOpen, handleSidebarToggle }}>
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
                        <ErrorBoundary>
                          <Component {...pageProps} />
                        </ErrorBoundary>
                      </Box>
                    </Box>
                  </SidebarContext.Provider>
                )}
              </PatientDataProvider>
            </NotificationProvider>
          </ThemeProvider>
        </AuthProvider>
      </SessionProvider>
    </ErrorBoundary>
  );
}

export default MyApp; 