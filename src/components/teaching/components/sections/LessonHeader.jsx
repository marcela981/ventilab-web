import React from 'react';
import {
  Box,
  Typography,
  Chip,
} from '@mui/material';
import { School as SchoolIcon } from '@mui/icons-material';

/**
 * LessonHeader - Componente para renderizar el encabezado de la lección
 */
const LessonHeader = ({ data, currentPage, totalPages }) => {
  if (!data) return null;
  
  return (
    <Box sx={{ mb: 4 }}>
      <Typography
        variant="h3"
        component="h1"
        gutterBottom
        sx={{
          fontWeight: 600,
          color: '#0BBAF4',
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.3)',
        }}
      >
        {data.title}
      </Typography>

      {data.moduleInfo && (
        <Typography variant="subtitle1" gutterBottom sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
          {data.moduleInfo.title}
        </Typography>
      )}
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
        {data.moduleInfo?.level && (
          <Chip
            label={data.moduleInfo.level}
            size="small"
            color="primary"
            variant="filled"
            sx={{
              maxWidth: 1,
              '& .MuiChip-label': {
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              },
              '&:focus-visible': {
                outline: '2px solid #003A6B',
                outlineOffset: '2px',
              },
            }}
          />
        )}
        {data.moduleInfo?.difficulty && (
          <Chip
            label={data.moduleInfo.difficulty}
            size="small"
            color="secondary"
            variant="filled"
            sx={{
              maxWidth: 1,
              '& .MuiChip-label': {
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                // Preservar el overlay del tema - no sobrescribir position ni ::before
              },
              '&:focus-visible': {
                outline: '2px solid #003A6B',
                outlineOffset: '2px',
              },
            }}
          />
        )}
        {data.moduleInfo?.bloomLevel && (
          <Chip
            label={`Bloom: ${data.moduleInfo.bloomLevel}`}
            size="small"
            color="primary"
            variant="filled"
            sx={{
              maxWidth: 1,
              '& .MuiChip-label': {
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              },
              '&:focus-visible': {
                outline: '2px solid #003A6B',
                outlineOffset: '2px',
              },
            }}
          />
        )}
        {data.moduleInfo?.estimatedTime && (
          <Chip
            icon={<SchoolIcon sx={{ color: '#0BBAF4' }} />}
            label={data.moduleInfo.estimatedTime}
            size="small"
            color="primary"
            variant="filled"
            sx={{
              maxWidth: 1,
              '& .MuiChip-label': {
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              },
              '&:focus-visible': {
                outline: '2px solid #003A6B',
                outlineOffset: '2px',
              },
            }}
          />
        )}
      </Box>
    </Box>
  );
};

export default LessonHeader;

