import React from 'react';
import {
  Paper,
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Star as StarIcon,
  EmojiEvents as TrophyIcon,
} from '@mui/icons-material';

/**
 * KeyPointsSection - Componente para renderizar puntos clave
 */
const KeyPointsSection = ({ keyPoints }) => {
  if (!keyPoints || keyPoints.length === 0) return null;
  
  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <StarIcon sx={{ color: '#0BBAF4', mr: 1 }} />
        <Typography variant="h5" component="h2" sx={{ fontWeight: 600, color: '#0BBAF4' }}>
          Puntos Clave
        </Typography>
      </Box>
      
      <Paper
        elevation={2}
        sx={{
          p: { xs: 2, md: 3 },
          backgroundColor: 'rgba(255, 193, 7, 0.15)',
        }}
      >
        <List>
          {keyPoints.map((point, index) => (
            <ListItem key={index} sx={{ pl: 0, alignItems: 'flex-start' }}>
              <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}>
                <TrophyIcon sx={{ color: '#0BBAF4', fontSize: 20 }} />
              </ListItemIcon>
              <ListItemText
                primary={point}
                primaryTypographyProps={{
                  variant: 'body1',
                  sx: { fontWeight: 500, lineHeight: 1.7, color: '#ffffff' },
                }}
              />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Box>
  );
};

export default KeyPointsSection;

