import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';
import { CheckCircle, TrendingUp } from '@mui/icons-material';
import ModuleStatusIcons from './ModuleStatusIcons';
import styles from '@/styles/curriculum.module.css';

/**
 * Header de la LessonCard con título e iconos de estado
 */
const LessonCardHeader = ({
  lesson,
  isAvailable,
  status,
  levelColor,
  isHovered
}) => {
  return (
    <>
      {/* Icono de estado para lecciones completadas o en progreso */}
      {status === 'completed' && (
        <Box
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 2,
            transition: 'transform 0.25s ease-in-out',
            transform: isHovered ? 'scale(1.1)' : 'scale(1)'
          }}
          title="Lección completada"
        >
          <CheckCircle sx={{ color: '#4CAF50', fontSize: 20 }} />
        </Box>
      )}
      {status === 'in-progress' && (
        <Box
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 2,
            transition: 'transform 0.25s ease-in-out',
            transform: isHovered ? 'scale(1.1)' : 'scale(1)'
          }}
        >
          <TrendingUp sx={{ color: '#FF9800', fontSize: 20 }} />
        </Box>
      )}
      {status === 'available' && (
        <Box
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 2,
            transition: 'transform 0.25s ease-in-out',
            transform: isHovered ? 'scale(1.1)' : 'scale(1)'
          }}
        >
          <ModuleStatusIcons isAvailable={true} size={20} color={levelColor} />
        </Box>
      )}

      {/* Título de la lección */}
      <header className={styles.cardHeader}>
        <Typography
          variant="h6"
          sx={{
            color: isAvailable ? '#ffffff' : '#9e9e9e',
            fontSize: '1.1rem',
            fontWeight: 600,
            lineHeight: 1.3,
            mb: 1,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            minHeight: '2.6em'
          }}
        >
          {lesson.title}
        </Typography>
      </header>
    </>
  );
};

LessonCardHeader.propTypes = {
  lesson: PropTypes.object.isRequired,
  isAvailable: PropTypes.bool.isRequired,
  status: PropTypes.string.isRequired,
  levelColor: PropTypes.string.isRequired,
  isHovered: PropTypes.bool.isRequired
};

export default LessonCardHeader;

