import React from 'react';
import PropTypes from 'prop-types';
import { Box, Chip } from '@mui/material';
import { MenuBook } from '@mui/icons-material';
import { formatDuration } from './moduleCardHelpers';
import styles from '@/styles/curriculum.module.css';

/**
 * Sección de metadatos de la ModuleCard (chips de información)
 */
const ModuleCardMeta = ({
  module,
  isAvailable
}) => {

  return (
    <div className={styles.cardMeta}>
      {/* Chips de metadatos (dificultad, duración, lecciones) */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Chip
          label={module.difficulty}
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
        <Chip
          label={formatDuration(module.duration)}
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
        {module.lessons && module.lessons.length > 0 && (
          <Chip
            icon={<MenuBook sx={{ fontSize: 14, color: isAvailable ? '#ffffff' : '#9e9e9e' }} />}
            label={`${module.lessons.length} lecciones`}
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

ModuleCardMeta.propTypes = {
  module: PropTypes.object.isRequired,
  isAvailable: PropTypes.bool.isRequired
};

export default ModuleCardMeta;

