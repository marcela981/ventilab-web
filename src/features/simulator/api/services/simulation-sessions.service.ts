/*
* Funcionalidad: Simulation sessions service
* Descripción: Engine-based simulation session endpoints, all present in openapi/openapi.json: start a session POST /api/simulation/sessions ({mode, caseId, timeMultiplier, attemptId?, questionId?}; the server fixes the seed and the engine version) and the paginated session history GET /api/simulation/sessions/history (own sessions by default; page, limit, caseId, mode and status filters). Events, end, summary, state, replay and assist are added by later tasks. Depends on the api-client request helpers, the simulator DTOs and mappers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { apiPost } from "@shared/api-client/api-request";
import type { StartedSession } from "../../application/entities/simulator.entity";
import type { SimulationSessionsQueryDTO, StartSimulationSessionDTO } from "../dtos/simulator.dto";
import { toStartedSession } from "../mappers/simulator.mapper";

export const SIMULATION_SESSIONS_PATH = "/api/simulation/sessions";
export const SIMULATION_SESSION_HISTORY_PATH = "/api/simulation/sessions/history";

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
