/*
* Funcionalidad: Breath detection (derived metrics of the real ventilator)
* Descripción: Pure, incremental breath-cycle detection on the pressure/flow/volume samples of the real ventilator and
*   the metrics derived from it, because the device telemetry carries no breath metric. Phases come from the flow sign
*   with hysteresis and a minimum duration: an inspiration starts at the first sample with flow above +trigger that
*   stays above +release for minPhaseMs; the expiration starts likewise below -trigger. A breath runs from one
*   inspiration start to the next. Per breath: Ppeak = highest pressure; PEEP = mean pressure of the last peepWindowMs
*   before the next inspiration (end-expiratory pressure, no expiratory hold, so it is not a total PEEP); Vte = highest
*   volume of the inspiration (up to the first expiratory sample) minus the lowest volume of the expiration (up to the
*   next inspiration start), in the telemetry volume units (mL) — the volume difference is used instead of integrating
*   the expiratory flow so the device volume is taken as given; Pplat only when the inspiration ends with a plateau
*   (|flow| ≤ plateauFlowLpm for at least plateauMinMs right before the expiration; mean pressure of its second half),
*   else null. Metrics: Ppeak, PEEP, Vte, Pplat and I:E (Ti/Te) of the last breath; RR = 60 / mean period of the last
*   breaths; VE = Vte × RR (L/min); ΔP = Pplat - PEEP only with a plateau. A stream that starts mid-inspiration waits
*   for a non-inspiratory sample; a data gap drops the breath in progress; time going backwards (clock reset) starts
*   over; breaths shorter than minBreathMs or longer than maxBreathMs are discarded; metrics are null without breaths
*   or when the last breath ended more than three periods before the latest sample. Nothing is estimated beyond this.
*   v1.1 (T5 review fix): the flow is read relative to a flow BASELINE (bias flow, leak or sensor offset) estimated
*   while an inspiration is sought: the mean flow of the last baselineWindowMs when it differs from the mean of the
*   window before it by at most baselineSlopeLpm, frozen during candidates (applied when one is dropped) and breaths; a candidate becomes a
*   phase only when its flow also reaches confirmFlowLpm above the baseline (a short spike or a small sustained shift
*   is dropped after candidateMaxMs); the plateau is read on the baseline of its inspiration. The gap limit is a few
*   sample periods (200 ms ≈ 4–10 periods at the 20–50 Hz device rates) and a gap also drops the previous breaths, so
*   the metrics are null until a breath without a gap is complete. PEEP is null when the breath has no end-expiratory
*   sample (no fallback value). Depends only on the console sample type.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { ConsoleSample } from "@shared/ventilator-console";

export type BreathDetectionOptions = {
  /** |flow| (L/min) that starts a phase candidate. */
  triggerFlowLpm: number
  /** |flow| (L/min) below which a candidate is dropped (hysteresis). */
  releaseFlowLpm: number
  /** A candidate becomes a phase after this long. */
  minPhaseMs: number
  /** End-expiratory window for PEEP. */
  peepWindowMs: number
  /** |flow| (L/min) considered zero for the plateau. */
  plateauFlowLpm: number
  /** Minimum zero-flow time at the end of the inspiration for a plateau. */
  plateauMinMs: number
  /** A candidate becomes a phase only when its flow reaches this far from the baseline (L/min). */
  confirmFlowLpm: number
  /** A candidate that has not reached confirmFlowLpm after this long is dropped. */
  candidateMaxMs: number
  /** Window of the flow baseline estimate. */
  baselineWindowMs: number
  /** The window is flat when the means of its halves differ by at most this (L/min). */
  baselineSlopeLpm: number
  /** A longer interval between samples drops the breath in progress and the previous breaths. */
  maxGapMs: number
  minBreathMs: number
  maxBreathMs: number
  /** Completed breaths kept (RR averages over `rateBreaths` of them). */
  historySize: number
};

