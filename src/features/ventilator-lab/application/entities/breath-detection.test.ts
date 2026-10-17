/*
* Funcionalidad: Breath detection tests
* Descripción: Checks the breath-cycle detection and the derived metrics against synthetic curves of KNOWN values built from a single-compartment lung (P = PEEP + V/C + R·F): volume control with an inspiratory pause (plateau), volume control without a pause (no plateau → Pplat/ΔP null), pressure control whose flow decays to zero (plateau = inspiratory pressure), and the paused volume breath with deterministic noise. Every metric must be within 2 % of the known value. Also covers chunked pushes, a stream starting mid-inspiration, data gaps, backwards time and stale metrics. v1.1 (T5 review fix): a flow offset / leak during the expiratory pause, a 1–3 L/min noisy baseline with a short spike, a patient-triggered inspiration, fast and slow rates, the restart after an apnea, a missing peak sample, the few-periods gap limit and the null PEEP of a breath without end-expiratory samples. Depends on Vitest only.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import type { ConsoleSample } from "@shared/ventilator-console";
import { computeBreathMetrics, createBreathDetector, detectBreaths } from "./breath-detection";

const SAMPLE_MS = 20; // 50 Hz

type Noise = { pressure: number, flow: number, volume: number };

/** Deterministic pseudo-random noise in [-1, 1] (linear congruential generator). */
function noiseSource(seed: number): () => number {
  let state = seed;

  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;

    return (state / 4294967296) * 2 - 1;
  };
}

type VolumeControl = {
  kind: "volume"
  rrBpm: number
  peep: number
  tidalVolumeMl: number
  flowTimeS: number
  pauseS: number
  /** mL/cmH2O */
  compliance: number
  /** cmH2O/(L/s) */
  resistance: number
};

type PressureControl = {
  kind: "pressure"
  rrBpm: number
  peep: number
  /** Above PEEP. */
  inspiratoryPressure: number
  inspiratoryTimeS: number
  compliance: number
  resistance: number
};

/**
 * Samples of `breaths` breaths of a single-compartment lung, phases half-open ([0, Ti) inspiration, [Ti, T) passive
 * expiration where P = PEEP), with a closed-form volume so the known values hold at every sample.
 */
function synthesize(pattern: VolumeControl | PressureControl, breaths: number, noise?: Noise, startMs = 0): ConsoleSample[] {
  const periodS = 60 / pattern.rrBpm;
  const tauS = (pattern.resistance * pattern.compliance) / 1000;
  const inspiratoryS = pattern.kind === "volume" ? pattern.flowTimeS + pattern.pauseS : pattern.inspiratoryTimeS;
  const perBreath = Math.round((periodS * 1000) / SAMPLE_MS);
  const random = noiseSource(42);
  const samples: ConsoleSample[] = [];
  let startVolume = 0;

  for (let breath = 0; breath < breaths; breath += 1) {
    let endInspiratoryVolume = startVolume;

    for (let k = 0; k < perBreath; k += 1) {
      const t = (k * SAMPLE_MS) / 1000;
      let volume: number; // mL
      let flowMlS: number;
      let pressure: number;

      if (t < inspiratoryS) {
        if (pattern.kind === "volume") {
          const flowing = t < pattern.flowTimeS;
          const flowRate = pattern.tidalVolumeMl / pattern.flowTimeS;
          flowMlS = flowing ? flowRate : 0;
          volume = startVolume + flowRate * Math.min(t, pattern.flowTimeS);
        } else {
          const target = pattern.compliance * pattern.inspiratoryPressure;
          volume = startVolume + (target - startVolume) * (1 - Math.exp(-t / tauS));
          flowMlS = ((target - startVolume) / tauS) * Math.exp(-t / tauS);
        }

        pressure = pattern.kind === "pressure"
          ? pattern.peep + pattern.inspiratoryPressure
          : pattern.peep + volume / pattern.compliance + (pattern.resistance * flowMlS) / 1000;
        endInspiratoryVolume = pattern.kind === "volume" ? startVolume + pattern.tidalVolumeMl : volume;
      } else {
        const elapsed = t - inspiratoryS;
        const fromVolume = pattern.kind === "volume"
          ? startVolume + pattern.tidalVolumeMl
          : endInspiratoryVolumeAt(pattern, startVolume, tauS);
        volume = fromVolume * Math.exp(-elapsed / tauS);
        flowMlS = -volume / tauS;
        pressure = pattern.peep;
      }

      samples.push({
        tMs: startMs + breath * perBreath * SAMPLE_MS + k * SAMPLE_MS,
        pressure: pressure + (noise ? noise.pressure * random() : 0),
        flow: (flowMlS * 60) / 1000 + (noise ? noise.flow * random() : 0),
        volume: volume + (noise ? noise.volume * random() : 0),
      });
    }

    const fromVolume = pattern.kind === "volume" ? endInspiratoryVolume : endInspiratoryVolumeAt(pattern, startVolume, tauS);
    startVolume = fromVolume * Math.exp(-(periodS - inspiratoryS) / tauS);
  }

  return samples;
}

