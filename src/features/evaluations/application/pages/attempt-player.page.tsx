/*
* Funcionalidad: AttemptPlayerPage
* Descripción: Page /evaluations/[evaluationId]/attempts/[attemptId]: the student answers one attempt. Loads the attempt (`GET /api/evaluation-attempts/{attemptId}`); an attempt that is no longer IN_PROGRESS goes straight to its result. Shows the question navigator (answered, unanswered, marked for review; marks are client-only), the sticky clinical scenario of the current question, the question (QuestionView) with Previous/Next, the autosave status per answer and a clock corrected for the server clock skew (toasts at 5 and 1 minutes). The current question and the marks are kept in sessionStorage so a reload resumes on the same question. Answers are saved automatically with a retry queue (unsaved values survive a reload). "Enviar intento" asks for confirmation with the number of unanswered questions, flushes the queue and submits once (single-flight); at zero the attempt is flushed and submitted automatically. Both end on the result page; a closed attempt (409) also goes there. The browser warns before leaving while answers are unsaved. Never reads correctness, explanation or rubric. Depends on MUI, next/head, next/link, next/router, the design-system components, @shared/lib, the evaluations hooks, entities and components, and the attempt player CSS Module. v1.1 (E2 review): once the time is up the controls become read-only and the automatic submit is retried with exponential backoff (autoSubmitRetryDelay) after any failure that is not a closed attempt, also when a manual submit in flight at zero fails; the retry timer is cleared on unmount; the timer receives the attempt id to pair serverNow with the client clock of its response. v1.2 (A3 review follow-up): the automatic submit retry stops once the player is unmounted (no new timer, no navigation), retries only retryable errors (network, timeout, 429, 5xx) at most AUTO_SUBMIT_MAX_RETRIES times, and otherwise shows the error and re-enables "Enviar intento" for a manual retry. v1.3 (O1 notifications): focus mode (useFocusMode of the design system) while the attempt is open, so notification toasts do not interrupt the student.
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import BookmarkIcon from "@mui/icons-material/Bookmark";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import TimerIcon from "@mui/icons-material/Timer";
import Button from "@mui/material/Button";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toApiError } from "@shared/api-client/api-error";
import { AsyncButton } from "@shared/design-system/components/async-button";
import { ConfirmDialog } from "@shared/design-system/components/confirm-dialog";
import { ErrorState } from "@shared/design-system/components/error-state";
import { CardSkeleton } from "@shared/design-system/components/skeleton";
import { useFocusMode } from "@shared/design-system/components/use-focus-mode";
import { useToast } from "@shared/design-system/components/use-toast";
import { cx } from "@shared/lib/class-names";
import { QuestionNavigator } from "../components/attempt/question-navigator";
import { SaveStatusIndicator } from "../components/attempt/save-status-indicator";
import { ScenarioPanel } from "../components/attempt/scenario-panel";
import { QuestionView } from "../components/questions/question-view";
import { clampQuestionIndex, countUnanswered, findScenario, initialAnswers } from "../entities/attempt-progress";
import {
  clearAttemptStorage,
  readMarkedQuestions,
  readQuestionIndex,
  writeMarkedQuestions,
  writeQuestionIndex,
} from "../entities/attempt-session-storage";
import { formatRemaining, MINUTE_MS } from "../entities/attempt-timer";
import type { AttemptAnswer, AttemptDetail, AttemptQuestion } from "../entities/evaluation.entity";
import { EVALUATION_TYPE_LABELS } from "../entities/evaluation-labels";
import { getEvaluationErrorMessage, isRetryableEvaluationError } from "../entities/evaluations-error-messages";
import { buildAttemptResultUrl, buildEvaluationIntroUrl } from "../entities/evaluations-urls";
import { useAttempt } from "../hooks/use-attempt";
import { useAttemptAutosave } from "../hooks/use-attempt-autosave";
import { useAttemptTimer } from "../hooks/use-attempt-timer";
import { useSubmitAttempt } from "../hooks/use-submit-attempt";
import styles from "../../UI/attempt-player.module.css";

// TODO(i18n): move to an evaluations namespace in src/i18n.
export const PLAYER_COPY = {
  documentTitle: (title: string) => `${title} | VentyLab`,
  fallbackTitle: "Intento de evaluación",
  loading: "Cargando el intento…",
  loadErrorTitle: "No se pudo cargar el intento",
  back: "Volver a la evaluación",
  attemptNumber: (attemptNumber: number) => `Intento ${attemptNumber}`,
  timeLeft: "Tiempo restante",
  questionPosition: (position: number, total: number) => `Pregunta ${position} de ${total}`,
  points: (points: number) => `${points} ${points === 1 ? "punto" : "puntos"}`,
  mark: "Marcar para revisión",
  unmark: "Quitar marca de revisión",
  previous: "Anterior",
  next: "Siguiente",
  submit: "Enviar intento",
  confirmTitle: "¿Enviar el intento?",
  confirmUnanswered: (count: number) =>
    count === 0
      ? "Respondiste todas las preguntas. Después de enviar no podrás cambiar tus respuestas."
      : `Tienes ${count} ${count === 1 ? "pregunta sin responder" : "preguntas sin responder"}. Después de enviar no podrás cambiar tus respuestas.`,
  confirm: "Enviar",
  cancel: "Seguir respondiendo",
  unsavedBeforeSubmit:
    "Algunas respuestas aún no se han guardado. Revisa tu conexión e intenta enviar de nuevo; no se perdió nada de lo que escribiste.",
  autoSubmitted: "Se acabó el tiempo. El intento se envió con las respuestas guardadas.",
  autoSubmitRetrying: "Se acabó el tiempo y no se pudo enviar el intento. Lo seguiremos intentando automáticamente.",
  autoSubmitStopped: "No se pudo enviar el intento automáticamente. Usa \"Enviar intento\" para reintentarlo.",
  emptyAttempt: "Este intento no tiene preguntas.",
} as const;

const CLOSED_ATTEMPT_CODES: ReadonlySet<string> = new Set([
  "evaluation.attempt_not_in_progress",
  "evaluation.attempt_deadline_passed",
  "evaluation.attempt_read_only",
  "evaluation.assignment_closed",
]);

export const AUTO_SUBMIT_RETRY_BASE_MS = 2000;
export const AUTO_SUBMIT_RETRY_MAX_MS = 30_000;
export const AUTO_SUBMIT_MAX_RETRIES = 10;

// Delay before the n-th retry (1-based) of the automatic submit: 2 s, 4 s, 8 s… up to 30 s.
export function autoSubmitRetryDelay(failures: number): number {
  return Math.min(AUTO_SUBMIT_RETRY_MAX_MS, AUTO_SUBMIT_RETRY_BASE_MS * 2 ** (Math.max(1, failures) - 1));
}

function isClosedAttemptError(error: unknown): boolean {
  return CLOSED_ATTEMPT_CODES.has(toApiError(error).code);
}

type PlayerProps = {
  attempt: AttemptDetail
  onFinished: () => void
};

function AttemptPlayer({ attempt, onFinished }: PlayerProps) {
  const toast = useToast();
  const { questions } = attempt;
  const total = questions.length;
  const { submit } = useSubmitAttempt();
  const finishedRef = useRef(false);
  const mountedRef = useRef(false);

  const finishOnClosedAttempt = useCallback((error: unknown) => {
    clearAttemptStorage(attempt.id);
    finishedRef.current = true;

    // A request that settles after the player is gone must not navigate from a page that no longer exists.
    if (mountedRef.current) {
      toast.info(getEvaluationErrorMessage(error));
      onFinished();
    }
  }, [attempt.id, onFinished, toast]);

  const handleSaveError = useCallback((_questionId: string, error: unknown) => {
    if (isClosedAttemptError(error)) {
      if (!finishedRef.current) {
        finishOnClosedAttempt(error);
      }

      return;
    }

    toast.error(getEvaluationErrorMessage(error));
  }, [finishOnClosedAttempt, toast]);

  const autosave = useAttemptAutosave({ attemptId: attempt.id, onError: handleSaveError });
  const [answers, setAnswers] = useState(() => initialAnswers(questions, autosave.restored));
  const [index, setIndex] = useState(() => clampQuestionIndex(readQuestionIndex(attempt.id) ?? 0, total));
  const [marked, setMarked] = useState<ReadonlySet<string>>(() => new Set(readMarkedQuestions(attempt.id)));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [autoSubmitStopped, setAutoSubmitStopped] = useState(false);
  const submittingRef = useRef(false);
  const timeUpRef = useRef(false);
  const autoFailuresRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishRef = useRef<(mode: "manual" | "auto") => Promise<void>>(() => Promise.resolve());
  const { flush } = autosave;
  const readOnly = submitting || timeUp;

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      if (retryTimerRef.current !== null) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    writeQuestionIndex(attempt.id, index);
  }, [attempt.id, index]);

  useEffect(() => {
    writeMarkedQuestions(attempt.id, [...marked]);
  }, [attempt.id, marked]);

  useEffect(() => {
    if (!autosave.hasUnsaved) {
      return undefined;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [autosave.hasUnsaved]);

  const finish = useCallback(async(mode: "manual" | "auto") => {
    if (submittingRef.current || finishedRef.current) {
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setAutoSubmitStopped(false);

    if (mode === "manual") {
      // A manual retry after the automatic submit gave up starts a fresh retry budget.
      autoFailuresRef.current = 0;
    }

    const flushed = await flush();

    // A manual submit never leaves unsaved answers behind; at zero the server closes the attempt anyway.
    if (!flushed && mode === "manual" && !timeUpRef.current) {
      toast.error(PLAYER_COPY.unsavedBeforeSubmit);
      submittingRef.current = false;
      setSubmitting(false);
      setConfirmOpen(false);

      return;
    }

    const outcome = await submit(attempt.id);

    if (outcome.status === "success") {
      if (mode === "auto") {
        toast.info(PLAYER_COPY.autoSubmitted);
      }

      clearAttemptStorage(attempt.id);
      finishedRef.current = true;

      if (mountedRef.current) {
        onFinished();
      }

      return;
    }

    if (outcome.status === "error" && isClosedAttemptError(outcome.error)) {
      finishOnClosedAttempt(outcome.error);

      return;
    }

    if (!mountedRef.current) {
      return;
    }

    submittingRef.current = false;
    setSubmitting(false);
    setConfirmOpen(false);

    if (!timeUpRef.current) {
      if (outcome.status === "error") {
        toast.error(getEvaluationErrorMessage(outcome.error));
      }

      return;
    }

    // Time is up (whoever started this submit): retry transient failures a bounded number of times.
    autoFailuresRef.current += 1;

    const retryable = outcome.status === "busy" || isRetryableEvaluationError(outcome.error);

    if (!retryable || autoFailuresRef.current > AUTO_SUBMIT_MAX_RETRIES) {
      toast.error(outcome.status === "error" && !retryable ? getEvaluationErrorMessage(outcome.error) : PLAYER_COPY.autoSubmitStopped);
      setAutoSubmitStopped(true);

      return;
    }

    if (autoFailuresRef.current === 1) {
      toast.error(PLAYER_COPY.autoSubmitRetrying);
    }

    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = null;

      if (mountedRef.current) {
        void finishRef.current("auto");
      }
    }, autoSubmitRetryDelay(autoFailuresRef.current));
  }, [attempt.id, finishOnClosedAttempt, flush, onFinished, submit, toast]);

  useEffect(() => {
    finishRef.current = finish;
  }, [finish]);

  const handleExpire = useCallback(() => {
    timeUpRef.current = true;
    setTimeUp(true);
    setConfirmOpen(false);
    // A manual submit in flight returns here; if it fails, its failure path schedules the retry.
    void finish("auto");
  }, [finish]);

  const remainingMs = useAttemptTimer({
    attemptId: attempt.id,
    deadlineAt: attempt.deadlineAt,
    serverNow: attempt.serverNow,
    onExpire: handleExpire,
  });

  const handleChange = (question: AttemptQuestion, answer: AttemptAnswer) => {
    if (timeUpRef.current) {
      return;
    }

    setAnswers((current) => ({ ...current, [question.id]: answer }));
    autosave.save(question.id, question.type, answer);
  };

  const toggleMarked = (questionId: string) => {
    setMarked((current) => {
      const next = new Set(current);

      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }

      return next;
    });
  };

  const question = questions[index];
  const scenario = findScenario(attempt.scenarios, question);
  const unanswered = countUnanswered(questions, answers);
  const isMarked = question ? marked.has(question.id) : false;

  return (
    <>
      <header className={cx(styles.header)}>
        <div className={cx(styles.headerTitle)}>
          <h1 className={cx(styles.title)}>{attempt.evaluation.title}</h1>
          <p className={cx(styles.subtitle)}>
            {EVALUATION_TYPE_LABELS[attempt.evaluation.type]} · {PLAYER_COPY.attemptNumber(attempt.attemptNumber)}
          </p>
        </div>
        <div className={cx(styles.headerActions)}>
          {remainingMs !== null ? (
            <p
              className={cx(styles.timer, remainingMs <= 5 * MINUTE_MS && styles.timerWarning, remainingMs <= MINUTE_MS && styles.timerCritical)}
              role="timer"
              aria-label={`${PLAYER_COPY.timeLeft}: ${formatRemaining(remainingMs)}`}
            >
              <TimerIcon aria-hidden="true" />
              <span aria-hidden="true">{formatRemaining(remainingMs)}</span>
            </p>
          ) : null}
          <AsyncButton variant="contained" loading={submitting} disabled={submitting || (timeUp && !autoSubmitStopped)} onClick={() => setConfirmOpen(true)}>
            {PLAYER_COPY.submit}
          </AsyncButton>
        </div>
      </header>
      <div className={cx(styles.body)}>
        <QuestionNavigator
          questions={questions}
          answers={answers}
          marked={marked}
          currentIndex={index}
          onSelect={(next) => setIndex(clampQuestionIndex(next, total))}
        />
        <div className={cx(styles.content, scenario && styles.contentWithScenario)}>
          {scenario ? <ScenarioPanel scenario={scenario} /> : null}
          {question ? (
            <section className={cx(styles.questionCard)} aria-label={PLAYER_COPY.questionPosition(index + 1, total)}>
              <div className={cx(styles.questionHeader)}>
                <h2 className={cx(styles.questionTitle)}>{PLAYER_COPY.questionPosition(index + 1, total)}</h2>
                <span className={cx(styles.questionPoints)}>{PLAYER_COPY.points(question.points)}</span>
                <Button
                  variant="text"
                  size="small"
                  aria-pressed={isMarked}
                  disabled={timeUp}
                  startIcon={isMarked ? <BookmarkIcon /> : <BookmarkBorderIcon />}
                  onClick={() => toggleMarked(question.id)}
                >
                  {isMarked ? PLAYER_COPY.unmark : PLAYER_COPY.mark}
                </Button>
              </div>
              <QuestionView
                key={question.id}
                question={question}
                answer={answers[question.id] ?? null}
                onChange={(answer) => handleChange(question, answer)}
                readOnly={readOnly}
              />
              <SaveStatusIndicator status={autosave.statuses[question.id] ?? null} />
              <div className={cx(styles.pager)}>
                <Button variant="outlined" disabled={index === 0} onClick={() => setIndex(index - 1)}>
                  {PLAYER_COPY.previous}
                </Button>
                <Button variant="outlined" disabled={index >= total - 1} onClick={() => setIndex(index + 1)}>
                  {PLAYER_COPY.next}
                </Button>
              </div>
            </section>
          ) : (
            <p>{PLAYER_COPY.emptyAttempt}</p>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title={PLAYER_COPY.confirmTitle}
        description={PLAYER_COPY.confirmUnanswered(unanswered)}
        confirmLabel={PLAYER_COPY.confirm}
        cancelLabel={PLAYER_COPY.cancel}
        isPending={submitting}
        onConfirm={() => void finish("manual")}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}

export type AttemptPlayerPageProps = {
  evaluationId: string
  attemptId: string
};

export function AttemptPlayerPage({ evaluationId, attemptId }: AttemptPlayerPageProps) {
  useFocusMode(true);
  const router = useRouter();
  const { attempt, isLoading, error, reload } = useAttempt(attemptId);
  const leavingRef = useRef(false);
  const resultUrl = buildAttemptResultUrl(evaluationId, attemptId);

  const goToResult = useCallback(() => {
    if (!leavingRef.current) {
      leavingRef.current = true;
      void router.replace(resultUrl);
    }
  }, [resultUrl, router]);

  const closed = attempt !== null && attempt.status !== "IN_PROGRESS";

  useEffect(() => {
    if (closed) {
      goToResult();
    }
  }, [closed, goToResult]);

  return (
    <div className={cx(styles.page)}>
      <Head>
        <title>{PLAYER_COPY.documentTitle(attempt?.evaluation.title ?? PLAYER_COPY.fallbackTitle)}</title>
      </Head>
      <Link href={buildEvaluationIntroUrl(evaluationId)} className={cx(styles.backLink)}>{PLAYER_COPY.back}</Link>
      {attempt && !closed ? <AttemptPlayer key={attempt.id} attempt={attempt} onFinished={goToResult} /> : null}
      {(!attempt && isLoading) || closed ? <CardSkeleton label={PLAYER_COPY.loading} /> : null}
      {!attempt && !isLoading && error ? (
        <ErrorState
          title={PLAYER_COPY.loadErrorTitle}
          description={getEvaluationErrorMessage(error)}
          onRetry={() => void reload()}
        />
      ) : null}
    </div>
  );
}
