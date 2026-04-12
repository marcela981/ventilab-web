/**
 * =============================================================================
 * ClinicalCase Component for VentyLab
 * =============================================================================
 *
 * Interactive clinical case component for mechanical ventilation teaching module.
 * Implements a multi-step wizard that guides students through a realistic clinical
 * scenario, allowing them to make decisions and configure ventilator parameters.
 *
 * Features:
 * - Step 1: Patient presentation with vital signs and initial assessment
 * - Step 2: Complementary exams (gasometry, radiology, labs) with color-coded values
 * - Step 3: Ventilatory modality selection with clinical decision-making
 * - Step 4: Parameter configuration with real-time validation and safety warnings
 * - Step 5: Expert feedback comparing student choices with optimal configuration
 * - Progress tracking and performance scoring
 * - Responsive design for desktop, tablet, and mobile
 * - Integration with learning progress system
 *
 * @component
 * @example
 * ```jsx
 * const caseData = {
 *   caseId: "case-01-ards",
 *   title: "SDRA Severo en Paciente COVID-19",
 *   patientInfo: {
 *     age: 65,
 *     sex: "Masculino",
 *     weight: 75,
 *     height: 170,
 *     admissionReason: "Insuficiencia respiratoria aguda",
 *     vitalSigns: {
 *       hr: 110,
 *       bp: "140/85",
 *       rr: 32,
 *       spo2: 85,
 *       temp: 38.5
 *     },
 *     physicalExam: "Crepitantes bilaterales, uso de musculatura accesoria"
 *   },
 *   complementaryExams: {
 *     gasometry: {
 *       ph: { value: 7.28, normal: [7.35, 7.45] },
 *       pao2: { value: 55, normal: [80, 100] },
 *       paco2: { value: 52, normal: [35, 45] },
 *       hco3: { value: 24, normal: [22, 26] },
 *       sao2: { value: 85, normal: [95, 100] }
 *     },
 *     labs: {
 *       wbc: { value: 15000, normal: [4000, 11000], unit: "/mm³" },
 *       crp: { value: 120, normal: [0, 10], unit: "mg/L" }
 *     },
 *     imaging: "Rx: Infiltrados bilaterales difusos compatibles con SDRA"
 *   },
 *   modalityOptions: [
 *     { id: "vcv", name: "VCV", description: "Volumen controlado..." },
 *     { id: "pcv", name: "PCV", description: "Presión controlada..." },
 *     { id: "prvc", name: "PRVC", description: "Presión regulada..." }
 *   ],
 *   parameters: {
 *     mode: ["vcv", "pcv", "prvc"],
 *     vt: { min: 4, max: 8, unit: "ml/kg" },
 *     rr: { min: 12, max: 25, unit: "rpm" },
 *     fio2: { min: 40, max: 100, unit: "%" },
 *     peep: { min: 5, max: 15, unit: "cmH₂O" },
 *     pinsp: { min: 15, max: 30, unit: "cmH₂O" }
 *   },
 *   correctSolution: {
 *     modality: "pcv",
 *     reasoning: "En SDRA severo, PCV permite mejor control...",
 *     parameters: {
 *       vt: 6,
 *       rr: 18,
 *       fio2: 80,
 *       peep: 12,
 *       pinsp: 25
 *     },
 *     explanations: {
 *       vt: "6 ml/kg es protector...",
 *       peep: "PEEP elevado mantiene reclutamiento..."
 *     }
 *   }
 * };
 *
 * <ClinicalCase caseData={caseData} onComplete={(result) => console.log(result)} />
 * ```
 *
 * @param {Object} props - Component props
 * @param {Object} props.caseData - Clinical case data
 * @param {Function} [props.onComplete] - Callback when case is completed successfully
 */

import React, { useReducer, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  Typography,
  Button,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Grid,
  Slider,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Fade,
  Slide,
  useTheme,
  useMediaQuery,
  styled,
  alpha,
} from '@mui/material';
import {
  Person as PersonIcon,
  Favorite as HeartIcon,
  Speed as BpIcon,
  Air as RespIcon,
  Thermostat as TempIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  LocalHospital as HospitalIcon,
  Science as LabIcon,
  Vaccines as VaccinesIcon,
  TrendingUp as TrendingIcon,
  ArrowBack as BackIcon,
  ArrowForward as ForwardIcon,
  EmojiEvents as TrophyIcon,
} from '@mui/icons-material';

// ============================================================================
// Styled Components
// ============================================================================

const CaseContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  backgroundColor: 'transparent',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: theme.shape.borderRadius,
  transition: 'all 0.3s ease',
}));

