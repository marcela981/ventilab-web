/*
* Funcionalidad: Simulation session result page
* Descripción: /simulator/sessions/[sessionId]/result (T8). Shows the server summary of a session: the score exactly
*   as the server computed it (labelled as the server's result), the final clinical objectives with their targets and
*   status, the time to stabilise and the safety violations when the session rubric includes those criteria, and the
*   AI assist usage. EXAM sessions add the server rubric breakdown (criterion, weight, value, points, justification)
*   and "Volver al examen" (the exam attempt from the exam return record, otherwise the evaluations list). Below, the
*   evolution of key metrics rebuilt by a local replay in a Web Worker, with a discreet note when the local final
*   metrics differ from the server ones (the server values are never replaced). Loading, error (403/404 messages with
*   retry) states and links to the replay and the catalog. The worker factory and the exam return store are
*   injectable for tests. Depends on next/head, next/link, the design system, the simulator hooks, entities,
*   components and CSS Modules. v1.1: the server breakdown is shown whenever the summary carries one (any mode, so
*   teachers see it too), an explicit "modo no determinado" note when the mode is unknown, no retry for 403/404 and a
*   retryable local evolution (timeout or failure).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Head from "next/head";
import Link from "next/link";
import { useMemo } from "react";
import type { TargetStatusValue } from "@shared/sim-engine";
import { ErrorState } from "@shared/design-system/components/error-state";
import { LoadingState } from "@shared/design-system/components/loading-state";
import { PageHeader } from "@shared/design-system/components/page-header";
import { cx } from "@shared/lib/class-names";
import { EvolutionCharts } from "../components/evolution-charts";
import { CRITERION_LABELS } from "../config/sim-result.config";
import {
  buildExamAttemptUrl,
  buildSessionReplayUrl,
  EVALUATIONS_LIST_URL,
  SIMULATOR_URL,
} from "../config/simulator.routes";
import { buildEvolution, safetyViolations, timeToStabilize } from "../entities/sim-result.entity";
import type { ScoreCriterion, SessionExamLink, SessionSummary } from "../entities/sim-result.entity";
import { formatScore, formatSessionDuration, sessionStatusLabel, simulationModeLabel } from "../entities/simulator.entity";
import { getSimulatorErrorMessage } from "../entities/simulator-error-messages";
import { useSessionResult } from "../hooks/use-session-result";
import type { LocalReplayDeps } from "../hooks/use-local-replay";
import { examReturnStore } from "../session/exam-return-store";
import type { ExamReturnStore } from "../session/exam-return-store";
import { buildObjectives } from "../session/sim-console-adapter";
import { formatSimTime } from "../components/time-controls";
import styles from "../../UI/session-result.module.css";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const RESULT_PAGE_COPY = {
  documentTitle: "Resultado de la sesión | VentyLab",
  title: "Resultado de la sesión",
  loading: "Cargando el resultado de la sesión…",
  loadError: "No se pudo cargar el resultado",
  serverResult: "Resultado del servidor",
  serverScore: "Puntaje calculado por el servidor",
  serverNote: "Este es el resultado oficial: lo calcula el servidor a partir de los eventos registrados.",
  status: "Estado",
  scoredTime: "Tiempo simulado evaluado",
  duration: "Duración",
  objectives: "Objetivos clínicos al final",
  objective: "Objetivo",
  target: "Meta",
  finalValue: "Valor final",
  noObjectives: "La sesión no tenía objetivos clínicos.",
  stabilize: "Tiempo hasta estabilizar",
  neverStabilized: "No se alcanzaron y mantuvieron todos los objetivos.",
  safety: "Violaciones de seguridad",
  noViolations: "Sin violaciones de seguridad",
  violationSeconds: (seconds: string) => `${seconds} s fuera de los límites de seguridad`,
  aiHelp: "Solicitudes de asesoría IA",
  breakdown: "Desglose de la rúbrica (servidor)",
  criterion: "Criterio",
  weight: "Peso",
  value: "Valor",
  points: "Puntos",
  justification: "Justificación del servidor",
  noBreakdown: "El servidor no devolvió el desglose de la rúbrica.",
  backToExam: "Volver al examen",
  evolution: "Evolución de la sesión",
  evolutionNote: "Reconstruida en este navegador repitiendo la sesión con el motor de simulación.",
  evolutionRunning: "Reconstruyendo la evolución en este navegador…",
  evolutionUnsupported: "Este navegador no puede reconstruir la evolución (sin soporte de Web Workers).",
  evolutionFailed: "No se pudo reconstruir la evolución de la sesión en este navegador.",
  evolutionTimedOut: "La reconstrucción de la evolución tardó demasiado en este navegador.",
  retry: "Reintentar",
  modeUnknown: "Modo no determinado: no se pudo saber si esta sesión fue de práctica libre o de examen.",
  evolutionUnavailable: "No hay datos de repetición disponibles para esta sesión.",
  mismatch: "La repetición local no coincide del todo con el resultado del servidor. El resultado oficial es el del servidor.",
  viewReplay: "Ver repetición",
  backToCatalog: "Volver al simulador",
} as const;

export const TARGET_STATUS_COPY = {
  MET: "Cumplido",
  UNMET: "No cumplido",
  UNKNOWN: "Sin datos",
} as const satisfies Record<TargetStatusValue, string>;

const numberFormat = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

function formatNumber(value: number | null): string {
  return value === null ? "—" : numberFormat.format(value);
}

export type SessionResultPageProps = {
  sessionId: string
  deps?: (LocalReplayDeps & { examReturn?: ExamReturnStore | undefined }) | undefined
};

function criterionLabel(criterion: string): string {
  return CRITERION_LABELS[criterion] ?? criterion;
}

function ServerScore({ summary }: { summary: SessionSummary }) {
  return (
    <section className={cx(styles.card)} aria-labelledby="result-server-title">
      <h2 id="result-server-title" className={cx(styles.cardTitle)}>{RESULT_PAGE_COPY.serverResult}</h2>
      <p className={cx(styles.score)}>
        <span className={cx(styles.scoreLabel)}>{RESULT_PAGE_COPY.serverScore}</span>
        <span className={cx(styles.scoreValue)}>{formatScore(summary.score)}</span>
      </p>
      <p className={cx(styles.muted)}>{RESULT_PAGE_COPY.serverNote}</p>
      <dl className={cx(styles.facts)}>
        <dt>{RESULT_PAGE_COPY.status}</dt>
        <dd>{sessionStatusLabel(summary.status)}</dd>
        <dt>{RESULT_PAGE_COPY.scoredTime}</dt>
        <dd>{formatSimTime(summary.simTimeMs)}</dd>
        <dt>{RESULT_PAGE_COPY.duration}</dt>
        <dd>{formatSessionDuration(summary.durationMs)}</dd>
      </dl>
    </section>
  );
}

function stabilizeText(item: ScoreCriterion): string {
  return item.value === null ? RESULT_PAGE_COPY.neverStabilized : `${formatNumber(item.value)} s`;
}

function safetyText(item: ScoreCriterion): string {
  return item.value === null || item.value <= 0 ? RESULT_PAGE_COPY.noViolations : RESULT_PAGE_COPY.violationSeconds(formatNumber(item.value));
}

function OutcomeFacts({ summary }: { summary: SessionSummary }) {
  const stabilize = timeToStabilize(summary);
  const safety = safetyViolations(summary);

  return (
    <dl className={cx(styles.facts, styles.outcomes)}>
      {stabilize ? (
        <>
          <dt>{RESULT_PAGE_COPY.stabilize}</dt>
          <dd>{stabilizeText(stabilize)}</dd>
        </>
      ) : null}
      {safety ? (
        <>
          <dt>{RESULT_PAGE_COPY.safety}</dt>
          <dd>{safetyText(safety)}</dd>
        </>
      ) : null}
      <dt>{RESULT_PAGE_COPY.aiHelp}</dt>
      <dd>{summary.aiHelpCount}</dd>
    </dl>
  );
}

function Objectives({ summary }: { summary: SessionSummary }) {
  const rows = buildObjectives({}, summary.targets);

  return (
    <section className={cx(styles.card)} aria-labelledby="result-objectives-title">
      <h2 id="result-objectives-title" className={cx(styles.cardTitle)}>{RESULT_PAGE_COPY.objectives}</h2>
      {rows.length === 0 ? <p className={cx(styles.muted)}>{RESULT_PAGE_COPY.noObjectives}</p> : (
        <div className={cx(styles.tableWrapper)}>
          <table className={cx(styles.table)}>
            <thead>
              <tr>
                <th scope="col">{RESULT_PAGE_COPY.objective}</th>
                <th scope="col">{RESULT_PAGE_COPY.target}</th>
                <th scope="col">{RESULT_PAGE_COPY.finalValue}</th>
                <th scope="col">{RESULT_PAGE_COPY.status}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} data-status={row.status}>
                  <th scope="row">{row.label}</th>
                  <td>{row.target}</td>
                  <td>{row.value}</td>
                  <td className={cx(styles.status)} data-status={row.status}>{TARGET_STATUS_COPY[row.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <OutcomeFacts summary={summary} />
    </section>
  );
}

function Breakdown({ breakdown }: { breakdown: readonly ScoreCriterion[] }) {
  return (
    <section className={cx(styles.card)} aria-labelledby="result-breakdown-title">
      <h2 id="result-breakdown-title" className={cx(styles.cardTitle)}>{RESULT_PAGE_COPY.breakdown}</h2>
      {breakdown.length === 0 ? <p className={cx(styles.muted)}>{RESULT_PAGE_COPY.noBreakdown}</p> : (
        <div className={cx(styles.tableWrapper)}>
          <table className={cx(styles.table)}>
            <thead>
              <tr>
                <th scope="col">{RESULT_PAGE_COPY.criterion}</th>
                <th scope="col">{RESULT_PAGE_COPY.weight}</th>
                <th scope="col">{RESULT_PAGE_COPY.value}</th>
                <th scope="col">{RESULT_PAGE_COPY.points}</th>
                <th scope="col">{RESULT_PAGE_COPY.justification}</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((item) => (
                <tr key={item.criterion}>
                  <th scope="row">{criterionLabel(item.criterion)}</th>
                  <td>{formatNumber(item.weight)}</td>
                  <td>{formatNumber(item.value)}</td>
                  <td>{formatNumber(item.points)}</td>
                  <td>{item.justification || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/** The exam attempt when the exam flow recorded where to return, otherwise the evaluations list. */
