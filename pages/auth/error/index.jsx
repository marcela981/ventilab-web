/**
 * =============================================================================
 * Authentication Error Page for VentyLab
 * =============================================================================
 * User-friendly error page for authentication failures with helpful messages
 * and recovery options
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
  LinearProgress,
} from '@mui/material';
import {
  ErrorOutline as ErrorIcon,
  Home as HomeIcon,
  Login as LoginIcon,
  Support as SupportIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { AUTH_ERROR_MESSAGES } from '@/lib/auth-config';

/**
 * Get detailed error information based on error code
 */
const getErrorDetails = (errorCode) => {
  // Map error codes to user-friendly information
  const errorDetails = {
    Configuration: {
      title: 'Error de Configuración',
      message: 'Hay un problema con la configuración del sistema de autenticación.',
      suggestion: 'Por favor contacta al administrador del sistema.',
      severity: 'error',
    },
    AccessDenied: {
      title: 'Acceso Denegado',
      message: 'No tienes permisos para acceder a este recurso.',
      suggestion: 'Si crees que esto es un error, contacta al administrador.',
      severity: 'warning',
    },
    Verification: {
      title: 'Verificación Fallida',
      message: 'El enlace de verificación ha expirado o es inválido.',
      suggestion: 'Por favor solicita un nuevo enlace de verificación.',
      severity: 'warning',
    },
    OAuthSignin: {
      title: 'Error de OAuth',
      message: 'No se pudo conectar con el proveedor de autenticación (Google).',
      suggestion: 'Verifica tu conexión a internet e intenta nuevamente.',
      severity: 'error',
    },
    OAuthCallback: {
      title: 'Error en el Callback de OAuth',
      message: 'Ocurrió un error al procesar la respuesta de Google.',
      suggestion: 'Por favor intenta iniciar sesión nuevamente.',
      severity: 'error',
    },
    OAuthCreateAccount: {
      title: 'Error al Crear Cuenta',
      message: 'No se pudo crear tu cuenta con Google.',
      suggestion: 'Intenta registrarte con email y contraseña, o contacta soporte.',
      severity: 'error',
    },
    EmailCreateAccount: {
      title: 'Error al Crear Cuenta',
      message: 'No se pudo crear tu cuenta con el email proporcionado.',
      suggestion: 'Verifica que el email no esté ya registrado.',
      severity: 'error',
    },
    Callback: {
      title: 'Error de Autenticación',
      message: 'Ocurrió un error durante el proceso de autenticación.',
      suggestion: 'Por favor intenta iniciar sesión nuevamente.',
      severity: 'error',
    },
    OAuthAccountNotLinked: {
      title: 'Cuenta No Vinculada',
      message: 'Este email ya está registrado con otro método de inicio de sesión.',
      suggestion: 'Inicia sesión con el método original que usaste para registrarte.',
      severity: 'warning',
    },
    EmailSignin: {
      title: 'Error de Email',
      message: 'No se pudo enviar el email de inicio de sesión.',
      suggestion: 'Verifica tu dirección de email e intenta nuevamente.',
      severity: 'error',
    },
    CredentialsSignin: {
      title: 'Credenciales Inválidas',
      message: 'El email o contraseña son incorrectos.',
      suggestion: 'Verifica tus credenciales o usa "Olvidé mi contraseña".',
      severity: 'warning',
    },
    SessionRequired: {
      title: 'Sesión Requerida',
      message: 'Debes iniciar sesión para acceder a esta página.',
      suggestion: 'Por favor inicia sesión con tu cuenta.',
      severity: 'info',
    },
    AccountDeactivated: {
      title: 'Cuenta Desactivada',
      message: 'Tu cuenta ha sido desactivada por un administrador.',
      suggestion: 'Contacta al administrador para reactivar tu cuenta.',
      severity: 'error',
    },
    SignInError: {
      title: 'Error al Iniciar Sesión',
      message: 'Ocurrió un error inesperado al iniciar sesión.',
      suggestion: 'Por favor intenta nuevamente más tarde.',
      severity: 'error',
    },
    Default: {
      title: 'Error Inesperado',
      message: 'Ocurrió un error que no pudimos identificar.',
      suggestion: 'Por favor intenta nuevamente o contacta soporte si el problema persiste.',
      severity: 'error',
    },
  };

  return errorDetails[errorCode] || errorDetails.Default;
};

