import React, { useMemo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Alert,
  AlertTitle,
  Divider,
  useTheme,
  alpha,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  Settings,
  Speed,
  Air,
  Straighten,
  Info,
  Warning,
  CheckCircle,
  Science
} from '@mui/icons-material';
import { 
  VentilatorModeSelectField,
  TidalVolumeField, 
  RespiratoryRateField 
} from '../../ui/FormField';
import {
  BasicParameters as BasicParametersType,
  PatientData,
  VentilatorMode,
  VENTILATOR_MODE_INFO
} from '../../../types/ventilator';
import {
  calculateTidalVolumeRange,
  getPathologyRanges
} from '../../../data/parameterRanges';

// ============================================================================
// PROPS E INTERFACES - VentyLab
// ============================================================================

interface BasicParametersProps {
  /** Parámetros básicos actuales */
  basicParameters: BasicParametersType;
  
  /** Datos del paciente para validaciones contextuales */
  patientData: PatientData;
  
  /** Función para actualizar parámetros básicos */
  onUpdateBasicParameters: (field: keyof BasicParametersType, value: any) => void;
  
  /** Errores de validación */
  errors: {
    ventilatorMode?: string;
    tidalVolume?: string;
    respiratoryRate?: string;
  };
  
  /** Rangos contextuales según patología */
  contextualRanges?: Record<string, any>;
  
  /** Alertas médicas */
  medicalAlerts?: string[];
  
  /** Mostrar información educativa */
  showEducationalInfo?: boolean;
  
  /** Solo lectura */
  readOnly?: boolean;
}

// ============================================================================
// COMPONENTE PRINCIPAL VENTLYLAB
// ============================================================================

