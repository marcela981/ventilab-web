/*
* Funcionalidad: AttemptResultPage
* Descripción: Page /evaluations/[evaluationId]/attempts/[attemptId]/result: the result of one attempt of the signed-in student. Loads the attempt (`GET /api/evaluation-attempts/{attemptId}`); an attempt still IN_PROGRESS goes back to the player. Unpublished attempts show only their state ("Enviado" for SUBMITTED, "Pendiente de calificación" for PENDING_REVIEW or a GRADED grade not yet published) and what happens next, without reading correctness, explanation, rubric or earned score. Published attempts show the grade (es-CO, colored by `passed` from the API), the score, the overall AI feedback and every question (QuestionResult). The AI feedback (`GET .../feedback`, only once published) is refreshed by the socket: `notification:new` of type FEEDBACK_READY for this attempt revalidates the feedback, `grade:published` for this attempt revalidates the attempt and the feedback; spaced polling in useAttemptFeedback is the backup while items are pending. Links back to the list and to the evaluation intro. Depends on next/head, next/link, next/router, the design-system components, @shared/lib, @shared/realtime, the evaluations hooks, entities and components, and the attempt result CSS Module. v1.1 (A3 review S4): passes the polling-stopped flag to the pending feedback blocks. v1.2 (B2 closure): the attemptId of a notification is read from its typed data (no cast). v1.3 (closure B1): notification:new is the per-type union, so `type === "FEEDBACK_READY"` narrows `data` (no `"attemptId" in data` check). v1.4 (Bloque 3): July result band (ResultsBand: verdict with emojis except EXAM, "{c} de {t} correctas", pending text with the partial closed score) and the feedback requested in parallel with the attempt (stopped once the attempt is known to be unpublished). v1.5 (ajustes C1): three release states set by the teacher: nothing released → "Entregado — en espera de resultados" (no score, no partial count, no correction); grade released → grade, verdict and score with a note that the answers and the feedback come later (no per-question correction, no AI feedback request); answers released → the full view. The AI feedback is requested only once the loaded attempt has answersReleased; FEEDBACK_READY also reloads the attempt.
* Versión: 1.5
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
import { ResultsBand } from "../components/result/results-band";
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
  waitingTitle: "En espera de resultados",
  waitingText:
    "Tu intento fue entregado. Tu docente revisará y liberará los resultados; te notificaremos cuando estén disponibles y aquí los verás.",
  gradeOnlyNote: "Tu docente liberó la nota. Las respuestas y la retroalimentación se mostrarán cuando las libere.",
  resultLabel: "Resultado",
  gradeLabel: "Nota",
  passed: "Aprobado",
  failed: "Reprobado",
  score: (score: number, maxScore: number) => `${scoreFormatter.format(score)} de ${scoreFormatter.format(maxScore)} puntos`,
  overallFeedback: "Retroalimentación general",
  feedbackUnavailable: "La retroalimentación no está disponible por ahora.",
} as const;

// Nothing released yet: only the submission, never a score or a correction.
function WaitingResult({ attempt }: { attempt: AttemptDetail }) {
  return (
    <section className={cx(styles.statusCard)} aria-labelledby="attempt-result-status">
      <h2 id="attempt-result-status" className={cx(styles.statusTitle)}>{RESULT_COPY.waitingTitle}</h2>
      {attempt.submittedAt ? <p className={cx(styles.muted)}>{RESULT_COPY.submittedAt(attempt.submittedAt)}</p> : null}
      <p>{RESULT_COPY.waitingText}</p>
    </section>
  );
}

// The grade is released but not the answers: grade and verdict only, no per-question correction nor AI feedback.
function GradeOnlyResult({ attempt }: { attempt: AttemptDetail }) {
  return (
    <>
      {attempt.result ? <ResultSummary result={attempt.result} /> : null}
      <p className={cx(styles.statusCard, styles.releaseNote)} role="note">{RESULT_COPY.gradeOnlyNote}</p>
    </>
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
  // The AI feedback is part of the answers release: it is requested only once the loaded attempt says so
  // (the endpoint answers 404 before).
  const feedbackEnabled = attempt?.answersReleased === true;
  const feedbackQuery = useAttemptFeedback(attemptId, feedbackEnabled);
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
    // `type` narrows `data` to the FEEDBACK_READY variant of the contract.
    // FEEDBACK_READY also means the answers are released: read the attempt again so the feedback is requested.
    if (payload.type === "FEEDBACK_READY" && payload.data?.attemptId === attemptId) {
      void reload().catch(() => undefined);
      void reloadFeedback().catch(() => undefined);
    }
  }, [attemptId, reload, reloadFeedback]);

  const handleGradePublished = useCallback((payload: GradePublishedEvent) => {
    if (payload.attemptId === attemptId) {
      void reload().catch(() => undefined);
      void reloadFeedback().catch(() => undefined);
    }
  }, [attemptId, reload, reloadFeedback]);

  useSocketEvent("notification:new", handleNotification);
  useSocketEvent("grade:published", handleGradePublished);

  const ready = attempt !== null && !inProgress;

  const renderReleased = (current: AttemptDetail) => {
    if (!current.published) {
      return <WaitingResult attempt={current} />;
    }

    if (!current.answersReleased) {
      return <GradeOnlyResult attempt={current} />;
    }

    return (
      <PublishedResult
        attempt={current}
        feedback={feedbackQuery.feedback}
        feedbackFailed={feedbackQuery.feedback === null && feedbackQuery.error !== null}
        pollingStopped={feedbackQuery.pollingStopped}
      />
    );
  };

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
          <ResultsBand attempt={attempt} />
          {renderReleased(attempt)}
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
