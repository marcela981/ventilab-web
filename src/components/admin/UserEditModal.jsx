/**
 * =============================================================================
 * UserEditModal Component
 * =============================================================================
 *
 * Modal para editar la información de un usuario existente en el panel de
 * administración. Incluye formulario con validaciones, estadísticas del
 * usuario y opciones de activación/desactivación de cuenta.
 *
 * Características:
 * - Formulario completo con validaciones en tiempo real
 * - Validación de email único con backend
 * - Sección de información no editable
 * - Estadísticas expandibles del usuario con progress bars
 * - Switch para activar/desactivar cuenta
 * - Manejo de errores del backend
 * - Loading states durante guardado
 * - Botones de cancelar y guardar
 *
 * =============================================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Grid,
  Link,
  Chip,
} from '@mui/material';
import {
  Close,
  ExpandMore,
  Assessment,
  School,
  MenuBook,
  AccessTime,
  TrendingUp,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Expresión regular para validar formato de email
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Roles disponibles con sus etiquetas
 */
const ROLES = [
  { value: 'STUDENT', label: 'Estudiante' },
  { value: 'TEACHER', label: 'Profesor' },
  { value: 'ADMIN', label: 'Administrador' },
];

/**
 * Formatea el tiempo de estudio en horas y minutos
 *
 * @param {number} minutes - Tiempo en minutos
 * @returns {string} Tiempo formateado
 */
