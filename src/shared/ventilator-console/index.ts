/*
* Funcionalidad: Ventilator console module (public API)
* Descripción: Public surface of the generic ventilator console (engine- and feature-agnostic): the VentilatorConsole screen and its zones (curves, numeric monitor, patient monitor), the adapter contract a consumer implements, the console-owned metric/vital/curve config and the pure format helpers. T3 part 1; the mode selector, pending→confirm controls and alarms bar arrive in T4 through the console slots.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export {
  CONSOLE_BUFFER_CAPACITY,
  CONSOLE_CURVES,
  CONSOLE_METRIC_IDS,
  CONSOLE_METRICS,
  CONSOLE_WINDOW_SECONDS,
  CURVE_IDS,
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
  evaluateRange,
  formatConsoleValue,
  MISSING_VALUE,
  RANGE_STATUS_COPY,
  resolveNormalRange,
  sparklinePath,
} from "./application/console-format";
export type { RangeOverrides, RangeStatus } from "./application/console-format";
export { CURVES_COPY, CurvesZone } from "./application/curves-zone";
export type { CurvesZoneProps, LoopKind } from "./application/curves-zone";
export { NUMERIC_MONITOR_TITLE, NumericMonitor } from "./application/numeric-monitor";
export type { NumericMonitorProps } from "./application/numeric-monitor";
export { PATIENT_MONITOR_COPY, PatientMonitor } from "./application/patient-monitor";
export type { PatientMonitorProps } from "./application/patient-monitor";
export { pushConsoleBatch, useConsoleWaveforms } from "./application/use-console-waveforms";
export { ValueTile } from "./application/value-tile";
export type { ValueTileProps } from "./application/value-tile";
export { CONSOLE_COPY, VentilatorConsole } from "./application/ventilator-console";
export type { ConsoleSlot, ConsoleSlotContext, VentilatorConsoleProps } from "./application/ventilator-console";
export type {
  ConsoleAlarm,
  ConsoleAlarmPriority,
  ConsoleFrameListener,
  ConsoleFrameSource,
  ConsoleLimits,
  ConsoleMetrics,
  ConsoleMode,
  ConsoleModeOption,
  ConsoleParameterChange,
  ConsolePatient,
  ConsolePermissions,
  ConsoleSample,
  ConsoleSampleBatch,
  ConsoleSettings,
  ConsoleSettingValues,
  ParameterLimit,
  VentilatorConsoleAdapter,
} from "./application/ventilator-console.entity";
