/*
* Funcionalidad: EvaluationCard
* Descripción: Card of one assigned evaluation in the student list: type chip, title linked to the intro page, date window (America/Bogota), duration, attempts used of the maximum, and the status of the last attempt with its grade when published. The summary of /api/my-evaluations has no module or level, so the card does not show them. Depends on MUI Chip, next/link, @shared/lib, the evaluation entities, labels, URLs and badges, and the evaluations CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Chip from "@mui/material/Chip";
import Link from "next/link";
import { useId } from "react";
import { cx } from "@shared/lib/class-names";
import { formatDateRange, formatDuration } from "@shared/lib/format";
import type { MyEvaluation } from "../entities/evaluation.entity";
import { findLastAttempt } from "../entities/evaluation.entity";
import { EVALUATION_TYPE_LABELS, formatAttemptsUsed } from "../entities/evaluation-labels";
import { buildEvaluationIntroUrl } from "../entities/evaluations-urls";
import { AttemptStatusBadge, GradeBadge } from "./attempt-badges";
import styles from "../../UI/evaluations.module.css";

// TODO(i18n): move to an evaluations namespace in src/i18n.
const CARD_COPY = {
  window: "Ventana",
  duration: "Duración",
  noTimeLimit: "Sin límite de tiempo",
  attempts: "Intentos",
  lastAttempt: "Último intento:",
} as const;

export function EvaluationCard({ evaluation }: { evaluation: MyEvaluation }) {
  const titleId = useId();
  const lastAttempt = findLastAttempt(evaluation);

  return (
    <article className={cx(styles.card)} aria-labelledby={titleId}>
      <div className={cx(styles.cardHeader)}>
        <Chip label={EVALUATION_TYPE_LABELS[evaluation.type]} size="small" variant="outlined" />
      </div>
      <h2 id={titleId} className={cx(styles.cardTitle)}>
        <Link href={buildEvaluationIntroUrl(evaluation.evaluationId)} className={cx(styles.titleLink)}>
          {evaluation.title}
        </Link>
      </h2>
      <dl className={cx(styles.details)}>
        <dt>{CARD_COPY.window}</dt>
        <dd>{formatDateRange(evaluation.startsAt, evaluation.endsAt)}</dd>
        <dt>{CARD_COPY.duration}</dt>
        <dd>{evaluation.durationMinutes === null ? CARD_COPY.noTimeLimit : formatDuration(evaluation.durationMinutes)}</dd>
        <dt>{CARD_COPY.attempts}</dt>
        <dd>{formatAttemptsUsed(evaluation.attempts.length, evaluation.maxAttempts)}</dd>
      </dl>
      {lastAttempt ? (
        <div className={cx(styles.cardFooter)}>
          <span>{CARD_COPY.lastAttempt}</span>
          <AttemptStatusBadge status={lastAttempt.status} />
          {lastAttempt.result ? <GradeBadge result={lastAttempt.result} /> : null}
        </div>
      ) : null}
    </article>
  );
}
