import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  useTheme
} from '@mui/material';
import {
  CalendarToday,
  Event
} from '@mui/icons-material';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { StudyEta } from '../types';

interface StudyCalendarProps {
  eta: StudyEta;
}

const StudyCalendar: React.FC<StudyCalendarProps> = ({ eta }) => {
  const theme = useTheme();

  // Valor seguro para eta
  const safeEta = eta || {
    completionDate: new Date()
  };

  // Formatear fecha de finalización
  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const completionDate = typeof safeEta.completionDate === 'string' 
    ? new Date(safeEta.completionDate) 
    : safeEta.completionDate;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Minicalendario */}
      <Card
        sx={{
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 2,
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          transition: 'all 0.3s ease'
        }}
      >
        <CardContent sx={{ p: 2 }}>
          <Typography
            variant="subtitle1"
            sx={{
              color: '#ffffff',
              fontWeight: 600,
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              fontSize: '0.95rem'
            }}
          >
            <CalendarToday sx={{ fontSize: 20 }} />
            Calendario
          </Typography>

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
              />
            </Box>
          </LocalizationProvider>
        </CardContent>
      </Card>

      {/* Tarjeta pequeña con ETA */}
      <Card
        sx={{
          border: '1px solid rgba(33, 150, 243, 0.3)',
          borderRadius: 2,
          backgroundColor: 'rgba(33, 150, 243, 0.1)',
          transition: 'all 0.3s ease',
          '&:hover': {
            borderColor: 'rgba(33, 150, 243, 0.5)',
            backgroundColor: 'rgba(33, 150, 243, 0.15)'
          }
        }}
      >
        <CardContent sx={{ p: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <Event 
              sx={{ 
                fontSize: 20, 
                color: '#2196F3',
                mt: 0.25,
                flexShrink: 0
              }} 
            />
            <Box sx={{ flex: 1 }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#ffffff',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  lineHeight: 1.5
                }}
              >
                Si mantienes tu ritmo, terminas el Módulo el{' '}
                <Typography
                  component="span"
                  sx={{
                    color: '#2196F3',
                    fontWeight: 700,
                    fontSize: '0.875rem'
                  }}
                >
                  {formatDate(completionDate)}
                </Typography>
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default StudyCalendar;
