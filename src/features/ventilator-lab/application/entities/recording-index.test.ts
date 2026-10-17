/*
* Funcionalidad: Recording index tests
* Descripción: Chunked indexing of a recording: playback times relative to the first frame on the server time, console
*   samples, SpO2 / PCO2 carried forward (NaN → null before the first report), invalid and out-of-order frames dropped,
*   the same result whatever the chunk size, progress, an empty recording and the binary search of the frame at or
*   before a time. Depends on Vitest only. v1.1 (T11 review fix S1): the gaps of a
*   recording (stop/start, outage) are listed in playback time and included in the duration; gap threshold.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { carriedValue, createRecordingIndexer, gapAt, gapThresholdMs, indexAtOrBefore, indexRecording } from "./recording-index";
import type { RecordedFrame, RecordingSource } from "./recording-index";

const T0 = 1_760_097_600_000;

function frame(offsetMs: number, overrides: Partial<RecordedFrame> = {}): RecordedFrame {
  return { serverTs: T0 + offsetMs, deviceTs: null, seq: null, pressure: 10, flow: 1, volume: 100, spo2: null, pco2: null, ...overrides };
}

function source(frames: RecordedFrame[]): RecordingSource {
  return { reservationId: "r1", sampleRateHz: 20, chunkCount: 1, frames };
}

describe("recording index", () => {
  it("indexes times from the first frame, samples and carried vitals", () => {
    const index = indexRecording(source([
      frame(0),
      frame(50, { spo2: 97 }),
      frame(100, { pco2: 38 }),
      frame(150, { spo2: 95, pressure: 20 }),
    ]));

    expect(index).toMatchObject({ count: 4, startServerTs: T0, durationMs: 150, sampleRateHz: 20, hasSpo2: true, hasPco2: true });
    expect(Array.from(index.times)).toEqual([0, 50, 100, 150]);
    expect(index.samples[3]).toEqual({ tMs: 150, pressure: 20, flow: 1, volume: 100 });
    expect([0, 1, 2, 3].map((at) => carriedValue(index.spo2, at))).toEqual([null, 97, 97, 95]);
    expect([0, 1, 2, 3].map((at) => carriedValue(index.pco2, at))).toEqual([null, null, 38, 38]);
  });

  it("drops non-finite and out-of-order frames", () => {
    const index = indexRecording(source([
      frame(0),
      frame(50, { pressure: Number.NaN }),
      frame(100),
      frame(80),
      frame(120, { flow: Number.POSITIVE_INFINITY }),
      frame(150),
    ]));

    expect(Array.from(index.times)).toEqual([0, 100, 150]);
    expect(index.hasSpo2).toBe(false);
  });

  it("gives the same index in small chunks and reports the progress", () => {
    const frames = Array.from({ length: 23 }, (_, at) => frame(at * 50, { spo2: at === 7 ? 96 : null }));
    const indexer = createRecordingIndexer(source(frames), 5);
    let steps = 0;

    expect(indexer.progress()).toBe(0);

    while (!indexer.step()) {
      steps += 1;
      expect(indexer.progress()).toBeLessThan(1);
    }

    expect(steps).toBe(4);
    expect(indexer.progress()).toBe(1);
    const chunked = indexer.result();
    const whole = indexRecording(source(frames));
    expect(Array.from(chunked.times)).toEqual(Array.from(whole.times));
    expect(Array.from(chunked.spo2)).toEqual(Array.from(whole.spo2));
  });

  it("marks the gaps of the recording (stop/start, outage) instead of compressing them (T11 review fix S1)", () => {
    const index = indexRecording(source([frame(0), frame(50), frame(100), frame(5_100), frame(5_150), frame(5_200), frame(65_200)]));

    // The gaps stay in the playback time: the duration includes them.
    expect(index.durationMs).toBe(65_200);
    expect(index.gaps).toEqual([{ startMs: 100, endMs: 5_100 }, { startMs: 5_200, endMs: 65_200 }]);
    expect(index.gapsTotalMs).toBe(65_000);
    expect(gapAt(index.gaps, 100)).toBeNull();
    expect(gapAt(index.gaps, 2_000)).toEqual({ startMs: 100, endMs: 5_100 });
    expect(gapAt(index.gaps, 5_100)).toBeNull();
    expect(gapAt(index.gaps, 5_150)).toBeNull();
  });

  it("uses a gap threshold of five sample periods, never below one second", () => {
    expect(gapThresholdMs(20)).toBe(1_000);
    expect(gapThresholdMs(2)).toBe(2_500);
    expect(gapThresholdMs(null)).toBe(1_000);
    // A late frame within the threshold is not a gap.
    expect(indexRecording(source([frame(0), frame(900), frame(950)])).gaps).toEqual([]);
  });

  it("indexes an empty recording", () => {
    const index = indexRecording({ reservationId: "r1", sampleRateHz: null, chunkCount: 0, frames: [] });

    expect(index).toMatchObject({ count: 0, durationMs: 0, startServerTs: null, gaps: [], gapsTotalMs: 0 });
    expect(createRecordingIndexer({ reservationId: "r1", sampleRateHz: null, chunkCount: 0, frames: [] }).progress()).toBe(1);
  });

  it("finds the last frame at or before a time", () => {
    const times = new Float64Array([0, 50, 100, 100, 150]);

    expect(indexAtOrBefore(times, -1)).toBe(-1);
    expect(indexAtOrBefore(times, 0)).toBe(0);
    expect(indexAtOrBefore(times, 99)).toBe(1);
    expect(indexAtOrBefore(times, 100)).toBe(3);
    expect(indexAtOrBefore(times, 1_000)).toBe(4);
    expect(indexAtOrBefore(new Float64Array(0), 10)).toBe(-1);
  });
});
