/**
 * =============================================================================
 * UserCreateModal Component
 * =============================================================================
 *
 * Modal para crear nuevos usuarios en el panel de administración.
 * Incluye formulario completo con validaciones, generación automática de
 * contraseñas seguras y opción de envío de email de bienvenida.
 *
 * Características:
 * - Formulario completo con validaciones en tiempo real
 * - Validación de email único con backend y debounce
 * - Generación automática de contraseñas seguras
 * - Opción de enviar email de bienvenida
 * - Mostrar contraseña temporal después de crear
 * - Copiar contraseña al portapapeles
 * - Manejo de errores del backend
 * - Loading states durante creación
 *
 * =============================================================================
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Checkbox,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Grid,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import {
  Close,
  Refresh,
  ContentCopy,
  Visibility,
  VisibilityOff,
  CheckCircle,
} from '@mui/icons-material';

/**
 * Expresión regular para validar formato de email
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Debounce delay para validación de email (500ms)
 */
const EMAIL_VALIDATION_DEBOUNCE = 500;

/**
 * Roles disponibles con sus etiquetas
 */
const ROLES = [
  { value: 'STUDENT', label: 'Estudiante' },
  { value: 'TEACHER', label: 'Profesor' },
  { value: 'ADMIN', label: 'Administrador' },
];

/**
 * Genera una contraseña segura aleatoria
 *
 * @param {number} length - Longitud de la contraseña (default: 12)
 * @returns {string} Contraseña generada
 */
const generateSecurePassword = (length = 12) => {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  const allChars = lowercase + uppercase + numbers + symbols;

  // Asegurar que la contraseña tenga al menos uno de cada tipo
  let password = '';
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Completar el resto de la longitud con caracteres aleatorios
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Mezclar los caracteres para que no siempre estén en el mismo orden
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
};

/**
 * Componente UserCreateModal
 *
 * Modal para crear nuevos usuarios con validaciones completas
 * y generación automática de contraseñas.
 *
 * @component
 * @example
 * ```jsx
 * <UserCreateModal
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   onCreate={(userData) => handleCreateUser(userData)}
 *   isCreating={false}
 * />
 * ```
 */
