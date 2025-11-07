import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
} from '@mui/material';
import {
  Image as ImageIcon,
  PlayCircle as PlayCircleIcon,
  Timeline as TimelineIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';

/**
 * VisualElementsSection - Componente para renderizar elementos visuales
 */
const VisualElementsSection = ({ visualElements }) => {
  if (!visualElements || visualElements.length === 0) return null;
  
  const getIcon = (type) => {
    const iconProps = { sx: { color: '#0BBAF4' } };
    switch (type?.toLowerCase()) {
      case 'imagen':
      case 'image':
        return <ImageIcon {...iconProps} />;
      case 'animación':
      case 'animation':
      case 'video':
        return <PlayCircleIcon {...iconProps} />;
      case 'gráfico':
      case 'graph':
      case 'diagram':
        return <TimelineIcon {...iconProps} />;
      default:
        return <DescriptionIcon {...iconProps} />;
    }
  };
  
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 3, color: '#0BBAF4' }}>
        Elementos Visuales
      </Typography>
      
      {visualElements.map((element, index) => (
        <Box key={index} sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            {getIcon(element.type)}
            <Typography variant="h6" sx={{ ml: 2, fontWeight: 600, color: '#0BBAF4' }}>
              {element.title || `Elemento Visual ${index + 1}`}
            </Typography>
            <Chip
              label={element.type || 'Visual'}
              size="small"
              color="primary"
              variant="filled"
              sx={{
                ml: 'auto',
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
          </Box>
          
          {(element.description || element.objective) && (
            <Paper
              elevation={1}
              sx={{
                p: { xs: 2, md: 3 },
                border: '2px dashed',
                borderColor: 'divider',
                backgroundColor: 'rgba(0, 0, 0, 0.02)',
              }}
            >
              {element.description && (
                <Typography variant="body2" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                  {element.description}
                </Typography>
              )}
              
              {element.objective && (
                <Box sx={{ mt: 2, p: 2, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 1 }}>
                  <Typography variant="caption" sx={{ color: '#ffffff' }}>
                    <strong style={{ color: '#BBECFC' }}>Objetivo:</strong> {element.objective}
                  </Typography>
                </Box>
              )}
            </Paper>
          )}
        </Box>
      ))}
    </Box>
  );
};

export default VisualElementsSection;

