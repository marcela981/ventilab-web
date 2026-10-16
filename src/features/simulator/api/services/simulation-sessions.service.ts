/*
* Funcionalidad: Simulation sessions service
* Descripción: Engine-based simulation session endpoints, all present in openapi/openapi.json: start a session POST /api/simulation/sessions ({mode, caseId, timeMultiplier, attemptId?, questionId?}; the server fixes the seed and the engine version) and the paginated session history GET /api/simulation/sessions/history (own sessions by default; page, limit, caseId, mode and status filters). v1.1 (T6): POST /{id}/events (client events with idempotent ids; the server counts duplicates), GET /{id}/replay and GET /{id}/state (resume after a reload) and POST /{id}/end ({simTimeMs?}). Summary and assist are added by later tasks. Depends on the api-client request helpers, the simulator DTOs and mappers.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { apiGet, apiPost } from "@shared/api-client/api-request";
import type { ClientSessionEvent, SessionReplay, SessionState } from "../../application/entities/sim-session.entity";
import type { StartedSession } from "../../application/entities/simulator.entity";
import type { AppendedSimulationEventsDTO, SimulationSessionsQueryDTO, StartSimulationSessionDTO } from "../dtos/simulator.dto";
import { toSessionReplay, toSessionState, toStartedSession } from "../mappers/simulator.mapper";

export const SIMULATION_SESSIONS_PATH = "/api/simulation/sessions";
export const SIMULATION_SESSION_HISTORY_PATH = "/api/simulation/sessions/history";
export const SIMULATION_SESSION_EVENTS_PATH = "/api/simulation/sessions/{id}/events";
export const SIMULATION_SESSION_REPLAY_PATH = "/api/simulation/sessions/{id}/replay";
export const SIMULATION_SESSION_STATE_PATH = "/api/simulation/sessions/{id}/state";
export const SIMULATION_SESSION_END_PATH = "/api/simulation/sessions/{id}/end";

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

export async function appendSimulationEvents(sessionId: string, events: readonly ClientSessionEvent[]): Promise<AppendedSimulationEventsDTO> {
  const result = await apiPost(SIMULATION_SESSION_EVENTS_PATH, {
    params: { id: sessionId },
    // The generated schema types `payload` as an empty object (`Record<string, never>`); the contract documents
    // PARAM_CHANGE as `{ changes: Partial<VentilatorSettings> }`.
    body: {
      events: events.map((event) => ({
        id: event.id,
        simTimeMs: event.simTimeMs,
        type: event.type,
        payload: event.payload as unknown as Record<string, never>,
      })),
    },
  });

  return result.data;
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
