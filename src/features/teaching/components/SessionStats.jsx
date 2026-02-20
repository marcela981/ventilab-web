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
        backgroundColor: 'transparent',
        padding: 2,
        borderRadius: 2,
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 600 }}>
          Tiempo en sesión: {timeSpent} min
        </Typography>
      </Box>
      <Box sx={{
        backgroundColor: 'transparent',
        padding: 2,
        borderRadius: 2,
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 600 }}>
          Lecciones completadas: {completedLessonsCount}
        </Typography>
      </Box>
    </Box>
  );
};

export default SessionStats;
