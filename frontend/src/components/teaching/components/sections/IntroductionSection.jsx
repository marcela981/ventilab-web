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
import { CheckCircle as CheckCircleIcon } from '@mui/icons-material';

/**
 * IntroductionSection - Componente para renderizar la introducción de la lección
 */
const IntroductionSection = ({ introduction }) => {
  if (!introduction) return null;
  
  return (
    <Paper elevation={2} sx={{ p: { xs: 2, md: 3 }, mb: 4 }}>
      <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
        Introducción
      </Typography>
      
      {introduction.text && (
        <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
          {introduction.text}
        </Typography>
      )}
      
      {introduction.objectives && introduction.objectives.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
            Objetivos de Aprendizaje
          </Typography>
          <List>
            {introduction.objectives.map((objective, index) => (
              <ListItem key={index} sx={{ pl: 0 }}>
                <ListItemIcon>
                  <CheckCircleIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={`${index + 1}. ${objective}`}
                  primaryTypographyProps={{
                    variant: 'body1',
                    sx: { lineHeight: 1.7 },
                  }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </Paper>
  );
};

export default IntroductionSection;

