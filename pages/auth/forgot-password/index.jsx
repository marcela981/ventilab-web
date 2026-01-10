/**
 * =============================================================================
 * Forgot Password Page (Placeholder) for VentyLab
 * =============================================================================
 * Placeholder page for password reset functionality
 * TODO: Implement email-based password reset flow
 * =============================================================================
 */

import React from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Card,
  CardContent,
  Button,
  Typography,
  Container,
  Alert,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const router = useRouter();

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
        <Card elevation={10} sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: { xs: 3, sm: 5 }, textAlign: 'center' }}>
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              sx={{ fontWeight: 700, color: 'primary.main', mb: 3 }}
            >
              VentyLab
            </Typography>

            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              Recuperar Contraseña
            </Typography>

            <Alert severity="info" sx={{ my: 3, textAlign: 'left' }}>
              <Typography variant="body2">
                <strong>Funcionalidad en desarrollo</strong>
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                La recuperación de contraseña estará disponible próximamente.
                Por ahora, puedes:
              </Typography>
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                <li>Iniciar sesión con Google (no requiere contraseña)</li>
                <li>Contactar al administrador para restablecer tu contraseña</li>
              </ul>
            </Alert>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<ArrowBackIcon />}
                onClick={() => router.push('/auth/login')}
                sx={{
                  py: 1.5,
                  textTransform: 'none',
                  fontSize: '16px',
                  fontWeight: 600,
                }}
              >
                Volver al Login
              </Button>

              <Typography variant="body2" color="text.secondary">
                ¿No tienes cuenta?{' '}
                <Link href="/auth/register" passHref legacyBehavior>
                  <a style={{ fontWeight: 600, textDecoration: 'none' }}>
                    Regístrate aquí
                  </a>
                </Link>
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
