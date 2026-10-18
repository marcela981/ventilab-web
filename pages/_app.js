/*
* Funcionalidad: _app — raíz de la aplicación Next.js
* Descripción: Árbol de providers globales para VentyLab. Incluye WarmupProvider para detección y notificación de cold starts del backend en Render free tier. Usa el tema MUI con cssVariables de src/shared/design-system/theme (Roboto self-hosted vía next/font) e importa los CSS globales (App.css legacy + tokens.css del design system); el CSS global solo se importa aquí. v2.2: monta ApiSWRProvider (config SWR estándar de @shared/api-client, caché por defecto) y el warm-up llama GET /health del backend con el cliente tipado (antes httpSlow.get('/api/health') duplicaba el prefijo: /api/api/health). v2.3: monta el AuthProvider de @shared/session (sesión del backend para código nuevo, importado como BackendSessionProvider para no chocar con el AuthProvider legacy) dentro de ApiSWRProvider; no cambia NextAuth ni el AuthContext legacy y no navega por sí mismo. v2.4: monta el RealtimeProvider de @shared/realtime (socket autenticado del código nuevo, solo con sesión de backend) dentro de BackendSessionProvider; el SocketProvider legacy no cambia. v2.5: per-page layouts: si la página exporta getLayout(page) (resolvePageLayout de @shared/layouts/get-layout), se renderiza Component.getLayout(<Component />) sin el shell legacy (Sidebar/ErrorBoundary por página; el layout nuevo trae su propio RouteErrorBoundary); las páginas sin getLayout conservan exactamente el envoltorio legacy anterior. Los layouts se importan desde las páginas que los usan, nunca desde _app. v2.6: monta una sola vez el ToastProvider global del design system (useToast del código nuevo) dentro del ThemeProvider, alrededor del contenido de la página; el NotificationProvider legacy no cambia. v2.7 (G1 grading): monta el NavBadgeProvider de @shared/layouts/nav-badges (contadores de las insignias de navegación del AppShell) dentro de RealtimeProvider y, dentro de él, GradingPendingBadgeSync del barrel de @features/grading, que alimenta la insignia "Calificar" con los intentos pendientes solo para docentes y administradores (carga su código de peticiones de forma diferida). _app es la raíz de composición: shared no puede importar features, así que la feature alimenta el registro compartido desde aquí. v2.8 (G1 review S6/W2): GradingPendingBadgeSync se importa por su ruta directa (application/components/lazy-grading-pending-badge-sync), no por el barrel de la feature; la sincronización solo consulta la cola mientras el AppShell está montado (registro de visibilidad de nav-badges). v2.9 (A3 ai-chat): monta AiChatProvider (estado del drawer global del asistente IA, sobrevive a la navegación; el drawer con ChatPanel/markdown/KaTeX se carga de forma diferida al abrirlo por primera vez) dentro de ToastProvider, y dentro de él TopBarActionsProvider de @shared/layouts/top-bar-actions con AiChatLauncher como acción de la barra superior del AppShell; ambos se importan por su ruta directa, no por el barrel de la feature. v3.0 (T9 simulation): importa por efecto la raíz de composición del simulador (register-exam-practical-slot) que registra el renderer diferido de las preguntas SIMULATION del examen en el PracticalQuestionSlot de evaluations; solo arrastra el registro y un envoltorio React.lazy, nunca la consola, el motor ni Chart.js. v3.1 (T12 ventilator-lab review fix W1): monta el NavIndicatorProvider de @shared/layouts/nav-indicators (indicadores de estado de la navegación del AppShell) dentro de NavBadgeProvider y, dentro de él, DeviceStatusNavIndicatorSync de ventilator-lab por su ruta directa, que alimenta el indicador del ítem "Laboratorio" con el estado del equipo físico (useDeviceStatus) solo mientras el AppShell lo muestra (carga su código de forma diferida). v3.2 (O1 notifications): monta, por sus rutas directas (no el barrel de la feature), NotificationsBadgeSync dentro de NavBadgeProvider (insignia "notificationsUnread" solo con sesión y AppShell visible, código diferido), NotificationToasts dentro de ToastProvider (toast informativo por notification:new marcado como aviso, que el modo foco descarta) y NotificationBell como acción de la barra superior junto a AiChatLauncher (la campana carga su popover y sus peticiones de forma diferida). v3.3 (B3.4, D4): NextAuth eliminado: sin SessionProvider; AppWarmupEffect lee el estado de la sesión del backend (useSession de @shared/session) para el warm-up. v3.4 (B3.5, D6): sin el SocketProvider legado (el socket lo da RealtimeProvider de @shared/realtime) ni el PatientDataProvider del simulador legado; no tenían consumidores alcanzables. v3.5 (B3.7): sin el shell legado: se eliminan AuthProvider (AuthContext), NotificationProvider, Sidebar/SidebarContext, el envoltorio Box con `sx`, el caso /panel y el pass-through Providers; el AuthProvider de @shared/session ya no se renombra. Toda página trae su layout (getLayout) o se renderiza sola; ThemeProvider y CssBaseline envuelven todo y un RouteErrorBoundary del design system reemplaza al ErrorBoundary legado en la raíz. El filtro global de errores (HMR y errores de red ya manejados) pasa a useGlobalErrorLogging sin cambiar su comportamiento. v3.6 (B3.9): sin la inicialización de i18next (src/i18n eliminado): ningún código alcanzable usaba useTranslation ni t(); la UI es solo en español. v3.7 (B5): tras montar llama una vez a startErrorReporting (@shared/lib/observability): sin NEXT_PUBLIC_SENTRY_DSN no carga nada; con DSN importa de forma diferida el cliente de @sentry/browser (sin datos personales).
* Versión: 3.7
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import React from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { WarmupProvider, useWarmup } from '../src/shared/contexts/WarmupContext';
import WarmupOverlay from '../src/shared/components/UI/WarmupOverlay';
import { useRouter } from 'next/router';
import { theme } from '@shared/design-system/theme';
// Direct module import: the design-system index would pull every base component into the app shell.
import { RouteErrorBoundary } from '@shared/design-system/components/route-error-boundary';
// Direct module import: the api-client index would pull axios and the request layer into the app shell.
import { ApiSWRProvider } from '@shared/api-client/swr-config';
// Direct module import: the session index would also pull the guards and the route table.
import { AuthProvider } from '@shared/session/auth-provider';
import { useSession } from '@shared/session/use-session';
// Direct module import: the realtime index re-exports hooks and types the app shell does not need.
import { RealtimeProvider } from '@shared/realtime/realtime-provider';
// Direct module import: the layouts index would pull the AppShell and every layout into the app shell.
import { resolvePageLayout } from '@shared/layouts/get-layout';
// Direct module import: the design-system index would pull every base component into the app shell.
import { ToastProvider } from '@shared/design-system/components/toast-provider';
// Direct module import: the layouts index would pull the AppShell and every layout into the app shell.
import { NavBadgeProvider } from '@shared/layouts/nav-badges';
// Direct module import: the layouts index would pull the AppShell and every layout into the app shell.
import { NavIndicatorProvider } from '@shared/layouts/nav-indicators';
// Direct module import: the layouts index would pull the AppShell and every layout into the app shell.
import { TopBarActionsProvider } from '@shared/layouts/top-bar-actions';
// Direct module path (not the grading barrel) so _app only pulls the small badge entry.
import { GradingPendingBadgeSync } from '@features/grading/application/components/lazy-grading-pending-badge-sync';
// Direct module path (not the ventilator-lab barrel): the device indicator feeder loads lazily while the shell shows it.
import { DeviceStatusNavIndicatorSync } from '@features/ventilator-lab/application/components/lazy-device-status-nav-indicator-sync';
// Direct module paths (not the ai-chat barrel): only the drawer state and the launcher button land in the app
// shell; the drawer and the conversation UI load on the first open.
import { AiChatProvider } from '@features/ai-chat/application/components/ai-chat-provider';
import { AiChatLauncher } from '@features/ai-chat/application/components/ai-chat-launcher';
// Direct module paths (not the notifications barrel): the bell and the badge feeder lazy-load their request code;
// the toast listener only uses the realtime and toast contexts already in the app shell.
import { NotificationBell } from '@features/notifications/application/components/notification-bell';
import { NotificationToasts } from '@features/notifications/application/components/notification-toasts';
import { NotificationsBadgeSync } from '@features/notifications/application/components/notifications-badge-sync';
// Direct module import: only the DSN check lands in the app shell; the Sentry client is a lazy chunk.
import { startErrorReporting } from '@shared/lib/observability/start-error-reporting';
import '@features/simulator/composition/register-exam-practical-slot';
import '../src/App.css';
import '../src/shared/design-system/UI/tokens.css';

/**
 * Dispara un GET /health del backend (ruta lenta, timeout 60 s) la primera vez que el usuario
 * llega autenticado a una página no-auth. Activa WarmupOverlay mientras espera.
 * Debe ser hijo de AuthProvider (sesión del backend) y WarmupProvider.
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

function isIgnoredError(error) {
  return Boolean(
    error?.message?.includes('HMR')
      || error?.message?.includes('Invalid message')
      || error?.isNetworkError
      || error?.name === 'NetworkError',
  );
}

/**
 * Silencia en consola los errores de HMR y los errores de red que los componentes ya manejan
 * con .catch(); los demás se registran.
 */