export function resolveExamReturnUrl(sessionId: string, link: SessionExamLink | null, store: ExamReturnStore): string {
  const recorded = store.read(sessionId);

  const attemptId = link?.attemptId ?? null;

  if (recorded && (attemptId === null || attemptId === recorded.attemptId)) {
    return buildExamAttemptUrl(recorded.evaluationId, recorded.attemptId);
  }

  // BACKEND GAP: the session carries the attempt id but not the evaluation id the attempt route needs.
  return EVALUATIONS_LIST_URL;
}

export function SessionResultPage({ sessionId, deps }: SessionResultPageProps) {
  const result = useSessionResult(sessionId, deps);
  const { summary, examLink, local, comparison } = result;
  const exam = examLink?.mode === "EXAM";
  const { modeUnknown } = result;
  const evolution = useMemo(
    () => (local.status === "ready" ? buildEvolution(local.result.metricsTimeline, local.result.final) : null),
    [local],
  );
  const returnUrl = exam ? resolveExamReturnUrl(sessionId, examLink, deps?.examReturn ?? examReturnStore) : null;

  let body;

  if (!summary && result.error) {
    // A missing session or a denied access does not change by retrying.
    const retryable = result.error.status !== 403 && result.error.status !== 404;

    body = (
      <ErrorState
        title={RESULT_PAGE_COPY.loadError}
        description={getSimulatorErrorMessage(result.error)}
        {...(retryable ? { onRetry: () => void result.reload() } : {})}
      />
    );
  } else if (!summary) {
    body = <LoadingState label={RESULT_PAGE_COPY.loading} />;
  } else {
    let evolutionBody;

    if (evolution) {
      evolutionBody = <EvolutionCharts evolution={evolution} />;
    } else if (local.status === "unsupported") {
      evolutionBody = <p className={cx(styles.muted)}>{RESULT_PAGE_COPY.evolutionUnsupported}</p>;
    } else if (local.status === "error") {
      evolutionBody = (
        <div className={cx(styles.retryRow)}>
          <p className={cx(styles.muted)}>{local.timedOut ? RESULT_PAGE_COPY.evolutionTimedOut : RESULT_PAGE_COPY.evolutionFailed}</p>
          <button type="button" className={cx(styles.textButton)} onClick={local.retry}>{RESULT_PAGE_COPY.retry}</button>
        </div>
      );
    } else if (result.replayError || (result.replay && local.status === "idle")) {
      evolutionBody = <p className={cx(styles.muted)}>{RESULT_PAGE_COPY.evolutionUnavailable}</p>;
    } else {
      evolutionBody = <p className={cx(styles.muted)} role="status">{RESULT_PAGE_COPY.evolutionRunning}</p>;
    }

    body = (
      <>
        <ServerScore summary={summary} />
        <Objectives summary={summary} />
        {/* The server breakdown is shown whenever the summary carries one (teachers too), and always for EXAM. */}
        {exam || summary.breakdown.length > 0 ? <Breakdown breakdown={summary.breakdown} /> : null}
        <section className={cx(styles.card)} aria-labelledby="result-evolution-title">
          <h2 id="result-evolution-title" className={cx(styles.cardTitle)}>{RESULT_PAGE_COPY.evolution}</h2>
          <p className={cx(styles.muted)}>{RESULT_PAGE_COPY.evolutionNote}</p>
          {comparison?.status === "mismatch" ? <p className={cx(styles.note)} role="note">{RESULT_PAGE_COPY.mismatch}</p> : null}
          {evolutionBody}
        </section>
      </>
    );
  }

  return (
    <div className={cx(styles.page)}>
      <Head>
        <title>{RESULT_PAGE_COPY.documentTitle}</title>
      </Head>
      <PageHeader title={RESULT_PAGE_COPY.title} {...(examLink ? { subtitle: simulationModeLabel(examLink.mode) } : {})} />
      {/* BACKEND GAP: the mode only comes from the own-session history; without it, never assume FREE silently. */}
      {modeUnknown ? <p className={cx(styles.note)} role="note">{RESULT_PAGE_COPY.modeUnknown}</p> : null}
      {body}
      <nav className={cx(styles.links)}>
        {returnUrl ? (
          <Link href={returnUrl} className={cx(styles.primaryLink)}>{RESULT_PAGE_COPY.backToExam}</Link>
        ) : null}
        <Link href={buildSessionReplayUrl(sessionId)} className={cx(styles.link)}>{RESULT_PAGE_COPY.viewReplay}</Link>
        <Link href={SIMULATOR_URL} className={cx(styles.link)}>{RESULT_PAGE_COPY.backToCatalog}</Link>
      </nav>
    </div>
  );
}
