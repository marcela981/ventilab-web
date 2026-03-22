import React from 'react';
import { Box, Typography, IconButton, Collapse, Alert, AlertTitle } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';

/**
 * Muestra alertas de validación (errores críticos y advertencias).
 * Props: validationState { criticalErrors: [], warnings: [] }, onClose, show, compact?
 */
function ValidationAlerts({ validationState, onClose, show, compact = false }) {
  if (!validationState || !show) return null;

  const { criticalErrors = [], warnings = [] } = validationState;
  const hasAny = criticalErrors.length > 0 || warnings.length > 0;
  if (!hasAny) return null;

  const content = (
    <Box sx={{ mb: 1 }}>
      {criticalErrors.length > 0 && (
        <Alert
          severity="error"
          sx={{ mb: 1 }}
          action={
            onClose && (
              <IconButton size="small" onClick={onClose} aria-label="Cerrar">
                <CloseIcon fontSize="small" />
              </IconButton>
            )
          }
        >
          {!compact && <AlertTitle>Errores críticos</AlertTitle>}
          {criticalErrors.map((msg, i) => (
            <Typography key={i} variant="body2" component="div">
              • {msg}
            </Typography>
          ))}
        </Alert>
      )}
      {warnings.length > 0 && (
        <Alert
          severity="warning"
          action={
            onClose && !compact && (
              <IconButton size="small" onClick={onClose} aria-label="Cerrar">
                <CloseIcon fontSize="small" />
              </IconButton>
            )
          }
        >
          {!compact && <AlertTitle>Advertencias</AlertTitle>}
          {warnings.map((msg, i) => (
            <Typography key={i} variant="body2" component="div">
              • {msg}
            </Typography>
          ))}
        </Alert>
      )}
    </Box>
  );

  if (compact) {
    return (
      <Collapse in={show}>
        <Box sx={{ position: 'relative' }}>
          {content}
        </Box>
      </Collapse>
    );
  }

  return content;
}

export default ValidationAlerts;
