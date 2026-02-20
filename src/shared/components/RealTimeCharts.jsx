import React from 'react';
import { Box, Typography } from '@mui/material';

/**
 * Placeholder para gráficas en tiempo real (presión, flujo, volumen).
 * Props: type, data, isConnected
 */
function RealTimeCharts({ type, data, isConnected }) {
  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Typography variant="body2" color="text.secondary">
        Gráfica {type} {isConnected ? '(conectado)' : '(sin conexión)'}
      </Typography>
    </Box>
  );
}

export default RealTimeCharts;
