/*
 * Funcionalidad: Página de detalle de Actividad de Evaluación
 * Descripción: Carga la actividad por ID; si el ID empieza con "quiz-" renderiza el quiz
 *              con navegación pregunta a pregunta y pantalla de resultados; para otras
 *              actividades muestra instrucciones y el formulario de entrega (SubmissionForm)
 * Versión: 1.1
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from '@mui/material';
import { useAuth } from '@/shared/contexts/AuthContext';
import { activityApi } from '@/features/evaluation/api/activity.api';
import { submissionApi } from '@/features/evaluation/api/submission.api';
import {
  fetchQuizById,
  submitQuizAttempt,
} from '@/features/evaluation/shared/services/evaluationService';
import SubmissionForm from '@/features/evaluation/components/student/SubmissionForm';
import GradeResult from '@/features/evaluation/components/student/GradeResult';
import SubmissionStatusBadge from '@/features/evaluation/components/student/SubmissionStatusBadge';
import evalStyles from '@/features/evaluation/UI/evaluation.module.css';
import styles from './UI/evaluation.module.css';

export default function ActivityDetailPage() {
  const router = useRouter();
  const { activityId } = router.query;
  const { isTeacher } = useAuth();

  // Non-quiz state
  const [activity, setActivity] = useState(null);
  const [submission, setSubmission] = useState(null);

  // Quiz state
  const [quiz, setQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [attemptResult, setAttemptResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Shared state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!activityId) return;
    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (String(activityId).startsWith('quiz-')) {
          const q = await fetchQuizById(String(activityId));
          setQuiz(q);
        } else {
          const a = await activityApi.getById(String(activityId));
          setActivity(a);
          if (!isTeacher || !isTeacher()) {
            const s = await submissionApi.getOrCreateForActivity(String(activityId));
            setSubmission(s);
          }
        }
      } catch (e) {
        setError(e?.message ?? 'Error cargando actividad');
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, [activityId, isTeacher]);

  const handleSubmitQuiz = async () => {
    const answers = Object.entries(selectedAnswers).map(([questionId, optionId]) => ({
      questionId,
      optionId,
    }));
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await submitQuizAttempt(String(activityId), answers);
      setAttemptResult(result);
    } catch (e) {
      setError(e?.message ?? 'Error al enviar el quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Shared loading / error states ─────────────────────────────────────────

  if (isLoading) {
    return (
      <Box className={styles.loadingBox}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box className={styles.errorBox}>
        <Typography color="error">{error}</Typography>
        <Button variant="outlined" onClick={() => router.back()}>Volver</Button>
      </Box>
    );
  }

  // ── Quiz: results screen ───────────────────────────────────────────────────

  if (quiz && attemptResult) {
    return (
      <Box className={styles.page}>
        <Box className={evalStyles.resultsContainer}>
          <Typography variant="h5" className={evalStyles.resultsTitle}>
            Resultados — {quiz.title}
          </Typography>
          <Box className={evalStyles.scoreRow}>
            <Typography className={evalStyles.scoreItem}>
              Puntaje: {attemptResult.score}/100
            </Typography>
            <Typography className={evalStyles.scoreItem}>
              Aprobado: {attemptResult.passed ? '✅' : '❌'}
            </Typography>
            <Typography className={evalStyles.scoreItem}>
              Correctas: {attemptResult.correctCount} de {attemptResult.totalCount}
            </Typography>
          </Box>
          {attemptResult.feedback?.length > 0 && (
            <Stack spacing={0.5}>
              {attemptResult.feedback.map((f, i) => (
                <Typography key={i} variant="body2">{f}</Typography>
              ))}
            </Stack>
          )}
          <Button variant="outlined" onClick={() => router.push('/evaluation')}>
            Volver a evaluaciones
          </Button>
        </Box>
      </Box>
    );
  }

  // ── Quiz: question-by-question view ──────────────────────────────────────

  if (quiz) {
    const questions = quiz.questions ?? [];
    const current = questions[currentQuestionIndex];
    const isLast = currentQuestionIndex === questions.length - 1;
    const allAnswered = questions.every((q) => selectedAnswers[q.id]);

    return (
      <Box className={styles.page}>
        <Typography variant="h4" className={styles.title}>{quiz.title}</Typography>
        <Divider className={styles.divider} />

        <Box className={evalStyles.quizContainer}>
          <Typography className={evalStyles.progressText}>
            Pregunta {currentQuestionIndex + 1} de {questions.length}
          </Typography>

          {current && (
            <>
              <Typography className={evalStyles.questionText}>{current.text}</Typography>

              <FormControl component="fieldset">
                <RadioGroup
                  value={selectedAnswers[current.id] ?? ''}
                  onChange={(e) =>
                    setSelectedAnswers((prev) => ({ ...prev, [current.id]: e.target.value }))
                  }
                >
                  {current.options.map((opt) => (
                    <FormControlLabel
                      key={opt.id}
                      value={opt.id}
                      control={<Radio />}
                      label={opt.text}
                    />
                  ))}
                </RadioGroup>
              </FormControl>

              <Box className={evalStyles.navigationRow}>
                <Button
                  variant="outlined"
                  disabled={currentQuestionIndex === 0}
                  onClick={() => setCurrentQuestionIndex((i) => i - 1)}
                >
                  Anterior
                </Button>

                {isLast ? (
                  <Button
                    variant="contained"
                    onClick={handleSubmitQuiz}
                    disabled={isSubmitting || !allAnswered}
                  >
                    {isSubmitting ? 'Enviando…' : 'Enviar quiz'}
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    disabled={!selectedAnswers[current.id]}
                    onClick={() => setCurrentQuestionIndex((i) => i + 1)}
                  >
                    Siguiente
                  </Button>
                )}
              </Box>
            </>
          )}
        </Box>
      </Box>
    );
  }

  // ── Activity not found ────────────────────────────────────────────────────

  if (!activity) {
    return (
      <Box className={styles.errorBox}>
        <Typography>Actividad no encontrada.</Typography>
      </Box>
    );
  }

  // ── Regular activity view (existing behavior) ─────────────────────────────

  return (
    <Box className={styles.page}>
      <Stack spacing={1}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
        >
          <Typography variant="h4" className={styles.title}>
            {activity.title}
          </Typography>
          <SubmissionStatusBadge status={submission?.status} />
        </Stack>

        <Typography variant="body2" className={styles.detailMeta}>
          Tipo: {activity.type} · Puntaje máximo: {activity.maxScore}
        </Typography>

        {activity.description && (
          <Typography variant="body1">
            {activity.description}
          </Typography>
        )}
      </Stack>

      <Divider className={styles.divider} />

      {activity.instructions && (
        <>
          <Typography variant="h6" className={styles.sectionTitle}>
            Instrucciones
          </Typography>
          <Typography variant="body2" className={styles.instructions}>
            {activity.instructions}
          </Typography>
          <Divider className={styles.divider} />
        </>
      )}

      {!isTeacher || !isTeacher() ? (
        <>
          <Typography variant="h6" className={styles.sectionTitle}>
            Entrega
          </Typography>
          <SubmissionForm
            activityId={activity.id}
            submission={submission}
            onSubmissionChange={setSubmission}
          />
          <GradeResult submission={submission} />
        </>
      ) : (
        <Typography variant="body2" className={styles.teacherNote}>
          Vista docente en construcción. Usa el panel de calificación para revisar entregas.
        </Typography>
      )}
    </Box>
  );
}
