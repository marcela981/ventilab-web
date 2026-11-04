/*
* Funcionalidad: Simulation live state
* Descripción: Pure helpers shared by the running session and the replay (W2, Bloque 1): the low-frequency live state
*   of a simulation (simulated time, latest engine metrics, console alarms with their onset kept while active, vitals
*   trends) folded from the worker batches, and the console adapter snapshot built from it plus the applied settings,
*   the stable frame source, the control permission and the stable confirm callback. The caller publishes the
*   snapshots through the console external store (`reuseUnchangedSlices` keeps the identity of unchanged slices).
*   Depends on the sim-engine console binding and the ventilator-console contract. v0.2 (Bloque 5, C4): the live
*   state also folds the waveform samples into the flow extremes of the last breath (foldCycleFlow), published with
*   the mean airway pressure as the July card metrics.
* Versión: 0.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { EngineMetrics, EngineTargets, SimBatch, VentilatorSettings } from "@shared/sim-engine";
import {
  appendTrends,
  buildConsoleLimits,
  foldCycleFlow,
  INITIAL_CYCLE_FLOW,
  MODE_OPTIONS,
  rangesFromTargets,
  toConsoleAlarms,
  toConsoleMetrics,
  toConsoleSettings,
  toPatientValues,
} from "@shared/sim-engine/console-binding";
import type { CycleFlow, PatientTrends } from "@shared/sim-engine/console-binding";
import type { ConsoleAlarm, ConsoleConfirmation, ConsoleFrameSource, VentilatorConsoleAdapter } from "@shared/ventilator-console";

export type SimLiveState = {
  simTimeMs: number
  /** Latest engine metrics snapshot; null before the first one. */
  metrics: EngineMetrics | null
  alarms: readonly ConsoleAlarm[]
  trends: PatientTrends
  /** v0.2: flow extremes of the last completed breath, from the waveform samples. */
  cycleFlow: CycleFlow
};

export function initialLiveState(simTimeMs: number): SimLiveState {
  return { simTimeMs, metrics: null, alarms: [], trends: {}, cycleFlow: INITIAL_CYCLE_FLOW };
}

type LiveBatch = Pick<SimBatch, "simTimeMs" | "metrics" | "alarms"> & Partial<Pick<SimBatch, "samples">>;

/**
 * Folds one worker batch: the time always moves and the samples feed the breath flow extremes; metrics, alarms and
 * trends only change with a metrics snapshot.
 */
export function ingestBatch(state: SimLiveState, batch: LiveBatch): SimLiveState {
  const cycleFlow = foldCycleFlow(state.cycleFlow, batch.samples ?? [], batch.metrics?.lastCycle ?? null);

  if (!batch.metrics) {
    return { ...state, simTimeMs: batch.simTimeMs, cycleFlow };
  }

  return {
    simTimeMs: batch.simTimeMs,
    metrics: batch.metrics,
    alarms: toConsoleAlarms(batch.alarms, batch.simTimeMs, state.alarms),
    trends: appendTrends(state.trends, toPatientValues(batch.metrics)),
    cycleFlow,
  };
}

export type SimConsoleInput = {
  /** Stable frame source of the data origin (the curves keep their subscription). */
  frames: ConsoleFrameSource
  applied: VentilatorSettings
  live: SimLiveState
  canControl: boolean
  /** Stable callback (a replay passes a no-op). */
  onConfirm: (confirmation: ConsoleConfirmation) => void
  targets: EngineTargets
};

/** The console adapter snapshot of a simulation: the engine has no hold maneuvers and fixed alarm thresholds per case. */
export function buildSimConsoleAdapter({ frames, applied, live, canControl, onConfirm, targets }: SimConsoleInput): VentilatorConsoleAdapter {
  const values = toConsoleSettings(applied);

  return {
    frames,
    settings: { current: values, applied: values },
    mode: { current: applied.mode, options: MODE_OPTIONS },
    metrics: toConsoleMetrics(live.metrics, applied, live.cycleFlow),
    patient: { values: toPatientValues(live.metrics), trends: live.trends },
    alarms: live.alarms,
    permissions: { canControl },
    limits: buildConsoleLimits(applied),
    onConfirm,
    ranges: rangesFromTargets(targets),
    capabilities: { maneuvers: false },
  };
}
