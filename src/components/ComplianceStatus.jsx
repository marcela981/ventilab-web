import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  LinearProgress,
  Alert,
  Tooltip,
  IconButton,
  Collapse
} from '@mui/material';
import { styled } from '@mui/material/styles';
import InfoIcon from '@mui/icons-material/Info';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: '12px',
  marginBottom: theme.spacing(1),
  boxShadow: '0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)',
  transition: 'all 0.25s ease',
  '&:hover': {
    boxShadow: '0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)',
    transform: 'translateY(-1px)',
  },
}));

const ComplianceStatus = ({ 
  complianceData, 
  errorDetection, 
  autoAdjustmentEnabled, 
  lastAutoAdjustment,
  ventilationMode 
}) => {
  const [expanded, setExpanded] = React.useState(false);

  if (ventilationMode !== 'pressure') {
    return null;
  }

  // Validaciones defensivas
  if (!complianceData || !errorDetection) {
    return null;
  }

  const { 
    calculationStatus = {}, 
    compliance = 0, 
    debug = null 
  } = complianceData;
  
  const { 
    errors = [], 
    adjustmentHistory = [], 
    errorSummary = { high: 0, medium: 0, low: 0 } 
  } = errorDetection;

  const getStatusColor = () => {
    if (calculationStatus?.isCalculating) return 'warning';
    if (errors.length > 0) return 'error';
    if (calculationStatus?.lastAdjustment) return 'success';
    return 'info';
  };

  const getStatusMessage = () => {
    if (calculationStatus?.isCalculating) {
      return `Calculando compliance automática - Ciclo ${calculationStatus.currentCycle || 0}/${calculationStatus.totalCycles || 5}`;
    }
    if (errors.length > 0) {
      return `${errors.length} error(es) detectado(s) - ${errorSummary?.high || 0} crítico(s)`;
    }
    if (calculationStatus?.lastAdjustment) {
      return `Compliance actualizada: ${compliance.toFixed(5)} L/cmH2O`;
    }
    return 'Sistema de compliance listo';
  };

  return (
    <StyledPaper elevation={2}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
        <Typography variant="h6" sx={{ fontSize: '14px', fontWeight: 600 }}>
          Sistema de Compliance Automático
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <Chip
            label={autoAdjustmentEnabled ? 'ACTIVO' : 'INACTIVO'}
            color={autoAdjustmentEnabled ? 'success' : 'default'}
            size="small"
            sx={{ fontSize: '10px' }}
          />
          <Tooltip title="Mostrar/ocultar detalles">
            <IconButton 
              size="small" 
              onClick={() => setExpanded(!expanded)}
              sx={{ color: 'text.secondary' }}
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Estado principal */}
      <Alert 
        severity={getStatusColor()} 
        sx={{ mb: 1, fontSize: '12px' }}
        icon={<InfoIcon fontSize="small" />}
      >
        {getStatusMessage()}
      </Alert>

      {/* Progreso de cálculo */}
      {calculationStatus?.isCalculating && (
        <Box mb={1}>
          <Typography variant="caption" sx={{ fontSize: '11px', color: 'text.secondary' }}>
            Progreso del cálculo
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={((calculationStatus.currentCycle || 0) / (calculationStatus.totalCycles || 5)) * 100}
            sx={{ height: 4, borderRadius: 2 }}
          />
        </Box>
      )}

      {/* Detalles expandibles */}
      <Collapse in={expanded}>
        <Box>
          {/* Información de compliance actual */}
          <Box mb={2}>
            <Typography variant="subtitle2" sx={{ fontSize: '12px', fontWeight: 600, mb: 1 }}>
              Compliance Actual
            </Typography>
            <Box display="flex" alignItems="center" gap={2}>
              <Typography variant="body2" sx={{ fontSize: '11px' }}>
                <strong>{compliance.toFixed(5)} L/cmH2O</strong>
              </Typography>
              <Chip
                label={compliance < 0.015 ? 'Muy Baja' : compliance > 0.15 ? 'Muy Alta' : 'Normal'}
                color={compliance < 0.015 || compliance > 0.15 ? 'warning' : 'success'}
                size="small"
                sx={{ fontSize: '9px' }}
              />
            </Box>
          </Box>

          {/* Información del último ajuste */}
          {lastAutoAdjustment && (
            <Box mb={2}>
              <Typography variant="subtitle2" sx={{ fontSize: '12px', fontWeight: 600, mb: 1 }}>
                Último Ajuste Automático
              </Typography>
              <Box sx={{ bgcolor: 'rgba(0,0,0,0.3)', p: 1, borderRadius: 1 }}>
                <Typography variant="caption" sx={{ fontSize: '10px', display: 'block' }}>
                  <strong>Hora:</strong> {lastAutoAdjustment.timestamp.toLocaleString()}
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '10px', display: 'block' }}>
                  <strong>Error:</strong> {lastAutoAdjustment.error?.toFixed(1)}%
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '10px', display: 'block' }}>
                  <strong>Nueva C:</strong> {lastAutoAdjustment.compliance.toFixed(5)} L/cmH2O
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '10px', display: 'block' }}>
                  <strong>Razón:</strong> {lastAutoAdjustment.reason}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Errores activos */}
          {errors.length > 0 && (
            <Box mb={2}>
              <Typography variant="subtitle2" sx={{ fontSize: '12px', fontWeight: 600, mb: 1 }}>
                Errores Detectados ({errors.length})
              </Typography>
              <Box display="flex" flexDirection="column" gap={0.5}>
                {errors.map((error, index) => (
                  <Alert 
                    key={index}
                    severity={error.severity === 'high' ? 'error' : 'warning'}
                    sx={{ fontSize: '10px', py: 0.5 }}
                  >
                    <Typography variant="caption" sx={{ fontSize: '10px' }}>
                      <strong>{error.type.replace('_', ' ')}:</strong> {error.message}
                    </Typography>
                    {error.suggestedAdjustment && (
                      <Typography variant="caption" sx={{ fontSize: '9px', display: 'block', mt: 0.5 }}>
                        Ajuste sugerido: {error.suggestedAdjustment.toFixed(2)}
                      </Typography>
                    )}
                  </Alert>
                ))}
              </Box>
            </Box>
          )}

          {/* Historial de ajustes */}
          {adjustmentHistory.length > 0 && (
            <Box mb={2}>
              <Typography variant="subtitle2" sx={{ fontSize: '12px', fontWeight: 600, mb: 1 }}>
                Historial de Ajustes ({adjustmentHistory.length})
              </Typography>
              <Box sx={{ maxHeight: '120px', overflow: 'auto' }}>
                {adjustmentHistory.slice(-5).reverse().map((adjustment) => (
                  <Box 
                    key={adjustment.id}
                    sx={{ 
                      bgcolor: 'rgba(0,0,0,0.2)', 
                      p: 0.5, 
                      borderRadius: 0.5, 
                      mb: 0.5,
                      borderLeft: '2px solid',
                      borderLeftColor: 'success.main'
                    }}
                  >
                    <Typography variant="caption" sx={{ fontSize: '9px', display: 'block' }}>
                      <strong>{adjustment.timestamp.toLocaleTimeString()}:</strong> {adjustment.type}
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: '9px', display: 'block', color: 'text.secondary' }}>
                      {adjustment.oldValue.toFixed(2)} → {adjustment.newValue.toFixed(2)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* Información de debug */}
          {debug && (
            <Box>
              <Typography variant="subtitle2" sx={{ fontSize: '12px', fontWeight: 600, mb: 1 }}>
                Información de Debug
              </Typography>
              <Box sx={{ bgcolor: 'rgba(0,0,0,0.3)', p: 1, borderRadius: 1 }}>
                <Typography variant="caption" sx={{ fontSize: '10px', display: 'block' }}>
                  <strong>Ciclos procesados:</strong> {debug.cycleCount}/5
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '10px', display: 'block' }}>
                  <strong>Muestras actuales:</strong> {debug.sampleCount}/100
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '10px', display: 'block' }}>
                  <strong>Datos PIP:</strong> [{debug.pipArray.slice(-3).map(p => p.toFixed(1)).join(', ')}]
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '10px', display: 'block' }}>
                  <strong>Datos PEEP:</strong> [{debug.peepArray.slice(-3).map(p => p.toFixed(1)).join(', ')}]
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '10px', display: 'block' }}>
                  <strong>Datos Vol:</strong> [{debug.volumeArray.slice(-3).map(v => v.toFixed(0)).join(', ')}]
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      </Collapse>
    </StyledPaper>
  );
};

export default ComplianceStatus; 