/**
 * =============================================================================
 * ProtectedPanelRoute - Route Guard for Admin Panel
 * =============================================================================
 * Protects /panel/* routes from unauthorized access.
 * Only allows: teacher, admin, superuser
 * Students are redirected or shown an access denied message.
 *
 * This component wraps panel routes to ensure proper authorization.
 * =============================================================================
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, Typography, Paper, Button, CircularProgress } from '@mui/material';
import { Block as BlockIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { isTeacherOrAbove, isAdminOrAbove, ROLES } from '@/lib/roles';

/**
 * Access Denied Component
 * Shown when user doesn't have permission to access the panel.
 */
function AccessDenied() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'grey.100',
        p: 3,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 6,
          maxWidth: 400,
          textAlign: 'center',
          border: '1px solid',
          borderColor: 'grey.200',
          borderRadius: 3,
        }}
      >
        <BlockIcon sx={{ fontSize: 72, color: 'error.main', mb: 2 }} />
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Acceso Denegado
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          No tienes permisos para acceder al panel de administración.
          Esta sección está reservada para profesores y administradores.
        </Typography>
        <Button
          component="a"
          href="/dashboard"
          variant="contained"
          startIcon={<ArrowBackIcon />}
          sx={{ textTransform: 'none' }}
        >
          Volver al Dashboard
        </Button>
      </Paper>
    </Box>
  );
}

/**
 * Loading Component
 * Shown while checking authentication status.
 */
function LoadingAuth() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'grey.100',
      }}
    >
      <CircularProgress />
    </Box>
  );
}

/**
 * ProtectedPanelRoute Component
 *
 * Wraps panel routes and checks authorization before rendering.
 *
 * @component
 * @example
 * <Route
 *   path="/panel/*"
 *   element={
 *     <ProtectedPanelRoute>
 *       <PanelLayout>
 *         <Outlet />
 *       </PanelLayout>
 *     </ProtectedPanelRoute>
 *   }
 * />
 */
export default function ProtectedPanelRoute({
  children,
  requiredRole = 'teacher',
  redirectTo = '/auth/login',
}) {
  const { isAuthenticated, isLoading, role } = useAuth();
  const location = useLocation();

  // Show loading while checking auth status
  if (isLoading) {
    return <LoadingAuth />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check role-based access
  // Default requires teacher-level access (teacher, admin, superuser)
  const hasAccess = requiredRole === 'admin'
    ? isAdminOrAbove(role)
    : isTeacherOrAbove(role);

  // Show access denied if user doesn't have required role
  if (!hasAccess) {
    return <AccessDenied />;
  }

  // User is authenticated and authorized - render children
  return children;
}

ProtectedPanelRoute.propTypes = {
  /**
   * Child components to render when authorized
   */
  children: PropTypes.node.isRequired,

  /**
   * Minimum role required for access
   * 'teacher' = teacher, admin, superuser
   * 'admin' = admin, superuser only
   */
  requiredRole: PropTypes.oneOf(['teacher', 'admin']),

  /**
   * Path to redirect unauthenticated users to
   */
  redirectTo: PropTypes.string,
};
