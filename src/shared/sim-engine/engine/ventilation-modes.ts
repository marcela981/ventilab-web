/*
* Funcionalidad: Modos ventilatorios del motor fisiológico
* Descripción: GENERATED — do not edit; run node scripts/sync-sim-engine.mjs. Vendored copy of ventylab-server/src/features/simulation/domain/engine/ventilation-modes.ts. Máquina de estados de la respiración (inspiración, pausa, espiración) para VCV, PCV, PSV, CPAP y SIMV: disparo por tiempo o por el paciente (flujo o presión), ciclado por tiempo o por porcentaje del flujo pico, respaldo por apnea y objetivo físico de cada paso
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/
// @ts-nocheck -- vendored backend engine, type-checked by ventylab-server's tsc
import { buildCycleMetrics, summarizeVentilation, trimBreathHistory } from "./cycle-metrics";
import { round } from "./engine-math";
import type { BreathKind, BreathState, EngineState, EngineVentilationMode, VentilationSummary, VentilatorSettings } from "./engine.types";
import { elasticPressure, volumeControlFlowLps } from "./respiratory-mechanics";

export const TRIGGER_REFRACTORY_MS: number = 200;
export const MIN_SPONTANEOUS_INSPIRATION_MS: number = 150;
export const MAX_SPONTANEOUS_INSPIRATION_MS: number = 3000;
export const SIMV_SYNCHRONIZATION_WINDOW_FRACTION: number = 0.25;

export interface FlowTarget {
  readonly kind: "FLOW";
  readonly flowLps: number;
}

export interface PressureTarget {
  readonly kind: "PRESSURE";
  readonly pressureCmH2O: number;
}

export type PhysicsTarget = FlowTarget | PressureTarget;

interface BreathStart {
  readonly kind: BreathKind;
  readonly triggered: boolean;
}

export function breathPeriodMs(settings: VentilatorSettings): number {
  return 60000 / settings.respiratoryRateBpm;
}

export function hasTimedMandatoryBreaths(mode: EngineVentilationMode): boolean {
  return mode === "VCV" || mode === "PCV" || mode === "SIMV";
}

export function createIdleBreath(volumeAboveFrcMl: number, complianceMlPerCmH2O: number, settings: VentilatorSettings): BreathState {
  const totalPeepCmH2O: number = elasticPressure(volumeAboveFrcMl, complianceMlPerCmH2O);

  return {
    kind: "IDLE",
    phase: "EXPIRATION",
    triggered: false,
    startMs: 0,
    inspiratoryTimeMs: 0,
    pauseMs: 0,
    tidalVolumeMl: 0,
    flowPattern: settings.flowPattern,
    inspiratoryPressureCmH2O: 0,
    peepCmH2O: settings.peepCmH2O,
    cycleOffPercent: settings.cycleOffPercent,
    expirationStartMs: 0,
    startVolumeMl: volumeAboveFrcMl,
    startTotalPeepCmH2O: totalPeepCmH2O,
    plateauCmH2O: totalPeepCmH2O,
    peakPressureCmH2O: settings.peepCmH2O,
    peakInspiratoryFlowLps: 0,
    inspiredMl: 0,
    exhaledMl: 0,
    pressureTimeIntegral: 0,
  };
}

export function updateBreathControl(
  state: EngineState,
  nowMs: number,
  muscularPressureCmH2O: number,
  complianceMlPerCmH2O: number,
): void {
  if (state.breath.phase !== "EXPIRATION") {
    advanceInspiration(state, nowMs, complianceMlPerCmH2O);

    return;
  }

  const start: BreathStart | null = selectBreathStart(state, nowMs, muscularPressureCmH2O, complianceMlPerCmH2O);

  if (start !== null) {
    startBreath(state, nowMs, start, complianceMlPerCmH2O);
  }
}

export function resolvePhysicsTarget(state: EngineState, nowMs: number, stepMs: number): PhysicsTarget {
  const breath: BreathState = state.breath;

  if (state.conditions.disconnected) {
    return { kind: "PRESSURE", pressureCmH2O: 0 };
  }

  if (breath.phase === "PAUSE") {
    return { kind: "FLOW", flowLps: 0 };
  }

  if (breath.phase === "INSPIRATION" && breath.kind === "MANDATORY_VOLUME") {
    const flowLps: number = volumeControlFlowLps(
      breath.flowPattern,
      breath.tidalVolumeMl,
      breath.inspiratoryTimeMs,
      nowMs - breath.startMs + stepMs / 2,
    );

    return { kind: "FLOW", flowLps };
  }

  if (breath.phase === "INSPIRATION") {
    return { kind: "PRESSURE", pressureCmH2O: breath.peepCmH2O + breath.inspiratoryPressureCmH2O };
  }

  return { kind: "PRESSURE", pressureCmH2O: state.settings.peepCmH2O };
}

function mandatoryKindFor(settings: VentilatorSettings): BreathKind {
  if (settings.mode === "PCV") {
    return "MANDATORY_PRESSURE";
  }

  if (settings.mode === "SIMV" && settings.simvMandatoryType === "PCV") {
    return "MANDATORY_PRESSURE";
  }

  return "MANDATORY_VOLUME";
}

function advanceInspiration(state: EngineState, nowMs: number, complianceMlPerCmH2O: number): void {
  const breath: BreathState = state.breath;
  const elapsedMs: number = nowMs - breath.startMs;

  if (breath.kind === "SPONTANEOUS") {
    const cycleOffFlowLps: number = (breath.cycleOffPercent / 100) * breath.peakInspiratoryFlowLps;
    const flowDecayed: boolean = elapsedMs >= MIN_SPONTANEOUS_INSPIRATION_MS && state.lung.measuredFlowLps <= cycleOffFlowLps;

    if (flowDecayed || elapsedMs >= MAX_SPONTANEOUS_INSPIRATION_MS) {
      endInspiration(state, nowMs, complianceMlPerCmH2O);
    }

    return;
  }

  if (breath.phase === "INSPIRATION" && elapsedMs >= breath.inspiratoryTimeMs) {
    if (breath.pauseMs > 0) {
      breath.phase = "PAUSE";

      return;
    }

    endInspiration(state, nowMs, complianceMlPerCmH2O);

    return;
  }

  if (breath.phase === "PAUSE" && elapsedMs >= breath.inspiratoryTimeMs + breath.pauseMs) {
    endInspiration(state, nowMs, complianceMlPerCmH2O);
  }
}

function endInspiration(state: EngineState, nowMs: number, complianceMlPerCmH2O: number): void {
  state.breath.plateauCmH2O = elasticPressure(state.lung.volumeAboveFrcMl, complianceMlPerCmH2O);
  state.breath.phase = "EXPIRATION";
  state.breath.expirationStartMs = nowMs;
}

function selectBreathStart(
  state: EngineState,
  nowMs: number,
  muscularPressureCmH2O: number,
  complianceMlPerCmH2O: number,
): BreathStart | null {
  const settings: VentilatorSettings = state.settings;
  const mode: EngineVentilationMode = settings.mode;
  const nextMandatoryAtMs: number | null = state.schedule.nextMandatoryAtMs;

  if (hasTimedMandatoryBreaths(mode) && nextMandatoryAtMs !== null && nowMs >= nextMandatoryAtMs) {
    return { kind: mandatoryKindFor(settings), triggered: false };
  }

  if (mode === "PSV") {
    const apneic: boolean = nowMs - state.schedule.lastTriggeredBreathStartMs >= settings.apneaTimeS * 1000;
    const backupDue: boolean = nextMandatoryAtMs === null || nowMs >= nextMandatoryAtMs;

    if (apneic && backupDue) {
      return { kind: "MANDATORY_VOLUME", triggered: false };
    }
  }

  if (!isPatientTriggering(state, nowMs, muscularPressureCmH2O, complianceMlPerCmH2O)) {
    return null;
  }

  state.schedule.lastTriggeredEffortCycle = state.effort.cycleIndex;

  if (mode === "VCV" || mode === "PCV") {
    return { kind: mandatoryKindFor(settings), triggered: true };
  }

  if (mode === "SIMV" && nextMandatoryAtMs !== null) {
    const windowMs: number = SIMV_SYNCHRONIZATION_WINDOW_FRACTION * breathPeriodMs(settings);

    if (nextMandatoryAtMs - nowMs <= windowMs) {
      return { kind: mandatoryKindFor(settings), triggered: true };
    }
  }

  return { kind: "SPONTANEOUS", triggered: true };
}

function isPatientTriggering(
  state: EngineState,
  nowMs: number,
  muscularPressureCmH2O: number,
  complianceMlPerCmH2O: number,
): boolean {
  if (state.conditions.disconnected || muscularPressureCmH2O <= 0) {
    return false;
  }

  if (nowMs - state.breath.expirationStartMs < TRIGGER_REFRACTORY_MS) {
    return false;
  }

  if (state.effort.cycleIndex === state.schedule.lastTriggeredEffortCycle) {
    return false;
  }

  if (state.settings.triggerType === "FLOW") {
    return state.lung.measuredFlowLps * 60 >= state.settings.flowTriggerLpm;
  }

  const elasticAbovePeepCmH2O: number =
    elasticPressure(state.lung.volumeAboveFrcMl, complianceMlPerCmH2O) - state.settings.peepCmH2O;

  return muscularPressureCmH2O - elasticAbovePeepCmH2O >= state.settings.pressureTriggerCmH2O;
}

function startBreath(state: EngineState, nowMs: number, start: BreathStart, complianceMlPerCmH2O: number): void {
  const settings: VentilatorSettings = state.settings;

  if (state.breath.kind !== "IDLE") {
    closeBreath(state, nowMs);
  }

  if (start.kind !== "SPONTANEOUS") {
    scheduleNextMandatory(state, nowMs, start.triggered);
  } else if (!hasTimedMandatoryBreaths(settings.mode)) {
    state.schedule.nextMandatoryAtMs = null;
  }

  if (start.triggered) {
    state.schedule.lastTriggeredBreathStartMs = nowMs;
  }

  state.schedule.lastBreathStartMs = nowMs;

  const supportCmH2O: number = settings.mode === "CPAP" ? 0 : settings.pressureSupportCmH2O;
  const inspiratoryPressureCmH2O: number =
    start.kind === "MANDATORY_PRESSURE" ? settings.inspiratoryPressureCmH2O : supportCmH2O;
  const totalPeepCmH2O: number = elasticPressure(state.lung.volumeAboveFrcMl, complianceMlPerCmH2O);

  state.breath = {
    kind: start.kind,
    phase: "INSPIRATION",
    triggered: start.triggered,
    startMs: nowMs,
    inspiratoryTimeMs: round(settings.inspiratoryTimeS * 1000),
    pauseMs: start.kind === "MANDATORY_VOLUME" ? round(settings.inspiratoryPauseS * 1000) : 0,
    tidalVolumeMl: settings.tidalVolumeMl,
    flowPattern: settings.flowPattern,
    inspiratoryPressureCmH2O,
    peepCmH2O: settings.peepCmH2O,
    cycleOffPercent: settings.cycleOffPercent,
    expirationStartMs: nowMs,
    startVolumeMl: state.lung.volumeAboveFrcMl,
    startTotalPeepCmH2O: totalPeepCmH2O,
    plateauCmH2O: totalPeepCmH2O,
    peakPressureCmH2O: state.lung.measuredPressureCmH2O,
    peakInspiratoryFlowLps: 0,
    inspiredMl: 0,
    exhaledMl: 0,
    pressureTimeIntegral: 0,
  };
}

function scheduleNextMandatory(state: EngineState, nowMs: number, triggered: boolean): void {
  const periodMs: number = breathPeriodMs(state.settings);
  const scheduledAtMs: number | null = state.schedule.nextMandatoryAtMs;

  state.schedule.lastMandatoryStartMs = nowMs;

  const keepsGrid: boolean = !triggered || state.settings.mode === "SIMV";

  if (keepsGrid && scheduledAtMs !== null && scheduledAtMs + periodMs > nowMs) {
    state.schedule.nextMandatoryAtMs = scheduledAtMs + periodMs;

    return;
  }

  state.schedule.nextMandatoryAtMs = nowMs + periodMs;
}

function closeBreath(state: EngineState, nowMs: number): void {
  const breath: BreathState = state.breath;

  state.breathHistory.push({
    startMs: breath.startMs,
    endMs: nowMs,
    mandatory: breath.kind !== "SPONTANEOUS",
    exhaledMl: breath.exhaledMl,
  });
  trimBreathHistory(state.breathHistory, nowMs);

  const summary: VentilationSummary = summarizeVentilation(
    state.breathHistory,
    nowMs,
    state.engineCase.gasExchange.deadSpaceMl,
  );

  state.cycleCount += 1;
  state.lastCycle = buildCycleMetrics(breath, state.cycleCount, nowMs, summary, state.predictedBodyWeightKg);
}
