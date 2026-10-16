/*
* Funcionalidad: Métricas por ciclo del motor fisiológico
* Descripción: GENERATED — do not edit; run node scripts/sync-sim-engine.mjs. Vendored copy of ventylab-server/src/features/simulation/domain/engine/cycle-metrics.ts. Peso corporal predicho, potencia mecánica simplificada, resumen de ventilación en ventana móvil (frecuencias, volumen minuto, ventilación alveolar) y construcción de las métricas de cada ciclo respiratorio cerrado
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/
// @ts-nocheck -- vendored backend engine, type-checked by ventylab-server's tsc
import { max } from "./engine-math";
import type { BreathRecord, BreathState, CycleMetrics, PatientSex, VentilationSummary } from "./engine.types";
import { alveolarVolumeMl } from "./gas-exchange";

export const VENTILATION_WINDOW_MS: number = 60000;

const EMPTY_VENTILATION_SUMMARY: VentilationSummary = {
  totalRespiratoryRateBpm: 0,
  mandatoryRateBpm: 0,
  spontaneousRateBpm: 0,
  minuteVolumeLpm: 0,
  alveolarVentilationLpm: 0,
};

// Predicted body weight (Devine formula as adopted by ARDSNet): PBW = 50 (male) or 45.5 (female) + 0.91·(height_cm − 152.4) (ARDSNet, N Engl J Med 2000)
export function predictedBodyWeightKg(sex: PatientSex, heightCm: number): number {
  const base: number = sex === "MALE" ? 50 : 45.5;

  return max(1, base + 0.91 * (heightCm - 152.4));
}

// Simplified mechanical power: MP = 0.098·RR·Vt(L)·(Ppeak − ½·ΔP), J/min (Gattinoni et al., Intensive Care Med 2016)
export function mechanicalPowerJPerMin(
  respiratoryRateBpm: number,
  tidalVolumeMl: number,
  peakPressureCmH2O: number,
  drivingPressureCmH2O: number,
): number {
  return 0.098 * respiratoryRateBpm * (tidalVolumeMl / 1000) * (peakPressureCmH2O - 0.5 * drivingPressureCmH2O);
}

export function trimBreathHistory(history: BreathRecord[], nowMs: number): void {
  const windowStartMs: number = nowMs - VENTILATION_WINDOW_MS;

  while (history.length > 0 && history[0].endMs <= windowStartMs) {
    history.shift();
  }
}

export function summarizeVentilation(history: readonly BreathRecord[], nowMs: number, deadSpaceMl: number): VentilationSummary {
  const windowStartMs: number = nowMs - VENTILATION_WINDOW_MS;
  const recent: BreathRecord[] = history.filter((record: BreathRecord): boolean => record.endMs > windowStartMs);

  if (recent.length === 0) {
    return EMPTY_VENTILATION_SUMMARY;
  }

  const oldest: BreathRecord = recent[0];
  const latest: BreathRecord = recent[recent.length - 1];
  const latestDurationMs: number = latest.endMs - latest.startMs;
  const overdueMs: number = max(0, nowMs - latest.endMs - latestDurationMs);
  const spanMinutes: number = (latest.endMs - oldest.startMs + overdueMs) / 60000;

  if (spanMinutes <= 0) {
    return EMPTY_VENTILATION_SUMMARY;
  }

  let mandatoryCount: number = 0;
  let exhaledMl: number = 0;
  let alveolarMl: number = 0;

  for (const record of recent) {
    if (record.mandatory) {
      mandatoryCount += 1;
    }

    exhaledMl += record.exhaledMl;
    alveolarMl += alveolarVolumeMl(record.exhaledMl, deadSpaceMl);
  }

  return {
    totalRespiratoryRateBpm: recent.length / spanMinutes,
    mandatoryRateBpm: mandatoryCount / spanMinutes,
    spontaneousRateBpm: (recent.length - mandatoryCount) / spanMinutes,
    minuteVolumeLpm: exhaledMl / 1000 / spanMinutes,
    alveolarVentilationLpm: alveolarMl / 1000 / spanMinutes,
  };
}

export function buildCycleMetrics(
  breath: BreathState,
  cycleIndex: number,
  endMs: number,
  summary: VentilationSummary,
  predictedBodyWeight: number,
): CycleMetrics {
  const inspiratoryTimeMs: number = breath.expirationStartMs - breath.startMs;
  const expiratoryTimeMs: number = endMs - breath.expirationStartMs;
  const durationMs: number = endMs - breath.startMs;
  const autoPeepCmH2O: number = max(0, breath.startTotalPeepCmH2O - breath.peepCmH2O);
  const drivingPressureCmH2O: number = breath.plateauCmH2O - breath.startTotalPeepCmH2O;

  return {
    cycleIndex,
    startMs: breath.startMs,
    endMs,
    breathType: breath.kind === "SPONTANEOUS" ? "SPONTANEOUS" : "MANDATORY",
    triggered: breath.triggered,
    peakPressureCmH2O: breath.peakPressureCmH2O,
    plateauPressureCmH2O: breath.plateauCmH2O,
    totalPeepCmH2O: breath.startTotalPeepCmH2O,
    autoPeepCmH2O,
    drivingPressureCmH2O,
    meanAirwayPressureCmH2O: durationMs > 0 ? breath.pressureTimeIntegral / durationMs : breath.peepCmH2O,
    inspiredTidalVolumeMl: breath.inspiredMl,
    exhaledTidalVolumeMl: breath.exhaledMl,
    tidalVolumePerKgPbw: breath.exhaledMl / predictedBodyWeight,
    inspiratoryTimeMs,
    expiratoryTimeMs,
    ieRatio: expiratoryTimeMs > 0 ? inspiratoryTimeMs / expiratoryTimeMs : 0,
    totalRespiratoryRateBpm: summary.totalRespiratoryRateBpm,
    mandatoryRateBpm: summary.mandatoryRateBpm,
    spontaneousRateBpm: summary.spontaneousRateBpm,
    minuteVolumeLpm: summary.minuteVolumeLpm,
    mechanicalPowerJPerMin: mechanicalPowerJPerMin(
      summary.totalRespiratoryRateBpm,
      breath.exhaledMl,
      breath.peakPressureCmH2O,
      drivingPressureCmH2O,
    ),
  };
}
