import React from 'react';
import { Tooltip } from '@mui/material';
import {
  Lock,
  LockOpen,
  TrendingUp,
  CheckCircle,
  Refresh,
  PlayArrow
} from '@mui/icons-material';

/**
 * ModuleStatusIcons - Sistema de iconografía para estados de módulos
 *
 * Proporciona un conjunto consistente de íconos, colores y textos para todos
 * los estados posibles de un módulo en el curriculum. Centraliza la configuración
 * visual y textual para mantener consistencia en toda la aplicación.
 *
 * Estados soportados:
 * - locked: Módulo bloqueado por prerequisitos
 * - available: Módulo disponible para comenzar
 * - in-progress: Módulo iniciado pero no completado
 * - completed: Módulo completado al 100%
 * - review: Módulo completado pero marcado para revisión
 *
 * @module ModuleStatusIcons
 * @version 1.0.0
 */

// ==================== CONSTANTES ====================

/**
 * Estados válidos para un módulo
 * @constant {Object}
 */
export const MODULE_STATES = {
  LOCKED: 'locked',
  AVAILABLE: 'available',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  REVIEW: 'review'
};

/**
 * Tamaño estándar para todos los íconos de estado
 * Mantener consistente en 20px para uniformidad visual
 * @constant {number}
 */
export const ICON_SIZE = 20;

/**
 * Configuración de colores para cada estado
 * Usa colores del theme de Material UI para consistencia
 * @constant {Object}
 */
export const STATUS_COLORS = {
  [MODULE_STATES.LOCKED]: '#9e9e9e',      // Gris suave - deshabilitado
  [MODULE_STATES.AVAILABLE]: '#10aede',   // Primary - disponible
  [MODULE_STATES.IN_PROGRESS]: '#FF9800', // Warning - en curso
  [MODULE_STATES.COMPLETED]: '#4CAF50',   // Success - completado
  [MODULE_STATES.REVIEW]: '#10aede'       // Info - para revisar
};

/**
 * Colores de borde para las cards según estado
 * Versiones más sutiles de los colores principales
 * @constant {Object}
 */
export const STATUS_BORDER_COLORS = {
  [MODULE_STATES.LOCKED]: '#e0e0e0',      // Gris muy claro
  [MODULE_STATES.AVAILABLE]: '#2196F3',   // Azul vibrante
  [MODULE_STATES.IN_PROGRESS]: '#FF9800', // Naranja
  [MODULE_STATES.COMPLETED]: '#4CAF50',   // Verde
  [MODULE_STATES.REVIEW]: '#00a1db'       // Cyan claro
};

/**
 * Textos de tooltips para cada estado
 * Explican al usuario qué significa cada estado
 * @constant {Object}
 */
export const STATUS_TOOLTIPS = {
  [MODULE_STATES.LOCKED]: 'Módulo bloqueado - Completa los requisitos previos para desbloquearlo',
  [MODULE_STATES.AVAILABLE]: 'Módulo disponible - Haz clic para comenzar',
  [MODULE_STATES.IN_PROGRESS]: 'Módulo en progreso - Continúa donde lo dejaste',
  [MODULE_STATES.COMPLETED]: 'Módulo completado - ¡Excelente trabajo!',
  [MODULE_STATES.REVIEW]: 'Módulo completado - Marcado para revisión'
};

/**
 * Textos para los botones de acción según estado
 * @constant {Object}
 */
export const STATUS_BUTTON_TEXTS = {
  [MODULE_STATES.LOCKED]: 'Bloqueado',
  [MODULE_STATES.AVAILABLE]: 'Comenzar',
  [MODULE_STATES.IN_PROGRESS]: 'Continuar',
  [MODULE_STATES.COMPLETED]: 'Completado',
  [MODULE_STATES.REVIEW]: 'Revisar'
};

/**
 * Configuración de tooltips consistente
 * @constant {Object}
 */
export const TOOLTIP_CONFIG = {
  placement: 'top',
  arrow: true,
  enterDelay: 300,
  enterNextDelay: 300
};

// ==================== FUNCIONES HELPER ====================

/**
 * Obtiene el color apropiado para un estado dado
 *
 * @param {string} status - Estado del módulo
 * @returns {string} Color hexadecimal
 *
 * @example
 * getStatusColor('completed') // '#4CAF50'
 */
