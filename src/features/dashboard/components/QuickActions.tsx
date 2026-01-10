import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Button,
  Skeleton,
  Badge
} from '@mui/material';
import {
  PlayArrow,
  Science,
  Refresh,
  EmojiEvents
} from '@mui/icons-material';
import { QuickAction } from '../types';

interface QuickActionsProps {
  actions: QuickAction[];
  onAction: (id: QuickAction['id']) => void;
  loading?: boolean;
}

/**
 * QuickActions - Grid 2x2 de acciones rápidas con icono + label + subtitle
 */
const QuickActions: React.FC<QuickActionsProps> = ({
  actions,
  onAction,
  loading = false
}) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'play':
        return <PlayArrow />;
      case 'science':
        return <Science />;
      case 'refresh':
        return <Refresh />;
      case 'trophy':
        return <EmojiEvents />;
      default:
        return <PlayArrow />;
    }
  };

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
          <Grid container spacing={2}>
            {[1, 2, 3, 4].map((i) => (
              <Grid item xs={6} key={i}>
                <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 1 }} />
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    );
  }

  if (!actions || actions.length === 0) {
    return (
      <Card
        sx={{
          backgroundColor: 'transparent',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 2
        }}
      >
        <CardContent>
          <Typography variant="body2" sx={{ color: '#e8f4fd', textAlign: 'center', py: 2 }}>
            No hay acciones disponibles
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
        borderRadius: 2
      }}
    >
      <CardContent sx={{ p: 2 }}>
        <Grid container spacing={2}>
          {actions.map((action) => (
            <Grid item xs={6} key={action.id}>
              <Badge
                badgeContent={action.badge}
                color="error"
                invisible={!action.badge}
              >
                <Button
                  variant="contained"
                  fullWidth
                  disabled={action.disabled}
                  startIcon={getIcon(action.icon)}
                  onClick={() => {
                    const analyticsId = `qa-${action.id}`;
                    if (typeof window !== 'undefined' && (window as any).analytics) {
                      (window as any).analytics.track('quick-action', { id: analyticsId });
                    } else {
                      console.info('[Analytics] quick-action', { id: analyticsId });
                    }
                    onAction(action.id);
                  }}
                  aria-label={`${action.label}${action.subtitle ? ` - ${action.subtitle}` : ''}`}
                  data-analytics-id={`qa-${action.id}`}
                  sx={{
                    py: 2,
                    px: 2,
                    backgroundColor: 'rgba(33, 150, 243, 0.3)',
                    color: '#ffffff',
                    border: '1px solid rgba(33, 150, 243, 0.5)',
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    transition: 'all 0.25s ease-in-out',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 0.5,
                    minHeight: 100,
                    '&:hover': {
                      backgroundColor: 'rgba(33, 150, 243, 0.5)',
                      borderColor: 'rgba(33, 150, 243, 0.7)',
                      transform: 'translateY(-2px)'
                    },
                    '&.Mui-disabled': {
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      color: 'rgba(255, 255, 255, 0.3)'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getIcon(action.icon)}
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {action.label}
                    </Typography>
                  </Box>
                  {action.subtitle && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: '0.7rem',
                        mt: 0.5
                      }}
                    >
                      {action.subtitle}
                    </Typography>
                  )}
                </Button>
              </Badge>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};

export default QuickActions;
