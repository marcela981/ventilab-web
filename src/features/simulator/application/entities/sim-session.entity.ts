/*
* Funcionalidad: Simulation session entities
* Descripción: Types and pure rules of a running simulation session (T6): the session record kept by the session
*   store (start response + mode + clinical case id), the replay and state read models used to resume, the boot data
*   the worker starts from (recorded PARAM_CHANGE events + start time), the client event sent to
*   POST /simulation/sessions/{id}/events, the engine version check (FREE: warning; EXAM: block before the worker
*   starts) and the guards that turn the opaque `case` object and the time multiplier of the contract into engine
*   types. Depends on the sim-engine public API and the simulator config. v1.1: the record keeps `startedAt` and the
*   boot carries the wall-clock backlog and the unsent events of this tab.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { ENGINE_VERSION } from "@shared/sim-engine";
import type { EngineCase, ParamChangeEvent, VentilatorSettings } from "@shared/sim-engine";
import { DEFAULT_TIME_MULTIPLIER, TIME_MULTIPLIERS } from "../config/simulator.config";
import type { SimulationMode, TimeMultiplier } from "../config/simulator.config";

export type SessionRecord = {
  id: string
  mode: SimulationMode
  seed: number
  engineVersion: string
  timeMultiplier: TimeMultiplier
  expiresAt: string | null
  /** Wall-clock start of the session (ISO), from the start response or the history; null when unknown. */
  startedAt: string | null
  engineCase: EngineCase
  /** Clinical case id (the engine case id is the clinical case id). */
  caseId: string
  /** true from the start response until the console first boots it: no event can exist yet. */
  fresh: boolean
};

export type RecordedSessionEvent = {
  id: string
  type: string
  simTimeMs: number
  payload: Readonly<Record<string, unknown>>
};

export type SessionReplay = {
  id: string
  seed: number
  engineVersion: string
  timeMultiplier: number
  engineCase: unknown
  events: readonly RecordedSessionEvent[]
};

export type SessionState = {
  id: string
  status: string
  simTimeMs: number
  expiresAt: string | null
};

/** One client event of POST /simulation/sessions/{id}/events; the id is the idempotency key. */
export type ClientSessionEvent = {
  id: string
  simTimeMs: number
  type: "PARAM_CHANGE"
  payload: { changes: Partial<VentilatorSettings> }
};

/**
 * What the worker starts from: the session, the events to replay (stored on the server plus the unsent ones of this
 * tab) and the simulated time to resume at, plus the simulated time the wall clock still owes (caught up by the
 * loop through its normal backlog) and the unsent events to send before the simulation starts.
 */
export type SessionBoot = {
  record: SessionRecord
  initialEvents: readonly ParamChangeEvent[]
  startAtSimTimeMs: number
  initialBacklogMs: number
  pendingEvents: readonly ClientSessionEvent[]
};

export type EngineVersionCheck =
  | { status: "match" }
  | { status: "warning", message: string }
  | { status: "blocked", message: string };

// TODO(i18n): move to a simulator namespace in src/i18n.
export const ENGINE_VERSION_COPY = {
  warning: (session: string, bundled: string) =>
    `Esta sesión se creó con el motor ${session} y este navegador ejecuta el motor ${bundled}. La práctica continúa, pero las curvas pueden diferir del resultado del servidor.`,
  blocked: (session: string, bundled: string) =>
    `No se puede iniciar el examen: la sesión usa el motor ${session} y este navegador ejecuta el motor ${bundled}. Recarga la página para actualizar la aplicación o avisa a tu docente.`,
} as const;

/** FREE runs with a visible warning on a mismatch; EXAM is blocked before the worker starts. */
export function checkEngineVersion(mode: SimulationMode, sessionVersion: string, bundledVersion: string = ENGINE_VERSION): EngineVersionCheck {
  if (sessionVersion === bundledVersion) {
    return { status: "match" };
  }

  return mode === "EXAM"
    ? { status: "blocked", message: ENGINE_VERSION_COPY.blocked(sessionVersion, bundledVersion) }
    : { status: "warning", message: ENGINE_VERSION_COPY.warning(sessionVersion, bundledVersion) };
}

export function toTimeMultiplier(value: unknown): TimeMultiplier {
  return TIME_MULTIPLIERS.find((multiplier) => multiplier === value) ?? DEFAULT_TIME_MULTIPLIER;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Minimal structural check of the opaque `case` object of the contract before the engine receives it. */
export function isEngineCase(value: unknown): value is EngineCase {
  if (!isRecord(value) || typeof value.id !== "string" || !isRecord(value.patient)) {
    return false;
  }

  return (
    (value.patient.sex === "MALE" || value.patient.sex === "FEMALE") &&
    typeof value.patient.heightCm === "number" &&
    isRecord(value.mechanics) &&
    isRecord(value.initialSettings) &&
    isRecord(value.targets) &&
    Array.isArray(value.events)
  );
}

/** Stored PARAM_CHANGE events as engine events, in simulated-time order (ALARM_ACK and others do not affect the engine). */
export function toEngineEvents(events: readonly RecordedSessionEvent[]): ParamChangeEvent[] {
  return events
    .filter((event) => event.type === "PARAM_CHANGE" && isRecord(event.payload.changes) && Number.isFinite(event.simTimeMs) && event.simTimeMs >= 0)
    .map((event) => ({ type: "PARAM_CHANGE" as const, simTimeMs: event.simTimeMs, changes: event.payload.changes as Partial<VentilatorSettings> }))
    .sort((a, b) => a.simTimeMs - b.simTimeMs);
}
