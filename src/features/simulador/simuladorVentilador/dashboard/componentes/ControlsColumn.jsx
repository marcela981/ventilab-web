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

import Tooltip from '@mui/material/Tooltip';

import ValidatedInput from '@/features/simulador/compartido/componentes/ValidatedInput';
import ModeToggle from '@/features/simulador/compartido/componentes/ModeToggle';
import AIAnalysisButton from '@/features/simulador/compartido/componentes/AIAnalysisButton';
import ComplianceStatus from '@/features/simulador/simuladorVentilador/panelControl/componentes/ComplianceStatus';
import ValidationAlerts from '@/features/simulador/simuladorVentilador/panelControl/componentes/ValidationAlerts';

const ControlsColumn = ({
  ventilationMode,
  ventilatorData,
  handleParameterChange,
  parameterValidation,
  complianceData,
  errorDetection,
  autoAdjustmentEnabled,
  lastAutoAdjustment,
  showValidationAlerts,
  setShowValidationAlerts,
  handleModeChange,
  isAnalyzing,
  handleAIAnalysis,
}) => {
  return (
    <Box sx={{ width: { xs: '100%', sm: '250px' }, flexShrink: 0, minWidth: '230px', pl: { sm: 1 }, pt: 1 }}>
      <Box display="flex" flexDirection="column" gap={1.5}>

        {/* Botonera de Modos */}
        <Box display="flex" justifyContent="flex-end" mb={1} pr={0.5}>
          <ModeToggle
            ventilationMode={ventilationMode}
            onChange={handleModeChange}
            AnalysisButton={
              <Tooltip title="Analizar datos con Inteligencia Artificial" placement="bottom" arrow>
                <Box>
                  <AIAnalysisButton isAnalyzing={isAnalyzing} onClick={handleAIAnalysis} />
                </Box>
              </Tooltip>
            }
          />
        </Box>

        <Box display="flex" flexDirection="column" gap={1.5} mt={{ sm: '120px' }}>
          {/* I:E slider */}
        <Box>
          <Box display="flex" flexDirection="row" justifyContent="space-between" mb={-1}>
            <Typography variant="subtitle1" sx={{ fontSize: '13px', fontWeight: 200 }}>Insp</Typography>
            <Typography variant="subtitle1" sx={{ fontSize: '13px', fontWeight: 200 }}>Esp</Typography>
          </Box>
          <Slider
            value={ventilatorData.inspiracionEspiracion}
            min={0}
            max={1}
            step={0.01}
            sx={{ width: '100%' }}
            onChange={(_, value) => handleParameterChange('inspiracionEspiracion', value)}
          />
        </Box>

        {/* I:E ratio display */}
        <Box display="flex" flexDirection="column" gap={1}>
          <Typography variant="subtitle1" sx={{ fontSize: '13px', fontWeight: 200, textAlign: 'center' }}>
            Relación I:E
          </Typography>
          <Box display="flex" flexDirection="row" justifyContent="center" gap={2}>
            <TextField
              type="number"
              variant="outlined"
              size="small"
              sx={{ width: '100%', '& .MuiInputBase-input': { backgroundColor: 'rgba(76, 175, 80, 0.08)', color: '#4caf50', fontWeight: 'bold' } }}
              value={ventilatorData.relacionIE1 || 1}
              InputProps={{ readOnly: true }}
              helperText="Inspiración"
            />
            <TextField
              type="number"
              variant="outlined"
              size="small"
              sx={{ width: '100%', '& .MuiInputBase-input': { backgroundColor: 'rgba(76, 175, 80, 0.08)', color: '#4caf50', fontWeight: 'bold' } }}
              value={ventilatorData.relacionIE2 || 1}
              InputProps={{ readOnly: true }}
              helperText="Espiración"
            />
          </Box>
          <Box display="flex" justifyContent="center">
            <Typography
              variant="caption"
              sx={{ fontSize: '11px', color: '#4caf50', backgroundColor: 'rgba(76, 175, 80, 0.1)', px: 1, py: 0.5, borderRadius: 1, textAlign: 'center' }}
            >
              Ti: {ventilatorData.tiempoInspiratorio?.toFixed(2) || '0.00'}s | Te: {ventilatorData.tiempoEspiratorio?.toFixed(2) || '0.00'}s
            </Typography>
          </Box>
        </Box>

        {/* Inspiratory pause */}
        <Box>
          <Typography variant="subtitle1" sx={{ fontSize: '13px', fontWeight: 200, textAlign: 'center' }}>
            Pausa Inspiratoria
          </Typography>
          <TextField
            type="number"
            variant="outlined"
            size="small"
            fullWidth
            value={ventilatorData.pausaInspiratoria}
            onChange={(e) => handleParameterChange('pausaInspiratoria', Number(e.target.value))}
          />
        </Box>

        {/* Expiratory pause */}
        <Box>
          <Typography variant="subtitle1" sx={{ fontSize: '13px', fontWeight: 200, textAlign: 'center' }}>
            Pausa Espiratoria
          </Typography>
          <TextField
            type="number"
            variant="outlined"
            size="small"
            fullWidth
            value={ventilatorData.pausaEspiratoria}
            onChange={(e) => handleParameterChange('pausaEspiratoria', Number(e.target.value))}
          />
        </Box>

        {/* Frequency */}
        <Box>
          <Box display="flex" flexDirection="row" alignItems="center" justifyContent="space-between" mb={1}>
            <Typography variant="subtitle1" sx={{ fontSize: '13px', fontWeight: 200 }}>
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
            sx={{ width: '100%' }}
            onChange={(_, value) => handleParameterChange('frecuencia', value)}
          />
        </Box>

        {/* Compliance status */}
        {complianceData && errorDetection && (
          <ComplianceStatus
            complianceData={complianceData}
            errorDetection={errorDetection}
            autoAdjustmentEnabled={autoAdjustmentEnabled}
            lastAutoAdjustment={lastAutoAdjustment}
            ventilationMode={ventilationMode}
          />
        )}

        {/* Validation alerts */}
        {parameterValidation && parameterValidation.validationState && (
          <Box>
            <ValidationAlerts
              validationState={parameterValidation.validationState}
              onClose={() => setShowValidationAlerts(false)}
              show={showValidationAlerts}
              compact={false}
            />
            <Box display="flex" justifyContent="center" mt={1}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setShowValidationAlerts(!showValidationAlerts)}
                startIcon={showValidationAlerts ? <VisibilityOffIcon /> : <VisibilityIcon />}
                sx={{ color: 'text.secondary', borderColor: 'rgba(255, 255, 255, 0.2)', '&:hover': { borderColor: 'primary.main', backgroundColor: 'rgba(255, 255, 255, 0.1)' } }}
              >
                {showValidationAlerts ? 'Ocultar Alertas' : 'Ver Alertas Detalladas'}
              </Button>
            </Box>
          </Box>
        )}

        </Box>
      </Box>
    </Box>
  );
};

export default ControlsColumn;
