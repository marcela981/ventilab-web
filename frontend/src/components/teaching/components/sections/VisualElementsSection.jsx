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
    switch (type?.toLowerCase()) {
      case 'imagen':
      case 'image':
        return <ImageIcon />;
      case 'animación':
      case 'animation':
      case 'video':
        return <PlayCircleIcon />;
      case 'gráfico':
      case 'graph':
      case 'diagram':
        return <TimelineIcon />;
      default:
        return <DescriptionIcon />;
    }
  };
  
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
        Elementos Visuales
      </Typography>
      
      {visualElements.map((element, index) => (
        <Paper
          key={index}
          elevation={1}
          sx={{
            p: { xs: 2, md: 3 },
            mb: 2,
            border: '2px dashed',
            borderColor: 'divider',
            backgroundColor: 'rgba(0, 0, 0, 0.02)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            {getIcon(element.type)}
            <Typography variant="h6" sx={{ ml: 2, fontWeight: 600 }}>
              {element.title || `Elemento Visual ${index + 1}`}
            </Typography>
            <Chip
              label={element.type || 'Visual'}
              size="small"
              sx={{ ml: 'auto' }}
            />
          </Box>
          
          {element.description && (
            <Typography variant="body2" color="text.secondary" paragraph>
              {element.description}
            </Typography>
          )}
          
          {element.objective && (
            <Box sx={{ mt: 2, p: 2, backgroundColor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                <strong>Objetivo:</strong> {element.objective}
              </Typography>
            </Box>
          )}
        </Paper>
      ))}
    </Box>
  );
};

export default VisualElementsSection;