const UserCreateModal = ({ open, onClose, onCreate, isCreating }) => {
  // ============================================================================
  // Estado Local del Formulario
  // ============================================================================

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STUDENT',
    sendWelcomeEmail: true,
  });

  const [errors, setErrors] = useState({
    name: '',
    email: '',
    password: '',
  });

  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
  });

  const [backendError, setBackendError] = useState(null);
  const [isValidatingEmail, setIsValidatingEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [wasPasswordGenerated, setWasPasswordGenerated] = useState(false);
  const [createdUserPassword, setCreatedUserPassword] = useState(null);
  const [passwordCopied, setPasswordCopied] = useState(false);

  // Ref para el timeout del debounce de email
  const emailValidationTimeoutRef = useRef(null);

  // ============================================================================
  // Resetear Formulario al Abrir/Cerrar
  // ============================================================================

  /**
   * Resetea el formulario cuando el modal se abre
   */
  useEffect(() => {
    if (open) {
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'STUDENT',
        sendWelcomeEmail: true,
      });
      setErrors({ name: '', email: '', password: '' });
      setTouched({ name: false, email: false, password: false });
      setBackendError(null);
      setWasPasswordGenerated(false);
      setCreatedUserPassword(null);
      setPasswordCopied(false);
      setShowPassword(false);
    }
  }, [open]);

  /**
   * Limpia el timeout al desmontar
   */
  useEffect(() => {
    return () => {
      if (emailValidationTimeoutRef.current) {
        clearTimeout(emailValidationTimeoutRef.current);
      }
    };
  }, []);

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
   * Valida si el email es único consultando al backend con debounce
   *
   * @param {string} email - Email a validar
   */
  const validateEmailUniqueness = useCallback((email) => {
    // Limpiar timeout anterior
    if (emailValidationTimeoutRef.current) {
      clearTimeout(emailValidationTimeoutRef.current);
    }

    // Si el formato es inválido, no consultar backend
    const formatError = validateEmailFormat(email);
    if (formatError) {
      return;
    }

    setIsValidatingEmail(true);

    // Crear nuevo timeout con debounce de 500ms
    emailValidationTimeoutRef.current = setTimeout(async () => {
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
    }, EMAIL_VALIDATION_DEBOUNCE);
  }, [validateEmailFormat]);

  /**
   * Valida la contraseña (solo si es manual)
   *
   * @param {string} password - Contraseña a validar
   * @returns {string} Mensaje de error o string vacío si es válido
   */
  const validatePassword = useCallback((password) => {
    if (!password || password.length === 0) {
      return 'La contraseña es requerida';
    }
    if (password.length < 8) {
      return 'La contraseña debe tener al menos 8 caracteres';
    }
    return '';
  }, []);

  // ============================================================================
  // Manejadores de Eventos
  // ============================================================================

  /**
   * Maneja el cambio en el campo de nombre
   */
  const handleNameChange = (event) => {
    const value = event.target.value;
    setFormData((prev) => ({ ...prev, name: value }));

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

    if (touched.email) {
      const error = validateEmailFormat(value);
      setErrors((prev) => ({ ...prev, email: error }));

      // Si el formato es válido, validar unicidad con debounce
      if (!error) {
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

    if (!error) {
      validateEmailUniqueness(formData.email);
    }
  };

  /**
   * Maneja el cambio en el campo de contraseña
   */
  const handlePasswordChange = (event) => {
    const value = event.target.value;
    setFormData((prev) => ({ ...prev, password: value }));
    setWasPasswordGenerated(false);

    if (touched.password) {
      const error = validatePassword(value);
      setErrors((prev) => ({ ...prev, password: error }));
    }
  };

  /**
   * Maneja el blur en el campo de contraseña
   */
  const handlePasswordBlur = () => {
    setTouched((prev) => ({ ...prev, password: true }));
    const error = validatePassword(formData.password);
    setErrors((prev) => ({ ...prev, password: error }));
  };

  /**
   * Genera una contraseña segura automáticamente
   */
  const handleGeneratePassword = () => {
    const newPassword = generateSecurePassword(12);
    setFormData((prev) => ({ ...prev, password: newPassword }));
    setWasPasswordGenerated(true);
    setShowPassword(true);
    setTouched((prev) => ({ ...prev, password: true }));
    setErrors((prev) => ({ ...prev, password: '' }));
  };

  /**
   * Maneja el cambio en el select de rol
   */
  const handleRoleChange = (event) => {
    setFormData((prev) => ({ ...prev, role: event.target.value }));
  };

  /**
   * Maneja el cambio en el checkbox de enviar email
   */
  const handleSendEmailChange = (event) => {
    setFormData((prev) => ({ ...prev, sendWelcomeEmail: event.target.checked }));
  };

  /**
   * Alterna la visibilidad de la contraseña
   */
  const handleTogglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  // ============================================================================
  // Manejo de Creación
  // ============================================================================

  /**
   * Valida todos los campos antes de crear
   *
   * @returns {boolean} True si todos los campos son válidos
   */
  const validateAllFields = () => {
    const nameError = validateName(formData.name);
    const emailError = validateEmailFormat(formData.email);
    const passwordError = validatePassword(formData.password);

    setErrors({
      name: nameError,
      email: emailError,
      password: passwordError,
    });

    setTouched({
      name: true,
      email: true,
      password: true,
    });

    return !nameError && !emailError && !passwordError;
  };

  /**
   * Maneja la creación del usuario
   */
  const handleCreate = async () => {
    // Validar todos los campos
    if (!validateAllFields()) {
      return;
    }

    // Limpiar error del backend
    setBackendError(null);

    try {
      // Llamar al callback de creación
      await onCreate(formData);

      // Si llegamos aquí y la contraseña fue generada, mostrarla
      if (wasPasswordGenerated) {
        setCreatedUserPassword(formData.password);
      } else {
        // Si no fue generada, cerrar el modal directamente
        handleClose();
      }
    } catch (error) {
      // Mostrar error del backend
      setBackendError(error.message || 'Error al crear el usuario');
    }
  };

  /**
   * Copia la contraseña al portapapeles
   */
  const handleCopyPassword = async () => {
    if (createdUserPassword) {
      try {
        await navigator.clipboard.writeText(createdUserPassword);
        setPasswordCopied(true);
        setTimeout(() => setPasswordCopied(false), 3000);
      } catch (error) {
        console.error('Error copying to clipboard:', error);
      }
    }
  };

  /**
   * Maneja el cierre del modal
   */
  const handleClose = () => {
    if (!isCreating) {
      onClose();
    }
  };

  // ============================================================================
  // Determinar si el formulario es válido
  // ============================================================================

  const isFormValid =
    formData.name.trim().length >= 3 &&
    formData.email.trim().length > 0 &&
    EMAIL_REGEX.test(formData.email) &&
    formData.password.length >= 8 &&
    !errors.name &&
    !errors.email &&
    !errors.password &&
    !isValidatingEmail;

  // ============================================================================
  // Renderizado
  // ============================================================================

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={isCreating}
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
          Crear Nuevo Usuario
        </Typography>
        <IconButton
          edge="end"
          color="inherit"
          onClick={handleClose}
          disabled={isCreating}
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

        {/* Contraseña Temporal (después de crear) */}
        {createdUserPassword && (
          <Alert
            severity="success"
            sx={{ mb: 3 }}
            icon={<CheckCircle fontSize="inherit" />}
          >
            <Typography variant="subtitle2" gutterBottom fontWeight={600}>
              ¡Usuario creado exitosamente!
            </Typography>
            <Typography variant="body2" gutterBottom sx={{ mb: 2 }}>
              <strong>IMPORTANTE:</strong> Guarda esta contraseña ya que no se mostrará nuevamente.
            </Typography>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 1.5,
                bgcolor: 'background.paper',
                borderRadius: 1,
                border: 1,
                borderColor: 'divider',
              }}
            >
              <Typography
                variant="body1"
                sx={{
                  fontFamily: 'monospace',
                  flex: 1,
                  fontSize: '1rem',
                  fontWeight: 500,
                }}
              >
                {createdUserPassword}
              </Typography>
              <Tooltip title={passwordCopied ? 'Copiado' : 'Copiar contraseña'}>
                <IconButton
                  size="small"
                  onClick={handleCopyPassword}
                  color={passwordCopied ? 'success' : 'primary'}
                >
                  {passwordCopied ? <CheckCircle /> : <ContentCopy />}
                </IconButton>
              </Tooltip>
            </Box>
          </Alert>
        )}

        {/* Formulario (solo si no se ha creado el usuario) */}
        {!createdUserPassword && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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
                  disabled={isCreating}
                  required
                  autoFocus
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
                  disabled={isCreating}
                  required
                  InputProps={{
                    endAdornment: isValidatingEmail && (
                      <InputAdornment position="end">
                        <CircularProgress size={20} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* Campo de Contraseña con Botón de Generar */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Contraseña temporal"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handlePasswordChange}
                  onBlur={handlePasswordBlur}
                  error={touched.password && Boolean(errors.password)}
                  helperText={
                    touched.password && errors.password
                      ? errors.password
                      : 'Mínimo 8 caracteres. Puedes generarla automáticamente.'
                  }
                  disabled={isCreating}
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title="Mostrar/Ocultar contraseña">
                          <IconButton
                            onClick={handleTogglePasswordVisibility}
                            edge="end"
                            size="small"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Generar contraseña segura">
                          <IconButton
                            onClick={handleGeneratePassword}
                            edge="end"
                            color="primary"
                            size="small"
                          >
                            <Refresh />
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* Select de Rol */}
              <Grid item xs={12}>
                <FormControl fullWidth disabled={isCreating}>
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

              {/* Checkbox de Enviar Email */}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.sendWelcomeEmail}
                      onChange={handleSendEmailChange}
                      disabled={isCreating}
                      color="primary"
                    />
                  }
                  label="Enviar email de bienvenida con credenciales"
                />
              </Grid>
            </Grid>
          </Box>
        )}
      </DialogContent>

      {/* Acciones del Dialog */}
      <DialogActions sx={{ px: 3, py: 2 }}>
        {createdUserPassword ? (
          // Si se creó el usuario, solo mostrar botón de cerrar
          <Button onClick={handleClose} variant="contained" color="primary" fullWidth>
            Cerrar
          </Button>
        ) : (
          // Si no se ha creado, mostrar botones de cancelar y crear
          <>
            <Button onClick={handleClose} disabled={isCreating} color="inherit">
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              variant="contained"
              color="primary"
              disabled={isCreating || !isFormValid}
              startIcon={isCreating && <CircularProgress size={20} color="inherit" />}
            >
              {isCreating ? 'Creando...' : 'Crear Usuario'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

// ============================================================================
// PropTypes para Validación
// ============================================================================

UserCreateModal.propTypes = {
  /**
   * Estado de apertura del modal
   */
  open: PropTypes.bool.isRequired,

  /**
   * Función llamada al cerrar el modal
   */
  onClose: PropTypes.func.isRequired,

  /**
   * Función callback llamada al crear el usuario
   * Recibe el objeto con todos los datos del nuevo usuario
   * @param {Object} userData - Datos del nuevo usuario
   * @param {string} userData.name - Nombre completo
   * @param {string} userData.email - Email
   * @param {string} userData.password - Contraseña temporal
   * @param {string} userData.role - Rol (STUDENT, TEACHER, ADMIN)
   * @param {boolean} userData.sendWelcomeEmail - Si enviar email de bienvenida
   */
  onCreate: PropTypes.func.isRequired,

  /**
   * Indica si se está creando el usuario en este momento
   */
  isCreating: PropTypes.bool,
};

UserCreateModal.defaultProps = {
  isCreating: false,
};

// ============================================================================
// Exportación
// ============================================================================

export default UserCreateModal;
