import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Grid,
  LinearProgress,
  Avatar,
  Paper
} from '@mui/material';

/**
 * LevelStepper - Stepper visual de niveles de aprendizaje
 * 
 * Muestra los niveles del curriculum con su progreso y módulos asociados.
 * Cada nivel incluye información de progreso y módulos disponibles.
 * 
 * @param {Array} levels - Array de niveles del curriculum
 * @param {Object} levelProgress - Progreso por nivel
 * @param {Function} getModulesByLevel - Función para obtener módulos por nivel
 * @param {Function} calculateModuleProgress - Función para calcular progreso de módulo
 * @param {Function} isModuleAvailable - Función para verificar disponibilidad de módulo
 * @param {Function} onModuleClick - Callback para clicks en módulos
 * @param {JSX.Element} moduleGrid - Componente del grid de módulos
 */
const LevelStepper = ({ 
  levels = [],
  levelProgress = {},
  getModulesByLevel,
  calculateModuleProgress,
  isModuleAvailable,
  onModuleClick,
  moduleGrid
}) => {
  return (
    <Paper 
      elevation={2}
      sx={{ 
        p: 4, 
        mb: 4,
        backgroundColor: '#ffffff',
        border: '1px solid #e9ecef',
        borderRadius: 3
      }}
    >
      <Typography variant="h5" sx={{ color: '#2c3e50', fontWeight: 700, mb: 3, textAlign: 'center' }}>
        🗺️ Tu Camino de Aprendizaje
      </Typography>
      
      {/* Stepper visual por niveles */}
      <Stepper orientation="vertical" sx={{ mb: 3 }}>
        {levels.map((level, levelIndex) => {
          const levelModules = getModulesByLevel(level.id);
          const levelProg = levelProgress[level.id] || { total: 0, completed: 0, percentage: 0 };
          
          return (
            <Step key={level.id} active={levelProg.percentage > 0} completed={levelProg.percentage === 100}>
              <StepLabel
                StepIconComponent={() => (
                  <Avatar
                    sx={{
                      width: 40,
                      height: 40,
                      backgroundColor: level.color,
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '1.2rem'
                    }}
                  >
                    {levelProg.percentage === 100 ? '✓' : levelProg.completed}
                  </Avatar>
                )}
              >
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#2c3e50' }}>
                    {level.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#6c757d', mb: 1 }}>
                    {level.description}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="body2" sx={{ color: level.color, fontWeight: 600 }}>
                      {levelProg.completed}/{levelProg.total} módulos completados
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={levelProg.percentage} 
                      sx={{ 
                        flex: 1,
                        height: 6, 
                        borderRadius: 3,
                        backgroundColor: '#e9ecef',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: level.color,
                          borderRadius: 3,
                        }
                      }}
                    />
                    <Typography variant="body2" sx={{ color: level.color, fontWeight: 600, minWidth: '40px' }}>
                      {levelProg.percentage.toFixed(0)}%
                    </Typography>
                  </Box>
                </Box>
              </StepLabel>
              
              <StepContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  {/* Aquí se renderizará el grid de módulos */}
                  {moduleGrid}
                </Grid>
              </StepContent>
            </Step>
          );
        })}
      </Stepper>
    </Paper>
  );
};

LevelStepper.propTypes = {
  levels: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    color: PropTypes.string.isRequired
  })),
  levelProgress: PropTypes.object,
  getModulesByLevel: PropTypes.func.isRequired,
  calculateModuleProgress: PropTypes.func.isRequired,
  isModuleAvailable: PropTypes.func.isRequired,
  onModuleClick: PropTypes.func.isRequired,
  moduleGrid: PropTypes.element.isRequired
};

export default LevelStepper;
