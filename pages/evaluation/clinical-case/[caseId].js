/*
 * Funcionalidad: Detalle del caso clínico + formulario + resultado (OE2/OE3)
 * Descripción: Carga un caso por ID, presenta su contexto clínico y el formulario
 *              de parámetros. Al enviar, muestra la comparación con el experto y el
 *              feedback (de IA o del fallback determinístico). Funciona sin clave
 *              de IA: el resultado se renderiza igual con feedback determinístico.
 * Versión: 1.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import React from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { useClinicalCaseEvaluation } from '@/features/evaluation/hooks/useClinicalCaseEvaluation';
import ParameterForm from '@/features/evaluation/components/clinical/ParameterForm';
import EvaluationResultPanel from '@/features/evaluation/components/clinical/EvaluationResultPanel';
import styles from '../UI/evaluation.module.css';

const DIFFICULTY_LABEL = {
  BEGINNER: 'Principiante',
  INTERMEDIATE: 'Intermedio',
  ADVANCED: 'Avanzado',
};

export default function ClinicalCaseDetailPage() {
  const router = useRouter();
  const { caseId } = router.query;
  const id = typeof caseId === 'string' ? caseId : undefined;

  const {
    clinicalCase,
    isLoadingCase,
    caseError,
    result,
    feedbackSource,
    isEvaluating,
    evaluateError,
    evaluate,
    reset,
  } = useClinicalCaseEvaluation(id);

  if (isLoadingCase) {
    return (
      <Box className={styles.loadingBox}><CircularProgress /></Box>
    );
  }

  if (caseError) {
    return (
      <Box className={styles.errorBox}>
        <Typography color="error">{caseError}</Typography>
        <Button variant="outlined" onClick={() => router.push('/evaluation/clinical-case')} sx={{ mt: 1 }}>
          Volver a casos
        </Button>
      </Box>
    );
  }

  if (!clinicalCase) {
    return (
      <Box className={styles.errorBox}>
        <Typography>Caso clínico no encontrado.</Typography>
        <Button variant="outlined" onClick={() => router.push('/evaluation/clinical-case')} sx={{ mt: 1 }}>
          Volver a casos
        </Button>
      </Box>
    );
  }

  const lab = clinicalCase.labData ?? null;

  return (
    <Box className={styles.page}>
      <Button
        variant="outlined"
        size="small"
        className={styles.backBtn}
        onClick={() => router.push('/evaluation/clinical-case')}
      >
        ← Volver a casos
      </Button>

      {/* ── Contexto clínico ─────────────────────────────────────── */}
      <Stack spacing={1} sx={{ mt: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Typography variant="h4" className={styles.title}>{clinicalCase.title}</Typography>
          <Stack direction="row" spacing={1}>
            {clinicalCase.pathology && <Chip label={clinicalCase.pathology} size="small" />}
            {clinicalCase.difficulty && (
              <Chip label={DIFFICULTY_LABEL[clinicalCase.difficulty] ?? clinicalCase.difficulty} size="small" variant="outlined" />
            )}
          </Stack>
        </Stack>

        <Typography variant="body1" className={styles.subtitle}>
          {clinicalCase.description}
        </Typography>
        <Typography variant="body2" className={styles.detailMeta}>
          {clinicalCase.mainDiagnosis} · {clinicalCase.patientAge} años · {clinicalCase.patientWeight} kg
        </Typography>
        {clinicalCase.educationalGoal && (
          <Typography variant="body2" className={styles.detailMeta}>
            <strong>Objetivo:</strong> {clinicalCase.educationalGoal}
          </Typography>
        )}
        {lab && (
          <Typography variant="body2" className={styles.detailMeta}>
            <strong>Laboratorio:</strong>{' '}
            {Object.entries(lab)
              .filter(([, v]) => v !== null && v !== undefined && v !== '')
              .map(([k, v]) => `${k}: ${v}`)
              .join(' · ')}
          </Typography>
        )}
      </Stack>

      <Divider className={styles.divider} sx={{ my: 2 }} />

      {/* ── Formulario o resultado ───────────────────────────────── */}
      {!result && (
        <>
          <ParameterForm onSubmit={evaluate} isSubmitting={isEvaluating} />
          {evaluateError && (
            <Box className={styles.errorBox}>
              <Typography color="error">{evaluateError}</Typography>
            </Box>
          )}
        </>
      )}

      {result && (
        <EvaluationResultPanel
          result={result}
          feedbackSource={feedbackSource}
          onRetry={reset}
        />
      )}
    </Box>
  );
}
