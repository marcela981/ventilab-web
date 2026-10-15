/*
* Funcionalidad: _app — raíz de la aplicación Next.js
* Descripción: Árbol de providers globales para VentyLab. Incluye WarmupProvider para detección y notificación de cold starts del backend en Render free tier. Usa el tema MUI con cssVariables de src/shared/design-system/theme (Roboto self-hosted vía next/font) e importa los CSS globales (App.css legacy + tokens.css del design system); el CSS global solo se importa aquí. v2.2: monta ApiSWRProvider (config SWR estándar de @shared/api-client, caché por defecto) y el warm-up llama GET /health del backend con el cliente tipado (antes httpSlow.get('/api/health') duplicaba el prefijo: /api/api/health). v2.3: monta el AuthProvider de @shared/session (sesión del backend para código nuevo, importado como BackendSessionProvider para no chocar con el AuthProvider legacy) dentro de ApiSWRProvider; no cambia NextAuth ni el AuthContext legacy y no navega por sí mismo. v2.4: monta el RealtimeProvider de @shared/realtime (socket autenticado del código nuevo, solo con sesión de backend) dentro de BackendSessionProvider; el SocketProvider legacy no cambia. v2.5: per-page layouts: si la página exporta getLayout(page) (resolvePageLayout de @shared/layouts/get-layout), se renderiza Component.getLayout(<Component />) sin el shell legacy (Sidebar/ErrorBoundary por página; el layout nuevo trae su propio RouteErrorBoundary); las páginas sin getLayout conservan exactamente el envoltorio legacy anterior. Los layouts se importan desde las páginas que los usan, nunca desde _app. v2.6: monta una sola vez el ToastProvider global del design system (useToast del código nuevo) dentro del ThemeProvider, alrededor del contenido de la página; el NotificationProvider legacy no cambia. v2.7 (G1 grading): monta el NavBadgeProvider de @shared/layouts/nav-badges (contadores de las insignias de navegación del AppShell) dentro de RealtimeProvider y, dentro de él, GradingPendingBadgeSync del barrel de @features/grading, que alimenta la insignia "Calificar" con los intentos pendientes solo para docentes y administradores (carga su código de peticiones de forma diferida). _app es la raíz de composición: shared no puede importar features, así que la feature alimenta el registro compartido desde aquí.
* Versión: 2.7
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import React, { useState } from 'react';
import { Box, CssBaseline, ThemeProvider } from '@mui/material';
import { SessionProvider, useSession } from 'next-auth/react';
import { AuthProvider } from '../src/shared/contexts/AuthContext';
import { NotificationProvider } from '../src/shared/contexts/NotificationContext';
import { WarmupProvider, useWarmup } from '../src/shared/contexts/WarmupContext';
import WarmupOverlay from '../src/shared/components/UI/WarmupOverlay';
import Providers from '../src/providers/Providers';
import Sidebar from '../src/shared/components/Sidebar';
import ErrorBoundary from '../src/shared/components/ErrorBoundary';
import { useRouter } from 'next/router';
import { theme } from '@shared/design-system/theme';
// Direct module import: the api-client index would pull axios and the request layer into the app shell.
import { ApiSWRProvider } from '@shared/api-client/swr-config';
// Direct module import: the session index would also pull the guards and the route table.
import { AuthProvider as BackendSessionProvider } from '@shared/session/auth-provider';
// Direct module import: the realtime index re-exports hooks and types the app shell does not need.
import { RealtimeProvider } from '@shared/realtime/realtime-provider';
// Direct module import: the layouts index would pull the AppShell and every layout into the app shell.
import { resolvePageLayout } from '@shared/layouts/get-layout';
// Direct module import: the design-system index would pull every base component into the app shell.
import { ToastProvider } from '@shared/design-system/components/toast-provider';
// Direct module import: the layouts index would pull the AppShell and every layout into the app shell.
import { NavBadgeProvider } from '@shared/layouts/nav-badges';
// Feature barrel: the badge sync lazy-loads its request code for staff only, so the app shell stays small.
import { GradingPendingBadgeSync } from '@features/grading';
import { PatientDataProvider } from '../src/features/simulador/simuladorPaciente/contexto/PatientDataContext';
import { SocketProvider } from '../src/shared/contexts/SocketContext';
import { SidebarContext } from '../src/shared/contexts/SidebarContext';
import '../src/App.css';
import '../src/shared/design-system/UI/tokens.css';
// Importar y inicializar i18n
import '../src/i18n/i18n';

/**
 * Dispara un GET /health del backend (ruta lenta, timeout 60 s) la primera vez que el usuario
 * llega autenticado a una página no-auth. Activa WarmupOverlay mientras espera.
 * Debe ser hijo de SessionProvider y WarmupProvider.
 */
