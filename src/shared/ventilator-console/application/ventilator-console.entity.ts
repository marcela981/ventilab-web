/*
* Funcionalidad: Ventilator console contract
* Descripción: Types of the generic ventilator console adapter (the props model a consumer builds from a simulator worker, a replay or a real ventilator): a frame source that streams batches of pressure/flow/volume samples, the current and applied settings, the ventilation mode, the numeric monitoring metrics keyed by console metric id, the patient vitals with a short trend, the active alarms with priority, the control permission, the parameter limits injected by the consumer, the change callbacks (optional propose while pending, confirm with the mode + parameter diff, optional cancel), the optional alarm limits with their change callback, an optional adapter-provided alarm history and the optional capabilities (maneuvers). The console never hardcodes limits or knows the data origin. Depends only on the console config ids. v1.2: the frame source declares an optional `sourceId` (resubscribe/clear only when it changes) and `sampleRateHz` (ring capacity), sample times are monotonic non-decreasing per source, and the adapter may provide normal `ranges` that take precedence over the console range props. v1.3: optional `onPendingChange(pending)` reports whether the built-in controls hold unconfirmed edits. v1.4 (generic source state, all optional): the frame source may report `status` (`live` | `no-data`) with a `statusMessage` (no data → curves greyed under an overlay and controls disabled); `settings.inFlight` marks confirmed parameter changes the source has not applied yet (`sending` | `awaiting` | `rejected`, the displayed value stays the applied one); `permissions.readOnlyReason` explains a read-only console; a metric value may be `{ value, derived, label?, description? }` to mark it as computed from the curves and, when the source measures something narrower than the console metric (e.g. end-expiratory pressure without a hold for "PEEP total"), to relabel its tile; `capabilities.patientMonitor: false` hides the patient monitor zone. v1.5 (generic, optional): `permissions.pendingResetKey` lets the source drop the unconfirmed edits of the built-in controls.
* Versión: 1.5
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { ConsoleMetricId, NormalRange, PatientVitalId } from "./config/console.config";

/**
 * One waveform sample: time in ms, pressure in cmH2O, flow in L/min, volume in mL. `tMs` is monotonic non-decreasing
 * per source; a time that goes backwards is treated as a clock reset (the console clears the curves and starts over).
 */
export type ConsoleSample = {
  tMs: number
  pressure: number
  flow: number
  volume: number
};

export type ConsoleSampleBatch = { samples: readonly ConsoleSample[] };

export type ConsoleFrameListener = (batch: ConsoleSampleBatch) => void;

/**
 * Push stream of waveform batches. The returned function unsubscribes. Sample times are monotonic non-decreasing per
 * source. The console subscribes once per data source: it resubscribes (and clears the curves) only when `sourceId`
 * changes or, without `sourceId`, when the `subscribe` function identity changes. Keep the source stable per data
 * origin (or give it a `sourceId`); rebuilding the adapter object every render then keeps the curves.
 */
export type ConsoleFrameSource = {
  subscribe: (listener: ConsoleFrameListener) => () => void
  /** Identity of the data source (e.g. the session or replay id); a new value clears the curves and resubscribes. */
  sourceId?: string
  /** Samples per second of the stream (default 50); sizes the curve ring as twice the largest window. */
  sampleRateHz?: number
  /**
   * Whether the source is delivering data (default `live`). With `no-data` the console keeps the last curves greyed
   * under an overlay with `statusMessage` and disables the controls until the source is live again.
   */
  status?: ConsoleFrameStatus
  /** Overlay text while `status` is `no-data` (the console has a generic default). */
  statusMessage?: string
};

export type ConsoleFrameStatus = "live" | "no-data";

/** Normal-range overrides keyed by value id; `null` disables the out-of-range highlight for that value. */
export type ConsoleRangeOverrides<K extends string> = Readonly<Partial<Record<K, NormalRange | null>>>;

/** Source-provided normal ranges (e.g. per clinical case); they take precedence over the console range props. */
export type ConsoleRanges = {
  metrics?: ConsoleRangeOverrides<ConsoleMetricId>
  patient?: ConsoleRangeOverrides<PatientVitalId>
};

/** Parameter values keyed by the consumer's parameter id (e.g. `peep`), in the units of `limits`. */
export type ConsoleSettingValues = Readonly<Record<string, number>>;

/**
 * A confirmed parameter change the source has not applied yet: `sending` (on its way), `awaiting` (sent, waiting for the
 * source to report it applied) or `rejected` (with an optional reason). The console keeps showing the applied value.
 */
