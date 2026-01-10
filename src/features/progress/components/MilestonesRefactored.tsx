import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Button
} from '@mui/material';
import { Flag, CheckCircle } from '@mui/icons-material';
import { EmptyState } from './EmptyState';

interface Milestone {
  id: string;
  title: string;
  description: string;
  progress: number; // 0-1
  completedAt?: string;
  icon?: string;
}

interface MilestonesProps {
  milestones: Milestone[];
  onCTA?: (milestoneId: string) => void;
}

/**
 * Milestones - Componente refactorizado de hitos
 * Lista de hitos con barra de progreso, ordenados: activos → completados
 */
const Milestones: React.FC<MilestonesProps> = ({ milestones, onCTA }) => {
  // Separate active and completed milestones
  const activeMilestones = milestones.filter(m => !m.completedAt);
  const completedMilestones = milestones.filter(m => m.completedAt);

  // Empty state
  if (milestones.length === 0) {
    return (
      <Card
        sx={{
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 2,
          backgroundColor: 'rgba(255, 255, 255, 0.05)'
        }}
      >
        <CardContent>
          <EmptyState
            title="Te proponemos estos objetivos para comenzar"
            description="Completa lecciones y mantén tu racha para alcanzar hitos."
            actionLabel="Activar"
            onAction={() => {
              // TODO: Show recommended milestones
            }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.05)'
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600 }}>
            Hitos
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
              {completedMilestones.length}/{milestones.length}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Active milestones */}
          {activeMilestones.map(milestone => (
            <Box
              key={milestone.id}
              sx={{
                p: 2,
                border: '2px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 2,
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  borderColor: 'rgba(255, 255, 255, 0.2)'
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                {milestone.icon && (
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {milestone.icon}
                  </Typography>
                )}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" sx={{ color: '#ffffff', fontWeight: 600, mb: 0.5 }}>
                    {milestone.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#e8f4fd', opacity: 0.8, fontSize: '0.875rem' }}>
                    {milestone.description}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ mb: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={milestone.progress * 100}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: '#2196F3',
                      borderRadius: 3
                    }
                  }}
                  aria-label={`Progreso del hito: ${Math.round(milestone.progress * 100)}%`}
                />
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ color: '#e8f4fd', opacity: 0.7 }}>
                  {Math.round(milestone.progress * 100)}% completado
                </Typography>
                {onCTA && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => onCTA(milestone.id)}
                    sx={{
                      borderColor: '#2196F3',
                      color: '#2196F3',
                      textTransform: 'none',
                      fontSize: '0.75rem'
                    }}
                  >
                    Continuar
                  </Button>
                )}
              </Box>
            </Box>
          ))}

          {/* Completed milestones */}
          {completedMilestones.map(milestone => (
            <Box
              key={milestone.id}
              sx={{
                p: 2,
                border: '2px solid rgba(76, 175, 80, 0.4)',
                borderRadius: 2,
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                opacity: 0.9
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CheckCircle sx={{ fontSize: 24, color: '#4CAF50' }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" sx={{ color: '#4CAF50', fontWeight: 600, mb: 0.5 }}>
                    {milestone.title}
                  </Typography>
                  {milestone.completedAt && (
                    <Typography variant="caption" sx={{ color: '#e8f4fd', opacity: 0.7 }}>
                      Completado: {new Date(milestone.completedAt).toLocaleDateString('es-ES')}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

export default Milestones;

