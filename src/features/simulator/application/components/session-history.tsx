/*
* Funcionalidad: SessionHistory
* Descripción: "Mis sesiones" section of the simulator: a table of the user's simulation sessions (case, mode, start date, duration, result as score % plus status) with links to the result and replay pages of a finished session and to the console of a session still running; loading skeleton, error with retry, empty state with a hint, and a pager when the history has more than one page. Depends on MUI Pagination and icons, next/link, the design-system states, the date format helper, useSessionHistory, the simulator entities, routes and styles.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import HistoryIcon from "@mui/icons-material/History";
import Pagination from "@mui/material/Pagination";
import Link from "next/link";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { ErrorState } from "@shared/design-system/components/error-state";
import { ListSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { formatDateTime } from "@shared/lib/format";
import { buildSessionReplayUrl, buildSessionResultUrl, buildSessionUrl } from "../config/simulator.routes";
import { formatScore, formatSessionDuration, sessionStatusLabel, simulationModeLabel } from "../entities/simulator.entity";
import { getSimulatorErrorMessage } from "../entities/simulator-error-messages";
import { useSessionHistory } from "../hooks/use-session-history";
import type { SessionHistoryRow } from "../hooks/use-session-history";
import styles from "../../UI/simulator.module.css";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const SESSION_HISTORY_COPY = {
  caption: "Tus sesiones de simulación, de la más reciente a la más antigua.",
  columns: { case: "Caso", mode: "Modo", date: "Fecha", duration: "Duración", result: "Resultado", actions: "Acciones" },
  unknownCase: "Caso no disponible",
  inProgress: "En curso",
  result: "Ver resultado",
  replay: "Ver repetición",
  resume: "Continuar",
  loading: "Cargando tus sesiones…",
  loadErrorTitle: "No se pudieron cargar tus sesiones",
  empty: "Todavía no tienes sesiones de simulación.",
  emptyHint: "Elige un caso del catálogo e inicia una práctica.",
  pager: "Páginas del historial",
} as const;

function SessionActions({ session }: { session: SessionHistoryRow }) {
  if (session.status.toUpperCase() === "ACTIVE") {
    return (
      <Link href={buildSessionUrl(session.id)} className={cx(styles.link)}>
        {SESSION_HISTORY_COPY.resume}
      </Link>
    );
  }

  return (
    <span className={cx(styles.links)}>
      <Link href={buildSessionResultUrl(session.id)} className={cx(styles.link)}>
        {SESSION_HISTORY_COPY.result}
      </Link>
      <Link href={buildSessionReplayUrl(session.id)} className={cx(styles.link)}>
        {SESSION_HISTORY_COPY.replay}
      </Link>
    </span>
  );
}

export function SessionHistory() {
  const { sessions, page, setPage, pagination, isLoading, error, reload } = useSessionHistory();
  const pages = pagination?.pages ?? 1;

  if (!sessions && isLoading) {
    return <ListSkeleton label={SESSION_HISTORY_COPY.loading} />;
  }

  if (!sessions && error) {
    return (
      <ErrorState
        title={SESSION_HISTORY_COPY.loadErrorTitle}
        description={getSimulatorErrorMessage(error)}
        onRetry={() => void reload()}
      />
    );
  }

  if (!sessions || sessions.length === 0) {
    return <EmptyState icon={<HistoryIcon />} title={SESSION_HISTORY_COPY.empty} description={SESSION_HISTORY_COPY.emptyHint} />;
  }

  return (
    <div className={cx(styles.panel)}>
      <div className={cx(styles.tableWrapper)}>
        <table className={cx(styles.table)}>
          <caption>{SESSION_HISTORY_COPY.caption}</caption>
          <thead>
            <tr>
              <th scope="col">{SESSION_HISTORY_COPY.columns.case}</th>
              <th scope="col">{SESSION_HISTORY_COPY.columns.mode}</th>
              <th scope="col">{SESSION_HISTORY_COPY.columns.date}</th>
              <th scope="col">{SESSION_HISTORY_COPY.columns.duration}</th>
              <th scope="col">{SESSION_HISTORY_COPY.columns.result}</th>
              <th scope="col">{SESSION_HISTORY_COPY.columns.actions}</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id}>
                <th scope="row">
                  {session.caseTitle ?? <span className={cx(styles.muted)}>{SESSION_HISTORY_COPY.unknownCase}</span>}
                </th>
                <td>{simulationModeLabel(session.mode)}</td>
                <td>
                  <time dateTime={session.startedAt}>{formatDateTime(session.startedAt)}</time>
                </td>
                <td>{session.endedAt === null ? SESSION_HISTORY_COPY.inProgress : formatSessionDuration(session.durationMs)}</td>
                <td>
                  <span className={cx(styles.result)}>
                    {session.score === null ? null : <span className={cx(styles.score)}>{formatScore(session.score)}</span>}
                    <span className={cx(styles.muted)}>{sessionStatusLabel(session.status)}</span>
                  </span>
                </td>
                <td>
                  <SessionActions session={session} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 ? (
        <Pagination
          count={pages}
          page={Math.min(page, pages)}
          onChange={(_event, next) => setPage(next)}
          className={cx(styles.pager)}
          aria-label={SESSION_HISTORY_COPY.pager}
        />
      ) : null}
    </div>
  );
}
