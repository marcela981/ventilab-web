/*
* Funcionalidad: Cycle flow extremes
* Descripción: The maximum inspiratory flow and the maximum expiratory flow (the most negative one) of the last completed breath of the simulation, for the "Flujo máx" / "Flujo mín" console cards. The vendored engine reports no flow extreme in its cycle metrics, so they are taken from the engine's own waveform samples: the fold keeps the (time, flow) samples since the last completed cycle and, when a metrics snapshot brings a new cycle, takes the extremes of the samples inside [startMs, endMs) of that cycle (endMs is the start of the next one) and drops the older ones. Bounded memory (at most MAX_KEPT_SAMPLES, e.g. during an apnea), a time that goes backwards (replay restart or seek) starts over, and a cycle without samples (joined late) gives null. Pure and immutable, cheap per worker batch. v0.1 (Bloque 5, C4): first version. Depends on the sim-engine types.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { CycleMetrics, WaveformSample } from "../engine/engine.types";

/** 30 s at 50 Hz: longer than any breath the console limits allow, so a cycle never loses its samples. */
export const MAX_KEPT_SAMPLES = 1500;

export type CycleFlow = {
  /** Samples not yet assigned to a completed cycle: [simTimeMs, flowLpm] pairs, oldest first. */
  samples: readonly (readonly [number, number])[]
  /** Index of the last cycle the extremes belong to. */
  cycleIndex: number | null
  peakInspiratoryFlow: number | null
  peakExpiratoryFlow: number | null
};

export const INITIAL_CYCLE_FLOW: CycleFlow = { samples: [], cycleIndex: null, peakInspiratoryFlow: null, peakExpiratoryFlow: null };

/** Folds the samples of one batch and, with a new completed cycle, its flow extremes. */
export function foldCycleFlow(state: CycleFlow, samples: readonly WaveformSample[], lastCycle: CycleMetrics | null): CycleFlow {
  const previousLast = state.samples[state.samples.length - 1];
  const restarted = previousLast !== undefined && samples.length > 0 && samples[0]!.simTimeMs < previousLast[0];
  const base = restarted ? INITIAL_CYCLE_FLOW : state;
  let kept: readonly (readonly [number, number])[] = samples.length === 0
    ? base.samples
    : [...base.samples, ...samples.map((sample) => [sample.simTimeMs, sample.flowLpm] as const)];

  if (kept.length > MAX_KEPT_SAMPLES) {
    kept = kept.slice(kept.length - MAX_KEPT_SAMPLES);
  }

  if (lastCycle === null || lastCycle.cycleIndex === base.cycleIndex) {
    return kept === base.samples && base === state ? state : { ...base, samples: kept };
  }

  let max = Number.NEGATIVE_INFINITY;
  let min = Number.POSITIVE_INFINITY;

  kept.forEach(([tMs, flow]) => {
    if (tMs >= lastCycle.startMs && tMs < lastCycle.endMs) {
      max = Math.max(max, flow);
      min = Math.min(min, flow);
    }
  });

  const found = Number.isFinite(max);

  return {
    samples: kept.filter(([tMs]) => tMs >= lastCycle.endMs),
    cycleIndex: lastCycle.cycleIndex,
    peakInspiratoryFlow: found ? max : null,
    peakExpiratoryFlow: found ? min : null,
  };
}
