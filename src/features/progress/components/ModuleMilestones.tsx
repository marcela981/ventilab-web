import React, { useEffect, useRef, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Tooltip,
  useTheme
} from '@mui/material';
import {
  CheckCircle,
  EmojiEvents,
  Star,
  Flag,
  Lock
} from '@mui/icons-material';
import { ModuleMilestone } from '../types';

interface ModuleMilestonesProps {
  percent: number;
  milestones: ModuleMilestone[];
}

/**
 * ModuleMilestones - Componente de hitos del módulo con barra de progreso
 * 
 * Muestra:
 * - Barra de progreso general basada en percent
 * - Lista de hitos con iconos
 * - Mini-animación sutil al desbloquear un hito
 * - Tooltips informativos
 */
const ModuleMilestones: React.FC<ModuleMilestonesProps> = ({
  percent,
  milestones
}) => {
  const theme = useTheme();
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const previousCompletedRef = useRef<Set<string>>(new Set());

  // Detectar hitos recién desbloqueados para animación
  useEffect(() => {
    const currentCompleted = new Set(
      milestones.filter(m => m.completed).map(m => m.id)
    );
    
    // Encontrar hitos que se acaban de desbloquear
    const newlyUnlocked = milestones.filter(m => {
      const wasCompleted = previousCompletedRef.current.has(m.id);
      const isCompleted = m.completed;
      return !wasCompleted && isCompleted;
    });

    if (newlyUnlocked.length > 0) {
      // Activar animación para hitos recién desbloqueados
      setUnlockedIds(new Set(newlyUnlocked.map(m => m.id)));
      
      // Remover animación después de 1.5 segundos
      const timer = setTimeout(() => {
        setUnlockedIds(new Set());
      }, 1500);

      return () => clearTimeout(timer);
    }

    previousCompletedRef.current = currentCompleted;
  }, [milestones]);

  // Obtener icono para el hito
  const getMilestoneIcon = (milestone: ModuleMilestone, index: number) => {
    if (milestone.completed) {
      return <CheckCircle sx={{ fontSize: 24 }} />;
    }
    
    if (milestone.icon) {
      return <Typography variant="h6" sx={{ fontWeight: 700 }}>{milestone.icon}</Typography>;
    }
    
    // Iconos por defecto según el índice
    const defaultIcons = [
      <Star key="star" sx={{ fontSize: 20 }} />,
      <EmojiEvents key="trophy" sx={{ fontSize: 20 }} />,
      <Flag key="flag" sx={{ fontSize: 20 }} />
    ];
    
    return defaultIcons[index % defaultIcons.length];
  };

  // Calcular porcentaje de hitos completados
  const completedCount = milestones.filter(m => m.completed).length;
  const totalCount = milestones.length;
  const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <Card
      sx={{
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        transition: 'all 0.3s ease'
      }}
    >
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600 }}>
            Hitos del Módulo
          </Typography>
          <Box
            sx={{
              px: 1.5,
              py: 0.5,
              borderRadius: 1.5,
              backgroundColor: 'rgba(76, 175, 80, 0.2)',
              border: '1px solid rgba(76, 175, 80, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: 0.75
            }}
          >
            <Flag sx={{ fontSize: 16, color: '#4CAF50' }} />
            <Typography variant="body2" sx={{ color: '#4CAF50', fontWeight: 700 }}>
              {completedCount}/{totalCount}
            </Typography>
          </Box>
        </Box>

        {/* Barra de progreso general */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" sx={{ color: '#e8f4fd', fontWeight: 600 }}>
              Progreso General
            </Typography>
            <Typography variant="body2" sx={{ color: '#2196F3', fontWeight: 700 }}>
              {percent}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={percent}
            sx={{
              height: 10,
              borderRadius: 5,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              '& .MuiLinearProgress-bar': {
                background: 'linear-gradient(90deg, #2196F3, #42a5f5)',
                borderRadius: 5,
                transition: 'transform 0.4s ease'
              }
            }}
            aria-label={`Progreso general del módulo: ${percent}%`}
          />
        </Box>

        {/* Lista de hitos */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {milestones.map((milestone, index) => {
            const isUnlocked = unlockedIds.has(milestone.id);
            const isCompleted = milestone.completed;

            return (
              <Tooltip
                key={milestone.id}
                title={
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {milestone.title}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      Progreso: {milestone.progress}%
                    </Typography>
                    {milestone.completed && milestone.unlockedAt && (
                      <Typography variant="caption" sx={{ display: 'block', opacity: 0.9 }}>
                        Desbloqueado: {new Date(milestone.unlockedAt).toLocaleDateString()}
                      </Typography>
                    )}
                    {!milestone.completed && (
                      <Typography variant="caption" sx={{ display: 'block', opacity: 0.8 }}>
                        Pendiente de completar
                      </Typography>
                    )}
                  </Box>
                }
                arrow
                placement="top"
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 2,
                    border: `2px solid ${isCompleted ? 'rgba(76, 175, 80, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                    borderRadius: 2,
                    backgroundColor: isCompleted
                      ? 'rgba(76, 175, 80, 0.1)'
                      : 'rgba(255, 255, 255, 0.05)',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    overflow: 'hidden',
                    // Animación de desbloqueo
                    ...(isUnlocked && {
                      animation: 'unlockPulse 0.6s ease-out',
                      '@keyframes unlockPulse': {
                        '0%': {
                          transform: 'scale(1)',
                          boxShadow: '0 0 0 0 rgba(76, 175, 80, 0.7)'
                        },
                        '50%': {
                          transform: 'scale(1.05)',
                          boxShadow: '0 0 0 10px rgba(76, 175, 80, 0)'
                        },
                        '100%': {
                          transform: 'scale(1)',
                          boxShadow: '0 0 0 0 rgba(76, 175, 80, 0)'
                        }
                      }
                    }),
                    '&:hover': {
                      backgroundColor: isCompleted
                        ? 'rgba(76, 175, 80, 0.15)'
                        : 'rgba(255, 255, 255, 0.08)',
                      transform: 'translateX(4px)',
                      borderColor: isCompleted ? '#4CAF50' : 'rgba(255, 255, 255, 0.2)'
                    }
                  }}
                  aria-label={`Hito: ${milestone.title}, ${milestone.progress}% completado`}
                >
                  {/* Efecto de brillo al desbloquear */}
                  {isUnlocked && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: '-100%',
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
                        animation: 'shimmer 1s ease-in-out',
                        '@keyframes shimmer': {
                          '0%': { left: '-100%' },
                          '100%': { left: '100%' }
                        }
                      }}
                    />
                  )}

                  {/* Icono del hito */}
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      backgroundColor: isCompleted
                        ? 'rgba(76, 175, 80, 0.2)'
                        : 'rgba(255, 255, 255, 0.1)',
                      border: `2px solid ${isCompleted ? '#4CAF50' : 'rgba(255, 255, 255, 0.2)'}`,
                      color: isCompleted ? '#4CAF50' : '#e8f4fd',
                      transition: 'all 0.3s ease',
                      position: 'relative',
                      zIndex: 1,
                      // Animación del icono al desbloquear
                      ...(isUnlocked && {
                        animation: 'iconBounce 0.6s ease-out',
                        '@keyframes iconBounce': {
                          '0%, 100%': { transform: 'scale(1) rotate(0deg)' },
                          '25%': { transform: 'scale(1.2) rotate(-10deg)' },
                          '75%': { transform: 'scale(1.2) rotate(10deg)' }
                        }
                      }),
                      '&:hover': {
                        transform: isCompleted ? 'scale(1.1) rotate(5deg)' : 'scale(1.05)',
                        borderColor: isCompleted ? '#4CAF50' : 'rgba(255, 255, 255, 0.3)'
                      }
                    }}
                  >
                    {isCompleted ? (
                      getMilestoneIcon(milestone, index)
                    ) : (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '100%',
                          height: '100%'
                        }}
                      >
                        {getMilestoneIcon(milestone, index)}
                      </Box>
                    )}
                  </Box>

                  {/* Información del hito */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        color: isCompleted ? '#4CAF50' : '#ffffff',
                        fontWeight: 600,
                        mb: 1,
                        transition: 'color 0.3s ease'
                      }}
                    >
                      {milestone.title}
                    </Typography>
                    
                    {/* Barra de progreso del hito */}
                    <Box sx={{ mb: 0.5 }}>
                      <LinearProgress
                        variant="determinate"
                        value={milestone.progress}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: isCompleted ? '#4CAF50' : '#2196F3',
                            borderRadius: 3,
                            transition: 'transform 0.4s ease, background-color 0.3s ease'
                          }
                        }}
                        aria-label={`Progreso del hito: ${milestone.progress}%`}
                      />
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: '#e8f4fd', 
                          opacity: 0.7,
                          fontSize: '0.75rem'
                        }}
                      >
                        {milestone.progress}% completado
                      </Typography>
                      
                      {isCompleted && (
                        <Box
                          sx={{
                            px: 1,
                            py: 0.25,
                            borderRadius: 1,
                            backgroundColor: 'rgba(76, 175, 80, 0.2)',
                            border: '1px solid rgba(76, 175, 80, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5
                          }}
                        >
                          <CheckCircle sx={{ fontSize: 14, color: '#4CAF50' }} />
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: '#4CAF50', 
                              fontWeight: 600,
                              fontSize: '0.7rem'
                            }}
                          >
                            Completado
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Box>
              </Tooltip>
            );
          })}
        </Box>

        {/* Mensaje si no hay hitos */}
        {milestones.length === 0 && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 4,
              textAlign: 'center'
            }}
          >
            <Lock sx={{ fontSize: 48, color: '#e8f4fd', opacity: 0.3, mb: 2 }} />
            <Typography variant="body2" sx={{ color: '#e8f4fd', opacity: 0.7 }}>
              No hay hitos disponibles
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ModuleMilestones;
