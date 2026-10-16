/*
* Funcionalidad: Simulation → console adapter mapping
* Descripción: Pure functions that translate the worker output and the session case into the generic ventilator
*   console contract: waveform samples ({tMs, pressure, flow, volume}), the 12 console metrics from the engine cycle
*   metrics and ventilation summary (FiO2 from the applied settings), the patient vitals and their trends, the alarms
*   (priority from the engine severity, then the console default map; onset time kept while active), the applied
*   settings in console units, the parameter limits from the vendored VENTILATOR_LIMITS (the only source of min/max;
*   only the trigger in use gets a limit), the SIMV applicability when its mandatory breaths are pressure controlled,
*   the normal ranges from the case targets, the confirmed console changes as engine setting changes plus their local
*   validation (the same merge + validateVentilatorSettings the engine and the backend run), the live objectives and
*   the patient summary with the predicted body weight (engine predictedBodyWeightKg, Devine). Depends on the
*   sim-engine and ventilator-console public APIs and the console config. v1.1: `reconcileEvents` turns the worker
*   acknowledgements of a batch into client session events stamped with the effective engine time, and drops the
*   rejected ones. v1.2 (T11): the settings ↔ console mapping (settings, limits, mode options, SIMV applicability,
*   confirmation → changes) moved to `@shared/sim-engine/console-binding` and is re-exported here unchanged.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import {
  EngineValidationError,
  predictedBodyWeightKg,
  resolveVentilatorSettings,
  validateVentilatorSettings,
} from "@shared/sim-engine";
import { tidy } from "@shared/sim-engine/console-binding";
import type {
  Alarm,
  EngineCase,
  EngineMetrics,
  EngineTargets,
  NumericRange,
  SimBatch,
  TargetStatus,
  TargetStatusValue,
  VentilatorSettings,
  WaveformSample,
} from "@shared/sim-engine";
import {
  CONSOLE_PARAMETER_IDS,
  CONSOLE_PARAMETERS,
  PATIENT_TREND_POINTS,
  resolveAlarmPriority,
} from "@shared/ventilator-console";
import type {
  ConsoleAlarm,
  ConsoleAlarmPriority,
  ConsoleMetrics,
  ConsolePatient,
  ConsoleRanges,
  ConsoleSample,
  NormalRange,
  PatientVitalId,
} from "@shared/ventilator-console";
import { ALARM_LABELS, OBJECTIVE_DEFINITIONS, PARAMETER_SETTINGS, SEX_LABELS } from "../config/sim-console.config";
import type { ClientSessionEvent } from "../entities/sim-session.entity";

export function toConsoleSamples(samples: readonly WaveformSample[]): ConsoleSample[] {
  return samples.map((sample) => ({
    tMs: sample.simTimeMs,
    pressure: sample.pressureCmH2O,
    flow: sample.flowLpm,
    volume: sample.volumeMl,
  }));
}

export function toConsoleMetrics(metrics: EngineMetrics | null, settings: VentilatorSettings): ConsoleMetrics {
  const cycle = metrics?.lastCycle ?? null;

  return {
    peakPressure: cycle?.peakPressureCmH2O ?? null,
    plateauPressure: cycle?.plateauPressureCmH2O ?? null,
    totalPeep: cycle?.totalPeepCmH2O ?? null,
    autoPeep: cycle?.autoPeepCmH2O ?? null,
    drivingPressure: cycle?.drivingPressureCmH2O ?? null,
    exhaledTidalVolume: cycle?.exhaledTidalVolumeMl ?? null,
    tidalVolumePerKg: cycle?.tidalVolumePerKgPbw ?? null,
    minuteVolume: metrics?.ventilation.minuteVolumeLpm ?? null,
    totalRespiratoryRate: metrics?.ventilation.totalRespiratoryRateBpm ?? null,
    // The engine reports Ti/Te, which the console shows as 1:x.
    ieRatio: cycle && cycle.ieRatio > 0 ? cycle.ieRatio : null,
    fio2: tidy(settings.fio2 * 100),
    mechanicalPower: cycle?.mechanicalPowerJPerMin ?? null,
  };
}

export type PatientValues = ConsolePatient["values"];

export function toPatientValues(metrics: EngineMetrics | null): PatientValues {
  if (metrics === null) {
    return {};
  }

  return {
    spo2: metrics.gasExchange.spo2Percent,
    pao2: metrics.gasExchange.pao2MmHg,
    paco2: metrics.gasExchange.paco2MmHg,
    ph: metrics.gasExchange.ph,
    map: metrics.hemodynamics.meanArterialPressureMmHg,
  };
}

export type PatientTrends = Readonly<Partial<Record<PatientVitalId, readonly number[]>>>;

/** Appends the new vitals to their trends, keeping the newest PATIENT_TREND_POINTS values. */
export function appendTrends(trends: PatientTrends, values: PatientValues, maxPoints: number = PATIENT_TREND_POINTS): PatientTrends {
  const next: Partial<Record<PatientVitalId, readonly number[]>> = { ...trends };

  (Object.keys(values) as PatientVitalId[]).forEach((id) => {
    const value = values[id];

    if (typeof value === "number" && Number.isFinite(value)) {
      next[id] = [...(trends[id] ?? []), value].slice(-maxPoints);
    }
  });

  return next;
}

