/*
* Funcionalidad: Sessions list
* Descripción: Unified list of the Mis sesiones tab of /simulador (W9, Bloque 1; DISENO_BLOQUE1 §3): the simulated
*   sessions (date, clinical case or own patient name, mode, status, score, "Ver resultado" and "Ver repetición", or
*   "Continuar" while it runs) and the real-ventilator recordings (date, reservation length, status, "Reproducir") in
*   ONE list, newest first, with the type filter Todas / Simuladas / Equipo real and the 31-day window pager. Loading
*   skeleton, error with retry (per source, so one failing source never hides the other) and empty state in Spanish.
*   The filter and the window are local state: the panel never unmounts, so they survive a replay and every tab
*   switch. Depends on React, next/link, MUI icons, the design-system states, the date format helper, the simulator
*   history and lab recordings entry points, the workspace session, the sessions feed entity and hook and the
*   sessions styles.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import HistoryIcon from "@mui/icons-material/History";
import Link from "next/link";
import { useState } from "react";
import {
  buildSessionUrl,
  formatScore,
  getSimulatorErrorMessage,
  sessionStatusLabel,
  simulationModeLabel,
} from "@features/simulator/history.entry";
import type { SessionHistoryRow } from "@features/simulator/history.entry";
import { formatRecordingDuration, getRecordingErrorMessage } from "@features/ventilator-lab/recordings.entry";
import type { RecordingRow } from "@features/ventilator-lab/recordings.entry";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { ErrorState } from "@shared/design-system/components/error-state";
import { ListSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { formatDate, formatDateTime } from "@shared/lib/format";
import { SESSIONS_FILTER_LABELS, SESSIONS_TYPE_FILTERS } from "../../entities/sessions-feed.entity";
import type { SessionsTypeFilter, SessionsView } from "../../entities/sessions-feed.entity";
import { useSessionsFeed } from "../../hooks/use-sessions-feed";
import type { FeedSourceState } from "../../hooks/use-sessions-feed";
import { useWorkspaceSession } from "../workspace-session-provider";
import styles from "../../../UI/sessions/sessions-panel.module.css";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const SESSIONS_LIST_COPY = {
  title: "Mis sesiones",
  filterLabel: "Tipo de sesión",
  listLabel: "Sesiones, de la más reciente a la más antigua",
  rangeLabel: (from: string, to: string) => `Sesiones iniciadas entre ${from} y ${to}`,
  previous: "31 días anteriores",
  next: "31 días siguientes",
  loading: "Cargando tus sesiones…",
  errorTitle: "No se pudieron cargar tus sesiones",
  simulatedFailed: "No se pudieron cargar las sesiones simuladas.",
  recordingsFailed: "No se pudieron cargar las grabaciones del equipo real.",
  retry: "Reintentar",
  empty: {
    all: "No tienes sesiones en este periodo.",
    simulated: "No tienes sesiones simuladas en este periodo.",
    real: "No hay grabaciones del equipo real en este periodo.",
  } satisfies Record<SessionsTypeFilter, string>,
  emptyHint: "Inicia una práctica desde Simular Paciente o prueba con los 31 días anteriores.",
  hiddenSimulated: (count: number) => `Hay ${count} ${count === 1 ? "sesión simulada más antigua" : "sesiones simuladas más antiguas"} en este periodo que no se muestran.`,
  titlesError: "No se pudieron cargar los nombres de los casos.",
  simulatedTag: "Simulada",
  realTag: "Equipo real",
  ownPatient: "Paciente propio",
  loadingCase: "Cargando caso…",
  unknownCase: "Caso no disponible",
  realTitle: "Ventilador físico",
  inProgress: "En curso",
  score: (score: string) => `Puntaje: ${score}`,
  duration: (text: string) => `Duración: ${text}`,
  result: "Ver resultado",
  replay: "Ver repetición",
  resume: "Continuar",
  play: "Reproducir",
  actionLabel: (action: string, title: string, date: string) => `${action}: ${title}, ${date}`,
} as const;

type TitleState = { loading: boolean, failed: boolean };

/** Own patient name, then the case title; a placeholder while the titles load or after they failed. */
function simulatedTitle(session: SessionHistoryRow, titles: TitleState): string {
  if (session.patient) {
    return session.patient.displayName ?? SESSIONS_LIST_COPY.ownPatient;
  }

  if (session.caseTitle !== null) {
    return session.caseTitle;
  }

  if (titles.loading) {
    return SESSIONS_LIST_COPY.loadingCase;
  }

  return titles.failed ? "—" : SESSIONS_LIST_COPY.unknownCase;
}

