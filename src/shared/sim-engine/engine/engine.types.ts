/*
* Funcionalidad: Tipos del motor fisiológico
* Descripción: GENERATED — do not edit; run node scripts/sync-sim-engine.mjs. Vendored copy of ventylab-server/src/features/simulation/domain/engine/engine.types.ts. Contratos del motor de simulación determinista: caso clínico, ajustes del ventilador, eventos, estado interno, muestras de onda, métricas por ciclo, intercambio gaseoso, alarmas, objetivos y resultado de repetición
* Versión: 2.0 (evolución opcional del paciente: gravedad, frecuencia cardíaca, estado y alarmas del paciente)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/
// @ts-nocheck -- vendored backend engine, type-checked by ventylab-server's tsc
export type EngineVentilationMode = "VCV" | "PCV" | "PSV" | "CPAP" | "SIMV";

export type FlowPattern = "SQUARE" | "DECELERATING";

export type TriggerType = "FLOW" | "PRESSURE";

export type MandatoryBreathType = "VCV" | "PCV";

export type PatientSex = "MALE" | "FEMALE";

export type TimeMultiplier = 1 | 2 | 4;

export interface VentilatorSettings {
  mode: EngineVentilationMode;
  tidalVolumeMl: number;
  respiratoryRateBpm: number;
  peepCmH2O: number;
  fio2: number;
  inspiratoryTimeS: number;
  flowPattern: FlowPattern;
  inspiratoryPauseS: number;
  inspiratoryPressureCmH2O: number;
  pressureSupportCmH2O: number;
  triggerType: TriggerType;
  flowTriggerLpm: number;
  pressureTriggerCmH2O: number;
  cycleOffPercent: number;
  apneaTimeS: number;
  simvMandatoryType: MandatoryBreathType;
}

export interface NumericRange {
  readonly min: number;
  readonly max: number;
}

export interface EnginePatient {
  readonly sex: PatientSex;
  readonly heightCm: number;
}

export interface EngineMechanics {
  readonly complianceMlPerCmH2O: number;
  readonly resistanceCmH2OPerLps: number;
}

export interface PatientEffortProfile {
  readonly amplitudeCmH2O: number;
  readonly rateBpm: number;
  readonly inspiratoryFraction: number;
}

export interface ShuntCurvePoint {
  readonly peepCmH2O: number;
  readonly shuntFraction: number;
}

export interface GasExchangeProfile {
  readonly vco2MlPerMin: number;
  readonly deadSpaceMl: number;
  readonly bicarbonateMmolPerL: number;
  readonly hemoglobinGPerDl: number;
  readonly arteriovenousO2DifferenceMlPerDl: number;
  readonly initialPaco2MmHg: number;
  readonly initialPao2MmHg: number;
  readonly paco2TimeConstantMin: number;
  readonly oxygenTimeConstantS: number;
  readonly shuntCurve: readonly ShuntCurvePoint[];
}

export interface HemodynamicProfile {
  readonly baselineMapMmHg: number;
  readonly meanAirwayPressureThresholdCmH2O: number;
  readonly mapDropPerCmH2O: number;
}

export interface DeteriorationProfile {
  readonly ratePerMin: number;
  readonly maxComplianceLossFraction: number;
  readonly maxShuntIncrease: number;
}

export type CaseEventType = "BRONCHOSPASM" | "SECRETIONS" | "DERECRUITMENT" | "DISCONNECTION" | "RECONNECTION" | "EFFORT_CHANGE";

export interface CaseEvent {
  readonly simTimeMs: number;
  readonly type: CaseEventType;
  readonly resistanceFactor?: number;
  readonly complianceFactor?: number;
  readonly shuntIncrease?: number;
  readonly effortAmplitudeCmH2O?: number;
  readonly effortRateBpm?: number;
}

export interface EngineTargets {
  readonly spo2Percent?: NumericRange;
  readonly paco2MmHg?: NumericRange;
  readonly ph?: NumericRange;
  readonly plateauPressureMaxCmH2O?: number;
  readonly drivingPressureMaxCmH2O?: number;
  readonly tidalVolumePerKgPbw?: NumericRange;
  readonly autoPeepMaxCmH2O?: number;
}

export interface AlarmThresholds {
  readonly highPressureCmH2O: number;
  readonly lowTidalVolumeMlPerKgPbw: number;
  readonly highTidalVolumeMlPerKgPbw: number;
  readonly highRespiratoryRateBpm: number;
  readonly autoPeepCmH2O: number;
  readonly lowSpo2Percent: number;
  readonly lowMapMmHg: number;
  readonly tachycardiaBpm: number;
  readonly bradycardiaBpm: number;
}

export interface EvolutionThresholds {
  readonly hypoxemiaSpo2Percent: number;
  readonly acidosisPh: number;
  readonly plateauMaxCmH2O: number;
  readonly drivingPressureMaxCmH2O: number;
  readonly autoPeepMaxCmH2O: number;
  readonly hypotensionMapMmHg: number;
  readonly criticalSpo2Percent: number;
  readonly criticalPh: number;
  readonly criticalMapMmHg: number;
}

// Optional time-evolution block (engine 2.0.0). Without it the engine keeps the 1.0.0 behaviour.
export interface EvolutionProfile {
  readonly initialSeverity: number;
  readonly minSeverity: number;
  readonly progressionRatePerMin: number;
  readonly viliRatePerMin: number;
  readonly recoveryRatePerMin: number;
  readonly arrestAfterCriticalMin: number;
  readonly deathAfterArrestMin: number;
  readonly baselineHeartRateBpm: number;
  readonly thresholds?: Partial<EvolutionThresholds>;
}

export interface EngineCase {
  readonly id: string;
  readonly patient: EnginePatient;
  readonly mechanics: EngineMechanics;
  readonly effort: PatientEffortProfile;
  readonly gasExchange: GasExchangeProfile;
  readonly hemodynamics: HemodynamicProfile;
  readonly deterioration: DeteriorationProfile;
  readonly initialSettings: Partial<VentilatorSettings>;
  readonly events: readonly CaseEvent[];
  readonly targets: EngineTargets;
  readonly alarmThresholds?: Partial<AlarmThresholds>;
  readonly evolution?: EvolutionProfile;
}

export interface EngineOptions {
  readonly sampleRateHz?: number;
  readonly noise?: boolean;
  readonly timeMultiplier?: TimeMultiplier;
  readonly waveformCapacity?: number;
}

export interface ResolvedEngineOptions {
  readonly sampleRateHz: number;
  readonly noise: boolean;
  readonly slowDynamicsMultiplier: TimeMultiplier;
  readonly waveformCapacity: number;
}

export interface ReplayOptions extends EngineOptions {
  readonly metricsIntervalMs?: number;
}

export interface ParamChangeEvent {
  readonly type: "PARAM_CHANGE";
  readonly simTimeMs: number;
  readonly changes: Partial<VentilatorSettings>;
}

export interface ReconnectEvent {
  readonly type: "RECONNECT";
  readonly simTimeMs: number;
}

export type EngineEvent = ParamChangeEvent | ReconnectEvent;

export type BreathKind = "IDLE" | "MANDATORY_VOLUME" | "MANDATORY_PRESSURE" | "SPONTANEOUS";

export type BreathPhase = "INSPIRATION" | "PAUSE" | "EXPIRATION";

export type BreathType = "MANDATORY" | "SPONTANEOUS";

export interface BreathState {
  kind: BreathKind;
  phase: BreathPhase;
  triggered: boolean;
  startMs: number;
  inspiratoryTimeMs: number;
  pauseMs: number;
  tidalVolumeMl: number;
  flowPattern: FlowPattern;
  inspiratoryPressureCmH2O: number;
  peepCmH2O: number;
  cycleOffPercent: number;
  expirationStartMs: number;
  startVolumeMl: number;
  startTotalPeepCmH2O: number;
  plateauCmH2O: number;
  peakPressureCmH2O: number;
  peakInspiratoryFlowLps: number;
  inspiredMl: number;
  exhaledMl: number;
  pressureTimeIntegral: number;
}

export interface BreathRecord {
  readonly startMs: number;
  readonly endMs: number;
  readonly mandatory: boolean;
  readonly exhaledMl: number;
}

export interface LungState {
  volumeAboveFrcMl: number;
  measuredFlowLps: number;
  measuredPressureCmH2O: number;
  measuredVolumeMl: number;
  muscularPressureCmH2O: number;
}

export interface EffortState {
  cycleIndex: number;
  cycleStartMs: number;
  periodMs: number;
  inspiratoryMs: number;
  amplitudeCmH2O: number;
  baseAmplitudeCmH2O: number;
  baseRateBpm: number;
  inspiratoryFraction: number;
}

export interface ConditionsState {
  resistanceFactor: number;
  complianceFactor: number;
  shuntIncrease: number;
  disconnected: boolean;
  deteriorationLevel: number;
}

export interface ScheduleState {
  nextMandatoryAtMs: number | null;
  lastMandatoryStartMs: number | null;
  lastBreathStartMs: number;
  lastTriggeredBreathStartMs: number;
  lastTriggeredEffortCycle: number;
  nextSampleAtMs: number;
  nextSlowUpdateAtMs: number;
  lastSlowUpdateAtMs: number;
  nextCaseEventIndex: number;
}

export interface GasExchangeState {
  paco2MmHg: number;
  paco2EquilibriumMmHg: number;
  pao2MmHg: number;
  pao2EquilibriumMmHg: number;
  spo2Percent: number;
  ph: number;
  alveolarPo2MmHg: number;
  shuntFraction: number;
  alveolarVentilationLpm: number;
  meanArterialPressureMmHg: number;
}

export type PatientStatus = "STABLE" | "UNSTABLE" | "CRITICAL" | "ARREST" | "DECEASED";

export type PatientInsult = "HYPOXEMIA" | "ACIDOSIS" | "LUNG_INJURY_RISK" | "AIR_TRAPPING" | "HYPOTENSION";

export interface PatientState {
  status: PatientStatus;
  severity: number;
  heartRateBpm: number;
  insults: PatientInsult[];
  criticalExposureMin: number;
  arrestElapsedMin: number;
  firstCriticalAtMs: number | null;
  arrestAtMs: number | null;
  deceasedAtMs: number | null;
}

export interface WaveformSample {
  readonly simTimeMs: number;
  readonly pressureCmH2O: number;
  readonly flowLpm: number;
  readonly volumeMl: number;
}

export interface WaveformRingState {
  readonly capacity: number;
  readonly samples: WaveformSample[];
  head: number;
  count: number;
  droppedSamples: number;
}

export interface WaveformBatch {
  readonly samples: WaveformSample[];
  readonly droppedSamples: number;
}

export interface AppliedCaseEvent {
  readonly type: CaseEventType;
  readonly scheduledAtMs: number;
  readonly appliedAtMs: number;
}

export interface CycleMetrics {
  readonly cycleIndex: number;
  readonly startMs: number;
  readonly endMs: number;
  readonly breathType: BreathType;
  readonly triggered: boolean;
  readonly peakPressureCmH2O: number;
  readonly plateauPressureCmH2O: number;
  readonly totalPeepCmH2O: number;
  readonly autoPeepCmH2O: number;
  readonly drivingPressureCmH2O: number;
  readonly meanAirwayPressureCmH2O: number;
  readonly inspiredTidalVolumeMl: number;
  readonly exhaledTidalVolumeMl: number;
  readonly tidalVolumePerKgPbw: number;
  readonly inspiratoryTimeMs: number;
  readonly expiratoryTimeMs: number;
  readonly ieRatio: number;
  readonly totalRespiratoryRateBpm: number;
  readonly mandatoryRateBpm: number;
  readonly spontaneousRateBpm: number;
  readonly minuteVolumeLpm: number;
  readonly mechanicalPowerJPerMin: number;
}

export interface VentilationSummary {
  readonly totalRespiratoryRateBpm: number;
  readonly mandatoryRateBpm: number;
  readonly spontaneousRateBpm: number;
  readonly minuteVolumeLpm: number;
  readonly alveolarVentilationLpm: number;
}

export interface EngineState {
  readonly engineVersion: string;
  readonly engineCase: EngineCase;
  readonly options: ResolvedEngineOptions;
  readonly predictedBodyWeightKg: number;
  readonly alarmThresholds: AlarmThresholds;
  readonly caseEvents: readonly CaseEvent[];
  simTimeMs: number;
  pendingMs: number;
  prngState: number;
  cycleCount: number;
  settings: VentilatorSettings;
  conditions: ConditionsState;
  effort: EffortState;
  lung: LungState;
  breath: BreathState;
  schedule: ScheduleState;
  breathHistory: BreathRecord[];
  lastCycle: CycleMetrics | null;
  gas: GasExchangeState;
  appliedCaseEvents: AppliedCaseEvent[];
  waveform: WaveformRingState;
  // Null without an evolution block (engine 1.0.0 behaviour).
  patient: PatientState | null;
  evolutionThresholds: EvolutionThresholds | null;
}

export type AlarmCode =
  | "HIGH_PRESSURE"
  | "LOW_TIDAL_VOLUME"
  | "HIGH_TIDAL_VOLUME"
  | "APNEA"
  | "HIGH_RESPIRATORY_RATE"
  | "AUTO_PEEP"
  | "DISCONNECTION"
  | "LOW_SPO2"
  | "LOW_MAP"
  | "TACHYCARDIA"
  | "BRADYCARDIA"
  | "CARDIAC_ARREST";

export type AlarmSeverity = "HIGH" | "MEDIUM";

export interface Alarm {
  readonly code: AlarmCode;
  readonly severity: AlarmSeverity;
  readonly value: number;
  readonly threshold: number;
}

export type TargetId = "SPO2" | "PACO2" | "PH" | "PLATEAU_PRESSURE" | "DRIVING_PRESSURE" | "TIDAL_VOLUME_PER_KG_PBW" | "AUTO_PEEP";

export type TargetStatusValue = "MET" | "UNMET" | "UNKNOWN";

export interface TargetStatus {
  readonly id: TargetId;
  readonly status: TargetStatusValue;
  readonly value: number | null;
  readonly min: number | null;
  readonly max: number | null;
}

export interface GasExchangeSnapshot {
  readonly paco2MmHg: number;
  readonly paco2EquilibriumMmHg: number;
  readonly ph: number;
  readonly pao2MmHg: number;
  readonly pao2EquilibriumMmHg: number;
  readonly spo2Percent: number;
  readonly alveolarPo2MmHg: number;
  readonly shuntFraction: number;
  readonly alveolarVentilationLpm: number;
}

export interface HemodynamicSnapshot {
  readonly meanArterialPressureMmHg: number;
  // Null without an evolution block (engine 1.0.0 behaviour).
  readonly heartRateBpm: number | null;
}

export interface PatientSnapshot {
  readonly status: PatientStatus;
  readonly severity: number;
  readonly heartRateBpm: number;
  readonly insults: readonly PatientInsult[];
  readonly criticalExposureMin: number;
  readonly firstCriticalAtMs: number | null;
  readonly arrestAtMs: number | null;
  readonly deceasedAtMs: number | null;
}

export interface ConditionsSnapshot {
  readonly resistanceCmH2OPerLps: number;
  readonly complianceMlPerCmH2O: number;
  readonly disconnected: boolean;
  readonly deteriorationLevel: number;
  readonly appliedCaseEvents: readonly AppliedCaseEvent[];
}

export interface EngineMetrics {
  readonly engineVersion: string;
  readonly simTimeMs: number;
  readonly lastCycle: CycleMetrics | null;
  readonly ventilation: VentilationSummary;
  readonly gasExchange: GasExchangeSnapshot;
  readonly hemodynamics: HemodynamicSnapshot;
  readonly conditions: ConditionsSnapshot;
  readonly alarms: readonly Alarm[];
  readonly targets: readonly TargetStatus[];
  // Null without an evolution block (engine 1.0.0 behaviour).
  readonly patient: PatientSnapshot | null;
}

export interface ReplayResult {
  readonly metricsTimeline: readonly EngineMetrics[];
  readonly final: EngineMetrics;
}