export type ConsoleInFlightStatus = "sending" | "awaiting" | "rejected";

export type ConsoleInFlight = { status: ConsoleInFlightStatus, message?: string };

export type ConsoleSettings = {
  /** What the operator sees, including a pending (unconfirmed) change. */
  current: ConsoleSettingValues
  /** What the ventilator is running. A parameter missing here and in `current` shows "—". */
  applied: ConsoleSettingValues
  /** Confirmed changes in flight per parameter id; while `sending`/`awaiting` the parameter cannot be edited again. */
  inFlight?: Readonly<Partial<Record<string, ConsoleInFlight>>>
};

export type ConsoleModeOption = { id: string, label: string };

export type ConsoleMode = {
  current: string
  options: readonly ConsoleModeOption[]
};

/**
 * A metric value with its provenance: `derived` marks a value computed from the curves (shown as "derivada"); `label`
 * and `description` replace the console names when the source measures something narrower than the console metric.
 */
export type ConsoleMetricReading = { value: number | null, derived?: boolean, label?: string, description?: string };

export type ConsoleMetricValue = number | null | ConsoleMetricReading;

/** Metric values in the console config units; `null` or a missing key renders "—". */
export type ConsoleMetrics = Readonly<Partial<Record<ConsoleMetricId, ConsoleMetricValue>>>;

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
  /** Why the console is read-only; shown next to the badge and describing the disabled controls. */
  readOnlyReason?: string
  /**
   * Optional (v1.5): when this value changes, the built-in controls drop their unconfirmed edits (e.g. the control of
   * the source was taken away from the user); unchanged or omitted, edits are kept as before.
   */
  pendingResetKey?: string | number
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

/** What CONFIRMAR (or "Aplicar" in configure mode) emits: the pending mode (`null` = unchanged) and the changed parameters. */
export type ConsoleConfirmation = {
  mode: string | null
  changes: readonly ConsoleParameterChange[]
};

export type ConsoleAlarmEventKind = "onset" | "clear";

/** One entry of the session alarm history; `atMs` is in the console clock (wall ms) unless the adapter provides the history. */
export type ConsoleAlarmEvent = {
  id: string
  alarmId: string
  type: string
  priority: ConsoleAlarmPriority
  message: string
  kind: ConsoleAlarmEventKind
  atMs: number
};

/** One adjustable alarm threshold, with its own bounds supplied by the consumer. */
export type ConsoleAlarmLimit = ParameterLimit & {
  id: string
  label: string
  value: number
};

export type ConsoleAlarmLimitChange = { id: string, value: number };

export type ConsoleCapabilities = {
  /**
   * The source supports hold maneuvers (inspiratory/expiratory pause). Only then does the console render its optional
   * `maneuversSlot`. The simulation engine has none, so the simulator adapter leaves it unset and no hold buttons appear.
   */
  maneuvers?: boolean
  /** `false`: the source has no patient monitor and the zone is hidden (no empty notice). Default true. */
  patientMonitor?: boolean
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
  /** Optional preview of a pending (unconfirmed) value; never a change to apply. */
  onProposeChange?: (change: ConsoleParameterChange) => void
  /** The only callback that applies a change; called once per CONFIRMAR. */
  onConfirm: (confirmation: ConsoleConfirmation) => void
  onCancel?: () => void
  /** Whether the built-in controls hold unconfirmed edits (reported on change, false on unmount). */
  onPendingChange?: (pending: boolean) => void
  /** Without limits the alarm limits panel is hidden; without the callback it is read-only. */
  alarmLimits?: readonly ConsoleAlarmLimit[]
  onAlarmLimitsChange?: (changes: readonly ConsoleAlarmLimitChange[]) => void
  /** When provided it replaces the history the console derives from the alarm updates. */
  alarmHistory?: readonly ConsoleAlarmEvent[]
  capabilities?: ConsoleCapabilities
  /** Normal ranges from the source; per key they override the console range props, which override the config defaults. */
  ranges?: ConsoleRanges
};


/** The number of a metric value (plain or with provenance). */
export function metricNumber(value: ConsoleMetricValue | undefined): number | null | undefined {
  return value !== null && typeof value === "object" ? value.value : value;
}

/** Whether a metric value is marked as derived from the curves. */
export function isDerivedMetric(value: ConsoleMetricValue | undefined): boolean {
  return value !== null && typeof value === "object" && value.derived === true;
}
