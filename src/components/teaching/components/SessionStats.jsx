"use client";

import React from 'react';
import {
  Box,
  Typography
} from '@mui/material';

/**
 * SessionStats - Componente de estadísticas de sesión
 *
 * Muestra información de la sesión actual: tiempo y lecciones completadas.
 *
 * @param {number} timeSpent - Tiempo gastado en minutos
 * @param {number} completedLessonsCount - Número de lecciones completadas
 * @returns {JSX.Element} Componente de estadísticas de sesión
 */
const SessionStats = ({ timeSpent = 0, completedLessonsCount = 0 }) => {
  return (
    <Box sx={{
      display: 'flex',
      gap: 3,
      mb: 3,
      flexWrap: 'wrap'
    }}>
      <Box sx={{
        backgroundColor: '#e3f2fd',
        padding: 2,
        borderRadius: 2,
        border: '1px solid #bbdefb'
      }}>
        <Typography variant="body2" sx={{ color: '#1976d2', fontWeight: 600 }}>
          Tiempo en sesión: {timeSpent} min
        </Typography>
      </Box>
      <Box sx={{
        backgroundColor: '#e8f5e8',
        padding: 2,
        borderRadius: 2,
        border: '1px solid #c8e6c9'
      }}>
        <Typography variant="body2" sx={{ color: '#388e3c', fontWeight: 600 }}>
          Lecciones completadas: {completedLessonsCount}
        </Typography>
      </Box>
    </Box>
  );
};

export default SessionStats;
