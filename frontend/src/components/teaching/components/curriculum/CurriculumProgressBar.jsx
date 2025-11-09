'use client';

import React from 'react';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';

/**
 * CurriculumProgressBar - Barra de progreso del curriculum
 * 
 * Muestra solo el porcentaje de progreso sin información adicional de páginas o lecciones.
 * La barra se actualiza en caliente cuando cambia el progreso.
 * 
 * @param {number} value - Porcentaje de progreso (0-100)
 */
export default function CurriculumProgressBar({ 
  value = 0
}) {
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ flex: 1 }}>
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{ height: 8, borderRadius: 4 }}
        />
      </Box>
      <Typography variant="caption" sx={{ minWidth: 36, textAlign: 'right' }}>
        {pct}%
      </Typography>
    </Box>
  );
}

