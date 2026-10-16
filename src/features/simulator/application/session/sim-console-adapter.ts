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
*   v1.3 (T12): the engine output mapping (samples, metrics, vitals, trends, alarms, target ranges) moved there too
*   and is re-exported here unchanged, for the case editor local preview.
* Versión: 1.3
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
import type {
  EngineCase,
  EngineTargets,
  NumericRange,
  SimBatch,
  TargetStatus,
  TargetStatusValue,
  VentilatorSettings,
} from "@shared/sim-engine";
import { CONSOLE_PARAMETER_IDS, CONSOLE_PARAMETERS } from "@shared/ventilator-console";
import { OBJECTIVE_DEFINITIONS, PARAMETER_SETTINGS, SEX_LABELS } from "../config/sim-console.config";
import type { ClientSessionEvent } from "../entities/sim-session.entity";

// Moved unchanged to the shared engine ↔ console binding (the case editor local preview uses the same mapping).
export {
  appendTrends,
  rangesFromTargets,
  toConsoleAlarms,
  toConsoleMetrics,
  toConsoleSamples,
  toPatientValues,
} from "@shared/sim-engine/console-binding";
export type { PatientTrends, PatientValues } from "@shared/sim-engine/console-binding";

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