function endInspiratoryVolumeAt(pattern: PressureControl, startVolume: number, tauS: number): number {
  const target = pattern.compliance * pattern.inspiratoryPressure;

  return startVolume + (target - startVolume) * (1 - Math.exp(-pattern.inspiratoryTimeS / tauS));
}

/** Same samples with `change(sample)` added to the flow (leaks, offsets, noise, spikes). */
function withFlow(samples: readonly ConsoleSample[], change: (sample: ConsoleSample) => number): ConsoleSample[] {
  return samples.map((sample) => ({ ...sample, flow: sample.flow + change(sample) }));
}

function expectWithin(actual: number | null, expected: number, tolerance = 0.02): void {
  expect(actual).not.toBeNull();
  expect(Math.abs((actual as number) - expected) / Math.abs(expected)).toBeLessThanOrEqual(tolerance);
}

const VCV_WITH_PAUSE: VolumeControl = {
  kind: "volume",
  rrBpm: 15,
  peep: 5,
  tidalVolumeMl: 500,
  flowTimeS: 1,
  pauseS: 0.3,
  compliance: 50,
  resistance: 10,
};

const VCV_NO_PAUSE: VolumeControl = { ...VCV_WITH_PAUSE, rrBpm: 20, flowTimeS: 1, pauseS: 0 };

const PCV: PressureControl = {
  kind: "pressure",
  rrBpm: 10,
  peep: 8,
  inspiratoryPressure: 15,
  inspiratoryTimeS: 2,
  compliance: 50,
  resistance: 5,
};