/**
 * Authentication Error Page Component
 */
export default function AuthErrorPage() {
  const router = useRouter();
  const { error } = router.query;

  const [countdown, setCountdown] = useState(10);
  const [autoRedirect, setAutoRedirect] = useState(true);

  // Get error details
  const errorDetails = getErrorDetails(error);

  /**
   * Auto-redirect countdown timer
   */
  useEffect(() => {
    if (!autoRedirect || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Redirect to login when countdown reaches 0
          router.push('/auth/login');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRedirect, countdown, router]);

  /**
   * Log error for debugging
   */
  useEffect(() => {
    if (error) {
      console.error('[AuthError] Authentication error occurred:', {
        code: error,
        details: errorDetails,
        timestamp: new Date().toISOString(),
      });

      // TODO: Send to monitoring service (Sentry, LogRocket, etc.)
      // Example: Sentry.captureException(new Error(`Auth Error: ${error}`));
    }
  }, [error, errorDetails]);

  /**
   * Cancel auto-redirect when user interacts
   */
  const handleInteraction = () => {
    setAutoRedirect(false);
  };

  /**
   * Navigate to login page
   */
  const handleRetry = () => {
    router.push('/auth/login');
  };

  /**
   * Navigate to home page
   */
  const handleGoHome = () => {
    router.push('/');
  };

  /**
   * Navigate to support (placeholder)
   */
  const handleContactSupport = () => {
    // TODO: Implement support contact functionality
    // For now, just show an alert
    alert('Funcionalidad de soporte en desarrollo. Por favor contacta a: soporte@ventilab.com');
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
      onClick={handleInteraction}
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
            {/* Error Icon */}
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
                  backgroundColor: `${errorDetails.severity}.main`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0.9,
                }}
              >
                <ErrorIcon sx={{ fontSize: 48, color: 'white' }} />
              </Box>
            </Box>

            {/* Error Title */}
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              sx={{ fontWeight: 700, color: 'text.primary' }}
            >
              {errorDetails.title}
            </Typography>

            {/* Error Message */}
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ mb: 2 }}
            >
              {errorDetails.message}
            </Typography>

            {/* Error Code (for debugging) */}
            {error && (
              <Typography
                variant="caption"
                color="text.disabled"
                sx={{ mb: 3, display: 'block' }}
              >
                Código de error: <code>{error}</code>
              </Typography>
            )}

            {/* Suggestion Alert */}
            <Alert
              severity={errorDetails.severity}
              sx={{ mb: 4, textAlign: 'left' }}
            >
              <Typography variant="body2">
                <strong>Sugerencia:</strong> {errorDetails.suggestion}
              </Typography>
            </Alert>

            {/* Auto-redirect countdown */}
            {autoRedirect && countdown > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Redirigiendo a la página de inicio de sesión en {countdown} segundos...
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={(10 - countdown) * 10}
                  sx={{ mt: 1, borderRadius: 1 }}
                />
                <Typography
                  variant="caption"
                  color="text.disabled"
                  sx={{ mt: 1, display: 'block' }}
                >
                  Haz clic en cualquier lugar para cancelar
                </Typography>
              </Box>
            )}

            {/* Action Buttons */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                mt: 4,
              }}
            >
              {/* Primary: Retry Login */}
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<LoginIcon />}
                onClick={handleRetry}
                sx={{
                  py: 1.5,
                  textTransform: 'none',
                  fontSize: '16px',
                  fontWeight: 600,
                }}
              >
                Volver a Intentar
              </Button>

              {/* Secondary: Go Home */}
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

              {/* Tertiary: Contact Support */}
              <Button
                fullWidth
                variant="text"
                size="medium"
                startIcon={<SupportIcon />}
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
                ¿Necesitas ayuda?{' '}
                <Link href="/auth/login" passHref legacyBehavior>
                  <a style={{ color: 'inherit', fontWeight: 600 }}>
                    Intenta iniciar sesión
                  </a>
                </Link>
                {' '}o{' '}
                <Link href="/auth/register" passHref legacyBehavior>
                  <a style={{ color: 'inherit', fontWeight: 600 }}>
                    crea una cuenta nueva
                  </a>
                </Link>
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
