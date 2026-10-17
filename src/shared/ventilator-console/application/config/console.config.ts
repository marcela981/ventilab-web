/*
* Funcionalidad: Ventilator console config
* Descripción: Console-owned static configuration of the generic ventilator console: the numeric monitoring metric ids and the patient vital ids with their Spanish labels, units, decimals and default normal ranges (used for the out-of-range highlight and overridable through props), the three curve channels with their console color tokens, the time-window options and the waveform ring capacity. It knows nothing about the simulation engine or a physical ventilator; adapters deliver values already in these units. v1.1: the ring capacity is computed from the frame source sample rate (default 50 Hz) as twice the largest window; the default normal ranges are teaching defaults that adapters or consumers override (`null` disables the highlight). v1.2: a generic `pco2` vital (PCO2 in mmHg, for sources that report a CO2 partial pressure without saying whether it is arterial or end-tidal); a source that does not provide it never shows it; the generic no-data message of a frame source without data.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

/** Normal range of a value. A missing bound is not checked; `null` in an override disables the highlight. */
export type NormalRange = { min?: number, max?: number };

/** `ratio`: a value r = Ti/Te shown as `1:(1/r)` (I:E). */
export type ValueFormat = "number" | "ratio";

export type ValueDefinition = {
  label: string
  /** Longer name for screen readers and tooltips. */
  description: string
  unit: string
  decimals: number
  format: ValueFormat
  normalRange: NormalRange | null
};

export const CONSOLE_METRIC_IDS = [
  "peakPressure",
  "plateauPressure",
  "totalPeep",
  "autoPeep",
  "drivingPressure",
  "exhaledTidalVolume",
  "tidalVolumePerKg",
  "minuteVolume",
  "totalRespiratoryRate",
  "ieRatio",
  "fio2",
  "mechanicalPower",
] as const;

export type ConsoleMetricId = (typeof CONSOLE_METRIC_IDS)[number];

/**
 * Teaching defaults for an adult on lung-protective ventilation, a deliberate front-end exception (no backend source):
 * the adapter (`ranges`) or the consumer (`metricRanges` / `patientRanges`) overrides them per case; `null` disables the highlight.
 */
export const CONSOLE_METRICS: Readonly<Record<ConsoleMetricId, ValueDefinition>> = {
  peakPressure: { label: "Ppico", description: "Presión pico", unit: "cmH2O", decimals: 0, format: "number", normalRange: { max: 35 } },
  plateauPressure: { label: "Pplat", description: "Presión meseta", unit: "cmH2O", decimals: 0, format: "number", normalRange: { max: 30 } },
  totalPeep: { label: "PEEP total", description: "PEEP total", unit: "cmH2O", decimals: 1, format: "number", normalRange: { min: 3, max: 15 } },
  autoPeep: { label: "Auto-PEEP", description: "PEEP intrínseca", unit: "cmH2O", decimals: 1, format: "number", normalRange: { max: 5 } },
  drivingPressure: { label: "ΔP", description: "Presión de distensión", unit: "cmH2O", decimals: 0, format: "number", normalRange: { max: 15 } },
  exhaledTidalVolume: { label: "Vte", description: "Volumen corriente espirado", unit: "mL", decimals: 0, format: "number", normalRange: null },
  tidalVolumePerKg: { label: "Vt/kg PBW", description: "Volumen corriente por kg de peso predicho", unit: "mL/kg", decimals: 1, format: "number", normalRange: { min: 4, max: 8 } },
  minuteVolume: { label: "VE", description: "Volumen minuto", unit: "L/min", decimals: 1, format: "number", normalRange: { min: 5, max: 10 } },
  totalRespiratoryRate: { label: "FR total", description: "Frecuencia respiratoria total", unit: "rpm", decimals: 0, format: "number", normalRange: { min: 10, max: 30 } },
  ieRatio: { label: "I:E", description: "Relación inspiración:espiración", unit: "", decimals: 1, format: "ratio", normalRange: null },
  fio2: { label: "FiO2", description: "Fracción inspirada de oxígeno", unit: "%", decimals: 0, format: "number", normalRange: null },
  mechanicalPower: { label: "Potencia", description: "Potencia mecánica", unit: "J/min", decimals: 1, format: "number", normalRange: { max: 17 } },
};

