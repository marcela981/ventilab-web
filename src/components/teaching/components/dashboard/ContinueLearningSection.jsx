import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Grid,
  Button,
  LinearProgress,
  Chip,
  Paper
} from '@mui/material';
import {
  PlayCircleOutline,
  AccessTime,
  Star,
  Person
} from '@mui/icons-material';
import ClientOnly from '../../../common/ClientOnly';

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
  return (
    <ClientOnly fallback={
      <Paper elevation={2} sx={{ p: 3, mb: 4, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Continuar Aprendiendo
        </Typography>
        <Typography variant="body2" sx={{ mb: 2, opacity: 0.9 }}>
          Comienza tu viaje de aprendizaje
        </Typography>
        <Button variant="contained" size="large" disabled>
          Comenzar
        </Button>
      </Paper>
    }>
      {nextModule ? (
        <Paper 
          elevation={3} 
          sx={{ 
            p: 3, 
            mb: 4, 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
            color: 'white',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Patrón de fondo */}
          <Box sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '200px',
            height: '100%',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '50%',
            transform: 'translateX(50%)'
          }} />
          
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography variant="h5" sx={{ mb: 1, fontWeight: 700 }}>
                Continuar Aprendiendo
              </Typography>
              <Typography variant="h6" sx={{ mb: 2, opacity: 0.9 }}>
                {nextModule.title}
              </Typography>
              <Typography variant="body2" sx={{ mb: 3, opacity: 0.8 }}>
                {nextModule.description || nextModule.learningObjectives?.[0]}
              </Typography>
              
              {/* Progreso específico del módulo */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Progreso del módulo
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {calculateModuleProgress(nextModule.id).toFixed(0)}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={calculateModuleProgress(nextModule.id)}
                  sx={{ 
                    height: 8, 
                    borderRadius: 4,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: '#fff',
                      borderRadius: 4,
                    }
                  }}
                />
              </Box>

              {/* Metadatos del módulo */}
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Chip 
                  icon={<AccessTime />}
                  label={`${nextModule.estimatedTime || Math.round(nextModule.duration / 60)}h`}
                  size="small"
                  sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
                />
                <Chip 
                  icon={<Star />}
                  label={nextModule.difficulty}
                  size="small"
                  sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
                />
                <Chip 
                  icon={<Person />}
                  label={curriculumData.levels.find(l => l.id === nextModule.level)?.title}
                  size="small"
                  sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
                />
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4} sx={{ textAlign: 'center' }}>
              <Button
                variant="contained"
                size="large"
                onClick={onContinueLearning}
                startIcon={<PlayCircleOutline />}
                sx={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '2px solid rgba(255,255,255,0.3)',
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.3)',
                    transform: 'translateY(-2px)',
                  }
                }}
              >
                Continuar desde {nextModule.lessons?.[0]?.title || 'Lección 1'}
              </Button>
            </Grid>
          </Grid>
        </Paper>
      ) : (
        <Paper elevation={2} sx={{ p: 3, mb: 4, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            ¡Comienza tu Aprendizaje!
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, opacity: 0.9 }}>
            Explora los módulos disponibles para comenzar tu viaje en la ventilación mecánica
          </Typography>
          <Button 
            variant="contained" 
            size="large"
            onClick={onContinueLearning}
            startIcon={<PlayCircleOutline />}
            sx={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '2px solid rgba(255,255,255,0.3)',
              px: 4,
              py: 1.5,
              fontSize: '1.1rem',
              fontWeight: 600,
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.3)',
                transform: 'translateY(-2px)',
              }
            }}
          >
            Explorar Módulos
          </Button>
        </Paper>
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