type SimulatedItemProps = { session: SessionHistoryRow, titles: TitleState, onOpen: (view: SessionsView) => void };

function SimulatedItem({ session, titles, onOpen }: SimulatedItemProps) {
  const { start } = useWorkspaceSession();
  const title = simulatedTitle(session, titles);
  const date = formatDateTime(session.startedAt);
  const active = session.status.toUpperCase() === "ACTIVE";
  const label = (action: string) => SESSIONS_LIST_COPY.actionLabel(action, title, date);

  let actions;

  if (active && session.mode.toUpperCase() === "EXAM") {
    // An EXAM runs only on its own console page (deadline and return to the exam).
    actions = <Link href={buildSessionUrl(session.id)} className={cx(styles.actionLink)} aria-label={label(SESSIONS_LIST_COPY.resume)}>{SESSIONS_LIST_COPY.resume}</Link>;
  } else if (active) {
    actions = (
      <button type="button" className={cx(styles.actionButton)} aria-label={label(SESSIONS_LIST_COPY.resume)} onClick={() => start({ id: session.id })}>
        {SESSIONS_LIST_COPY.resume}
      </button>
    );
  } else {
    actions = (
      <>
        <button type="button" className={cx(styles.secondaryButton)} aria-label={label(SESSIONS_LIST_COPY.result)} onClick={() => onOpen({ kind: "result", sessionId: session.id })}>
          {SESSIONS_LIST_COPY.result}
        </button>
        <button type="button" className={cx(styles.actionButton)} aria-label={label(SESSIONS_LIST_COPY.replay)} onClick={() => onOpen({ kind: "replay", sessionId: session.id })}>
          {SESSIONS_LIST_COPY.replay}
        </button>
      </>
    );
  }

  return (
    <li className={cx(styles.item)} data-kind="simulated">
      <div className={cx(styles.itemMain)}>
        <span className={cx(styles.tag)} data-kind="simulated">{SESSIONS_LIST_COPY.simulatedTag}</span>
        <span className={cx(styles.itemTitle)}>{title}</span>
        <time className={cx(styles.muted)} dateTime={session.startedAt}>{date}</time>
      </div>
      <p className={cx(styles.itemMeta)}>
        <span>{simulationModeLabel(session.mode)}</span>
        <span>{active ? SESSIONS_LIST_COPY.inProgress : sessionStatusLabel(session.status)}</span>
        {session.score === null ? null : <span className={cx(styles.score)}>{SESSIONS_LIST_COPY.score(formatScore(session.score))}</span>}
      </p>
      <div className={cx(styles.itemActions)}>{actions}</div>
    </li>
  );
}

function RecordingItem({ recording, onOpen }: { recording: RecordingRow, onOpen: (view: SessionsView) => void }) {
  const date = formatDateTime(recording.startsAt);

  return (
    <li className={cx(styles.item)} data-kind="recording">
      <div className={cx(styles.itemMain)}>
        <span className={cx(styles.tag)} data-kind="recording">{SESSIONS_LIST_COPY.realTag}</span>
        <span className={cx(styles.itemTitle)}>{recording.holderText ?? SESSIONS_LIST_COPY.realTitle}</span>
        <time className={cx(styles.muted)} dateTime={recording.startsAt}>{date}</time>
      </div>
      <p className={cx(styles.itemMeta)}>
        <span>{SESSIONS_LIST_COPY.duration(formatRecordingDuration(recording.durationMs))}</span>
        <span>{recording.statusLabel}</span>
      </p>
      {recording.note === null ? null : <p className={cx(styles.note)}>{recording.note}</p>}
      <div className={cx(styles.itemActions)}>
        <button
          type="button"
          className={cx(styles.actionButton)}
          aria-label={SESSIONS_LIST_COPY.actionLabel(SESSIONS_LIST_COPY.play, SESSIONS_LIST_COPY.realTitle, date)}
          onClick={() => onOpen({ kind: "recording", recordingId: recording.id })}
        >
          {SESSIONS_LIST_COPY.play}
        </button>
      </div>
    </li>
  );
}

function SourceNotice({ message, source }: { message: string, source: FeedSourceState }) {
  return (
    <p className={cx(styles.notice)} role="alert">
      {message}
      <button type="button" className={cx(styles.linkButton)} onClick={source.retry}>{SESSIONS_LIST_COPY.retry}</button>
    </p>
  );
}

