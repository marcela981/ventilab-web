/**
 * =============================================================================
 * EditProfileForm Component for VentyLab
 * =============================================================================
 * Inline form for editing user profile information with real-time validation.
 *
 * Features:
 * - Inline editing within profile view
 * - Real-time form validation
 * - Avatar upload placeholder
 * - Unsaved changes warning
 * - Success/error feedback
 * - Responsive layout
 * =============================================================================
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Card,
  CardContent,
  Avatar,
  Typography,
  TextField,
  Button,
  Alert,
  IconButton,
  Tooltip,
  CircularProgress,
  Grid,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  PhotoCamera as PhotoCameraIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { updateProfile, uploadAvatar } from '@/shared/services/authService';
import { useNotification } from '@/shared/contexts/NotificationContext';

/**
 * Get initials from name for avatar
 * @param {string} name - Full name
 * @returns {string} Initials
 */
const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

/**
 * EditProfileForm Component
 *
 * @param {Object} props - Component props
 * @param {Object} props.user - User data object
 * @param {Function} props.onSave - Callback when profile is saved successfully
 * @param {Function} props.onCancel - Callback when editing is cancelled
 *
 * @example
 * <EditProfileForm
 *   user={currentUser}
 *   onSave={(updatedUser) => console.log('Saved:', updatedUser)}
 *   onCancel={() => setIsEditMode(false)}
 * />
 */
