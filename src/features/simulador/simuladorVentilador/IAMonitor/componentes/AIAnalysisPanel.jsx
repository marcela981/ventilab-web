import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  IconButton,
  Paper,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PsychologyIcon from '@mui/icons-material/Psychology';

/**
 * Panel lateral para análisis de configuración con IA.
 * Muestra estado de análisis, resultado o error y botón para ejecutar.
 */
function AIAnalysisPanel({
  open,
  onClose,
  isAnalyzing,
  analysisResult,
  analysisError,
  onAnalyze,
  userConfig,
  optimalConfig,
  ventilationMode,
  patientData,
}) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 380 }, p: 2 }
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" component="h2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PsychologyIcon color="primary" />
            Análisis con IA
          </Typography>
          <IconButton size="small" onClick={onClose} aria-label="Cerrar">
            <CloseIcon />
          </IconButton>
        </Box>

        <Typography variant="body2" color="text.secondary">
          Analiza tu configuración actual frente a una configuración óptima sugerida para el modo y paciente.
        </Typography>

        <Button
          variant="contained"
          startIcon={isAnalyzing ? <CircularProgress size={20} color="inherit" /> : <PsychologyIcon />}
          onClick={onAnalyze}
          disabled={isAnalyzing}
          fullWidth
        >
          {isAnalyzing ? 'Analizando…' : 'Analizar configuración'}
        </Button>

        {analysisError && (
          <Alert severity="error" onClose={null}>
            {analysisError}
          </Alert>
        )}

        {analysisResult && !analysisError && (
          <Paper variant="outlined" sx={{ p: 2, flex: 1, overflow: 'auto' }}>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              Resultado del análisis
            </Typography>
            {analysisResult.message && (
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {analysisResult.message}
              </Typography>
            )}
            {analysisResult.analysis && typeof analysisResult.analysis === 'string' && (
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>
                {analysisResult.analysis}
              </Typography>
            )}
            {analysisResult.analysis && typeof analysisResult.analysis === 'object' && (
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>
                {JSON.stringify(analysisResult.analysis, null, 2)}
              </Typography>
            )}
          </Paper>
        )}
      </Box>
    </Drawer>
  );
}

export default AIAnalysisPanel;
