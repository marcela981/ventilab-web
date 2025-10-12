import React from 'react';
import PropTypes from 'prop-types';
import {
  Paper,
  Typography
} from '@mui/material';

/**
 * ModuleInfoPanel - Panel informativo sobre el módulo de enseñanza
 * 
 * Muestra información adicional sobre el módulo de enseñanza,
 * incluyendo descripción del propósito y metodología.
 * 
 * @param {string} title - Título del panel
 * @param {string} description - Descripción del módulo
 */
const ModuleInfoPanel = ({ 
  title = "💡 Sobre este módulo",
  description = "Este módulo está diseñado para proporcionar una comprensión integral de la ventilación mecánica, desde los fundamentos fisiológicos hasta la aplicación clínica práctica. Cada sección incluye contenido teórico, casos clínicos y simulaciones interactivas para reforzar el aprendizaje."
}) => {
  return (
    <Paper 
      elevation={0} 
      sx={{ 
        mt: 4, 
        p: 4, 
        backgroundColor: '#ffffff',
        border: '1px solid #e9ecef',
        borderRadius: 3,
        borderLeft: '4px solid #17a2b8'
      }}
    >
      <Typography 
        variant="h5" 
        gutterBottom 
        sx={{ 
          color: '#17a2b8',
          fontWeight: 700,
          mb: 2
        }}
      >
        {title}
      </Typography>
      <Typography 
        variant="body1" 
        sx={{ 
          color: '#495057',
          fontSize: '1rem',
          lineHeight: 1.6
        }}
      >
        {description}
      </Typography>
    </Paper>
  );
};

ModuleInfoPanel.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string
};

export default ModuleInfoPanel;
