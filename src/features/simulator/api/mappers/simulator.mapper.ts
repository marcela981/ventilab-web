/*
* Funcionalidad: Simulator mappers
* Descripción: Maps the simulator backend DTOs to the feature entities: a clinical case list item to a catalog card, the start-session response to a started session and a history DTO to a history row with its duration. The list summary has no expert-validation flag (backend gap); the card reads one only if a future payload carries it as a boolean, otherwise it stays null and no badge is shown. v1.1 (T6): the session replay and state read models used to resume a session (the opaque `case` stays unknown until the entity guard checks it). Depends on the simulator DTOs and entities.
*   v1.2 (T8): the replay keeps its engine version fields; the session summary (score, rubric breakdown, final
*   targets with known ids only) and the exam link of a history DTO.
*   v1.3 (W6, Bloque 1): the own patient of a FREE session is kept (checked by parseSessionPatient) in the session
*   state, replay and history; the started session carries the patient of the start request (not echoed by the server).
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { TargetStatus } from "@shared/sim-engine";
import { OBJECTIVE_DEFINITIONS } from "../../application/config/sim-console.config";
import type { ScoreCriterion, SessionExamLink, SessionSummary } from "../../application/entities/sim-result.entity";
import { sessionDurationMs } from "../../application/entities/simulator.entity";
import { parseSessionPatient } from "../../application/entities/sim-patient.entity";
import type { SessionReplay, SessionState } from "../../application/entities/sim-session.entity";
import type { CaseCard, SessionHistoryItem, StartedSession } from "../../application/entities/simulator.entity";
import type {
  ClinicalCaseListItemDTO,
  SimulationSessionDTO,
  SimulationSessionReplayDTO,
  SimulationSessionStateDTO,
  SimulationSessionSummaryDTO,
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

/** `requestedPatient`: the own patient of the start request (the response does not echo it). */
export function toStartedSession(dto: StartedSimulationSessionDTO, requestedPatient?: unknown): StartedSession {
  return {
    id: dto.id,
    seed: dto.seed,
    engineVersion: dto.engineVersion,
    startedAt: dto.startedAt,
    expiresAt: dto.expiresAt,
    timeMultiplier: dto.timeMultiplier,
    engineCase: dto.case,
    patient: parseSessionPatient(requestedPatient),
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
    patient: parseSessionPatient(dto.patient),
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
    currentEngineVersion: dto.currentEngineVersion,
    engineVersionMismatch: dto.engineVersionMismatch,
    warning: dto.warning,
    patient: parseSessionPatient(dto.patient),
  };
}

export function toSessionState(dto: SimulationSessionStateDTO): SessionState {
  return { id: dto.id, status: dto.status, simTimeMs: dto.simTimeMs, expiresAt: dto.expiresAt, patient: parseSessionPatient(dto.patient) };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isTargetId(value: unknown): value is TargetStatus["id"] {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(OBJECTIVE_DEFINITIONS, value);
}

function isTargetStatusValue(value: unknown): value is TargetStatus["status"] {
  return value === "MET" || value === "UNMET" || value === "UNKNOWN";
}

// The contract types `targets` and `breakdown` items as plain objects: each one is checked before use.
function toTargetStatus(value: unknown): TargetStatus[] {
  if (!isRecord(value) || !isTargetId(value.id) || !isTargetStatusValue(value.status)) {
    return [];
  }

  return [{ id: value.id, status: value.status, value: numberOrNull(value.value), min: numberOrNull(value.min), max: numberOrNull(value.max) }];
}

function toScoreCriterion(value: unknown): ScoreCriterion[] {
  if (!isRecord(value) || typeof value.criterion !== "string") {
    return [];
  }

  return [{
    criterion: value.criterion,
    weight: numberOrNull(value.weight),
    value: numberOrNull(value.value),
    threshold: numberOrNull(value.threshold),
    points: numberOrNull(value.points),
    weightedPoints: numberOrNull(value.weightedPoints),
    justification: typeof value.justification === "string" ? value.justification : "",
  }];
}

export function toSessionSummary(dto: SimulationSessionSummaryDTO): SessionSummary {
  const targets: readonly unknown[] = dto.targets;
  const breakdown: readonly unknown[] = dto.breakdown;

  return {
    id: dto.id,
    status: dto.status,
    engineVersion: dto.engineVersion,
    simTimeMs: dto.simTimeMs,
    durationMs: dto.durationMs,
    finalMetrics: dto.finalMetrics,
    targets: targets.flatMap(toTargetStatus),
    score: dto.score,
    breakdown: breakdown.flatMap(toScoreCriterion),
    aiHelpCount: dto.aiHelpCount,
  };
}

export function toSessionExamLink(dto: SimulationSessionDTO): SessionExamLink {
  return { mode: dto.mode, attemptId: dto.attemptId, questionId: dto.questionId };
}
