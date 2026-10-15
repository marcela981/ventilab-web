/*
* Funcionalidad: EvaluationIntroPage
* Descripción: Page /evaluations/[evaluationId]: introduction of one assigned evaluation, taken from `GET /api/my-evaluations` (there is no intro endpoint; when the evaluation is assigned several times the active assignment wins). Shows the type, the instructions (rich text or plain text), questions, duration, attempts used, the date window (America/Bogota) and the attempt warnings (the server controls the time, answers are saved automatically). "Comenzar" or "Continuar intento" calls the idempotent start endpoint and opens the attempt player; when the backend does not allow a start the button is disabled with the reason. "Ver resultado" links to the result of the last submitted attempt. Depends on MUI Alert, next/head, next/link, next/router, the design-system components, @shared/lib, the evaluations hooks, entities and components, and the evaluations CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import AssignmentIcon from "@mui/icons-material/Assignment";
import Alert from "@mui/material/Alert";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { AsyncButton } from "@shared/design-system/components/async-button";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { ErrorState } from "@shared/design-system/components/error-state";
import { PageHeader } from "@shared/design-system/components/page-header";
import { CardSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { formatDateRange, formatDuration } from "@shared/lib/format";
import { GradeBadge } from "../components/attempt-badges";
import { RichTextView } from "../components/rich-text-view";
import type { MyEvaluation } from "../entities/evaluation.entity";
import { findIntroEvaluation, findLastSubmittedAttempt, resolveIntroAction } from "../entities/evaluation.entity";
import { EVALUATION_TYPE_LABELS, formatAttemptsUsed } from "../entities/evaluation-labels";
import { getEvaluationErrorMessage } from "../entities/evaluations-error-messages";
import { buildAttemptResultUrl, buildAttemptUrl, EVALUATIONS_URL } from "../entities/evaluations-urls";
import { useEvaluationsRealtime } from "../hooks/use-evaluations-realtime";
import { useMyEvaluations } from "../hooks/use-my-evaluations";
import { useStartAttempt } from "../hooks/use-start-attempt";
import styles from "../../UI/evaluations.module.css";

// TODO(i18n): move to an evaluations namespace in src/i18n.
const PAGE_COPY = {
  documentTitle: (title: string) => `${title} | VentyLab`,
  fallbackTitle: "Evaluación",
  loading: "Cargando la evaluación…",
  loadErrorTitle: "No se pudo cargar la evaluación",
  notFoundTitle: "Evaluación no disponible",
  notFoundDescription: "La evaluación no existe o no está asignada a ninguno de tus grupos.",
  back: "Volver a Evaluaciones",
  instructions: "Instrucciones",
  noInstructions: "Esta evaluación no tiene instrucciones adicionales.",
  details: "Detalles",
  questions: "Preguntas",
  duration: "Duración",
  noTimeLimit: "Sin límite de tiempo",
  attempts: "Intentos",
  window: "Ventana",
  beforeStart: "Antes de comenzar",
  timerWarning: (duration: string) =>
    `Tienes ${duration} desde que comienzas. El tiempo lo controla el servidor: sigue corriendo aunque cierres la página y, al terminar, el intento se envía con las respuestas guardadas.`,
  autosave: "Tus respuestas se guardan automáticamente mientras respondes.",
  windowWarning: "Debes enviar el intento antes de que cierre la ventana de la evaluación.",
  start: "Comenzar",
  continue: "Continuar intento",
  viewResult: "Ver resultado",
  lastResult: "Último resultado",
} as const;

function IntroBody({ evaluation }: { evaluation: MyEvaluation }) {
  const router = useRouter();
  const { pending, start } = useStartAttempt();
  const [startError, setStartError] = useState<string | null>(null);
  const action = resolveIntroAction(evaluation);
  const lastSubmitted = findLastSubmittedAttempt(evaluation);
  const duration = evaluation.durationMinutes === null ? null : formatDuration(evaluation.durationMinutes);

  const handleStart = async() => {
    setStartError(null);
    const outcome = await start(evaluation.assignmentId);

    if (outcome.status === "success") {
      await router.push(buildAttemptUrl(evaluation.evaluationId, outcome.value.attemptId));
    } else if (outcome.status === "error") {
      setStartError(outcome.message);
    }
  };

  return (
    <>
      <PageHeader title={evaluation.title} subtitle={EVALUATION_TYPE_LABELS[evaluation.type]} />
      <section className={cx(styles.section)} aria-label={PAGE_COPY.instructions}>
        <h2 className={cx(styles.sectionTitle)}>{PAGE_COPY.instructions}</h2>
        {evaluation.description ? <RichTextView value={evaluation.description} /> : <p>{PAGE_COPY.noInstructions}</p>}
      </section>
      <section className={cx(styles.section)} aria-label={PAGE_COPY.details}>
        <h2 className={cx(styles.sectionTitle)}>{PAGE_COPY.details}</h2>
        <dl className={cx(styles.details)}>
          <dt>{PAGE_COPY.questions}</dt>
          <dd>{evaluation.questionCount}</dd>
          <dt>{PAGE_COPY.duration}</dt>
          <dd>{duration ?? PAGE_COPY.noTimeLimit}</dd>
          <dt>{PAGE_COPY.attempts}</dt>
          <dd>{formatAttemptsUsed(evaluation.attempts.length, evaluation.maxAttempts)}</dd>
          <dt>{PAGE_COPY.window}</dt>
          <dd>{formatDateRange(evaluation.startsAt, evaluation.endsAt)}</dd>
        </dl>
        {lastSubmitted?.result ? (
          <div className={cx(styles.cardFooter)}>
            <span>{PAGE_COPY.lastResult}</span>
            <GradeBadge result={lastSubmitted.result} />
          </div>
        ) : null}
      </section>
      {action.kind !== "blocked" ? (
        <Alert severity="info">
          <strong>{PAGE_COPY.beforeStart}</strong>
          <ul className={cx(styles.warnings)}>
            {duration ? <li>{PAGE_COPY.timerWarning(duration)}</li> : null}
            <li>{PAGE_COPY.autosave}</li>
            {evaluation.endsAt ? <li>{PAGE_COPY.windowWarning}</li> : null}
          </ul>
        </Alert>
      ) : null}
      {startError ? <Alert severity="error">{startError}</Alert> : null}
      <div className={cx(styles.actions)}>
        <AsyncButton
          variant="contained"
          loading={pending}
          disabled={action.kind === "blocked"}
          onClick={handleStart}
        >
          {action.kind === "continue" ? PAGE_COPY.continue : PAGE_COPY.start}
        </AsyncButton>
        {action.kind === "blocked" ? <p className={cx(styles.blockedReason)}>{action.reason}</p> : null}
        {lastSubmitted ? (
          <Link href={buildAttemptResultUrl(evaluation.evaluationId, lastSubmitted.id)} className={cx(styles.link)}>
            {PAGE_COPY.viewResult}
          </Link>
        ) : null}
      </div>
    </>
  );
}

export type EvaluationIntroPageProps = {
  evaluationId: string
};

export function EvaluationIntroPage({ evaluationId }: EvaluationIntroPageProps) {
  const { evaluations, isLoading, error, reload } = useMyEvaluations();
  const evaluation = evaluations ? findIntroEvaluation(evaluations, evaluationId) : null;

  useEvaluationsRealtime();

  return (
    <div className={cx(styles.page)}>
      <Head>
        <title>{PAGE_COPY.documentTitle(evaluation?.title ?? PAGE_COPY.fallbackTitle)}</title>
      </Head>
      <Link href={EVALUATIONS_URL} className={cx(styles.backLink)}>{PAGE_COPY.back}</Link>
      {evaluation ? <IntroBody evaluation={evaluation} /> : null}
      {evaluations && !evaluation ? (
        <EmptyState icon={<AssignmentIcon />} title={PAGE_COPY.notFoundTitle} description={PAGE_COPY.notFoundDescription} />
      ) : null}
      {!evaluations && isLoading ? <CardSkeleton label={PAGE_COPY.loading} /> : null}
      {!evaluations && !isLoading && error ? (
        <ErrorState
          title={PAGE_COPY.loadErrorTitle}
          description={getEvaluationErrorMessage(error)}
          onRetry={() => void reload()}
        />
      ) : null}
    </div>
  );
}