export const DEFAULT_BREATH_DETECTION: BreathDetectionOptions = {
  triggerFlowLpm: 3,
  releaseFlowLpm: 1,
  minPhaseMs: 60,
  confirmFlowLpm: 6,
  candidateMaxMs: 300,
  baselineWindowMs: 200,
  baselineSlopeLpm: 0.5,
  peepWindowMs: 100,
  plateauFlowLpm: 2,
  plateauMinMs: 150,
  maxGapMs: 200,
  minBreathMs: 500,
  maxBreathMs: 60_000,
  historySize: 8,
};

export type DetectedBreath = {
  startMs: number
  expirationStartMs: number
  /** Start of the next inspiration. */
  endMs: number
  inspiratoryTimeMs: number
  expiratoryTimeMs: number
  peakPressure: number
  /** Null without an end-expiratory sample. */
  peep: number | null
  exhaledTidalVolume: number
  plateauPressure: number | null
};

export type BreathMetrics = {
  peakPressure: number | null
  plateauPressure: number | null
  drivingPressure: number | null
  /** End-expiratory pressure. */
  peep: number | null
  exhaledTidalVolume: number | null
  respiratoryRate: number | null
  /** Ti/Te (0.5 = 1:2). */
  ieRatio: number | null
  /** L/min. */
  minuteVolume: number | null
};

export const EMPTY_BREATH_METRICS: BreathMetrics = {
  peakPressure: null,
  plateauPressure: null,
  drivingPressure: null,
  peep: null,
  exhaledTidalVolume: null,
  respiratoryRate: null,
  ieRatio: null,
  minuteVolume: null,
};

/** Breaths averaged for RR. */
const RATE_BREATHS = 4;

/** Metrics are stale when the last breath ended more than this many periods before the latest sample. */
const STALE_PERIODS = 3;

/**
 * idle: waiting for a non-inspiratory sample (stream start, after a gap); preamble: waiting for the first inspiration;
 * inspiration / expiration: inside a breath.
 */
type Phase = "idle" | "preamble" | "inspiration" | "expiration";

/** `peak`: highest signed flow above the baseline since the candidate started. */
type Candidate = { index: number, startMs: number, peak: number };

export type BreathDetector = {
  push: (samples: readonly ConsoleSample[]) => void
  /** Completed breaths, oldest first (at most `historySize`). */
  breaths: () => readonly DetectedBreath[]
  /** Time of the latest accepted sample, or null. */
  latestMs: () => number | null
  reset: () => void
};

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Mean pressure of the second half of the zero-flow run (relative to `baseline`) that ends the inspiration, or null
 * without a plateau.
 */
function plateauOf(
  inspiration: readonly ConsoleSample[],
  expirationStartMs: number,
  baseline: number,
  options: BreathDetectionOptions,
): number | null {
  let runStart = inspiration.length;

  while (runStart > 0 && Math.abs(inspiration[runStart - 1]!.flow - baseline) <= options.plateauFlowLpm) {
    runStart -= 1;
  }

  if (runStart === inspiration.length) {
    return null;
  }

  const runStartMs = inspiration[runStart]!.tMs;
  const duration = expirationStartMs - runStartMs;

  if (duration < options.plateauMinMs) {
    return null;
  }

  const halfMs = runStartMs + duration / 2;
  const pressures = inspiration.slice(runStart).filter((sample) => sample.tMs >= halfMs).map((sample) => sample.pressure);

  return pressures.length > 0 ? mean(pressures) : null;
}

/** Breath from `samples` (inspiration start .. next inspiration start inclusive) with the expiration at `expIndex`. */
function measureBreath(
  samples: readonly ConsoleSample[],
  expIndex: number,
  baseline: number,
  options: BreathDetectionOptions,
): DetectedBreath {
  const first = samples[0]!;
  const next = samples[samples.length - 1]!;
  const expirationStart = samples[expIndex]!;
  const breath = samples.slice(0, -1);
  const inspiration = samples.slice(0, expIndex);
  const peepFrom = next.tMs - options.peepWindowMs;
  const endExpiratory = breath.filter((sample, index) => index >= expIndex && sample.tMs >= peepFrom).map((sample) => sample.pressure);
  const endInspiratoryVolume = Math.max(...samples.slice(0, expIndex + 1).map((sample) => sample.volume));
  const endExpiratoryVolume = Math.min(...samples.slice(expIndex).map((sample) => sample.volume));

  return {
    startMs: first.tMs,
    expirationStartMs: expirationStart.tMs,
    endMs: next.tMs,
    inspiratoryTimeMs: expirationStart.tMs - first.tMs,
    expiratoryTimeMs: next.tMs - expirationStart.tMs,
    peakPressure: Math.max(...breath.map((sample) => sample.pressure)),
    peep: endExpiratory.length > 0 ? mean(endExpiratory) : null,
    exhaledTidalVolume: endInspiratoryVolume - endExpiratoryVolume,
    plateauPressure: plateauOf(inspiration, expirationStart.tMs, baseline, options),
  };
}

