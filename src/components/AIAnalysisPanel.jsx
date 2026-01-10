import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Collapse,
  IconButton,
  Chip,
  Divider
} from '@mui/material';
import {
  Psychology as PsychologyIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const AnalysisPanel = styled(Paper)(({ theme }) => ({
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '90vw',
  maxWidth: '800px',
  maxHeight: '80vh',
  zIndex: 2000,
  padding: theme.spacing(3),
  backgroundColor: 'rgba(31, 31, 31, 0.95)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  overflow: 'auto'
}));

const Overlay = styled(Box)({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  zIndex: 1999
});

const AIAnalysisPanel = ({
  open,
  onClose,
  isAnalyzing,
  analysisResult,
  analysisError,
  onAnalyze,
  userConfig,
  optimalConfig,
  ventilationMode,
  patientData
}) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!open) return null;

  const handleAnalyze = () => {
    onAnalyze(userConfig, optimalConfig, ventilationMode, patientData);
  };

  const getSeverityIcon = (severity) => {
    switch (severity.toLowerCase()) {
      case 'crítico':
        return <ErrorIcon color="error" />;
      case 'moderado':
        return <WarningIcon color="warning" />;
      case 'leve':
        return <InfoIcon color="info" />;
      default:
        return <InfoIcon color="info" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity.toLowerCase()) {
      case 'crítico':
        return 'error';
      case 'moderado':
        return 'warning';
      case 'leve':
        return 'info';
      default:
        return 'info';
    }
  };

  return (
    <>
      <Overlay onClick={onClose} />
      <AnalysisPanel>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5" sx={{ color: '#de0b24', display: 'flex', alignItems: 'center', gap: 1 }}>
            <PsychologyIcon />
            Análisis de IA - Configuración del Ventilador
          </Typography>
          <IconButton onClick={onClose} sx={{ color: 'text.secondary' }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {!analysisResult && !isAnalyzing && (
          <Box textAlign="center" py={4}>
            <PsychologyIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Análisis Inteligente de Configuración
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              La IA analizará tu configuración actual y la comparará con los parámetros óptimos
              para identificar posibles errores y proporcionar recomendaciones.
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={handleAnalyze}
              startIcon={<PsychologyIcon />}
              sx={{
                backgroundColor: '#de0b24',
                '&:hover': { backgroundColor: '#b3091e' }
              }}
            >
              Iniciar Análisis
            </Button>
          </Box>
        )}

        {isAnalyzing && (
          <Box textAlign="center" py={4}>
            <CircularProgress size={64} sx={{ color: '#de0b24', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Analizando Configuración...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              La IA está revisando tu configuración y comparándola con los parámetros óptimos.
              Esto puede tomar unos segundos.
            </Typography>
          </Box>
        )}

        {analysisError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Error en el análisis: {analysisError}
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={handleAnalyze}
              sx={{ mt: 1 }}
            >
              Reintentar
            </Button>
          </Alert>
        )}

        {analysisResult && (
          <Box>
            {/* Resumen ejecutivo */}
            <Paper sx={{ p: 2, mb: 2, backgroundColor: 'rgba(76, 175, 80, 0.1)', border: '1px solid #4caf50' }}>
              <Typography variant="h6" color="success.main" gutterBottom>
                <CheckCircleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Resumen del Análisis
              </Typography>
              <Typography variant="body2" color="text.primary">
                {analysisResult.analysis.split('\n')[0]}
              </Typography>
            </Paper>

            {/* Análisis completo */}
            <Box mb={2}>
              <Button
                variant="outlined"
                onClick={() => setShowDetails(!showDetails)}
                sx={{ mb: 1 }}
              >
                {showDetails ? 'Ocultar Detalles' : 'Ver Análisis Completo'}
              </Button>
              
              <Collapse in={showDetails}>
                <Paper sx={{ p: 2, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                  <Typography 
                    variant="body2" 
                    component="pre" 
                    sx={{ 
                      whiteSpace: 'pre-wrap', 
                      fontFamily: 'inherit',
                      lineHeight: 1.6
                    }}
                  >
                    {analysisResult.analysis}
                  </Typography>
                </Paper>
              </Collapse>
            </Box>

            {/* Recomendaciones rápidas */}
            {analysisResult.recommendations.length > 0 && (
              <Box>
                <Typography variant="h6" gutterBottom sx={{ color: '#ff9800' }}>
                  Recomendaciones Rápidas
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {analysisResult.recommendations.map((rec, index) => (
                    <Chip
                      key={index}
                      label={rec}
                      color="warning"
                      variant="outlined"
                      size="small"
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* Botones de acción */}
            <Box display="flex" gap={2} mt={3}>
              <Button
                variant="contained"
                onClick={handleAnalyze}
                startIcon={<PsychologyIcon />}
                sx={{
                  backgroundColor: '#de0b24',
                  '&:hover': { backgroundColor: '#b3091e' }
                }}
              >
                Reanalizar
              </Button>
              <Button
                variant="outlined"
                onClick={onClose}
              >
                Cerrar
              </Button>
            </Box>
          </Box>
        )}
      </AnalysisPanel>
    </>
  );
};

export default AIAnalysisPanel;