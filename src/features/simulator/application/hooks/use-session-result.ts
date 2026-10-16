/*
* Funcionalidad: useSessionResult
* Descripción: Data of the session result page (T8): the server summary GET /simulation/sessions/{id}/summary (the
*   official score and breakdown), the replay data GET /{id}/replay (case, seed, events) for the local evolution
*   chart, and the session itself from the history `ids` filter (mode, attempt id; own sessions only, so it is null
*   for a teacher reading a student's session). The local replay request is built only from a usable engine case and
*   runs to the simulated time the server scored with the session multiplier, so it reproduces the server replay; it
*   runs in the worker through useLocalReplay. The determinism check compares its final metrics with the server
*   `finalMetrics` and never replaces them. Depends on the api-client query hook, the simulator services, mappers,
*   entities and useLocalReplay. v1.1: `modeUnknown` when the history lookup failed or does not list the session.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useMemo } from "react";
import type { ApiError } from "@shared/api-client/api-error";
import { useApiQuery } from "@shared/api-client/use-api-query";
import type { SimReplayRequest } from "@shared/sim-engine";
import { toSessionExamLink, toSessionReplay, toSessionSummary } from "../../api/mappers/simulator.mapper";
import {
  SIMULATION_SESSION_HISTORY_PATH,
  SIMULATION_SESSION_REPLAY_PATH,
  SIMULATION_SESSION_SUMMARY_PATH,
  singleSessionQuery,
} from "../../api/services/simulation-sessions.service";
import { compareFinalMetrics } from "../entities/sim-result.entity";
import type { MetricsComparison, SessionExamLink, SessionSummary } from "../entities/sim-result.entity";
import { isEngineCase, toEngineEvents, toTimeMultiplier } from "../entities/sim-session.entity";
import type { SessionReplay } from "../entities/sim-session.entity";
import { useLocalReplay } from "./use-local-replay";
import type { LocalReplayDeps, LocalReplayState } from "./use-local-replay";

export type UseSessionResult = {
  summary: SessionSummary | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
  replay: SessionReplay | null
  replayError: ApiError | null
  /** Mode and exam linkage of the session; null while loading or when the history does not list it. */
  examLink: SessionExamLink | null
  /** True once the history lookup failed or settled without the session: the mode cannot be determined. */
  modeUnknown: boolean
  local: LocalReplayState
  /** Local replay final metrics vs the server finalMetrics; null until the local replay is ready. */
  comparison: MetricsComparison | null
};

/** Engine replay of the recorded session up to the simulated time the server scored, as the server runs it. */
export function buildLocalReplayRequest(replay: SessionReplay | null, summary: SessionSummary | null): SimReplayRequest | null {
  if (!replay || !summary || !isEngineCase(replay.engineCase)) {
    return null;
  }

  return {
    engineCase: replay.engineCase,
    seed: replay.seed,
    events: toEngineEvents(replay.events),
    untilMs: Math.max(0, summary.simTimeMs),
    options: { timeMultiplier: toTimeMultiplier(replay.timeMultiplier) },
  };
}

export function useSessionResult(sessionId: string, deps: LocalReplayDeps = {}): UseSessionResult {
  const params = { params: { id: sessionId } };
  const summaryQuery = useApiQuery(SIMULATION_SESSION_SUMMARY_PATH, params);
  const replayQuery = useApiQuery(SIMULATION_SESSION_REPLAY_PATH, params);
  const infoQuery = useApiQuery(SIMULATION_SESSION_HISTORY_PATH, { query: singleSessionQuery(sessionId) });

  const summary = useMemo(() => (summaryQuery.data ? toSessionSummary(summaryQuery.data.data) : null), [summaryQuery.data]);
  const replay = useMemo(() => (replayQuery.data ? toSessionReplay(replayQuery.data.data) : null), [replayQuery.data]);
  const examLink = useMemo(() => {
    const session = infoQuery.data?.data.find((item) => item.id === sessionId);

    return session ? toSessionExamLink(session) : null;
  }, [infoQuery.data, sessionId]);
  const request = useMemo(() => buildLocalReplayRequest(replay, summary), [replay, summary]);
  const local = useLocalReplay(request, deps);
  const comparison = useMemo(
    () => (local.status === "ready" && summary ? compareFinalMetrics(local.result.final, summary.finalMetrics) : null),
    [local, summary],
  );

  const { mutate } = summaryQuery;
  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return {
    summary,
    isLoading: summaryQuery.isLoading,
    error: summaryQuery.error ?? null,
    reload,
    replay,
    replayError: replayQuery.error ?? null,
    examLink,
    modeUnknown: examLink === null && (infoQuery.error !== undefined || infoQuery.data !== undefined),
    local,
    comparison,
  };
}
