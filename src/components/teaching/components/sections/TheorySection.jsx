import React, { lazy, Suspense } from 'react';
import {
  Paper,
  Typography,
  Box,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { MarkdownRenderer } from '../content';

// Lazy load AITopicExpander
const AITopicExpander = lazy(() => import('../ai/AITopicExpander'));

/**
 * TheorySection - Componente para renderizar una sección de teoría
 */
const TheorySection = ({ 
  section, 
  sectionIndex, 
  theory,
  moduleId,
  lessonId,
  lessonData,
  currentPageType,
}) => {
  const theme = useTheme();
  
  if (!section) return null;
  
  // Determinar si el expansor de IA está habilitado para esta sección
  // Por defecto habilitado, pero se puede deshabilitar con metadata
  const aiExpanderEnabled = section.metadata?.aiExpanderEnabled !== false;
  const aiExpanderMode = section.metadata?.aiExpanderMode || 'button'; // 'button' | 'accordion'
  
  return (
    <Box>
      {/* Título de la sección */}
      <Typography 
        variant="h4" 
        component="h2" 
        gutterBottom 
        sx={{ 
          fontWeight: 600, 
          mb: 3,
          color: '#0BBAF4',
          pb: 2,
          borderBottom: `3px solid #0BBAF4`,
        }}
      >
        {section.title || `Sección ${sectionIndex + 1}`}
      </Typography>
      
      {/* Contenido de la sección */}
      {section.content && (
        <Paper
          elevation={2}
          sx={{
            p: { xs: 2, md: 3 },
            borderRadius: 2,
            backgroundColor: 'transparent',
            mb: 3,
            color: '#ffffff',
            position: 'relative',
          }}
        >
          <Box sx={{ lineHeight: 1.8, color: '#ffffff' }}>
            <MarkdownRenderer content={
              typeof section.content === 'string' 
                ? section.content 
                : section.content.markdown || section.content.text || ''
            } />
          </Box>
          
          {/* AI Topic Expander - Modo botón (no intrusivo) */}
          {aiExpanderEnabled && aiExpanderMode === 'button' && moduleId && lessonId && lessonData && (
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Suspense fallback={null}>
                <AITopicExpander
                  moduleId={moduleId}
                  lessonId={lessonId}
                  lessonData={lessonData}
                  currentSection={section}
                  currentPageType={currentPageType}
                  mode="button"
                  enabled={aiExpanderEnabled}
                />
              </Suspense>
            </Box>
          )}
        </Paper>
      )}
      
      {/* AI Topic Expander - Modo acordeón */}
      {aiExpanderEnabled && aiExpanderMode === 'accordion' && moduleId && lessonId && lessonData && (
        <Box sx={{ mb: 3 }}>
          <Suspense fallback={null}>
            <AITopicExpander
              moduleId={moduleId}
              lessonId={lessonId}
              lessonData={lessonData}
              currentSection={section}
              currentPageType={currentPageType}
              mode="accordion"
              enabled={aiExpanderEnabled}
            />
          </Suspense>
        </Box>
      )}
      
      {/* Examples associated with this section */}
      {theory?.examples && theory.examples.length > 0 && sectionIndex < theory.examples.length && (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 3 },
            mt: 3,
            backgroundColor: (theme) => 
              theme.palette.teaching?.chipPrimaryBg 
                ? alpha(theme.palette.teaching.chipPrimaryBg, 0.15)
                : alpha('#BBECFC', 0.15),
            borderLeft: '4px solid',
            borderColor: 'primary.main',
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#0BBAF4' }}>
            Ejemplo Clínico
          </Typography>
          <Typography variant="body1" paragraph sx={{ color: '#ffffff' }}>
            {theory.examples[sectionIndex].description}
          </Typography>
          {theory.examples[sectionIndex].clinicalRelevance && (
            <Box sx={{ mt: 2, p: 2, backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, color: '#BBECFC' }}>
                Relevancia Clínica:
              </Typography>
              <Typography variant="body2" sx={{ color: '#ffffff' }}>
                {theory.examples[sectionIndex].clinicalRelevance}
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default TheorySection;

