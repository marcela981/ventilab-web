import React, { useState } from 'react';
import { Box, Typography, Chip, LinearProgress, Alert, IconButton } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

const ComplianceIndicator = ({ 
  complianceData, 
  autoEnabled, 
  lastAdjustment,
  ventilationMode 
}) => {
  const [expanded, setExpanded] = useState(false);

  if (ventilationMode !== 'pressure') return null;

  const { compliance, status, errors, hasErrors, hasHighSeverityErrors } = complianceData;

  const getStatusColor = () => {
    if (status.isCalculating) return 'warning';
    if (hasHighSeverityErrors) return 'error';
    if (status.lastAdjustment) return 'success';
    return 'info';
  };

  const getStatusText = () => {
    if (status.isCalculating) return `Calculando ${status.progress}/5`;
    if (hasErrors) return `${errors.length} error(es)`;
    if (status.lastAdjustment) return 'Actualizada';
    return 'Listo';
  };

  return (
    <Box sx={{ 
      bgcolor: 'rgba(31, 31, 31, 0.8)', 
      p: 1.5, 
      borderRadius: 1,
      border: '1px solid rgba(255,255,255,0.1)'
    }}>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
        <Typography variant="subtitle2" sx={{ fontSize: '12px', fontWeight: 600 }}>
          Compliance Automática
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <Chip
            label={autoEnabled ? 'ON' : 'OFF'}
            color={autoEnabled ? 'success' : 'default'}
            size="small"
            sx={{ fontSize: '8px', height: 16 }}
          />
          <IconButton 
            size="small" 
            onClick={() => setExpanded(!expanded)}
            sx={{ p: 0.25 }}
          >
            {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
        </Box>
      </Box>

      {/* Status */}
      <Alert 
        severity={getStatusColor()} 
        sx={{ mb: 1, py: 0.5, fontSize: '10px' }}
      >
        {getStatusText()} - C: {compliance.toFixed(5)} L/cmH₂O
      </Alert>

      {/* Progress */}
      {status.isCalculating && (
        <LinearProgress 
          variant="determinate" 
          value={(status.progress / 5) * 100}
          sx={{ height: 3, borderRadius: 1, mb: 1 }}
        />
      )}

      {/* Detalles expandidos */}
      {expanded && (
        <Box sx={{ fontSize: '9px', color: 'text.secondary' }}>
          {/* Último ajuste */}
          {lastAdjustment && (
            <Box sx={{ bgcolor: 'rgba(0,0,0,0.3)', p: 0.5, borderRadius: 0.5, mb: 0.5 }}>
              <Typography variant="caption" sx={{ fontSize: '9px' }}>
                <strong>Último:</strong> {lastAdjustment.timestamp.toLocaleTimeString()}
              </Typography>
              <br />
              <Typography variant="caption" sx={{ fontSize: '9px' }}>
                <strong>Error:</strong> {lastAdjustment.error?.toFixed(1)}%
              </Typography>
            </Box>
          )}

          {/* Errores activos */}
          {errors.map((error, i) => (
            <Box key={i} sx={{ 
              bgcolor: error.severity === 'high' ? 'rgba(244,67,54,0.1)' : 'rgba(255,152,0,0.1)', 
              p: 0.25, 
              borderRadius: 0.25, 
              mb: 0.25 
            }}>
              <Typography variant="caption" sx={{ fontSize: '8px' }}>
                {error.type}: {error.error.toFixed(1)}%
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default ComplianceIndicator; 