import React from 'react';
import PropTypes from 'prop-types';
import { Box, Chip } from '@mui/material';
import { MenuBook, AccessTime } from '@mui/icons-material';
import { formatDuration } from '../../../../view-components/teaching/components/curriculum/ModuleCard/moduleCardHelpers';
import styles from '@/styles/curriculum.module.css';

/**
 * Sección de metadatos de la LessonCard (chips de información)
 */
const LessonCardMeta = ({
  lesson,
  isAvailable,
  allowEmpty = false
}) => {

  return (
    <div className={styles.cardMeta}>
      {/* Chips de metadatos (dificultad, duración, páginas, En construcción) */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {/* Chip "En construcción" cuando allowEmpty === true */}
        {allowEmpty && (
          <Chip
            label="En construcción"
            size="small"
            variant="outlined"
            sx={{
              fontSize: '0.7rem',
              height: 24,
              fontWeight: 500,
              backgroundColor: 'rgba(255, 152, 0, 0.1)',
              borderColor: 'rgba(255, 152, 0, 0.5)',
              color: '#ff9800 !important',
              '& .MuiChip-label': {
                color: '#ff9800 !important',
              }
            }}
          />
        )}
        {lesson.difficulty && (
          <Chip
            label={lesson.difficulty}
            size="small"
            variant="outlined"
            sx={{
              fontSize: '0.7rem',
              height: 24,
              fontWeight: 500,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderColor: 'rgba(255, 255, 255, 0.3)',
              color: isAvailable ? '#ffffff !important' : '#9e9e9e',
              '& .MuiChip-label': {
                color: isAvailable ? '#ffffff !important' : '#9e9e9e',
              }
            }}
          />
        )}
        {lesson.estimatedTime && (
          <Chip
            icon={<AccessTime sx={{ fontSize: 14, color: isAvailable ? '#ffffff' : '#9e9e9e' }} />}
            label={formatDuration(lesson.estimatedTime)}
            size="small"
            variant="outlined"
            sx={{
              fontSize: '0.7rem',
              height: 24,
              fontWeight: 500,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderColor: 'rgba(255, 255, 255, 0.3)',
              color: isAvailable ? '#ffffff !important' : '#9e9e9e',
              '& .MuiChip-label': {
                color: isAvailable ? '#ffffff !important' : '#9e9e9e',
              },
              '& .MuiChip-icon': {
                color: isAvailable ? '#ffffff !important' : '#9e9e9e'
              }
            }}
          />
        )}
        {/* Mostrar páginas: solo mostrar si allowEmpty está presente (mostrará 0) o si hay páginas */}
        {lesson.pages !== undefined && allowEmpty && (
          <Chip
            icon={<MenuBook sx={{ fontSize: 14, color: '#9e9e9e' }} />}
            label="0 páginas"
            size="small"
            variant="outlined"
            sx={{
              fontSize: '0.7rem',
              height: 24,
              fontWeight: 500,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderColor: 'rgba(255, 255, 255, 0.3)',
              color: '#9e9e9e !important',
              '& .MuiChip-label': {
                color: '#9e9e9e !important',
              },
              '& .MuiChip-icon': {
                color: '#9e9e9e !important'
              }
            }}
          />
        )}
        {lesson.pages !== undefined && !allowEmpty && lesson.pages > 0 && (
          <Chip
            icon={<MenuBook sx={{ fontSize: 14, color: isAvailable ? '#ffffff' : '#9e9e9e' }} />}
            label={`${lesson.pages} ${lesson.pages === 1 ? 'página' : 'páginas'}`}
            size="small"
            variant="outlined"
            sx={{
              fontSize: '0.7rem',
              height: 24,
              fontWeight: 500,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderColor: 'rgba(255, 255, 255, 0.3)',
              color: isAvailable ? '#ffffff !important' : '#9e9e9e',
              '& .MuiChip-label': {
                color: isAvailable ? '#ffffff !important' : '#9e9e9e',
              },
              '& .MuiChip-icon': {
                color: isAvailable ? '#ffffff !important' : '#9e9e9e'
              }
            }}
          />
        )}
      </Box>
    </div>
  );
};

LessonCardMeta.propTypes = {
  lesson: PropTypes.object.isRequired,
  isAvailable: PropTypes.bool.isRequired,
  allowEmpty: PropTypes.bool
};

export default LessonCardMeta;

