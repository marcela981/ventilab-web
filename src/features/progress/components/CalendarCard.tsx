import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { CalendarMonth } from '@mui/icons-material';

interface CalendarEntry {
  date: string;
  hasActivity: boolean;
  lessonsCompleted: number;
}

interface CalendarCardProps {
  calendar: CalendarEntry[];
}

/**
 * CalendarCard - Tarjeta compacta de calendario (mini month view)
 */
export const CalendarCard: React.FC<CalendarCardProps> = ({ calendar }) => {
  // Get last 7 days for compact view
  const last7Days = calendar.slice(-7);

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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <CalendarMonth sx={{ fontSize: 24, color: '#2196F3' }} />
          <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600 }}>
            Actividad Reciente
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between' }}>
          {last7Days.map((entry, index) => {
            const date = new Date(entry.date);
            const dayName = date.toLocaleDateString('es-ES', { weekday: 'short' }).charAt(0).toUpperCase();
            const dayNumber = date.getDate();

            return (
              <Box
                key={index}
                sx={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0.5,
                  p: 1,
                  borderRadius: 1,
                  backgroundColor: entry.hasActivity
                    ? 'rgba(33, 150, 243, 0.2)'
                    : 'rgba(255, 255, 255, 0.05)',
                  border: entry.hasActivity
                    ? '1px solid rgba(33, 150, 243, 0.3)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  transition: 'all 0.2s ease'
                }}
                title={`${date.toLocaleDateString('es-ES')}: ${entry.lessonsCompleted} lecciones`}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: entry.hasActivity ? '#2196F3' : '#9e9e9e',
                    fontWeight: 600,
                    fontSize: '0.7rem'
                  }}
                >
                  {dayName}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: entry.hasActivity ? '#ffffff' : '#9e9e9e',
                    fontWeight: 700,
                    fontSize: '0.875rem'
                  }}
                >
                  {dayNumber}
                </Typography>
                {entry.hasActivity && (
                  <Box
                    sx={{
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      backgroundColor: '#2196F3'
                    }}
                  />
                )}
              </Box>
            );
          })}
        </Box>

        <Typography variant="caption" sx={{ color: '#e8f4fd', opacity: 0.6, mt: 1.5, display: 'block' }}>
          Últimos 7 días
        </Typography>
      </CardContent>
    </Card>
  );
};

export default CalendarCard;

