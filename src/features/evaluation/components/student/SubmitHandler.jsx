/*
 * Funcionalidad: Formulario Interactivo de Evaluación — Manejo de Envío
 * Descripción: Gestiona la navegación pregunta a pregunta, el temporizador opcional,
 *              el envío de respuestas y la pantalla de resultados para actividades
 *              EXAM, QUIZ y TALLER con preguntas estructuradas en el campo instructions.
 *
 *              Modo EXAM / TALLER:
 *                - Navegación libre entre preguntas (Anterior / Siguiente)
 *                - Envío único al final; se puede enviar con preguntas sin responder (advertencia)
 *                - Calificación automática de selección múltiple
 *
 *              Modo QUIZ (activity.type === 'QUIZ'):
 *                - Retroalimentación inmediata al seleccionar (correcto ✓ / incorrecto ✗)
 *                - "Siguiente" sólo habilitado tras responder la pregunta actual
 *                - Resultados al terminar todas las preguntas
 *
 * Versión: 1.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import PropTypes from 'prop-types';
import {
  Alert,
  Box,
  Button,
  LinearProgress,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import { submissionApi } from '@/features/evaluation/api/submission.api';
import QuestionRenderer from './QuestionRenderer';
import evalStyles from '@/features/evaluation/UI/evaluation.module.css';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Computes a 0-100 score from the answers map.
 * Only multiple_choice / case_study / true_false questions are auto-scored.
 * Open-text questions count toward the denominator (lowering the auto-score)
 * but cannot be auto-graded.
 */
