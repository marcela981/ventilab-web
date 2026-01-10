/**
 * =============================================================================
 * ConfirmationDialog Component
 * =============================================================================
 *
 * Componente reutilizable para confirmar acciones destructivas o importantes
 * en el panel de administración. Proporciona una interfaz consistente para
 * todas las confirmaciones del sistema.
 *
 * Casos de uso:
 * - Desactivar cuentas de usuario
 * - Eliminar usuarios
 * - Resetear contraseñas
 * - Eliminar módulos o lecciones
 * - Cualquier acción que requiera confirmación explícita
 *
 * Características:
 * - Dialog compacto con maxWidth xs
 * - Icono de advertencia configurable
 * - Mensaje personalizable con título y descripción
 * - Contenido adicional opcional (Alert)
 * - Botones de cancelar y confirmar
 * - Loading state durante ejecución
 * - Colores configurables (error/primary)
 * - Completamente reutilizable
 *
 * =============================================================================
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Box,
} from '@mui/material';
import { Warning } from '@mui/icons-material';

/**
 * Componente ConfirmationDialog
 *
 * Dialog reutilizable para confirmar acciones importantes o destructivas.
 * Proporciona una interfaz consistente con título, descripción, contenido
 * adicional opcional y botones de acción.
 *
 * @component
 * @example
 * // Ejemplo 1: Eliminar usuario (acción destructiva)
 * ```jsx
 * <ConfirmationDialog
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Eliminar Usuario"
 *   description="¿Estás seguro de que deseas eliminar al usuario Juan Pérez? Esta acción no se puede deshacer."
 *   confirmText="Eliminar"
 *   confirmColor="error"
 *   onConfirm={handleDeleteUser}
 *   isLoading={isDeleting}
 *   extraContent={
 *     <Alert severity="warning" sx={{ mt: 2 }}>
 *       Se eliminarán también todos los datos asociados a este usuario.
 *     </Alert>
 *   }
 * />
 * ```
 *
 * @example
 * // Ejemplo 2: Resetear contraseña (acción no destructiva)
 * ```jsx
 * <ConfirmationDialog
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Resetear Contraseña"
 *   description="Se enviará un email al usuario con instrucciones para crear una nueva contraseña."
 *   confirmText="Enviar Email"
 *   confirmColor="primary"
 *   onConfirm={handleResetPassword}
 *   isLoading={isSending}
 * />
 * ```
 *
 * @example
 * // Ejemplo 3: Desactivar cuenta
 * ```jsx
 * <ConfirmationDialog
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Desactivar Cuenta"
 *   description="¿Deseas desactivar la cuenta de este usuario? El usuario no podrá iniciar sesión mientras su cuenta esté inactiva."
 *   confirmText="Desactivar"
 *   confirmColor="error"
 *   onConfirm={handleDeactivateUser}
 *   isLoading={isDeactivating}
 *   extraContent={
 *     <Alert severity="info" sx={{ mt: 2 }}>
 *       Podrás reactivar la cuenta en cualquier momento desde el panel de usuarios.
 *     </Alert>
 *   }
 * />
 * ```
 *
 * @param {Object} props - Propiedades del componente
 * @param {boolean} props.open - Estado de apertura del dialog
 * @param {Function} props.onClose - Función llamada al cerrar el dialog
 * @param {string} props.title - Título del dialog
 * @param {string} props.description - Descripción o mensaje de confirmación
 * @param {string} props.confirmText - Texto del botón de confirmación
 * @param {'error'|'primary'} props.confirmColor - Color del botón de confirmación
 * @param {Function} props.onConfirm - Función llamada al confirmar la acción
 * @param {boolean} props.isLoading - Indica si se está ejecutando la acción
 * @param {React.ReactNode} props.extraContent - Contenido adicional opcional (Alert, etc.)
 * @returns {JSX.Element} Dialog de confirmación
 */
