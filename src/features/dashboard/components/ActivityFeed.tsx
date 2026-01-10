import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  Skeleton,
  Chip
} from '@mui/material';
import {
  Timeline,
  CheckCircle,
  EmojiEvents,
  LocalFireDepartment,
  School,
  TrendingUp
} from '@mui/icons-material';
import { ActivityItem } from '../types';

interface ActivityFeedProps {
  items: ActivityItem[];
  loading?: boolean;
}

/**
 * ActivityFeed - Feed cronológico con icono, acción, hora relativa y xpDelta si aplica
 */
const ActivityFeed: React.FC<ActivityFeedProps> = ({
  items,
  loading = false
}) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'lesson_completed':
        return <CheckCircle sx={{ fontSize: 20 }} />;
      case 'module_completed':
        return <School sx={{ fontSize: 20 }} />;
      case 'achievement_unlocked':
        return <EmojiEvents sx={{ fontSize: 20 }} />;
      case 'streak_milestone':
        return <LocalFireDepartment sx={{ fontSize: 20 }} />;
      default:
        return <Timeline sx={{ fontSize: 20 }} />;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'lesson_completed':
        return '#4CAF50';
      case 'module_completed':
        return '#2196F3';
      case 'achievement_unlocked':
        return '#FFD700';
      case 'streak_milestone':
        return '#FF9800';
      default:
        return '#e8f4fd';
    }
  };

  const formatRelativeTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes} min`;
    if (hours < 24) return `Hace ${hours} h`;
    if (days < 7) return `Hace ${days} d`;
    return timestamp.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
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
          <Skeleton variant="text" width="40%" height={30} sx={{ mb: 2 }} />
          {[1, 2, 3, 4].map((i) => (
            <Box key={i} sx={{ mb: 2, display: 'flex', gap: 2 }}>
              <Skeleton variant="circular" width={40} height={40} />
              <Skeleton variant="text" width="70%" height={40} />
            </Box>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!items || items.length === 0) {
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
            <Timeline sx={{ fontSize: 20 }} />
            Actividad Reciente
          </Typography>
          <Typography variant="body2" sx={{ color: '#e8f4fd', textAlign: 'center', py: 3 }}>
            No hay actividad reciente
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
          <Timeline sx={{ fontSize: 20 }} />
          Actividad Reciente
        </Typography>

        <List sx={{ p: 0 }}>
          {items.map((item) => (
            <ListItem
              key={item.id}
              sx={{
                mb: 2,
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
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Box
                  sx={{
                    color: getColor(item.type)
                  }}
                >
                  {item.icon ? <span>{item.icon}</span> : getIcon(item.type)}
                </Box>
              </ListItemIcon>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="subtitle2"
                  component="div"
                  sx={{
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    mb: 0.5
                  }}
                >
                  {item.title}
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.5,
                    mt: 0.5
                  }}
                >
                  <Typography
                    variant="body2"
                    component="div"
                    sx={{
                      color: '#e8f4fd',
                      fontSize: '0.875rem'
                    }}
                  >
                    {item.description}
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 1,
                      alignItems: 'center'
                    }}
                  >
                    <Typography
                      variant="caption"
                      component="span"
                      sx={{
                        color: '#9e9e9e',
                        fontSize: '0.7rem'
                      }}
                    >
                      {formatRelativeTime(item.timestamp)}
                    </Typography>
                    {item.xpDelta !== undefined && item.xpDelta !== 0 && (
                      <Chip
                        icon={<TrendingUp sx={{ fontSize: 14 }} />}
                        label={`${item.xpDelta > 0 ? '+' : ''}${item.xpDelta} XP`}
                        size="small"
                        sx={{
                          backgroundColor: item.xpDelta > 0 ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)',
                          color: item.xpDelta > 0 ? '#4CAF50' : '#f44336',
                          border: `1px solid ${item.xpDelta > 0 ? 'rgba(76, 175, 80, 0.5)' : 'rgba(244, 67, 54, 0.5)'}`,
                          fontSize: '0.7rem',
                          height: 20
                        }}
                      />
                    )}
                  </Box>
                </Box>
              </Box>
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
};

export default ActivityFeed;
