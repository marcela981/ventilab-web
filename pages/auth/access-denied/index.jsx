/**
 * =============================================================================
 * Access Denied Page for VentyLab
 * =============================================================================
 * Page displayed when user attempts to access a resource they don't have
 * permission to view based on their role.
 * 
 * NOTE: Client-side only to avoid SSR issues with useAuth
 * =============================================================================
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Card,
  CardContent,
  Button,
  Typography,
  Container,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Block as BlockIcon,
  Home as HomeIcon,
  ArrowBack as ArrowBackIcon,
  ContactSupport as ContactSupportIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { useAuth } from '@/shared/contexts/AuthContext';
import { ROLE_DISPLAY_NAMES } from '@/lib/auth-config';

/**
 * Access Denied Page Component
 */
export default function AccessDeniedPage() {
  const router = useRouter();
  const { reason } = router.query;
  const { user, role, isAuthenticated } = useAuth();
  const [mounted, setMounted] = useState(false);

  // Only render on client to avoid SSR issues
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <CircularProgress sx={{ color: 'white' }} />
      </Box>
    );
  }

  /**
   * Navigate back
   */
  const handleGoBack = () => {
    router.back();
  };

  /**
   * Navigate to home
   */
  const handleGoHome = () => {
    router.push('/');
  };

  /**
   * Navigate to dashboard
   */
  const handleGoDashboard = () => {
    router.push('/dashboard');
  };

  /**
   * Contact support placeholder
   */
  const handleContactSupport = () => {
    alert('Funcionalidad de soporte en desarrollo.\nContacta a: soporte@ventilab.com');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <Card
          elevation={10}
          sx={{
            borderRadius: 3,
            overflow: 'visible',
          }}
        >
          <CardContent sx={{ p: { xs: 3, sm: 5 }, textAlign: 'center' }}>
            {/* Icon */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                mb: 3,
              }}
            >
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  backgroundColor: 'error.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0.9,
                }}
              >
                <BlockIcon sx={{ fontSize: 48, color: 'white' }} />
              </Box>
            </Box>

            {/* Title */}
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              sx={{ fontWeight: 700, color: 'text.primary' }}
            >
              Acceso Denegado
            </Typography>

            {/* Message */}
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ mb: 2 }}
            >
              No tienes permisos suficientes para acceder a este recurso.
            </Typography>

            {/* User Info */}
            {isAuthenticated && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Estás logueado como:
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {user?.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Rol actual: <strong>{ROLE_DISPLAY_NAMES[role] || role}</strong>
                </Typography>
              </Box>
            )}

            {/* Reason Alert */}
            {reason && (
              <Alert
                severity="warning"
                sx={{ mb: 4, textAlign: 'left' }}
              >
                <Typography variant="body2">
                  <strong>Motivo:</strong> {decodeURIComponent(reason)}
                </Typography>
              </Alert>
            )}

            {/* Information Alert */}
            <Alert
              severity="info"
              sx={{ mb: 4, textAlign: 'left' }}
            >
              <Typography variant="body2">
                <strong>¿Qué puedes hacer?</strong>
              </Typography>
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                <li>Verifica que estás usando la cuenta correcta</li>
                <li>Regresa a la página anterior</li>
                <li>Contacta al administrador si crees que esto es un error</li>
                <li>Solicita un cambio de rol si lo necesitas</li>
              </ul>
            </Alert>

            {/* Action Buttons */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              {/* Go Back */}
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<ArrowBackIcon />}
                onClick={handleGoBack}
                sx={{
                  py: 1.5,
                  textTransform: 'none',
                  fontSize: '16px',
                  fontWeight: 600,
                }}
              >
                Volver Atrás
              </Button>

              {/* Go to Dashboard */}
              {isAuthenticated && (
                <Button
                  fullWidth
                  variant="outlined"
                  size="large"
                  startIcon={<HomeIcon />}
                  onClick={handleGoDashboard}
                  sx={{
                    py: 1.5,
                    textTransform: 'none',
                    fontSize: '16px',
                  }}
                >
                  Ir al Dashboard
                </Button>
              )}

              {/* Go Home */}
              {!isAuthenticated && (
                <Button
                  fullWidth
                  variant="outlined"
                  size="large"
                  startIcon={<HomeIcon />}
                  onClick={handleGoHome}
                  sx={{
                    py: 1.5,
                    textTransform: 'none',
                    fontSize: '16px',
                  }}
                >
                  Ir al Inicio
                </Button>
              )}

              {/* Contact Support */}
              <Button
                fullWidth
                variant="text"
                size="medium"
                startIcon={<ContactSupportIcon />}
                onClick={handleContactSupport}
                sx={{
                  textTransform: 'none',
                  color: 'text.secondary',
                }}
              >
                Contactar Soporte
              </Button>
            </Box>

            {/* Additional Help */}
            <Box sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="body2" color="text.secondary">
                ¿Tienes preguntas sobre roles y permisos?{' '}
                <a
                  href="mailto:soporte@ventilab.com"
                  style={{ color: 'inherit', fontWeight: 600, textDecoration: 'none' }}
                >
                  Contáctanos
                </a>
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Footer */}
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
            © 2025 VentyLab. Plataforma educativa de ventilación mecánica.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
