import React from 'react';
import {
  Paper,
  Typography,
  Box,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { MarkdownRenderer } from '../content';

/**
 * TheorySection - Componente para renderizar una sección de teoría
 */
const TheorySection = ({ section, sectionIndex, theory }) => {
  const theme = useTheme();
  
  if (!section) return null;
  
  return (
    <Paper
      elevation={2}
      sx={{
        p: { xs: 2, md: 3 },
        borderRadius: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        minHeight: '60vh',
      }}
    >
      {/* Título de la sección */}
      <Typography 
        variant="h4" 
        component="h2" 
        gutterBottom 
        sx={{ 
          fontWeight: 600, 
          mb: 3,
          color: theme.palette.primary.main,
          pb: 2,
          borderBottom: `3px solid ${theme.palette.primary.main}`,
        }}
      >
        {section.title || `Sección ${sectionIndex + 1}`}
      </Typography>
      
      {/* Contenido de la sección */}
      {section.content && (
        <Box sx={{ lineHeight: 1.8, mb: 3 }}>
          <MarkdownRenderer content={section.content} />
        </Box>
      )}
      
      {/* Examples associated with this section */}
      {theory?.examples && theory.examples.length > 0 && sectionIndex < theory.examples.length && (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 3 },
            mt: 3,
            backgroundColor: 'rgba(33, 150, 243, 0.08)',
            borderLeft: '4px solid',
            borderColor: 'primary.main',
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
            Ejemplo Clínico
          </Typography>
          <Typography variant="body1" paragraph>
            {theory.examples[sectionIndex].description}
          </Typography>
          {theory.examples[sectionIndex].clinicalRelevance && (
            <Box sx={{ mt: 2, p: 2, backgroundColor: 'rgba(255, 255, 255, 0.7)', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                Relevancia Clínica:
              </Typography>
              <Typography variant="body2">
                {theory.examples[sectionIndex].clinicalRelevance}
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </Paper>
  );
};

export default TheorySection;