export const PATIENT_VITAL_IDS = ["spo2", "pao2", "paco2", "ph", "map", "pco2"] as const;

export type PatientVitalId = (typeof PATIENT_VITAL_IDS)[number];

export const PATIENT_VITALS: Readonly<Record<PatientVitalId, ValueDefinition>> = {
  spo2: { label: "SpO2", description: "Saturación de oxígeno", unit: "%", decimals: 0, format: "number", normalRange: { min: 92, max: 100 } },
  pao2: { label: "PaO2", description: "Presión arterial de oxígeno", unit: "mmHg", decimals: 0, format: "number", normalRange: { min: 60, max: 120 } },
  paco2: { label: "PaCO2", description: "Presión arterial de CO2", unit: "mmHg", decimals: 0, format: "number", normalRange: { min: 35, max: 45 } },
  ph: { label: "pH", description: "pH arterial", unit: "", decimals: 2, format: "number", normalRange: { min: 7.35, max: 7.45 } },
  map: { label: "PAM", description: "Presión arterial media", unit: "mmHg", decimals: 0, format: "number", normalRange: { min: 65, max: 110 } },
  // Not labelled arterial or end-tidal: the source does not say which one it measures, so no default range is assumed.
  pco2: { label: "PCO2", description: "Presión parcial de CO2 informada por la fuente", unit: "mmHg", decimals: 0, format: "number", normalRange: null },
};

export const CURVE_IDS = ["pressure", "flow", "volume"] as const;

export type CurveId = (typeof CURVE_IDS)[number];

export type CurveDefinition = { key: CurveId, label: string, unit: string, colorVar: string };

export const CONSOLE_CURVES: readonly CurveDefinition[] = [
  { key: "pressure", label: "Presión", unit: "cmH2O", colorVar: "--vl-console-curve-pressure" },
  { key: "flow", label: "Flujo", unit: "L/min", colorVar: "--vl-console-curve-flow" },
  { key: "volume", label: "Volumen", unit: "mL", colorVar: "--vl-console-curve-volume" },
];

export const CONSOLE_WINDOW_SECONDS = [5, 10, 20, 30] as const;

export const DEFAULT_CONSOLE_WINDOW_SECONDS = 10;

/** Sample rate assumed when the frame source does not declare `sampleRateHz` (the simulation worker streams 50 Hz). */
export const DEFAULT_CONSOLE_SAMPLE_RATE_HZ = 50;

/**
 * Ring capacity for a sample rate: twice the largest window, so a frozen loop or a scroll window never runs out.
 * A missing, non-finite or non-positive rate falls back to the default rate.
 */
export function consoleBufferCapacity(sampleRateHz: number | undefined): number {
  const rate = sampleRateHz !== undefined && Number.isFinite(sampleRateHz) && sampleRateHz > 0 ? sampleRateHz : DEFAULT_CONSOLE_SAMPLE_RATE_HZ;

  return Math.ceil(rate * Math.max(...CONSOLE_WINDOW_SECONDS) * 2);
}

/** Capacity at the default rate (60 s at 50 Hz = 3000 samples). */
export const CONSOLE_BUFFER_CAPACITY = consoleBufferCapacity(DEFAULT_CONSOLE_SAMPLE_RATE_HZ);

/** Default overlay text and read-only reason while a frame source reports `no-data`. */
// TODO(i18n): move to an i18next namespace once src/i18n is in scope.
export const CONSOLE_NO_DATA_MESSAGE = "Sin datos de la fuente: las curvas están detenidas.";

/** How many trend points a patient sparkline keeps when the adapter sends more. */
export const PATIENT_TREND_POINTS = 60;
