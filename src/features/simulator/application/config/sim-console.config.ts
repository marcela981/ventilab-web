/*
* Funcionalidad: Simulator console config
* Descripción: Static configuration of the running simulation console (T6). Maps every generic console parameter id
*   to its engine setting key with the display scale, unit and step (min/max always come from the vendored
*   VENTILATOR_LIMITS, never from here; FiO2 is shown in % with scale 100), the Spanish labels of the engine alarm
*   codes, target ids, modes and patient sex, the event queue timings (flush every 3 s, exponential backoff 1 s → 30 s,
*   at most 50 events per request), the UI refresh throttle and the sessionStorage key prefix. Depends on the
*   ventilator console and sim-engine public types. v1.1: the acknowledgement wait on end (2 s). v1.2: the outbox
*   sessionStorage prefix and the pending-events warning threshold.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { AlarmCode, EngineVentilationMode, NumericSettingKey, PatientSex, TargetId } from "@shared/sim-engine";
import type { ConsoleParameterId } from "@shared/ventilator-console";

export type ParameterSetting = {
  /** Engine setting the console parameter edits. */
  key: NumericSettingKey
  /** Display value = engine value × scale (FiO2 fraction → %). */
  scale: number
  /** Step of the control in display units (a UI choice; the bounds come from the vendored limits). */
  step: number
  /** Display unit in Spanish. */
  unit: string
};

export const PARAMETER_SETTINGS: Readonly<Record<ConsoleParameterId, ParameterSetting>> = {
  tidalVolume: { key: "tidalVolumeMl", scale: 1, step: 10, unit: "mL" },
  inspiratoryPressure: { key: "inspiratoryPressureCmH2O", scale: 1, step: 1, unit: "cmH2O" },
  pressureSupport: { key: "pressureSupportCmH2O", scale: 1, step: 1, unit: "cmH2O" },
  respiratoryRate: { key: "respiratoryRateBpm", scale: 1, step: 1, unit: "rpm" },
  peep: { key: "peepCmH2O", scale: 1, step: 1, unit: "cmH2O" },
  fio2: { key: "fio2", scale: 100, step: 1, unit: "%" },
  inspiratoryTime: { key: "inspiratoryTimeS", scale: 1, step: 0.1, unit: "s" },
  inspiratoryPause: { key: "inspiratoryPauseS", scale: 1, step: 0.1, unit: "s" },
  flowTrigger: { key: "flowTriggerLpm", scale: 1, step: 0.5, unit: "L/min" },
  pressureTrigger: { key: "pressureTriggerCmH2O", scale: 1, step: 0.5, unit: "cmH2O" },
  cycleOff: { key: "cycleOffPercent", scale: 1, step: 5, unit: "%" },
  apneaTime: { key: "apneaTimeS", scale: 1, step: 5, unit: "s" },
};

// TODO(i18n): move the labels to a simulator namespace in src/i18n.
export const MODE_LABELS = {
  VCV: "VCV — Volumen control",
  PCV: "PCV — Presión control",
  PSV: "PSV — Presión de soporte",
  CPAP: "CPAP",
  SIMV: "SIMV",
} as const satisfies Record<EngineVentilationMode, string>;

export const ALARM_LABELS = {
  HIGH_PRESSURE: "Presión alta",
  LOW_TIDAL_VOLUME: "Volumen corriente bajo",
  HIGH_TIDAL_VOLUME: "Volumen corriente alto",
  APNEA: "Apnea",
  HIGH_RESPIRATORY_RATE: "Frecuencia respiratoria alta",
  AUTO_PEEP: "Auto-PEEP",
  DISCONNECTION: "Desconexión",
} as const satisfies Record<AlarmCode, string>;

export type ObjectiveDefinition = { label: string, unit: string, decimals: number };

export const OBJECTIVE_DEFINITIONS = {
  SPO2: { label: "SpO2", unit: "%", decimals: 0 },
  PACO2: { label: "PaCO2", unit: "mmHg", decimals: 0 },
  PH: { label: "pH", unit: "", decimals: 2 },
  PLATEAU_PRESSURE: { label: "Presión meseta", unit: "cmH2O", decimals: 0 },
  DRIVING_PRESSURE: { label: "Presión de distensión", unit: "cmH2O", decimals: 0 },
  TIDAL_VOLUME_PER_KG_PBW: { label: "Vt por kg de peso predicho", unit: "mL/kg", decimals: 1 },
  AUTO_PEEP: { label: "Auto-PEEP", unit: "cmH2O", decimals: 1 },
} as const satisfies Record<TargetId, ObjectiveDefinition>;

export const SEX_LABELS = { MALE: "Masculino", FEMALE: "Femenino" } as const satisfies Record<PatientSex, string>;

/** Events are sent in batches every ~3 s (and on end, deadline and page hide). */
export const EVENT_FLUSH_INTERVAL_MS = 3000;
/** Exponential backoff for network, 429 and 5xx failures: 1 s, 2 s, 4 s … capped at 30 s. */
export const EVENT_RETRY_BASE_MS = 1000;
export const EVENT_RETRY_MAX_MS = 30_000;
/** Attempts of an explicit flush (end, deadline) before it reports the failure; the events stay queued. */
export const EVENT_FLUSH_ATTEMPTS = 4;
/** Client cap per request; the backend limit is a server setting not exposed in the contract. */
export const EVENT_MAX_BATCH_SIZE = 50;

/** Metrics, alarms and the clock refresh React state at most this often (curves never go through React). */
export const UI_REFRESH_INTERVAL_MS = 250;
/** Longest wait, on end, for the worker to acknowledge the changes it was sent (a batch arrives every ~33 ms). */
export const EVENT_ACK_TIMEOUT_MS = 2000;

export const SESSION_STORAGE_PREFIX = "ventylab.simulator.session.";
/** sessionStorage mirror of the events the server has not acknowledged yet (resent after a reload). */
export const EVENT_OUTBOX_STORAGE_PREFIX = "ventylab.simulator.outbox.";
/** Above this many unsent events the console warns that the connection may be failing (events are never dropped). */
export const EVENT_PENDING_WARNING_COUNT = 50;
