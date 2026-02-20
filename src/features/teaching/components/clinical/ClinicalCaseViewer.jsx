/**
 * =============================================================================
 * ClinicalCaseViewer Component
 * =============================================================================
 * 
 * Componente orquestador del flujo paso a paso de casos clínicos.
 * Gestiona la carga del caso, verificación de gating, navegación entre pasos,
 * evaluación de decisiones y persistencia de resultados.
 * 
 * @component
 */

import React, { useState, useCallback, useMemo, Suspense, lazy, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  Typography,
  Button,
  LinearProgress,
  Alert,
  Card,
  CardContent,
  Divider,
  Chip,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  FormGroup,
  IconButton,
  Tooltip,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
} from '@mui/material';
import {
  Lock as LockIcon,
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
// Lazy load ExpertComparison for code splitting
const ExpertComparison = lazy(() => import('./ExpertComparison'));
import clinicalCasesData from '@/features/evaluation/data/clinicalCases';
import { getModuleById } from '@/features/teaching/data/curriculumData';
import useLessonProgress from '@/features/teaching/hooks/useLessonProgress';
import { useLearningProgress } from '@/features/progress/LearningProgressContext';
import PrerequisiteTooltip from '@/features/teaching/components/curriculum/ModuleCard/PrerequisiteTooltip';
import { postResult } from '@/features/teaching/services/clinicalCasesService';

// =============================================================================
// Strings for i18n (centralized for future translation)
// =============================================================================
const strings = {
  locked: {
    title: 'Caso Clínico Bloqueado',
    message: 'Completa todas las lecciones del módulo para desbloquear el Caso Clínico',
    ariaLabel: 'Caso clínico bloqueado',
  },
  error: {
    notFound: (moduleId) => `No se encontró un caso clínico para el módulo ${moduleId}`,
  },
  progress: {
    label: 'Progreso del caso',
    step: (current, total) => `Paso ${current} de ${total}`,
    ariaLabel: (percentage) => `Progreso: ${percentage.toFixed(0)}%`,
  },
  navigation: {
    previous: 'Anterior',
    next: 'Siguiente paso',
    finish: 'Finalizar caso',
    previousAria: 'Paso anterior',
    nextAria: 'Siguiente paso',
    finishAria: 'Finalizar caso clínico',
  },
  score: {
    current: 'Puntaje actual',
    excellent: 'Excelente',
    adequate: 'Adecuado',
    needsImprovement: 'Por mejorar',
  },
  objectives: {
    title: 'Objetivos de aprendizaje:',
  },
  summary: {
    noteTitle: 'Nota importante:',
    noteText: 'La comparación con las elecciones del experto es una guía formativa para el aprendizaje y no sustituye el criterio clínico. En la práctica real, las decisiones deben adaptarse a cada paciente y contexto específico.',
    ariaLabel: 'Resumen del caso clínico',
  },
  empty: {
    title: 'No hay caso clínico disponible',
    message: 'No hay caso clínico disponible para este módulo',
    backButton: 'Volver al contenido',
  },
  network: {
    savedLocally: 'Resultados guardados localmente. Reintentaremos enviar en tu siguiente visita.',
  },
  retry: {
    button: 'Reintentar caso',
    ariaLabel: 'Reintentar caso clínico',
    confirmTitle: '¿Reintentar caso?',
    confirmMessage: 'Esto reseteará tus respuestas actuales y creará un nuevo intento. El historial anterior se conservará.',
    confirmButton: 'Sí, reintentar',
    cancelButton: 'Cancelar',
  },
  aria: {
    main: 'Visor de caso clínico',
    step: (index, title) => `Paso ${index}: ${title}`,
  },
};

// =============================================================================
// DecisionRenderer Component
// =============================================================================

/**
 * Componente para renderizar una decisión clínica
 */
const DecisionRenderer = ({ decision, selectedOptions, onSelectionChange, showFeedback }) => {
  const isMulti = decision.type === 'multi';
  const selectedSet = useMemo(() => new Set(selectedOptions || []), [selectedOptions]);

  const handleChange = useCallback((optionId, checked) => {
    if (isMulti) {
      const newSelection = checked
        ? [...(selectedOptions || []), optionId]
        : (selectedOptions || []).filter(id => id !== optionId);
      onSelectionChange(decision.id, newSelection);
    } else {
      onSelectionChange(decision.id, [optionId]);
    }
  }, [decision.id, isMulti, onSelectionChange, selectedOptions]);

  const getOptionWeight = useCallback((optionId) => {
    return decision.weights?.[optionId] || 0;
  }, [decision.weights]);

  const getOptionScore = useCallback(() => {
    if (!selectedOptions || selectedOptions.length === 0) return 0;
    
    if (isMulti) {
      // Para multi-selección, suma los pesos de todas las opciones seleccionadas
      return selectedOptions.reduce((sum, optId) => sum + getOptionWeight(optId), 0);
    } else {
      // Para single, toma el peso de la opción seleccionada
      return getOptionWeight(selectedOptions[0]);
    }
  }, [selectedOptions, isMulti, getOptionWeight]);

  return (
    <Card sx={{ mb: 3, border: '1px solid rgba(255, 255, 255, 0.1)' }}>
      <CardContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            {decision.prompt}
          </Typography>
          {decision.domain && (
            <Chip
              label={decision.domain}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ mt: 1 }}
            />
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {isMulti ? (
          <FormGroup>
            {decision.options.map((option) => {
              const isSelected = selectedSet.has(option.id);
              const weight = getOptionWeight(option.id);
              const isExpert = option.isExpertChoice;
              
              return (
                <FormControlLabel
                  key={option.id}
                  control={
                    <Checkbox
                      checked={isSelected}
                      onChange={(e) => handleChange(option.id, e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1" fontWeight={isSelected ? 600 : 400}>
                        {option.label}
                        {isExpert && (
                          <Chip
                            label="Opción experta"
                            size="small"
                            color="success"
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        {option.rationale}
                      </Typography>
                    </Box>
                  }
                  sx={{
                    mb: 1,
                    p: 1,
                    borderRadius: 1,
                    backgroundColor: isSelected ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                    border: isSelected ? '1px solid rgba(25, 118, 210, 0.3)' : '1px solid transparent',
                    transition: 'all 0.2s',
                  }}
                />
              );
            })}
          </FormGroup>
        ) : (
          <FormControl component="fieldset" fullWidth>
            <RadioGroup
              value={selectedOptions?.[0] || ''}
              onChange={(e) => handleChange(e.target.value, true)}
            >
              {decision.options.map((option) => {
                const isSelected = selectedSet.has(option.id);
                const isExpert = option.isExpertChoice;
                
                return (
                  <FormControlLabel
                    key={option.id}
                    value={option.id}
                    control={<Radio color="primary" />}
                    label={
                      <Box>
                        <Typography variant="body1" fontWeight={isSelected ? 600 : 400}>
                          {option.label}
                          {isExpert && (
                            <Chip
                              label="Opción experta"
                              size="small"
                              color="success"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                          {option.rationale}
                        </Typography>
                      </Box>
                    }
                    sx={{
                      mb: 1,
                      p: 1,
                      borderRadius: 1,
                      backgroundColor: isSelected ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                      border: isSelected ? '1px solid rgba(25, 118, 210, 0.3)' : '1px solid transparent',
                      transition: 'all 0.2s',
                    }}
                  />
                );
              })}
            </RadioGroup>
          </FormControl>
        )}

        {showFeedback && selectedOptions && selectedOptions.length > 0 && decision.feedback && (
          <Alert
            severity={getOptionScore() >= 0.7 ? 'success' : getOptionScore() > 0 ? 'info' : 'warning'}
            sx={{ mt: 2 }}
            role="alert"
            aria-live="polite"
          >
            {decision.feedback}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

DecisionRenderer.propTypes = {
  decision: PropTypes.object.isRequired,
  selectedOptions: PropTypes.array,
  onSelectionChange: PropTypes.func.isRequired,
  showFeedback: PropTypes.bool,
};

DecisionRenderer.defaultProps = {
  selectedOptions: [],
  showFeedback: true,
};

// =============================================================================
// LockedView Component
// =============================================================================

/**
 * Vista bloqueada cuando el módulo no está 100% completado
 */
const LockedView = ({ moduleId }) => {
  return (
    <Paper
      sx={{
        p: 4,
        textAlign: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
        }}
      >
        <PrerequisiteTooltip
          missing={[]}
          side="top"
        >
          <LockIcon
            sx={{
              fontSize: 40,
              color: 'text.disabled',
            }}
            aria-label="Caso clínico bloqueado"
          />
        </PrerequisiteTooltip>
      </Box>

      <Box sx={{ mt: 4, mb: 2 }}>
        <LockIcon
          sx={{
            fontSize: 64,
            color: 'text.disabled',
            mb: 2,
          }}
        />
      </Box>

      <Typography variant="h5" fontWeight={600} gutterBottom>
        {strings.locked.title}
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 500, mx: 'auto', mt: 2 }}>
        {strings.locked.message}
      </Typography>
    </Paper>
  );
};

LockedView.propTypes = {
  moduleId: PropTypes.string.isRequired,
};

// =============================================================================
// Main Component
// =============================================================================

const ClinicalCaseViewer = ({ moduleId, onBack, onCompleted }) => {
  const { completedLessons } = useLearningProgress();
  const { calculateModuleProgress } = useLessonProgress(completedLessons);

  // Estado del caso
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepAnswers, setStepAnswers] = useState({}); // { stepId: { decisionId: [optionIds] } }
  const [finalResults, setFinalResults] = useState(null); // { score, breakdownByDomain }
  const [networkError, setNetworkError] = useState(false);
  const [retryDialogOpen, setRetryDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const completionNotifiedRef = useRef(false);

  // Cargar caso clínico
  const clinicalCase = useMemo(() => {
    return clinicalCasesData[moduleId] || null;
  }, [moduleId]);

  // Verificar progreso del módulo
  const moduleProgress = useMemo(() => {
    if (!moduleId) return 0;
    return calculateModuleProgress(moduleId);
  }, [moduleId, calculateModuleProgress]);

  const isModuleComplete = useMemo(() => {
    return moduleProgress === 100;
  }, [moduleProgress]);

  // Verificar si el módulo existe en curriculumData
  const module = useMemo(() => {
    return getModuleById(moduleId);
  }, [moduleId]);

  // Manejar selección de opciones
  const handleSelectionChange = useCallback((decisionId, optionIds) => {
    if (!clinicalCase) return;

    const currentStep = clinicalCase.steps[currentStepIndex];
    if (!currentStep) return;

    setStepAnswers((prev) => {
      return {
        ...prev,
        [currentStep.id]: {
          ...(prev[currentStep.id] || {}),
          [decisionId]: optionIds,
        },
      };
    });
  }, [clinicalCase, currentStepIndex]);

  // Navegación
  const handleNextStep = useCallback(() => {
    if (!clinicalCase) return;
    if (currentStepIndex < clinicalCase.steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  }, [clinicalCase, currentStepIndex]);

  const handlePreviousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  // Calcular puntaje como promedio ponderado de decisiones
  const calculateScore = useCallback(() => {
    if (!clinicalCase) return { score: 0, breakdownByDomain: {} };

    const decisionScores = [];
    const breakdownByDomain = {};

    clinicalCase.steps.forEach((step) => {
      step.decisions?.forEach((decision) => {
        const stepAnswer = stepAnswers[step.id]?.[decision.id] || [];
        const domain = decision.domain || 'general';

        // Inicializar dominio si no existe
        if (!breakdownByDomain[domain]) {
          breakdownByDomain[domain] = {
            totalScore: 0,
            maxScore: 0,
            decisionCount: 0,
          };
        }

        let decisionScore = 0;
        let decisionMax = 0;

        if (decision.type === 'single') {
          // Single: puntaje del peso de la opción seleccionada, normalizado por el máximo
          const selectedWeight = decision.weights?.[stepAnswer[0]] || 0;
          decisionMax = Math.max(...Object.values(decision.weights || {}));
          
          // Normalizar a 0-1
          if (decisionMax > 0) {
            decisionScore = selectedWeight / decisionMax;
          } else {
            decisionScore = 0;
          }
          decisionMax = 1; // Normalizado a 1
        } else {
          // Multi: suma de pesos seleccionados, normalizado por suma de pesos máximos
          decisionScore = stepAnswer.reduce((sum, optId) => {
            return sum + (decision.weights?.[optId] || 0);
          }, 0);

          // Calcular suma de pesos máximos (suma de todas las opciones expertas)
          const expertOptions = decision.options.filter(opt => opt.isExpertChoice);
          decisionMax = expertOptions.reduce((sum, opt) => {
            return sum + (decision.weights?.[opt.id] || 0);
          }, 0);

          // Normalizar multi-respuesta: dividir por la suma de pesos máximos
          if (decisionMax > 0) {
            decisionScore = decisionScore / decisionMax;
          } else {
            decisionScore = 0;
          }
          decisionMax = 1; // Normalizado a 1
        }

        // Agregar a scores de decisiones (para promedio)
        decisionScores.push({
          score: decisionScore,
          maxScore: decisionMax,
          domain,
        });

        // Agregar al breakdown por dominio
        // Para el cálculo final, guardamos scores normalizados (0-1)
        breakdownByDomain[domain].totalScore += decisionScore;
        breakdownByDomain[domain].maxScore += decisionMax; // Ya normalizado (1 para multi, maxWeight para single)
        breakdownByDomain[domain].decisionCount += 1;
      });
    });

    // Calcular promedio ponderado: promedio de todas las decisiones
    const totalScore = decisionScores.reduce((sum, d) => sum + d.score, 0);
    const totalMax = decisionScores.reduce((sum, d) => sum + d.maxScore, 0);
    const averageScore = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;

    // Calcular promedios por dominio (promedio de decisiones en ese dominio)
    Object.keys(breakdownByDomain).forEach((domain) => {
      const domainData = breakdownByDomain[domain];
      // Promedio: suma de scores normalizados / suma de máximos normalizados
      // Esto da el promedio ponderado del dominio
      const domainAverage = domainData.maxScore > 0
        ? (domainData.totalScore / domainData.maxScore) * 100
        : 0;
      breakdownByDomain[domain].averageScore = Math.round(domainAverage);
      breakdownByDomain[domain].percentage = Math.round(domainAverage);
      
      // Mantener estructura compatible con ExpertComparison
      // totalScore y maxScore ya están en formato normalizado (0-1)
    });

    return {
      score: Math.round(averageScore),
      breakdownByDomain,
    };
  }, [clinicalCase, stepAnswers]);

  // Guardar en historial local (máximo 10 intentos)
  const saveToLocalHistory = useCallback((result) => {
    const historyKey = `clinicalCaseHistory:${moduleId}`;
    try {
      const existingHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
      
      // Agregar nuevo intento al inicio
      const newHistory = [result, ...existingHistory];
      
      // Mantener solo los últimos 10 intentos
      const trimmedHistory = newHistory.slice(0, 10);
      
      localStorage.setItem(historyKey, JSON.stringify(trimmedHistory));
      
      // También guardar el último resultado para acceso rápido
      const lastResultKey = `clinicalCaseResults:${moduleId}`;
      localStorage.setItem(lastResultKey, JSON.stringify(result));
    } catch (error) {
      console.error('Error saving clinical case results to localStorage:', error);
    }
  }, [moduleId]);

  // Finalizar caso
  const handleFinishCase = useCallback(async () => {
    if (!clinicalCase) return;

    // Calcular puntaje y breakdown
    const { score, breakdownByDomain } = calculateScore();

    const submittedAt = new Date().toISOString();
    
    // Preparar resultado completo
    const result = {
      timestamp: submittedAt,
      score,
      breakdownByDomain,
      answers: stepAnswers,
      pendingSync: false, // Se marcará como true si falla el envío
    };

    // Guardar en historial local primero
    saveToLocalHistory(result);

    // Intentar enviar al backend
    let networkErrorOccurred = false;
    try {
      const backendResponse = await postResult(moduleId, {
        score,
        breakdownByDomain,
        answers: stepAnswers,
      });

      if (backendResponse && backendResponse.id) {
        console.log('[ClinicalCaseViewer] Resultado guardado en backend con ID:', backendResponse.id);
        
        // Actualizar resultado local con el ID del backend si existe
        result.backendId = backendResponse.id;
        result.pendingSync = false;
        saveToLocalHistory(result);
      } else {
        // Backend no disponible o no retornó ID
        networkErrorOccurred = true;
      }
    } catch (error) {
      // Error de red (no manejado silenciosamente en el servicio)
      networkErrorOccurred = true;
      console.error('[ClinicalCaseViewer] Error de red al enviar resultados:', error);
    }

    // Si hubo error de red, marcar como pendiente de sincronización
    if (networkErrorOccurred) {
      result.pendingSync = true;
      saveToLocalHistory(result);
      setNetworkError(true);
      setSnackbarMessage(strings.network.savedLocally);
      setSnackbarOpen(true);
    }

    // Mostrar resumen final
    setFinalResults({ score, breakdownByDomain });
  }, [clinicalCase, calculateScore, stepAnswers, moduleId, saveToLocalHistory]);

  // Reintentar caso
  const handleRetryCase = useCallback(() => {
    setRetryDialogOpen(false);
    // Resetear estado
    setCurrentStepIndex(0);
    setStepAnswers({});
    setFinalResults(null);
    setNetworkError(false);
    completionNotifiedRef.current = false;
    // El historial se preserva automáticamente (no se borra)
  }, []);

  useEffect(() => {
    if (!finalResults || completionNotifiedRef.current) {
      return;
    }

    completionNotifiedRef.current = true;
    if (onCompleted) {
      onCompleted();
    }
  }, [finalResults, onCompleted]);

  // Cerrar snackbar
  const handleCloseSnackbar = useCallback(() => {
    setSnackbarOpen(false);
  }, []);

  // Renderizar paso actual
  const renderCurrentStep = useCallback(() => {
    if (!clinicalCase) return null;

    const currentStep = clinicalCase.steps[currentStepIndex];
    if (!currentStep) return null;

    return (
      <Box>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          {currentStep.title}
        </Typography>

        <Typography variant="body1" paragraph sx={{ mt: 2, mb: 3 }}>
          {currentStep.narrative}
        </Typography>

        {currentStep.media && (
          <Box sx={{ mb: 3 }} role="img" aria-label={currentStep.media.alt || 'Media del caso clínico'}>
            {currentStep.media.type === 'image' && (
              <img
                src={currentStep.media.src}
                alt={currentStep.media.alt || ''}
                loading="lazy"
                style={{ maxWidth: '100%', borderRadius: 8 }}
              />
            )}
            {currentStep.media.type === 'svg' && (
              <Suspense fallback={<Skeleton variant="rectangular" width="100%" height={300} />}>
                <img
                  src={currentStep.media.src}
                  alt={currentStep.media.alt || ''}
                  loading="lazy"
                  style={{ maxWidth: '100%', borderRadius: 8 }}
                />
              </Suspense>
            )}
          </Box>
        )}

        {currentStep.decisions?.map((decision) => (
          <DecisionRenderer
            key={decision.id}
            decision={decision}
            selectedOptions={stepAnswers[currentStep.id]?.[decision.id] || []}
            onSelectionChange={handleSelectionChange}
            showFeedback={true}
          />
        ))}
      </Box>
    );
  }, [clinicalCase, currentStepIndex, stepAnswers, handleSelectionChange]);

  // Si el módulo no está completo, mostrar vista bloqueada
  if (!isModuleComplete) {
    return <LockedView moduleId={moduleId} />;
  }

  // Si no hay caso clínico, mostrar estado vacío
  if (!clinicalCase) {
    return (
      <Paper
        sx={{
          p: 4,
          textAlign: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
        role="alert"
        aria-live="assertive"
      >
        <Alert
          severity="info"
          icon={<InfoIcon />}
          sx={{ mb: 3 }}
        >
          <Typography variant="h6" fontWeight={600} gutterBottom>
            {strings.empty.title}
          </Typography>
          <Typography variant="body2">
            {strings.empty.message}
          </Typography>
        </Alert>
        {onBack && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<ArrowBackIcon />}
            onClick={onBack}
            sx={{ mt: 2 }}
            aria-label={strings.empty.backButton}
          >
            {strings.empty.backButton}
          </Button>
        )}
      </Paper>
    );
  }

  // Obtener calificación del puntaje
  const getScoreGrade = useCallback((score) => {
    if (score >= 85) return { text: strings.score.excellent, color: 'success' };
    if (score >= 70) return { text: strings.score.adequate, color: 'warning' };
    return { text: strings.score.needsImprovement, color: 'error' };
  }, []);

  // Si hay resultados finales, mostrar resumen
  if (finalResults) {
    const grade = getScoreGrade(finalResults.score);

    return (
      <Paper
        sx={{
          p: 3,
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
        role="main"
        aria-label="Resumen del caso clínico"
      >
        {/* Nota Didáctica */}
        <Alert
          severity="info"
          icon={<InfoIcon />}
          sx={{ mb: 3 }}
          role="alert"
          aria-live="polite"
        >
          <Typography variant="body2">
            <strong>{strings.summary.noteTitle}</strong> {strings.summary.noteText}
          </Typography>
        </Alert>

        {/* Puntaje Total con Chip de Estado */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h3" component="h2" fontWeight={700} gutterBottom>
            {finalResults.score}%
          </Typography>
          <Chip
            label={grade.text}
            color={grade.color}
            size="large"
            sx={{ fontSize: '1rem', py: 2, px: 1 }}
          />
        </Box>

        <Divider sx={{ my: 4 }} />

        {/* Comparación con Experto */}
        <Suspense fallback={
          <Box sx={{ p: 3 }}>
            <Skeleton variant="rectangular" width="100%" height={400} />
          </Box>
        }>
          <ExpertComparison
            caseData={clinicalCase}
            answers={stepAnswers}
            score={finalResults.score}
            breakdownByDomain={finalResults.breakdownByDomain}
          />
        </Suspense>

        {/* Botón Reintentar */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<RefreshIcon />}
            onClick={() => setRetryDialogOpen(true)}
            aria-label={strings.retry.ariaLabel}
          >
            {strings.retry.button}
          </Button>
        </Box>
      </Paper>
    );
  }

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === clinicalCase.steps.length - 1;
  const progressPercentage = ((currentStepIndex + 1) / clinicalCase.steps.length) * 100;

  return (
    <Paper
      sx={{
        p: 3,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
      role="main"
      aria-label="Visor de caso clínico"
    >
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight={600} gutterBottom>
          {clinicalCase.title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {clinicalCase.intro}
        </Typography>
      </Box>

      {/* Objectives */}
      {clinicalCase.objectives && clinicalCase.objectives.length > 0 && (
        <Box sx={{ mb: 3 }} role="region" aria-label={strings.objectives.title}>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            {strings.objectives.title}
          </Typography>
          <Box component="ul" sx={{ pl: 2, m: 0 }}>
            {clinicalCase.objectives.map((objective, idx) => (
              <Typography key={idx} component="li" variant="body2" color="text.secondary">
                {objective}
              </Typography>
            ))}
          </Box>
        </Box>
      )}

      <Divider sx={{ my: 3 }} />

      {/* Progress Bar */}
      <Box sx={{ mb: 3 }} role="progressbar" aria-valuenow={progressPercentage} aria-valuemin={0} aria-valuemax={100}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" fontWeight={600}>
            {strings.progress.label}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {strings.progress.step(currentStepIndex + 1, clinicalCase.steps.length)}
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progressPercentage}
          sx={{
            height: 8,
            borderRadius: 4,
          }}
          aria-label={strings.progress.ariaLabel(progressPercentage)}
        />
      </Box>

      {/* Current Step Content */}
      <Box
        role="region"
        aria-label={strings.aria.step(currentStepIndex + 1, clinicalCase.steps[currentStepIndex]?.title || '')}
        aria-live="polite"
        tabIndex={0}
      >
        {renderCurrentStep()}
      </Box>

      {/* Navigation */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          mt: 4,
          gap: 2,
        }}
      >
        <Button
          variant="outlined"
          onClick={handlePreviousStep}
          disabled={isFirstStep}
          startIcon={<NavigateBeforeIcon />}
          aria-label={strings.navigation.previousAria}
          tabIndex={isFirstStep ? -1 : 0}
        >
          {strings.navigation.previous}
        </Button>

        {isLastStep ? (
          <Button
            variant="contained"
            color="primary"
            onClick={handleFinishCase}
            endIcon={<CheckCircleIcon />}
            aria-label={strings.navigation.finishAria}
            tabIndex={0}
          >
            {strings.navigation.finish}
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleNextStep}
            endIcon={<NavigateNextIcon />}
            aria-label={strings.navigation.nextAria}
            tabIndex={0}
          >
            {strings.navigation.next}
          </Button>
        )}
      </Box>

      {/* Score Indicator - Calculado en tiempo real */}
      {(() => {
        const currentScore = calculateScore();
        const grade = getScoreGrade(currentScore.score);
        
        return (
          <Box sx={{ mt: 2, textAlign: 'center' }} role="status" aria-live="polite" aria-atomic="true">
            <Typography variant="body2" fontWeight={600} gutterBottom>
              {strings.score.current}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <Typography variant="h6" fontWeight={700}>
                {currentScore.score}%
              </Typography>
              <Chip
                label={grade.text}
                color={grade.color}
                size="small"
              />
            </Box>
          </Box>
        );
      })()}

      {/* Snackbar para errores de red */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity="warning"
          variant="filled"
          role="alert"
          aria-live="polite"
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {/* Dialog de confirmación para reintentar */}
      <Dialog
        open={retryDialogOpen}
        onClose={() => setRetryDialogOpen(false)}
        aria-labelledby="retry-dialog-title"
        aria-describedby="retry-dialog-description"
      >
        <DialogTitle id="retry-dialog-title">
          {strings.retry.confirmTitle}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="retry-dialog-description">
            {strings.retry.confirmMessage}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setRetryDialogOpen(false)}
            color="inherit"
            aria-label={strings.retry.cancelButton}
          >
            {strings.retry.cancelButton}
          </Button>
          <Button
            onClick={handleRetryCase}
            color="primary"
            variant="contained"
            aria-label={strings.retry.confirmButton}
          >
            {strings.retry.confirmButton}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

ClinicalCaseViewer.propTypes = {
  moduleId: PropTypes.string.isRequired,
  onBack: PropTypes.func,
  onCompleted: PropTypes.func,
};

ClinicalCaseViewer.defaultProps = {
  onBack: null,
  onCompleted: null,
};

export default ClinicalCaseViewer;

