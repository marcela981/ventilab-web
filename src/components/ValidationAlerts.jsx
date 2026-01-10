import React, { useState } from 'react';
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
  ListItemText,
  Tabs,
  Tab,
  Badge,
  Paper
} from '@mui/material';
import {
  Error as ErrorIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  Info as InfoIcon
} from '@mui/icons-material';

// Componente de panel de pestaña
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`alert-tabpanel-${index}`}
      aria-labelledby={`alert-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const ValidationAlerts = ({ 
  validationState, 
  onClose, 
  show = true,
  compact = false 
}) => {
  // Validaciones defensivas
  if (!validationState) {
    return null;
  }

  const { 
    criticalErrors = [], 
    warnings = [], 
    severity = 'safe', 
    patientType = 'general' 
  } = validationState;
  
  const [activeTab, setActiveTab] = useState(0);

  if (!show || (criticalErrors.length === 0 && warnings.length === 0)) {
    return null;
  }

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

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

  // Versión compacta - solo muestra resumen
  if (compact) {
    return (
      <Box sx={{ position: 'fixed', top: 20, right: 20, zIndex: 1000 }}>
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
            
            <Typography variant="body2" sx={{ mb: 1 }}>
              {criticalErrors.length > 0 && `${criticalErrors.length} error${criticalErrors.length > 1 ? 'es' : ''} crítico${criticalErrors.length > 1 ? 's' : ''}`}
              {criticalErrors.length > 0 && warnings.length > 0 && ' • '}
              {warnings.length > 0 && `${warnings.length} advertencia${warnings.length > 1 ? 's' : ''}`}
            </Typography>

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

  // Versión expandida con pestañas
  return (
    <Box sx={{ mb: 2 }}>
      <Collapse in={show}>
        <Paper
          elevation={3}
          sx={{
            backgroundColor: 'rgba(31, 31, 31, 0.9)',
            border: `1px solid ${getSeverityColor(severity) === 'error' ? '#f44336' : '#ff9800'}`,
            borderRadius: 2,
            overflow: 'hidden',
            maxWidth: 600
          }}
        >
          {/* Header del Alert */}
          <Box
            sx={{
              backgroundColor: getSeverityColor(severity) === 'error' ? 'error.main' : 'warning.main',
              color: '#fff',
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <Box display="flex" alignItems="center" gap={1}>
              {getSeverityIcon(severity)}
              <Typography variant="h6" fontWeight="bold">
                Alertas de Validación
              </Typography>
            </Box>
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={onClose}
              sx={{ color: '#fff' }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Pestañas */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              aria-label="alertas-tabs"
              sx={{
                '& .MuiTab-root': {
                  color: 'text.secondary',
                  '&.Mui-selected': {
                    color: getSeverityColor(severity) === 'error' ? 'error.main' : 'warning.main'
                  }
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: getSeverityColor(severity) === 'error' ? 'error.main' : 'warning.main'
                }
              }}
            >
              {criticalErrors.length > 0 && (
                <Tab
                  label={
                    <Badge badgeContent={criticalErrors.length} color="error">
                      <Box display="flex" alignItems="center" gap={1}>
                        <ErrorIcon fontSize="small" />
                        <Typography variant="body2">Errores Críticos</Typography>
                      </Box>
                    </Badge>
                  }
                />
              )}
              {warnings.length > 0 && (
                <Tab
                  label={
                    <Badge badgeContent={warnings.length} color="warning">
                      <Box display="flex" alignItems="center" gap={1}>
                        <WarningIcon fontSize="small" />
                        <Typography variant="body2">Advertencias</Typography>
                      </Box>
                    </Badge>
                  }
                />
              )}
              <Tab
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <InfoIcon fontSize="small" />
                    <Typography variant="body2">Información</Typography>
                  </Box>
                }
              />
            </Tabs>
          </Box>

          {/* Contenido de las pestañas */}
          <Box sx={{ p: 2, minHeight: 200, maxHeight: 400, overflow: 'auto' }}>
            {/* Pestaña de Errores Críticos */}
            {criticalErrors.length > 0 && (
              <TabPanel value={activeTab} index={0}>
                <Typography variant="body2" color="error.main" fontWeight="bold" sx={{ mb: 2 }}>
                  Los siguientes errores impiden el envío de la configuración:
                </Typography>
                <List dense>
                  {criticalErrors.map((error, index) => (
                    <ListItem 
                      key={index} 
                      sx={{ 
                        py: 1,
                        backgroundColor: 'rgba(244, 67, 54, 0.05)',
                        borderRadius: 1,
                        mb: 0.5
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <ErrorIcon fontSize="small" color="error" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={error}
                        primaryTypographyProps={{ 
                          fontSize: '0.875rem',
                          color: 'error.main'
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              </TabPanel>
            )}

            {/* Pestaña de Advertencias */}
            {warnings.length > 0 && (
              <TabPanel value={activeTab} index={criticalErrors.length > 0 ? 1 : 0}>
                <Typography variant="body2" color="warning.main" fontWeight="bold" sx={{ mb: 2 }}>
                  Los siguientes parámetros están fuera del rango recomendado:
                </Typography>
                <List dense>
                  {warnings.map((warning, index) => (
                    <ListItem 
                      key={index} 
                      sx={{ 
                        py: 1,
                        backgroundColor: 'rgba(255, 152, 0, 0.05)',
                        borderRadius: 1,
                        mb: 0.5
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <WarningIcon fontSize="small" color="warning" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={warning}
                        primaryTypographyProps={{ 
                          fontSize: '0.875rem',
                          color: 'warning.main'
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              </TabPanel>
            )}

            {/* Pestaña de Información */}
            <TabPanel value={activeTab} index={criticalErrors.length > 0 && warnings.length > 0 ? 2 : criticalErrors.length > 0 || warnings.length > 0 ? 1 : 0}>
              <Typography variant="body2" color="info.main" fontWeight="bold" sx={{ mb: 2 }}>
                Información adicional sobre la configuración:
              </Typography>
              
              {patientType !== 'general' && (
                <Box mb={2}>
                  <Chip
                    label={`Tipo de paciente detectado: ${patientType === 'pediatric' ? 'Pediátrico' : 'Adulto'}`}
                    color={getPatientTypeColor(patientType)}
                    variant="outlined"
                    sx={{ mb: 1 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Los rangos de validación se han ajustado automáticamente según el tipo de paciente detectado.
                  </Typography>
                </Box>
              )}

              <List dense>
                <ListItem sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckCircleIcon fontSize="small" color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Validación automática activa"
                    secondary="Los parámetros se validan en tiempo real"
                    secondaryTypographyProps={{ fontSize: '0.75rem' }}
                  />
                </ListItem>
                <ListItem sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <InfoIcon fontSize="small" color="info" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Rangos de seguridad configurados"
                    secondary="Basados en guías clínicas internacionales"
                    secondaryTypographyProps={{ fontSize: '0.75rem' }}
                  />
                </ListItem>
                {severity === 'safe' && (
                  <ListItem sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <CheckCircleIcon fontSize="small" color="success" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Configuración segura"
                      secondary="Todos los parámetros están dentro de rangos seguros"
                      secondaryTypographyProps={{ fontSize: '0.75rem' }}
                    />
                  </ListItem>
                )}
              </List>
            </TabPanel>
          </Box>
        </Paper>
      </Collapse>
    </Box>
  );
};

export default ValidationAlerts; 