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
  Chip
} from '@mui/material';
import {
  CalendarToday,
  Event,
  School,
  Quiz,
  Assignment,
  Schedule
} from '@mui/icons-material';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { ScheduleItem } from '../types';

interface UpcomingScheduleProps {
  items: ScheduleItem[];
  onOpen: (id: string) => void;
  loading?: boolean;
}

/**
 * UpcomingSchedule - Usa el componente Calendar existente para resaltar próximas sesiones
 * Debajo, lista compacta de ScheduleItem
 */
const UpcomingSchedule: React.FC<UpcomingScheduleProps> = ({
  items,
  onOpen,
  loading = false
}) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'lesson':
        return <School sx={{ fontSize: 20 }} />;
      case 'exam':
        return <Quiz sx={{ fontSize: 20 }} />;
      case 'review':
        return <Assignment sx={{ fontSize: 20 }} />;
      case 'deadline':
        return <Schedule sx={{ fontSize: 20 }} />;
      default:
        return <Event sx={{ fontSize: 20 }} />;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'lesson':
        return '#2196F3';
      case 'exam':
        return '#f44336';
      case 'review':
        return '#FF9800';
      case 'deadline':
        return '#9C27B0';
      default:
        return '#e8f4fd';
    }
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateStr = date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short'
    });

    if (date.toDateString() === today.toDateString()) {
      return `Hoy, ${dateStr}`;
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return `Mañana, ${dateStr}`;
    }
    return dateStr;
  };

  // Obtener fechas con eventos para resaltar en el calendario
  const eventDates = items.map(item => item.date.getTime());

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
          <Skeleton variant="rectangular" height={300} sx={{ mb: 2, borderRadius: 1 }} />
          {[1, 2, 3].map((i) => (
            <Box key={i}>
              <Skeleton variant="rectangular" height={50} sx={{ mb: 1, borderRadius: 1 }} />
            </Box>
          ))}
        </CardContent>
      </Card>
    );
  }

  const sortedItems = [...items].sort((a, b) => 
    a.date.getTime() - b.date.getTime()
  ).slice(0, 5);

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
          Próximos Eventos
        </Typography>

        {/* Calendar */}
        <Box sx={{ mb: 3 }}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
            <Box
              sx={{
                '& .MuiPickersCalendarHeader-root': {
                  color: '#ffffff',
                  '& .MuiPickersCalendarHeader-label': {
                    color: '#ffffff',
                    fontWeight: 600
                  },
                  '& .MuiPickersArrowSwitcher-button': {
                    color: '#e8f4fd'
                  }
                },
                '& .MuiDayCalendar-weekContainer': {
                  '& .MuiPickersDay-root': {
                    color: '#e8f4fd',
                    '&.Mui-selected': {
                      backgroundColor: '#2196F3',
                      color: '#ffffff',
                      '&:hover': {
                        backgroundColor: '#1976D2'
                      }
                    },
                    '&:hover': {
                      backgroundColor: 'rgba(33, 150, 243, 0.1)'
                    }
                  }
                },
                '& .MuiPickersDay-dayOutsideMonth': {
                  color: 'rgba(232, 244, 253, 0.3)'
                },
                '& .MuiDayCalendar-weekDayLabel': {
                  color: '#e8f4fd',
                  opacity: 0.7
                }
              }}
            >
              <DateCalendar
                value={new Date()}
                readOnly
                sx={{
                  width: '100%',
                  '& .MuiPickersCalendarHeader-root': {
                    marginBottom: 1
                  }
                }}
                slots={{
                  day: (props) => {
                    const isEventDay = eventDates.includes(props.day.getTime());
                    return (
                      <Box
                        {...props}
                        sx={{
                          ...props.sx,
                          ...(isEventDay && {
                            backgroundColor: 'rgba(33, 150, 243, 0.2) !important',
                            border: '2px solid rgba(33, 150, 243, 0.5)',
                            borderRadius: '50%'
                          })
                        }}
                      />
                    );
                  }
                }}
              />
            </Box>
          </LocalizationProvider>
        </Box>

        {/* Lista compacta */}
        {sortedItems.length === 0 ? (
          <Typography variant="body2" sx={{ color: '#e8f4fd', textAlign: 'center', py: 3 }}>
            No hay eventos programados
          </Typography>
        ) : (
          <List sx={{ p: 0 }}>
            {sortedItems.map((item) => (
              <ListItem
                key={item.id}
                onClick={() => {
                  const analyticsId = `open-slot-${item.id}`;
                  if (typeof window !== 'undefined' && (window as any).analytics) {
                    (window as any).analytics.track('open-slot', { id: analyticsId });
                  } else {
                    console.info('[Analytics] open-slot', { id: analyticsId });
                  }
                  onOpen(item.id);
                }}
                aria-label={`Abrir evento: ${item.title}`}
                data-analytics-id={`open-slot-${item.id}`}
                sx={{
                  mb: 1,
                  p: 1.5,
                  borderRadius: 1,
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease-in-out',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderColor: 'rgba(255, 255, 255, 0.2)'
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <Box sx={{ color: getColor(item.type) }}>
                    {getIcon(item.type)}
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography
                      variant="subtitle2"
                      sx={{
                        color: '#ffffff',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        mb: 0.5
                      }}
                    >
                      {item.title}
                    </Typography>
                  }
                  secondary={
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          color: '#e8f4fd',
                          fontSize: '0.75rem'
                        }}
                      >
                        {formatDate(item.date)}
                        {item.time && ` • ${item.time}`}
                      </Typography>
                      {item.location && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: '#9e9e9e',
                            fontSize: '0.7rem',
                            display: 'block',
                            mt: 0.5
                          }}
                        >
                          📍 {item.location}
                        </Typography>
                      )}
                    </Box>
                  }
                />
                <Chip
                  label={item.type}
                  size="small"
                  sx={{
                    backgroundColor: 'transparent',
                    color: getColor(item.type),
                    border: `1px solid ${getColor(item.type)}`,
                    fontSize: '0.7rem',
                    height: 22,
                    textTransform: 'capitalize'
                  }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
};

export default UpcomingSchedule;
