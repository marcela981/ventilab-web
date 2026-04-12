import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Grid,
  Button,
  LinearProgress,
  Chip,
  useTheme
} from '@mui/material';
import {
  PlayCircleOutline,
  AccessTime,
  Star,
  Person
} from '@mui/icons-material';
import ClientOnly from '@/shared/components/ClientOnly';

/**
 * ContinueLearningSection - Sección destacada para continuar el aprendizaje
 * 
 * Muestra el próximo módulo disponible con su progreso, metadatos y botón de acción.
 * Incluye información visual del progreso y tiempo estimado.
 * 
 * @param {Object} nextModule - Datos del próximo módulo disponible
 * @param {Function} onContinueLearning - Callback para continuar aprendiendo
 * @param {Function} calculateModuleProgress - Función para calcular progreso del módulo
 * @param {Object} curriculumData - Datos del curriculum
 */
const ContinueLearningSection = ({
  nextModule,
  onContinueLearning,
  calculateModuleProgress,
  curriculumData
}) => {
  const theme = useTheme();

  return (
    <ClientOnly fallback={
      <Box
        sx={{
          p: 3,
          mb: 4,
          backgroundColor: 'transparent',
          border: `1px solid rgba(255, 255, 255, 0.1)`,
          borderRadius: theme.shape.borderRadius
        }}
      >
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#ffffff' }}>
          Continuar Aprendiendo
        </Typography>
        <Typography variant="body2" sx={{ mb: 2, color: '#e8f4fd' }}>
          Comienza tu viaje de aprendizaje
        </Typography>
        <Button variant="contained" color="primary" size="large" disabled>
          Comenzar
        </Button>
      </Box>
    }>
      {nextModule ? (
        <Box
          sx={{
            p: 3,
            mb: 4,
            backgroundColor: 'transparent',
            border: `1px solid rgba(255, 255, 255, 0.1)`,
            borderRadius: theme.shape.borderRadius
          }}
        >
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography variant="h5" sx={{ mb: 1, fontWeight: 700, color: '#ffffff' }}>
                Continuar Aprendiendo
              </Typography>
              <Typography variant="h6" sx={{ mb: 2, color: '#ffffff' }}>
                {nextModule.title}
              </Typography>
              <Typography variant="body2" sx={{ mb: 3, color: '#e8f4fd' }}>
                {nextModule.description || nextModule.learningObjectives?.[0]}
              </Typography>

              {/* Progreso específico del módulo */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ color: '#e8f4fd' }}>
                    Progreso del módulo
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#ffffff' }}>
                    {calculateModuleProgress(nextModule.id).toFixed(0)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={calculateModuleProgress(nextModule.id)}
                  color="primary"
                  sx={{
                    height: 8,
                    borderRadius: theme.shape.borderRadius
                  }}
                />
              </Box>

              {/* Metadatos del módulo */}
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Chip
                  icon={<AccessTime />}
                  label={`${nextModule.estimatedTime || Math.round(nextModule.duration / 60)}h`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
                <Chip
                  icon={<Star />}
                  label={nextModule.difficulty}
                  size="small"
                  color="secondary"
                  variant="outlined"
                />
                <Chip
                  icon={<Person />}
                  label={curriculumData.levels.find(l => l.id === nextModule.level)?.title}
                  size="small"
                  color="default"
                  variant="outlined"
                />
              </Box>
            </Grid>

            <Grid item xs={12} md={4} sx={{ textAlign: 'center' }}>
              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={onContinueLearning}
                startIcon={<PlayCircleOutline />}
                sx={{ px: 3, py: 1.5 }}
              >
                Continuar desde {nextModule.lessons?.[0]?.title || 'Lección 1'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      ) : (
        <Box
          sx={{
            p: 3,
            mb: 4,
            backgroundColor: 'transparent',
            border: `1px solid rgba(255, 255, 255, 0.1)`,
            borderRadius: theme.shape.borderRadius
          }}
        >
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#ffffff' }}>
            ¡Comienza tu Aprendizaje!
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, color: '#e8f4fd' }}>
            Explora los módulos disponibles para comenzar tu viaje en la ventilación mecánica
          </Typography>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={onContinueLearning}
            startIcon={<PlayCircleOutline />}
            sx={{ px: 3, py: 1.5 }}
          >
            Explorar Módulos
          </Button>
        </Box>
      )}
    </ClientOnly>
  );
};

ContinueLearningSection.propTypes = {
  nextModule: PropTypes.object,
  onContinueLearning: PropTypes.func.isRequired,
  calculateModuleProgress: PropTypes.func.isRequired,
  curriculumData: PropTypes.object.isRequired
};

export default ContinueLearningSection;
