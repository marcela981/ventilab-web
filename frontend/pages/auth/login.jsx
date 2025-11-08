/**
 * =============================================================================
 * Login Page for VentyLab
 * =============================================================================
 * Primary authentication via Google OAuth with fallback to email/password
 * Responsive, accessible, and user-friendly login experience
 * =============================================================================
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { signIn, useSession } from 'next-auth/react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Link as MuiLink,
  Divider,
  IconButton,
  InputAdornment,
  Alert,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  Container,
  Paper,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Google as GoogleIcon,
  Login as LoginIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { getAuthErrorMessage } from '@/lib/auth-config';
import { getRedirectPathWithFallback } from '@/utils/redirectByRole';

/**
 * VentyLab Logo Component
 */
const VentiLabLogo = () => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      mb: 3,
    }}
  >
    <Box
      component="img"
      src="/images/logo.png"
      alt="VentyLab Logo"
      sx={{
        height: 60,
        width: 'auto',
        // Fallback if logo doesn't exist
        display: { xs: 'none', sm: 'block' },
      }}
      onError={(e) => {
        e.target.style.display = 'none';
      }}
    />
    <Typography
      variant="h4"
      component="h1"
      sx={{
        fontWeight: 700,
        color: 'primary.main',
        ml: 2,
      }}
    >
      VentyLab
    </Typography>
  </Box>
);

/**
 * Login Page Component
 */
