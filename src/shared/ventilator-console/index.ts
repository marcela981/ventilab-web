/*
* Funcionalidad: Ventilator console module (public API)
* Descripción: Public surface of the generic ventilator console (engine- and feature-agnostic): the VentilatorConsole screen and its zones (curves, numeric monitor, patient monitor), the adapter contract a consumer implements, the console-owned metric/vital/curve config and the pure format helpers (T3), plus the mode selector and pending→confirm/cancel parameter controls with their pure reducer and mode→parameter table, and the alarms bar with priority sorting, 2-minute silence, optional sound, session history and alarm limits (T4). v1.2: frame source `sourceId`/`sampleRateHz`, adapter `ranges` and the sample-rate based ring capacity. v1.3: `pendingModeOf` and `buildConfirmation(state, applied, appliedMode)`. v1.4: exports the generic source-state contract (frame status, in-flight settings, metric provenance helpers, value tile and in-flight copy). v1.5 (B3.10): no longer exports the unused CONSOLE_BUFFER_CAPACITY. v1.6 (W2): exports the console external store (createExternalStore, useStoreSelector, ConsoleAdapterStore, reuseUnchangedSlices, createUiThrottle) that live sources use to publish ≤ 4 Hz snapshots.
* Versión: 1.6
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export {
  CONSOLE_CURVES,
  CONSOLE_METRIC_IDS,
  CONSOLE_METRICS,
  CONSOLE_NO_DATA_MESSAGE,
  CONSOLE_WINDOW_SECONDS,
  consoleBufferCapacity,
  CURVE_IDS,
  DEFAULT_CONSOLE_SAMPLE_RATE_HZ,
  DEFAULT_CONSOLE_WINDOW_SECONDS,
  PATIENT_TREND_POINTS,
  PATIENT_VITAL_IDS,
  PATIENT_VITALS,
} from "./application/config/console.config";
export type {
  ConsoleMetricId,
  CurveDefinition,
  CurveId,
  NormalRange,
  PatientVitalId,
  ValueDefinition,
  ValueFormat,
} from "./application/config/console.config";
export {
  ALARM_HISTORY_MAX_EVENTS,
  ALARM_PRIORITY_COPY,
  ALARM_PRIORITY_ORDER,
  ALARM_SILENCE_MS,
  CONSOLE_PARAMETER_IDS,
  CONSOLE_PARAMETERS,
  DEFAULT_ALARM_PRIORITIES,
  getParametersForMode,
  MODE_PARAMETERS,
  resolveAlarmPriority,
} from "./application/config/console-controls.config";
export type {
  ConsoleParameterDefinition,
  ConsoleParameterId,
  ModeParameterTable,
} from "./application/config/console-controls.config";
export { ALARM_LIMITS_COPY, AlarmLimitsPanel } from "./application/alarm-limits-panel";
export type { AlarmLimitsPanelProps } from "./application/alarm-limits-panel";
export { ALARMS_COPY, AlarmsBar } from "./application/alarms-bar";
export type { AlarmsBarProps } from "./application/alarms-bar";
export { diffAlarms, formatCountdown, formatEventTime, sortAlarms } from "./application/console-alarms";
export { CONTROLS_COPY, ConsoleControls, inFlightText } from "./application/console-controls";
export type { ConsoleControlsProps, ConsoleVariant } from "./application/console-controls";
export {
  buildConfirmation,
  clampToLimit,
  controlsReducer,
  INITIAL_CONTROLS_STATE,
  keyToAdjustment,
  pendingModeOf,
  stepDecimals,
} from "./application/console-controls.reducer";
export type { Adjustment, ControlsAction, ControlsState } from "./application/console-controls.reducer";
export {
  createWebAudioBeeper,
  SYSTEM_CLOCK,
  useAlarmHistory,
  useAlarmSilence,
  useAlarmSound,
} from "./application/use-console-alarms";
export type { AlarmBeeper, AlarmBeeperFactory, AlarmSilence, AlarmSound, ConsoleClock } from "./application/use-console-alarms";
export {
  evaluateRange,
  formatConsoleValue,
  MISSING_VALUE,
  RANGE_STATUS_COPY,
  resolveNormalRange,
  sparklinePath,
} from "./application/console-format";
export type { RangeOverrides, RangeStatus } from "./application/console-format";
export {
  createExternalStore,
  createUiThrottle,
  isConsoleAdapterStore,
  mapStore,
  reuseUnchangedSlices,
  sameData,
  staticConsoleStore,
  useStoreSelector,
} from "./application/console-store";
export type {
  ConsoleAdapterStore,
  ExternalStore,
  UiThrottle,
  UiThrottleOptions,
  UiThrottleRequest,
  UiThrottleTimers,
  WritableStore,
} from "./application/console-store";
export { CURVES_COPY, CurvesZone } from "./application/curves-zone";
export type { CurvesZoneProps, LoopKind } from "./application/curves-zone";
export { NUMERIC_MONITOR_TITLE, NumericMonitor } from "./application/numeric-monitor";
export type { NumericMonitorProps } from "./application/numeric-monitor";
export { PATIENT_MONITOR_COPY, PatientMonitor } from "./application/patient-monitor";
export type { PatientMonitorProps } from "./application/patient-monitor";
export { pushConsoleBatch, useConsoleWaveforms } from "./application/use-console-waveforms";
export { VALUE_TILE_COPY, ValueTile } from "./application/value-tile";
export type { ValueTileProps } from "./application/value-tile";
export { CONSOLE_COPY, VentilatorConsole } from "./application/ventilator-console";
export type { ConsoleSlot, ConsoleSlotContext, VentilatorConsoleProps } from "./application/ventilator-console";
export type {
  ConsoleAlarm,
  ConsoleAlarmEvent,
  ConsoleAlarmEventKind,
  ConsoleAlarmLimit,
  ConsoleAlarmLimitChange,
  ConsoleAlarmPriority,
  ConsoleCapabilities,
  ConsoleConfirmation,
  ConsoleFrameListener,
  ConsoleFrameSource,
  ConsoleFrameStatus,
  ConsoleInFlight,
  ConsoleInFlightStatus,
  ConsoleLimits,
  ConsoleMetricReading,
  ConsoleMetrics,
  ConsoleMetricValue,
  ConsoleMode,
  ConsoleModeOption,
  ConsoleParameterChange,
  ConsolePatient,
  ConsolePermissions,
  ConsoleRangeOverrides,
  ConsoleRanges,
  ConsoleSample,
  ConsoleSampleBatch,
  ConsoleSettings,
  ConsoleSettingValues,
  ParameterLimit,
  VentilatorConsoleAdapter,
} from "./application/ventilator-console.entity";
export { isDerivedMetric, metricNumber } from "./application/ventilator-console.entity";
