/**
 * =============================================================================
 * ChangePasswordForm Component for VentyLab
 * =============================================================================
 * Form for changing user password with validation and security requirements.
 *
 * Features:
 * - Current password verification
 * - Password strength indicator
 * - Password confirmation matching
 * - Show/hide password toggle
 * - Real-time validation
 * - Success/error feedback
 * =============================================================================
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Lock as LockIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { changePassword } from '@/services/authService';
import { useNotification } from '@/contexts/NotificationContext';

/**
 * Password strength calculation
 * @param {string} password - Password to evaluate
 * @returns {Object} Strength info with score and label
 */
const calculatePasswordStrength = (password) => {
  if (!password) {
    return { score: 0, label: '', color: 'error' };
  }

  let score = 0;

  // Length
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 10;

  // Contains lowercase
  if (/[a-z]/.test(password)) score += 20;

  // Contains uppercase
  if (/[A-Z]/.test(password)) score += 20;

  // Contains numbers
  if (/\d/.test(password)) score += 20;

  // Contains special characters
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 20;

  // Determine label and color
  let label = '';
  let color = 'error';

  if (score <= 40) {
    label = 'Débil';
    color = 'error';
  } else if (score <= 60) {
    label = 'Media';
    color = 'warning';
  } else if (score <= 80) {
    label = 'Fuerte';
    color = 'info';
  } else {
    label = 'Muy Fuerte';
    color = 'success';
  }

  return { score, label, color };
};

/**
 * Password requirements validation
 * @param {string} password - Password to validate
 * @returns {Object} Object with boolean properties for each requirement
 */
const getPasswordRequirements = (password) => {
  return {
    minLength: password.length >= 8,
    hasLowercase: /[a-z]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };
};

/**
 * ChangePasswordForm Component
 *
 * @param {Object} props - Component props
 *
 * @example
 * <ChangePasswordForm />
 */
