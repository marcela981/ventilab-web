/*
* Funcionalidad: Shared sim-engine public API
* Descripción: Barrel of the shared simulation engine module. Exposes the vendored engine types, ENGINE_VERSION,
*   errors, ventilator limits and modes, alarm defaults, replay and the PBW / mechanical power helpers, plus the
*   runtime: the fixed-step simulation loop, the worker protocol and the SSR-safe worker factory. Features consume
*   this barrel only; src/shared/ventilator-console must not import it. v1.1: exports the event confirmation type.
*   v1.2 (T8): the replay request types, MAX_PLAYBACK_RATE and requestWorkerReplay (engine replay in the worker).
*   v1.3 (T11): the vendored clinical case physiological ranges (the backend 422 bounds the case editor shows). The
*   engine settings ↔ console binding is a separate deep entry (`@shared/sim-engine/console-binding`).
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export type * from "./engine/engine.types";
export { EngineValidationError, type EngineErrorCode } from "./engine/engine.errors";
export { ENGINE_VERSION } from "./engine/engine-version";
export {
  DEFAULT_VENTILATOR_SETTINGS,
  FLOW_PATTERNS,
  MANDATORY_BREATH_TYPES,
  MAX_AIRWAY_PRESSURE_SETTING_CMH2O,
  MAX_PEAK_INSPIRATORY_FLOW_LPM,
  MIN_EXPIRATORY_TIME_S,
  TRIGGER_TYPES,
  VENTILATION_MODES,
  VENTILATOR_LIMITS,
  resolveVentilatorSettings,
  validateVentilatorSettings,
  type NumericSettingKey,
  type VentilatorLimit,
} from "./engine/ventilator-limits";
export { DEFAULT_ALARM_THRESHOLDS } from "./engine/alarms";
export {
  CLINICAL_CASE_PHYSIOLOGICAL_RANGES,
  type PhysiologicalParameter,
  type PhysiologicalRange,
} from "./engine/clinical-cases/clinical-case-physiological-ranges";
export { mechanicalPowerJPerMin, predictedBodyWeightKg } from "./engine/cycle-metrics";
export { DEFAULT_SAMPLE_RATE_HZ, INTERNAL_STEP_MS, replay } from "./engine/simulation";

export {
  createSimLoop,
  DEFAULT_FIXED_STEP_MS,
  DEFAULT_MAX_CATCH_UP_MS_PER_TICK,
  DEFAULT_METRICS_EVERY_MS,
  type RejectedSimEvent,
  type SimBatch,
  type SimClock,
  type SimEventConfirmation,
  type SimEventInput,
  type SimLoop,
  type SimLoopOptions,
  type SimLoopStatus,
} from "./runtime/sim-loop";
export {
  isSimCommand,
  isSimWorkerMessage,
  MAX_PLAYBACK_RATE,
  SIM_BATCH_RATE_HZ,
  type SimCommand,
  type SimInitOptions,
  type SimReplayRequest,
  type SimWorkerMessage,
} from "./runtime/protocol";
export {
  createSimWorker,
  createSimWorkerClient,
  type SimWorkerClient,
  type SimWorkerListener,
  type WorkerLike,
} from "./runtime/create-sim-worker";
export { requestWorkerReplay } from "./runtime/replay-client";
