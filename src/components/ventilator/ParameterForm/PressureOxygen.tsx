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
  LinearProgress,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  Compress,
  Air,
  Speed,
  Warning,
  Info,
  CheckCircle,
  Science,
  MonitorHeart,
  Thermostat,
  Psychology
} from '@mui/icons-material';
import { 
  PEEPField,
  FiO2Field, 
  PeakPressureField 
} from '../../ui/FormField';
import {
  PressureOxygenParameters as PressureOxygenParametersType,
  PatientData,
  BasicParameters
} from '../../../types/ventilator';

// ============================================================================
// PROPS E INTERFACES - VentyLab
// ============================================================================

interface PressureOxygenProps {
  /** Parámetros de presión y oxigenación actuales */
  pressureOxygenParameters: PressureOxygenParametersType;
  
  /** Datos del paciente para validaciones contextuales */
  patientData: PatientData;
  
  /** Parámetros básicos para cálculos cruzados */
  basicParameters: BasicParameters;
  
  /** Función para actualizar parámetros */
  onUpdatePressureOxygenParameters: (field: keyof PressureOxygenParametersType, value: any) => void;
  
  /** Errores de validación */
  errors: {
    peep?: string;
    fio2?: string;
    peakPressure?: string;
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

export default function PressureOxygenComponent({
  pressureOxygenParameters,
  patientData,
  basicParameters,
  onUpdatePressureOxygenParameters,
  errors,
  contextualRanges,
  medicalAlerts = [],
  showEducationalInfo = true,
  readOnly = false
}: PressureOxygenProps) {
  const theme = useTheme();

  // ============================================================================
  // CÁLCULOS Y EVALUACIONES AUTOMÁTICAS VentyLab
  // ============================================================================

  const calculations = useMemo(() => {
    const calc: any = {};

    // Calcular presión plateau estimada (simplificación educativa)
    if (typeof pressureOxygenParameters.peakPressure === 'number') {
      calc.estimatedPlateau = pressureOxygenParameters.peakPressure - 5; // Estimación conservadora
      
      // Calcular presión de conducción (driving pressure) si hay PEEP
      if (typeof pressureOxygenParameters.peep === 'number') {
        calc.drivingPressure = calc.estimatedPlateau - pressureOxygenParameters.peep;
        
        // Evaluar presión de conducción según evidencia científica
        calc.drivingPressureStatus = 
          calc.drivingPressure <= 15 ? 'safe' :
          calc.drivingPressure <= 20 ? 'caution' : 'danger';
      }
    }

    // Evaluar PEEP según patología específica
    if (typeof pressureOxygenParameters.peep === 'number') {
      calc.peepEvaluation = evaluatePEEP(
        pressureOxygenParameters.peep, 
        patientData.mainPathology
      );
    }

    // Evaluar FiO₂ según patología específica
    if (typeof pressureOxygenParameters.fio2 === 'number') {
      calc.fio2Evaluation = evaluateFiO2(
        pressureOxygenParameters.fio2, 
        patientData.mainPathology
      );
    }

    // Evaluar presión pico según modo ventilatorio
    if (typeof pressureOxygenParameters.peakPressure === 'number') {
      calc.pressureEvaluation = evaluatePeakPressure(
        pressureOxygenParameters.peakPressure,
        basicParameters.ventilatorMode,
        patientData.mainPathology
      );
    }

    // Calcular índice de oxigenación estimado (educativo)
    if (
      typeof pressureOxygenParameters.fio2 === 'number' &&
      typeof pressureOxygenParameters.peep === 'number' &&
      calc.estimatedPlateau
    ) {
      // PaO₂/FiO₂ estimado (simplificación para educación)
      calc.estimatedPF = Math.round(400 - (pressureOxygenParameters.fio2 - 21) * 2);
      
      // Índice de oxigenación estimado
      calc.oxygenationIndex = Math.round(
        (calc.estimatedPlateau * pressureOxygenParameters.fio2) / calc.estimatedPF
      );
    }

    return calc;
  }, [pressureOxygenParameters, patientData, basicParameters]);

  // ============================================================================
  // FUNCIONES DE EVALUACIÓN BASADAS EN EVIDENCIA
  // ============================================================================

  function evaluatePEEP(peep: number, pathology?: string) {
    const evaluation: any = { value: peep };
    
    switch (pathology) {
      case 'SDRA':
        evaluation.status = peep < 8 ? 'low' : peep > 18 ? 'high' : 'optimal';
        evaluation.recommendation = peep < 8 ? 
          '🛡️ VentyLab: Considerar PEEP más alto para reclutamiento alveolar en SDRA' :
          peep > 18 ? '⚠️ VentyLab: PEEP muy alto - riesgo hemodinámico y barotrauma' :
          '✅ VentyLab: PEEP adecuado para estrategia protectora en SDRA';
        break;
      
      case 'EPOC':
        evaluation.status = peep > 8 ? 'high' : 'optimal';
        evaluation.recommendation = peep > 8 ?
          '🫁 VentyLab: PEEP alto en EPOC - puede empeorar auto-PEEP y comprometer hemodinamia' :
          '✅ VentyLab: PEEP apropiado para EPOC - minimiza auto-PEEP';
        break;
      
      case 'PATOLOGIA_NEUROQUIRURGICA':
        evaluation.status = peep > 10 ? 'high' : 'optimal';
        evaluation.recommendation = peep > 10 ?
          '🧠 VentyLab: PEEP alto - puede aumentar presión intracraneal' :
          '✅ VentyLab: PEEP apropiado para paciente neuroquirúrgico';
        break;
      
      default:
        evaluation.status = peep < 5 ? 'low' : peep > 15 ? 'high' : 'optimal';
        evaluation.recommendation = peep < 5 ?
          '📈 VentyLab: PEEP bajo - considerar incrementar para mejorar oxigenación' :
          peep > 15 ? '📉 VentyLab: PEEP alto - evaluar necesidad y riesgo hemodinámico' :
          '✅ VentyLab: PEEP en rango normal';
    }
    
    return evaluation;
  }

  function evaluateFiO2(fio2: number, pathology?: string) {
    const evaluation: any = { value: fio2 };
    
    if (pathology === 'EPOC') {
      evaluation.status = fio2 > 40 ? 'high' : 'optimal';
      evaluation.recommendation = fio2 > 40 ?
        '🫁 VentyLab: FiO₂ alta en EPOC - riesgo de retención de CO₂ (target SpO₂ 88-92%)' :
        '✅ VentyLab: FiO₂ apropiada para EPOC - oxigenación controlada';
    } else {
      evaluation.status = 
        fio2 > 80 ? 'high' :
        fio2 > 60 ? 'moderate' : 'optimal';
      evaluation.recommendation = 
        fio2 > 80 ? '🚨 VentyLab: FiO₂ muy alta - riesgo de toxicidad por oxígeno' :
        fio2 > 60 ? '⚠️ VentyLab: FiO₂ elevada - titular según SpO₂ y gasometría' :
        '✅ VentyLab: FiO₂ en rango seguro';
    }
    
    return evaluation;
  }

  function evaluatePeakPressure(pressure: number, mode?: string, pathology?: string) {
    const evaluation: any = { value: pressure };
    
    if (pathology === 'SDRA') {
      evaluation.status = pressure > 28 ? 'high' : 'optimal';
      evaluation.recommendation = pressure > 28 ?
        '🛡️ VentyLab: Presión alta en SDRA - mantener {'<'}28 cmH₂O para protección pulmonar' :
        '✅ VentyLab: Presión apropiada para estrategia protectora';
    } else {
      evaluation.status = pressure > 30 ? 'high' : 'optimal';
      evaluation.recommendation = pressure > 30 ?
        '⚠️ VentyLab: Presión alta - riesgo de barotrauma' :
        '✅ VentyLab: Presión en rango seguro';
    }
    
    if (mode === 'PCV') {
      evaluation.note = '🎓 En PCV: Esta es la presión inspiratoria fija controlada';
    } else if (mode === 'VCV') {
      evaluation.note = '🎓 En VCV: Esta es la presión pico resultante del volumen';
    }
    
    return evaluation;
  }

  // ============================================================================
  // COMPONENTES EDUCATIVOS VentyLab
  // ============================================================================

  const DrivingPressureIndicator = () => {
    if (!calculations.drivingPressure) return null;

    const getColor = () => {
      switch (calculations.drivingPressureStatus) {
        case 'safe': return theme.palette.success.main;
        case 'caution': return theme.palette.warning.main;
        case 'danger': return theme.palette.error.main;
        default: return theme.palette.grey[500];
      }
    };

    const getMessage = () => {
      switch (calculations.drivingPressureStatus) {
        case 'safe': return '🛡️ VentyLab: Presión de conducción segura - excelente para protección pulmonar';
        case 'caution': return '⚠️ VentyLab: Presión de conducción elevada - considerar ajustes';
        case 'danger': return '🚨 VentyLab: Presión de conducción peligrosa - riesgo de lesión pulmonar';
        default: return '';
      }
    };

    return (
      <Box sx={{ mt: 2 }}>
        <Alert 
          severity={
            calculations.drivingPressureStatus === 'safe' ? 'success' :
            calculations.drivingPressureStatus === 'caution' ? 'warning' : 'error'
          }
          icon={<MonitorHeart />}
        >
          <AlertTitle>
            📊 Presión de Conducción (Driving Pressure): {calculations.drivingPressure} cmH₂O
          </AlertTitle>
          <Typography variant="body2">
            {getMessage()}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            🧮 Cálculo: Plateau - PEEP = {calculations.estimatedPlateau} - {pressureOxygenParameters.peep} = {calculations.drivingPressure} cmH₂O
          </Typography>
          <Box sx={{ mt: 1 }}>
            <LinearProgress
              variant="determinate"
              value={Math.min((calculations.drivingPressure / 25) * 100, 100)}
              color={
                calculations.drivingPressureStatus === 'safe' ? 'success' :
                calculations.drivingPressureStatus === 'caution' ? 'warning' : 'error'
              }
              sx={{ height: 8, borderRadius: 4 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              🎯 Objetivo: {'<'}15 cmH₂O | ⚠️ Límite: 20 cmH₂O | 🚨 Peligroso: {'>'}20 cmH₂O
            </Typography>
          </Box>
        </Alert>
      </Box>
    );
  };

  const ParameterEvaluations = () => {
    const evaluations = [
      calculations.peepEvaluation,
      calculations.fio2Evaluation,
      calculations.pressureEvaluation
    ].filter(Boolean);

    if (!evaluations.length) return null;

    return (
      <Box sx={{ mt: 2 }}>
        <Divider sx={{ mb: 2 }}>
          <Chip
            icon={<Science />}
            label="🔬 Evaluación de Parámetros VentyLab"
            size="small"
            variant="outlined"
            sx={{ 
              color: theme.palette.primary.main,
              borderColor: theme.palette.primary.main
            }}
          />
        </Divider>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
          {evaluations.map((evaluation, index) => (
            <Box sx={{ flex: 1 }} key={index}>
              <Box
                sx={{
                  p: 2,
                  backgroundColor: 
                    evaluation.status === 'optimal' ? alpha(theme.palette.success.main, 0.05) :
                    evaluation.status === 'moderate' ? alpha(theme.palette.info.main, 0.05) :
                    evaluation.status === 'high' || evaluation.status === 'danger' ? alpha(theme.palette.error.main, 0.05) :
                    alpha(theme.palette.warning.main, 0.05),
                  borderRadius: 2,
                  border: `1px solid ${
                    evaluation.status === 'optimal' ? alpha(theme.palette.success.main, 0.2) :
                    evaluation.status === 'moderate' ? alpha(theme.palette.info.main, 0.2) :
                    evaluation.status === 'high' || evaluation.status === 'danger' ? alpha(theme.palette.error.main, 0.2) :
                    alpha(theme.palette.warning.main, 0.2)
                  }`
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                  {evaluation.recommendation}
                </Typography>
                {evaluation.note && (
                  <Typography variant="caption" color="text.secondary">
                    {evaluation.note}
                  </Typography>
                )}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  const OxygenationIndex = () => {
    if (!calculations.oxygenationIndex) return null;

    const getSeverity = () => {
      if (calculations.oxygenationIndex < 5) return 'success';
      if (calculations.oxygenationIndex < 15) return 'warning';
      return 'error';
    };

    const getMessage = () => {
      if (calculations.oxygenationIndex < 5) return '🟢 VentyLab: Oxigenación excelente';
      if (calculations.oxygenationIndex < 15) return '🟡 VentyLab: Oxigenación moderada - requiere monitoreo';
      return '🔴 VentyLab: Oxigenación severamente comprometida';
    };

    return (
      <Box sx={{ mt: 2 }}>
        <Alert severity={getSeverity()} icon={<Thermostat />}>
          <AlertTitle>
            🫁 Índice de Oxigenación Estimado: {calculations.oxygenationIndex}
          </AlertTitle>
          <Typography variant="body2">
            {getMessage()}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            📊 PaO₂/FiO₂ estimado: {calculations.estimatedPF} | *Valores estimados para fines educativos VentyLab
          </Typography>
        </Alert>
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
            📚 Conceptos Clave VentyLab: Presión y Oxigenación
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" color="primary.main" gutterBottom>
              ⚡ PEEP (Presión Positiva Espiratoria)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              🎯 <strong>Función:</strong> Mantiene los alvéolos abiertos al final de la espiración.<br/>
              💡 <strong>Beneficio:</strong> Mejora oxigenación y previene atelectrauma.<br/>
              ⚠️ <strong>Riesgo:</strong> Puede afectar el retorno venoso.<br/>
              🛡️ <strong>SDRA:</strong> Requiere PEEP alto (8-18 cmH₂O).
            </Typography>
          </Box>
          
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" color="primary.main" gutterBottom>
              🧪 FiO₂ (Fracción Inspirada de Oxígeno)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              🎯 <strong>Función:</strong> Concentración de oxígeno en el aire inspirado.<br/>
              ⚠️ <strong>Toxicidad:</strong> FiO₂ {'>'}60% por tiempo prolongado es peligrosa.<br/>
              🫁 <strong>EPOC:</strong> Mantener SpO₂ 88-92% (no más).<br/>
              💉 <strong>Normal:</strong> Target SpO₂ {'>'} 94%.
            </Typography>
          </Box>
          
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" color="primary.main" gutterBottom>
              📊 Presión de Conducción
            </Typography>
            <Typography variant="body2" color="text.secondary">
              🧮 <strong>Cálculo:</strong> Presión plateau - PEEP.<br/>
              💡 <strong>Significado:</strong> Presión necesaria para ventilar.<br/>
              🛡️ <strong>Protección:</strong> Mantener {'<'}15 cmH₂O.<br/>
              🎯 <strong>Objetivo:</strong> Menor presión, menor lesión pulmonar.
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
            <Compress sx={{ color: 'primary.main', fontSize: 36 }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h3" sx={{ color: 'primary.main', fontWeight: 700, mb: 1 }}>
              🫁 Presión y Oxigenación
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 500 }}>
              🎯 <strong>VentyLab:</strong> Parámetros críticos para oxigenación segura y protección pulmonar
            </Typography>
          </Box>
          <Tooltip title="🎓 VentyLab: Estos parámetros determinan la oxigenación y el riesgo de lesión pulmonar" arrow>
            <IconButton
              sx={{
                bgcolor: alpha(theme.palette.info.main, 0.1),
                color: 'info.main',
                '&:hover': { bgcolor: alpha(theme.palette.info.main, 0.2) }
              }}
            >
              <Psychology />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Campos del formulario */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 4 }}>
          {/* PEEP */}
          <Box sx={{ flex: 1 }}>
            <PEEPField
              label="⚡ PEEP"
              value={pressureOxygenParameters.peep}
              onChange={(value) => onUpdatePressureOxygenParameters('peep', value)}
              error={errors.peep}
              placeholder="PEEP en cmH₂O"
              description="🎯 Presión Positiva al Final de la Espiración"
              range={contextualRanges?.peep}
              showRange
              required
              readOnly={readOnly}
              medicalAlert={
                calculations.peepEvaluation?.status === 'high' ? 
                calculations.peepEvaluation.recommendation : 
                undefined
              }
              data-testid="pressure-peep"
            />
          </Box>

          {/* FiO₂ */}
          <Box sx={{ flex: 1 }}>
            <FiO2Field
              label="🧪 FiO₂"
              value={pressureOxygenParameters.fio2}
              onChange={(value) => onUpdatePressureOxygenParameters('fio2', value)}
              error={errors.fio2}
              placeholder="FiO₂ en %"
              description="💨 Fracción Inspirada de Oxígeno"
              range={contextualRanges?.fio2}
              showRange
              required
              readOnly={readOnly}
              medicalAlert={
                calculations.fio2Evaluation?.status === 'high' ? 
                calculations.fio2Evaluation.recommendation : 
                undefined
              }
              data-testid="pressure-fio2"
            />
          </Box>

          {/* Presión pico */}
          <Box sx={{ flex: 1 }}>
            <PeakPressureField
              label="📊 Presión Pico"
              value={pressureOxygenParameters.peakPressure}
              onChange={(value) => onUpdatePressureOxygenParameters('peakPressure', value)}
              error={errors.peakPressure}
              placeholder="PIP en cmH₂O"
              description="🚀 Presión Inspiratoria Pico"
              range={contextualRanges?.peakPressure}
              showRange
              required
              readOnly={readOnly}
              medicalAlert={
                calculations.pressureEvaluation?.status === 'high' ? 
                calculations.pressureEvaluation.recommendation : 
                undefined
              }
              data-testid="pressure-peak"
            />
          </Box>
        </Box>

        {/* Indicador de presión de conducción */}
        <DrivingPressureIndicator />

        {/* Evaluaciones de parámetros */}
        <ParameterEvaluations />

        {/* Índice de oxigenación */}
        <OxygenationIndex />

        {/* Alertas médicas */}
        <MedicalAlerts />

        {/* Información educativa */}
        <EducationalInfo />
      </CardContent>
    </Card>
  );
}