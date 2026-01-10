import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Celebration as CelebrationIcon,
  AutoAwesome as SparklesIcon,
  EmojiEvents as TrophyIcon,
  RocketLaunch as RocketIcon,
} from '@mui/icons-material';

/**
 * CompletionPage - Componente para renderizar la página de completación
 */
const CompletionPage = ({ data, totalPages, onNavigateToLesson, startTime }) => {
  const theme = useTheme();
  const timeSpent = Math.round((Date.now() - (startTime || Date.now())) / 60000);
  const nextLesson = data?.navigation?.nextLesson;
  
  return (
    <Box
      sx={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        py: 6,
        position: 'relative',
        background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(33, 150, 243, 0.1) 100%)',
        borderRadius: 4,
      }}
    >
      {/* Confetti effect with icons */}
      <Box sx={{ position: 'relative', mb: 4 }}>
        <CelebrationIcon 
          sx={{ 
            fontSize: 120, 
            color: theme.palette.success.main,
            animation: 'pulse 2s ease-in-out infinite',
            '@keyframes pulse': {
              '0%, 100%': { transform: 'scale(1)' },
              '50%': { transform: 'scale(1.1)' },
            },
          }} 
        />
        <SparklesIcon 
          sx={{ 
            fontSize: 80, 
            color: theme.palette.warning.main,
            position: 'absolute',
            top: -20,
            right: -30,
            animation: 'rotate 3s linear infinite',
            '@keyframes rotate': {
              from: { transform: 'rotate(0deg)' },
              to: { transform: 'rotate(360deg)' },
            },
          }} 
        />
        <TrophyIcon 
          sx={{ 
            fontSize: 100, 
            color: theme.palette.primary.main,
            position: 'absolute',
            bottom: -20,
            left: -30,
          }} 
        />
      </Box>

      <Typography 
        variant="h2" 
        component="h1" 
        gutterBottom 
        sx={{ 
          fontWeight: 700, 
          color: theme.palette.success.main,
          mb: 2,
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        }}
      >
        ¡Lección Completada!
      </Typography>

      <Typography variant="h5" color="text.secondary" gutterBottom sx={{ mb: 4, fontWeight: 500 }}>
        Has completado exitosamente: <strong>{data?.title}</strong>
      </Typography>

      <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Paper elevation={3} sx={{ p: 2, minWidth: 150, backgroundColor: 'rgba(255, 255, 255, 0.9)' }}>
          <Typography variant="caption" color="text.secondary">Tiempo invertido</Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
            {timeSpent} min
          </Typography>
        </Paper>
        <Paper elevation={3} sx={{ p: 2, minWidth: 150, backgroundColor: 'rgba(255, 255, 255, 0.9)' }}>
          <Typography variant="caption" color="text.secondary">Páginas revisadas</Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.secondary.main }}>
            {totalPages - 1}
          </Typography>
        </Paper>
      </Box>

      {nextLesson ? (
        <Button
          variant="contained"
          size="large"
          endIcon={<RocketIcon />}
          onClick={() => onNavigateToLesson(nextLesson.id, data.moduleId)}
          sx={{
            py: 1.5,
            px: 4,
            fontSize: '1.2rem',
            fontWeight: 600,
            background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
            boxShadow: '0 4px 8px rgba(33, 150, 243, 0.4)',
            '&:hover': {
              background: 'linear-gradient(45deg, #1976D2 30%, #1BA8D3 90%)',
              boxShadow: '0 6px 12px rgba(33, 150, 243, 0.5)',
              transform: 'translateY(-2px)',
            },
            transition: 'all 0.3s ease',
          }}
        >
          Continuar con la Siguiente Lección
        </Button>
      ) : (
        <Button
          variant="outlined"
          size="large"
          onClick={() => window.location.href = '/teaching'}
          sx={{
            py: 1.5,
            px: 4,
            fontSize: '1.2rem',
            fontWeight: 600,
          }}
        >
          Volver al Curriculum
        </Button>
      )}
    </Box>
  );
};

export default CompletionPage;

