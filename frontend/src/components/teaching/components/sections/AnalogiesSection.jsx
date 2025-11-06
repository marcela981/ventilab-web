import React from 'react';
import {
  Box,
  Typography,
  Paper,
} from '@mui/material';
import { Lightbulb as LightbulbIcon } from '@mui/icons-material';

/**
 * AnalogiesSection - Componente para renderizar analogías
 */
const AnalogiesSection = ({ analogies, singleAnalogy = null }) => {
  if (singleAnalogy) {
    // Render single analogy (full page)
    return (
      <Paper
        elevation={2}
        sx={{
          p: { xs: 2, md: 3 },
          minHeight: '60vh',
          backgroundColor: 'rgba(255, 193, 7, 0.08)',
          borderLeft: '4px solid',
          borderColor: 'warning.main',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'start', mb: 2 }}>
          <LightbulbIcon sx={{ color: 'warning.main', mr: 2, mt: 0.5, fontSize: 40 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
              {singleAnalogy.concept}
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ fontStyle: 'italic', mb: 3 }}>
              "{singleAnalogy.analogy}"
            </Typography>
            <Typography variant="body1" sx={{ lineHeight: 1.8, fontSize: '1.1rem' }}>
              {singleAnalogy.explanation}
            </Typography>
          </Box>
        </Box>
      </Paper>
    );
  }
  
  // Render multiple analogies
  if (!analogies || analogies.length === 0) return null;
  
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
        Analogías para Facilitar la Comprensión
      </Typography>
      {analogies.map((analogy, index) => (
        <Paper
          key={index}
          elevation={1}
          sx={{
            mb: 2,
            p: { xs: 2, md: 3 },
            backgroundColor: 'rgba(255, 193, 7, 0.08)',
            borderLeft: '4px solid',
            borderColor: 'warning.main',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'start' }}>
            <LightbulbIcon sx={{ color: 'warning.main', mr: 2, mt: 0.5 }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                {analogy.concept}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                "{analogy.analogy}"
              </Typography>
              <Typography variant="body1">
                {analogy.explanation}
              </Typography>
            </Box>
          </Box>
        </Paper>
      ))}
    </Box>
  );
};

export default AnalogiesSection;