export const getStatusColor = (status) => {
  return STATUS_COLORS[status] || STATUS_COLORS[MODULE_STATES.LOCKED];
};

/**
 * Obtiene el color de borde apropiado para un estado dado
 * Usado en las cards de módulos para indicar visualmente el estado
 *
 * @param {string} status - Estado del módulo
 * @returns {string} Color hexadecimal
 *
 * @example
 * getStatusBorderColor('available') // '#2196F3'
 */
export const getStatusBorderColor = (status) => {
  return STATUS_BORDER_COLORS[status] || STATUS_BORDER_COLORS[MODULE_STATES.LOCKED];
};

/**
 * Obtiene el texto del tooltip para un estado dado
 *
 * @param {string} status - Estado del módulo
 * @returns {string} Texto descriptivo del estado
 *
 * @example
 * getStatusTooltip('in-progress') // 'Módulo en progreso - Continúa donde lo dejaste'
 */
export const getStatusTooltip = (status) => {
  return STATUS_TOOLTIPS[status] || STATUS_TOOLTIPS[MODULE_STATES.LOCKED];
};

/**
 * Obtiene el texto del botón de acción para un estado dado
 *
 * @param {string} status - Estado del módulo
 * @returns {string} Texto del botón
 *
 * @example
 * getStatusButtonText('available') // 'Comenzar'
 */
export const getStatusButtonText = (status) => {
  return STATUS_BUTTON_TEXTS[status] || STATUS_BUTTON_TEXTS[MODULE_STATES.LOCKED];
};

/**
 * Obtiene el ícono apropiado para un estado dado sin tooltip
 * Útil cuando se necesita el ícono sin el wrapper de tooltip
 *
 * @param {string} status - Estado del módulo
 * @param {Object} props - Props adicionales para el ícono
 * @returns {JSX.Element} Componente de ícono
 *
 * @example
 * getRawStatusIcon('completed') // <CheckCircle sx={{ color: '#4CAF50', fontSize: 20 }} />
 */
export const getRawStatusIcon = (status, props = {}) => {
  const color = getStatusColor(status);
  const iconProps = {
    sx: {
      color,
      fontSize: ICON_SIZE,
      ...props.sx
    },
    ...props
  };

  switch (status) {
    case MODULE_STATES.LOCKED:
      return <Lock {...iconProps} />;

    case MODULE_STATES.AVAILABLE:
      return <LockOpen {...iconProps} />;

    case MODULE_STATES.IN_PROGRESS:
      return <TrendingUp {...iconProps} />;

    case MODULE_STATES.COMPLETED:
      return <CheckCircle {...iconProps} />;

    case MODULE_STATES.REVIEW:
      return <Refresh {...iconProps} />;

    default:
      return <Lock {...iconProps} />;
  }
};

/**
 * Obtiene el ícono apropiado para un estado dado envuelto en un Tooltip
 * Esta es la función principal para obtener íconos de estado con información contextual
 *
 * @param {string} status - Estado del módulo
 * @param {Object} iconProps - Props adicionales para el ícono
 * @param {Object} tooltipProps - Props adicionales para el Tooltip
 * @returns {JSX.Element} Ícono envuelto en Tooltip
 *
 * @example
 * getStatusIcon('in-progress')
 * // <Tooltip title="Módulo en progreso...">
 * //   <TrendingUp sx={{ color: '#FF9800', fontSize: 20 }} />
 * // </Tooltip>
 */
export const getStatusIcon = (status, iconProps = {}, tooltipProps = {}) => {
  const tooltip = getStatusTooltip(status);
  const icon = getRawStatusIcon(status, iconProps);

  return (
    <Tooltip
      title={tooltip}
      {...TOOLTIP_CONFIG}
      {...tooltipProps}
    >
      {icon}
    </Tooltip>
  );
};

/**
 * Obtiene el ícono apropiado para un botón según el estado
 * Versión simplificada sin tooltip para usar dentro de botones
 *
 * @param {string} status - Estado del módulo
 * @param {Object} props - Props adicionales para el ícono
 * @returns {JSX.Element} Componente de ícono
 *
 * @example
 * getButtonIcon('available') // <PlayArrow />
 */