export function createBreathDetector(overrides: Partial<BreathDetectionOptions> = {}): BreathDetector {
  const options: BreathDetectionOptions = { ...DEFAULT_BREATH_DETECTION, ...overrides };
  let phase: Phase = "idle";
  let current: ConsoleSample[] = [];
  let expIndex = -1;
  let candidate: Candidate | null = null;
  let lastMs: number | null = null;
  let history: DetectedBreath[] = [];
  /** Flow baseline (bias flow, leak, offset) and the one in force when the current inspiration started. */
  let baseline = 0;
  let inspirationBaseline = 0;
  /** Samples of the last two baselineWindowMs while an inspiration is sought. */
  let window: ConsoleSample[] = [];
  /** Latest flat-window estimate, applied when no candidate is pending. */
  let estimate: number | null = null;

  const restart = () => {
    phase = "idle";
    current = [];
    expIndex = -1;
    candidate = null;
    window = [];
    estimate = null;
  };

  /**
   * Flat-window estimate: the mean flow of the last baselineWindowMs when it differs from the mean of the
   * baselineWindowMs before it by at most baselineSlopeLpm (two means of many samples, so noise does not pass a
   * still-decaying expiratory flow as flat); null otherwise.
   */
  const trackBaseline = (sample: ConsoleSample) => {
    window.push(sample);
    const from = sample.tMs - 2 * options.baselineWindowMs;

    while (window.length > 0 && window[0]!.tMs < from) {
      window.shift();
    }

    estimate = null;

    if (sample.tMs - window[0]!.tMs < 1.75 * options.baselineWindowMs) {
      return;
    }

    const split = sample.tMs - options.baselineWindowMs;
    const older = window.filter((item) => item.tMs <= split).map((item) => item.flow);
    const recent = window.filter((item) => item.tMs > split).map((item) => item.flow);

    if (older.length >= 2 && recent.length >= 2 && Math.abs(mean(recent) - mean(older)) <= options.baselineSlopeLpm) {
      estimate = mean(recent);
    }
  };

  const complete = (boundary: number) => {
    const breath = measureBreath(current.slice(0, boundary + 1), expIndex, inspirationBaseline, options);
    const period = breath.endMs - breath.startMs;

    if (period >= options.minBreathMs && period <= options.maxBreathMs && breath.inspiratoryTimeMs > 0 && breath.expiratoryTimeMs > 0) {
      history = [...history, breath].slice(-options.historySize);
    }
  };

  const confirmInspiration = (start: Candidate) => {
    if (phase === "expiration") {
      complete(start.index);
    }

    current = current.slice(start.index);
    phase = "inspiration";
    expIndex = -1;
    inspirationBaseline = baseline;
    window = [];
    estimate = null;
  };

  const step = (sample: ConsoleSample) => {
    const flow = sample.flow - baseline;

    if (phase === "idle") {
      if (flow <= options.releaseFlowLpm) {
        phase = "preamble";
      }

      return;
    }

    current.push(sample);
    const index = current.length - 1;
    const seekingInspiration = phase === "preamble" || phase === "expiration";
    const sign = seekingInspiration ? 1 : -1;
    const signed = sign * flow;

    // The estimate keeps following the flow during a candidate, but the baseline stays frozen until it is dropped.
    if (seekingInspiration) {
      trackBaseline(sample);
    }

    if (candidate === null) {
      if (signed > options.triggerFlowLpm) {
        candidate = { index, startMs: sample.tMs, peak: signed };
      } else {
        if (estimate !== null) {
          baseline = estimate;
        }

        if (phase === "preamble") {
          // Before the first inspiration only the candidate samples matter.
          current = [];
        }
      }
    } else {
      const age = sample.tMs - candidate.startMs;
      candidate.peak = Math.max(candidate.peak, signed);

      // Below the release flow, or never strong enough (a spike, a small shift of the baseline): not a phase.
      if (signed < options.releaseFlowLpm || (age > options.candidateMaxMs && candidate.peak < options.confirmFlowLpm)) {
        candidate = null;

        // A small sustained shift (leak change) becomes the new baseline once its window is flat.
        if (estimate !== null) {
          baseline = estimate;
        }

        if (phase === "preamble") {
          current = [];
        }
      }
    }

    if (candidate !== null && sample.tMs - candidate.startMs >= options.minPhaseMs && candidate.peak >= options.confirmFlowLpm) {
      const confirmed = candidate;
      candidate = null;

      if (seekingInspiration) {
        confirmInspiration(confirmed);
      } else {
        phase = "expiration";
        expIndex = confirmed.index;
      }
    }

    // An endless phase (apnea, a stuck signal) is not a breath: start over to keep the buffer bounded.
    if (current.length > 0 && sample.tMs - current[0]!.tMs > options.maxBreathMs) {
      restart();
    }
  };

  return {
    push(samples) {
      for (const sample of samples) {
        if (!Number.isFinite(sample.tMs) || !Number.isFinite(sample.pressure) || !Number.isFinite(sample.flow) || !Number.isFinite(sample.volume)) {
          continue;
        }

        if (lastMs !== null && sample.tMs < lastMs) {
          // Clock reset: the previous breaths (and the baseline) belong to another time base.
          history = [];
          baseline = 0;
          restart();
        } else if (lastMs !== null && sample.tMs - lastMs > options.maxGapMs) {
          // A gap: nothing is known about what happened meanwhile, so no metric comes from before it.
          history = [];
          restart();
        }

        lastMs = sample.tMs;
        step(sample);
      }
    },
    breaths: () => history,
    latestMs: () => lastMs,
    reset() {
      history = [];
      lastMs = null;
      baseline = 0;
      restart();
    },
  };
}

