/*
* Funcionalidad: Simulation patient status and debrief rules
* Descripción: Pure rules of the patient evolution of a session (Bloque A, DISENO_AJUSTES_A §4.6 and §4.7): the
*   Spanish labels of the patient status (STABLE → DECEASED), the status chip text with the severity, the deceased
*   check of a metrics snapshot (the client ends the session on its own), the server outcome and debrief timeline read
*   models with their parsers (unknown kinds or malformed items are dropped), the simulated time as mm:ss and the text
*   of each timeline item: a decision as "PEEP 5 → 12 cmH₂O" (console labels, display units and scales of the
*   settings binding), an alarm onset with its console label and a patient status change. Depends on the sim-engine
*   public types, the settings and frame bindings and the light console config entry.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { AlarmCode, EngineMetrics, PatientStatus } from "@shared/sim-engine";
import { ALARM_LABELS, MODE_LABELS, PARAMETER_SETTINGS, tidy } from "@shared/sim-engine/console-binding";
import { CONSOLE_PARAMETERS } from "@shared/ventilator-console/config.entry";
import type { ConsoleParameterId } from "@shared/ventilator-console";

export const PATIENT_STATUSES = ["STABLE", "UNSTABLE", "CRITICAL", "ARREST", "DECEASED"] as const satisfies readonly PatientStatus[];

// TODO(i18n): move to a simulator namespace in src/i18n.
export const PATIENT_STATUS_LABELS = {
  STABLE: "Estable",
  UNSTABLE: "Inestable",
  CRITICAL: "Crítico",
  ARREST: "Paro cardíaco",
  DECEASED: "Paciente fallecido",
} as const satisfies Record<PatientStatus, string>;

export const DEBRIEF_COPY = {
  severity: (percent: number) => `gravedad ${percent} %`,
  status: (label: string) => `Estado del paciente: ${label}`,
  alarm: (label: string) => `Alarma: ${label}`,
  mode: "Modo",
} as const;

export function isPatientStatus(value: unknown): value is PatientStatus {
  return typeof value === "string" && (PATIENT_STATUSES as readonly string[]).includes(value);
}

/** "Inestable · gravedad 45 %" for the status chip; the severity is left out once the patient is in arrest or dead. */
export function patientConditionText(status: PatientStatus, severity: number | null): string {
  const label = PATIENT_STATUS_LABELS[status];

  if (severity === null || !Number.isFinite(severity) || status === "ARREST" || status === "DECEASED") {
    return label;
  }

  return `${label} · ${DEBRIEF_COPY.severity(Math.round(Math.min(1, Math.max(0, severity)) * 100))}`;
}

/** True once the engine reports the patient deceased (the engine then ignores every later event). */
export function isDeceased(metrics: EngineMetrics | null): boolean {
  return metrics?.patient?.status === "DECEASED";
}

export type SimulationOutcome = {
  /** Null for sessions without patient evolution (engine 1.0.0). */
  status: PatientStatus | null
  firstCriticalAtMs: number | null
  arrestAtMs: number | null
  deceasedAtMs: number | null
};

export type DebriefChange = { field: string, from: number | string | null, to: number | string };

export type DebriefItem =
  | { kind: "DECISION", simTimeMs: number, changes: readonly DebriefChange[] }
  | { kind: "ALARM", simTimeMs: number, code: string }
  | { kind: "PATIENT_STATUS", simTimeMs: number, code: PatientStatus };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function timeOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function settingValue(value: unknown): number | string | null {
  return (typeof value === "number" && Number.isFinite(value)) || typeof value === "string" ? value : null;
}

export function parseOutcome(value: unknown): SimulationOutcome | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    status: isPatientStatus(value.status) ? value.status : null,
    firstCriticalAtMs: timeOrNull(value.firstCriticalAtMs),
    arrestAtMs: timeOrNull(value.arrestAtMs),
    deceasedAtMs: timeOrNull(value.deceasedAtMs),
  };
}

function parseChanges(value: unknown): DebriefChange[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((change: unknown) => {
    if (!isRecord(change) || typeof change.field !== "string") {
      return [];
    }

    const to = settingValue(change.to);

    return to === null ? [] : [{ field: change.field, from: settingValue(change.from), to }];
  });
}

function parseItem(value: unknown): DebriefItem[] {
  if (!isRecord(value) || typeof value.simTimeMs !== "number" || !Number.isFinite(value.simTimeMs)) {
    return [];
  }

  const { simTimeMs } = value;

  if (value.kind === "DECISION") {
    const changes = parseChanges(value.changes);

    return changes.length > 0 ? [{ kind: "DECISION", simTimeMs, changes }] : [];
  }

  if (value.kind === "ALARM" && typeof value.code === "string") {
    return [{ kind: "ALARM", simTimeMs, code: value.code }];
  }

  if (value.kind === "PATIENT_STATUS" && isPatientStatus(value.code)) {
    return [{ kind: "PATIENT_STATUS", simTimeMs, code: value.code }];
  }

  return [];
}

/** The server debrief timeline; a missing list (summaries stored before the engine 2.0.0) is empty. */
export function parseTimeline(value: unknown): DebriefItem[] {
  return Array.isArray(value) ? value.flatMap(parseItem) : [];
}

/** Simulated time as mm:ss (minutes keep counting past 59). */
export function formatDebriefTime(simTimeMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(simTimeMs / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return `${minutes}:${seconds}`;
}

const PARAMETER_BY_SETTING = new Map(
  (Object.keys(PARAMETER_SETTINGS) as ConsoleParameterId[]).map((id) => [PARAMETER_SETTINGS[id].key as string, id]),
);

function displayUnit(unit: string): string {
  return unit.replace("cmH2O", "cmH₂O");
}

function modeLabel(value: number | string | null): string {
  return typeof value === "string" && value in MODE_LABELS ? value : String(value ?? "—");
}

function describeChange(change: DebriefChange): string {
  if (change.field === "mode") {
    return `${DEBRIEF_COPY.mode} ${modeLabel(change.from)} → ${modeLabel(change.to)}`;
  }

  const parameterId = PARAMETER_BY_SETTING.get(change.field);

  if (parameterId === undefined) {
    return `${change.field} ${change.from ?? "—"} → ${change.to}`;
  }

  const { scale, unit } = PARAMETER_SETTINGS[parameterId];
  const show = (value: number | string | null): string => (typeof value === "number" ? String(tidy(value * scale)) : String(value ?? "—"));
  const suffix = unit ? ` ${displayUnit(unit)}` : "";

  return `${CONSOLE_PARAMETERS[parameterId].label} ${show(change.from)} → ${show(change.to)}${suffix}`;
}

function alarmLabel(code: string): string {
  return code in ALARM_LABELS ? ALARM_LABELS[code as AlarmCode] : code;
}

/** The text of one timeline item ("PEEP 5 → 12 cmH₂O · FiO2 40 → 80 %", "Alarma: SpO₂ baja", …). */
export function describeDebriefItem(item: DebriefItem): string {
  if (item.kind === "DECISION") {
    return item.changes.map(describeChange).join(" · ");
  }

  if (item.kind === "ALARM") {
    return DEBRIEF_COPY.alarm(alarmLabel(item.code));
  }

  return DEBRIEF_COPY.status(PATIENT_STATUS_LABELS[item.code]);
}