export function EditProfileForm({ user, onSave, onCancel }) {
  const { showSuccess, showError } = useNotification();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(user?.image || null);
  const [avatarFile, setAvatarFile] = useState(null);

  // Track if form has been modified
  useEffect(() => {
    const changed =
      formData.name !== (user?.name || '') ||
      formData.bio !== (user?.bio || '');
    setHasChanges(changed);
  }, [formData, user]);

  // Warn user before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  /**
   * Validate form field
   * @param {string} name - Field name
   * @param {string} value - Field value
   * @returns {string|null} Error message or null
   */
  const validateField = (name, value) => {
    switch (name) {
      case 'name':
        if (!value.trim()) {
          return 'El nombre es requerido';
        }
        if (value.trim().length < 3) {
          return 'El nombre debe tener al menos 3 caracteres';
        }
        if (value.trim().length > 100) {
          return 'El nombre no puede exceder 100 caracteres';
        }
        return null;

      case 'bio':
        if (value && value.length > 500) {
          return 'La biografía no puede exceder 500 caracteres';
        }
        return null;

      default:
        return null;
    }
  };

  /**
   * Handle input change with real-time validation
   */
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Real-time validation
    const error = validateField(name, value);
    setErrors((prev) => ({
      ...prev,
      [name]: error,
    }));

    // Clear API error when user starts typing
    if (apiError) {
      setApiError(null);
    }
  };

  /**
   * Validate entire form
   * @returns {boolean} True if form is valid
   */
  const validateForm = () => {
    const newErrors = {};

    newErrors.name = validateField('name', formData.name);
    newErrors.bio = validateField('bio', formData.bio);

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
   * Handle avatar upload
   */
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      showError('Solo se permiten archivos PNG, JPG o JPEG');
      return;
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB in bytes
    if (file.size > maxSize) {
      showError('La imagen no puede exceder 2 MB');
      return;
    }

    // Create preview and upload
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result;
      setAvatarPreview(base64Data);
      setAvatarFile(base64Data);

      // Upload avatar immediately
      setIsUploadingAvatar(true);
      try {
        const response = await uploadAvatar(base64Data);

        if (response.success) {
          showSuccess('Avatar actualizado correctamente');
          // Call onSave with updated user data
          if (onSave) {
            onSave(response.data.user);
          }
        } else {
          showError(response.error?.message || 'Error al actualizar el avatar');
          // Revert preview on error
          setAvatarPreview(user?.image || null);
        }
      } catch (error) {
        console.error('Error uploading avatar:', error);
        showError('Error inesperado al subir la imagen');
        setAvatarPreview(user?.image || null);
      } finally {
        setIsUploadingAvatar(false);
      }
    };

    reader.onerror = () => {
      showError('Error al leer el archivo');
    };

    reader.readAsDataURL(file);
  };

  /**
   * Handle avatar removal
   */
  const handleRemoveAvatar = async () => {
    setIsUploadingAvatar(true);
    try {
      // Upload empty avatar (null or empty string)
      const response = await uploadAvatar('');

      if (response.success) {
        showSuccess('Avatar eliminado correctamente');
        setAvatarPreview(null);
        setAvatarFile(null);
        if (onSave) {
          onSave(response.data.user);
        }
      } else {
        showError(response.error?.message || 'Error al eliminar el avatar');
      }
    } catch (error) {
      console.error('Error removing avatar:', error);
      showError('Error inesperado al eliminar el avatar');
    } finally {
      setIsUploadingAvatar(false);
    }
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

    // Check if there are changes
    if (!hasChanges) {
      showInfo('No hay cambios para guardar');
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare update data (only send changed fields)
      const updates = {};
      if (formData.name !== (user?.name || '')) {
        updates.name = formData.name.trim();
      }
      if (formData.bio !== (user?.bio || '')) {
        updates.bio = formData.bio.trim();
      }

      // Check if there are actually changes to send
      if (Object.keys(updates).length === 0) {
        showInfo('No hay cambios para guardar');
        setIsSubmitting(false);
        return;
      }

      // Call API to update profile
      const response = await updateProfile(updates);

      if (response.success) {
        showSuccess('Perfil actualizado correctamente');
        setHasChanges(false);

        // Call onSave callback with updated user data
        setTimeout(() => {
          if (onSave) {
            onSave(response.data.user);
          }
        }, 500);
      } else {
        const errorMsg = response.error?.message || 'Error al actualizar el perfil';
        showError(errorMsg);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      showError('Error inesperado al actualizar el perfil');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * showInfo helper (using showWarning if showInfo doesn't exist)
   */
  const showInfo = (message) => {
    showSuccess(message); // Or use a custom info notification
  };

  /**
   * Handle cancel with confirmation if there are unsaved changes
   */
  const handleCancelClick = () => {
    if (hasChanges) {
      const confirmed = window.confirm(
        '¿Estás seguro de que quieres cancelar? Los cambios no guardados se perderán.'
      );
      if (!confirmed) {
        return;
      }
    }
    onCancel();
  };

  return (
    <Card
      elevation={3}
      sx={{
        position: 'relative',
        overflow: 'visible',
        borderRadius: 3,
      }}
    >
      {/* Background gradient header */}
      <Box
        sx={{
          height: 120,
          background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
          position: 'relative',
        }}
      />

      <CardContent sx={{ pt: 0, px: { xs: 2, sm: 4 }, pb: 4 }}>
        {/* Avatar Section */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            mt: -8,
          }}
        >
          {/* Avatar with edit overlay */}
          <Box sx={{ position: 'relative' }}>
            <Avatar
              src={avatarPreview}
              alt={formData.name || 'Usuario'}
              sx={{
                width: 140,
                height: 140,
                border: '5px solid white',
                boxShadow: 3,
                bgcolor: 'primary.main',
                fontSize: '3rem',
                fontWeight: 600,
              }}
            >
              {getInitials(formData.name)}
            </Avatar>

            {/* Avatar upload button */}
            <Tooltip title="Cambiar foto">
              <IconButton
                component="label"
                disabled={isUploadingAvatar || isSubmitting}
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                  boxShadow: 2,
                  '&.Mui-disabled': {
                    bgcolor: 'action.disabledBackground',
                  },
                }}
              >
                {isUploadingAvatar ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <PhotoCameraIcon />
                )}
                <input
                  type="file"
                  hidden
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleAvatarChange}
                  disabled={isUploadingAvatar || isSubmitting}
                />
              </IconButton>
            </Tooltip>

            {/* Remove avatar button */}
            {avatarPreview && (
              <Tooltip title="Eliminar foto">
                <IconButton
                  onClick={handleRemoveAvatar}
                  disabled={isUploadingAvatar || isSubmitting}
                  sx={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    bgcolor: 'error.main',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'error.dark',
                    },
                    boxShadow: 2,
                    '&.Mui-disabled': {
                      bgcolor: 'action.disabledBackground',
                    },
                  }}
                  size="small"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 2, textAlign: 'center' }}
          >
            {isUploadingAvatar
              ? 'Subiendo imagen...'
              : 'Haz clic en el ícono de cámara para cambiar tu foto de perfil (máx. 2MB, PNG/JPG)'}
          </Typography>
        </Box>

        {/* Form */}
        <Box
          component="form"
          onSubmit={handleSubmit}
          noValidate
          sx={{ mt: 4 }}
        >

          <Grid container spacing={3}>
            {/* Name Field */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nombre Completo"
                name="name"
                value={formData.name}
                onChange={handleChange}
                error={!!errors.name}
                helperText={errors.name || 'Mínimo 3 caracteres'}
                required
                disabled={isSubmitting}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>

            {/* Email Field (disabled) */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Correo Electrónico"
                value={user?.email || ''}
                disabled
                helperText="El correo electrónico no se puede modificar"
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>

            {/* Bio Field */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Biografía"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                error={!!errors.bio}
                helperText={
                  errors.bio ||
                  `${formData.bio.length}/500 caracteres`
                }
                multiline
                rows={4}
                disabled={isSubmitting}
                placeholder="Cuéntanos un poco sobre ti..."
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
          </Grid>

          {/* Action Buttons */}
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              justifyContent: 'flex-end',
              mt: 4,
            }}
          >
            <Button
              variant="outlined"
              onClick={handleCancelClick}
              disabled={isSubmitting}
              startIcon={<CancelIcon />}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 2,
                px: 3,
              }}
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              variant="contained"
              disabled={
                isSubmitting ||
                isUploadingAvatar ||
                !hasChanges ||
                Object.keys(errors).length > 0
              }
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
                px: 3,
              }}
            >
              {isSubmitting
                ? 'Guardando...'
                : isUploadingAvatar
                ? 'Subiendo imagen...'
                : 'Guardar Cambios'}
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

EditProfileForm.propTypes = {
  user: PropTypes.shape({
    name: PropTypes.string,
    email: PropTypes.string,
    bio: PropTypes.string,
    image: PropTypes.string,
  }).isRequired,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default EditProfileForm;

