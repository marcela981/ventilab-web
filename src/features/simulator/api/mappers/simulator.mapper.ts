/*
* Funcionalidad: Simulator mappers
* Descripción: Maps the simulator backend DTOs to the feature entities: a clinical case list item to a catalog card, the start-session response to a started session and a history DTO to a history row with its duration. The list summary has no expert-validation flag (backend gap); the card reads one only if a future payload carries it as a boolean, otherwise it stays null and no badge is shown. v1.1 (T6): the session replay and state read models used to resume a session (the opaque `case` stays unknown until the entity guard checks it). Depends on the simulator DTOs and entities.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { sessionDurationMs } from "../../application/entities/simulator.entity";
import type { SessionReplay, SessionState } from "../../application/entities/sim-session.entity";
import type { CaseCard, SessionHistoryItem, StartedSession } from "../../application/entities/simulator.entity";
import type {
  ClinicalCaseListItemDTO,
  SimulationSessionDTO,
  SimulationSessionReplayDTO,
  SimulationSessionStateDTO,
  StartedSimulationSessionDTO,
} from "../dtos/simulator.dto";

// BACKEND GAP: ClinicalCaseSummaryDTO has no `validatedByExpert` (only /definition, staff only, has it).
function readValidatedFlag(summary: object): boolean | null {
  const flag: unknown = (summary as { validatedByExpert?: unknown }).validatedByExpert;

  return typeof flag === "boolean" ? flag : null;
}

export function toCaseCard({ clinicalCase }: ClinicalCaseListItemDTO): CaseCard {
  return {
    id: clinicalCase.id,
    title: clinicalCase.title,
    description: clinicalCase.description,
    mainDiagnosis: clinicalCase.mainDiagnosis,
    pathology: clinicalCase.pathology,
    difficulty: clinicalCase.difficulty,
    patientAge: clinicalCase.patientAge,
    patientWeight: clinicalCase.patientWeight,
    validatedByExpert: readValidatedFlag(clinicalCase),
  };
}

export function toStartedSession(dto: StartedSimulationSessionDTO): StartedSession {
  return {
    id: dto.id,
    seed: dto.seed,
    engineVersion: dto.engineVersion,
    startedAt: dto.startedAt,
    expiresAt: dto.expiresAt,
    timeMultiplier: dto.timeMultiplier,
    engineCase: dto.case,
  };
}

export function toSessionHistoryItem(dto: SimulationSessionDTO): SessionHistoryItem {
  return {
    id: dto.id,
    caseId: dto.caseId,
    mode: dto.mode,
    status: dto.status,
    startedAt: dto.startedAt,
    endedAt: dto.endedAt,
    durationMs: sessionDurationMs(dto.startedAt, dto.endedAt),
    score: dto.score,
  };
}

export function toSessionReplay(dto: SimulationSessionReplayDTO): SessionReplay {
  return {
    id: dto.id,
    seed: dto.seed,
    engineVersion: dto.engineVersion,
    timeMultiplier: dto.timeMultiplier,
    engineCase: dto.case,
    events: dto.events.map((event) => ({ id: event.id, type: event.type, simTimeMs: event.simTimeMs, payload: event.payload })),
  };
}

export function toSessionState(dto: SimulationSessionStateDTO): SessionState {
  return { id: dto.id, status: dto.status, simTimeMs: dto.simTimeMs, expiresAt: dto.expiresAt };
}