export type SessionsListProps = {
  onOpen: (view: SessionsView) => void
  /** Injectable for tests; default the moment the panel opened (keeps the window keys stable). */
  nowMs?: number
};

export function SessionsList({ onOpen, nowMs: fixedNowMs }: SessionsListProps) {
  const [openedAtMs] = useState(() => fixedNowMs ?? Date.now());
  const [filter, setFilter] = useState<SessionsTypeFilter>("all");
  const [windowPage, setWindowPage] = useState(0);
  const feed = useSessionsFeed(windowPage, openedAtMs, filter);
  const titles: TitleState = { loading: feed.titlesLoading, failed: feed.titlesError !== null };
  const simulatedFailed = filter !== "real" && feed.simulated.error !== null;
  const recordingsFailed = filter !== "simulated" && feed.recordings.error !== null;
  const allFailed = (filter === "simulated" && simulatedFailed)
    || (filter === "real" && recordingsFailed)
    || (filter === "all" && simulatedFailed && recordingsFailed);
  let content;

  if (allFailed) {
    content = (
      <ErrorState
        title={SESSIONS_LIST_COPY.errorTitle}
        description={simulatedFailed ? getSimulatorErrorMessage(feed.simulated.error) : getRecordingErrorMessage(feed.recordings.error)}
        onRetry={() => {
          feed.simulated.retry();
          feed.recordings.retry();
        }}
      />
    );
  } else if (feed.items === null) {
    content = <ListSkeleton label={SESSIONS_LIST_COPY.loading} />;
  } else if (feed.items.length === 0) {
    content = (
      <>
        {simulatedFailed ? <SourceNotice message={SESSIONS_LIST_COPY.simulatedFailed} source={feed.simulated} /> : null}
        {recordingsFailed ? <SourceNotice message={SESSIONS_LIST_COPY.recordingsFailed} source={feed.recordings} /> : null}
        <EmptyState icon={<HistoryIcon />} title={SESSIONS_LIST_COPY.empty[filter]} description={SESSIONS_LIST_COPY.emptyHint} />
      </>
    );
  } else {
    content = (
      <>
        {simulatedFailed ? <SourceNotice message={SESSIONS_LIST_COPY.simulatedFailed} source={feed.simulated} /> : null}
        {recordingsFailed ? <SourceNotice message={SESSIONS_LIST_COPY.recordingsFailed} source={feed.recordings} /> : null}
        {feed.titlesError === null ? null : (
          <p className={cx(styles.notice)} role="alert">
            {SESSIONS_LIST_COPY.titlesError}
            <button type="button" className={cx(styles.linkButton)} onClick={feed.retryTitles}>{SESSIONS_LIST_COPY.retry}</button>
          </p>
        )}
        <ul className={cx(styles.list)} aria-label={SESSIONS_LIST_COPY.listLabel}>
          {feed.items.map((item) => (item.kind === "simulated"
            ? <SimulatedItem key={item.key} session={item.session} titles={titles} onOpen={onOpen} />
            : <RecordingItem key={item.key} recording={item.recording} onOpen={onOpen} />))}
        </ul>
        {filter !== "real" && feed.hiddenSimulated > 0 ? <p className={cx(styles.muted)}>{SESSIONS_LIST_COPY.hiddenSimulated(feed.hiddenSimulated)}</p> : null}
      </>
    );
  }

  return (
    <div className={cx(styles.listView)}>
      <div className={cx(styles.toolbar)}>
        <div className={cx(styles.filter)} role="group" aria-label={SESSIONS_LIST_COPY.filterLabel}>
          {SESSIONS_TYPE_FILTERS.map((key) => (
            <button
              key={key}
              type="button"
              className={cx(styles.filterButton)}
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
            >
              {SESSIONS_FILTER_LABELS[key]}
            </button>
          ))}
        </div>
        <div className={cx(styles.pager)}>
          <p className={cx(styles.muted)}>
            {SESSIONS_LIST_COPY.rangeLabel(formatDate(feed.range.from.toISOString()), formatDate(feed.range.to.toISOString()))}
          </p>
          <button type="button" className={cx(styles.linkButton)} onClick={() => setWindowPage(windowPage + 1)}>{SESSIONS_LIST_COPY.previous}</button>
          <button type="button" className={cx(styles.linkButton)} disabled={windowPage === 0} onClick={() => setWindowPage(Math.max(0, windowPage - 1))}>
            {SESSIONS_LIST_COPY.next}
          </button>
        </div>
      </div>
      {content}
    </div>
  );
}
