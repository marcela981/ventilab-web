/**
 * =============================================================================
 * Example pages/_app.js with AuthContext Integration
 * =============================================================================
 *
 * This file shows how to integrate the AuthProvider into your Next.js
 * application's _app.js file. Copy this structure to your actual _app.js
 * and customize as needed.
 *
 * Location: pages/_app.js (in your Next.js app)
 *
 * =============================================================================
 */

import { AuthProvider } from '@/contexts/AuthContext';
import '@/styles/globals.css';

/**
 * MyApp Component - Root Application Wrapper
 *
 * This is the entry point for your Next.js application. By wrapping
 * the Component with AuthProvider, all pages and components in your
 * app will have access to authentication state through the useAuth hook.
 *
 * @param {Object} props - Next.js app props
 * @param {React.Component} props.Component - The active page component
 * @param {Object} props.pageProps - Initial props for the page
 * @returns {JSX.Element} The wrapped application
 */
function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}

export default MyApp;

// =============================================================================
// Alternative: Multiple Providers
// =============================================================================

/**
 * If you have multiple context providers, nest them like this:
 *
 * function MyApp({ Component, pageProps }) {
 *   return (
 *     <AuthProvider>
 *       <ThemeProvider>
 *         <SocketProvider>
 *           <Component {...pageProps} />
 *         </SocketProvider>
 *       </ThemeProvider>
 *     </AuthProvider>
 *   );
 * }
 */

// =============================================================================
// Alternative: With Layout Component
// =============================================================================

/**
 * If you have a Layout component that should appear on all pages:
 *
 * import Layout from '@/components/Layout';
 *
 * function MyApp({ Component, pageProps }) {
 *   return (
 *     <AuthProvider>
 *       <Layout>
 *         <Component {...pageProps} />
 *       </Layout>
 *     </AuthProvider>
 *   );
 * }
 */

// =============================================================================
// Alternative: With Protected Layout
// =============================================================================

/**
 * If some pages should be protected and others public:
 *
 * import { RequireAuth } from '@/contexts/AuthContext';
 * import Layout from '@/components/Layout';
 *
 * function MyApp({ Component, pageProps }) {
 *   // Check if page requires authentication
 *   const requireAuth = Component.requireAuth ?? false;
 *
 *   return (
 *     <AuthProvider>
 *       <Layout>
 *         {requireAuth ? (
 *           <RequireAuth>
 *             <Component {...pageProps} />
 *           </RequireAuth>
 *         ) : (
 *           <Component {...pageProps} />
 *         )}
 *       </Layout>
 *     </AuthProvider>
 *   );
 * }
 *
 * // Then in your page:
 * // pages/dashboard.js
 * function DashboardPage() {
 *   return <div>Protected Dashboard</div>;
 * }
 * DashboardPage.requireAuth = true;
 * export default DashboardPage;
 */

// =============================================================================
// Alternative: With Loading State
// =============================================================================

/**
 * Show a loading screen while authentication is being verified:
 *
 * import { AuthProvider } from '@/contexts/AuthContext';
 * import { LoadingScreen } from '@/components/LoadingScreen';
 *
 * function MyApp({ Component, pageProps }) {
 *   return (
 *     <AuthProvider>
 *       <AppContent Component={Component} pageProps={pageProps} />
 *     </AuthProvider>
 *   );
 * }
 *
 * function AppContent({ Component, pageProps }) {
 *   const { isLoading } = useAuth();
 *
 *   if (isLoading) {
 *     return <LoadingScreen />;
 *   }
 *
 *   return <Component {...pageProps} />;
 * }
 */

// =============================================================================
// Alternative: With Error Boundary
// =============================================================================

/**
 * Wrap with error boundary for better error handling:
 *
 * import { AuthProvider } from '@/contexts/AuthContext';
 * import ErrorBoundary from '@/components/ErrorBoundary';
 *
 * function MyApp({ Component, pageProps }) {
 *   return (
 *     <ErrorBoundary>
 *       <AuthProvider>
 *         <Component {...pageProps} />
 *       </AuthProvider>
 *     </ErrorBoundary>
 *   );
 * }
 */

// =============================================================================
// Alternative: With Route Protection
// =============================================================================

/**
 * Implement global route protection:
 *
 * import { useAuth } from '@/contexts/AuthContext';
 * import { useRouter } from 'next/router';
 * import { useEffect } from 'react';
 *
 * const publicRoutes = ['/', '/login', '/register', '/forgot-password'];
 *
 * function MyApp({ Component, pageProps }) {
 *   return (
 *     <AuthProvider>
 *       <RouteGuard>
 *         <Component {...pageProps} />
 *       </RouteGuard>
 *     </AuthProvider>
 *   );
 * }
 *
 * function RouteGuard({ children }) {
 *   const router = useRouter();
 *   const { isAuthenticated, isLoading } = useAuth();
 *
 *   useEffect(() => {
 *     if (!isLoading && !isAuthenticated && !publicRoutes.includes(router.pathname)) {
 *       router.push('/login');
 *     }
 *   }, [isAuthenticated, isLoading, router.pathname]);
 *
 *   if (isLoading) {
 *     return <LoadingSpinner />;
 *   }
 *
 *   return children;
 * }
 */

// =============================================================================
// Alternative: Full Featured Example
// =============================================================================

/**
 * Complete example with multiple features:
 *
 * import { AuthProvider } from '@/contexts/AuthContext';
 * import { ThemeProvider } from '@/contexts/ThemeContext';
 * import { ToastProvider } from '@/contexts/ToastContext';
 * import ErrorBoundary from '@/components/ErrorBoundary';
 * import Layout from '@/components/Layout';
 * import '@/styles/globals.css';
 *
 * function MyApp({ Component, pageProps }) {
 *   // Get layout from page component if defined
 *   const getLayout = Component.getLayout || ((page) => <Layout>{page}</Layout>);
 *
 *   return (
 *     <ErrorBoundary>
 *       <AuthProvider>
 *         <ThemeProvider>
 *           <ToastProvider>
 *             {getLayout(<Component {...pageProps} />)}
 *           </ToastProvider>
 *         </ThemeProvider>
 *       </AuthProvider>
 *     </ErrorBoundary>
 *   );
 * }
 *
 * export default MyApp;
 *
 * // Then in pages with custom layouts:
 * // pages/dashboard.js
 * import DashboardLayout from '@/components/DashboardLayout';
 *
 * function DashboardPage() {
 *   return <div>Dashboard Content</div>;
 * }
 *
 * DashboardPage.getLayout = function getLayout(page) {
 *   return <DashboardLayout>{page}</DashboardLayout>;
 * };
 *
 * export default DashboardPage;
 */
