/*
* Funcionalidad: Engine output ↔ ventilator console binding
* Descripción: The mapping from the worker output to the generic ventilator console, shared by every feature that
*   runs the engine in the simulation worker and shows it on the console (the simulator session, the case editor local
*   preview): waveform samples ({tMs, pressure, flow, volume}), a push frame source fed by worker batches, the 12
*   console metrics from the engine cycle metrics and ventilation summary (FiO2 from the applied settings), the patient
*   vitals and their trends, the alarms (priority from the engine severity, then the console default map; onset time
*   kept while active) with their Spanish labels, and the case targets as console normal ranges. Moved unchanged from
*   the simulator feature (sim-console-adapter, sim-console.config ALARM_LABELS and the use-sim-session frame hub),
*   which re-exports it, so the case editor preview shows exactly the console the student sees. Pure (the frame hub
*   only keeps its listeners). Depends on the sim-engine types, the settings binding and the ventilator-console API.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { PATIENT_TREND_POINTS, resolveAlarmPriority } from "@shared/ventilator-console";
import type {
  ConsoleAlarm,
  ConsoleAlarmPriority,
  ConsoleFrameListener,
  ConsoleFrameSource,
  ConsoleMetrics,
  ConsolePatient,
  ConsoleRanges,
  ConsoleSample,
  NormalRange,
  PatientVitalId,
} from "@shared/ventilator-console";
import { DEFAULT_SAMPLE_RATE_HZ } from "../engine/simulation";
import type { Alarm, AlarmCode, EngineMetrics, EngineTargets, NumericRange, VentilatorSettings, WaveformSample } from "../engine/engine.types";
import type { SimBatch } from "../runtime/sim-loop";
import { tidy } from "./settings-binding";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const ALARM_LABELS = {
  HIGH_PRESSURE: "Presión alta",
  LOW_TIDAL_VOLUME: "Volumen corriente bajo",
  HIGH_TIDAL_VOLUME: "Volumen corriente alto",
  APNEA: "Apnea",
  HIGH_RESPIRATORY_RATE: "Frecuencia respiratoria alta",
  AUTO_PEEP: "Auto-PEEP",
  DISCONNECTION: "Desconexión",
} as const satisfies Record<AlarmCode, string>;

export function toConsoleSamples(samples: readonly WaveformSample[]): ConsoleSample[] {
  return samples.map((sample) => ({
    tMs: sample.simTimeMs,
    pressure: sample.pressureCmH2O,
    flow: sample.flowLpm,
    volume: sample.volumeMl,
  }));
}

export type ConsoleFrameHub = { source: ConsoleFrameSource, emit: (batch: SimBatch) => void };

/** A stable console frame source (one per data origin) fed with the samples of the worker batches. */
export function createConsoleFrameHub(sourceId: string): ConsoleFrameHub {
  const listeners = new Set<ConsoleFrameListener>();

  return {
    source: {
      sourceId,
      sampleRateHz: DEFAULT_SAMPLE_RATE_HZ,
      subscribe(listener) {
        listeners.add(listener);

        return () => {
          listeners.delete(listener);
        };
      },
    },
    emit(batch) {
      if (batch.samples.length > 0 && listeners.size > 0) {
        const samples = toConsoleSamples(batch.samples);

        listeners.forEach((listener) => listener({ samples }));
      }
    },
  };
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
