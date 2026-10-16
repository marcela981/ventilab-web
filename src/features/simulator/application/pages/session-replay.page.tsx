/*
* Funcionalidad: Simulation session replay page
* Descripción: /simulator/sessions/[sessionId]/replay (T8) on the full-width dark console surface. It loads
*   GET /simulation/sessions/{id}/replay (case, seed, events, engine versions; access is validated by the backend, with
*   403 and 404 states) and GET /{id}/state (the simulated time the server replays = playback length; without it the
*   last recorded event), then plays the session locally through useReplaySession: the same VentilatorConsole,
*   read-only (canControl=false, no control emits, no AI assist), with play/pause, the local speeds ×1–×8, a debounced
*   time bar with event marks (recorded events plus the alarm onsets of a local replay timeline run in the worker) and
*   immediate jumps from the mark list. A banner warns when the recorded engine version differs from the current one or
*   from this browser's. Nothing is ever sent to the backend. The worker factory and timers are injectable for tests.
*   Depends on next/head, next/link, the api-client query hook, the design system, the ventilator console, the
*   simulator hooks, entities, components and CSS Modules. v1.1: the playback length is frozen once settled (a /state
*   revalidation never restarts the replay); a failed /state offers a retry first and falls back to the last recorded
*   event only after it (or at once for 403/404), with a visible note.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Head from "next/head";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { ApiError } from "@shared/api-client/api-error";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { cx } from "@shared/lib/class-names";
import type { SimReplayRequest } from "@shared/sim-engine";
import { VentilatorConsole } from "@shared/ventilator-console";
import { toSessionReplay, toSessionState } from "../../api/mappers/simulator.mapper";
import { SIMULATION_SESSION_REPLAY_PATH, SIMULATION_SESSION_STATE_PATH } from "../../api/services/simulation-sessions.service";
import { ReplayTimeline } from "../components/replay-timeline";
import { buildSessionResultUrl, SIMULATOR_URL } from "../config/simulator.routes";
import { alarmOnsetMarks, eventMarks, replayDurationMs, replayVersionWarning } from "../entities/sim-replay.entity";
import { isEngineCase, toEngineEvents, toTimeMultiplier } from "../entities/sim-session.entity";
import type { SessionReplay } from "../entities/sim-session.entity";
import { getSimulatorErrorMessage } from "../entities/simulator-error-messages";
import { useLocalReplay } from "../hooks/use-local-replay";
import { useReplaySession } from "../hooks/use-replay-session";
import type { ReplaySessionDeps, ReplaySource } from "../hooks/use-replay-session";
import consoleStyles from "../../UI/session-console.module.css";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const REPLAY_PAGE_COPY = {
  documentTitle: "Repetición de la sesión | VentyLab",
  title: "Repetición de la sesión",
  readOnly: "Solo lectura",
  loading: "Cargando la repetición…",
  forbidden: "No tienes acceso a esta repetición.",
  notFound: "No se encontró la sesión de simulación.",
  failed: "No se pudo cargar la repetición",
  invalidCase: "El servidor no devolvió un caso que este navegador pueda reproducir.",
  retry: "Reintentar",
  starting: "Preparando la repetición…",
  stateFailed: "No se pudo leer la duración de la sesión",
  estimatedLength: "No se pudo leer la duración de la sesión: la repetición termina en el último evento registrado y puede quedar más corta que la sesión real.",
  viewResult: "Ver resultado",
  backToCatalog: "Volver al simulador",
} as const;

export type SessionReplayPageProps = {
  sessionId: string
  deps?: ReplaySessionDeps | undefined
};

function errorMessage(error: ApiError): string {
  if (error.status === 403) {
    return REPLAY_PAGE_COPY.forbidden;
  }

  return error.status === 404 ? REPLAY_PAGE_COPY.notFound : getSimulatorErrorMessage(error);
}

function buildSource(sessionId: string, replay: SessionReplay | null, durationMs: number): ReplaySource | null {
  if (!replay || !isEngineCase(replay.engineCase)) {
    return null;
  }

  return {
    sessionId,
    engineCase: replay.engineCase,
    seed: replay.seed,
    timeMultiplier: toTimeMultiplier(replay.timeMultiplier),
    events: toEngineEvents(replay.events),
    durationMs,
  };
}

function timelineRequest(source: ReplaySource | null): SimReplayRequest | null {
  return source
    ? {
        engineCase: source.engineCase,
        seed: source.seed,
        events: source.events,
        untilMs: source.durationMs,
        options: { timeMultiplier: source.timeMultiplier },
      }
    : null;
}

function ReplayPlayer({ source, replay, deps }: { source: ReplaySource, replay: SessionReplay, deps: ReplaySessionDeps | undefined }) {
  const session = useReplaySession(source, deps);
  const request = useMemo(() => timelineRequest(source), [source]);
  // Alarm onsets come from a full local replay timeline, run in the worker like the playback.
  const timeline = useLocalReplay(request, deps);
  const marks = useMemo(() => {
    const recorded = eventMarks(replay.events, source.durationMs);
    const alarms = timeline.status === "ready" ? alarmOnsetMarks(timeline.result.metricsTimeline, source.durationMs) : [];

    return [...recorded, ...alarms].sort((a, b) => a.simTimeMs - b.simTimeMs);
  }, [replay.events, source.durationMs, timeline]);
  const warning = replayVersionWarning(replay);

  return (
    <>
      {warning ? <p className={cx(consoleStyles.banner)} data-tone="warning" role="status">{warning}</p> : null}
      {session.workerError ? <p className={cx(consoleStyles.banner)} data-tone="error" role="alert">{session.workerError}</p> : null}
      <ReplayTimeline
        status={session.status}
        simTimeMs={session.simTimeMs}
        durationMs={source.durationMs}
        speed={session.speed}
        marks={marks}
        disabled={session.workerError !== null}
        onPlay={session.play}
        onPause={session.pause}
        onSpeedChange={session.setSpeed}
        onScrub={session.seek}
        onJump={session.seekNow}
      />
      <div className={cx(consoleStyles.consoleArea)}>
        {session.adapter ? <VentilatorConsole adapter={session.adapter} variant="live" /> : null}
        {session.status === "starting" ? <p className={cx(consoleStyles.consoleMuted)} role="status">{REPLAY_PAGE_COPY.starting}</p> : null}
      </div>
    </>
  );
}

export function SessionReplayPage({ sessionId, deps }: SessionReplayPageProps) {
  const params = { params: { id: sessionId } };
  const replayQuery = useApiQuery(SIMULATION_SESSION_REPLAY_PATH, params);
  const stateQuery = useApiQuery(SIMULATION_SESSION_STATE_PATH, params);
  const replay = useMemo(() => (replayQuery.data ? toSessionReplay(replayQuery.data.data) : null), [replayQuery.data]);
  const serverSimTimeMs = stateQuery.data ? toSessionState(stateQuery.data.data).simTimeMs : null;
  const [stateRetried, setStateRetried] = useState(false);
  const stateError = stateQuery.data === undefined ? stateQuery.error ?? null : null;
  // The last recorded event is only a fallback length: used after one failed retry of GET /state (or at once when
  // the state is denied or missing, which a retry does not change), never silently on the first failure.
  const fallbackToEvents = stateError !== null && !stateQuery.isValidating
    && (stateRetried || stateError.status === 403 || stateError.status === 404);
  const candidateDurationMs = replay && (serverSimTimeMs !== null || fallbackToEvents)
    ? replayDurationMs(serverSimTimeMs, replay.events)
    : null;
  // The playback length is frozen once it settles: a later revalidation of /state must not restart the replay.
  const [frozen, setFrozen] = useState<{ sessionId: string, durationMs: number, estimated: boolean } | null>(null);

  if (candidateDurationMs !== null && frozen?.sessionId !== sessionId) {
    setFrozen({ sessionId, durationMs: candidateDurationMs, estimated: serverSimTimeMs === null });
  }

  const settled = frozen?.sessionId === sessionId ? frozen : null;
  const source = useMemo(
    () => (settled ? buildSource(sessionId, replay, settled.durationMs) : null),
    [replay, sessionId, settled],
  );
  const retryState = (): void => {
    setStateRetried(true);
    void stateQuery.mutate();
  };

  let body: ReactNode;

  if (replayQuery.error && !replay) {
    body = (
      <section className={cx(consoleStyles.notice)} role="alert">
        <h2 className={cx(consoleStyles.blockedTitle)}>{REPLAY_PAGE_COPY.failed}</h2>
        <p>{errorMessage(replayQuery.error)}</p>
        <div className={cx(consoleStyles.noticeActions)}>
          {replayQuery.error.status === 403 || replayQuery.error.status === 404 ? null : (
            <button type="button" className={cx(consoleStyles.timeButton)} onClick={() => void replayQuery.mutate()}>{REPLAY_PAGE_COPY.retry}</button>
          )}
          <Link href={SIMULATOR_URL} className={cx(consoleStyles.link)}>{REPLAY_PAGE_COPY.backToCatalog}</Link>
        </div>
      </section>
    );
  } else if (replay && settled && !source) {
    body = <section className={cx(consoleStyles.notice)} role="alert"><p>{REPLAY_PAGE_COPY.invalidCase}</p></section>;
  } else if (replay && source) {
    body = (
      <>
        {settled?.estimated ? <p className={cx(consoleStyles.banner)} data-tone="warning" role="note">{REPLAY_PAGE_COPY.estimatedLength}</p> : null}
        <ReplayPlayer key={source.sessionId} source={source} replay={replay} deps={deps} />
      </>
    );
  } else if (replay && stateError && !fallbackToEvents && !stateQuery.isValidating) {
    body = (
      <section className={cx(consoleStyles.notice)} role="alert">
        <h2 className={cx(consoleStyles.blockedTitle)}>{REPLAY_PAGE_COPY.stateFailed}</h2>
        <p>{getSimulatorErrorMessage(stateError)}</p>
        <div className={cx(consoleStyles.noticeActions)}>
          <button type="button" className={cx(consoleStyles.timeButton)} onClick={retryState}>{REPLAY_PAGE_COPY.retry}</button>
        </div>
      </section>
    );
  } else {
    body = <p className={cx(consoleStyles.consoleMuted)} role="status">{REPLAY_PAGE_COPY.loading}</p>;
  }

  return (
    <div className={cx(consoleStyles.sessionPage)}>
      <Head>
        <title>{REPLAY_PAGE_COPY.documentTitle}</title>
      </Head>
      <header className={cx(consoleStyles.sessionHeader)}>
        <h1 className={cx(consoleStyles.sessionTitle)}>{REPLAY_PAGE_COPY.title}</h1>
        <span className={cx(consoleStyles.modeTag)}>{REPLAY_PAGE_COPY.readOnly}</span>
        <div className={cx(consoleStyles.noticeActions)}>
          <Link href={buildSessionResultUrl(sessionId)} className={cx(consoleStyles.link)}>{REPLAY_PAGE_COPY.viewResult}</Link>
          <Link href={SIMULATOR_URL} className={cx(consoleStyles.link)}>{REPLAY_PAGE_COPY.backToCatalog}</Link>
        </div>
      </header>
      {body}
    </div>
  );
}