function useGlobalErrorLogging() {
  React.useEffect(() => {
    const handleError = (event) => {
      if (isIgnoredError(event.error ?? event) || isIgnoredError(event.reason)) return;
      console.error('Error en la aplicación:', event.error ?? event);
    };

    const handleUnhandledRejection = (event) => {
      if (isIgnoredError(event.reason)) {
        event.preventDefault();
        return;
      }
      console.error('Unhandled promise rejection:', event.reason);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
}

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const isAuthPage = router.pathname.startsWith('/auth');
  // Every page brings its own layout (getLayout); a page without one renders bare.
  const getLayout = resolvePageLayout(Component);
  const page = <Component {...pageProps} />;

  useGlobalErrorLogging();

  React.useEffect(() => {
    void startErrorReporting();
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RouteErrorBoundary>
        <ApiSWRProvider>
          <AuthProvider>
            <RealtimeProvider>
              <NavBadgeProvider>
                <GradingPendingBadgeSync />
                <NotificationsBadgeSync />
                <NavIndicatorProvider>
                  <DeviceStatusNavIndicatorSync />
                  <WarmupProvider>
                    <AppWarmupEffect isAuthPage={isAuthPage} />
                    <ToastProvider>
                      <NotificationToasts />
                      <AiChatProvider>
                        <TopBarActionsProvider actions={<><AiChatLauncher /><NotificationBell /></>}>
                          {getLayout ? getLayout(page) : page}
                        </TopBarActionsProvider>
                      </AiChatProvider>
                    </ToastProvider>
                    <WarmupOverlay />
                  </WarmupProvider>
                </NavIndicatorProvider>
              </NavBadgeProvider>
            </RealtimeProvider>
          </AuthProvider>
        </ApiSWRProvider>
      </RouteErrorBoundary>
    </ThemeProvider>
  );
}

export default MyApp;