export const getButtonIcon = (status, props = {}) => {
  switch (status) {
    case MODULE_STATES.LOCKED:
      return <Lock {...props} />;

    case MODULE_STATES.AVAILABLE:
      return <PlayArrow {...props} />;

    case MODULE_STATES.IN_PROGRESS:
      return <Refresh {...props} />;

    case MODULE_STATES.COMPLETED:
      return <CheckCircle {...props} />;

    case MODULE_STATES.REVIEW:
      return <Refresh {...props} />;

    default:
      return <PlayArrow {...props} />;
  }
};

/**
 * Determina el estado de un módulo basado en su progreso
 * Función de conveniencia para calcular el estado automáticamente
 *
 * @param {number} progress - Porcentaje de progreso (0-100)
 * @param {boolean} isAvailable - Si el módulo está disponible
 * @param {boolean} markedForReview - Si está marcado para revisión
 * @returns {string} Estado del módulo
 *
 * @example
 * getModuleStatus(50, true, false) // 'in-progress'
 * getModuleStatus(100, true, true) // 'review'
 * getModuleStatus(0, false, false) // 'locked'
 */
export const getModuleStatus = (progress, isAvailable, markedForReview = false) => {
  if (!isAvailable) {
    return MODULE_STATES.LOCKED;
  }

  if (progress === 100) {
    return markedForReview ? MODULE_STATES.REVIEW : MODULE_STATES.COMPLETED;
  }

  if (progress > 0) {
    return MODULE_STATES.IN_PROGRESS;
  }

  return MODULE_STATES.AVAILABLE;
};

/**
 * Verifica si un estado es válido
 *
 * @param {string} status - Estado a verificar
 * @returns {boolean} true si es válido
 *
 * @example
 * isValidStatus('completed') // true
 * isValidStatus('invalid') // false
 */
export const isValidStatus = (status) => {
  return Object.values(MODULE_STATES).includes(status);
};

/**
 * Obtiene todos los estados disponibles
 * Útil para iteraciones o validaciones
 *
 * @returns {Array<string>} Array de estados válidos
 *
 * @example
 * getAllStatuses() // ['locked', 'available', 'in-progress', 'completed', 'review']
 */
export const getAllStatuses = () => {
  return Object.values(MODULE_STATES);
};

// ==================== EXPORTS ====================

/**
 * Export por defecto con todas las funciones
 * Permite importar todo el módulo de una vez
 */
export default {
  // Constantes
  MODULE_STATES,
  ICON_SIZE,
  STATUS_COLORS,
  STATUS_BORDER_COLORS,
  STATUS_TOOLTIPS,
  STATUS_BUTTON_TEXTS,
  TOOLTIP_CONFIG,

  // Funciones
  getStatusColor,
  getStatusBorderColor,
  getStatusTooltip,
  getStatusButtonText,
  getRawStatusIcon,
  getStatusIcon,
  getButtonIcon,
  getModuleStatus,
  isValidStatus,
  getAllStatuses
};

/**
 * GUÍA DE USO:
 *
 * 1. Importar funciones específicas:
 * import { getStatusIcon, getStatusColor } from './ModuleStatusIcons';
 *
 * 2. Usar en un componente:
 * const icon = getStatusIcon('in-progress');
 * const color = getStatusColor('completed');
 *
 * 3. Calcular estado automáticamente:
 * const status = getModuleStatus(progress, isAvailable, markedForReview);
 * const icon = getStatusIcon(status);
 *
 * 4. Usar en botones:
 * <Button startIcon={getButtonIcon(status)}>
 *   {getStatusButtonText(status)}
 * </Button>
 *
 * 5. Usar colores en estilos:
 * <Box sx={{ borderColor: getStatusBorderColor(status) }}>
 *
 * EXTENSIBILIDAD:
 *
 * Para agregar un nuevo estado:
 * 1. Agregar a MODULE_STATES
 * 2. Agregar color a STATUS_COLORS
 * 3. Agregar color de borde a STATUS_BORDER_COLORS
 * 4. Agregar tooltip a STATUS_TOOLTIPS
 * 5. Agregar texto de botón a STATUS_BUTTON_TEXTS
 * 6. Agregar case en getRawStatusIcon()
 * 7. Agregar case en getButtonIcon()
 * 8. Actualizar tests
 */
