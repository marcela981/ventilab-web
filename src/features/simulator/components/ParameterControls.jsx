import React from 'react';
import {
  Box,
  Typography,
  Slider,
  TextField,
  Button,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ValidatedInput from '@/shared/components/ValidatedInput';
import ComplianceStatus from '@/features/simulator/components/ComplianceStatus';
import ValidationAlerts from '@/features/simulator/components/ValidationAlerts';

/**
 * ParameterControls.jsx
 *
 * Componente que contiene todos los controles de parámetros del ventilador:
 * - Slider de Inspiración-Espiración
 * - Relación I:E (readonly)
 * - Pausas inspiratorias y espiratorias
 * - Control de frecuencia con slider
 * - Sistema de Compliance Automático
 * - Alertas de validación
 */

const ParameterControls = ({
  // Props principales
  ventilatorData,
  ventilationMode,
  handleParameterChange,
  parameterValidation,

  // Props para Compliance
  complianceData,
  errorDetection,
  autoAdjustmentEnabled,
  lastAutoAdjustment,

  // Props para validación
  showValidationAlerts,
  setShowValidationAlerts,
}) => {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      ml={ventilationMode === 'pressure' ? -3 : -14}
      mt={18}
    >
      {/* Slider Insp-Esp */}
      <Box
        display="flex"
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        width={300}
        mb={-1}
        sx={{ marginLeft: ventilationMode === 'pressure' ? -7 : -18 }}
      >
        <Typography variant="subtitle1" sx={{ fontSize: '24px', fontWeight: 200, textAlign: 'center' }}>
          Insp
        </Typography>
        <Typography variant="subtitle1" sx={{ fontSize: '24px', fontWeight: 200, textAlign: 'center' }}>
          Esp
        </Typography>
      </Box>

      <Slider
        value={ventilatorData.inspiracionEspiracion}
        min={0}
        max={1}
        step={0.01}
        sx={{ width: 300, mb: 3, marginLeft: ventilationMode === 'pressure' ? -9 : -18 }}
        onChange={(_, value) => handleParameterChange('inspiracionEspiracion', value)}
      />

      {/* 3 inputs verticales */}
      <Box
        display="flex"
        flexDirection="column"
        gap={2}
        mb={3}
        sx={{ width: 300, marginLeft: ventilationMode === 'pressure' ? -9 : -18 }}
      >
        {/* Relación I:E */}
        <Typography variant="subtitle1" sx={{ fontSize: '24px', fontWeight: 200, textAlign: 'center' }}>
          Relación I:E
        </Typography>

        <Box display="flex" flexDirection="row" justifyContent="center" gap={2}>
          <TextField
            type="number"
            variant="outlined"
            size="small"
            sx={{
              width: 140,
              '& .MuiInputBase-input': {
                backgroundColor: 'rgba(76, 175, 80, 0.08)',
                color: '#4caf50',
                fontWeight: 'bold'
              }
            }}
            value={ventilatorData.relacionIE1 || 1}
            InputProps={{
              readOnly: true
            }}
            helperText="Inspiración"
          />

          <TextField
            type="number"
            variant="outlined"
            size="small"
            sx={{
              width: 140,
              '& .MuiInputBase-input': {
                backgroundColor: 'rgba(76, 175, 80, 0.08)',
                color: '#4caf50',
                fontWeight: 'bold'
              }
            }}
            value={ventilatorData.relacionIE2 || 1}
            InputProps={{
              readOnly: true
            }}
            helperText="Espiración"
          />
        </Box>

        {/* Mostrar tiempos calculados */}
        <Box display="flex" justifyContent="center" mt={1}>
          <Typography
            variant="caption"
            sx={{
              fontSize: '11px',
              color: '#4caf50',
              backgroundColor: 'rgba(76, 175, 80, 0.1)',
              px: 1,
              py: 0.5,
              borderRadius: 1,
              textAlign: 'center'
            }}
          >
            Ti: {ventilatorData.tiempoInspiratorio?.toFixed(2) || '0.00'}s |
            Te: {ventilatorData.tiempoEspiratorio?.toFixed(2) || '0.00'}s
          </Typography>
        </Box>

        {/* Pausa Inspiratoria */}
        <Typography variant="subtitle1" sx={{ fontSize: '24px', fontWeight: 200, textAlign: 'center' }}>
          Pausa Inspiratoria
        </Typography>

        <TextField
          type="number"
          variant="outlined"
          size="small"
          value={ventilatorData.pausaInspiratoria}
          onChange={e => handleParameterChange('pausaInspiratoria', Number(e.target.value))}
        />

        {/* Pausa Espiratoria */}
        <Typography variant="subtitle1" sx={{ fontSize: '24px', fontWeight: 200, textAlign: 'center' }}>
          Pausa Espiratoria
        </Typography>

        <TextField
          type="number"
          variant="outlined"
          size="small"
          value={ventilatorData.pausaEspiratoria}
          onChange={e => handleParameterChange('pausaEspiratoria', Number(e.target.value))}
        />
      </Box>

      {/* Frecuencia: título a la izquierda, input a la derecha, slider debajo */}
      <Box
        display="flex"
        flexDirection="row"
        alignItems="center"
        width={300}
        mb={1}
        sx={{ marginLeft: ventilationMode === 'pressure' ? -9 : -18 }}
      >
        <Typography variant="subtitle1" sx={{ fontSize: '24px', fontWeight: 200, flex: 1, textAlign: 'left' }}>
          Frecuencia
        </Typography>

        <ValidatedInput
          parameter="frecuencia"
          value={ventilatorData.frecuencia}
          onChange={handleParameterChange}
          label="Frecuencia"
          unit="resp/min"
          validation={parameterValidation.validateSingleParameter('frecuencia', ventilatorData.frecuencia, ventilatorData, ventilationMode)}
          ranges={parameterValidation.getParameterRanges('frecuencia')}
          sx={{ width: 80, ml: 2 }}
          inputProps={{ min: 5, max: 60 }}
        />
      </Box>

      <Slider
        value={ventilatorData.frecuencia}
        min={0}
        max={24}
        step={1}
        sx={{ width: 300, marginLeft: ventilationMode === 'pressure' ? -9 : -18 }}
        onChange={(_, value) => handleParameterChange('frecuencia', value)}
      />

      {/* Sistema de Compliance Automático */}
      <Box sx={{ width: 300, marginLeft: ventilationMode === 'pressure' ? -9 : -18, mt: 2 }}>
        {complianceData && errorDetection && (
          <ComplianceStatus
            complianceData={complianceData}
            errorDetection={errorDetection}
            autoAdjustmentEnabled={autoAdjustmentEnabled}
            lastAutoAdjustment={lastAutoAdjustment}
            ventilationMode={ventilationMode}
          />
        )}
      </Box>

      {/* Alertas de validación completas */}
      <Box sx={{ width: 300, marginLeft: ventilationMode === 'pressure' ? -9 : -18, mt: 2 }}>
        {parameterValidation && parameterValidation.validationState && (
          <ValidationAlerts
            validationState={parameterValidation.validationState}
            onClose={() => setShowValidationAlerts(false)}
            show={showValidationAlerts}
            compact={false}
          />
        )}

        {/* Botón para mostrar/ocultar alertas detalladas */}
        <Box display="flex" justifyContent="center" mt={1}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setShowValidationAlerts(!showValidationAlerts)}
            sx={{
              color: 'text.secondary',
              borderColor: 'rgba(255, 255, 255, 0.2)',
              '&:hover': {
                borderColor: 'primary.main',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }
            }}
            startIcon={showValidationAlerts ? <VisibilityOffIcon /> : <VisibilityIcon />}
          >
            {showValidationAlerts ? 'Ocultar Alertas' : 'Ver Alertas Detalladas'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default ParameterControls;
