"use client";

import React from 'react';
import {
  Box,
  Paper,
  Grid,
  Typography,
  Button,
  LinearProgress,
  Chip
} from '@mui/material';
import {
  PlayCircleOutline,
  AccessTime,
  Star,
  Person
} from '@mui/icons-material';
import { curriculumData } from '../../../data/curriculumData';

/**
 * ContinueLearningSection - Componente de sección "Continuar Aprendiendo"
 *
 * Muestra el próximo módulo disponible con su progreso y metadatos.
 *
 * @param {Object} nextModule - Próximo módulo disponible
 * @param {Function} onContinue - Callback al hacer clic en continuar
 * @param {Function} calculateProgress - Función para calcular progreso del módulo
 * @returns {JSX.Element|null} Componente de continuar aprendiendo
 */
const ContinueLearningSection = ({ nextModule, onContinue, calculateProgress }) => {
  if (!nextModule) return null;

  const moduleProgress = calculateProgress(nextModule.id);

  return (
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
                {moduleProgress.toFixed(0)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={moduleProgress}
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
            onClick={onContinue}
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
  );
};

export default ContinueLearningSection;
