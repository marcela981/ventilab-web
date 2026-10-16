/*
* Funcionalidad: Ventilator console contract
* Descripción: Types of the generic ventilator console adapter (the props model a consumer builds from a simulator worker, a replay or a real ventilator): a frame source that streams batches of pressure/flow/volume samples, the current and applied settings, the ventilation mode, the numeric monitoring metrics keyed by console metric id, the patient vitals with a short trend, the active alarms with priority, the control permission, the parameter limits injected by the consumer and the change callbacks (propose, confirm, cancel; used by the controls in T4). The console never hardcodes limits or knows the data origin. Depends only on the console config ids.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { ConsoleMetricId, PatientVitalId } from "./config/console.config";

/** One waveform sample: time in ms, pressure in cmH2O, flow in L/min, volume in mL. */
export type ConsoleSample = {
  tMs: number
  pressure: number
  flow: number
  volume: number
};

export type ConsoleSampleBatch = { samples: readonly ConsoleSample[] };

export type ConsoleFrameListener = (batch: ConsoleSampleBatch) => void;

/** Push stream of waveform batches. The returned function unsubscribes. */
export type ConsoleFrameSource = {
  subscribe: (listener: ConsoleFrameListener) => () => void
};

/** Parameter values keyed by the consumer's parameter id (e.g. `peep`), in the units of `limits`. */
export type ConsoleSettingValues = Readonly<Record<string, number>>;

export type ConsoleSettings = {
  /** What the operator sees, including a pending (unconfirmed) change. */
  current: ConsoleSettingValues
  /** What the ventilator is running. */
  applied: ConsoleSettingValues
};

export type ConsoleModeOption = { id: string, label: string };

export type ConsoleMode = {
  current: string
  options: readonly ConsoleModeOption[]
};

/** Metric values in the console config units; `null` or a missing key renders "—". */
export type ConsoleMetrics = Readonly<Partial<Record<ConsoleMetricId, number | null>>>;

export type ConsolePatient = {
  /** Only the vitals present here are shown. */
  values: Readonly<Partial<Record<PatientVitalId, number | null>>>
  /** Recent values, oldest first, for the sparkline. */
  trends?: Readonly<Partial<Record<PatientVitalId, readonly number[]>>>
};

export type ConsoleAlarmPriority = "high" | "medium" | "low";

export type ConsoleAlarm = {
  id: string
  type: string
  priority: ConsoleAlarmPriority
  message: string
  /** Time the alarm became active, in the source's clock (ms). */
  since: number
};

export type ConsolePermissions = {
  /** false: read-only console (replay, observer, exam review). */
  canControl: boolean
};

export type ParameterLimit = {
  min: number
  max: number
  step: number
  unit: string
};

export type ConsoleLimits = Readonly<Record<string, ParameterLimit>>;

export type ConsoleParameterChange = {
  parameter: string
  value: number
};

export type VentilatorConsoleAdapter = {
  frames: ConsoleFrameSource
  settings: ConsoleSettings
  mode: ConsoleMode
  metrics: ConsoleMetrics
  patient: ConsolePatient
  alarms: readonly ConsoleAlarm[]
  permissions: ConsolePermissions
  limits: ConsoleLimits
  onProposeChange: (change: ConsoleParameterChange) => void
  onConfirm: () => void
  onCancel: () => void
};
