import React from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Chip,
} from '@mui/material';
import { School as SchoolIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

/**
 * LessonHeader - Componente para renderizar el encabezado de la lección
 */
const LessonHeader = ({ data, currentPage, totalPages }) => {
  const theme = useTheme();
  
  if (!data) return null;
  
  const progressPercentage = ((currentPage + 1) / totalPages) * 100;
  
  return (
    <Box sx={{ mb: 4 }}>
      <Typography 
        variant="h3" 
        component="h1" 
        gutterBottom 
        sx={{ 
          fontWeight: 600,
          color: '#ffffff',
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.3)',
        }}
      >
        {data.title}
      </Typography>
      
      {/* Progress Bar */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
            Progreso de la lección
          </Typography>
          <Typography variant="caption" fontWeight={600} sx={{ color: '#ffffff' }}>
            {currentPage + 1} / {totalPages}
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progressPercentage}
          sx={{
            height: 8,
            borderRadius: 4,
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            '& .MuiLinearProgress-bar': {
              backgroundColor: theme.palette.primary.main,
              borderRadius: 4,
              boxShadow: '0 2px 4px rgba(33, 150, 243, 0.3)',
            },
          }}
        />
      </Box>
      
      {data.moduleInfo && (
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          {data.moduleInfo.title}
        </Typography>
      )}
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
        {data.moduleInfo?.level && (
          <Chip
            label={data.moduleInfo.level}
            size="small"
            color="primary"
            variant="outlined"
          />
        )}
        {data.moduleInfo?.difficulty && (
          <Chip
            label={data.moduleInfo.difficulty}
            size="small"
            color="secondary"
            variant="outlined"
          />
        )}
        {data.moduleInfo?.bloomLevel && (
          <Chip
            label={`Bloom: ${data.moduleInfo.bloomLevel}`}
            size="small"
            color="default"
            variant="outlined"
          />
        )}
        {data.moduleInfo?.estimatedTime && (
          <Chip
            icon={<SchoolIcon />}
            label={data.moduleInfo.estimatedTime}
            size="small"
            variant="outlined"
          />
        )}
      </Box>
    </Box>
  );
};

export default LessonHeader;

