import React from 'react';
import PropTypes from 'prop-types';
import { Tooltip, Box, Typography } from '@mui/material';

/**
 * PrerequisiteTooltip - Tooltip con información de prerrequisitos faltantes
 *
 * Muestra un tooltip con la lista de módulos prerrequisitos que deben completarse
 * para desbloquear el módulo actual.
 *
 * @param {Array<string>} missingPrerequisites - Array de nombres de prerrequisitos faltantes
 * @param {React.ReactNode} children - Elemento hijo que activará el tooltip
 * @param {string} placement - Ubicación del tooltip (default: 'top')
 */
const PrerequisiteTooltip = ({
  missingPrerequisites = [],
  children,
  placement = 'top'
}) => {
  // Si no hay prerrequisitos faltantes, solo renderiza el hijo sin tooltip
  if (!missingPrerequisites || missingPrerequisites.length === 0) {
    return children;
  }

  const tooltipTitle = (
    <Box>
      <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
        Para desbloquear este módulo, completa:
      </Typography>
      <Typography variant="body2" component="div">
        {missingPrerequisites.join(', ')}
      </Typography>
    </Box>
  );

  return (
    <Tooltip
      title={tooltipTitle}
      arrow
      placement={placement}
      sx={{
        '& .MuiTooltip-tooltip': {
          backgroundColor: 'rgba(0, 0, 0, 0.87)',
          fontSize: '0.875rem',
          maxWidth: 300,
          padding: '8px 12px'
        },
        '& .MuiTooltip-arrow': {
          color: 'rgba(0, 0, 0, 0.87)'
        }
      }}
    >
      {children}
    </Tooltip>
  );
};

PrerequisiteTooltip.propTypes = {
  missingPrerequisites: PropTypes.arrayOf(PropTypes.string),
  children: PropTypes.node.isRequired,
  placement: PropTypes.oneOf([
    'top', 'bottom', 'left', 'right',
    'top-start', 'top-end', 'bottom-start', 'bottom-end',
    'left-start', 'left-end', 'right-start', 'right-end'
  ])
};

export default PrerequisiteTooltip;
