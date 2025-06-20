import React from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Collapse,
  IconButton,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Error as ErrorIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  Info as InfoIcon
} from '@mui/icons-material';

const ValidationAlerts = ({ 
  validationState, 
  onClose, 
  show = true,
  compact = false 
}) => {
  const { criticalErrors, warnings, severity, patientType } = validationState;

  if (!show || (criticalErrors.length === 0 && warnings.length === 0)) {
    return null;
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'warning':
        return 'warning';
      case 'safe':
        return 'success';
      default:
        return 'info';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <ErrorIcon />;
      case 'warning':
        return <WarningIcon />;
      case 'safe':
        return <CheckCircleIcon />;
      default:
        return <InfoIcon />;
    }
  };

  const getPatientTypeColor = (type) => {
    switch (type) {
      case 'pediatric':
        return 'primary';
      case 'adult':
        return 'secondary';
      default:
        return 'default';
    }
  };

  if (compact) {
    return (
      <Box sx={{ position: 'fixed', top: 20, left: 20, zIndex: 1000 }}>
        <Collapse in={show}>
          <Alert
            severity={getSeverityColor(severity)}
            icon={getSeverityIcon(severity)}
            action={
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={onClose}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            }
            sx={{
              maxWidth: 400,
              boxShadow: 3,
              '& .MuiAlert-message': {
                width: '100%'
              }
            }}
          >
            <AlertTitle>
              {severity === 'critical' ? 'Errores Críticos' : 
               severity === 'warning' ? 'Advertencias' : 'Configuración Segura'}
            </AlertTitle>
            
            {criticalErrors.length > 0 && (
              <Box mb={1}>
                <Typography variant="body2" color="error" fontWeight="bold">
                  Errores críticos ({criticalErrors.length}):
                </Typography>
                <List dense sx={{ py: 0 }}>
                  {criticalErrors.slice(0, 2).map((error, index) => (
                    <ListItem key={index} sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 24 }}>
                        <ErrorIcon fontSize="small" color="error" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={error} 
                        primaryTypographyProps={{ fontSize: '0.75rem' }}
                      />
                    </ListItem>
                  ))}
                  {criticalErrors.length > 2 && (
                    <ListItem sx={{ py: 0.5 }}>
                      <ListItemText 
                        primary={`... y ${criticalErrors.length - 2} errores más`}
                        primaryTypographyProps={{ fontSize: '0.75rem', fontStyle: 'italic' }}
                      />
                    </ListItem>
                  )}
                </List>
              </Box>
            )}

            {warnings.length > 0 && (
              <Box>
                <Typography variant="body2" color="warning.main" fontWeight="bold">
                  Advertencias ({warnings.length}):
                </Typography>
                <List dense sx={{ py: 0 }}>
                  {warnings.slice(0, 2).map((warning, index) => (
                    <ListItem key={index} sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 24 }}>
                        <WarningIcon fontSize="small" color="warning" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={warning} 
                        primaryTypographyProps={{ fontSize: '0.75rem' }}
                      />
                    </ListItem>
                  ))}
                  {warnings.length > 2 && (
                    <ListItem sx={{ py: 0.5 }}>
                      <ListItemText 
                        primary={`... y ${warnings.length - 2} advertencias más`}
                        primaryTypographyProps={{ fontSize: '0.75rem', fontStyle: 'italic' }}
                      />
                    </ListItem>
                  )}
                </List>
              </Box>
            )}

            {patientType !== 'general' && (
              <Box mt={1}>
                <Chip
                  label={`Paciente: ${patientType === 'pediatric' ? 'Pediátrico' : 'Adulto'}`}
                  color={getPatientTypeColor(patientType)}
                  size="small"
                  variant="outlined"
                />
              </Box>
            )}
          </Alert>
        </Collapse>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 2 }}>
      <Collapse in={show}>
        {criticalErrors.length > 0 && (
          <Alert
            severity="error"
            icon={<ErrorIcon />}
            action={
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={onClose}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            }
            sx={{ mb: 1 }}
          >
            <AlertTitle>Errores Críticos - Configuración No Segura</AlertTitle>
            <Typography variant="body2">
              Los siguientes errores impiden el envío de la configuración:
            </Typography>
            <List dense sx={{ mt: 1 }}>
              {criticalErrors.map((error, index) => (
                <ListItem key={index} sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 24 }}>
                    <ErrorIcon fontSize="small" color="error" />
                  </ListItemIcon>
                  <ListItemText primary={error} />
                </ListItem>
              ))}
            </List>
          </Alert>
        )}

        {warnings.length > 0 && (
          <Alert
            severity="warning"
            icon={<WarningIcon />}
            action={
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={onClose}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            }
          >
            <AlertTitle>Advertencias - Revisar Configuración</AlertTitle>
            <Typography variant="body2">
              Los siguientes parámetros están fuera del rango recomendado:
            </Typography>
            <List dense sx={{ mt: 1 }}>
              {warnings.map((warning, index) => (
                <ListItem key={index} sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 24 }}>
                    <WarningIcon fontSize="small" color="warning" />
                  </ListItemIcon>
                  <ListItemText primary={warning} />
                </ListItem>
              ))}
            </List>
            
            {patientType !== 'general' && (
              <Box mt={1}>
                <Chip
                  label={`Tipo de paciente detectado: ${patientType === 'pediatric' ? 'Pediátrico' : 'Adulto'}`}
                  color={getPatientTypeColor(patientType)}
                  variant="outlined"
                />
              </Box>
            )}
          </Alert>
        )}
      </Collapse>
    </Box>
  );
};

export default ValidationAlerts; 