const StepCard = styled(Card)(({ theme }) => ({
  marginTop: theme.spacing(3),
  backgroundColor: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
}));

const VitalSignBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1.5),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: 'rgba(33, 150, 243, 0.08)',
  border: '1px solid rgba(33, 150, 243, 0.2)',
}));

const ModalityButton = styled(Button)(({ theme, selected }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  textAlign: 'left',
  justifyContent: 'flex-start',
  border: selected ? `2px solid ${theme.palette.primary.main}` : '1px solid rgba(255, 255, 255, 0.2)',
  backgroundColor: selected ? alpha(theme.palette.primary.main, 0.15) : 'rgba(255, 255, 255, 0.03)',
  transition: 'all 0.3s ease',
  '&:hover': {
    backgroundColor: selected ? alpha(theme.palette.primary.main, 0.2) : 'rgba(255, 255, 255, 0.08)',
    borderColor: theme.palette.primary.main,
  },
}));

const ParameterSlider = styled(Slider)(({ theme, status }) => {
  let color = theme.palette.primary.main;
  if (status === 'warning') color = theme.palette.warning.main;
  if (status === 'danger') color = theme.palette.error.main;

  return {
    color,
    '& .MuiSlider-thumb': {
      backgroundColor: color,
    },
    '& .MuiSlider-track': {
      backgroundColor: color,
    },
  };
});

// ============================================================================
// Constants
// ============================================================================

const STEPS = [
  'Presentación del Caso',
  'Exámenes Complementarios',
  'Selección de Modalidad',
  'Configuración de Parámetros',
  'Retroalimentación'
];

// ============================================================================
// Reducer for Complex State Management
// ============================================================================

const initialState = {
  currentStep: 0,
  selectedModality: null,
  parameters: {},
  answers: {},
  showHints: false,
  startTime: Date.now(),
  completionTime: null,
  score: null,
  validationWarnings: [],
};