export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { error: authError, callbackUrl } = router.query;

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  /**
   * Redirect authenticated users to role-specific dashboard
   * Priority: callbackUrl (attempted route) > role-based dashboard > default dashboard
   */
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      // Get role-based redirect path with fallback to attempted URL
      const userRole = session.user.role;
      const redirectUrl = getRedirectPathWithFallback(userRole, callbackUrl);

      console.log('[Login] Redirecting authenticated user:', {
        role: userRole,
        callbackUrl,
        finalRedirect: redirectUrl,
      });

      router.push(redirectUrl);
    }
  }, [status, session, router, callbackUrl]);

  /**
   * Display authentication error from URL if present
   */
  useEffect(() => {
    if (authError) {
      setError(getAuthErrorMessage(authError));
    }
  }, [authError]);

  /**
   * Validate email format
   */
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  /**
   * Validate form fields in real-time
   */
  const validateField = (name, value) => {
    const errors = { ...validationErrors };

    switch (name) {
      case 'email':
        if (!value) {
          errors.email = 'El email es requerido';
        } else if (!validateEmail(value)) {
          errors.email = 'Ingresa un email válido';
        } else {
          delete errors.email;
        }
        break;

      case 'password':
        if (!value) {
          errors.password = 'La contraseña es requerida';
        } else {
          delete errors.password;
        }
        break;

      default:
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handle input change with validation
   */
  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    const fieldValue = name === 'rememberMe' ? checked : value;

    setFormData((prev) => ({
      ...prev,
      [name]: fieldValue,
    }));

    // Clear error when user starts typing
    if (error) setError('');

    // Validate field
    if (name !== 'rememberMe') {
      validateField(name, fieldValue);
    }
  };

  /**
   * Handle Google Sign In
   * Note: Role-based redirect happens in the useEffect after successful authentication
   */
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError('');

      // Sign in with Google
      // The callbackUrl preserves the attempted URL if user was redirected from protected route
      // After successful auth, useEffect will handle role-based redirect
      await signIn('google', {
        callbackUrl: callbackUrl || '/dashboard',
      });
    } catch (err) {
      console.error('[Login] Google sign in error:', err);
      setError('Error al iniciar sesión con Google. Por favor intenta nuevamente.');
      setLoading(false);
    }
  };

  /**
   * Handle credentials login form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Clear previous errors
    setError('');

    // Validate all fields
    const isEmailValid = validateField('email', formData.email);
    const isPasswordValid = validateField('password', formData.password);

    if (!isEmailValid || !isPasswordValid) {
      setError('Por favor corrige los errores en el formulario');
      return;
    }

    try {
      setLoading(true);

      // Attempt sign in with credentials
      const result = await signIn('credentials', {
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        redirect: false,
        callbackUrl: callbackUrl || '/dashboard',
      });

      if (result?.error) {
        // Handle specific error from NextAuth
        setError(getAuthErrorMessage('CredentialsSignin'));
        // Clear password field on error
        setFormData((prev) => ({ ...prev, password: '' }));
      } else if (result?.ok) {
        // Success - Let the useEffect handle redirect based on session/role
        // The useEffect will trigger once session is established
        console.log('[Login] Credentials sign in successful, waiting for session...');
      }
    } catch (err) {
      console.error('[Login] Credentials sign in error:', err);
      setError('Error al iniciar sesión. Por favor intenta nuevamente.');
      setFormData((prev) => ({ ...prev, password: '' }));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Show loading spinner while checking session
   */
  if (status === 'loading') {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  /**
   * Render login form
   */
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
          <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
            {/* Logo and Title */}
            <VentiLabLogo />

            <Typography
              variant="h5"
              component="h2"
              align="center"
              gutterBottom
              sx={{ mb: 1, fontWeight: 600 }}
            >
              Iniciar Sesión
            </Typography>

            <Typography
              variant="body2"
              align="center"
              color="text.secondary"
              sx={{ mb: 4 }}
            >
              Accede a tu plataforma de aprendizaje de ventilación mecánica
            </Typography>

            {/* Error Alert */}
            {error && (
              <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            {/* PRIMARY: Google Sign In Button */}
            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={<GoogleIcon />}
              onClick={handleGoogleSignIn}
              disabled={loading}
              sx={{
                mb: 3,
                py: 1.5,
                backgroundColor: '#fff',
                color: '#757575',
                border: '1px solid #dadce0',
                textTransform: 'none',
                fontSize: '16px',
                fontWeight: 500,
                boxShadow: 'none',
                '&:hover': {
                  backgroundColor: '#f8f9fa',
                  boxShadow: '0 1px 2px 0 rgba(60,64,67,0.3)',
                },
                '&:active': {
                  backgroundColor: '#f1f3f4',
                },
              }}
            >
              Continuar con Google
            </Button>

            {/* Divider */}
            <Divider sx={{ my: 3 }}>
              <Typography variant="body2" color="text.secondary">
                o con email
              </Typography>
            </Divider>

            {/* Credentials Login Form */}
            <form onSubmit={handleSubmit} noValidate>
              {/* Email Field */}
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                error={!!validationErrors.email}
                helperText={validationErrors.email}
                disabled={loading}
                autoComplete="email"
                autoFocus
                sx={{ mb: 2 }}
                InputProps={{
                  sx: { borderRadius: 2 },
                }}
              />

              {/* Password Field */}
              <TextField
                fullWidth
                label="Contraseña"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                error={!!validationErrors.password}
                helperText={validationErrors.password}
                disabled={loading}
                autoComplete="current-password"
                sx={{ mb: 2 }}
                InputProps={{
                  sx: { borderRadius: 2 },
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        disabled={loading}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              {/* Remember Me and Forgot Password */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 3,
                }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      name="rememberMe"
                      checked={formData.rememberMe}
                      onChange={handleChange}
                      disabled={loading}
                      color="primary"
                    />
                  }
                  label={
                    <Typography variant="body2">Recordarme</Typography>
                  }
                />

                <Link href="/auth/forgot-password" passHref legacyBehavior>
                  <MuiLink
                    variant="body2"
                    sx={{
                      textDecoration: 'none',
                      '&:hover': { textDecoration: 'underline' },
                    }}
                  >
                    ¿Olvidaste tu contraseña?
                  </MuiLink>
                </Link>
              </Box>

              {/* Submit Button */}
              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                disabled={loading || Object.keys(validationErrors).length > 0}
                startIcon={loading ? <CircularProgress size={20} /> : <LoginIcon />}
                sx={{
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '16px',
                  fontWeight: 600,
                }}
              >
                {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </Button>
            </form>

            {/* Sign Up Link */}
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                ¿No tienes una cuenta?{' '}
                <Link href="/auth/register" passHref legacyBehavior>
                  <MuiLink
                    sx={{
                      fontWeight: 600,
                      textDecoration: 'none',
                      '&:hover': { textDecoration: 'underline' },
                    }}
                  >
                    Regístrate aquí
                  </MuiLink>
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
