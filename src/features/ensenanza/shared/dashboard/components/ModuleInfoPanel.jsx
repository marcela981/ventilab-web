import React from 'react';
import {
  Paper,
  Typography
} from '@mui/material';

/**
 * ModuleInfoPanel - Componente de panel informativo del módulo
 *
 * Muestra información adicional sobre el módulo de enseñanza.
 *
 * @returns {JSX.Element} Componente de panel informativo
 */
const ModuleInfoPanel = () => {
  return (
    <Paper
      elevation={0}
      sx={{
        mt: 4,
        p: 4,
        backgroundColor: 'transparent',
        borderRadius: 3,
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderLeft: (theme) => `4px solid ${theme.palette.info.main}`
      }}
    >
      <Typography
        variant="h5"
        gutterBottom
        sx={{
          color: '#ffffff',
          fontWeight: 700,
          mb: 2
        }}
      >
        💡 Sobre este módulo
      </Typography>
      <Typography
        variant="body1"
        sx={{
          color: '#e8f4fd',
          fontSize: '1rem',
          lineHeight: 1.6
        }}
      >
        Este módulo está diseñado para proporcionar una comprensión integral de la ventilación mecánica,
        desde los fundamentos fisiológicos hasta la aplicación clínica práctica. Cada sección incluye
        contenido teórico, casos clínicos y simulaciones interactivas para reforzar el aprendizaje.
      </Typography>
    </Paper>
  );
};

export default ModuleInfoPanel;