export default function BasicParametersComponent({
  basicParameters,
  patientData,
  onUpdateBasicParameters,
  errors,
  contextualRanges,
  medicalAlerts = [],
  showEducationalInfo = true,
  readOnly = false
}: BasicParametersProps) {
  const theme = useTheme();

  // ============================================================================
  // OPCIONES PARA MODOS VENTILATORIOS
  // ============================================================================

  const ventilatorModeOptions = useMemo(() => {
    return Object.entries(VENTILATOR_MODE_INFO)
      .filter(([key]) => key !== '') // Excluir opción vacía
      .map(([value, info]) => ({
        value,
        label: info.label,
        description: info.description,
        color: info.type === 'volume' ? '#1976d2' : 
               info.type === 'pressure' ? '#d32f2f' :
               info.type === 'dual' ? '#7b1fa2' : undefined
      }));
  }, []);

  // ============================================================================
  // CÁLCULOS Y VALIDACIONES AUTOMÁTICAS VentyLab
  // ============================================================================

  const calculations = useMemo(() => {
    const calc: any = {};

    // Calcular volumen minuto si ambos valores están disponibles
    if (
      typeof basicParameters.tidalVolume === 'number' &&
      typeof basicParameters.respiratoryRate === 'number'
    ) {
      calc.minuteVolume = (basicParameters.tidalVolume * basicParameters.respiratoryRate) / 1000; // L/min
      
      // Evaluar si el volumen minuto es adecuado
      calc.minuteVolumeStatus = 
        calc.minuteVolume < 4 ? 'low' :
        calc.minuteVolume > 12 ? 'high' : 'normal';
    }

    // Calcular mL/kg si hay peso corporal
    if (
      typeof basicParameters.tidalVolume === 'number' &&
      typeof patientData.bodyWeight === 'number' &&
      patientData.bodyWeight > 0
    ) {
      calc.mlPerKg = basicParameters.tidalVolume / patientData.bodyWeight;
      
      // Evaluar estrategia ventilatoria
      calc.ventilationStrategy = 
        calc.mlPerKg <= 6 ? 'protective' :
        calc.mlPerKg <= 8 ? 'conventional' : 'high';
    }

    // Información del modo seleccionado - Corregida validación
    if (basicParameters.ventilatorMode && VENTILATOR_MODE_INFO[basicParameters.ventilatorMode]) {
      calc.modeInfo = VENTILATOR_MODE_INFO[basicParameters.ventilatorMode];
    }

    // Rango recomendado de volumen tidal según peso y patología
    if (typeof patientData.bodyWeight === 'number' && patientData.bodyWeight > 0) {
      calc.recommendedTidalRange = calculateTidalVolumeRange(
        patientData.bodyWeight,
        patientData.mainPathology,
        patientData.mainPathology === 'SDRA'
      );
    }

    return calc;
  }, [basicParameters, patientData]);

  // ============================================================================
  // COMPONENTES EDUCATIVOS VentyLab
  // ============================================================================

  const VentilatorModeInfo = () => {
    if (!calculations.modeInfo) return null;

    const getModeColor = () => {
      switch (calculations.modeInfo.type) {
        case 'volume': return theme.palette.primary.main;
        case 'pressure': return theme.palette.warning.main;
        case 'dual': return theme.palette.info.main;
        default: return theme.palette.grey[500];
      }
    };

    return (
      <Alert 
        severity="info"
        icon={<Science />}
        sx={{ 
          mt: 2,
          backgroundColor: alpha(getModeColor(), 0.1),
          borderColor: getModeColor(),
          '& .MuiAlert-icon': {
            color: getModeColor()
          }
        }}
      >
        <AlertTitle sx={{ color: getModeColor() }}>
          🎓 VentyLab: {calculations.modeInfo.label}
        </AlertTitle>
        <Typography variant="body2">
          {calculations.modeInfo.description}
        </Typography>
        <Box sx={{ mt: 1 }}>
          <Chip
            label={`Tipo: ${calculations.modeInfo.type.toUpperCase()}`}
            size="small"
            sx={{
              backgroundColor: alpha(getModeColor(), 0.2),
              color: getModeColor(),
              fontWeight: 500
            }}
          />
        </Box>
      </Alert>
    );
  };

  const CalculatedValues = () => {
    if (!calculations.minuteVolume && !calculations.mlPerKg) return null;

    return (
      <Box sx={{ mt: 2 }}>
        <Divider sx={{ mb: 2 }}>
          <Chip
            icon={<Science />}
            label="🧮 Valores Calculados VentyLab"
            size="small"
            variant="outlined"
            sx={{ 
              color: theme.palette.primary.main,
              borderColor: theme.palette.primary.main
            }}
          />
        </Divider>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
          {/* Volumen minuto */}
          {calculations.minuteVolume && (
            <Box sx={{ flex: 1 }}>
              <Box
                sx={{
                  p: 2,
                  backgroundColor: 
                    calculations.minuteVolumeStatus === 'normal' ? alpha(theme.palette.success.main, 0.05) :
                    calculations.minuteVolumeStatus === 'low' ? alpha(theme.palette.error.main, 0.05) :
                    alpha(theme.palette.warning.main, 0.05),
                  borderRadius: 2,
                  border: `1px solid ${
                    calculations.minuteVolumeStatus === 'normal' ? alpha(theme.palette.success.main, 0.2) :
                    calculations.minuteVolumeStatus === 'low' ? alpha(theme.palette.error.main, 0.2) :
                    alpha(theme.palette.warning.main, 0.2)
                  }`,
                  textAlign: 'center'
                }}
              >
                <Typography variant="caption" color="text.secondary" fontWeight={500}>
                  💨 Volumen Minuto
                </Typography>
                <Typography variant="h6" 
                  color={
                    calculations.minuteVolumeStatus === 'normal' ? 'success.main' :
                    calculations.minuteVolumeStatus === 'low' ? 'error.main' : 'warning.main'
                  }
                >
                  {calculations.minuteVolume.toFixed(1)} L/min
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {calculations.minuteVolumeStatus === 'normal' ? '✅ Adecuado' :
                   calculations.minuteVolumeStatus === 'low' ? '⚠️ Bajo' : '🚨 Alto'}
                </Typography>
              </Box>
            </Box>
          )}

          {/* mL/kg */}
          {calculations.mlPerKg && (
            <Box sx={{ flex: 1 }}>
              <Box
                sx={{
                  p: 2,
                  backgroundColor: 
                    calculations.ventilationStrategy === 'protective' ? alpha(theme.palette.success.main, 0.05) :
                    calculations.ventilationStrategy === 'conventional' ? alpha(theme.palette.info.main, 0.05) :
                    alpha(theme.palette.error.main, 0.05),
                  borderRadius: 2,
                  border: `1px solid ${
                    calculations.ventilationStrategy === 'protective' ? alpha(theme.palette.success.main, 0.2) :
                    calculations.ventilationStrategy === 'conventional' ? alpha(theme.palette.info.main, 0.2) :
                    alpha(theme.palette.error.main, 0.2)
                  }`,
                  textAlign: 'center'
                }}
              >
                <Typography variant="caption" color="text.secondary" fontWeight={500}>
                  ⚖️ Volumen Tidal/Peso
                </Typography>
                <Typography variant="h6"
                  color={
                    calculations.ventilationStrategy === 'protective' ? 'success.main' :
                    calculations.ventilationStrategy === 'conventional' ? 'info.main' : 'error.main'
                  }
                >
                  {calculations.mlPerKg.toFixed(1)} mL/kg
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {calculations.ventilationStrategy === 'protective' ? '🛡️ Protector' :
                   calculations.ventilationStrategy === 'conventional' ? '⚡ Convencional' : '🚨 Alto Riesgo'}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Rango recomendado */}
          {calculations.recommendedTidalRange && (
            <Box sx={{ flex: 1 }}>
              <Box
                sx={{
                  p: 2,
                  backgroundColor: alpha(theme.palette.primary.main, 0.05),
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                  textAlign: 'center'
                }}
              >
                <Typography variant="caption" color="primary.main" fontWeight={500}>
                  🎯 Rango Recomendado
                </Typography>
                <Typography variant="h6" color="primary.main">
                  {calculations.recommendedTidalRange.min} - {calculations.recommendedTidalRange.max} mL
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Para este paciente específico
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    );
  };

  const MedicalAlerts = () => {
    if (!medicalAlerts.length) return null;

    return (
      <Box sx={{ mt: 2 }}>
        {medicalAlerts.map((alert, index) => (
          <Alert 
            key={index}
            severity="warning"
            icon={<Warning />}
            sx={{ mb: 1 }}
          >
            <Typography variant="body2">
              🚨 <strong>VentyLab Alert:</strong> {alert}
            </Typography>
          </Alert>
        ))}
      </Box>
    );
  };

  const EducationalInfo = () => {
    if (!showEducationalInfo) return null;

    return (
      <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${theme.palette.grey[200]}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Info sx={{ color: theme.palette.info.main, mr: 1 }} />
          <Typography variant="h6" color="info.main">
            📚 Conceptos Clave VentyLab
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" color="primary.main" gutterBottom>
              🔧 Modos Ventilatorios
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>VCV:</strong> Garantiza volumen constante<br/>
              <strong>PCV:</strong> Limita presión inspiratoria<br/>
              <strong>SIMV:</strong> Combina respiraciones mandatorias y espontáneas<br/>
              <strong>PSV:</strong> Soporte de presión para respiración espontánea
            </Typography>
          </Box>
          
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" color="primary.main" gutterBottom>
              🫁 Volumen Tidal
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Protector:</strong> 4-6 mL/kg (SDRA, lesión pulmonar)<br/>
              <strong>Convencional:</strong> 6-8 mL/kg (pacientes normales)<br/>
              <strong>Alto riesgo:</strong> {'>'}8 mL/kg (evitar volutrauma)
            </Typography>
          </Box>
          
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" color="primary.main" gutterBottom>
              💨 Frecuencia Respiratoria
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>EPOC:</strong> Baja (8-16) para evitar auto-PEEP<br/>
              <strong>SDRA:</strong> Normal-alta (12-24) para compensar Vt bajo<br/>
              <strong>Normal:</strong> 12-20 respiraciones por minuto
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  };

  // ============================================================================
  // RENDER PRINCIPAL VentyLab
  // ============================================================================

  return (
    <Card 
      elevation={3}
      sx={{ 
        backgroundColor: theme.palette.background.paper,
        borderRadius: 4,
        border: `1px solid ${theme.palette.divider}`,
        overflow: 'visible'
      }}
    >
      <CardContent sx={{ p: 4 }}>
        {/* Header de la sección */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Box
            sx={{
              p: 2.5,
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              borderRadius: 4,
              mr: 3
            }}
          >
            <Settings sx={{ color: 'primary.main', fontSize: 36 }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h3" sx={{ color: 'primary.main', fontWeight: 700, mb: 1 }}>
              ⚙️ Parámetros Básicos
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 500 }}>
              🎯 <strong>VentyLab:</strong> Configuración fundamental del modo ventilatorio y volúmenes
            </Typography>
          </Box>
          <Tooltip title="🎓 VentyLab: Estos parámetros definen cómo el ventilador entrega cada respiración" arrow>
            <IconButton
              sx={{
                bgcolor: alpha(theme.palette.info.main, 0.1),
                color: 'info.main',
                '&:hover': { bgcolor: alpha(theme.palette.info.main, 0.2) }
              }}
            >
              <Info />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Campos del formulario */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Modo ventilatorio */}
          <Box>
            <VentilatorModeSelectField
              label="🔧 Modo Ventilatorio"
              value={basicParameters.ventilatorMode}
              onChange={(value) => onUpdateBasicParameters('ventilatorMode', value)}
              options={[
                { value: '', label: '🔍 Seleccione un modo ventilatorio', disabled: true },
                ...ventilatorModeOptions
              ]}
              error={errors.ventilatorMode}
              placeholder="Seleccione el modo de ventilación"
              description="🎯 Modo de funcionamiento del ventilador mecánico"
              required
              readOnly={readOnly}
              data-testid="basic-ventilator-mode"
            />
          </Box>

          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 4 }}>
            {/* Volumen tidal */}
            <Box sx={{ flex: 1 }}>
              <TidalVolumeField
                label="🫁 Volumen Tidal"
                value={basicParameters.tidalVolume}
                onChange={(value) => onUpdateBasicParameters('tidalVolume', value)}
                error={errors.tidalVolume}
                placeholder="Volumen en mL"
                description="💨 Volumen de aire por respiración"
                range={contextualRanges?.tidalVolume}
                showRange
                required
                readOnly={readOnly}
                medicalAlert={
                  calculations.mlPerKg > 8 ? 
                  `⚠️ Volumen alto: ${calculations.mlPerKg?.toFixed(1)} mL/kg (considerar reducir para prevenir volutrauma)` : 
                  undefined
                }
                data-testid="basic-tidal-volume"
              />
            </Box>

            {/* Frecuencia respiratoria */}
            <Box sx={{ flex: 1 }}>
              <RespiratoryRateField
                label="💨 Frecuencia Respiratoria"
                value={basicParameters.respiratoryRate}
                onChange={(value) => onUpdateBasicParameters('respiratoryRate', value)}
                error={errors.respiratoryRate}
                placeholder="Frecuencia en rpm"
                description="⏱️ Respiraciones por minuto"
                range={contextualRanges?.respiratoryRate}
                showRange
                required
                readOnly={readOnly}
                medicalAlert={
                  patientData.mainPathology === 'EPOC' && 
                  typeof basicParameters.respiratoryRate === 'number' && 
                  basicParameters.respiratoryRate > 16 ?
                  '🫁 EPOC: Frecuencia alta puede causar auto-PEEP peligroso' : 
                  undefined
                }
                data-testid="basic-respiratory-rate"
              />
            </Box>
          </Box>
        </Box>

        {/* Información del modo seleccionado */}
        <VentilatorModeInfo />

        {/* Valores calculados */}
        <CalculatedValues />

        {/* Alertas médicas */}
        <MedicalAlerts />

        {/* Información educativa */}
        <EducationalInfo />
      </CardContent>
    </Card>
  );
}