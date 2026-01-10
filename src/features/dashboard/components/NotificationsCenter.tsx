import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Skeleton,
  Chip,
  IconButton
} from '@mui/material';
import {
  Notifications,
  Info,
  Warning,
  CheckCircle,
  Campaign,
  Close
} from '@mui/icons-material';
import { NotificationItem } from '../types';

interface NotificationsCenterProps {
  items: NotificationItem[];
  onRead: (id: string) => void;
  loading?: boolean;
}

/**
 * NotificationsCenter - Lista de notificaciones con unread resaltado
 */
const NotificationsCenter: React.FC<NotificationsCenterProps> = ({
  items,
  onRead,
  loading = false
}) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'info':
        return <Info sx={{ fontSize: 20 }} />;
      case 'warning':
        return <Warning sx={{ fontSize: 20 }} />;
      case 'success':
        return <CheckCircle sx={{ fontSize: 20 }} />;
      case 'announcement':
        return <Campaign sx={{ fontSize: 20 }} />;
      default:
        return <Notifications sx={{ fontSize: 20 }} />;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'info':
        return '#2196F3';
      case 'warning':
        return '#FF9800';
      case 'success':
        return '#4CAF50';
      case 'announcement':
        return '#9C27B0';
      default:
        return '#e8f4fd';
    }
  };

  const formatTime = (timestamp: Date) => {
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
          {[1, 2, 3].map((i) => (
            <Box key={i} sx={{ mb: 2 }}>
              <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 1 }} />
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
            <Notifications sx={{ fontSize: 20 }} />
            Notificaciones
          </Typography>
          <Typography variant="body2" sx={{ color: '#e8f4fd', textAlign: 'center', py: 3 }}>
            No hay notificaciones
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const unreadCount = items.filter(item => !item.read).length;

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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography
            variant="h6"
            sx={{
              color: '#ffffff',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            <Notifications sx={{ fontSize: 20 }} />
            Notificaciones
            {unreadCount > 0 && (
              <Chip
                label={unreadCount}
                size="small"
                sx={{
                  backgroundColor: '#f44336',
                  color: '#ffffff',
                  fontSize: '0.7rem',
                  height: 20,
                  minWidth: 20
                }}
              />
            )}
          </Typography>
        </Box>

        <List sx={{ p: 0 }}>
          {items.map((item) => (
            <ListItem
              key={item.id}
              sx={{
                mb: 1.5,
                p: 2,
                borderRadius: 1,
                backgroundColor: item.read ? 'rgba(255, 255, 255, 0.03)' : 'rgba(33, 150, 243, 0.1)',
                border: item.read ? '1px solid rgba(255, 255, 255, 0.1)' : '2px solid rgba(33, 150, 243, 0.3)',
                transition: 'all 0.25s ease-in-out',
                '&:hover': {
                  backgroundColor: item.read ? 'rgba(255, 255, 255, 0.05)' : 'rgba(33, 150, 243, 0.15)'
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Box
                  sx={{
                    color: getColor(item.type)
                  }}
                >
                  {getIcon(item.type)}
                </Box>
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography
                    variant="subtitle2"
                    component="span"
                    sx={{
                      color: '#ffffff',
                      fontWeight: item.read ? 500 : 700,
                      fontSize: '0.9rem',
                      mb: 0.5,
                      display: 'block'
                    }}
                  >
                    {item.title}
                  </Typography>
                }
                secondary={
                  <>
                    <Typography
                      variant="body2"
                      component="span"
                      sx={{
                        color: '#e8f4fd',
                        fontSize: '0.875rem',
                        mb: 0.5,
                        display: 'block'
                      }}
                    >
                      {item.message}
                    </Typography>
                    <Typography
                      variant="caption"
                      component="span"
                      sx={{
                        color: '#9e9e9e',
                        fontSize: '0.7rem',
                        display: 'block'
                      }}
                    >
                      {formatTime(item.timestamp)}
                    </Typography>
                  </>
                }
              />
              <IconButton
                size="small"
                onClick={() => {
                  const analyticsId = `notif-read-${item.id}`;
                  if (typeof window !== 'undefined' && (window as any).analytics) {
                    (window as any).analytics.track('notif-read', { id: analyticsId });
                  } else {
                    console.info('[Analytics] notif-read', { id: analyticsId });
                  }
                  onRead(item.id);
                }}
                aria-label="Marcar como leída"
                data-analytics-id={`notif-read-${item.id}`}
                sx={{
                  color: '#e8f4fd',
                  '&:hover': {
                    color: '#ffffff',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                <Close sx={{ fontSize: 16 }} />
              </IconButton>
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
};

export default NotificationsCenter;