/** All complete breaths of a sample sequence (a fresh detector over the whole sequence). */
export function detectBreaths(samples: readonly ConsoleSample[], options: Partial<BreathDetectionOptions> = {}): readonly DetectedBreath[] {
  const detector = createBreathDetector({ historySize: Number.MAX_SAFE_INTEGER, ...options });
  detector.push(samples);

  return detector.breaths();
}

/** Metrics of the latest breaths; all null without breaths or when the last breath is stale at `latestMs`. */
export function computeBreathMetrics(breaths: readonly DetectedBreath[], latestMs?: number | null): BreathMetrics {
  const last = breaths[breaths.length - 1];

  if (last === undefined) {
    return EMPTY_BREATH_METRICS;
  }

  const recent = breaths.slice(-RATE_BREATHS);
  const meanPeriodMs = mean(recent.map((breath) => breath.endMs - breath.startMs));

  if (latestMs !== undefined && latestMs !== null && latestMs - last.endMs > STALE_PERIODS * meanPeriodMs) {
    return EMPTY_BREATH_METRICS;
  }

  const respiratoryRate = 60_000 / meanPeriodMs;

  return {
    peakPressure: last.peakPressure,
    plateauPressure: last.plateauPressure,
    drivingPressure: last.plateauPressure === null || last.peep === null ? null : last.plateauPressure - last.peep,
    peep: last.peep,
    exhaledTidalVolume: last.exhaledTidalVolume,
    respiratoryRate,
    ieRatio: last.inspiratoryTimeMs / last.expiratoryTimeMs,
    minuteVolume: (last.exhaledTidalVolume * respiratoryRate) / 1000,
  };
}