function priorityOf(alarm: Alarm): ConsoleAlarmPriority {
  if (alarm.severity === "HIGH") {
    return "high";
  }

  return alarm.severity === "MEDIUM" ? "medium" : resolveAlarmPriority(alarm.code);
}

function formatAlarmNumber(value: number): string {
  return Number.isFinite(value) ? String(Math.round(value * 10) / 10) : "—";
}

/** Engine alarms as console alarms; an alarm still active keeps its onset time (simulated ms). */
export function toConsoleAlarms(alarms: readonly Alarm[], simTimeMs: number, previous: readonly ConsoleAlarm[] = []): ConsoleAlarm[] {
  const since = new Map(previous.map((alarm) => [alarm.id, alarm.since]));

  return alarms.map((alarm) => ({
    id: alarm.code,
    type: alarm.code,
    priority: priorityOf(alarm),
    message: `${ALARM_LABELS[alarm.code] ?? alarm.code}: ${formatAlarmNumber(alarm.value)} (límite ${formatAlarmNumber(alarm.threshold)})`,
    since: since.get(alarm.code) ?? simTimeMs,
  }));
}

// Moved unchanged to the shared engine ↔ console binding (the case editor uses the same controls).
export {
  applicabilityFor,
  buildConsoleLimits,
  MODE_OPTIONS,
  toConsoleSettings,
  toSettingsChanges,
} from "@shared/sim-engine/console-binding";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const CHANGE_COPY = {
  timing: "No se aplicó el cambio: con esa combinación el tiempo espiratorio queda demasiado corto. Ajusta Ti, la pausa o la FR.",
  outOfRange: (label: string) => `No se aplicó el cambio: ${label} queda fuera de los límites del ventilador con la combinación elegida.`,
  invalid: "No se aplicó el cambio: la combinación de parámetros no es válida.",
} as const;

function labelOfSetting(field: string): string {
  const id = CONSOLE_PARAMETER_IDS.find((parameter) => PARAMETER_SETTINGS[parameter].key === field);

  return id ? CONSOLE_PARAMETERS[id].description : field;
}

export type ChangeValidation = { ok: true } | { ok: false, message: string };

/** The engine and the backend merge the changes into the applied settings and validate the result; so does the client. */
export function validateSettingsChange(applied: VentilatorSettings, changes: Partial<VentilatorSettings>): ChangeValidation {
  try {
    validateVentilatorSettings(resolveVentilatorSettings({ ...applied, ...changes }));

    return { ok: true };
  } catch (error) {
    if (error instanceof EngineValidationError) {
      if (error.code === "INVALID_TIMING") {
        return { ok: false, message: CHANGE_COPY.timing };
      }

      if (error.code === "OUT_OF_RANGE") {
        return { ok: false, message: CHANGE_COPY.outOfRange(labelOfSetting(error.field)) };
      }
    }

    return { ok: false, message: CHANGE_COPY.invalid };
  }
}

function fromRange(range: NumericRange | undefined): NormalRange | undefined {
  return range ? { min: range.min, max: range.max } : undefined;
}

function fromMax(max: number | undefined): NormalRange | undefined {
  return max === undefined ? undefined : { max };
}

function compact<K extends string>(entries: Readonly<Record<K, NormalRange | undefined>>): Partial<Record<K, NormalRange>> {
  const result: Partial<Record<K, NormalRange>> = {};

  (Object.keys(entries) as K[]).forEach((key) => {
    const value = entries[key];

    if (value) {
      result[key] = value;
    }
  });

  return result;
}

/** The case targets as console normal ranges; they override the console teaching defaults per key. */
export function rangesFromTargets(targets: EngineTargets): ConsoleRanges {
  return {
    metrics: compact({
      plateauPressure: fromMax(targets.plateauPressureMaxCmH2O),
      drivingPressure: fromMax(targets.drivingPressureMaxCmH2O),
      tidalVolumePerKg: fromRange(targets.tidalVolumePerKgPbw),
      autoPeep: fromMax(targets.autoPeepMaxCmH2O),
    }),
    patient: compact({
      spo2: fromRange(targets.spo2Percent),
      paco2: fromRange(targets.paco2MmHg),
      ph: fromRange(targets.ph),
    }),
  };
}

export type ObjectiveRow = {
  id: TargetStatus["id"]
  label: string
  /** Target as text, e.g. "88–95 %" or "≤ 30 cmH2O". */
  target: string
  value: string
  status: TargetStatusValue
};

function formatNumber(value: number, decimals: number): string {
  return value.toFixed(decimals);
}