const ConfirmationDialog = ({
  open,
  onClose,
  title,
  description,
  confirmText,
  confirmColor,
  onConfirm,
  isLoading,
  extraContent,
}) => {
  /**
   * Maneja el click en el botón de cancelar
   */
  const handleCancel = () => {
    if (!isLoading) {
      onClose();
    }
  };

  /**
   * Maneja el click en el botón de confirmar
   */
  const handleConfirm = async () => {
    if (!isLoading) {
      await onConfirm();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="xs"
      fullWidth
      disableEscapeKeyDown={isLoading}
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      {/* Título del Dialog con Icono de Advertencia */}
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          pb: 2,
        }}
      >
        <Warning
          sx={{
            color: 'warning.main',
            fontSize: 28,
          }}
        />
        <Typography variant="h6" component="div" fontWeight={600}>
          {title}
        </Typography>
      </DialogTitle>

      {/* Contenido del Dialog */}
      <DialogContent sx={{ pb: 2 }}>
        {/* Descripción Principal */}
        <Typography variant="body1" color="text.primary" sx={{ mb: extraContent ? 2 : 0 }}>
          {description}
        </Typography>

        {/* Contenido Adicional (si existe) */}
        {extraContent && <Box>{extraContent}</Box>}
      </DialogContent>

      {/* Acciones del Dialog */}
      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        {/* Botón de Cancelar */}
        <Button
          onClick={handleCancel}
          variant="outlined"
          color="inherit"
          disabled={isLoading}
          sx={{
            minWidth: 100,
          }}
        >
          Cancelar
        </Button>

        {/* Botón de Confirmar */}
        <Button
          onClick={handleConfirm}
          variant="contained"
          color={confirmColor}
          disabled={isLoading}
          startIcon={isLoading && <CircularProgress size={20} color="inherit" />}
          sx={{
            minWidth: 100,
          }}
        >
          {isLoading ? 'Procesando...' : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ============================================================================
// PropTypes para Validación
// ============================================================================

ConfirmationDialog.propTypes = {
  /**
   * Estado de apertura del dialog
   */
  open: PropTypes.bool.isRequired,

  /**
   * Función llamada al cerrar el dialog (al hacer click en cancelar o fuera del dialog)
   */
  onClose: PropTypes.func.isRequired,

  /**
   * Título del dialog que se muestra en el DialogTitle junto al icono de advertencia
   */
  title: PropTypes.string.isRequired,

  /**
   * Descripción o mensaje de confirmación que explica la acción a realizar
   */
  description: PropTypes.string.isRequired,

  /**
   * Texto que se muestra en el botón de confirmación
   * Ejemplos: "Eliminar", "Desactivar", "Confirmar", "Resetear", etc.
   */
  confirmText: PropTypes.string,

  /**
   * Color del botón de confirmación
   * - 'error': Para acciones destructivas (eliminar, desactivar)
   * - 'primary': Para acciones normales (confirmar, enviar)
   */
  confirmColor: PropTypes.oneOf(['error', 'primary']),

  /**
   * Función callback llamada al confirmar la acción
   * Puede ser asíncrona (async/await)
   */
  onConfirm: PropTypes.func.isRequired,

  /**
   * Indica si se está ejecutando la acción en este momento
   * Mientras es true:
   * - Los botones se deshabilitan
   * - El botón de confirmar muestra un loading spinner
   * - No se puede cerrar el dialog con ESC
   */
  isLoading: PropTypes.bool,

  /**
   * Contenido adicional opcional que se muestra debajo de la descripción
   * Típicamente un Alert con información extra, advertencias o consecuencias
   * de la acción
   *
   * @example
   * extraContent={
   *   <Alert severity="warning">
   *     Esta acción eliminará todos los datos asociados.
   *   </Alert>
   * }
   */
  extraContent: PropTypes.node,
};

// ============================================================================
// Valores por Defecto
// ============================================================================

ConfirmationDialog.defaultProps = {
  confirmText: 'Confirmar',
  confirmColor: 'error',
  isLoading: false,
  extraContent: null,
};

// ============================================================================
// Exportación
// ============================================================================

export default ConfirmationDialog;
