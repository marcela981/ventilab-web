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
  Paper,
  LinearProgress,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  Timeline,
  Tune,
  Speed,
  AccessTime,
  Info,
  Warning,
  Science,
  ShowChart,
  Functions,
  Psychology,
  MonitorHeart,
  BarChart
} from '@mui/icons-material';
import { 
  InspiratoryTimeField,
  TriggerSensitivityField 
} from '../../ui/FormField';
import {
  AdvancedParameters as AdvancedParametersType,
  BasicParameters
} from '../../../types/ventilator';
import { calculateIERatio } from '../../../data/parameterRanges';

// ============================================================================
// PROPS E INTERFACES - VentyLab
// ============================================================================

interface AdvancedParametersProps {
  /** Parámetros avanzados actuales */
  advancedParameters: AdvancedParametersType;
  
  /** Parámetros básicos para cálculos cruzados */
  basicParameters: BasicParameters;
  
  /** Función para actualizar parámetros avanzados */
  onUpdateAdvancedParameters: (field: keyof AdvancedParametersType, value: any) => void;
  
  /** Errores de validación */
  errors: {
    inspiratoryTime?: string;
    triggerSensitivity?: string;
  };
  
  /** Rangos contextuales */
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

export default function AdvancedParametersComponent({
  advancedParameters,
  basicParameters,
  onUpdateAdvancedParameters,
  errors,
  contextualRanges,
  medicalAlerts = [],
  showEducationalInfo = true,
  readOnly = false
}: AdvancedParametersProps) {
  const theme = useTheme();

  // ============================================================================
  // CÁLCULOS AUTOMÁTICOS AVANZADOS VentyLab
  // ============================================================================

  const calculations = useMemo(() => {
    const calc: any = {};

    // Calcular tiempo espiratorio y relación I:E
    if (
      typeof advancedParameters.inspiratoryTime === 'number' &&
      typeof basicParameters.respiratoryRate === 'number' &&
      basicParameters.respiratoryRate > 0
    ) {
      const cycleTime = 60 / basicParameters.respiratoryRate;
      calc.cycleTime = cycleTime;
      calc.expiratoryTime = cycleTime - advancedParameters.inspiratoryTime;
      
      if (calc.expiratoryTime > 0) {
        calc.ieRatio = calculateIERatio(
          advancedParameters.inspiratoryTime, 
          basicParameters.respiratoryRate
        );
        
        // Calcular porcentajes del ciclo
        calc.inspiratoryPercentage = (advancedParameters.inspiratoryTime / cycleTime) * 100;
        calc.expiratoryPercentage = (calc.expiratoryTime / cycleTime) * 100;
        
        // Evaluar relación I:E
        const ieNumeric = calc.expiratoryTime / advancedParameters.inspiratoryTime;
        calc.ieEvaluation = evaluateIERatio(ieNumeric);
      } else {
        calc.ieRatio = 'Error: Ti muy alto';
        calc.ieEvaluation = { status: 'error', message: '🚨 VentyLab: Tiempo inspiratorio excesivo - riesgo de auto-PEEP' };
      }
    }

    // Evaluar tiempo inspiratorio
    if (typeof advancedParameters.inspiratoryTime === 'number') {
      calc.inspiratoryTimeEvaluation = evaluateInspiratoryTime(
        advancedParameters.inspiratoryTime,
        basicParameters.respiratoryRate
      );
    }

    // Evaluar sensibilidad del trigger
    if (typeof advancedParameters.triggerSensitivity === 'number') {
      calc.triggerSensitivityEvaluation = evaluateTriggerSensitivity(
        advancedParameters.triggerSensitivity
      );
    }

    // Calcular flujo inspiratorio estimado (si hay volumen tidal)
    if (
      typeof basicParameters.tidalVolume === 'number' &&
      typeof advancedParameters.inspiratoryTime === 'number' &&
      advancedParameters.inspiratoryTime > 0
    ) {
      calc.estimatedFlow = (basicParameters.tidalVolume / 1000) / (advancedParameters.inspiratoryTime / 60); // L/min
      calc.flowEvaluation = evaluateFlow(calc.estimatedFlow);
    }

    return calc;
  }, [advancedParameters, basicParameters]);

  // ============================================================================
  // FUNCIONES DE EVALUACIÓN BASADAS EN EVIDENCIA VentyLab
  // ============================================================================

  function evaluateIERatio(ratio: number) {
    if (ratio < 1) {
      return {
        status: 'error',
        message: '🚨 VentyLab: Relación I:E invertida - alto riesgo de auto-PEEP y compromiso hemodinámico',
        severity: 'error'
      };
    } else if (ratio < 1.5) {
      return {
        status: 'warning',
        message: '⚠️ VentyLab: Relación I:E corta - monitorizar auto-PEEP estrechamente',
        severity: 'warning'
      };
    } else if (ratio > 4) {
      return {
        status: 'warning',
        message: '📉 VentyLab: Relación I:E muy larga - puede afectar ventilación alveolar',
        severity: 'warning'
      };
    } else {
      return {
        status: 'optimal',
        message: '✅ VentyLab: Relación I:E adecuada para ventilación segura',
        severity: 'success'
      };
    }
  }

  function evaluateInspiratoryTime(ti: number, rr?: number | '') {
    if (ti < 0.5) {
      return {
        status: 'warning',
        message: '⚡ VentyLab: Tiempo inspiratorio muy corto - puede afectar distribución de gas'
      };
    } else if (ti > 2.5) {
      return {
        status: 'warning',
        message: '🕐 VentyLab: Tiempo inspiratorio muy largo - alto riesgo de auto-PEEP'
      };
    } else if (typeof rr === 'number' && rr > 0) {
      const maxTi = (60 / rr) * 0.6; // Máximo 60% del ciclo
      if (ti > maxTi) {
        return {
          status: 'error',
          message: `🚨 VentyLab: Ti excesivo para FR ${rr} (máximo ~${maxTi.toFixed(1)}s) - ajustar inmediatamente`
        };
      }
    }
    
    return {
      status: 'optimal',
      message: '✅ VentyLab: Tiempo inspiratorio apropiado para distribución óptima'
    };
  }

  function evaluateTriggerSensitivity(sensitivity: number) {
    if (sensitivity < 1) {
      return {
        status: 'warning',
        message: '🔄 VentyLab: Sensibilidad muy alta - riesgo de auto-trigger y asincronía'
      };
    } else if (sensitivity > 4) {
      return {
        status: 'warning',
        message: '💪 VentyLab: Sensibilidad baja - puede aumentar trabajo respiratorio del paciente'
      };
    } else {
      return {
        status: 'optimal',
        message: '✅ VentyLab: Sensibilidad apropiada para sincronización paciente-ventilador'
      };
    }
  }

  function evaluateFlow(flow: number) {
    if (flow < 20) {
      return {
        status: 'warning',
        message: '🐌 VentyLab: Flujo muy bajo - puede prolongar excesivamente la inspiración'
      };
    } else if (flow > 80) {
      return {
        status: 'warning',
        message: '💨 VentyLab: Flujo muy alto - puede causar turbulencia y distribución desigual'
      };
    } else {
      return {
        status: 'optimal',
        message: '✅ VentyLab: Flujo apropiado para distribución uniforme'
      };
    }
  }

  // ============================================================================
  // COMPONENTES EDUCATIVOS AVANZADOS VentyLab
  // ============================================================================

  const CycleTimeVisualization = () => {
    if (!calculations.cycleTime || !calculations.expiratoryTime) return null;

    return (
      <Box sx={{ mt: 2 }}>
        <Divider sx={{ mb: 2 }}>
          <Chip
            icon={<Timeline />}
            label="📊 Visualización del Ciclo Respiratorio VentyLab"
            size="small"
            variant="outlined"
            sx={{ 
              color: theme.palette.primary.main,
              borderColor: theme.palette.primary.main,
              fontWeight: 600
            }}
          />
        </Divider>

        <Paper 
          elevation={2} 
          sx={{ 
            p: 3, 
            backgroundColor: alpha(theme.palette.primary.main, 0.02),
            border: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            borderRadius: 3
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
            {/* Gráfico de barras del ciclo */}
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" gutterBottom color="primary.main" sx={{ fontWeight: 600 }}>
                📈 Distribución del Ciclo Respiratorio
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="caption" sx={{ width: 80, fontWeight: 500 }}>
                    🫁 Inspiración
                  </Typography>
                  <Box sx={{ flex: 1, mx: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={calculations.inspiratoryPercentage}
                      color="primary"
                      sx={{ height: 12, borderRadius: 1 }}
                    />
                  </Box>
                  <Typography variant="caption" sx={{ width: 60, textAlign: 'right', fontWeight: 500 }}>
                    {calculations.inspiratoryPercentage?.toFixed(1)}%
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ width: 80, fontWeight: 500 }}>
                    💨 Espiración
                  </Typography>
                  <Box sx={{ flex: 1, mx: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={calculations.expiratoryPercentage}
                      color="success"
                      sx={{ height: 12, borderRadius: 1 }}
                    />
                  </Box>
                  <Typography variant="caption" sx={{ width: 60, textAlign: 'right', fontWeight: 500 }}>
                    {calculations.expiratoryPercentage?.toFixed(1)}%
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Valores calculados */}
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" gutterBottom color="primary.main" sx={{ fontWeight: 600 }}>
                🧮 Valores Calculados VentyLab
              </Typography>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ flex: 1, minWidth: 120 }}>
                  <Box sx={{ textAlign: 'center', p: 1.5, backgroundColor: alpha(theme.palette.primary.main, 0.05), borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                      ⏱️ Tiempo de Ciclo
                    </Typography>
                    <Typography variant="h6" color="primary.main" sx={{ fontWeight: 700 }}>
                      {calculations.cycleTime?.toFixed(2)}s
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ flex: 1, minWidth: 120 }}>
                  <Box sx={{ textAlign: 'center', p: 1.5, backgroundColor: alpha(theme.palette.success.main, 0.05), borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                      💨 Tiempo Espiratorio
                    </Typography>
                    <Typography variant="h6" color="success.main" sx={{ fontWeight: 700 }}>
                      {calculations.expiratoryTime?.toFixed(2)}s
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ flex: 1, minWidth: 120 }}>
                  <Box sx={{ textAlign: 'center', p: 1.5, backgroundColor: alpha(theme.palette.info.main, 0.05), borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                      ⚖️ Relación I:E
                    </Typography>
                    <Typography variant="h6" color="info.main" sx={{ fontWeight: 700 }}>
                      {calculations.ieRatio}
                    </Typography>
                  </Box>
                </Box>
                
                {calculations.estimatedFlow && (
                  <Box sx={{ flex: 1, minWidth: 120 }}>
                    <Box sx={{ textAlign: 'center', p: 1.5, backgroundColor: alpha(theme.palette.warning.main, 0.05), borderRadius: 2 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                        🌪️ Flujo Estimado
                      </Typography>
                      <Typography variant="h6" color="warning.main" sx={{ fontWeight: 700 }}>
                        {calculations.estimatedFlow.toFixed(1)} L/min
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        </Paper>
      </Box>
    );
  };

  const ParameterEvaluations = () => {
    const evaluations = [
      calculations.ieEvaluation,
      calculations.inspiratoryTimeEvaluation,
      calculations.triggerSensitivityEvaluation,
      calculations.flowEvaluation
    ].filter(Boolean);

    if (!evaluations.length) return null;

    return (
      <Box sx={{ mt: 2 }}>
        <Divider sx={{ mb: 2 }}>
          <Chip
            icon={<Science />}
            label="🔬 Evaluación Inteligente VentyLab"
            size="small"
            variant="outlined"
            sx={{ 
              color: theme.palette.primary.main,
              borderColor: theme.palette.primary.main,
              fontWeight: 600
            }}
          />
        </Divider>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {evaluations.map((evaluation, index) => (
            <Alert 
              key={index}
              severity={evaluation.severity || 'info'}
              icon={
                evaluation.status === 'optimal' ? <Science /> :
                evaluation.status === 'warning' ? <Warning /> :
                <MonitorHeart />
              }
              sx={{ borderRadius: 2 }}
            >
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {evaluation.message}
              </Typography>
            </Alert>
          ))}
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
            sx={{ mb: 1, borderRadius: 2 }}
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
            📚 Conceptos Avanzados VentyLab: Mecánica Respiratoria
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" color="primary.main" gutterBottom sx={{ fontWeight: 600 }}>
              ⏱️ Tiempo Inspiratorio (Ti)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              🎯 <strong>Función:</strong> Controla la duración de la fase inspiratoria.<br/>
              ⚡ <strong>Efecto:</strong> Tiempos más largos mejoran distribución de gas.<br/>
              ⚠️ <strong>Riesgo:</strong> Ti excesivo causa auto-PEEP.<br/>
              📏 <strong>Rango típico:</strong> 0.8-1.2 segundos.
            </Typography>
          </Box>
          
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" color="primary.main" gutterBottom sx={{ fontWeight: 600 }}>
              ⚖️ Relación I:E (Inspiración:Espiración)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              🎯 <strong>Función:</strong> Proporción entre tiempos inspiratorio y espiratorio.<br/>
              ✅ <strong>Normal:</strong> 1:2 a 1:4 (espiración más larga).<br/>
              🚨 <strong>Peligro:</strong> Relaciones invertidas ({'<'}1:1) causan atrapamiento.<br/>
              💔 <strong>Consecuencia:</strong> Compromiso hemodinámico severo.
            </Typography>
          </Box>
          
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" color="primary.main" gutterBottom sx={{ fontWeight: 600 }}>
              🔄 Sensibilidad del Trigger
            </Typography>
            <Typography variant="body2" color="text.secondary">
              🎯 <strong>Función:</strong> Esfuerzo necesario para iniciar respiración.<br/>
              🔄 <strong>Muy sensible:</strong> Auto-trigger y asincronía.<br/>
              💪 <strong>Poco sensible:</strong> Aumento del trabajo respiratorio.<br/>
              ⚖️ <strong>Balance:</strong> 1-4 L/min para sincronización óptima.
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mt: 3, p: 3, backgroundColor: alpha(theme.palette.error.main, 0.05), borderRadius: 3, border: `1px solid ${alpha(theme.palette.error.main, 0.2)}` }}>
          <Typography variant="subtitle2" color="error.main" gutterBottom sx={{ fontWeight: 600 }}>
            🚨 Concepto Crítico VentyLab: Auto-PEEP
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Definición:</strong> Presión positiva residual en alvéolos por vaciado incompleto.<br/>
            <strong>Causas:</strong> Te corto, Ti largo, obstrucción bronquial, FR alta.<br/>
            <strong>Detección:</strong> Relación I:E {'<'}1:1.5, plateau en curva de flujo espiratorio.<br/>
            <strong>Consecuencias:</strong> Barotrauma, compromiso hemodinámico, asincronía.<br/>
            <strong>Manejo:</strong> ↓Ti, ↓FR, broncodilatadores, ↑Te.
          </Typography>
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
            <Tune sx={{ color: 'primary.main', fontSize: 36 }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h3" sx={{ color: 'primary.main', fontWeight: 700, mb: 1 }}>
              ⚡ Parámetros Avanzados
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 500 }}>
              🎯 <strong>VentyLab:</strong> Configuración avanzada de tiempos respiratorios y sincronización
            </Typography>
          </Box>
          <Tooltip title="🎓 VentyLab: Estos parámetros controlan la mecánica respiratoria fina y la sincronización paciente-ventilador" arrow>
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
          {/* Tiempo inspiratorio */}
          <Box sx={{ flex: 1 }}>
            <InspiratoryTimeField
              label="⏱️ Tiempo Inspiratorio"
              value={advancedParameters.inspiratoryTime}
              onChange={(value) => onUpdateAdvancedParameters('inspiratoryTime', value)}
              error={errors.inspiratoryTime}
              placeholder="Ti en segundos"
              description="🎯 Duración de la fase inspiratoria"
              range={contextualRanges?.inspiratoryTime}
              showRange
              required
              readOnly={readOnly}
              medicalAlert={
                calculations.inspiratoryTimeEvaluation?.status !== 'optimal' ? 
                calculations.inspiratoryTimeEvaluation?.message : 
                undefined
              }
              data-testid="advanced-inspiratory-time"
            />
          </Box>

          {/* Sensibilidad trigger */}
          <Box sx={{ flex: 1 }}>
            <TriggerSensitivityField
              label="🔄 Sensibilidad Trigger"
              value={advancedParameters.triggerSensitivity}
              onChange={(value) => onUpdateAdvancedParameters('triggerSensitivity', value)}
              error={errors.triggerSensitivity}
              placeholder="Sensibilidad en L/min"
              description="⚖️ Sensibilidad del trigger por flujo"
              range={contextualRanges?.triggerSensitivity}
              showRange
              required
              readOnly={readOnly}
              medicalAlert={
                calculations.triggerSensitivityEvaluation?.status !== 'optimal' ? 
                calculations.triggerSensitivityEvaluation?.message : 
                undefined
              }
              data-testid="advanced-trigger-sensitivity"
            />
          </Box>
        </Box>

        {/* Visualización del ciclo respiratorio */}
        <CycleTimeVisualization />

        {/* Evaluaciones de parámetros */}
        <ParameterEvaluations />

        {/* Alertas médicas */}
        <MedicalAlerts />

        {/* Información educativa */}
        <EducationalInfo />
      </CardContent>
    </Card>
  );
}