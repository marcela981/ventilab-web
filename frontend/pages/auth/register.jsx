/**
 * =============================================================================
 * Registration Page for VentyLab
 * =============================================================================
 * Primary registration via Google OAuth with optional email/password fallback
 * Includes real-time password strength validation and visual feedback
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
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Google as GoogleIcon,
  PersonAdd as PersonAddIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import {
  validatePasswordStrength,
  getPasswordRequirements,
  validatePasswordMatch,
} from '@/utils/passwordValidator';

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
    <Typography
      variant="h4"
      component="h1"
      sx={{
        fontWeight: 700,
        color: 'primary.main',
      }}
    >
      VentyLab
    </Typography>
  </Box>
);

/**
 * Password Strength Indicator Component
 */
const PasswordStrengthIndicator = ({ password, show }) => {
  const validation = validatePasswordStrength(password);
  const requirements = getPasswordRequirements();

  // Color mapping for strength levels
  const strengthColors = {
    weak: 'error',
    medium: 'warning',
    strong: 'info',
    'very-strong': 'success',
  };

  const strengthLabels = {
    weak: 'Débil',
    medium: 'Media',
    strong: 'Fuerte',
    'very-strong': 'Muy Fuerte',
  };

  if (!show || !password) return null;

  return (
    <Box sx={{ mt: 2, mb: 2 }}>
      {/* Strength Bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Typography variant="caption" sx={{ mr: 2, minWidth: 100 }}>
          Fortaleza: <strong>{strengthLabels[validation.strength]}</strong>
        </Typography>
        <LinearProgress
          variant="determinate"
          value={validation.score}
          color={strengthColors[validation.strength]}
          sx={{
            flexGrow: 1,
            height: 8,
            borderRadius: 4,
            backgroundColor: 'rgba(0,0,0,0.1)',
          }}
        />
        <Typography variant="caption" sx={{ ml: 2, minWidth: 40 }}>
          {validation.score}%
        </Typography>
      </Box>

      {/* Requirements Checklist */}
      <List dense disablePadding>
        {requirements.map((req, index) => {
          const isValid = req.validator(password);
          return (
            <ListItem key={index} disableGutters sx={{ py: 0.25 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                {isValid ? (
                  <CheckCircleIcon color="success" fontSize="small" />
                ) : (
                  <CancelIcon color="disabled" fontSize="small" />
                )}
              </ListItemIcon>
              <ListItemText
                primary={req.text}
                primaryTypographyProps={{
                  variant: 'caption',
                  color: isValid ? 'success.main' : 'text.secondary',
                }}
              />
            </ListItem>
          );
        })}
      </List>

      {/* Feedback Messages */}
      {validation.feedback.length > 0 && (
        <Alert severity="info" sx={{ mt: 1, py: 0.5 }}>
          <Typography variant="caption">
            {validation.feedback[0]}
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

/**
 * Registration Page Component
 */
export default function RegisterPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPasswordStrength, setShowPasswordStrength] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  /**
   * Redirect authenticated users
   */
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  /**
   * Validate individual fields
   */
  const validateField = (name, value) => {
    const errors = { ...validationErrors };

    switch (name) {
      case 'name':
        if (!value || value.trim().length < 3) {
          errors.name = 'El nombre debe tener al menos 3 caracteres';
        } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(value)) {
          errors.name = 'El nombre solo puede contener letras y espacios';
        } else {
          delete errors.name;
        }
        break;

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!value) {
          errors.email = 'El email es requerido';
        } else if (!emailRegex.test(value)) {
          errors.email = 'Ingresa un email válido';
        } else {
          delete errors.email;
        }
        break;

      case 'password':
        const passwordValidation = validatePasswordStrength(value);
        if (!passwordValidation.isValid) {
          errors.password = 'La contraseña no cumple los requisitos mínimos';
        } else {
          delete errors.password;
        }
        // Also revalidate confirm password if it has value
        if (formData.confirmPassword) {
          const matchValidation = validatePasswordMatch(value, formData.confirmPassword);
          if (!matchValidation.isValid) {
            errors.confirmPassword = matchValidation.error;
          } else {
            delete errors.confirmPassword;
          }
        }
        break;

      case 'confirmPassword':
        const matchValidation = validatePasswordMatch(formData.password, value);
        if (!matchValidation.isValid) {
          errors.confirmPassword = matchValidation.error;
        } else {
          delete errors.confirmPassword;
        }
        break;

      case 'acceptTerms':
        if (!value) {
          errors.acceptTerms = 'Debes aceptar los términos y condiciones';
        } else {
          delete errors.acceptTerms;
        }
        break;

      default:
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handle input changes
   */
  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    const fieldValue = name === 'acceptTerms' ? checked : value;

    setFormData((prev) => ({
      ...prev,
      [name]: fieldValue,
    }));

    // Clear global errors
    if (error) setError('');
    if (success) setSuccess('');

    // Show password strength indicator when user starts typing
    if (name === 'password') {
      setShowPasswordStrength(true);
    }

    // Validate field
    validateField(name, fieldValue);
  };

  /**
   * Handle Google Sign Up
   */
  const handleGoogleSignUp = async () => {
    try {
      setLoading(true);
      setError('');

      await signIn('google', {
        callbackUrl: '/dashboard',
      });
    } catch (err) {
      console.error('[Register] Google sign up error:', err);
      setError('Error al registrarse con Google. Por favor intenta nuevamente.');
      setLoading(false);
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Clear previous messages
    setError('');
    setSuccess('');

    // Validate all fields
    const isNameValid = validateField('name', formData.name);
    const isEmailValid = validateField('email', formData.email);
    const isPasswordValid = validateField('password', formData.password);
    const isConfirmPasswordValid = validateField('confirmPassword', formData.confirmPassword);
    const isTermsValid = validateField('acceptTerms', formData.acceptTerms);

    if (!isNameValid || !isEmailValid || !isPasswordValid || !isConfirmPasswordValid || !isTermsValid) {
      setError('Por favor corrige todos los errores en el formulario');
      return;
    }

    try {
      setLoading(true);

      // Call signup API
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.toLowerCase().trim(),
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle error response
        if (data.errors && Array.isArray(data.errors)) {
          setError(data.errors.map(err => err.message).join('. '));
        } else if (data.feedback && Array.isArray(data.feedback)) {
          setError(data.feedback.join('. '));
        } else {
          setError(data.message || 'Error al crear tu cuenta');
        }
        return;
      }

      // Success!
      setSuccess('¡Cuenta creada exitosamente! Iniciando sesión...');

      // Auto-login after successful registration
      setTimeout(async () => {
        const result = await signIn('credentials', {
          email: formData.email,
          password: formData.password,
          redirect: false,
        });

        if (result?.ok) {
          router.push('/dashboard');
        } else {
          // If auto-login fails, redirect to login page
          router.push('/auth/login?message=AccountCreated');
        }
      }, 1500);

    } catch (err) {
      console.error('[Register] Sign up error:', err);
      setError('Error al procesar tu solicitud. Por favor intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Show loading while checking session
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
   * Render registration form
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
              Crear Cuenta
            </Typography>

            <Typography
              variant="body2"
              align="center"
              color="text.secondary"
              sx={{ mb: 4 }}
            >
              Únete a VentyLab y comienza tu aprendizaje en ventilación mecánica
            </Typography>

            {/* Error Alert */}
            {error && (
              <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            {/* Success Alert */}
            {success && (
              <Alert severity="success" sx={{ mb: 3 }}>
                {success}
              </Alert>
            )}

            {/* PRIMARY: Google Sign Up Button */}
            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={<GoogleIcon />}
              onClick={handleGoogleSignUp}
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
              }}
            >
              Registrarse con Google
            </Button>

            {/* Divider */}
            <Divider sx={{ my: 3 }}>
              <Typography variant="body2" color="text.secondary">
                o con email
              </Typography>
            </Divider>

            {/* Registration Form */}
            <form onSubmit={handleSubmit} noValidate>
              {/* Name Field */}
              <TextField
                fullWidth
                label="Nombre Completo"
                name="name"
                value={formData.name}
                onChange={handleChange}
                error={!!validationErrors.name}
                helperText={validationErrors.name}
                disabled={loading}
                autoComplete="name"
                autoFocus
                sx={{ mb: 2 }}
                InputProps={{
                  sx: { borderRadius: 2 },
                }}
              />

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
                sx={{ mb: 2 }}
                InputProps={{
                  sx: { borderRadius: 2 },
                  endAdornment: !validationErrors.email && formData.email && (
                    <InputAdornment position="end">
                      <CheckCircleIcon color="success" />
                    </InputAdornment>
                  ),
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
                autoComplete="new-password"
                sx={{ mb: 1 }}
                InputProps={{
                  sx: { borderRadius: 2 },
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
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

              {/* Password Strength Indicator */}
              <PasswordStrengthIndicator
                password={formData.password}
                show={showPasswordStrength}
              />

              {/* Confirm Password Field */}
              <TextField
                fullWidth
                label="Confirmar Contraseña"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange}
                error={!!validationErrors.confirmPassword}
                helperText={validationErrors.confirmPassword}
                disabled={loading}
                autoComplete="new-password"
                sx={{ mb: 2 }}
                InputProps={{
                  sx: { borderRadius: 2 },
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                        disabled={loading}
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              {/* Terms and Conditions */}
              <FormControlLabel
                control={
                  <Checkbox
                    name="acceptTerms"
                    checked={formData.acceptTerms}
                    onChange={handleChange}
                    disabled={loading}
                    color="primary"
                  />
                }
                label={
                  <Typography variant="body2">
                    Acepto los{' '}
                    <MuiLink href="/terms" target="_blank">
                      términos y condiciones
                    </MuiLink>
                    {' '}y la{' '}
                    <MuiLink href="/privacy" target="_blank">
                      política de privacidad
                    </MuiLink>
                  </Typography>
                }
                sx={{ mb: 3 }}
              />
              {validationErrors.acceptTerms && (
                <Typography variant="caption" color="error" sx={{ display: 'block', mt: -2, mb: 2 }}>
                  {validationErrors.acceptTerms}
                </Typography>
              )}

              {/* Submit Button */}
              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                disabled={loading || Object.keys(validationErrors).length > 0}
                startIcon={loading ? <CircularProgress size={20} /> : <PersonAddIcon />}
                sx={{
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '16px',
                  fontWeight: 600,
                }}
              >
                {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
              </Button>
            </form>

            {/* Login Link */}
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                ¿Ya tienes una cuenta?{' '}
                <Link href="/auth/login" passHref legacyBehavior>
                  <MuiLink
                    sx={{
                      fontWeight: 600,
                      textDecoration: 'none',
                      '&:hover': { textDecoration: 'underline' },
                    }}
                  >
                    Inicia sesión aquí
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
