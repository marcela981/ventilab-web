/*
* Funcionalidad: Waveform playback clock tests
* Descripción: Verifies the time-based drawing head of the live curves (W3, Bloque 1): without delay it is the newest
*   sample; with 30 Hz batches of 50 Hz samples it advances on every 60 Hz frame, stays the delay behind the newest
*   sample and never passes it; it learns a ×8 source rate; a paused source stops it at the newest sample and a long
*   silence does not corrupt the rate; a clock reset restarts it; and the window helpers count the samples up to the
*   head and interpolate the point at it. Pure functions, no DOM. Depends on Vitest and the ring buffer.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { advancePlayback, countUpTo, createPlaybackClock, DEFAULT_PLAYBACK_DELAY_MS, interpolateAt } from "./playback-clock";
import type { TracePoint } from "./playback-clock";
import { WaveformRingBuffer } from "./waveform-ring-buffer";

const FRAME_MS = 1000 / 60;
const BATCH_MS = 1000 / 30;
const SAMPLE_MS = 20;

/**
 * Simulates a source that emits a batch every BATCH_MS of wall time carrying `rate` × BATCH_MS of samples, and a
 * display that asks the clock for the head on every 60 Hz frame. Returns the heads and the newest sample per frame.
 */
function simulate(rate: number, seconds: number, delayMs = DEFAULT_PLAYBACK_DELAY_MS): { heads: number[], latest: number[] } {
  const clock = createPlaybackClock();
  const heads: number[] = [];
  const latest: number[] = [];
  let newest = 0;
  let nextBatchMs = 0;

  for (let now = 0; now < seconds * 1000; now += FRAME_MS) {
    while (nextBatchMs <= now) {
      // The samples of this batch end at the source time reached by this wall time.
      newest = Math.floor((nextBatchMs * rate) / SAMPLE_MS) * SAMPLE_MS;
      nextBatchMs += BATCH_MS;
    }

    heads.push(advancePlayback(clock, newest, now, delayMs) ?? Number.NaN);
    latest.push(newest);
  }

  return { heads, latest };
}

describe("advancePlayback", () => {
  it("returns the newest sample without delay and null without samples", () => {
    const clock = createPlaybackClock();

    expect(advancePlayback(clock, null, 0, 0)).toBeNull();
    expect(advancePlayback(clock, 1000, 10, 0)).toBe(1000);
    expect(advancePlayback(clock, 1100, 40, 0)).toBe(1100);
  });

  it("advances on every frame between 30 Hz batches, a delay behind the newest sample and never past it", () => {
    const { heads, latest } = simulate(1, 3);
    // After the first second the rate has settled.
    const settled = heads.slice(60);
    const settledLatest = latest.slice(60);
    const moving = settled.filter((head, index) => index > 0 && head > (settled[index - 1] ?? Number.POSITIVE_INFINITY)).length;

    expect(moving / (settled.length - 1)).toBeGreaterThan(0.9);
    settled.forEach((head, index) => {
      const newest = settledLatest[index] ?? 0;

      expect(head).toBeLessThanOrEqual(newest);
      expect(newest - head).toBeLessThan(DEFAULT_PLAYBACK_DELAY_MS + BATCH_MS + SAMPLE_MS);
    });
    // Never backwards.
    heads.slice(1).forEach((head, index) => expect(head).toBeGreaterThanOrEqual(heads[index] ?? 0));
  });

  it("learns the rate of a fast replay (×8) and keeps advancing every frame", () => {
    const { heads, latest } = simulate(8, 3);
    const tail = heads.slice(-60);
    const moving = tail.filter((head, index) => index > 0 && head > (tail[index - 1] ?? Number.POSITIVE_INFINITY)).length;
    const lastHead = heads.at(-1) ?? 0;
    const lastNewest = latest.at(-1) ?? 0;

    expect(moving / (tail.length - 1)).toBeGreaterThan(0.9);
    // The source moves 8 ms per wall ms: one second of frames advances the head about 8 s of source time.
    expect(lastHead - (heads.at(-61) ?? 0)).toBeGreaterThan(7000);
    expect(lastHead).toBeLessThanOrEqual(lastNewest);
  });

  it("stops at the newest sample when the source pauses and resumes without a corrupted rate", () => {
    const clock = createPlaybackClock();
    let now = 0;
    let newest = 0;

    for (; now < 1000; now += FRAME_MS) {
      newest = Math.floor(now / BATCH_MS) * BATCH_MS;
      advancePlayback(clock, newest, now, DEFAULT_PLAYBACK_DELAY_MS);
    }

    const pausedAt = newest;

    for (let frame = 0; frame < 120; frame += 1) {
      now += FRAME_MS;
      expect(advancePlayback(clock, pausedAt, now, DEFAULT_PLAYBACK_DELAY_MS)).toBeLessThanOrEqual(pausedAt);
    }

    expect(clock.headMs).toBe(pausedAt);

    // Two seconds of silence, then one batch: the rate stays about 1 (not 33 ms / 2 s).
    now += 2000;
    advancePlayback(clock, pausedAt + BATCH_MS, now, DEFAULT_PLAYBACK_DELAY_MS);
    expect(clock.rate).toBeGreaterThan(0.5);
    expect(clock.rate).toBeLessThan(2);
  });

  it("restarts behind the newest sample when the source clock goes back", () => {
    const clock = createPlaybackClock();

    advancePlayback(clock, 5000, 0, DEFAULT_PLAYBACK_DELAY_MS);
    advancePlayback(clock, 5033, 33, DEFAULT_PLAYBACK_DELAY_MS);

    const head = advancePlayback(clock, 100, 66, DEFAULT_PLAYBACK_DELAY_MS) ?? Number.NaN;

    expect(head).toBeLessThanOrEqual(100);
    expect(head).toBeGreaterThan(0);
  });
});

describe("window helpers at the head", () => {
  function windowOf(times: number[]) {
    const buffer = new WaveformRingBuffer<"pressure">({ channels: ["pressure"], capacity: 16 });

    times.forEach((tMs) => buffer.push({ tMs, values: { pressure: tMs / 10 } }));

    return buffer.readAll();
  }

  it("counts the samples at or before the head", () => {
    const window = windowOf([0, 20, 40, 60]);

    expect(countUpTo(window, -1)).toBe(0);
    expect(countUpTo(window, 20)).toBe(2);
    expect(countUpTo(window, 59)).toBe(3);
    expect(countUpTo(window, 1000)).toBe(4);
  });

  it("interpolates the point at the head, or takes the last sample when none follows", () => {
    const window = windowOf([0, 20, 40]);
    const point: TracePoint<"pressure"> = { t: 0, values: { pressure: 0 } };

    expect(interpolateAt(window, ["pressure"], 30, point)).toBe(true);
    expect(point.t).toBe(30);
    expect(point.values.pressure).toBeCloseTo(3);

    expect(interpolateAt(window, ["pressure"], 40, point)).toBe(true);
    expect(point).toEqual({ t: 40, values: { pressure: 4 } });

    expect(interpolateAt(window, ["pressure"], -5, point)).toBe(false);
  });
});
