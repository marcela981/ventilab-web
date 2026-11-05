/*
* Funcionalidad: EvaluationCard
* Descripción: Card of one assigned evaluation in the student list: type chip, title linked to the intro page, date window (America/Bogota), duration, attempts used of the maximum, and the status of the last attempt with its grade when published. Depends on MUI Chip, next/link, @shared/lib, the evaluation entities, labels, URLs and badges, and the evaluations CSS Module. v1.1 (Bloque 3): level chip (levelTitle), July "Completado ✓" chip (a submitted attempt and none in progress), attempts counted against attemptsAllowed (grants included) and a configurable title heading level (h3 by default inside the grouped list). vX.x (Bloque 5): July skin (D16): the type chip is solid by data-evaluation-type (Quiz blue, Taller orange, Examen violet), "Completado ✓" is the green translucent chip first in the row, the level chip stays neutral (outlined), and a July action link at the bottom ("Comenzar" / "Continuar" to the intro page, "Ver resultado" to the last result when completed, "Ver detalles" otherwise; named with the title), presentation only: the intro page still starts the attempt. v1.3 (ajustes C1): a submitted attempt whose grade is not released shows "En espera de resultados" instead of its status, and the grade badge only once published; "Ver resultado" stays (the result page shows the waiting state).
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import Chip from "@mui/material/Chip";
import Link from "next/link";
import { useId } from "react";
import { cx } from "@shared/lib/class-names";
import { formatDateRange, formatDuration } from "@shared/lib/format";
import type { MyEvaluation } from "../entities/evaluation.entity";
import { findLastAttempt, findLastSubmittedAttempt, isAwaitingResults, resolveIntroAction } from "../entities/evaluation.entity";
import { GROUP_COPY, isEvaluationCompleted } from "../entities/group-evaluations";
import { EVALUATION_TYPE_LABELS, formatAttemptsUsed } from "../entities/evaluation-labels";
import { buildAttemptResultUrl, buildEvaluationIntroUrl } from "../entities/evaluations-urls";
import { AttemptStatusBadge, GradeBadge, ResultsPendingBadge } from "./attempt-badges";
import styles from "../../UI/evaluations.module.css";

// TODO(i18n): move to an evaluations namespace in src/i18n.
const CARD_COPY = {
  window: "Ventana",
  duration: "Duración",
  noTimeLimit: "Sin límite de tiempo",
  attempts: "Intentos",
  lastAttempt: "Último intento:",
  // July card action (D16: presentation only, it opens the intro page or the last result).
  action: {
    start: "Comenzar",
    continue: "Continuar",
    result: "Ver resultado",
    details: "Ver detalles",
  },
} as const;

type CardAction = { label: string, href: string, kind: "primary" | "result" | "neutral" };

function cardAction(evaluation: MyEvaluation, completed: boolean): CardAction {
  const intro = buildEvaluationIntroUrl(evaluation.evaluationId);
  const action = resolveIntroAction(evaluation);

  if (action.kind === "start") {
    return { label: CARD_COPY.action.start, href: intro, kind: "primary" };
  }

  if (action.kind === "continue") {
    return { label: CARD_COPY.action.continue, href: intro, kind: "primary" };
  }

  const submitted = completed ? findLastSubmittedAttempt(evaluation) : null;

  return submitted
    ? { label: CARD_COPY.action.result, href: buildAttemptResultUrl(evaluation.evaluationId, submitted.id), kind: "result" }
    : { label: CARD_COPY.action.details, href: intro, kind: "neutral" };
}

export type EvaluationCardProps = {
  evaluation: MyEvaluation
  // Heading level of the title inside the grouped list (type → track → level).
  headingLevel?: "h2" | "h3" | "h4" | undefined
};

export function EvaluationCard({ evaluation, headingLevel = "h3" }: EvaluationCardProps) {
  const titleId = useId();
  const lastAttempt = findLastAttempt(evaluation);
  const Heading = headingLevel;
  const completed = isEvaluationCompleted(evaluation);
  const action = cardAction(evaluation, completed);

  return (
    <article className={cx(styles.card)} aria-labelledby={titleId} data-completed={completed}>
      <div className={cx(styles.chips)}>
        {completed ? <Chip label={GROUP_COPY.completed} size="small" variant="outlined" className={cx(styles.completedChip)} /> : null}
        <Chip
          label={EVALUATION_TYPE_LABELS[evaluation.type]}
          size="small"
          className={cx(styles.typeChip)}
          data-evaluation-type={evaluation.type}
        />
        {evaluation.levelTitle ? <Chip label={evaluation.levelTitle} size="small" variant="outlined" className={cx(styles.levelChip)} /> : null}
      </div>
      <Heading id={titleId} className={cx(styles.cardTitle)}>
        <Link href={buildEvaluationIntroUrl(evaluation.evaluationId)} className={cx(styles.titleLink)}>
          {evaluation.title}
        </Link>
      </Heading>
      <dl className={cx(styles.details)}>
        <dt>{CARD_COPY.window}</dt>
        <dd>{formatDateRange(evaluation.startsAt, evaluation.endsAt)}</dd>
        <dt>{CARD_COPY.duration}</dt>
        <dd>{evaluation.durationMinutes === null ? CARD_COPY.noTimeLimit : formatDuration(evaluation.durationMinutes)}</dd>
        <dt>{CARD_COPY.attempts}</dt>
        <dd>{formatAttemptsUsed(evaluation.attempts.length, evaluation.attemptsAllowed)}</dd>
      </dl>
      {lastAttempt ? (
        <div className={cx(styles.cardFooter)}>
          <span>{CARD_COPY.lastAttempt}</span>
          {isAwaitingResults(lastAttempt) ? <ResultsPendingBadge /> : <AttemptStatusBadge status={lastAttempt.status} />}
          {lastAttempt.published && lastAttempt.result ? <GradeBadge result={lastAttempt.result} /> : null}
        </div>
      ) : null}
      <div className={cx(styles.cardActions)}>
        <Link
          href={action.href}
          className={cx(styles.cardAction)}
          data-kind={action.kind}
          aria-label={`${action.label}: ${evaluation.title}`}
        >
          {action.label}
          {action.kind === "primary" ? <ArrowForwardIcon fontSize="small" aria-hidden="true" /> : null}
        </Link>
      </div>
    </article>
  );
}
