/*
* Funcionalidad: API pública del motor fisiológico
* Descripción: GENERATED — do not edit; run node scripts/sync-sim-engine.mjs. Vendored copy of ventylab-server/src/features/simulation/domain/engine/simulation.ts. Crea la simulación a partir de un caso y una semilla, aplica eventos validados, avanza el tiempo simulado con paso interno fijo, entrega muestras de onda y métricas (ciclo, intercambio gaseoso, hemodinámica, alarmas, objetivos) y repite de forma exacta una secuencia de eventos
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/
// @ts-nocheck -- vendored backend engine, type-checked by ventylab-server's tsc
import { evaluateAlarms, resolveAlarmThresholds } from "./alarms";
import { predictedBodyWeightKg, summarizeVentilation } from "./cycle-metrics";
import { max, min } from "./engine-math";
import { ENGINE_VERSION } from "./engine-version";
import { EngineValidationError } from "./engine.errors";
import type { Alarm, BreathState, CaseEvent, CycleMetrics, EngineCase, EngineEvent, EngineMetrics, EngineOptions, EngineState, GasExchangeProfile, GasExchangeState, LungState, ReplayOptions, ReplayResult, ResolvedEngineOptions, TargetStatus, TimeMultiplier, VentilationSummary, VentilatorSettings, WaveformBatch, WaveformRingState, WaveformSample } from "./engine.types";
import { alveolarPo2, arterialPh, equilibriumPao2, equilibriumPaco2, firstOrderApproach, MAX_SHUNT_FRACTION, severinghausSaturation, shuntFractionAtPeep } from "./gas-exchange";
import { meanArterialPressure } from "./hemodynamics";
import { advanceEffortCycle, createEffortState, muscularPressure, updateEffortProfile } from "./patient-effort";
import { normalizeSeed } from "./prng";
import { advanceVolumeUnderPressure, airwayPressureFromFlow } from "./respiratory-mechanics";
import { evaluateTargets, hasUnmetTarget } from "./targets";
import { breathPeriodMs, createIdleBreath, hasTimedMandatoryBreaths, type PhysicsTarget, resolvePhysicsTarget, updateBreathControl } from "./ventilation-modes";
import { resolveVentilatorSettings, validateVentilatorSettings } from "./ventilator-limits";

export const INTERNAL_STEP_MS: number = 1;
export const DEFAULT_SAMPLE_RATE_HZ: number = 50;
export const MAX_SAMPLE_RATE_HZ: number = 1000;
export const DEFAULT_WAVEFORM_CAPACITY: number = 3000;
export const DEFAULT_METRICS_INTERVAL_MS: number = 1000;
export const SLOW_UPDATE_INTERVAL_MS: number = 100;
export const MIN_EFFECTIVE_COMPLIANCE_ML_PER_CMH2O: number = 1;

const TIME_MULTIPLIERS: readonly TimeMultiplier[] = [1, 2, 4];

export function createSimulation(engineCase: EngineCase, seed: number, options: EngineOptions = {}): EngineState {
  validateCase(engineCase);

  const resolvedOptions: ResolvedEngineOptions = resolveOptions(options);
  const settings: VentilatorSettings = resolveVentilatorSettings(engineCase.initialSettings);

  validateVentilatorSettings(settings);

  const complianceMlPerCmH2O: number = engineCase.mechanics.complianceMlPerCmH2O;
  const volumeAboveFrcMl: number = complianceMlPerCmH2O * settings.peepCmH2O;
  const profile: GasExchangeProfile = engineCase.gasExchange;
  const caseEvents: CaseEvent[] = [...engineCase.events].sort(
    (a: CaseEvent, b: CaseEvent): number => a.simTimeMs - b.simTimeMs,
  );

  return {
    engineVersion: ENGINE_VERSION,
    engineCase,
    options: resolvedOptions,
    predictedBodyWeightKg: predictedBodyWeightKg(engineCase.patient.sex, engineCase.patient.heightCm),
    alarmThresholds: resolveAlarmThresholds(engineCase.alarmThresholds),
    caseEvents,
    simTimeMs: 0,
    pendingMs: 0,
    prngState: normalizeSeed(seed),
    cycleCount: 0,
    settings,
    conditions: {
      resistanceFactor: 1,
      complianceFactor: 1,
      shuntIncrease: 0,
      disconnected: false,
      deteriorationLevel: 0,
    },
    effort: createEffortState(engineCase.effort),
    lung: {
      volumeAboveFrcMl,
      measuredFlowLps: 0,
      measuredPressureCmH2O: settings.peepCmH2O,
      measuredVolumeMl: 0,
      muscularPressureCmH2O: 0,
    },
    breath: createIdleBreath(volumeAboveFrcMl, complianceMlPerCmH2O, settings),
    schedule: {
      nextMandatoryAtMs: hasTimedMandatoryBreaths(settings.mode) ? 0 : null,
      lastMandatoryStartMs: null,
      lastBreathStartMs: 0,
      lastTriggeredBreathStartMs: 0,
      lastTriggeredEffortCycle: -1,
      nextSampleAtMs: 1000 / resolvedOptions.sampleRateHz,
      nextSlowUpdateAtMs: 0,
      lastSlowUpdateAtMs: 0,
      nextCaseEventIndex: 0,
    },
    breathHistory: [],
    lastCycle: null,
    gas: {
      paco2MmHg: profile.initialPaco2MmHg,
      paco2EquilibriumMmHg: profile.initialPaco2MmHg,
      pao2MmHg: profile.initialPao2MmHg,
      pao2EquilibriumMmHg: profile.initialPao2MmHg,
      spo2Percent: severinghausSaturation(profile.initialPao2MmHg),
      ph: arterialPh(profile.bicarbonateMmolPerL, profile.initialPaco2MmHg),
      alveolarPo2MmHg: alveolarPo2(settings.fio2, profile.initialPaco2MmHg),
      shuntFraction: shuntFractionAtPeep(profile.shuntCurve, settings.peepCmH2O),
      alveolarVentilationLpm: 0,
      meanArterialPressureMmHg: engineCase.hemodynamics.baselineMapMmHg,
    },
    appliedCaseEvents: [],
    waveform: {
      capacity: resolvedOptions.waveformCapacity,
      samples: [],
      head: 0,
      count: 0,
      droppedSamples: 0,
    },
  };
}

export function applyEvent(state: EngineState, event: EngineEvent): void {
  if (event.type === "PARAM_CHANGE") {
    applyParamChange(state, event.changes);

    return;
  }

  if (event.type === "RECONNECT") {
    state.conditions.disconnected = false;
    state.schedule.nextSlowUpdateAtMs = state.simTimeMs;

    return;
  }

  const unknownType: string = (event as { type: string }).type;

  throw new EngineValidationError("INVALID_EVENT", "type", `Unsupported engine event type ${unknownType}`);
}

export function step(state: EngineState, dtMs: number): void {
  if (!Number.isFinite(dtMs) || dtMs < 0) {
    throw new EngineValidationError("INVALID_OPTION", "dtMs", "dtMs must be a finite non-negative number");
  }

  state.pendingMs += dtMs;

  while (state.pendingMs >= INTERNAL_STEP_MS) {
    advanceOneStep(state);
    state.pendingMs -= INTERNAL_STEP_MS;
  }
}

export function getWaveformBuffer(state: EngineState): WaveformBatch {
  const ring: WaveformRingState = state.waveform;
  const samples: WaveformSample[] = [];

  for (let offset: number = 0; offset < ring.count; offset += 1) {
    samples.push(ring.samples[(ring.head + offset) % ring.capacity]);
  }

  const droppedSamples: number = ring.droppedSamples;

  ring.head = 0;
  ring.count = 0;
  ring.droppedSamples = 0;

  return { samples, droppedSamples };
}

export function getMetrics(state: EngineState): EngineMetrics {
  const nowMs: number = state.simTimeMs;
  const settings: VentilatorSettings = state.settings;
  const gas: GasExchangeState = state.gas;
  const lastCycle: CycleMetrics | null = state.lastCycle;
  const spontaneousOnly: boolean = settings.mode === "PSV" || settings.mode === "CPAP";
  const referenceBreathMs: number = spontaneousOnly
    ? state.schedule.lastTriggeredBreathStartMs
    : state.schedule.lastBreathStartMs;
  const ventilation: VentilationSummary = summarizeVentilation(
    state.breathHistory,
    nowMs,
    state.engineCase.gasExchange.deadSpaceMl,
  );
  const alarms: Alarm[] = evaluateAlarms({
    lastCycle,
    thresholds: state.alarmThresholds,
    predictedBodyWeightKg: state.predictedBodyWeightKg,
    msSinceLastBreath: nowMs - referenceBreathMs,
    apneaTimeMs: settings.apneaTimeS * 1000,
    disconnected: state.conditions.disconnected,
  });
  const targets: TargetStatus[] = evaluateTargets(state.engineCase.targets, gas, lastCycle);

  return {
    engineVersion: state.engineVersion,
    simTimeMs: nowMs,
    lastCycle,
    ventilation,
    gasExchange: {
      paco2MmHg: gas.paco2MmHg,
      paco2EquilibriumMmHg: gas.paco2EquilibriumMmHg,
      ph: gas.ph,
      pao2MmHg: gas.pao2MmHg,
      pao2EquilibriumMmHg: gas.pao2EquilibriumMmHg,
      spo2Percent: gas.spo2Percent,
      alveolarPo2MmHg: gas.alveolarPo2MmHg,
      shuntFraction: gas.shuntFraction,
      alveolarVentilationLpm: gas.alveolarVentilationLpm,
    },
    hemodynamics: { meanArterialPressureMmHg: gas.meanArterialPressureMmHg },
    conditions: {
      resistanceCmH2OPerLps: currentResistance(state),
      complianceMlPerCmH2O: currentCompliance(state),
      disconnected: state.conditions.disconnected,
      deteriorationLevel: state.conditions.deteriorationLevel,
      appliedCaseEvents: [...state.appliedCaseEvents],
    },
    alarms,
    targets,
  };
}

export function replay(
  engineCase: EngineCase,
  seed: number,
  events: readonly EngineEvent[],
  untilMs: number,
  options: ReplayOptions = {},
): ReplayResult {
  if (!Number.isFinite(untilMs) || untilMs < 0) {
    throw new EngineValidationError("INVALID_OPTION", "untilMs", "untilMs must be a finite non-negative number");
  }

  const metricsIntervalMs: number = options.metricsIntervalMs ?? DEFAULT_METRICS_INTERVAL_MS;

  if (!Number.isFinite(metricsIntervalMs) || metricsIntervalMs <= 0) {
    throw new EngineValidationError("INVALID_OPTION", "metricsIntervalMs", "metricsIntervalMs must be positive");
  }

  const state: EngineState = createSimulation(engineCase, seed, options);
  const orderedEvents: EngineEvent[] = [...events].sort(
    (a: EngineEvent, b: EngineEvent): number => a.simTimeMs - b.simTimeMs,
  );
  const metricsTimeline: EngineMetrics[] = [];
  let eventIndex: number = 0;
  let nextSnapshotMs: number = metricsIntervalMs;

  while (state.simTimeMs < untilMs) {
    const nextEventMs: number =
      eventIndex < orderedEvents.length ? orderedEvents[eventIndex].simTimeMs : Number.POSITIVE_INFINITY;

    advanceTo(state, min(untilMs, nextSnapshotMs, nextEventMs));

    while (eventIndex < orderedEvents.length && orderedEvents[eventIndex].simTimeMs <= state.simTimeMs) {
      applyEvent(state, orderedEvents[eventIndex]);
      eventIndex += 1;
    }

    if (state.simTimeMs >= nextSnapshotMs) {
      metricsTimeline.push(getMetrics(state));
      nextSnapshotMs += metricsIntervalMs;
    }
  }

  return { metricsTimeline, final: getMetrics(state) };
}

function advanceTo(state: EngineState, targetMs: number): void {
  while (state.simTimeMs < targetMs) {
    advanceOneStep(state);
  }
}

function advanceOneStep(state: EngineState): void {
  const nowMs: number = state.simTimeMs;

  applyDueCaseEvents(state, nowMs);
  state.prngState = advanceEffortCycle(state.effort, nowMs, state.options.noise, state.prngState);

  const muscularPressureCmH2O: number = muscularPressure(state.effort, nowMs + INTERNAL_STEP_MS / 2);
  const complianceMlPerCmH2O: number = currentCompliance(state);
  const resistanceCmH2OPerLps: number = currentResistance(state);

  updateBreathControl(state, nowMs, muscularPressureCmH2O, complianceMlPerCmH2O);
  integrateLung(state, nowMs, muscularPressureCmH2O, resistanceCmH2OPerLps, complianceMlPerCmH2O);
  state.simTimeMs = nowMs + INTERNAL_STEP_MS;
  recordWaveformSample(state);

  if (state.simTimeMs >= state.schedule.nextSlowUpdateAtMs) {
    runSlowUpdate(state);
  }
}

function integrateLung(
  state: EngineState,
  nowMs: number,
  muscularPressureCmH2O: number,
  resistanceCmH2OPerLps: number,
  complianceMlPerCmH2O: number,
): void {
  const lung: LungState = state.lung;
  const breath: BreathState = state.breath;
  const target: PhysicsTarget = resolvePhysicsTarget(state, nowMs, INTERNAL_STEP_MS);
  const previousVolumeMl: number = lung.volumeAboveFrcMl;
  let nextVolumeMl: number;
  let airwayPressureCmH2O: number;

  if (target.kind === "FLOW") {
    nextVolumeMl = previousVolumeMl + target.flowLps * INTERNAL_STEP_MS;
    airwayPressureCmH2O = airwayPressureFromFlow(
      nextVolumeMl,
      target.flowLps,
      muscularPressureCmH2O,
      resistanceCmH2OPerLps,
      complianceMlPerCmH2O,
    );
  } else {
    nextVolumeMl = advanceVolumeUnderPressure(
      previousVolumeMl,
      target.pressureCmH2O,
      muscularPressureCmH2O,
      resistanceCmH2OPerLps,
      complianceMlPerCmH2O,
      INTERNAL_STEP_MS,
    );
    airwayPressureCmH2O = target.pressureCmH2O;
  }

  const deltaMl: number = nextVolumeMl - previousVolumeMl;
  const disconnected: boolean = state.conditions.disconnected;

  lung.volumeAboveFrcMl = nextVolumeMl;
  lung.muscularPressureCmH2O = muscularPressureCmH2O;
  lung.measuredFlowLps = disconnected ? 0 : deltaMl / INTERNAL_STEP_MS;
  lung.measuredPressureCmH2O = disconnected ? 0 : airwayPressureCmH2O;
  lung.measuredVolumeMl = disconnected ? 0 : nextVolumeMl - breath.startVolumeMl;

  breath.peakPressureCmH2O = max(breath.peakPressureCmH2O, lung.measuredPressureCmH2O);
  breath.pressureTimeIntegral += lung.measuredPressureCmH2O * INTERNAL_STEP_MS;

  if (disconnected) {
    return;
  }

  if (breath.phase === "EXPIRATION") {
    breath.exhaledMl += max(0, -deltaMl);

    return;
  }

  breath.inspiredMl += max(0, deltaMl);
  breath.peakInspiratoryFlowLps = max(breath.peakInspiratoryFlowLps, lung.measuredFlowLps);
}

function recordWaveformSample(state: EngineState): void {
  if (state.simTimeMs < state.schedule.nextSampleAtMs) {
    return;
  }

  const ring: WaveformRingState = state.waveform;
  const sample: WaveformSample = {
    simTimeMs: state.simTimeMs,
    pressureCmH2O: state.lung.measuredPressureCmH2O,
    flowLpm: state.lung.measuredFlowLps * 60,
    volumeMl: state.lung.measuredVolumeMl,
  };

  ring.samples[(ring.head + ring.count) % ring.capacity] = sample;

  if (ring.count < ring.capacity) {
    ring.count += 1;
  } else {
    ring.head = (ring.head + 1) % ring.capacity;
    ring.droppedSamples += 1;
  }

  state.schedule.nextSampleAtMs += 1000 / state.options.sampleRateHz;
}

function runSlowUpdate(state: EngineState): void {
  const nowMs: number = state.simTimeMs;
  const elapsedMs: number = nowMs - state.schedule.lastSlowUpdateAtMs;
  const multiplier: number = state.options.slowDynamicsMultiplier;
  const profile: GasExchangeProfile = state.engineCase.gasExchange;
  const gas: GasExchangeState = state.gas;
  const disconnected: boolean = state.conditions.disconnected;
  const lastCycle: CycleMetrics | null = state.lastCycle;
  const summary: VentilationSummary = summarizeVentilation(state.breathHistory, nowMs, profile.deadSpaceMl);

  gas.alveolarVentilationLpm = summary.alveolarVentilationLpm;

  if (state.cycleCount > 0) {
    gas.paco2EquilibriumMmHg = equilibriumPaco2(profile.vco2MlPerMin, summary.alveolarVentilationLpm);
  }

  gas.paco2MmHg = firstOrderApproach(
    gas.paco2MmHg,
    gas.paco2EquilibriumMmHg,
    elapsedMs,
    (profile.paco2TimeConstantMin * 60000) / multiplier,
  );
  gas.ph = arterialPh(profile.bicarbonateMmolPerL, gas.paco2MmHg);

  const fio2: number = disconnected ? 0.21 : state.settings.fio2;
  const effectivePeepCmH2O: number = disconnected ? 0 : (lastCycle?.totalPeepCmH2O ?? state.settings.peepCmH2O);
  const deteriorationShunt: number = state.conditions.deteriorationLevel * state.engineCase.deterioration.maxShuntIncrease;
  const shuntFraction: number =
    shuntFractionAtPeep(profile.shuntCurve, effectivePeepCmH2O) + state.conditions.shuntIncrease + deteriorationShunt;

  gas.shuntFraction = min(MAX_SHUNT_FRACTION, max(0, shuntFraction));
  gas.alveolarPo2MmHg = alveolarPo2(fio2, gas.paco2MmHg);
  gas.pao2EquilibriumMmHg = equilibriumPao2(
    gas.alveolarPo2MmHg,
    gas.shuntFraction,
    profile.hemoglobinGPerDl,
    profile.arteriovenousO2DifferenceMlPerDl,
  );
  gas.pao2MmHg = firstOrderApproach(
    gas.pao2MmHg,
    gas.pao2EquilibriumMmHg,
    elapsedMs,
    (profile.oxygenTimeConstantS * 1000) / multiplier,
  );
  gas.spo2Percent = severinghausSaturation(gas.pao2MmHg);

  const meanAirwayPressureCmH2O: number = disconnected
    ? 0
    : (lastCycle?.meanAirwayPressureCmH2O ?? state.settings.peepCmH2O);

  gas.meanArterialPressureMmHg = meanArterialPressure(state.engineCase.hemodynamics, meanAirwayPressureCmH2O);

  const statuses: TargetStatus[] = evaluateTargets(state.engineCase.targets, gas, lastCycle);

  if (hasUnmetTarget(statuses)) {
    const increment: number = (state.engineCase.deterioration.ratePerMin * elapsedMs * multiplier) / 60000;

    state.conditions.deteriorationLevel = min(1, state.conditions.deteriorationLevel + max(0, increment));
  }

  state.schedule.lastSlowUpdateAtMs = nowMs;
  state.schedule.nextSlowUpdateAtMs = nowMs + SLOW_UPDATE_INTERVAL_MS;
}

function applyDueCaseEvents(state: EngineState, nowMs: number): void {
  while (
    state.schedule.nextCaseEventIndex < state.caseEvents.length &&
    state.caseEvents[state.schedule.nextCaseEventIndex].simTimeMs <= nowMs
  ) {
    const caseEvent: CaseEvent = state.caseEvents[state.schedule.nextCaseEventIndex];

    applyCaseEvent(state, caseEvent, nowMs);
    state.schedule.nextCaseEventIndex += 1;
  }
}

function applyCaseEvent(state: EngineState, caseEvent: CaseEvent, nowMs: number): void {
  switch (caseEvent.type) {
    case "BRONCHOSPASM":
    case "SECRETIONS":
      state.conditions.resistanceFactor *= positiveFactor(caseEvent.resistanceFactor);
      break;
    case "DERECRUITMENT":
      state.conditions.complianceFactor *= positiveFactor(caseEvent.complianceFactor);
      state.conditions.shuntIncrease += caseEvent.shuntIncrease ?? 0;
      break;
    case "DISCONNECTION":
      state.conditions.disconnected = true;
      break;
    case "RECONNECTION":
      state.conditions.disconnected = false;
      break;
    case "EFFORT_CHANGE":
      updateEffortProfile(state.effort, caseEvent.effortAmplitudeCmH2O, caseEvent.effortRateBpm, nowMs);
      break;
  }

  state.appliedCaseEvents.push({ type: caseEvent.type, scheduledAtMs: caseEvent.simTimeMs, appliedAtMs: nowMs });
  state.schedule.nextSlowUpdateAtMs = nowMs;
}

function applyParamChange(state: EngineState, changes: Partial<VentilatorSettings>): void {
  const previous: VentilatorSettings = state.settings;
  const merged: VentilatorSettings = { ...previous, ...changes };

  validateVentilatorSettings(merged);
  state.settings = merged;

  if (previous.mode !== merged.mode || previous.respiratoryRateBpm !== merged.respiratoryRateBpm) {
    rescheduleMandatory(state);
  }

  state.schedule.nextSlowUpdateAtMs = state.simTimeMs;
}

function rescheduleMandatory(state: EngineState): void {
  if (!hasTimedMandatoryBreaths(state.settings.mode)) {
    state.schedule.nextMandatoryAtMs = null;

    return;
  }

  const lastMandatoryStartMs: number | null = state.schedule.lastMandatoryStartMs;

  state.schedule.nextMandatoryAtMs =
    lastMandatoryStartMs === null
      ? state.simTimeMs
      : max(state.simTimeMs, lastMandatoryStartMs + breathPeriodMs(state.settings));
}

function currentCompliance(state: EngineState): number {
  const deteriorationLoss: number =
    state.conditions.deteriorationLevel * state.engineCase.deterioration.maxComplianceLossFraction;
  const compliance: number =
    state.engineCase.mechanics.complianceMlPerCmH2O * state.conditions.complianceFactor * (1 - deteriorationLoss);

  return max(MIN_EFFECTIVE_COMPLIANCE_ML_PER_CMH2O, compliance);
}

function currentResistance(state: EngineState): number {
  return state.engineCase.mechanics.resistanceCmH2OPerLps * state.conditions.resistanceFactor;
}

function positiveFactor(factor: number | undefined): number {
  return factor !== undefined && factor > 0 ? factor : 1;
}

function resolveOptions(options: EngineOptions): ResolvedEngineOptions {
  const sampleRateHz: number = options.sampleRateHz ?? DEFAULT_SAMPLE_RATE_HZ;
  const timeMultiplier: TimeMultiplier = options.timeMultiplier ?? 1;
  const waveformCapacity: number = options.waveformCapacity ?? DEFAULT_WAVEFORM_CAPACITY;

  if (!Number.isFinite(sampleRateHz) || sampleRateHz <= 0 || sampleRateHz > MAX_SAMPLE_RATE_HZ) {
    throw new EngineValidationError("INVALID_OPTION", "sampleRateHz", `sampleRateHz must be in (0, ${MAX_SAMPLE_RATE_HZ}]`);
  }

  if (!TIME_MULTIPLIERS.includes(timeMultiplier)) {
    throw new EngineValidationError("INVALID_OPTION", "timeMultiplier", "timeMultiplier must be 1, 2 or 4");
  }

  if (!Number.isInteger(waveformCapacity) || waveformCapacity < 1) {
    throw new EngineValidationError("INVALID_OPTION", "waveformCapacity", "waveformCapacity must be a positive integer");
  }

  return {
    sampleRateHz,
    noise: options.noise ?? true,
    slowDynamicsMultiplier: timeMultiplier,
    waveformCapacity,
  };
}

function validateCase(engineCase: EngineCase): void {
  const profile: GasExchangeProfile = engineCase.gasExchange;
  const positiveFields: ReadonlyArray<[string, number]> = [
    ["mechanics.complianceMlPerCmH2O", engineCase.mechanics.complianceMlPerCmH2O],
    ["mechanics.resistanceCmH2OPerLps", engineCase.mechanics.resistanceCmH2OPerLps],
    ["patient.heightCm", engineCase.patient.heightCm],
    ["gasExchange.vco2MlPerMin", profile.vco2MlPerMin],
    ["gasExchange.bicarbonateMmolPerL", profile.bicarbonateMmolPerL],
    ["gasExchange.hemoglobinGPerDl", profile.hemoglobinGPerDl],
    ["gasExchange.arteriovenousO2DifferenceMlPerDl", profile.arteriovenousO2DifferenceMlPerDl],
    ["gasExchange.initialPaco2MmHg", profile.initialPaco2MmHg],
    ["gasExchange.initialPao2MmHg", profile.initialPao2MmHg],
    ["gasExchange.paco2TimeConstantMin", profile.paco2TimeConstantMin],
    ["gasExchange.oxygenTimeConstantS", profile.oxygenTimeConstantS],
  ];

  for (const [field, value] of positiveFields) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new EngineValidationError("INVALID_CASE", field, `${field} must be a positive finite number`);
    }
  }

  if (!Number.isFinite(profile.deadSpaceMl) || profile.deadSpaceMl < 0) {
    throw new EngineValidationError("INVALID_CASE", "gasExchange.deadSpaceMl", "deadSpaceMl must be non-negative");
  }

  for (const caseEvent of engineCase.events) {
    if (!Number.isFinite(caseEvent.simTimeMs) || caseEvent.simTimeMs < 0) {
      throw new EngineValidationError("INVALID_CASE", "events.simTimeMs", "Case event times must be non-negative");
    }
  }
}
