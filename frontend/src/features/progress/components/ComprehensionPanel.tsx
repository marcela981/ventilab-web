import React, { useMemo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Chip,
  Tooltip,
  useTheme
} from '@mui/material';
import {
  TrendingDown,
  School,
  Refresh
} from '@mui/icons-material';
import { TrendInsight } from '../types';
import { trackEvent } from '../utils/analytics';

interface ComprehensionPanelProps {
  trends: TrendInsight[];
  onReinforce: (conceptId: string) => void;
}

/**
 * ComprehensionPanel - Panel de comprensión con tendencias de errores
 * 
 * Muestra:
 * - Lista de TrendInsight ordenada por incorrectRatePct desc
 * - Cada ítem con botón "Reforzar"
 */
const ComprehensionPanel: React.FC<ComprehensionPanelProps> = ({
  trends,
  onReinforce
}) => {
  const theme = useTheme();

  // Ordenar tendencias por incorrectRatePct descendente
  const sortedTrends = useMemo(() => {
    return [...trends].sort((a, b) => b.incorrectRatePct - a.incorrectRatePct);
  }, [trends]);

  // Obtener color según tasa de error
  const getErrorRateColor = (rate: number): string => {
    if (rate >= 70) return '#F44336'; // Rojo - Muy alto
    if (rate >= 50) return '#FF9800'; // Naranja - Alto
    if (rate >= 30) return '#FFC107'; // Ámbar - Medio
    return '#9e9e9e'; // Gris - Bajo
  };

  // Obtener severidad del error
  const getSeverityLabel = (rate: number): string => {
    if (rate >= 70) return 'Crítico';
    if (rate >= 50) return 'Alto';
    if (rate >= 30) return 'Moderado';
    return 'Bajo';
  };

  return (
    <Card
      sx={{
        border: '1px solid rgba(255, 152, 0, 0.3)',
        borderRadius: 2,
        backgroundColor: 'rgba(255, 152, 0, 0.05)',
        transition: 'all 0.3s ease'
      }}
    >
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
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
            <TrendingDown sx={{ fontSize: 24, color: '#FF9800' }} />
            Tendencias de Comprensión
          </Typography>
          <Chip
            label={`${trends.length} conceptos`}
            size="small"
            sx={{
              backgroundColor: 'rgba(255, 152, 0, 0.2)',
              color: '#FF9800',
              border: '1px solid rgba(255, 152, 0, 0.3)',
              fontWeight: 600,
              height: 24,
              fontSize: '0.7rem'
            }}
          />
        </Box>

        {/* Lista de tendencias ordenadas */}
        {sortedTrends.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {sortedTrends.map((trend) => {
              const errorColor = getErrorRateColor(trend.incorrectRatePct);
              const severity = getSeverityLabel(trend.incorrectRatePct);

              return (
                <Box
                  key={trend.conceptId}
                  sx={{
                    p: 2,
                    border: `1px solid ${errorColor}40`,
                    borderRadius: 2,
                    backgroundColor: `${errorColor}10`,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: `${errorColor}15`,
                      transform: 'translateX(4px)',
                      borderColor: `${errorColor}60`
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    {/* Información del concepto */}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" sx={{ color: '#ffffff', fontWeight: 600, mb: 0.75 }}>
                        {trend.conceptName}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, flexWrap: 'wrap' }}>
                        {/* Tasa de error */}
                        <Chip
                          label={`${trend.incorrectRatePct.toFixed(1)}% error`}
                          size="small"
                          sx={{
                            backgroundColor: `${errorColor}20`,
                            color: errorColor,
                            border: `1px solid ${errorColor}40`,
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            height: 24
                          }}
                        />
                        
                        {/* Severidad */}
                        <Chip
                          label={severity}
                          size="small"
                          sx={{
                            backgroundColor: `${errorColor}15`,
                            color: errorColor,
                            border: `1px solid ${errorColor}30`,
                            fontWeight: 600,
                            fontSize: '0.7rem',
                            height: 22
                          }}
                        />
                        
                        {/* Intentos si está disponible */}
                        {trend.attempts !== undefined && (
                          <Typography variant="caption" sx={{ color: '#e8f4fd', opacity: 0.7, fontSize: '0.75rem' }}>
                            {trend.attempts} intento{trend.attempts !== 1 ? 's' : ''}
                          </Typography>
                        )}
                      </Box>

                      {/* Fecha del último intento */}
                      {trend.lastAttemptDate && (
                        <Typography variant="caption" sx={{ color: '#e8f4fd', opacity: 0.6, fontSize: '0.7rem' }}>
                          Último intento: {new Date(trend.lastAttemptDate).toLocaleDateString()}
                        </Typography>
                      )}
                    </Box>

                    {/* Botón Reforzar */}
                    <Tooltip title={`Revisa ejercicios específicos de ${trend.conceptName} para mejorar tu comprensión.`} arrow>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<School sx={{ fontSize: 16 }} />}
                        onClick={() => {
                          trackEvent('comprehension_reinforce_click', {
                            conceptId: trend.conceptId,
                            conceptName: trend.conceptName,
                            incorrectRatePct: trend.incorrectRatePct,
                            attempts: trend.attempts,
                            severity: getSeverityLabel(trend.incorrectRatePct)
                          });
                          onReinforce(trend.conceptId);
                        }}
                        data-analytics-id={`comprehension-reinforce-${trend.conceptId}`}
                        aria-label={`Reforzar concepto: ${trend.conceptName} (tasa de error: ${trend.incorrectRatePct.toFixed(1)}%)`}
                        sx={{
                        backgroundColor: '#FF9800',
                        color: '#ffffff',
                        fontWeight: 600,
                        textTransform: 'none',
                        px: 2,
                        py: 0.75,
                        borderRadius: 1.5,
                        fontSize: '0.75rem',
                        minWidth: 'auto',
                        ml: 2,
                        '&:hover': {
                          backgroundColor: '#F57C00',
                          transform: 'scale(1.05)'
                        }
                      }}
                      >
                        Reforzar
                      </Button>
                    </Tooltip>
                  </Box>

                  {/* Barra visual de tasa de error */}
                  <Box sx={{ mt: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Typography variant="caption" sx={{ color: '#e8f4fd', fontWeight: 600, fontSize: '0.7rem' }}>
                        Tasa de error
                      </Typography>
                      <Typography variant="caption" sx={{ color: errorColor, fontWeight: 700, fontSize: '0.7rem' }}>
                        {trend.incorrectRatePct.toFixed(1)}%
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        width: '100%',
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          height: '100%',
                          width: `${Math.min(100, trend.incorrectRatePct)}%`,
                          backgroundColor: errorColor,
                          borderRadius: 3,
                          transition: 'width 0.4s ease'
                        }}
                      />
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        ) : (
          <Box
            sx={{
              p: 4,
              textAlign: 'center',
              backgroundColor: 'rgba(76, 175, 80, 0.1)',
              borderRadius: 2,
              border: '1px solid rgba(76, 175, 80, 0.3)'
            }}
          >
            <School sx={{ fontSize: 48, color: '#4CAF50', mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" sx={{ color: '#4CAF50', fontWeight: 600, mb: 1 }}>
              ¡Buen trabajo!
            </Typography>
            <Typography variant="body2" sx={{ color: '#e8f4fd', opacity: 0.8, lineHeight: 1.6 }}>
              No hay conceptos que requieran refuerzo en este momento. Sigue así.
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ComprehensionPanel;
