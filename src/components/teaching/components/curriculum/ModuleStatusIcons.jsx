import React from 'react';
import PropTypes from 'prop-types';
import { Lock, LockOpen, CheckCircle, TrendingUp } from '@mui/icons-material';

/**
 * ModuleStatusIcons - Componente para iconos de estado de módulos
 *
 * Proporciona iconos visuales para representar el estado de un módulo:
 * - locked: Candado cerrado (módulo bloqueado)
 * - available: Candado abierto (módulo disponible)
 * - in-progress: Icono de tendencia (módulo en progreso)
 * - completed: Check circle (módulo completado)
 *
 * @param {string} status - Estado del módulo ('locked', 'available', 'in-progress', 'completed')
 * @param {number} size - Tamaño del icono (opcional, default: 24)
 * @param {object} sx - Estilos adicionales de MUI (opcional)
 */
const ModuleStatusIcons = ({ status, size = 24, sx = {} }) => {
  const iconProps = {
    sx: {
      fontSize: size,
      ...sx
    }
  };

  switch (status) {
    case 'locked':
      return <Lock {...iconProps} sx={{ ...iconProps.sx, color: '#9e9e9e' }} />;

    case 'available':
      return <LockOpen {...iconProps} sx={{ ...iconProps.sx, color: '#0BBAF4' }} />;

    case 'in-progress':
      return <TrendingUp {...iconProps} sx={{ ...iconProps.sx, color: '#FF9800' }} />;

    case 'completed':
      return <CheckCircle {...iconProps} sx={{ ...iconProps.sx, color: '#4CAF50' }} />;

    default:
      return <Lock {...iconProps} sx={{ ...iconProps.sx, color: '#9e9e9e' }} />;
  }
};

ModuleStatusIcons.propTypes = {
  status: PropTypes.oneOf(['locked', 'available', 'in-progress', 'completed']).isRequired,
  size: PropTypes.number,
  sx: PropTypes.object
};

export default ModuleStatusIcons;