function AppWarmupEffect({ isAuthPage }) {
  const { status } = useSession();
  const { setWarmingUp } = useWarmup();
  const warmedRef = React.useRef(false);

  React.useEffect(() => {
    if (status !== 'authenticated' || isAuthPage || warmedRef.current) return;
    warmedRef.current = true;

    setWarmingUp(true);
    import('@shared/api-client/api-request')
      .then(({ apiGet }) => apiGet('/health', { timeout: 'slow' }))
      .catch(() => {})
      .finally(() => setWarmingUp(false));
  }, [status, isAuthPage, setWarmingUp]);

  return null;
}

function MyApp({ Component, pageProps: { session, ...pageProps } }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Check if current page is an auth page (no sidebar)
  const isAuthPage = router.pathname.startsWith('/auth');
  // Panel pages use their own PanelLayout with PanelSidebar
  const isPanelPage = router.pathname.startsWith('/panel');
  // Pages that export getLayout bring their own (new) layout and skip the legacy shell.
  const getLayout = resolvePageLayout(Component);

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
      // Ignorar errores de red que ya están siendo manejados por los componentes
      if (error.reason?.isNetworkError || error.reason?.name === 'NetworkError') {
        // Estos errores ya están siendo manejados por los componentes con .catch()
        return;
      }
      if (error.isNetworkError || error.name === 'NetworkError') {
        return;
      }
      console.error('Error en la aplicación:', error);
    };

    const handleUnhandledRejection = (event) => {
      const error = event.reason;
      if (error?.message?.includes('HMR') || error?.message?.includes('Invalid message')) {
        console.warn('HMR Error (ignorando):', error.message);
        event.preventDefault();
        return;
      }
      // Ignorar errores de red que ya están siendo manejados
      if (error?.isNetworkError || error?.name === 'NetworkError') {
        // Estos errores ya están siendo manejados por los componentes con .catch()
        event.preventDefault();
        return;
      }
      console.error('Unhandled promise rejection:', error);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <ErrorBoundary>
      <Providers>
        <ApiSWRProvider>
        <BackendSessionProvider>
        <RealtimeProvider>
        <NavBadgeProvider>
        <GradingPendingBadgeSync />
        {/*
          SessionProvider: Provides NextAuth.js session to all components
          - session: Initial session from getServerSideProps (SSR optimization)
          - refetchInterval: Refetch session every 5 minutes to keep it updated
          - refetchOnWindowFocus: Revalidate session when user returns to window
        */}
        <WarmupProvider>
        <SessionProvider
          session={session}
          refetchInterval={5 * 60} // 5 minutes in seconds
          refetchOnWindowFocus={false} // Desactivado para evitar revalidaciones agresivas
        >
          <AppWarmupEffect isAuthPage={isAuthPage} />
          <AuthProvider>
            <SocketProvider>
              <ThemeProvider theme={theme}>
                <NotificationProvider>
                  <ToastProvider>
                  <PatientDataProvider>
                    <CssBaseline />
                    {/* Pages with getLayout: their own layout, no legacy shell */}
                    {/* Auth pages: render without sidebar */}
                    {/* Panel pages: render without student sidebar (PanelLayout provides its own) */}
                    {getLayout ? (
                      getLayout(<Component {...pageProps} />)
                    ) : isAuthPage || isPanelPage ? (
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
                              minWidth: 0,
                              overflow: 'hidden',
                              p: 0,
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
                  </ToastProvider>
                </NotificationProvider>
              </ThemeProvider>
            </SocketProvider>
          </AuthProvider>
        </SessionProvider>
        <WarmupOverlay />
        </WarmupProvider>
        </NavBadgeProvider>
        </RealtimeProvider>
        </BackendSessionProvider>
        </ApiSWRProvider>
      </Providers>
    </ErrorBoundary>
  );
}

export default MyApp; 