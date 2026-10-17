/*
* Funcionalidad: Device-reported settings and state
* Descripción: What the real ventilator reports in its telemetry frames, the only source of the console settings
*   (decision 4: no latest-settings endpoint, never optimistic or client-filled values). The device reports its
*   settings under the command parameter names (`docs/ventilator/commands.md`: a frame whose `settings` report the
*   command parameters under the same name resolves the command), mapped to the console parameter ids with the same
*   meaning: tidalVolume (mL), respiratoryRate (rpm), peep (cmH2O), fio2 (fraction 0.21–1 → console %), inspiratoryTime
*   (s) and sensitivity (validated with the flow-trigger range → flowTrigger, L/min). pressureLimit (absolute
*   pressure, while the console inspiratory pressure is above PEEP), ieRatio and flowRate have no console parameter with
*   that meaning and are not shown, like any unknown key or non-finite value. The reported state keeps, per field, the
*   latest frame that carries it: the whole settings object (a key the device stops reporting disappears), the mode, SpO2,
*   PCO2 and the frame alarm codes; the previous state object is returned only when no frame carries any of those
*   fields (a frame that repeats the same values still yields a new object). v1.1: the frame alarm codes expire
*   FRAME_ALARMS_TTL_MS (server time of the frames) after the last frame that carried an `alarms` field, so codes do not
*   latch when the firmware stops sending the field; the setting map is read with own-key lookups only. Pure.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { VentilatorTelemetryFrame } from "@shared/realtime";
import type { ConsoleModeOption, ConsoleParameterId, ConsoleSettingValues } from "@shared/ventilator-console";

/** The frame alarm codes are dropped this long after the last frame that carried an `alarms` field. */
export const FRAME_ALARMS_TTL_MS = 5000;

/** Device setting key → console parameter id and display scale. */
export const REPORTED_SETTING_KEYS: Readonly<Record<string, { parameter: ConsoleParameterId, scale: number }>> = {
  tidalVolume: { parameter: "tidalVolume", scale: 1 },
  respiratoryRate: { parameter: "respiratoryRate", scale: 1 },
  peep: { parameter: "peep", scale: 1 },
  fio2: { parameter: "fio2", scale: 100 },
  inspiratoryTime: { parameter: "inspiratoryTime", scale: 1 },
  sensitivity: { parameter: "flowTrigger", scale: 1 },
};

// TODO(i18n): move to a ventilator-lab namespace in src/i18n.
/** The modes the backend accepts for the physical ventilator (`SendVentilatorCommandRequestDTO.mode`). */
export const REAL_MODE_OPTIONS: readonly ConsoleModeOption[] = [
  { id: "VCV", label: "VCV — Volumen control" },
  { id: "PCV", label: "PCV — Presión control" },
  { id: "SIMV", label: "SIMV" },
  { id: "PSV", label: "PSV — Presión de soporte" },
];

/** Shown as the mode while the device has not reported one. */
export const UNKNOWN_MODE = "—";

export type ReportedState = {
  settings: ConsoleSettingValues | null
  mode: string | null
  spo2: number | null
  pco2: number | null
  frameAlarms: readonly string[] | null
  /** Server time of the last frame that carried `alarms`. */
  frameAlarmsAt: number | null
};

export const EMPTY_REPORTED_STATE: ReportedState = {
  settings: null,
  mode: null,
  spo2: null,
  pco2: null,
  frameAlarms: null,
  frameAlarmsAt: null,
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function toConsoleSettingValues(settings: Readonly<Record<string, number>>): ConsoleSettingValues {
  const values: Record<string, number> = {};

  Object.entries(settings).forEach(([key, value]) => {
    const target = Object.prototype.hasOwnProperty.call(REPORTED_SETTING_KEYS, key) ? REPORTED_SETTING_KEYS[key] : undefined;

    if (target && isFiniteNumber(value)) {
      // Rounded to 6 decimals so 0.4 × 100 is 40, not 40.000000000000004.
      values[target.parameter] = Number((value * target.scale).toFixed(6));
    }
  });

  return values;
}

export function reduceReportedState(previous: ReportedState, frames: readonly VentilatorTelemetryFrame[]): ReportedState {
  let next = previous;
  const update = (patch: Partial<ReportedState>) => {
    next = { ...next, ...patch };
  };

  for (const frame of frames) {
    if (frame.settings !== null && typeof frame.settings === "object") {
      update({ settings: toConsoleSettingValues(frame.settings) });
    }

    if (typeof frame.mode === "string" && frame.mode.length > 0) {
      update({ mode: frame.mode });
    }

    if (isFiniteNumber(frame.spo2)) {
      update({ spo2: frame.spo2 });
    }

    if (isFiniteNumber(frame.pco2)) {
      update({ pco2: frame.pco2 });
    }

    if (Array.isArray(frame.alarms)) {
      update({ frameAlarms: frame.alarms.filter((code): code is string => typeof code === "string"), frameAlarmsAt: frame.serverTs });
    }
  }

  const latest = frames[frames.length - 1];

  if (latest !== undefined && next.frameAlarmsAt !== null && latest.serverTs - next.frameAlarmsAt > FRAME_ALARMS_TTL_MS) {
    update({ frameAlarms: null, frameAlarmsAt: null });
  }

  return next;
}