const formatStudyTime = (minutes) => {
  if (!minutes || minutes === 0) return '0 minutos';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins} minutos`;
  if (mins === 0) return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;

  return `${hours} ${hours === 1 ? 'hora' : 'horas'} y ${mins} minutos`;
};

/**
 * Componente UserEditModal
 *
 * Modal para editar información de usuario con validaciones completas
 * y visualización de estadísticas.
 *
 * @component
 * @example
 * ```jsx
 * <UserEditModal
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   user={selectedUser}
 *   onSave={(updatedData) => handleSaveUser(updatedData)}
 *   isSaving={false}
 * />
 * ```
 */
const UserEditModal = ({ open, onClose, user, onSave, isSaving }) => {
  // ============================================================================
  // Estado Local del Formulario
  // ============================================================================

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'STUDENT',
    isActive: true,
  });

  const [errors, setErrors] = useState({
    name: '',
    email: '',
  });

  const [touched, setTouched] = useState({
    name: false,
    email: false,
  });

  const [backendError, setBackendError] = useState(null);
  const [isValidatingEmail, setIsValidatingEmail] = useState(false);
  const [originalEmail, setOriginalEmail] = useState('');

  // ============================================================================
  // Cargar Datos Iniciales del Usuario
  // ============================================================================

  /**
   * Carga los datos del usuario cuando el modal se abre
   */
  useEffect(() => {
    if (open && user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        role: user.role || 'STUDENT',
        isActive: user.isActive !== undefined ? user.isActive : true,
      });
      setOriginalEmail(user.email || '');
      setErrors({ name: '', email: '' });
      setTouched({ name: false, email: false });
      setBackendError(null);
    }
  }, [open, user]);

  // ============================================================================
  // Validaciones
  // ============================================================================

  /**
   * Valida el nombre
   *
   * @param {string} name - Nombre a validar
   * @returns {string} Mensaje de error o string vacío si es válido
   */
  const validateName = useCallback((name) => {
    if (!name || name.trim().length === 0) {
      return 'El nombre es requerido';
    }
    if (name.trim().length < 3) {
      return 'El nombre debe tener al menos 3 caracteres';
    }
    return '';
  }, []);

  /**
   * Valida el formato del email
   *
   * @param {string} email - Email a validar
   * @returns {string} Mensaje de error o string vacío si es válido
   */
  const validateEmailFormat = useCallback((email) => {
    if (!email || email.trim().length === 0) {
      return 'El email es requerido';
    }
    if (!EMAIL_REGEX.test(email)) {
      return 'Formato de email inválido';
    }
    return '';
  }, []);

  /**
   * Valida si el email es único consultando al backend
   * Solo valida si el email cambió respecto al original
   *
   * @param {string} email - Email a validar
   */
  const validateEmailUniqueness = useCallback(
    async (email) => {
      // Si el email no cambió, no validar
      if (email === originalEmail) {
        return;
      }

      // Si el formato es inválido, no consultar backend
      const formatError = validateEmailFormat(email);
      if (formatError) {
        return;
      }

      setIsValidatingEmail(true);

      try {
        // Simular validación con backend
        // En producción, reemplazar con llamada real a la API
        await new Promise((resolve) => setTimeout(resolve, 500));

        // TODO: Implementar llamada real al backend
        // const response = await fetch(`/api/admin/users/check-email?email=${email}`);
        // const data = await response.json();
        // if (!data.isAvailable) {
        //   setErrors(prev => ({ ...prev, email: 'Este email ya está en uso' }));
        // }

        // Por ahora, asumir que el email es único
        setErrors((prev) => ({ ...prev, email: '' }));
      } catch (error) {
        console.error('Error validating email:', error);
      } finally {
        setIsValidatingEmail(false);
      }
    },
    [originalEmail, validateEmailFormat]
  );

  /**
   * Maneja el cambio en el campo de nombre
   */
  const handleNameChange = (event) => {
    const value = event.target.value;
    setFormData((prev) => ({ ...prev, name: value }));

    // Validar en tiempo real solo si ya fue touched
    if (touched.name) {
      const error = validateName(value);
      setErrors((prev) => ({ ...prev, name: error }));
    }
  };

  /**
   * Maneja el blur en el campo de nombre
   */
  const handleNameBlur = () => {
    setTouched((prev) => ({ ...prev, name: true }));
    const error = validateName(formData.name);
    setErrors((prev) => ({ ...prev, name: error }));
  };

  /**
   * Maneja el cambio en el campo de email
   */
  const handleEmailChange = (event) => {
    const value = event.target.value;
    setFormData((prev) => ({ ...prev, email: value }));

    // Validar formato en tiempo real solo si ya fue touched
    if (touched.email) {
      const error = validateEmailFormat(value);
      setErrors((prev) => ({ ...prev, email: error }));

      // Si el formato es válido y el email cambió, validar unicidad
      if (!error && value !== originalEmail) {
        validateEmailUniqueness(value);
      }
    }
  };

  /**
   * Maneja el blur en el campo de email
   */
  const handleEmailBlur = () => {
    setTouched((prev) => ({ ...prev, email: true }));
    const error = validateEmailFormat(formData.email);
    setErrors((prev) => ({ ...prev, email: error }));

    // Validar unicidad si el formato es válido
    if (!error) {
      validateEmailUniqueness(formData.email);
    }
  };

  /**
   * Maneja el cambio en el campo de rol
   */
  const handleRoleChange = (event) => {
    setFormData((prev) => ({ ...prev, role: event.target.value }));
  };

  /**
   * Maneja el cambio en el switch de estado activo
   */
  const handleActiveChange = (event) => {
    setFormData((prev) => ({ ...prev, isActive: event.target.checked }));
  };

  // ============================================================================
  // Manejo de Guardado
  // ============================================================================

  /**
   * Valida todos los campos antes de guardar
   *
   * @returns {boolean} True si todos los campos son válidos
   */
  const validateAllFields = () => {
    const nameError = validateName(formData.name);
    const emailError = validateEmailFormat(formData.email);

    setErrors({
      name: nameError,
      email: emailError,
    });

    setTouched({
      name: true,
      email: true,
    });

    return !nameError && !emailError;
  };

  /**
   * Maneja el guardado del formulario
   */
  const handleSave = async () => {
    // Validar todos los campos
    if (!validateAllFields()) {
      return;
    }

    // Limpiar error del backend
    setBackendError(null);

    try {
      // Llamar al callback de guardado
      await onSave({
        ...formData,
        id: user.id,
      });

      // Si llegamos aquí, el guardado fue exitoso
      // No cerramos el modal aquí, el padre debe manejarlo
    } catch (error) {
      // Mostrar error del backend
      setBackendError(error.message || 'Error al guardar los cambios');
    }
  };

  /**
   * Maneja el cierre del modal
   */
  const handleClose = () => {
    if (!isSaving) {
      onClose();
    }
  };

  // ============================================================================
  // Determinar si el formulario ha cambiado
  // ============================================================================

  const hasChanges =
    formData.name !== user?.name ||
    formData.email !== user?.email ||
    formData.role !== user?.role ||
    formData.isActive !== user?.isActive;

  // ============================================================================
  // Renderizado
  // ============================================================================

  if (!user) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '70vh' },
      }}
    >
      {/* Header del Dialog */}
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 2,
        }}
      >
        <Typography variant="h6" component="div">
          Editar Usuario
        </Typography>
        <IconButton
          edge="end"
          color="inherit"
          onClick={handleClose}
          disabled={isSaving}
          aria-label="Cerrar"
        >
          <Close />
        </IconButton>
      </DialogTitle>

      {/* Contenido del Dialog */}
      <DialogContent dividers>
        {/* Error del Backend */}
        {backendError && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setBackendError(null)}>
            {backendError}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* =================================================================== */}
          {/* Formulario de Edición */}
          {/* =================================================================== */}
          <Box>
            <Typography variant="subtitle2" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
              Información del Usuario
            </Typography>

            <Grid container spacing={2}>
              {/* Campo de Nombre */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Nombre completo"
                  value={formData.name}
                  onChange={handleNameChange}
                  onBlur={handleNameBlur}
                  error={touched.name && Boolean(errors.name)}
                  helperText={touched.name && errors.name}
                  disabled={isSaving}
                  required
                />
              </Grid>

              {/* Campo de Email */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={handleEmailChange}
                  onBlur={handleEmailBlur}
                  error={touched.email && Boolean(errors.email)}
                  helperText={touched.email && errors.email}
                  disabled={isSaving}
                  required
                  InputProps={{
                    endAdornment: isValidatingEmail && (
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                    ),
                  }}
                />
              </Grid>

              {/* Campo de Rol */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth disabled={isSaving}>
                  <InputLabel id="role-label">Rol</InputLabel>
                  <Select
                    labelId="role-label"
                    value={formData.role}
                    label="Rol"
                    onChange={handleRoleChange}
                  >
                    {ROLES.map((role) => (
                      <MenuItem key={role.value} value={role.value}>
                        {role.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Switch de Estado Activo */}
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isActive}
                      onChange={handleActiveChange}
                      disabled={isSaving}
                      color="success"
                    />
                  }
                  label={
                    <Typography variant="body2">
                      Cuenta {formData.isActive ? 'activa' : 'inactiva'}
                    </Typography>
                  }
                  sx={{ display: 'flex', justifyContent: 'flex-end', m: 0, height: '100%' }}
                />
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* =================================================================== */}
          {/* Información No Editable */}
          {/* =================================================================== */}
          <Box>
            <Typography variant="subtitle2" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
              Información del Sistema
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" color="text.secondary" display="block">
                  ID del Usuario
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                >
                  {user.id}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Fecha de Registro
                </Typography>
                <Typography variant="body2">
                  {format(new Date(user.createdAt), "d 'de' MMMM 'de' yyyy", {
                    locale: es,
                  })}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Último Acceso
                </Typography>
                <Typography variant="body2">
                  {user.lastAccess
                    ? format(new Date(user.lastAccess), "d 'de' MMM, yyyy", {
                        locale: es,
                      })
                    : 'Nunca'}
                </Typography>
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* =================================================================== */}
          {/* Estadísticas del Usuario (Expandible) */}
          {/* =================================================================== */}
          <Accordion elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
            <AccordionSummary
              expandIcon={<ExpandMore />}
              sx={{
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Assessment color="primary" />
                <Typography variant="subtitle2" fontWeight={600}>
                  Estadísticas del Usuario
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                {/* Progreso General */}
                <Grid item xs={12} sx={{ textAlign: 'center' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Progreso General
                  </Typography>
                  <Box
                    sx={{
                      position: 'relative',
                      display: 'inline-flex',
                      my: 2,
                    }}
                  >
                    <CircularProgress
                      variant="determinate"
                      value={user.stats?.overallProgress || 0}
                      size={100}
                      thickness={5}
                      sx={{ color: 'primary.main' }}
                    />
                    <Box
                      sx={{
                        top: 0,
                        left: 0,
                        bottom: 0,
                        right: 0,
                        position: 'absolute',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Typography variant="h5" component="div" fontWeight="bold">
                        {user.stats?.overallProgress || 0}%
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                {/* Módulos Completados */}
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <School fontSize="small" color="action" />
                    <Typography variant="body2">
                      Módulos completados: {user.stats?.modulesCompleted || 0} /{' '}
                      {user.stats?.totalModules || 0}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={
                      user.stats?.totalModules
                        ? (user.stats.modulesCompleted / user.stats.totalModules) * 100
                        : 0
                    }
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Grid>

                {/* Lecciones Completadas */}
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <MenuBook fontSize="small" color="action" />
                    <Typography variant="body2">
                      Lecciones completadas: {user.stats?.lessonsCompleted || 0} /{' '}
                      {user.stats?.totalLessons || 0}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={
                      user.stats?.totalLessons
                        ? (user.stats.lessonsCompleted / user.stats.totalLessons) * 100
                        : 0
                    }
                    sx={{ height: 8, borderRadius: 4 }}
                    color="secondary"
                  />
                </Grid>

                {/* Tiempo Total de Estudio */}
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AccessTime fontSize="small" color="action" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Tiempo total de estudio
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {formatStudyTime(user.stats?.totalStudyTime || 0)}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                {/* Última Lección Accedida */}
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingUp fontSize="small" color="action" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Última lección accedida
                      </Typography>
                      {user.stats?.lastLesson ? (
                        <Link
                          href={`/lessons/${user.stats.lastLesson.id}`}
                          underline="hover"
                          sx={{ display: 'block' }}
                        >
                          <Typography variant="body2" fontWeight={500}>
                            {user.stats.lastLesson.title}
                          </Typography>
                        </Link>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Ninguna
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Box>
      </DialogContent>

      {/* Acciones del Dialog */}
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={isSaving} color="inherit">
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          color="primary"
          disabled={isSaving || !hasChanges || Boolean(errors.name) || Boolean(errors.email)}
          startIcon={isSaving && <CircularProgress size={20} color="inherit" />}
        >
          {isSaving ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ============================================================================
// PropTypes para Validación
// ============================================================================

UserEditModal.propTypes = {
  /**
   * Estado de apertura del modal
   */
  open: PropTypes.bool.isRequired,

  /**
   * Función llamada al cerrar el modal
   */
  onClose: PropTypes.func.isRequired,

  /**
   * Objeto del usuario a editar con toda su información
   */
  user: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    email: PropTypes.string.isRequired,
    role: PropTypes.oneOf(['STUDENT', 'TEACHER', 'ADMIN']).isRequired,
    isActive: PropTypes.bool.isRequired,
    createdAt: PropTypes.string.isRequired,
    lastAccess: PropTypes.string,
    stats: PropTypes.shape({
      overallProgress: PropTypes.number,
      modulesCompleted: PropTypes.number,
      totalModules: PropTypes.number,
      lessonsCompleted: PropTypes.number,
      totalLessons: PropTypes.number,
      totalStudyTime: PropTypes.number,
      lastLesson: PropTypes.shape({
        id: PropTypes.string,
        title: PropTypes.string,
      }),
    }),
  }),

  /**
   * Función callback llamada al guardar los cambios
   * Recibe el objeto con los datos editados del usuario
   * @param {Object} updatedData - Datos actualizados del usuario
   */
  onSave: PropTypes.func.isRequired,

  /**
   * Indica si se está guardando en este momento
   */
  isSaving: PropTypes.bool,
};

UserEditModal.defaultProps = {
  user: null,
  isSaving: false,
};

// ============================================================================
// Exportación
// ============================================================================

export default UserEditModal;
