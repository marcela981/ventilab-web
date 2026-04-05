import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  Typography,
  Button,
  LinearProgress,
  Alert,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
} from '@mui/material';
import {
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';

import clinicalCasesData from '@/features/evaluation/data/clinicalCases';
import { getModuleById } from '@/features/ensenanza/shared/data/curriculumData';
import useLessonProgress from '@/features/ensenanza/shared/hooks/useLessonProgress';
import { useLearningProgress } from '@/features/progress/LearningProgressContext';
import { postResult } from '@/features/ensenanza/shared/services/clinicalCasesService';

// Extracted Components & Hooks
import ClinicalCaseLockedView from './ClinicalCaseLockedView';
import ClinicalCaseStep from './ClinicalCaseStep';
import ClinicalCaseResults from './ClinicalCaseResults';
import useClinicalCaseScoring from './useClinicalCaseScoring';

const strings = {
  score: { current: 'Puntaje actual' },
  progress: {
    label: 'Progreso del caso',
    step: (current, total) => `Paso ${current} de ${total}`,
  },
  navigation: {
    previous: 'Anterior',
    next: 'Siguiente paso',
    finish: 'Finalizar caso',
  },
  objectives: { title: 'Objetivos de aprendizaje:' },
  empty: {
    title: 'No hay caso clínico disponible',
    message: 'No hay caso clínico disponible para este módulo',
    backButton: 'Volver al contenido',
  },
  network: { savedLocally: 'Resultados guardados localmente. Reintentaremos enviar en tu siguiente visita.' },
  retry: {
    confirmTitle: '¿Reintentar caso?',
    confirmMessage: 'Esto reseteará tus respuestas actuales y creará un nuevo intento. El historial anterior se conservará.',
    confirmButton: 'Sí, reintentar',
    cancelButton: 'Cancelar',
  },
};

const getScoreGrade = (score) => {
  if (score >= 85) return { text: 'Excelente', color: 'success' };
  if (score >= 70) return { text: 'Adecuado', color: 'warning' };
  return { text: 'Por mejorar', color: 'error' };
};

const ClinicalCaseViewer = ({ moduleId, onBack, onCompleted }) => {
  const { completedLessons } = useLearningProgress();
  const { calculateModuleProgress } = useLessonProgress(completedLessons);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepAnswers, setStepAnswers] = useState({});
  const [finalResults, setFinalResults] = useState(null);
  const [networkError, setNetworkError] = useState(false);
  const [retryDialogOpen, setRetryDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const completionNotifiedRef = useRef(false);

  const clinicalCase = useMemo(() => clinicalCasesData[moduleId] || null, [moduleId]);
  const moduleProgress = useMemo(() => moduleId ? calculateModuleProgress(moduleId) : 0, [moduleId, calculateModuleProgress]);
  const isModuleComplete = useMemo(() => moduleProgress === 100, [moduleProgress]);

  const { calculateScore } = useClinicalCaseScoring(clinicalCase, stepAnswers);

  const handleSelectionChange = useCallback((decisionId, optionIds) => {
    if (!clinicalCase) return;
    const currentStep = clinicalCase.steps[currentStepIndex];
    if (!currentStep) return;

    setStepAnswers((prev) => ({
      ...prev,
      [currentStep.id]: {
        ...(prev[currentStep.id] || {}),
        [decisionId]: optionIds,
      },
    }));
  }, [clinicalCase, currentStepIndex]);

  const handleNextStep = useCallback(() => {
    if (clinicalCase && currentStepIndex < clinicalCase.steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  }, [clinicalCase, currentStepIndex]);

  const handlePreviousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  const saveToLocalHistory = useCallback((result) => {
    const historyKey = `clinicalCaseHistory:${moduleId}`;
    try {
      const existingHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
      const newHistory = [result, ...existingHistory].slice(0, 10);
      localStorage.setItem(historyKey, JSON.stringify(newHistory));
      localStorage.setItem(`clinicalCaseResults:${moduleId}`, JSON.stringify(result));
    } catch (error) {
      console.error('Error saving clinical case results:', error);
    }
  }, [moduleId]);

  const handleFinishCase = useCallback(async () => {
    if (!clinicalCase) return;

    const { score, breakdownByDomain } = calculateScore();
    const result = {
      timestamp: new Date().toISOString(),
      score,
      breakdownByDomain,
      answers: stepAnswers,
      pendingSync: false,
    };

    saveToLocalHistory(result);

    let networkErrorOccurred = false;
    try {
      const backendResponse = await postResult(moduleId, { score, breakdownByDomain, answers: stepAnswers });
      if (backendResponse && backendResponse.id) {
        result.backendId = backendResponse.id;
        result.pendingSync = false;
        saveToLocalHistory(result);
      } else {
        networkErrorOccurred = true;
      }
    } catch (error) {
      networkErrorOccurred = true;
    }

    if (networkErrorOccurred) {
      result.pendingSync = true;
      saveToLocalHistory(result);
      setNetworkError(true);
      setSnackbarMessage(strings.network.savedLocally);
      setSnackbarOpen(true);
    }

    setFinalResults({ score, breakdownByDomain });
  }, [clinicalCase, calculateScore, stepAnswers, moduleId, saveToLocalHistory]);

  const handleRetryCase = useCallback(() => {
    setRetryDialogOpen(false);
    setCurrentStepIndex(0);
    setStepAnswers({});
    setFinalResults(null);
    setNetworkError(false);
    completionNotifiedRef.current = false;
  }, []);

  useEffect(() => {
    if (finalResults && !completionNotifiedRef.current) {
      completionNotifiedRef.current = true;
      if (onCompleted) {
        onCompleted({ caseScore: finalResults.score });
      }
    }
  }, [finalResults, onCompleted]);

  if (!isModuleComplete) {
    return <ClinicalCaseLockedView moduleId={moduleId} />;
  }

  if (!clinicalCase) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center', backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 3 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>{strings.empty.title}</Typography>
          <Typography variant="body2">{strings.empty.message}</Typography>
        </Alert>
        {onBack && (
          <Button variant="contained" startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ mt: 2 }}>
            {strings.empty.backButton}
          </Button>
        )}
      </Paper>
    );
  }

  if (finalResults) {
    return (
      <ClinicalCaseResults
        finalResults={finalResults}
        clinicalCase={clinicalCase}
        stepAnswers={stepAnswers}
        onRetry={() => setRetryDialogOpen(true)}
      />
    );
  }

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === clinicalCase.steps.length - 1;
  const progressPercentage = ((currentStepIndex + 1) / clinicalCase.steps.length) * 100;

  return (
    <Paper sx={{ p: 3, backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight={600} gutterBottom>{clinicalCase.title}</Typography>
        <Typography variant="body2" color="text.secondary">{clinicalCase.intro}</Typography>
      </Box>

      {clinicalCase.objectives && clinicalCase.objectives.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>{strings.objectives.title}</Typography>
          <Box component="ul" sx={{ pl: 2, m: 0 }}>
            {clinicalCase.objectives.map((objective, idx) => (
              <Typography key={idx} component="li" variant="body2" color="text.secondary">{objective}</Typography>
            ))}
          </Box>
        </Box>
      )}

      <Divider sx={{ my: 3 }} />

      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" fontWeight={600}>{strings.progress.label}</Typography>
          <Typography variant="body2" color="text.secondary">{strings.progress.step(currentStepIndex + 1, clinicalCase.steps.length)}</Typography>
        </Box>
        <LinearProgress variant="determinate" value={progressPercentage} sx={{ height: 8, borderRadius: 4 }} />
      </Box>

      <ClinicalCaseStep
        currentStep={clinicalCase.steps[currentStepIndex]}
        stepAnswers={stepAnswers}
        onSelectionChange={handleSelectionChange}
      />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4, gap: 2 }}>
        <Button variant="outlined" onClick={handlePreviousStep} disabled={isFirstStep} startIcon={<NavigateBeforeIcon />}>
          {strings.navigation.previous}
        </Button>
        {isLastStep ? (
          <Button variant="contained" color="primary" onClick={handleFinishCase} endIcon={<CheckCircleIcon />}>
            {strings.navigation.finish}
          </Button>
        ) : (
          <Button variant="contained" onClick={handleNextStep} endIcon={<NavigateNextIcon />}>
            {strings.navigation.next}
          </Button>
        )}
      </Box>

      {(() => {
        const currentScore = calculateScore();
        const grade = getScoreGrade(currentScore.score);
        return (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body2" fontWeight={600} gutterBottom>{strings.score.current}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <Typography variant="h6" fontWeight={700}>{currentScore.score}%</Typography>
              <Chip label={grade.text} color={grade.color} size="small" />
            </Box>
          </Box>
        );
      })()}

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity="warning" variant="filled">
          {snackbarMessage}
        </Alert>
      </Snackbar>

      <Dialog open={retryDialogOpen} onClose={() => setRetryDialogOpen(false)}>
        <DialogTitle>{strings.retry.confirmTitle}</DialogTitle>
        <DialogContent><DialogContentText>{strings.retry.confirmMessage}</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setRetryDialogOpen(false)} color="inherit">{strings.retry.cancelButton}</Button>
          <Button onClick={handleRetryCase} color="primary" variant="contained">{strings.retry.confirmButton}</Button>
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

export default ClinicalCaseViewer;