export function ChangePasswordForm() {
  const { showSuccess, showError } = useNotification();

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordStrength = calculatePasswordStrength(formData.newPassword);
  const passwordRequirements = getPasswordRequirements(formData.newPassword);

  /**
   * Toggle password visibility
   */
  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  /**
   * Validate form field
   */
  const validateField = (name, value) => {
    switch (name) {
      case 'currentPassword':
        if (!value) {
          return 'La contraseña actual es requerida';
        }
        return null;

      case 'newPassword':
        if (!value) {
          return 'La nueva contraseña es requerida';
        }
        if (value.length < 8) {
          return 'La contraseña debe tener al menos 8 caracteres';
        }
        if (!/[a-z]/.test(value)) {
          return 'Debe contener al menos una letra minúscula';
        }
        if (!/[A-Z]/.test(value)) {
          return 'Debe contener al menos una letra mayúscula';
        }
        if (!/\d/.test(value)) {
          return 'Debe contener al menos un número';
        }
        if (value === formData.currentPassword) {
          return 'La nueva contraseña debe ser diferente a la actual';
        }
        return null;

      case 'confirmPassword':
        if (!value) {
          return 'Debes confirmar la nueva contraseña';
        }
        if (value !== formData.newPassword) {
          return 'Las contraseñas no coinciden';
        }
        return null;

      default:
        return null;
    }
  };

  /**
   * Handle input change
   */
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    // Also validate confirmPassword when newPassword changes
    if (name === 'newPassword' && formData.confirmPassword) {
      const confirmError = validateField('confirmPassword', formData.confirmPassword);
      setErrors((prev) => ({
        ...prev,
        confirmPassword: confirmError,
      }));
    }
  };

  /**
   * Validate entire form
   */
  const validateForm = () => {
    const newErrors = {};

    newErrors.currentPassword = validateField('currentPassword', formData.currentPassword);
    newErrors.newPassword = validateField('newPassword', formData.newPassword);
    newErrors.confirmPassword = validateField('confirmPassword', formData.confirmPassword);

    // Remove null errors
    Object.keys(newErrors).forEach((key) => {
      if (newErrors[key] === null) {
        delete newErrors[key];
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      showError('Por favor corrige los errores en el formulario');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await changePassword(
        formData.currentPassword,
        formData.newPassword,
        formData.confirmPassword
      );

      if (response.success) {
        showSuccess('Contraseña actualizada correctamente');

        // Reset form
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        
        // Clear errors
        setErrors({});
      } else {
        // Handle specific error messages from backend
        const errorMsg = response.error?.message || 'Error al cambiar la contraseña';
        
        // Check for specific error types
        if (errorMsg.includes('actual incorrecta') || errorMsg.includes('Contraseña actual incorrecta')) {
          showError('Contraseña actual incorrecta');
        } else if (errorMsg.includes('no coinciden') || errorMsg.includes('Las contraseñas no coinciden')) {
          showError('Las contraseñas no coinciden');
        } else if (errorMsg.includes('diferente')) {
          showError('La nueva contraseña debe ser diferente a la actual');
        } else {
          showError(errorMsg);
        }
      }
    } catch (error) {
      console.error('Error changing password:', error);
      showError('Error inesperado al cambiar la contraseña');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card elevation={3} sx={{ borderRadius: 3 }}>
      <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              bgcolor: 'warning.lighter',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LockIcon sx={{ fontSize: 32, color: 'warning.main' }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Cambiar Contraseña
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Actualiza tu contraseña periódicamente para mantener tu cuenta segura
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Form */}
        <Box component="form" onSubmit={handleSubmit} noValidate>
          {/* Current Password */}
          <TextField
            fullWidth
            label="Contraseña Actual"
            name="currentPassword"
            type={showPasswords.current ? 'text' : 'password'}
            value={formData.currentPassword}
            onChange={handleChange}
            error={!!errors.currentPassword}
            helperText={errors.currentPassword}
            required
            disabled={isSubmitting}
            sx={{ mb: 3 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => togglePasswordVisibility('current')}
                    edge="end"
                  >
                    {showPasswords.current ? (
                      <VisibilityOffIcon />
                    ) : (
                      <VisibilityIcon />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {/* New Password */}
          <TextField
            fullWidth
            label="Nueva Contraseña"
            name="newPassword"
            type={showPasswords.new ? 'text' : 'password'}
            value={formData.newPassword}
            onChange={handleChange}
            error={!!errors.newPassword}
            helperText={errors.newPassword}
            required
            disabled={isSubmitting}
            sx={{ mb: 2 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => togglePasswordVisibility('new')}
                    edge="end"
                  >
                    {showPasswords.new ? (
                      <VisibilityOffIcon />
                    ) : (
                      <VisibilityIcon />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {/* Password Strength Indicator */}
          {formData.newPassword && (
            <Box sx={{ mb: 3 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  mb: 1,
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Fuerza de la contraseña:
                </Typography>
                <Typography
                  variant="caption"
                  fontWeight={600}
                  color={`${passwordStrength.color}.main`}
                >
                  {passwordStrength.label}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={passwordStrength.score}
                color={passwordStrength.color}
                sx={{ height: 6, borderRadius: 3 }}
              />
            </Box>
          )}

          {/* Password Requirements */}
          {formData.newPassword && (
            <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
              <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Requisitos de contraseña:
              </Typography>
              <List dense disablePadding>
                <ListItem disablePadding sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    {passwordRequirements.minLength ? (
                      <CheckIcon fontSize="small" color="success" />
                    ) : (
                      <CloseIcon fontSize="small" color="error" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary="Mínimo 8 caracteres"
                    primaryTypographyProps={{
                      variant: 'caption',
                      color: passwordRequirements.minLength ? 'success.main' : 'text.secondary',
                    }}
                  />
                </ListItem>
                <ListItem disablePadding sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    {passwordRequirements.hasLowercase ? (
                      <CheckIcon fontSize="small" color="success" />
                    ) : (
                      <CloseIcon fontSize="small" color="error" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary="Al menos una letra minúscula"
                    primaryTypographyProps={{
                      variant: 'caption',
                      color: passwordRequirements.hasLowercase ? 'success.main' : 'text.secondary',
                    }}
                  />
                </ListItem>
                <ListItem disablePadding sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    {passwordRequirements.hasUppercase ? (
                      <CheckIcon fontSize="small" color="success" />
                    ) : (
                      <CloseIcon fontSize="small" color="error" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary="Al menos una letra mayúscula"
                    primaryTypographyProps={{
                      variant: 'caption',
                      color: passwordRequirements.hasUppercase ? 'success.main' : 'text.secondary',
                    }}
                  />
                </ListItem>
                <ListItem disablePadding sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    {passwordRequirements.hasNumber ? (
                      <CheckIcon fontSize="small" color="success" />
                    ) : (
                      <CloseIcon fontSize="small" color="error" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary="Al menos un número"
                    primaryTypographyProps={{
                      variant: 'caption',
                      color: passwordRequirements.hasNumber ? 'success.main' : 'text.secondary',
                    }}
                  />
                </ListItem>
              </List>
            </Box>
          )}

          {/* Confirm Password */}
          <TextField
            fullWidth
            label="Confirmar Nueva Contraseña"
            name="confirmPassword"
            type={showPasswords.confirm ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={handleChange}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword}
            required
            disabled={isSubmitting}
            sx={{ mb: 3 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => togglePasswordVisibility('confirm')}
                    edge="end"
                  >
                    {showPasswords.confirm ? (
                      <VisibilityOffIcon />
                    ) : (
                      <VisibilityIcon />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {/* Submit Button */}
          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={isSubmitting}
            startIcon={
              isSubmitting ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <SaveIcon />
              )
            }
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 2,
              py: 1.5,
            }}
          >
            {isSubmitting ? 'Actualizando...' : 'Cambiar Contraseña'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}

ChangePasswordForm.propTypes = {};

export default ChangePasswordForm;