describe("breath detection on known curves", () => {
  it("volume control with an inspiratory pause: Ppeak, plateau, PEEP, Vte, RR, I:E, VE and ΔP", () => {
    const metrics = computeBreathMetrics(detectBreaths(synthesize(VCV_WITH_PAUSE, 8)));

    // Ppeak = PEEP + Vt/C + R·Q = 5 + 10 + 5; Pplat = PEEP + Vt/C; Ti = 1.3 s, Te = 2.7 s.
    expectWithin(metrics.peakPressure, 20);
    expectWithin(metrics.plateauPressure, 15);
    expectWithin(metrics.drivingPressure, 10);
    expectWithin(metrics.peep, 5);
    expectWithin(metrics.exhaledTidalVolume, 500);
    expectWithin(metrics.respiratoryRate, 15);
    expectWithin(metrics.ieRatio, 1.3 / 2.7);
    expectWithin(metrics.minuteVolume, 7.5);
  });

  it("volume control without a pause has no plateau: Pplat and ΔP stay null", () => {
    const metrics = computeBreathMetrics(detectBreaths(synthesize(VCV_NO_PAUSE, 8)));

    expectWithin(metrics.peakPressure, 20);
    expect(metrics.plateauPressure).toBeNull();
    expect(metrics.drivingPressure).toBeNull();
    expectWithin(metrics.peep, 5);
    expectWithin(metrics.exhaledTidalVolume, 500);
    expectWithin(metrics.respiratoryRate, 20);
    expectWithin(metrics.ieRatio, 1 / 2);
    expectWithin(metrics.minuteVolume, 10);
  });

  it("pressure control whose flow reaches zero: the plateau equals the inspiratory pressure", () => {
    const metrics = computeBreathMetrics(detectBreaths(synthesize(PCV, 6)));
    // τ = R·C = 0.25 s, Ti = 8τ: Vt = C·ΔP·(1 - e^-8) ≈ 750 mL.
    const tidalVolume = 750 * (1 - Math.exp(-8));

    expectWithin(metrics.peakPressure, 23);
    expectWithin(metrics.plateauPressure, 23);
    expectWithin(metrics.drivingPressure, 15);
    expectWithin(metrics.peep, 8);
    expectWithin(metrics.exhaledTidalVolume, tidalVolume);
    expectWithin(metrics.respiratoryRate, 10);
    expectWithin(metrics.ieRatio, 2 / 4);
    expectWithin(metrics.minuteVolume, (tidalVolume * 10) / 1000);
  });

  it("keeps every metric within 2 % with sensor noise", () => {
    const noisy = synthesize(VCV_WITH_PAUSE, 10, { pressure: 0.1, flow: 0.5, volume: 2 });
    const breaths = detectBreaths(noisy);
    const metrics = computeBreathMetrics(breaths);

    // The stream starts inside the first inspiration, which is ignored: breaths 2..10 → 8 complete ones.
    expect(breaths).toHaveLength(8);
    expectWithin(metrics.peakPressure, 20);
    expectWithin(metrics.plateauPressure, 15);
    expectWithin(metrics.drivingPressure, 10);
    expectWithin(metrics.peep, 5);
    expectWithin(metrics.exhaledTidalVolume, 500);
    expectWithin(metrics.respiratoryRate, 15);
    expectWithin(metrics.ieRatio, 1.3 / 2.7);
    expectWithin(metrics.minuteVolume, 7.5);
  });

  it("marks the breath phases at the flow sign changes", () => {
    const breaths = detectBreaths(synthesize(VCV_WITH_PAUSE, 4));

    // A stream that starts with inspiratory flow may be mid-inspiration, so the first breath counts from the next
    // inspiration; a breath is complete when the following inspiration is confirmed.
    expect(breaths).toHaveLength(2);
    expect(breaths[0]).toMatchObject({ startMs: 4000, expirationStartMs: 5300, endMs: 8000, inspiratoryTimeMs: 1300, expiratoryTimeMs: 2700 });
    expect(breaths[1]?.startMs).toBe(8000);
  });
});