function caseReducer(state, action) {
  switch (action.type) {
    case 'NEXT_STEP':
      return {
        ...state,
        currentStep: Math.min(state.currentStep + 1, STEPS.length - 1),
      };

    case 'PREV_STEP':
      return {
        ...state,
        currentStep: Math.max(state.currentStep - 1, 0),
      };

    case 'SET_MODALITY':
      return {
        ...state,
        selectedModality: action.payload,
      };

    case 'SET_PARAMETER':
      return {
        ...state,
        parameters: {
          ...state.parameters,
          [action.payload.name]: action.payload.value,
        },
      };

    case 'SET_ANSWER':
      return {
        ...state,
        answers: {
          ...state.answers,
          [action.payload.key]: action.payload.value,
        },
      };

    case 'TOGGLE_HINTS':
      return {
        ...state,
        showHints: !state.showHints,
      };

    case 'SET_WARNINGS':
      return {
        ...state,
        validationWarnings: action.payload,
      };

    case 'COMPLETE_CASE':
      return {
        ...state,
        completionTime: Date.now(),
        score: action.payload.score,
        currentStep: STEPS.length - 1,
      };

    case 'RESET':
      return {
        ...initialState,
        startTime: Date.now(),
      };

    default:
      return state;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Determines if a lab value is normal, borderline, or abnormal
 * @param {number} value - The measured value
 * @param {Array<number>} normalRange - [min, max] normal range
 * @returns {'normal'|'borderline'|'abnormal'}
 */
function getValueStatus(value, normalRange) {
  if (!normalRange || normalRange.length !== 2) return 'normal';

  const [min, max] = normalRange;
  const margin = (max - min) * 0.1; // 10% margin for borderline

  if (value >= min && value <= max) return 'normal';
  if ((value >= min - margin && value < min) || (value > max && value <= max + margin)) {
    return 'borderline';
  }
  return 'abnormal';
}

/**
 * Gets color based on value status
 * @param {'normal'|'borderline'|'abnormal'} status
 * @returns {string} MUI color name
 */
function getStatusColor(status) {
  switch (status) {
    case 'normal':
      return 'success';
    case 'borderline':
      return 'warning';
    case 'abnormal':
      return 'error';
    default:
      return 'default';
  }
}

/**
 * Validates ventilator parameters and returns warnings
 * @param {Object} parameters - Current parameter values
 * @param {Object} parameterRanges - Parameter definitions with ranges
 * @param {number} patientWeight - Patient weight in kg
 * @returns {Array<Object>} Array of warning objects
 */
function validateParameters(parameters, parameterRanges, patientWeight = 70) {
  const warnings = [];

  // Validate Vt (tidal volume)
  if (parameters.vt !== undefined && parameterRanges.vt) {
    if (parameters.vt > 8) {
      warnings.push({
        severity: 'error',
        parameter: 'vt',
        message: `Cuidado: Volumen tidal mayor a 8 ml/kg puede causar volutrauma. Valor actual: ${parameters.vt} ml/kg`,
      });
    } else if (parameters.vt < 4) {
      warnings.push({
        severity: 'warning',
        parameter: 'vt',
        message: `Advertencia: Volumen tidal menor a 4 ml/kg puede ser insuficiente. Valor actual: ${parameters.vt} ml/kg`,
      });
    } else if (parameters.vt > 6 && parameters.vt <= 8) {
      warnings.push({
        severity: 'warning',
        parameter: 'vt',
        message: 'Considera ventilación protectora: 6 ml/kg es el objetivo en SDRA',
      });
    }
  }

  // Validate PEEP
  if (parameters.peep !== undefined && parameterRanges.peep) {
    if (parameters.peep > 15) {
      warnings.push({
        severity: 'error',
        parameter: 'peep',
        message: `Cuidado: PEEP mayor a 15 cmH₂O puede causar barotrauma y compromiso hemodinámico. Valor actual: ${parameters.peep} cmH₂O`,
      });
    } else if (parameters.peep < 5) {
      warnings.push({
        severity: 'warning',
        parameter: 'peep',
        message: 'PEEP menor a 5 cmH₂O puede ser insuficiente para mantener reclutamiento alveolar',
      });
    }
  }

  // Validate FiO2
  if (parameters.fio2 !== undefined && parameterRanges.fio2) {
    if (parameters.fio2 > 60) {
      warnings.push({
        severity: 'warning',
        parameter: 'fio2',
        message: `FiO2 elevado (${parameters.fio2}%) puede causar toxicidad por oxígeno si se mantiene prolongadamente`,
      });
    }
  }

  // Validate RR (respiratory rate)
  if (parameters.rr !== undefined && parameterRanges.rr) {
    if (parameters.rr > 25) {
      warnings.push({
        severity: 'warning',
        parameter: 'rr',
        message: `Frecuencia respiratoria alta (${parameters.rr} rpm) puede causar atrapamiento aéreo`,
      });
    } else if (parameters.rr < 10) {
      warnings.push({
        severity: 'warning',
        parameter: 'rr',
        message: 'Frecuencia respiratoria baja puede causar hipoventilación',
      });
    }
  }

  // Validate Pinsp (inspiratory pressure)
  if (parameters.pinsp !== undefined && parameterRanges.pinsp) {
    const drivingPressure = parameters.peep ? parameters.pinsp - parameters.peep : parameters.pinsp;
    if (drivingPressure > 15) {
      warnings.push({
        severity: 'error',
        parameter: 'pinsp',
        message: `Presión de conducción alta (${drivingPressure} cmH₂O). Riesgo de lesión pulmonar. Objetivo: <15 cmH₂O`,
      });
    }
  }

  return warnings;
}

/**
 * Calculates performance score based on student choices
 * @param {Object} userChoices - User's modality and parameters
 * @param {Object} correctSolution - Optimal solution
 * @returns {Object} Score details
 */
function calculateScore(userChoices, correctSolution) {
  let totalPoints = 0;
  let earnedPoints = 0;
  const details = {};

  // Modality selection (30 points)
  totalPoints += 30;
  if (userChoices.modality === correctSolution.modality) {
    earnedPoints += 30;
    details.modality = { points: 30, maxPoints: 30, correct: true };
  } else {
    details.modality = { points: 0, maxPoints: 30, correct: false };
  }

  // Parameters (70 points total, distributed among parameters)
  const paramKeys = Object.keys(correctSolution.parameters || {});
  const pointsPerParam = 70 / paramKeys.length;

  paramKeys.forEach(key => {
    totalPoints += pointsPerParam;
    const userValue = userChoices.parameters[key];
    const correctValue = correctSolution.parameters[key];

    if (userValue === undefined) {
      details[key] = { points: 0, maxPoints: pointsPerParam, correct: false };
      return;
    }

    // Calculate tolerance (within 10% is acceptable, within 20% is partial credit)
    const tolerance10 = Math.abs(correctValue * 0.1);
    const tolerance20 = Math.abs(correctValue * 0.2);
    const diff = Math.abs(userValue - correctValue);

    if (diff <= tolerance10) {
      // Full credit
      earnedPoints += pointsPerParam;
      details[key] = { points: pointsPerParam, maxPoints: pointsPerParam, correct: true, difference: diff };
    } else if (diff <= tolerance20) {
      // Partial credit
      const partialPoints = pointsPerParam * 0.5;
      earnedPoints += partialPoints;
      details[key] = { points: partialPoints, maxPoints: pointsPerParam, correct: false, difference: diff };
    } else {
      details[key] = { points: 0, maxPoints: pointsPerParam, correct: false, difference: diff };
    }
  });

  const percentage = Math.round((earnedPoints / totalPoints) * 100);

  return {
    totalPoints,
    earnedPoints: Math.round(earnedPoints),
    percentage,
    details,
  };
}

// ============================================================================
// Main Component
// ============================================================================

const ClinicalCase = ({ caseData, onComplete }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // State management with useReducer
  const [state, dispatch] = useReducer(caseReducer, initialState);

  // ============================================================================
  // Step Navigation Handlers
  // ============================================================================

  const handleNext = useCallback(() => {
    // Validate current step before proceeding
    if (state.currentStep === 2 && !state.selectedModality) {
      return; // Don't proceed without selecting modality
    }

    if (state.currentStep === 3) {
      // Validate and calculate score before showing feedback
      const warnings = validateParameters(
        state.parameters,
        caseData.parameters,
        caseData.patientInfo?.weight
      );
      dispatch({ type: 'SET_WARNINGS', payload: warnings });

      // Calculate score
      const score = calculateScore(
        {
          modality: state.selectedModality,
          parameters: state.parameters,
        },
        caseData.correctSolution
      );

      dispatch({ type: 'COMPLETE_CASE', payload: { score } });

      // Call onComplete callback
      if (onComplete && typeof onComplete === 'function') {
        onComplete({
          caseId: caseData.caseId,
          score: score.percentage,
          timeSpent: Math.round((Date.now() - state.startTime) / 1000), // seconds
          choices: {
            modality: state.selectedModality,
            parameters: state.parameters,
          },
          correct: score.percentage >= 70,
        });
      }
    } else {
      dispatch({ type: 'NEXT_STEP' });
    }
  }, [state, caseData, onComplete]);

  const handleBack = useCallback(() => {
    dispatch({ type: 'PREV_STEP' });
  }, []);

  const handleReset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  // ============================================================================
  // User Input Handlers
  // ============================================================================

  const handleModalitySelect = useCallback((modalityId) => {
    dispatch({ type: 'SET_MODALITY', payload: modalityId });
  }, []);

  const handleParameterChange = useCallback((name, value) => {
    dispatch({ type: 'SET_PARAMETER', payload: { name, value } });
  }, []);

  // Real-time validation
  const currentWarnings = useMemo(() => {
    if (state.currentStep !== 3) return [];
    return validateParameters(
      state.parameters,
      caseData.parameters,
      caseData.patientInfo?.weight
    );
  }, [state.parameters, state.currentStep, caseData.parameters, caseData.patientInfo?.weight]);

  // ============================================================================
  // Step Render Functions
  // ============================================================================

  /**
   * Step 1: Patient Presentation
   */
  const renderStep1 = () => {
    const { patientInfo } = caseData;

    if (!patientInfo) {
      return (
        <Alert severity="warning">
          Información del paciente no disponible
        </Alert>
      );
    }

    const vitalIcons = {
      hr: <HeartIcon color="error" />,
      bp: <BpIcon color="primary" />,
      rr: <RespIcon color="info" />,
      spo2: <VaccinesIcon color="warning" />,
      temp: <TempIcon color="secondary" />,
    };

    return (
      <Fade in timeout={500}>
        <StepCard>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <PersonIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />
              <Box>
                <Typography variant="h5" fontWeight={600}>
                  Información del Paciente
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {patientInfo.age} años • {patientInfo.sex} • {patientInfo.weight}kg • {patientInfo.height}cm
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Motivo de Ingreso
              </Typography>
              <Alert severity="info" icon={<HospitalIcon />}>
                {patientInfo.admissionReason}
              </Alert>
            </Box>

            {patientInfo.vitalSigns && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ mb: 2 }}>
                  Signos Vitales Actuales
                </Typography>
                <Grid container spacing={2}>
                  {Object.entries(patientInfo.vitalSigns).map(([key, value]) => (
                    <Grid item xs={12} sm={6} md={4} key={key}>
                      <VitalSignBox>
                        {vitalIcons[key] || <TrendingIcon />}
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {key === 'hr' && 'Frecuencia Cardíaca'}
                            {key === 'bp' && 'Presión Arterial'}
                            {key === 'rr' && 'Frecuencia Respiratoria'}
                            {key === 'spo2' && 'SpO₂'}
                            {key === 'temp' && 'Temperatura'}
                          </Typography>
                          <Typography variant="h6" fontWeight={600}>
                            {value}
                            {key === 'hr' && ' lpm'}
                            {key === 'bp' && ' mmHg'}
                            {key === 'rr' && ' rpm'}
                            {key === 'spo2' && ' %'}
                            {key === 'temp' && ' °C'}
                          </Typography>
                        </Box>
                      </VitalSignBox>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {patientInfo.physicalExam && (
              <Box>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Hallazgos del Examen Físico
                </Typography>
                <Paper sx={{ p: 2, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                  <Typography variant="body1">
                    {patientInfo.physicalExam}
                  </Typography>
                </Paper>
              </Box>
            )}
          </CardContent>
        </StepCard>
      </Fade>
    );
  };

  /**
   * Step 2: Complementary Exams
   */
  const renderStep2 = () => {
    const { complementaryExams } = caseData;

    if (!complementaryExams) {
      return (
        <Alert severity="warning">
          Exámenes complementarios no disponibles
        </Alert>
      );
    }

    return (
      <Slide direction="left" in timeout={500}>
        <StepCard>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <LabIcon sx={{ fontSize: 40, color: theme.palette.secondary.main }} />
              <Typography variant="h5" fontWeight={600}>
                Resultados de Exámenes Complementarios
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Gasometry */}
            {complementaryExams.gasometry && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Gasometría Arterial
                </Typography>
                <TableContainer component={Paper} sx={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Parámetro</strong></TableCell>
                        <TableCell><strong>Valor</strong></TableCell>
                        <TableCell><strong>Rango Normal</strong></TableCell>
                        <TableCell><strong>Estado</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(complementaryExams.gasometry).map(([key, data]) => {
                        const status = getValueStatus(data.value, data.normal);
                        const color = getStatusColor(status);

                        return (
                          <TableRow key={key}>
                            <TableCell>
                              <strong>{key.toUpperCase()}</strong>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={data.value}
                                color={color}
                                size="small"
                                sx={{ fontWeight: 600 }}
                              />
                            </TableCell>
                            <TableCell>
                              {data.normal ? `${data.normal[0]} - ${data.normal[1]}` : '-'}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={status}
                                color={color}
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* Laboratory */}
            {complementaryExams.labs && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Laboratorios Relevantes
                </Typography>
                <TableContainer component={Paper} sx={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Parámetro</strong></TableCell>
                        <TableCell><strong>Valor</strong></TableCell>
                        <TableCell><strong>Rango Normal</strong></TableCell>
                        <TableCell><strong>Estado</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(complementaryExams.labs).map(([key, data]) => {
                        const status = getValueStatus(data.value, data.normal);
                        const color = getStatusColor(status);

                        return (
                          <TableRow key={key}>
                            <TableCell>
                              <strong>{key.toUpperCase()}</strong>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={`${data.value} ${data.unit || ''}`}
                                color={color}
                                size="small"
                                sx={{ fontWeight: 600 }}
                              />
                            </TableCell>
                            <TableCell>
                              {data.normal ? `${data.normal[0]} - ${data.normal[1]} ${data.unit || ''}` : '-'}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={status}
                                color={color}
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* Imaging */}
            {complementaryExams.imaging && (
              <Box>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Estudios de Imagen
                </Typography>
                <Alert severity="info" icon={<HospitalIcon />}>
                  {complementaryExams.imaging}
                </Alert>
              </Box>
            )}
          </CardContent>
        </StepCard>
      </Slide>
    );
  };

  /**
   * Step 3: Modality Selection
   */
  const renderStep3 = () => {
    const { modalityOptions } = caseData;

    if (!modalityOptions || !Array.isArray(modalityOptions)) {
      return (
        <Alert severity="warning">
          Opciones de modalidad no disponibles
        </Alert>
      );
    }

    return (
      <Fade in timeout={500}>
        <StepCard>
          <CardContent>
            <Typography variant="h5" fontWeight={600} gutterBottom>
              Selección de Modalidad Ventilatoria
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Con base en la información del paciente y los exámenes complementarios,
              selecciona la modalidad ventilatoria más apropiada para este caso.
            </Typography>

            <Divider sx={{ my: 3 }} />

            <Box>
              {modalityOptions.map((option) => (
                <ModalityButton
                  key={option.id}
                  fullWidth
                  variant="outlined"
                  selected={state.selectedModality === option.id}
                  onClick={() => handleModalitySelect(option.id)}
                >
                  <Box sx={{ textAlign: 'left', width: '100%' }}>
                    <Typography variant="h6" fontWeight={600}>
                      {option.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {option.description}
                    </Typography>
                  </Box>
                </ModalityButton>
              ))}
            </Box>

            {state.selectedModality && (
              <Alert severity="success" sx={{ mt: 2 }}>
                Has seleccionado: {modalityOptions.find(o => o.id === state.selectedModality)?.name}
              </Alert>
            )}
          </CardContent>
        </StepCard>
      </Fade>
    );
  };

  /**
   * Step 4: Parameter Configuration
   */
  const renderStep4 = () => {
    const { parameters } = caseData;

    if (!parameters) {
      return (
        <Alert severity="warning">
          Parámetros no disponibles
        </Alert>
      );
    }

    const getParameterStatus = (name, value) => {
      if (!value) return 'normal';

      const paramDef = parameters[name];
      if (!paramDef) return 'normal';

      // Define safe ranges (more conservative than min/max)
      const safeRanges = {
        vt: [5, 7],
        rr: [12, 20],
        fio2: [40, 60],
        peep: [5, 12],
        pinsp: [18, 28],
      };

      const safeRange = safeRanges[name];
      if (!safeRange) return 'normal';

      if (value >= safeRange[0] && value <= safeRange[1]) return 'normal';
      if (value < paramDef.min || value > paramDef.max) return 'danger';
      return 'warning';
    };

    return (
      <Slide direction="left" in timeout={500}>
        <StepCard>
          <CardContent>
            <Typography variant="h5" fontWeight={600} gutterBottom>
              Configuración de Parámetros Ventilatorios
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Configura los parámetros del ventilador. Los indicadores de color te ayudarán:
              <Chip label="Verde = Seguro" color="success" size="small" sx={{ ml: 1 }} />
              <Chip label="Amarillo = Precaución" color="warning" size="small" sx={{ ml: 1 }} />
              <Chip label="Rojo = Peligroso" color="error" size="small" sx={{ ml: 1 }} />
            </Typography>

            <Divider sx={{ my: 3 }} />

            {/* Real-time warnings */}
            {currentWarnings.length > 0 && (
              <Box sx={{ mb: 3 }}>
                {currentWarnings.map((warning, index) => (
                  <Alert
                    key={index}
                    severity={warning.severity}
                    icon={<WarningIcon />}
                    sx={{ mb: 1 }}
                  >
                    {warning.message}
                  </Alert>
                ))}
              </Box>
            )}

            <Grid container spacing={3}>
              {Object.entries(parameters).map(([key, paramDef]) => {
                if (key === 'mode') return null; // Skip mode parameter

                const value = state.parameters[key] || paramDef.min;
                const status = getParameterStatus(key, value);

                return (
                  <Grid item xs={12} md={6} key={key}>
                    <Box sx={{
                      p: 2,
                      borderRadius: 1,
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}>
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        {key === 'vt' && 'Volumen Tidal (Vt)'}
                        {key === 'rr' && 'Frecuencia Respiratoria (RR)'}
                        {key === 'fio2' && 'Fracción Inspirada de O₂ (FiO₂)'}
                        {key === 'peep' && 'PEEP'}
                        {key === 'pinsp' && 'Presión Inspiratoria (Pinsp)'}
                      </Typography>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <ParameterSlider
                          value={value}
                          min={paramDef.min}
                          max={paramDef.max}
                          step={0.5}
                          status={status}
                          onChange={(e, newValue) => handleParameterChange(key, newValue)}
                          marks={[
                            { value: paramDef.min, label: `${paramDef.min}` },
                            { value: paramDef.max, label: `${paramDef.max}` },
                          ]}
                          valueLabelDisplay="auto"
                          sx={{ flex: 1 }}
                        />
                        <TextField
                          type="number"
                          value={value}
                          onChange={(e) => handleParameterChange(key, parseFloat(e.target.value))}
                          inputProps={{
                            min: paramDef.min,
                            max: paramDef.max,
                            step: 0.5,
                          }}
                          sx={{ width: 100 }}
                          size="small"
                        />
                        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 60 }}>
                          {paramDef.unit}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Mín: {paramDef.min} {paramDef.unit}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Máx: {paramDef.max} {paramDef.unit}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </CardContent>
        </StepCard>
      </Slide>
    );
  };

  /**
   * Step 5: Expert Feedback
   */
  const renderStep5 = () => {
    const { correctSolution } = caseData;

    if (!correctSolution || !state.score) {
      return (
        <Alert severity="warning">
          Información de retroalimentación no disponible
        </Alert>
      );
    }

    const score = state.score;
    const timeSpent = Math.round((state.completionTime - state.startTime) / 60000); // minutes

    return (
      <Fade in timeout={500}>
        <StepCard>
          <CardContent>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <TrophyIcon sx={{ fontSize: 60, color: theme.palette.warning.main, mb: 2 }} />
              <Typography variant="h4" fontWeight={600} gutterBottom>
                ¡Caso Completado!
              </Typography>
              <Typography variant="h2" color="primary" fontWeight={700}>
                {score.percentage}%
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Tiempo: {timeSpent} minutos
              </Typography>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Overall Performance */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Evaluación General
              </Typography>
              {score.percentage >= 90 ? (
                <Alert severity="success" icon={<CheckIcon />}>
                  ¡Excelente! Demuestras un dominio excepcional de los principios de ventilación mecánica.
                </Alert>
              ) : score.percentage >= 70 ? (
                <Alert severity="success" icon={<CheckIcon />}>
                  ¡Muy bien! Tu comprensión es sólida, pero hay áreas de mejora.
                </Alert>
              ) : (
                <Alert severity="warning" icon={<WarningIcon />}>
                  Te recomendamos revisar los conceptos antes de continuar con casos más complejos.
                </Alert>
              )}
            </Box>

            {/* Modality Selection Feedback */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Selección de Modalidad
              </Typography>
              <Paper sx={{ p: 2, backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  {score.details.modality?.correct ? (
                    <CheckIcon color="success" />
                  ) : (
                    <WarningIcon color="warning" />
                  )}
                  <Typography variant="body1">
                    Tu selección: <strong>{state.selectedModality?.toUpperCase()}</strong>
                  </Typography>
                </Box>

                {!score.details.modality?.correct && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Modalidad óptima: <strong>{correctSolution.modality.toUpperCase()}</strong>
                  </Alert>
                )}

                <Typography variant="body2" paragraph>
                  <strong>Justificación:</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {correctSolution.reasoning}
                </Typography>
              </Paper>
            </Box>

            {/* Parameter Configuration Feedback */}
            <Box>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Configuración de Parámetros
              </Typography>
              <Grid container spacing={2}>
                {Object.entries(correctSolution.parameters || {}).map(([key, correctValue]) => {
                  const userValue = state.parameters[key];
                  const detail = score.details[key];
                  const isCorrect = detail?.correct;
                  const explanation = correctSolution.explanations?.[key];

                  return (
                    <Grid item xs={12} md={6} key={key}>
                      <Paper sx={{
                        p: 2,
                        backgroundColor: isCorrect
                          ? alpha(theme.palette.success.main, 0.1)
                          : alpha(theme.palette.warning.main, 0.1),
                        border: `1px solid ${isCorrect
                          ? theme.palette.success.main
                          : theme.palette.warning.main}`,
                      }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="subtitle2" fontWeight={600}>
                            {key.toUpperCase()}
                          </Typography>
                          {isCorrect ? (
                            <CheckIcon color="success" fontSize="small" />
                          ) : (
                            <WarningIcon color="warning" fontSize="small" />
                          )}
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">
                            Tu valor: <strong>{userValue || 'No configurado'}</strong>
                          </Typography>
                          <Typography variant="body2">
                            Óptimo: <strong>{correctValue}</strong>
                          </Typography>
                        </Box>

                        {explanation && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                            {explanation}
                          </Typography>
                        )}

                        <Box sx={{ mt: 1 }}>
                          <Chip
                            size="small"
                            label={`${Math.round(detail?.points || 0)}/${Math.round(detail?.maxPoints || 0)} puntos`}
                            color={isCorrect ? 'success' : 'warning'}
                          />
                        </Box>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 4 }}>
              <Button
                variant="outlined"
                onClick={handleReset}
                size="large"
              >
                Reintentar Caso
              </Button>
            </Box>
          </CardContent>
        </StepCard>
      </Fade>
    );
  };

  // ============================================================================
  // Main Render
  // ============================================================================

  const renderCurrentStep = () => {
    switch (state.currentStep) {
      case 0:
        return renderStep1();
      case 1:
        return renderStep2();
      case 2:
        return renderStep3();
      case 3:
        return renderStep4();
      case 4:
        return renderStep5();
      default:
        return null;
    }
  };

  // Validation for step navigation
  const isNextDisabled = () => {
    if (state.currentStep === 2 && !state.selectedModality) return true;
    if (state.currentStep === 3) {
      // Check if all required parameters are configured
      const requiredParams = Object.keys(caseData.parameters || {}).filter(k => k !== 'mode');
      return requiredParams.some(key => state.parameters[key] === undefined);
    }
    if (state.currentStep === 4) return true; // Last step, no next
    return false;
  };

  const progressPercentage = ((state.currentStep + 1) / STEPS.length) * 100;

  return (
    <CaseContainer elevation={0}>
      {/* Case Title */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h2" fontWeight={600} gutterBottom>
          {caseData.title || 'Caso Clínico'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Caso interactivo de toma de decisiones clínicas
        </Typography>
      </Box>

      {/* Progress Bar */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" fontWeight={600}>
            Progreso del Caso
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {state.currentStep + 1} de {STEPS.length}
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progressPercentage}
          sx={{
            height: 8,
            borderRadius: 4,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          }}
        />
      </Box>

      {/* Stepper */}
      {!isMobile && (
        <Stepper activeStep={state.currentStep} sx={{ mb: 3 }}>
          {STEPS.map((label, index) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      )}

      {/* Current Step Content */}
      <Box>
        {renderCurrentStep()}
      </Box>

      {/* Navigation Buttons */}
      {state.currentStep < 4 && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3, gap: 2 }}>
          <Button
            variant="outlined"
            onClick={handleBack}
            disabled={state.currentStep === 0}
            startIcon={<BackIcon />}
            size="large"
          >
            Anterior
          </Button>

          <Button
            variant="contained"
            onClick={handleNext}
            disabled={isNextDisabled()}
            endIcon={<ForwardIcon />}
            size="large"
          >
            {state.currentStep === 3 ? 'Ver Resultados' : 'Siguiente'}
          </Button>
        </Box>
      )}
    </CaseContainer>
  );
};

// ============================================================================
// PropTypes
// ============================================================================

ClinicalCase.propTypes = {
  /**
   * Clinical case data object containing all case information
   */
  caseData: PropTypes.shape({
    /**
     * Unique identifier for the case
     */
    caseId: PropTypes.string.isRequired,

    /**
     * Title of the clinical case
     */
    title: PropTypes.string.isRequired,

    /**
     * Patient information
     */
    patientInfo: PropTypes.shape({
      age: PropTypes.number.isRequired,
      sex: PropTypes.string.isRequired,
      weight: PropTypes.number.isRequired,
      height: PropTypes.number.isRequired,
      admissionReason: PropTypes.string.isRequired,
      vitalSigns: PropTypes.shape({
        hr: PropTypes.number,
        bp: PropTypes.string,
        rr: PropTypes.number,
        spo2: PropTypes.number,
        temp: PropTypes.number,
      }),
      physicalExam: PropTypes.string,
    }).isRequired,

    /**
     * Complementary examination results
     */
    complementaryExams: PropTypes.shape({
      gasometry: PropTypes.objectOf(PropTypes.shape({
        value: PropTypes.number.isRequired,
        normal: PropTypes.arrayOf(PropTypes.number).isRequired,
      })),
      labs: PropTypes.objectOf(PropTypes.shape({
        value: PropTypes.number.isRequired,
        normal: PropTypes.arrayOf(PropTypes.number).isRequired,
        unit: PropTypes.string,
      })),
      imaging: PropTypes.string,
    }),

    /**
     * Available ventilatory modality options
     */
    modalityOptions: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
    })).isRequired,

    /**
     * Ventilator parameters configuration
     */
    parameters: PropTypes.objectOf(PropTypes.shape({
      min: PropTypes.number.isRequired,
      max: PropTypes.number.isRequired,
      unit: PropTypes.string.isRequired,
    })).isRequired,

    /**
     * Correct solution with expert reasoning
     */
    correctSolution: PropTypes.shape({
      modality: PropTypes.string.isRequired,
      reasoning: PropTypes.string.isRequired,
      parameters: PropTypes.object.isRequired,
      explanations: PropTypes.objectOf(PropTypes.string),
    }).isRequired,
  }).isRequired,

  /**
   * Callback function executed when case is completed successfully.
   * Receives an object with: caseId, score, timeSpent, choices, correct
   */
  onComplete: PropTypes.func,
};

ClinicalCase.defaultProps = {
  onComplete: null,
};

export default ClinicalCase;
