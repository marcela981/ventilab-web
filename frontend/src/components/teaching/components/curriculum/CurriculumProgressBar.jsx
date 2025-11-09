'use client';

import React from 'react';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';

/**
 * CurriculumProgressBar - Barra de progreso del curriculum
 * 
 * Muestra el progreso del curriculum con formato "X/Y lecciones"
 * La barra se actualiza en caliente cuando cambia el progreso.
 * 
 * @param {number} value - Porcentaje de progreso (0-100)
 * @param {string|Object} label - Label a mostrar. Si es string, se muestra tal cual.
 *                                 Si es objeto con completedLessons y totalLessons, se formatea como "X/Y lecciones"
 * @param {number} completedLessons - Número de lecciones completadas (opcional, para formato automático)
 * @param {number} totalLessons - Número total de lecciones (opcional, para formato automático)
 */
export default function CurriculumProgressBar({ 
  value = 0, 
  label,
  completedLessons,
  totalLessons 
}) {
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));

  // Formatear label: si hay completedLessons y totalLessons, usar formato "X/Y lecciones"
  let displayLabel = label;
  if (completedLessons !== undefined && totalLessons !== undefined) {
    displayLabel = `${completedLessons}/${totalLessons} lecciones`;
  } else if (typeof label === 'object' && label.completedLessons !== undefined && label.totalLessons !== undefined) {
    displayLabel = `${label.completedLessons}/${label.totalLessons} lecciones`;
  } else if (!label && completedLessons !== undefined && totalLessons !== undefined) {
    displayLabel = `${completedLessons}/${totalLessons} lecciones`;
  }

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
      {displayLabel ? (
        <Typography variant="caption" sx={{ ml: 0.5, color: 'text.secondary', whiteSpace: 'nowrap' }}>
          {displayLabel}
        </Typography>
      ) : null}
    </Box>
  );
}