describe("breath detector stream handling", () => {
  it("gives the same breaths for chunked pushes as for one batch", () => {
    const samples = synthesize(VCV_WITH_PAUSE, 6);
    const detector = createBreathDetector();

    for (let index = 0; index < samples.length; index += 7) {
      detector.push(samples.slice(index, index + 7));
    }

    expect(detector.breaths()).toEqual(detectBreaths(samples));
  });

  it("ignores a stream that starts in the middle of an inspiration until a full breath is seen", () => {
    const samples = synthesize(VCV_WITH_PAUSE, 4).slice(10);
    const breaths = detectBreaths(samples);

    expect(breaths.map((breath) => breath.startMs)).toEqual([4000, 8000]);
  });

  it("drops the breath in progress and the previous breaths after a data gap", () => {
    const samples = synthesize(VCV_WITH_PAUSE, 5);
    const withGap = [...samples.slice(0, 450), ...samples.slice(520)];

    // The gap (1.4 s without samples) drops the breath that started at 8000 and the breaths before it, so the metrics
    // stay null until a breath without a gap is complete; detection starts over at the next inspiration.
    expect(detectBreaths(withGap).map((breath) => breath.startMs)).toEqual([12000]);
    const detector = createBreathDetector();
    detector.push(withGap.slice(0, 460));
    expect(computeBreathMetrics(detector.breaths(), detector.latestMs()).peakPressure).toBeNull();
  });

  it("treats a few missing sample periods as a gap, not one second", () => {
    const samples = synthesize(VCV_WITH_PAUSE, 5);
    // 240 ms without samples (12 periods at 50 Hz) inside the breath that starts at 8000.
    const withGap = [...samples.slice(0, 450), ...samples.slice(462)];

    expect(detectBreaths(withGap).map((breath) => breath.startMs)).toEqual([12000]);
    // A single missing sample is not a gap.
    expect(detectBreaths([...samples.slice(0, 450), ...samples.slice(451)]).map((breath) => breath.startMs)).toEqual([4000, 8000, 12000]);
  });

  it("starts over when time goes backwards (clock reset)", () => {
    const detector = createBreathDetector();
    detector.push(synthesize(VCV_WITH_PAUSE, 4));
    expect(detector.breaths()).toHaveLength(2);

    detector.push(synthesize(VCV_WITH_PAUSE, 3, undefined, 0));
    expect(detector.breaths()).toHaveLength(1);
    expect(detector.latestMs()).toBe(11_980);
  });

  it("returns null metrics without breaths and when the last breath is stale", () => {
    expect(computeBreathMetrics([])).toEqual({
      peakPressure: null,
      plateauPressure: null,
      drivingPressure: null,
      peep: null,
      exhaledTidalVolume: null,
      respiratoryRate: null,
      ieRatio: null,
      minuteVolume: null,
    });

    // Breaths [4000, 8000) and [8000, 12000): the last one ends at 12000, the mean period is 4 s.
    const breaths = detectBreaths(synthesize(VCV_WITH_PAUSE, 4));
    expect(computeBreathMetrics(breaths, 12_000 + 3 * 4000).peakPressure).not.toBeNull();
    // More than three periods since the last breath ended (apnea, disconnection): nothing is shown.
    expect(computeBreathMetrics(breaths, 12_000 + 3 * 4000 + 1).peakPressure).toBeNull();
  });
});

