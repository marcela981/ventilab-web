/*
* Funcionalidad: Simulation sessions service
* Descripción: Engine-based simulation session endpoints, all present in openapi/openapi.json: start a session POST /api/simulation/sessions ({mode, caseId, timeMultiplier, attemptId?, questionId?}; the server fixes the seed and the engine version) and the paginated session history GET /api/simulation/sessions/history (own sessions by default; page, limit, caseId, mode and status filters). v1.1 (T6): POST /{id}/events (client events with idempotent ids; the server counts duplicates), GET /{id}/replay and GET /{id}/state (resume after a reload) and POST /{id}/end ({simTimeMs?}). Summary and assist are added by later tasks. v1.2: a keepalive `fetch` of POST /{id}/events for the page-hide flush (same origin, Bearer token and cookies as the axios client) and the session `startedAt` read from the history `ids` filter. Depends on the api-client request helpers and token storage, the backend origin, the simulator DTOs and mappers. v1.3 (T8): the GET /{id}/summary path (read through useApiQuery by the result page) and the history query of one session (its mode and exam linkage).
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { apiGet, apiPost } from "@shared/api-client/api-request";
import { getAccessToken } from "@shared/api-client/token-storage";
import { BACKEND_ORIGIN } from "@shared/lib/env";
import type { ClientSessionEvent, SessionReplay, SessionState } from "../../application/entities/sim-session.entity";
import type { StartedSession } from "../../application/entities/simulator.entity";
import type {
  AppendedSimulationEventsDTO,
  AppendSimulationEventsDTO,
  SimulationSessionsQueryDTO,
  StartSimulationSessionDTO,
} from "../dtos/simulator.dto";
import { toSessionReplay, toSessionState, toStartedSession } from "../mappers/simulator.mapper";

export const SIMULATION_SESSIONS_PATH = "/api/simulation/sessions";
export const SIMULATION_SESSION_HISTORY_PATH = "/api/simulation/sessions/history";
export const SIMULATION_SESSION_EVENTS_PATH = "/api/simulation/sessions/{id}/events";
export const SIMULATION_SESSION_REPLAY_PATH = "/api/simulation/sessions/{id}/replay";
export const SIMULATION_SESSION_STATE_PATH = "/api/simulation/sessions/{id}/state";
export const SIMULATION_SESSION_END_PATH = "/api/simulation/sessions/{id}/end";
export const SIMULATION_SESSION_SUMMARY_PATH = "/api/simulation/sessions/{id}/summary";

/** History query of one own session (`ids` filter): its mode, attempt and question. */
export function singleSessionQuery(sessionId: string): SimulationSessionsQueryDTO {
  return { ids: sessionId, limit: 1, page: 1 };
}

export type SessionHistoryQuery = Pick<SimulationSessionsQueryDTO, "caseId" | "mode" | "status"> & { page: number, limit: number };

export function sessionHistoryQuery({ page, limit, caseId, mode, status }: SessionHistoryQuery): SimulationSessionsQueryDTO {
  return {
    page,
    limit,
    ...(caseId === undefined ? {} : { caseId }),
    ...(mode === undefined ? {} : { mode }),
    ...(status === undefined ? {} : { status }),
  };
}

export async function startSimulationSession(body: StartSimulationSessionDTO): Promise<StartedSession> {
  const result = await apiPost(SIMULATION_SESSIONS_PATH, { body });

  return toStartedSession(result.data);
}

function eventsBody(events: readonly ClientSessionEvent[]): AppendSimulationEventsDTO {
  return {
    // The generated schema types `payload` as an empty object (`Record<string, never>`); the contract documents
    // PARAM_CHANGE as `{ changes: Partial<VentilatorSettings> }`.
    events: events.map((event) => ({
      id: event.id,
      simTimeMs: event.simTimeMs,
      type: event.type,
      payload: event.payload as unknown as Record<string, never>,
    })),
  };
}

export async function appendSimulationEvents(sessionId: string, events: readonly ClientSessionEvent[]): Promise<AppendedSimulationEventsDTO> {
  const result = await apiPost(SIMULATION_SESSION_EVENTS_PATH, { params: { id: sessionId }, body: eventsBody(events) });

  return result.data;
}

/**
 * Page-hide flush: the same POST /events through `fetch(..., { keepalive: true })`, which the browser finishes after
 * the page is gone (axios/XHR cannot keep a request alive). Same base URL, Bearer token and cookies as the axios
 * client; no refresh on 401 and no result (the ids are idempotent and the outbox mirror resends them on the next boot).
 */
export function sendSimulationEventsKeepalive(sessionId: string, events: readonly ClientSessionEvent[]): void {
  if (events.length === 0 || typeof fetch !== "function") {
    return;
  }

  const token = getAccessToken();
  const headers: Record<string, string> = { Accept: "application/json", "Content-Type": "application/json" };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const url = `${BACKEND_ORIGIN}${SIMULATION_SESSION_EVENTS_PATH.replace("{id}", encodeURIComponent(sessionId))}`;

    void fetch(url, { method: "POST", keepalive: true, credentials: "include", headers, body: JSON.stringify(eventsBody(events)) })
      .catch(() => undefined);
  } catch {
    // Nothing else can be done while the page goes away; the outbox keeps the events.
  }
}

/** Wall-clock start of one own session, from the history (`ids` filter); null when it is not listed. */
export async function fetchSessionStartedAt(sessionId: string): Promise<string | null> {
  const result = await apiGet(SIMULATION_SESSION_HISTORY_PATH, { query: singleSessionQuery(sessionId) });

  return result.data.find((session) => session.id === sessionId)?.startedAt ?? null;
}

export async function fetchSessionReplay(sessionId: string): Promise<SessionReplay> {
  const result = await apiGet(SIMULATION_SESSION_REPLAY_PATH, { params: { id: sessionId } });

  return toSessionReplay(result.data);
}

export async function fetchSessionState(sessionId: string): Promise<SessionState> {
  const result = await apiGet(SIMULATION_SESSION_STATE_PATH, { params: { id: sessionId } });

  return toSessionState(result.data);
}

/** Ends the session at the given simulated time; the server computes the official score. */
export async function endSimulationSession(sessionId: string, simTimeMs: number): Promise<void> {
  await apiPost(SIMULATION_SESSION_END_PATH, { params: { id: sessionId }, body: { simTimeMs: Math.max(0, Math.floor(simTimeMs)) } });
}
