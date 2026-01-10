import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Skeleton
} from '@mui/material';
import {
  CalendarToday
} from '@mui/icons-material';
import { WeeklyGoal } from '../types';

interface WeeklyPlanProps {
  goals: WeeklyGoal[];
  loading?: boolean;
}

/**
 * WeeklyPlan - Lista de 3-5 objetivos con barra de progreso y etiqueta current/target unit
 */
const WeeklyPlan: React.FC<WeeklyPlanProps> = ({
  goals,
  loading = false
}) => {
  if (loading) {
    return (
      <Card
        sx={{
          backgroundColor: 'transparent',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 2
        }}
      >
        <CardContent>
          <Skeleton variant="text" width="40%" height={30} sx={{ mb: 3 }} />
          {[1, 2, 3].map((i) => (
            <Box key={i} sx={{ mb: 2 }}>
              <Skeleton variant="text" width="60%" height={20} sx={{ mb: 1 }} />
              <Skeleton variant="rectangular" height={8} sx={{ borderRadius: 1 }} />
            </Box>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!goals || goals.length === 0) {
    return (
      <Card
        sx={{
          backgroundColor: 'transparent',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 2
        }}
      >
        <CardContent>
          <Typography
            variant="h6"
            sx={{
              color: '#ffffff',
              fontWeight: 600,
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            <CalendarToday sx={{ fontSize: 20 }} />
            Plan Semanal
          </Typography>
          <Typography variant="body2" sx={{ color: '#e8f4fd', textAlign: 'center', py: 3 }}>
            No hay objetivos esta semana
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        backgroundColor: 'transparent',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 2,
        height: '100%'
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Typography
          variant="h6"
          sx={{
            color: '#ffffff',
            fontWeight: 600,
            mb: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <CalendarToday sx={{ fontSize: 20 }} />
          Plan Semanal
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {goals.map((goal) => {
            const isCompleted = goal.progress >= 100;
            
            return (
              <Box
                key={goal.id}
                sx={{
                  p: 2,
                  borderRadius: 1,
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  transition: 'all 0.25s ease-in-out',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderColor: 'rgba(255, 255, 255, 0.2)'
                  }
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      color: '#ffffff',
                      fontWeight: 600,
                      fontSize: '0.95rem'
                    }}
                  >
                    {goal.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#e8f4fd',
                      fontSize: '0.875rem'
                    }}
                  >
                    {goal.current} / {goal.target} {goal.unit}
                  </Typography>
                </Box>

                <LinearProgress
                  variant="determinate"
                  value={Math.min(goal.progress, 100)}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: isCompleted ? '#4CAF50' : '#2196F3',
                      borderRadius: 3
                    }
                  }}
                />
              </Box>
            );
          })}
        </Box>
      </CardContent>
    </Card>
  );
};

export default WeeklyPlan;
