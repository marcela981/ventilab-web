/*
* Funcionalidad: Simulation sessions service
* Descripción: Engine-based simulation session endpoints, all present in openapi/openapi.json: start a session POST /api/simulation/sessions ({mode, caseId, timeMultiplier, attemptId?, questionId?}; the server fixes the seed and the engine version) and the paginated session history GET /api/simulation/sessions/history (own sessions by default; page, limit, caseId, mode and status filters). v1.1 (T6): POST /{id}/events (client events with idempotent ids; the server counts duplicates), GET /{id}/replay and GET /{id}/state (resume after a reload) and POST /{id}/end ({simTimeMs?}). Summary and assist are added by later tasks. v1.2: a keepalive `fetch` of POST /{id}/events for the page-hide flush (same origin, Bearer token and cookies as the axios client) and the session `startedAt` read from the history `ids` filter. Depends on the api-client request helpers and token storage, the backend origin, the simulator DTOs and mappers. v1.3 (T8): the GET /{id}/summary path (read through useApiQuery by the result page) and the history query of one session (its mode and exam linkage). v1.4 (review of 524aedf): GET /{id}/state also returns the server clock of its response (HTTP Date header, read through the axios client because the generic helpers hide headers); the page-hide keepalive is best effort and split into requests of ≤ 50 events and < 60 KiB each (the outbox mirror is the guarantee).
* Versión: 1.4
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { toApiError } from "@shared/api-client/api-error";
import { apiGet, apiPost, buildPath, unwrapResponse } from "@shared/api-client/api-request";
import { httpClient } from "@shared/api-client/http-client";
import { getAccessToken } from "@shared/api-client/token-storage";
import { BACKEND_ORIGIN } from "@shared/lib/env";
import { KEEPALIVE_MAX_BYTES, KEEPALIVE_MAX_EVENTS } from "../../application/config/sim-console.config";
import type { ClientSessionEvent, ServerClock, SessionReplay, SessionState } from "../../application/entities/sim-session.entity";
import type { StartedSession } from "../../application/entities/simulator.entity";
import type {
  AppendedSimulationEventsDTO,
  AppendSimulationEventsDTO,
  SimulationSessionsQueryDTO,
  SimulationSessionStateDTO,
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

function byteLength(text: string): number {
  return typeof TextEncoder === "function" ? new TextEncoder().encode(text).length : text.length * 3;
}

/**
 * Splits the events into request bodies of at most `maxEvents` events and under `maxBytes` bytes each, in order.
 * An event that alone exceeds `maxBytes` is left out (the browser would refuse the keepalive body; the outbox keeps it).
 */
export function chunkKeepaliveBodies(
  events: readonly ClientSessionEvent[],
  maxEvents: number = KEEPALIVE_MAX_EVENTS,
  maxBytes: number = KEEPALIVE_MAX_BYTES,
): string[] {
  const bodies: string[] = [];
  let chunk: ClientSessionEvent[] = [];
  let body = "";

  for (const event of events) {
    const candidate = [...chunk, event];
    const candidateBody = JSON.stringify(eventsBody(candidate));

    if (candidate.length <= maxEvents && byteLength(candidateBody) < maxBytes) {
      chunk = candidate;
      body = candidateBody;
      continue;
    }

    if (chunk.length > 0) {
      bodies.push(body);
    }

    const single = JSON.stringify(eventsBody([event]));

    [chunk, body] = byteLength(single) < maxBytes ? [[event], single] : [[], ""];
  }

  if (chunk.length > 0) {
    bodies.push(body);
  }

  return bodies;
}

/**
 * Page-hide flush, BEST EFFORT: the same POST /events through `fetch(..., { keepalive: true })`, which the browser may
 * finish after the page is gone (axios/XHR cannot keep a request alive). Browsers cap the in-flight keepalive bodies
 * (64 KiB in total), so the queue is split into requests of ≤ KEEPALIVE_MAX_EVENTS events and < KEEPALIVE_MAX_BYTES
 * each; whatever the browser drops is not lost. The guarantee is the outbox mirror: the ids are idempotent and the
 * next boot resends every unacknowledged event. Same base URL, Bearer token and cookies (`credentials: "include"`,
 * matching the axios client's `withCredentials: true`); no refresh on 401 and no result.
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

    chunkKeepaliveBodies(events).forEach((body) => {
      void fetch(url, { method: "POST", keepalive: true, credentials: "include", headers, body }).catch(() => undefined);
    });
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

/** Server clock of a response: its HTTP `Date` header (second precision) and the client time it arrived; null without one. */
export function readServerClock(dateHeader: unknown, clientNowMs: number): ServerClock | null {
  const serverNowMs = typeof dateHeader === "string" ? Date.parse(dateHeader) : Number.NaN;

  return Number.isFinite(serverNowMs) ? { serverNowMs, clientNowMs } : null;
}

/**
 * GET /{id}/state plus the server clock of its response. The generic helpers return only the envelope, so this call
 * goes through the same axios client (Bearer token, refresh, timeouts) to read the `Date` header. Cross-origin, the
 * browser hides `Date` unless the backend lists it in `Access-Control-Expose-Headers`; then `serverClock` is null.
 */
export async function fetchSessionState(sessionId: string, now: () => number = Date.now): Promise<SessionState> {
  try {
    const response = await httpClient.request({ method: "get", url: buildPath(SIMULATION_SESSION_STATE_PATH, { id: sessionId }) });
    const clientNowMs = now();
    const result = unwrapResponse<SimulationSessionStateDTO>(response.data);
    const headers = response.headers as Record<string, unknown> | undefined;

    return { ...toSessionState(result.data), serverClock: readServerClock(headers?.date, clientNowMs) };
  } catch (error) {
    throw toApiError(error);
  }
}

/** Ends the session at the given simulated time; the server computes the official score. */
export async function endSimulationSession(sessionId: string, simTimeMs: number): Promise<void> {
  await apiPost(SIMULATION_SESSION_END_PATH, { params: { id: sessionId }, body: { simTimeMs: Math.max(0, Math.floor(simTimeMs)) } });
}
