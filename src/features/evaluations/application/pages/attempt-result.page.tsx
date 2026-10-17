/*
* Funcionalidad: AttemptResultPage
* Descripción: Page /evaluations/[evaluationId]/attempts/[attemptId]/result: the result of one attempt of the signed-in student. Loads the attempt (`GET /api/evaluation-attempts/{attemptId}`); an attempt still IN_PROGRESS goes back to the player. Unpublished attempts show only their state ("Enviado" for SUBMITTED, "Pendiente de calificación" for PENDING_REVIEW or a GRADED grade not yet published) and what happens next, without reading correctness, explanation, rubric or earned score. Published attempts show the grade (es-CO, colored by `passed` from the API), the score, the overall AI feedback and every question (QuestionResult). The AI feedback (`GET .../feedback`, only once published) is refreshed by the socket: `notification:new` of type FEEDBACK_READY for this attempt revalidates the feedback, `grade:published` for this attempt revalidates the attempt and the feedback; spaced polling in useAttemptFeedback is the backup while items are pending. Links back to the list and to the evaluation intro. Depends on next/head, next/link, next/router, the design-system components, @shared/lib, @shared/realtime, the evaluations hooks, entities and components, and the attempt result CSS Module. v1.1 (A3 review S4): passes the polling-stopped flag to the pending feedback blocks. v1.2 (B2 closure): the attemptId of a notification is read from its typed data (no cast).
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useRef } from "react";
import { ErrorState } from "@shared/design-system/components/error-state";
import { CardSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { formatDateTime, formatGrade } from "@shared/lib/format";
import { useSocketEvent } from "@shared/realtime";
import type { GradePublishedEvent, RealtimeEventMap } from "@shared/realtime";
import { FeedbackBlock } from "../components/result/feedback-block";
import { QuestionResult } from "../components/result/question-result";
import type { AttemptFeedback } from "../entities/attempt-feedback";
import { findQuestionFeedback } from "../entities/attempt-feedback";
import type { AttemptDetail, AttemptResult } from "../entities/evaluation.entity";
import { EVALUATION_TYPE_LABELS } from "../entities/evaluation-labels";
import { getEvaluationErrorMessage } from "../entities/evaluations-error-messages";
import { buildAttemptUrl, buildEvaluationIntroUrl, EVALUATIONS_URL } from "../entities/evaluations-urls";
import { useAttempt } from "../hooks/use-attempt";
import { useAttemptFeedback } from "../hooks/use-attempt-feedback";
import styles from "../../UI/attempt-result.module.css";

const scoreFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

// TODO(i18n): move to an evaluations namespace in src/i18n.
export const RESULT_COPY = {
  documentTitle: (title: string) => `Resultado: ${title} | VentyLab`,
  fallbackTitle: "Resultado del intento",
  loading: "Cargando el resultado…",
  loadErrorTitle: "No se pudo cargar el resultado",
  backToList: "Volver a mis evaluaciones",
  backToIntro: "Ver la evaluación",
  attemptNumber: (attemptNumber: number) => `Intento ${attemptNumber}`,
  submittedAt: (date: string) => `Enviado el ${formatDateTime(date)}`,
  submittedTitle: "Enviado",
  submittedText:
    "Tu intento fue enviado. El docente revisará y publicará la nota; te notificaremos cuando esté disponible y aquí verás el detalle de cada pregunta.",
  pendingTitle: "Pendiente de calificación",
  pendingText:
    "Tu intento está en revisión. Cuando el docente publique la nota te notificaremos y aquí verás tu calificación, las respuestas correctas y la retroalimentación.",
  resultLabel: "Resultado",
  gradeLabel: "Nota",
  passed: "Aprobado",
  failed: "Reprobado",
  score: (score: number, maxScore: number) => `${scoreFormatter.format(score)} de ${scoreFormatter.format(maxScore)} puntos`,
  overallFeedback: "Retroalimentación general",
  feedbackUnavailable: "La retroalimentación no está disponible por ahora.",
} as const;

function notificationAttemptId({ data }: RealtimeEventMap["notification:new"]): string | null {
  // The contract types `data` per notification type: only the grade and feedback variants carry an attemptId.
  return data !== null && "attemptId" in data ? data.attemptId : null;
}

function UnpublishedResult({ attempt }: { attempt: AttemptDetail }) {
  const submitted = attempt.status === "SUBMITTED";

  return (
    <section className={cx(styles.statusCard)} aria-labelledby="attempt-result-status">
      <h2 id="attempt-result-status" className={cx(styles.statusTitle)}>
        {submitted ? RESULT_COPY.submittedTitle : RESULT_COPY.pendingTitle}
      </h2>
      {attempt.submittedAt ? <p className={cx(styles.muted)}>{RESULT_COPY.submittedAt(attempt.submittedAt)}</p> : null}
      <p>{submitted ? RESULT_COPY.submittedText : RESULT_COPY.pendingText}</p>
    </section>
  );
}

function ResultSummary({ result }: { result: AttemptResult }) {
  return (
    <section className={cx(styles.summary)} aria-label={RESULT_COPY.resultLabel}>
      <p className={cx(styles.grade, result.passed ? styles.gradePassed : styles.gradeFailed)} data-testid="attempt-grade">
        <span className={cx(styles.gradeLabel)}>{RESULT_COPY.gradeLabel}</span>
        <span className={cx(styles.gradeValue)}>{formatGrade(result.grade)}</span>
        <span className={cx(styles.gradeVerdict)}>{result.passed ? RESULT_COPY.passed : RESULT_COPY.failed}</span>
      </p>
      <p className={cx(styles.muted)}>{RESULT_COPY.score(result.score, result.maxScore)}</p>
    </section>
  );
}

type PublishedResultProps = {
  attempt: AttemptDetail
  feedback: AttemptFeedback | null
  feedbackFailed: boolean
  pollingStopped: boolean
};

function PublishedResult({ attempt, feedback, feedbackFailed, pollingStopped }: PublishedResultProps) {
  const total = attempt.questions.length;

  return (
    <>
      {attempt.result ? <ResultSummary result={attempt.result} /> : null}
      {feedbackFailed ? <p className={cx(styles.feedbackHint)}>{RESULT_COPY.feedbackUnavailable}</p> : null}
      <FeedbackBlock item={feedback?.overall ?? null} title={RESULT_COPY.overallFeedback} pollingStopped={pollingStopped} />
      {attempt.questions.map((question, index) => (
        <QuestionResult
          key={question.id}
          question={question}
          index={index}
          total={total}
          feedback={findQuestionFeedback(feedback, question.id)}
          pollingStopped={pollingStopped}
        />
      ))}
    </>
  );
}

export type AttemptResultPageProps = {
  evaluationId: string
  attemptId: string
};

export function AttemptResultPage({ evaluationId, attemptId }: AttemptResultPageProps) {
  const router = useRouter();
  const { attempt, isLoading, error, reload } = useAttempt(attemptId);
  const published = attempt?.published === true;
  const feedbackQuery = useAttemptFeedback(attemptId, published);
  const { reload: reloadFeedback } = feedbackQuery;
  const leavingRef = useRef(false);
  const inProgress = attempt?.status === "IN_PROGRESS";
  const playerUrl = buildAttemptUrl(evaluationId, attemptId);

  useEffect(() => {
    if (inProgress && !leavingRef.current) {
      leavingRef.current = true;
      void router.replace(playerUrl);
    }
  }, [inProgress, playerUrl, router]);

  const handleNotification = useCallback((payload: RealtimeEventMap["notification:new"]) => {
    if (payload.type === "FEEDBACK_READY" && notificationAttemptId(payload) === attemptId) {
      void reloadFeedback().catch(() => undefined);
    }
  }, [attemptId, reloadFeedback]);

  const handleGradePublished = useCallback((payload: GradePublishedEvent) => {
    if (payload.attemptId === attemptId) {
      void reload().catch(() => undefined);
      void reloadFeedback().catch(() => undefined);
    }
  }, [attemptId, reload, reloadFeedback]);

  useSocketEvent("notification:new", handleNotification);
  useSocketEvent("grade:published", handleGradePublished);

  const ready = attempt !== null && !inProgress;

  return (
    <div className={cx(styles.page)}>
      <Head>
        <title>{RESULT_COPY.documentTitle(attempt?.evaluation.title ?? RESULT_COPY.fallbackTitle)}</title>
      </Head>
      <nav className={cx(styles.links)}>
        <Link href={EVALUATIONS_URL} className={cx(styles.link)}>{RESULT_COPY.backToList}</Link>
        <Link href={buildEvaluationIntroUrl(evaluationId)} className={cx(styles.link)}>{RESULT_COPY.backToIntro}</Link>
      </nav>
      {ready ? (
        <>
          <header className={cx(styles.header)}>
            <h1 className={cx(styles.title)}>{attempt.evaluation.title}</h1>
            <p className={cx(styles.muted)}>
              {EVALUATION_TYPE_LABELS[attempt.evaluation.type]} · {RESULT_COPY.attemptNumber(attempt.attemptNumber)}
            </p>
          </header>
          {attempt.published ? (
            <PublishedResult
              attempt={attempt}
              feedback={feedbackQuery.feedback}
              feedbackFailed={feedbackQuery.feedback === null && feedbackQuery.error !== null}
              pollingStopped={feedbackQuery.pollingStopped}
            />
          ) : <UnpublishedResult attempt={attempt} />}
        </>
      ) : null}
      {(!attempt && isLoading) || inProgress ? <CardSkeleton label={RESULT_COPY.loading} /> : null}
      {!attempt && !isLoading && error ? (
        <ErrorState
          title={RESULT_COPY.loadErrorTitle}
          description={getEvaluationErrorMessage(error)}
          onRetry={() => void reload()}
        />
      ) : null}
    </div>
  );
}