function calcAutoScore(questions, answers) {
  const total = questions.length;
  if (total === 0) return { score: null, correct: 0, total: 0 };

  const scoreable = questions.filter((q) =>
    ['multiple_choice', 'case_study', 'true_false'].includes(q.type)
  );
  if (scoreable.length === 0) return { score: null, correct: 0, total };

  let correct = 0;
  for (const q of scoreable) {
    const selectedId = answers[q.id];
    if (!selectedId) continue;
    const opt = q.options?.find((o) => o.id === selectedId);
    if (opt?.isCorrect) correct++;
  }

  return { score: (correct / total) * 100, correct, total };
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function SubmitHandler({
  activity,
  questions,
  passingScore,
  submission,
  onSubmitted,
}) {
  const router = useRouter();
  const isQuizMode = activity.type === 'QUIZ';
  const isAlreadyLocked = submission?.status !== 'DRAFT';

  // ── Navigation & answer state ──────────────────────────────────────────────
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState(() => {
    const existing = submission?.content?.answers;
    if (!Array.isArray(existing)) return {};
    return Object.fromEntries(
      existing.map((a) => [a.questionId, a.selectedOptionId ?? a.textAnswer ?? ''])
    );
  });
  // In quiz mode every question is "revealed" immediately when answered
  const [revealed, setRevealed] = useState({});

  // ── Submit state ──────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [result, setResult] = useState(null); // { score, correct, total, passed }

  // ── Timer ─────────────────────────────────────────────────────────────────
  const [timeLeft, setTimeLeft] = useState(
    activity.timeLimit ? activity.timeLimit * 60 : null
  );

  // Keep a stable ref to handleSubmit so the timer effect can call the latest version
  const submitRef = useRef(null);

  useEffect(() => {
    if (timeLeft === null || isAlreadyLocked || result) return;
    if (timeLeft === 0) {
      submitRef.current?.();
      return;
    }
    const id = setTimeout(() => setTimeLeft((t) => (t > 0 ? t - 1 : 0)), 1000);
    return () => clearTimeout(id);
  }, [timeLeft, isAlreadyLocked, result]);

  // ── Current question helpers ──────────────────────────────────────────────
  const current = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;
  const currentAnswered = Boolean(current && answers[current.id]);
  const currentRevealed = Boolean(current && revealed[current.id]);
  const unansweredCount = questions.filter((q) => !answers[q.id]).length;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleAnswer = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    if (isQuizMode) {
      setRevealed((prev) => ({ ...prev, [questionId]: true }));
    }
  };

  const handleNext = () => setCurrentIndex((i) => Math.min(i + 1, questions.length - 1));
  const handlePrev = () => setCurrentIndex((i) => Math.max(i - 1, 0));

  const handleSubmit = async () => {
    if (!submission?.id) return;
    setSubmitting(true);
    setSubmitError(null);

    const answersPayload = questions.map((q) => {
      const val = answers[q.id] ?? '';
      if (['multiple_choice', 'case_study', 'true_false'].includes(q.type)) {
        return { questionId: q.id, selectedOptionId: val };
      }
      return { questionId: q.id, textAnswer: val };
    });

    const { score, correct, total } = calcAutoScore(questions, answers);

    try {
      await submissionApi.saveDraft(submission.id, {
        content: { answers: answersPayload, autoScore: score, autoScoreDetails: { correct, total } },
      });
      await submissionApi.submit(submission.id);
      const passed = score !== null ? score >= passingScore : null;
      setResult({ score, correct, total, passed });
      onSubmitted?.();
    } catch (err) {
      setSubmitError(err?.message ?? 'Error al enviar. Intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  // Always keep submitRef up to date so the timer can call it
  submitRef.current = handleSubmit;

  // ── Render: guard ─────────────────────────────────────────────────────────
  if (!submission) {
    return <Typography>No se pudo inicializar la entrega.</Typography>;
  }

  // ── Render: already submitted / graded before this session ────────────────
  if (isAlreadyLocked && !result) {
    return (
      <Box className={evalStyles.examContainer}>
        <Box
          className={`${evalStyles.resultsBand} ${
            submission.status === 'GRADED' && submission.score >= passingScore
              ? evalStyles.resultsBandPassed
              : evalStyles.resultsBandFailed
          }`}
        >
          {submission.status === 'GRADED' ? (
            <Box>
              <Typography
                className={`${evalStyles.resultsScoreNumber} ${
                  submission.score >= passingScore
                    ? evalStyles.resultsScorePassed
                    : evalStyles.resultsScoreFailed
                }`}
              >
                {submission.score ?? '—'}
              </Typography>
              <Typography variant="caption">/ {submission.maxScore ?? activity.maxScore}</Typography>
            </Box>
          ) : (
            <Typography variant="h6">
              Esta actividad ya fue enviada y está pendiente de revisión.
            </Typography>
          )}
        </Box>
        {submission.feedback && (
          <Typography variant="body2">{submission.feedback}</Typography>
        )}
        <Button variant="outlined" onClick={() => router.push('/evaluation')}>
          Volver a evaluaciones
        </Button>
      </Box>
    );
  }

  // ── Render: results after this session's submit ──────────────────────────
  if (result) {
    const hasScore = result.score !== null;
    return (
      <Box className={evalStyles.examContainer}>
        <Box
          className={`${evalStyles.resultsBand} ${
            result.passed !== false ? evalStyles.resultsBandPassed : evalStyles.resultsBandFailed
          }`}
        >
          {hasScore ? (
            <>
              <Box>
                <Typography
                  className={`${evalStyles.resultsScoreNumber} ${
                    result.passed ? evalStyles.resultsScorePassed : evalStyles.resultsScoreFailed
                  }`}
                >
                  {result.score.toFixed(0)}
                </Typography>
                <Typography variant="caption">/ 100</Typography>
              </Box>
              <Box>
                <Typography variant="h5">
                  {result.passed ? 'Aprobado ✅' : 'Reprobado ❌'}
                </Typography>
                <Typography className={evalStyles.resultsDetail}>
                  {result.correct} de {result.total} correctas
                </Typography>
              </Box>
            </>
          ) : (
            <Typography variant="h6">
              Respuestas enviadas — pendiente de revisión por el docente
            </Typography>
          )}
        </Box>
        <Button variant="outlined" onClick={() => router.push('/evaluation')}>
          Volver a evaluaciones
        </Button>
      </Box>
    );
  }

  // ── Render: interactive exam / quiz ──────────────────────────────────────
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const timerIsWarning = timeLeft !== null && timeLeft < 120;
  const canAdvance = isQuizMode ? currentAnswered : true;
  const canSubmit = !isQuizMode || currentAnswered;

  return (
    <Box className={evalStyles.examContainer}>
      {/* Progress row */}
      <Box className={evalStyles.progressRow}>
        <Typography className={evalStyles.progressLabel}>
          Pregunta {currentIndex + 1} de {questions.length}
        </Typography>
        {timeLeft !== null && (
          <Typography
            className={
              timerIsWarning
                ? `${evalStyles.progressLabel} ${evalStyles.timerWarning}`
                : evalStyles.progressLabel
            }
          >
            ⏱ {formatTime(timeLeft)}
          </Typography>
        )}
      </Box>

      <LinearProgress
        variant="determinate"
        value={progress}
        className={evalStyles.progressBarMui}
      />

      {/* Question card */}
      {current && (
        <QuestionRenderer
          question={current}
          value={answers[current.id]}
          onChange={(val) => handleAnswer(current.id, val)}
          mode={isQuizMode ? 'quiz' : 'exam'}
          revealed={currentRevealed}
          locked={false}
        />
      )}

      {/* Navigation */}
      <Box className={evalStyles.navigationRow}>
        <Button variant="outlined" disabled={currentIndex === 0} onClick={handlePrev}>
          Anterior
        </Button>

        {isLast ? (
          <Box className={evalStyles.submitRow}>
            {unansweredCount > 0 && (
              <Typography className={evalStyles.unansweredWarning}>
                {unansweredCount} pregunta{unansweredCount > 1 ? 's' : ''} sin responder
              </Typography>
            )}
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={submitting || !canSubmit}
            >
              {submitting ? 'Enviando…' : 'Enviar respuesta'}
            </Button>
          </Box>
        ) : (
          <Button variant="contained" disabled={!canAdvance} onClick={handleNext}>
            Siguiente
          </Button>
        )}
      </Box>

      {/* Error snackbar */}
      <Snackbar
        open={Boolean(submitError)}
        onClose={() => setSubmitError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="error"
          onClose={() => setSubmitError(null)}
          action={
            <Button size="small" color="inherit" onClick={handleSubmit}>
              Reintentar
            </Button>
          }
        >
          {submitError}
        </Alert>
      </Snackbar>
    </Box>
  );
}

SubmitHandler.propTypes = {
  activity: PropTypes.shape({
    type: PropTypes.string.isRequired,
    maxScore: PropTypes.number,
    timeLimit: PropTypes.number,
  }).isRequired,
  questions: PropTypes.arrayOf(PropTypes.object).isRequired,
  passingScore: PropTypes.number,
  submission: PropTypes.object,
  onSubmitted: PropTypes.func,
};

SubmitHandler.defaultProps = {
  passingScore: 70,
};