describe("breath detection with a flow baseline (T5 review fix)", () => {
  const reference = detectBreaths(synthesize(VCV_WITH_PAUSE, 8));

  it("subtracts a leak / bias flow of 3.5 L/min instead of starting the inspiration early", () => {
    const breaths = detectBreaths(withFlow(synthesize(VCV_WITH_PAUSE, 8), () => 3.5));
    const metrics = computeBreathMetrics(breaths);

    expect(breaths.map((breath) => breath.startMs)).toEqual(reference.map((breath) => breath.startMs));
    expectWithin(metrics.respiratoryRate, 15);
    expectWithin(metrics.ieRatio, 1.3 / 2.7);
    expectWithin(metrics.plateauPressure, 15);
    expectWithin(metrics.peep, 5);
  });

  it("subtracts a negative sensor offset as well", () => {
    const breaths = detectBreaths(withFlow(synthesize(VCV_WITH_PAUSE, 8), () => -2.5));

    expect(breaths.map((breath) => breath.startMs)).toEqual(reference.map((breath) => breath.startMs));
    expectWithin(computeBreathMetrics(breaths).plateauPressure, 15);
  });

  it("ignores a short spike over a noisy 1–3 L/min baseline during the expiratory pause", () => {
    const random = noiseSource(7);
    const samples = withFlow(synthesize(VCV_WITH_PAUSE, 8), (sample) => {
      const inBreath = sample.tMs % 4000;
      // 2 L/min baseline with ±1 L/min noise, and +3.5 L/min for 100 ms in every expiratory pause (3.0–3.1 s).
      const spike = inBreath >= 3000 && inBreath < 3100 ? 3.5 : 0;

      return 2 + random() + spike;
    });
    const breaths = detectBreaths(samples);

    expect(breaths.map((breath) => breath.startMs)).toEqual(reference.map((breath) => breath.startMs));
    expectWithin(computeBreathMetrics(breaths).respiratoryRate, 15);
  });

  it("detects a patient-triggered inspiration that starts with a small effort", () => {
    // A 2 → 8 L/min effort over 120 ms before every machine inspiration (from 3880 ms of each breath).
    const samples = withFlow(synthesize(VCV_WITH_PAUSE, 8), (sample) => {
      const inBreath = sample.tMs % 4000;

      return inBreath >= 3880 ? 2 + ((inBreath - 3880) / 120) * 6 : 0;
    });
    const breaths = detectBreaths(samples);

    // The effort at the end of the last breath confirms one more inspiration, so one more breath is complete.
    expect(breaths).toHaveLength(reference.length + 1);
    reference.forEach((_, index) => {
      const breath = breaths[index]!;
      // The inspiration starts during the effort, at most 120 ms before the machine flow.
      const advance = reference[index]!.startMs - breath.startMs;
      expect(advance).toBeGreaterThanOrEqual(0);
      expect(advance).toBeLessThanOrEqual(120);
    });
    expectWithin(computeBreathMetrics(breaths).respiratoryRate, 15);
  });

  it("follows fast and slow rates", () => {
    const fast: VolumeControl = { ...VCV_NO_PAUSE, rrBpm: 35, flowTimeS: 0.55, tidalVolumeMl: 350 };
    const slow: VolumeControl = { ...VCV_WITH_PAUSE, rrBpm: 6 };
    const fastMetrics = computeBreathMetrics(detectBreaths(synthesize(fast, 12)));
    const slowMetrics = computeBreathMetrics(detectBreaths(synthesize(slow, 6)));

    expectWithin(fastMetrics.respiratoryRate, 35);
    // Incomplete expiration (τ = 0.5 s, Te ≈ 1.16 s): Vte is the volume the breath moves, not the set Vt.
    expect(fastMetrics.exhaledTidalVolume).not.toBeNull();
    expectWithin(slowMetrics.respiratoryRate, 6);
    expectWithin(slowMetrics.plateauPressure, 15);
  });

  it("starts over after an apnea longer than the longest breath", () => {
    const before = synthesize(VCV_WITH_PAUSE, 4);
    const lastMs = before[before.length - 1]!.tMs;
    const apnea: ConsoleSample[] = [];

    for (let tMs = lastMs + SAMPLE_MS; tMs < lastMs + 61_000; tMs += SAMPLE_MS) {
      apnea.push({ tMs, pressure: 5, flow: 0, volume: 0 });
    }

    const afterStart = apnea[apnea.length - 1]!.tMs + SAMPLE_MS;
    const detector = createBreathDetector();
    detector.push([...before, ...apnea]);
    expect(computeBreathMetrics(detector.breaths(), detector.latestMs()).peakPressure).toBeNull();

    detector.push(synthesize(VCV_WITH_PAUSE, 4, undefined, afterStart));
    expect(detector.breaths().map((breath) => breath.startMs).slice(-2)).toEqual([afterStart + 4000, afterStart + 8000]);
    expectWithin(computeBreathMetrics(detector.breaths(), detector.latestMs()).respiratoryRate, 15);
  });

  it("measures a breath whose peak sample is missing from the remaining samples", () => {
    const samples = synthesize(VCV_WITH_PAUSE, 4);
    // The highest pressure of the breath starting at 4000 is the last flowing sample (4980 ms).
    const missing = samples.filter((sample) => sample.tMs !== 4980);
    const [breath] = detectBreaths(missing);

    expect(breath?.startMs).toBe(4000);
    expect(breath?.peakPressure).toBeLessThan(detectBreaths(samples)[0]!.peakPressure);
    expectWithin(breath?.peakPressure ?? null, 20);
  });

  it("gives a null PEEP (and ΔP) when the breath has no end-expiratory samples", () => {
    const samples = synthesize(VCV_WITH_PAUSE, 4);
    // Nothing in the last 100 ms before the inspiration at 8000 (a 100 ms hole, below the gap limit).
    const holed = samples.filter((sample) => sample.tMs < 7900 || sample.tMs >= 8000);
    const breaths = detectBreaths(holed);

    expect(breaths[0]?.startMs).toBe(4000);
    expect(breaths[0]?.peep).toBeNull();
    expect(computeBreathMetrics(breaths.slice(0, 1)).drivingPressure).toBeNull();
  });
});
