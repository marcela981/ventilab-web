import React, { Suspense, lazy } from 'react';
import { Box, Paper, Typography, Alert, Divider, Chip, Button, Skeleton } from '@mui/material';
import { Info as InfoIcon, Refresh as RefreshIcon } from '@mui/icons-material';

const ExpertComparison = lazy(() => import('./ExpertComparison'));

const strings = {
  score: {
    current: 'Puntaje actual',
    excellent: 'Excelente',
    adequate: 'Adecuado',
    needsImprovement: 'Por mejorar',
  },
  summary: {
    noteTitle: 'Nota importante:',
    noteText: 'La comparación con las elecciones del experto es una guía formativa para el aprendizaje y no sustituye el criterio clínico. En la práctica real, las decisiones deben adaptarse a cada paciente y contexto específico.',
  },
  retry: {
    button: 'Reintentar caso',
    ariaLabel: 'Reintentar caso clínico',
  }
};

const getScoreGrade = (score) => {
  if (score >= 85) return { text: strings.score.excellent, color: 'success' };
  if (score >= 70) return { text: strings.score.adequate, color: 'warning' };
  return { text: strings.score.needsImprovement, color: 'error' };
};

const ClinicalCaseResults = ({ finalResults, clinicalCase, stepAnswers, onRetry }) => {
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
      <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 3 }} role="alert" aria-live="polite">
        <Typography variant="body2">
          <strong>{strings.summary.noteTitle}</strong> {strings.summary.noteText}
        </Typography>
      </Alert>

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

      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<RefreshIcon />}
          onClick={onRetry}
          aria-label={strings.retry.ariaLabel}
        >
          {strings.retry.button}
        </Button>
      </Box>
    </Paper>
  );
};

export default ClinicalCaseResults;
