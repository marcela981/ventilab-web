/**
 * Helpers y utilidades para ModuleCard
 */

/**
 * Determina el estado visual del módulo basado en progreso y disponibilidad
 * IMPORTANT: Completion status is ONLY true when progress === 100 (which means progress === 1.0)
 * Never use flags (completed, started, visited) as sources of truth.
 * 
 * @param {number} moduleProgress - Porcentaje de progreso (0-100)
 * @param {boolean} isAvailable - Si el módulo está disponible
 * @returns {string} Estado: 'completed', 'in-progress', 'available', 'locked'
 */
export const getModuleStatus = (moduleProgress, isAvailable) => {
  // Module is completed ONLY when progress === 100 (which means progress value === 1.0)
  // This ensures no impossible states like "0% progress but Completed"
  if (moduleProgress === 100) return 'completed';
  if (moduleProgress > 0) return 'in-progress';
  if (isAvailable) return 'available';
  return 'locked';
};

/**
 * Obtiene el color del borde según el estado en hover
 * @param {string} status - Estado del módulo
 * @param {string} levelColor - Color del nivel
 * @param {Object} theme - Tema de Material-UI
 * @returns {string} Color hex o theme color
 */
export const getHoverBorderColor = (status, levelColor, theme) => {
  switch (status) {
    case 'completed':
      return '#4CAF50';
    case 'in-progress':
      return '#FF9800';
    case 'available':
      return levelColor;
    default:
      return theme.palette.grey[300];
  }
};

/**
 * Obtiene el color de la barra de progreso según el estado
 * @param {string} status - Estado del módulo
 * @param {Object} theme - Tema de Material-UI
 * @returns {string} Color hex
 */
export const getProgressBarColor = (status, theme) => {
  switch (status) {
    case 'completed':
      return '#4CAF50';
    case 'in-progress':
      return '#FF9800';
    default:
      return theme.palette.grey[400];
  }
};

/**
 * Convierte duración de minutos a formato compacto (ej: "2h", "1.5h")
 * @param {number} minutes - Duración en minutos
 * @returns {string} Duración formateada
 */
export const formatDuration = (minutes) => {
  const hours = minutes / 60;
  return hours % 1 === 0 ? `${hours}h` : `${hours.toFixed(1)}h`;
};

