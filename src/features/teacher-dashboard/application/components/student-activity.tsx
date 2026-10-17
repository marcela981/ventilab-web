/*
* Funcionalidad: StudentActivity
* Descripción: Activity of one student in /teacher/students/[userId], read window by window from `GET /api/analytics/students/{userId}/timeline?from&to` (last 30 days by default, at most 366 days per request): from/to date controls (Bogota calendar days, validated before the request), "Cargar anteriores" that appends the previous window of the same length, and per window the simulation sessions (SIMULATION_SESSION entries; referenceId is the session id, linked to /simulator/sessions/[id]/replay, because there is no staff endpoint listing a student's sessions: BACKEND GAP) and the timeline entries (kind, title, date, status, value as returned; evaluation entries link to the evaluation results), with the API `truncated` flag shown. No notes nor AI conversations are part of it. Depends on MUI, next/link, @shared/lib/format, the teacher dashboard hooks, entities, routes and CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { ListSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { formatDate, formatDateTime, formatGrade } from "@shared/lib/format";
import { buildEvaluationResultsUrl, buildSimulationReplayUrl } from "../config/teacher-dashboard.routes";
import {
  defaultWindow,
  isWindow,
  previousWindow,
  simulationSessions,
  toDateInput,
  windowFromDateInputs,
} from "../entities/student-timeline.entity";
import type { TimelineEntry, TimelineWindow, WindowInputError } from "../entities/student-timeline.entity";
import { getTeacherDashboardErrorMessage } from "../entities/teacher-dashboard-error-messages";
import { formatScore, labelOf, STATUS_LABELS, TIMELINE_KIND_LABELS } from "../entities/teacher-dashboard-labels";
import { useStudentTimeline } from "../hooks/use-student-timeline";
import styles from "../../UI/teacher-dashboard.module.css";

// TODO(i18n): move to a teacher-dashboard namespace in src/i18n.
export const STUDENT_ACTIVITY_COPY = {
  sessionsTitle: "Sesiones de simulación",
  timelineTitle: "Actividad",
  from: "Desde",
  to: "Hasta",
  apply: "Ver rango",
  loadOlder: "Cargar anteriores",
  windowTitle: (from: string, to: string) => `${from} – ${to}`,
  truncated: "La API recortó este período: hay más actividad de la que se muestra. Elige un rango más corto para verla completa.",
  noSessions: "Sin sesiones de simulación en este período.",
  noEntries: "Sin actividad en este período.",
  replay: "Ver repetición",
  results: "Ver resultados",
  score: (value: string) => `Puntaje ${value}`,
  grade: (value: string) => `Nota ${value}`,
  loading: "Cargando actividad…",
  retry: "Reintentar",
  rangeErrors: {
    invalid: "Escribe dos fechas válidas.",
    order: "La fecha inicial debe ser anterior o igual a la final.",
    tooLong: "El rango puede abarcar como máximo 366 días.",
  } satisfies Record<WindowInputError, string>,
} as const;

type WindowProps = { userId: string, window: TimelineWindow };

function windowTitle(window: TimelineWindow): string {
  return STUDENT_ACTIVITY_COPY.windowTitle(formatDate(window.from), formatDate(window.to));
}

function entryValue(entry: TimelineEntry): string | null {
  if (entry.value === null) {
    return null;
  }

  return entry.kind === "SIMULATION_SESSION"
    ? STUDENT_ACTIVITY_COPY.score(formatScore(entry.value))
    : STUDENT_ACTIVITY_COPY.grade(formatGrade(entry.value));
}

function WindowSessions({ userId, window }: WindowProps) {
  const { timeline, isLoading, error } = useStudentTimeline(userId, window);

  if (!timeline) {
    return error ? <Alert severity="error">{getTeacherDashboardErrorMessage(error)}</Alert> : null;
  }

  const sessions = simulationSessions(timeline);

  return (
    <div className={cx(styles.windowBlock)} aria-busy={isLoading}>
      <h4 className={cx(styles.subTitle)}>{windowTitle(window)}</h4>
      {sessions.length === 0 ? <p className={cx(styles.emptyText)}>{STUDENT_ACTIVITY_COPY.noSessions}</p> : (
        <ul className={cx(styles.list)}>
          {sessions.map((session) => (
            <li key={session.referenceId} className={cx(styles.timelineItem)}>
              <span className={cx(styles.itemTitle)}>{formatDateTime(session.occurredAt)}</span>
              {session.status ? <span className={cx(styles.itemMeta)}>{labelOf(STATUS_LABELS, session.status)}</span> : null}
              {entryValue(session) ? <span className={cx(styles.itemMeta)}>{entryValue(session)}</span> : null}
              <Link href={buildSimulationReplayUrl(session.referenceId)} className={cx(styles.link)}>{STUDENT_ACTIVITY_COPY.replay}</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TimelineItem({ entry }: { entry: TimelineEntry }) {
  const value = entryValue(entry);
  const isEvaluation = entry.kind === "EVALUATION_STARTED" || entry.kind === "EVALUATION_SUBMITTED";

  return (
    <li className={cx(styles.timelineItem)}>
      <span className={cx(styles.timelineKind)}>{TIMELINE_KIND_LABELS[entry.kind]}</span>
      {entry.title ? <span className={cx(styles.itemTitle)}>{entry.title}</span> : null}
      <span className={cx(styles.itemMeta)}>{formatDateTime(entry.occurredAt)}</span>
      {entry.status ? <span className={cx(styles.itemMeta)}>{labelOf(STATUS_LABELS, entry.status)}</span> : null}
      {value ? <span className={cx(styles.itemMeta)}>{value}</span> : null}
      {entry.kind === "SIMULATION_SESSION" ? (
        <Link href={buildSimulationReplayUrl(entry.referenceId)} className={cx(styles.link)}>{STUDENT_ACTIVITY_COPY.replay}</Link>
      ) : null}
      {isEvaluation ? (
        <Link href={buildEvaluationResultsUrl(entry.referenceId)} className={cx(styles.link)}>{STUDENT_ACTIVITY_COPY.results}</Link>
      ) : null}
    </li>
  );
}

function WindowTimeline({ userId, window }: WindowProps) {
  const { timeline, isLoading, error, reload } = useStudentTimeline(userId, window);

  return (
    <div className={cx(styles.windowBlock)}>
      <h4 className={cx(styles.subTitle)}>{windowTitle(window)}</h4>
      {!timeline && isLoading ? <ListSkeleton rows={3} label={STUDENT_ACTIVITY_COPY.loading} /> : null}
      {!timeline && error ? (
        <Alert
          severity="error"
          action={<Button color="inherit" size="small" onClick={() => void reload()}>{STUDENT_ACTIVITY_COPY.retry}</Button>}
        >
          {getTeacherDashboardErrorMessage(error)}
        </Alert>
      ) : null}
      {timeline?.truncated ? <Alert severity="warning">{STUDENT_ACTIVITY_COPY.truncated}</Alert> : null}
      {timeline && timeline.entries.length === 0 ? <p className={cx(styles.emptyText)}>{STUDENT_ACTIVITY_COPY.noEntries}</p> : null}
      {timeline && timeline.entries.length > 0 ? (
        <ul className={cx(styles.list)}>
          {timeline.entries.map((entry) => <TimelineItem key={`${entry.kind}-${entry.referenceId}-${entry.occurredAt}`} entry={entry} />)}
        </ul>
      ) : null}
    </div>
  );
}

export function StudentActivity({ userId }: { userId: string }) {
  const [windows, setWindows] = useState<TimelineWindow[]>(() => [defaultWindow()]);
  const first = windows[0] ?? defaultWindow();
  const [fromDate, setFromDate] = useState(() => toDateInput(first.from));
  const [toDate, setToDate] = useState(() => toDateInput(first.to));
  const [rangeError, setRangeError] = useState<WindowInputError | null>(null);

  const applyRange = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const next = windowFromDateInputs(fromDate, toDate);

    if (!isWindow(next)) {
      setRangeError(next);

      return;
    }

    setRangeError(null);
    setWindows([next]);
  };

  const loadOlder = () => {
    setWindows((current) => {
      const oldest = current[current.length - 1];

      return oldest ? [...current, previousWindow(oldest)] : current;
    });
  };

  return (
    <>
      <form className={cx(styles.rangeControls)} onSubmit={applyRange} noValidate>
        <TextField
          type="date"
          size="small"
          label={STUDENT_ACTIVITY_COPY.from}
          value={fromDate}
          onChange={(event) => setFromDate(event.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          type="date"
          size="small"
          label={STUDENT_ACTIVITY_COPY.to}
          value={toDate}
          onChange={(event) => setToDate(event.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <Button type="submit" variant="outlined">{STUDENT_ACTIVITY_COPY.apply}</Button>
      </form>
      {rangeError ? <Alert severity="error">{STUDENT_ACTIVITY_COPY.rangeErrors[rangeError]}</Alert> : null}
      <section aria-label={STUDENT_ACTIVITY_COPY.sessionsTitle} className={cx(styles.section)}>
        <h3 className={cx(styles.sectionTitle)}>{STUDENT_ACTIVITY_COPY.sessionsTitle}</h3>
        {windows.map((window) => <WindowSessions key={`${window.from}-${window.to}`} userId={userId} window={window} />)}
      </section>
      <section aria-label={STUDENT_ACTIVITY_COPY.timelineTitle} className={cx(styles.section)}>
        <h3 className={cx(styles.sectionTitle)}>{STUDENT_ACTIVITY_COPY.timelineTitle}</h3>
        {windows.map((window) => <WindowTimeline key={`${window.from}-${window.to}`} userId={userId} window={window} />)}
        <Button variant="text" onClick={loadOlder}>{STUDENT_ACTIVITY_COPY.loadOlder}</Button>
      </section>
    </>
  );
}