function targetText(status: Pick<TargetStatus, "min" | "max">, decimals: number, unit: string): string {
  const suffix = unit ? ` ${unit}` : "";

  if (status.min !== null && status.max !== null) {
    return `${formatNumber(status.min, decimals)}–${formatNumber(status.max, decimals)}${suffix}`;
  }

  return status.max === null ? "—" : `≤ ${formatNumber(status.max, decimals)}${suffix}`;
}

function caseTargetStatuses(targets: EngineTargets): TargetStatus[] {
  const rows: TargetStatus[] = [];
  const range = (id: TargetStatus["id"], value: NumericRange | undefined) => {
    if (value) {
      rows.push({ id, status: "UNKNOWN", value: null, min: value.min, max: value.max });
    }
  };
  const max = (id: TargetStatus["id"], value: number | undefined) => {
    if (value !== undefined) {
      rows.push({ id, status: "UNKNOWN", value: null, min: null, max: value });
    }
  };

  range("SPO2", targets.spo2Percent);
  range("PACO2", targets.paco2MmHg);
  range("PH", targets.ph);
  max("PLATEAU_PRESSURE", targets.plateauPressureMaxCmH2O);
  max("DRIVING_PRESSURE", targets.drivingPressureMaxCmH2O);
  range("TIDAL_VOLUME_PER_KG_PBW", targets.tidalVolumePerKgPbw);
  max("AUTO_PEEP", targets.autoPeepMaxCmH2O);

  return rows;
}

/**
 * Live objectives: the engine evaluates the case targets in the worker on every metrics snapshot; before the first
 * snapshot every target is listed as unknown. This is a local, real-time reading — never a grade.
 */
export function buildObjectives(targets: EngineTargets, statuses: readonly TargetStatus[] | null): ObjectiveRow[] {
  const source = statuses && statuses.length > 0 ? statuses : caseTargetStatuses(targets);

  return source.map((status) => {
    const definition = OBJECTIVE_DEFINITIONS[status.id];

    return {
      id: status.id,
      label: definition.label,
      target: targetText(status, definition.decimals, definition.unit),
      value: status.value === null ? "—" : `${formatNumber(status.value, definition.decimals)}${definition.unit ? ` ${definition.unit}` : ""}`,
      status: status.status,
    };
  });
}

export type PatientSummary = {
  sexLabel: string
  heightCm: number
  /** Predicted body weight (Devine), kg with one decimal. */
  predictedBodyWeightKg: number
};

export function patientSummary(engineCase: EngineCase): PatientSummary {
  const { sex, heightCm } = engineCase.patient;

  return {
    sexLabel: SEX_LABELS[sex],
    heightCm,
    predictedBodyWeightKg: Math.round(predictedBodyWeightKg(sex, heightCm) * 10) / 10,
  };
}

/** Settings the session starts with: the case initial settings over the engine defaults. */
export function initialSettingsOf(engineCase: EngineCase): VentilatorSettings {
  return resolveVentilatorSettings(engineCase.initialSettings);
}

export function applyChanges(settings: VentilatorSettings, events: readonly { changes: Partial<VentilatorSettings> }[]): VentilatorSettings {
  return events.reduce<VentilatorSettings>((current, event) => ({ ...current, ...event.changes }), settings);
}

/** A confirmed console change sent to the worker and still waiting for its acknowledgement. */
export type PendingSettingsEvent = { id: string, changes: Partial<VentilatorSettings> };

export type EventReconciliation = {
  /** Acknowledged events, stamped with the time the engine really applied them, ready for the backend queue. */
  confirmed: ClientSessionEvent[]
  /** Ids the engine rejected: surfaced as an error and never sent to the backend. */
  rejectedIds: string[]
  /** Events still waiting for an acknowledgement, in send order. */
  pending: PendingSettingsEvent[]
};

/**
 * Matches the worker acknowledgements of one batch with the pending events: a confirmed event becomes a client
 * session event with its effective simTimeMs (so the server replay applies it exactly when the local run did); a
 * rejected one is dropped. Acknowledgements for unknown ids are ignored.
 */
export function reconcileEvents(
  pending: readonly PendingSettingsEvent[],
  batch: Pick<SimBatch, "confirmedEvents" | "rejectedEvents">,
): EventReconciliation {
  const byId = new Map(pending.map((event) => [event.id, event]));
  const confirmed: ClientSessionEvent[] = [];
  const rejectedIds: string[] = [];

  batch.confirmedEvents.forEach(({ id, effectiveSimTimeMs }) => {
    const event = byId.get(id);

    if (event) {
      confirmed.push({ id, simTimeMs: effectiveSimTimeMs, type: "PARAM_CHANGE", payload: { changes: event.changes } });
      byId.delete(id);
    }
  });
  batch.rejectedEvents.forEach(({ event: input }) => {
    if (input.id !== undefined && byId.delete(input.id)) {
      rejectedIds.push(input.id);
    }
  });

  return { confirmed, rejectedIds, pending: pending.filter((event) => byId.has(event.id)) };
}
