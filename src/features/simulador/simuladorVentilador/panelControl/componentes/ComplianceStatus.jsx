import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';

/**
 * Muestra el estado de cumplimiento (compliance) y detección de errores.
 * Props: complianceData, errorDetection, autoAdjustmentEnabled, lastAutoAdjustment, ventilationMode
 */
function ComplianceStatus({
  complianceData,
  errorDetection,
  autoAdjustmentEnabled,
  lastAutoAdjustment,
  ventilationMode,
}) {
  if (!complianceData && !errorDetection) return null;

  const hasIssues = errorDetection?.hasError || false;
  const message = errorDetection?.message || (complianceData?.message ?? '');

  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 1,
        border: '1px solid',
        borderColor: hasIssues ? 'error.main' : 'divider',
        bgcolor: hasIssues ? 'action.hover' : 'background.paper',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        {hasIssues ? (
          <WarningIcon color="error" fontSize="small" />
        ) : (
          <CheckCircleIcon color="success" fontSize="small" />
        )}
        <Typography variant="body2" color={hasIssues ? 'error.main' : 'text.secondary'}>
          {message || (hasIssues ? 'Revisar parámetros' : 'Cumplimiento OK')}
        </Typography>
        {autoAdjustmentEnabled && (
          <Chip label="Auto-ajuste" size="small" variant="outlined" />
        )}
      </Box>
      {lastAutoAdjustment && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          Último ajuste: {typeof lastAutoAdjustment === 'string' ? lastAutoAdjustment : 'reciente'}
        </Typography>
      )}
    </Box>
  );
}

export default ComplianceStatus;
