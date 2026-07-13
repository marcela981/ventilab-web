/**
 * =============================================================================
 * EditProfileForm Component for VentyLab
 * =============================================================================
 * Inline form for editing user profile information with real-time validation.
 *
 * Features:
 * - Inline editing within profile view
 * - Real-time form validation
 * - Avatar upload/removal persisted via PUT /users/me (image as base64 data-URL)
 * - Unsaved changes warning
 * - Success/error feedback
 * - Responsive layout
 *
 * Estilos: clases de ../ui/profile.module.css (variables de tema VentyLab).
 * =============================================================================
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Avatar,
  Typography,
  TextField,
  Button,
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
import { profileApi } from '@/features/profile/profile.api';
import { useNotification } from '@/shared/contexts/NotificationContext';
import styles from '../ui/profile.module.css';

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
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(user?.image || null);

  // Track if form has been modified
  useEffect(() => {
    const changed = formData.name !== (user?.name || '');
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

    // Real-time validation. El campo válido se ELIMINA del objeto (no se
    // guarda como null): el botón Guardar se deshabilita con
    // Object.keys(errors).length, y una clave con null lo bloquearía siempre.
    const error = validateField(name, value);
    setErrors((prev) => {
      const next = { ...prev };
      if (error) {
        next[name] = error;
      } else {
        delete next[name];
      }
      return next;
    });
  };

  /**
   * Validate entire form
   * @returns {boolean} True if form is valid
   */
  const validateForm = () => {
    const newErrors = {};

    newErrors.name = validateField('name', formData.name);

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
   * Handle avatar upload — la foto se persiste vía PUT /users/me como
   * data-URL base64 (el backend la valida y guarda en User.image).
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

      // Upload avatar immediately
      setIsUploadingAvatar(true);
      try {
        const response = await profileApi.updateProfile({ image: base64Data });

        if (response.success) {
          showSuccess('Foto de perfil actualizada correctamente');
          // Call onSave with updated user data
          if (onSave) {
            onSave(response.data.user);
          }
        } else {
          showError(response.error?.message || 'Error al actualizar la foto');
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
   * Handle avatar removal — image: null limpia la foto en el backend.
   */
  const handleRemoveAvatar = async () => {
    setIsUploadingAvatar(true);
    try {
      const response = await profileApi.updateProfile({ image: null });

      if (response.success) {
        showSuccess('Foto de perfil eliminada correctamente');
        setAvatarPreview(null);
        if (onSave) {
          onSave(response.data.user);
        }
      } else {
        showError(response.error?.message || 'Error al eliminar la foto');
      }
    } catch (error) {
      console.error('Error removing avatar:', error);
      showError('Error inesperado al eliminar la foto');
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

      // Check if there are actually changes to send
      if (Object.keys(updates).length === 0) {
        showInfo('No hay cambios para guardar');
        setIsSubmitting(false);
        return;
      }

      // Call API to update profile
      const response = await profileApi.updateProfile(updates);

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
   * showInfo helper (using showSuccess if showInfo doesn't exist)
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
    <Card elevation={3} className={styles.card}>
      {/* Background gradient header */}
      <Box className={styles.cardBanner} />

      <CardContent className={styles.cardContent}>
        {/* Avatar Section */}
        <Box className={styles.avatarSection}>
          {/* Avatar with edit overlay */}
          <Box className={styles.avatarWrap}>
            <Avatar
              src={avatarPreview}
              alt={formData.name || 'Usuario'}
              className={styles.avatar}
            >
              {getInitials(formData.name)}
            </Avatar>

            {/* Avatar upload button */}
            <Tooltip title="Cambiar foto">
              <IconButton
                component="label"
                disabled={isUploadingAvatar || isSubmitting}
                className={styles.avatarUploadBtn}
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
                  className={styles.avatarRemoveBtn}
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
            className={styles.avatarCaption}
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
          className={styles.formSection}
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
          </Grid>

          {/* Action Buttons */}
          <Box className={styles.actionsRow}>
            <Button
              variant="outlined"
              onClick={handleCancelClick}
              disabled={isSubmitting}
              startIcon={<CancelIcon />}
              className={styles.actionBtn}
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
              className={styles.actionBtn}
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

export default EditProfileForm;
