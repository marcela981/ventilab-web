/*
* Funcionalidad: Objetivos clínicos del motor fisiológico
* Descripción: GENERATED — do not edit; run node scripts/sync-sim-engine.mjs. Vendored copy of ventylab-server/src/features/simulation/domain/engine/targets.ts. Evalúa cada objetivo del caso (SpO2, PaCO2, pH, presión meseta, presión de distensión, volumen corriente por kg de peso predicho y auto-PEEP) como cumplido, incumplido o desconocido
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/
// @ts-nocheck -- vendored backend engine, type-checked by ventylab-server's tsc
import type { CycleMetrics, EngineTargets, GasExchangeState, NumericRange, TargetId, TargetStatus } from "./engine.types";

export function evaluateTargets(
  targets: EngineTargets,
  gas: GasExchangeState,
  lastCycle: CycleMetrics | null,
): TargetStatus[] {
  const statuses: TargetStatus[] = [];

  if (targets.spo2Percent !== undefined) {
    statuses.push(rangeStatus("SPO2", gas.spo2Percent, targets.spo2Percent));
  }

  if (targets.paco2MmHg !== undefined) {
    statuses.push(rangeStatus("PACO2", gas.paco2MmHg, targets.paco2MmHg));
  }

  if (targets.ph !== undefined) {
    statuses.push(rangeStatus("PH", gas.ph, targets.ph));
  }

  if (targets.plateauPressureMaxCmH2O !== undefined) {
    statuses.push(maxStatus("PLATEAU_PRESSURE", lastCycle?.plateauPressureCmH2O ?? null, targets.plateauPressureMaxCmH2O));
  }

  if (targets.drivingPressureMaxCmH2O !== undefined) {
    statuses.push(maxStatus("DRIVING_PRESSURE", lastCycle?.drivingPressureCmH2O ?? null, targets.drivingPressureMaxCmH2O));
  }

  if (targets.tidalVolumePerKgPbw !== undefined) {
    statuses.push(rangeStatus("TIDAL_VOLUME_PER_KG_PBW", lastCycle?.tidalVolumePerKgPbw ?? null, targets.tidalVolumePerKgPbw));
  }

  if (targets.autoPeepMaxCmH2O !== undefined) {
    statuses.push(maxStatus("AUTO_PEEP", lastCycle?.autoPeepCmH2O ?? null, targets.autoPeepMaxCmH2O));
  }

  return statuses;
}

export function hasUnmetTarget(statuses: readonly TargetStatus[]): boolean {
  return statuses.some((status: TargetStatus): boolean => status.status === "UNMET");
}

function rangeStatus(id: TargetId, value: number | null, range: NumericRange): TargetStatus {
  if (value === null) {
    return { id, status: "UNKNOWN", value, min: range.min, max: range.max };
  }

  const met: boolean = value >= range.min && value <= range.max;

  return { id, status: met ? "MET" : "UNMET", value, min: range.min, max: range.max };
}

function maxStatus(id: TargetId, value: number | null, max: number): TargetStatus {
  if (value === null) {
    return { id, status: "UNKNOWN", value, min: null, max };
  }

  return { id, status: value <= max ? "MET" : "UNMET", value, min: null, max };
}
