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
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'start', mb: 2 }}>
          <LightbulbIcon sx={{ color: '#0BBAF4', mr: 2, mt: 0.5, fontSize: 40 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 2, color: '#0BBAF4' }}>
              {singleAnalogy.concept}
            </Typography>
            <Typography variant="h6" sx={{ fontStyle: 'italic', mb: 3, color: 'rgba(255, 255, 255, 0.9)' }}>
              "{singleAnalogy.analogy}"
            </Typography>
          </Box>
        </Box>
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
          <Typography variant="body1" sx={{ lineHeight: 1.8, fontSize: '1.1rem', color: '#ffffff' }}>
            {singleAnalogy.explanation}
          </Typography>
        </Paper>
      </Box>
    );
  }
  
  // Render multiple analogies
  if (!analogies || analogies.length === 0) return null;
  
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 3, color: '#0BBAF4' }}>
        Analogías para Facilitar la Comprensión
      </Typography>
      {analogies.map((analogy, index) => (
        <Box key={index} sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'start', mb: 1 }}>
            <LightbulbIcon sx={{ color: '#0BBAF4', mr: 2, mt: 0.5 }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#0BBAF4' }}>
                {analogy.concept}
              </Typography>
              <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 2, color: 'rgba(255, 255, 255, 0.9)' }}>
                "{analogy.analogy}"
              </Typography>
            </Box>
          </Box>
          <Paper
            elevation={1}
            sx={{
              p: { xs: 2, md: 3 },
              backgroundColor: 'rgba(255, 193, 7, 0.08)',
              borderLeft: '4px solid',
              borderColor: 'warning.main',
            }}
          >
            <Typography variant="body1" sx={{ color: '#ffffff' }}>
              {analogy.explanation}
            </Typography>
          </Paper>
        </Box>
      ))}
    </Box>
  );
};

export default AnalogiesSection;

