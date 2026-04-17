/*
 * Funcionalidad: Página de detalle de Actividad de Evaluación
 * Descripción: Carga la actividad por ID y delega el renderizado al componente
 *              apropiado según el tipo de actividad:
 *              - QUIZ  → QuizRenderer  (todas las preguntas, feedback inmediato)
 *              - TALLER → TallerRenderer (paginado, pistas, explicaciones)
 *              - EXAM  → ExamRenderer  (paginado, temporizador, sin feedback)
 *              Para actividades sin preguntas estructuradas muestra instrucciones
 *              y el formulario de entrega (SubmissionForm).
 * Versión: 2.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { useAuth } from '@/shared/contexts/AuthContext';
import { activityApi } from '@/features/evaluation/api/activity.api';
import { submissionApi } from '@/features/evaluation/api/submission.api';
import { quizApi } from '@/features/evaluation/api/quiz.api';
import {
  fetchQuizById,
} from '@/features/evaluation/shared/services/evaluationService';
import SubmissionForm from '@/features/evaluation/components/student/SubmissionForm';
import GradeResult from '@/features/evaluation/components/student/GradeResult';
import SubmissionStatusBadge from '@/features/evaluation/components/student/SubmissionStatusBadge';
import ResultsScreen from '@/features/evaluation/components/student/ResultsScreen';
import QuizRenderer from '@/features/evaluation/components/student/QuizRenderer';
import TallerRenderer from '@/features/evaluation/components/student/TallerRenderer';
import ExamRenderer from '@/features/evaluation/components/student/ExamRenderer';
import styles from './UI/evaluation.module.css';

export default function ActivityDetailPage() {
  const router = useRouter();
  const { activityId } = router.query;
  const { isTeacher } = useAuth();

  // Non-quiz state
  const [activity, setActivity] = useState(null);
  const [submission, setSubmission] = useState(null);

  // Quiz state (fetched via quiz-specific endpoint for quiz-* IDs)
  const [quiz, setQuiz] = useState(null);
  const [quizAttempt, setQuizAttempt] = useState(null);

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
          const [q, attempt] = await Promise.all([
            fetchQuizById(String(activityId)),
            quizApi.getMyAttempt(String(activityId)),
          ]);
          setQuiz(q);
          setQuizAttempt(attempt);
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

  // ── Parse structured questions from activity.instructions ─────────────────
  const parsedContent = useMemo(() => {
    if (!activity?.instructions) return null;
    try {
      const p = JSON.parse(activity.instructions);
      if (Array.isArray(p?.questions) && p.questions.length > 0) return p;
    } catch { /* instructions is plain text — fall through */ }
    return null;
  }, [activity]);

  // ── Parse previously saved result from submission.content ─────────────────
  const submittedResult = useMemo(() => {
    if (!submission?.content) return null;
    if (!['SUBMITTED', 'GRADED'].includes(submission.status)) return null;
    try { return JSON.parse(submission.content); } catch { return null; }
  }, [submission]);

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

  // ── Quiz (fetched via quiz-specific endpoint) ─────────────────────────────
  if (quiz) {
    const quizId = String(activityId);

    const handleQuizSubmitted = async ({ answers, score, correct, total, passed }) => {
      try {
        const answersArray = Object.entries(answers ?? {}).map(
          ([questionId, selectedOptionId]) => ({ questionId, selectedOptionId }),
        );
        const attempt = await quizApi.submitAttempt(quizId, answersArray);
        setQuizAttempt(attempt);
      } catch {
        // ResultsScreen is already shown from local renderer state; backend is best-effort
      }
    };

    return (
      <Box className={styles.page}>
        <Box className={styles.rendererWrapper}>
          <Button
            variant="outlined"
            size="small"
            className={styles.backBtn}
            onClick={() => router.push('/evaluation')}
          >
            ← Volver a evaluaciones
          </Button>
          <Typography variant="h4" className={styles.title}>{quiz.title}</Typography>
          <Divider className={styles.divider} />
          {quizAttempt ? (
            <ResultsScreen
              score={quizAttempt.score}
              correct={null}
              total={null}
              passed={quizAttempt.passed}
              showEmojis
            />
          ) : (
            <QuizRenderer
              questions={quiz.questions ?? []}
              passingScore={quiz.passingScore ?? 70}
              onSubmitted={handleQuizSubmitted}
            />
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

  // ── Select renderer based on activity.type ────────────────────────────────
  const isStudentView = !isTeacher || !isTeacher();
  const activityType = (activity.type ?? '').toUpperCase();

  // Render type-specific component when structured questions exist
  const renderStructuredActivity = () => {
    if (!parsedContent) return null;
    const questions = parsedContent.questions;
    const passingScore = parsedContent.passingScore ?? 70;

    // Re-entry: show previously submitted results
    if (submittedResult || ['SUBMITTED', 'GRADED'].includes(submission?.status)) {
      return (
        <ResultsScreen
          score={submittedResult?.score ?? null}
          correct={submittedResult?.correct ?? null}
          total={submittedResult?.total ?? null}
          passed={submittedResult?.passed ?? null}
          showEmojis={activityType !== 'EXAM'}
        />
      );
    }

    const handleSubmitted = async ({ answers, score, correct, total, passed }) => {
      try {
        if (submission?.id) {
          await submissionApi.saveDraft(submission.id, {
            content: JSON.stringify({ answers, score, correct, total, passed }),
          });
          const updated = await submissionApi.submit(submission.id);
          setSubmission(updated);
        }
      } catch {
        setSubmission((s) => (s ? { ...s, status: 'SUBMITTED' } : s));
      }
    };

    if (activityType === 'QUIZ') {
      return (
        <QuizRenderer
          questions={questions}
          passingScore={passingScore}
          onSubmitted={handleSubmitted}
        />
      );
    }

    if (activityType === 'TALLER') {
      return (
        <TallerRenderer
          questions={questions}
          passingScore={passingScore}
          onSubmitted={handleSubmitted}
        />
      );
    }

    if (activityType === 'EXAM') {
      return (
        <ExamRenderer
          questions={questions}
          passingScore={passingScore}
          timeLimit={activity.timeLimit}
          onSubmitted={handleSubmitted}
        />
      );
    }

    return null;
  };

  // ── Regular activity view ─────────────────────────────────────────────────
  return (
    <Box className={styles.page}>
      <Box className={styles.rendererWrapper}>
        {/* ── Header: title, status badge, meta ───────────────────────────────── */}
        <Button
        variant="outlined"
        size="small"
        className={styles.backBtn}
        onClick={() => router.push('/evaluation')}
      >
        ← Volver a evaluaciones
      </Button>
      <Stack spacing={1}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Typography variant="h4" className={styles.title}>
            {activity.title}
          </Typography>
          <SubmissionStatusBadge status={submission?.status} />
        </Stack>

        <Typography variant="body2" className={styles.detailMeta}>
          Tipo: {activity.type} · Puntaje máximo: {activity.maxScore}
          {activity.timeLimit ? ` · Tiempo: ${activity.timeLimit} min` : ''}
        </Typography>

        {activity.description && (
          <Typography variant="body1" className={styles.subtitle}>
            {activity.description}
          </Typography>
        )}
      </Stack>

      <Divider className={styles.divider} />

      {/* ── Teacher view ────────────────────────────────────────────────────── */}
      {!isStudentView && (
        <>
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
          <Typography variant="body2" className={styles.teacherNote}>
            Vista docente en construcción. Usa el panel de calificación para revisar entregas.
          </Typography>
        </>
      )}

      {/* ── Student: structured questions → type-specific renderer ──────────── */}
      {isStudentView && parsedContent && renderStructuredActivity()}

      {/* ── Student: no questions in instructions → content unavailable ─────── */}
      {isStudentView && !parsedContent && !activity.instructions &&
        ['EXAM', 'QUIZ', 'TALLER'].includes(activityType) && (
        <Box className={styles.errorBox}>
          <Typography variant="body1">Contenido no disponible.</Typography>
          <Button variant="outlined" onClick={() => router.back()}>Volver</Button>
        </Box>
      )}

      {/* ── Student: plain-text instructions + open submission form ─────────── */}
      {isStudentView && !parsedContent &&
        (activity.instructions || !['EXAM', 'QUIZ', 'TALLER'].includes(activityType)) && (
        <>
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
      )}
      </Box>
    </Box>
  );
}
