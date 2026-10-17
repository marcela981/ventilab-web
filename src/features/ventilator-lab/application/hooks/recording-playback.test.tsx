/*
* Funcionalidad: Recording playback hooks tests
* Descripción: useRecording (v1.1, T11 review fix W1/W2) downloads with an AbortController and no cache (aborted on
*   unmount, downloaded again on every visit and on reload), indexes in chunks off the render path (progress, then the
*   index) and keeps only the index (no raw frames); useRecordingPlayback
*   with an injected wall clock and fake intervals: the frames reach the console listener as the position advances
*   (×1, ×4), nothing while paused, a seek starts a new frame source (new sourceId) whose late subscriber gets the
*   preroll, the end pauses at the duration, the derived metrics come from the T5 breath detection on the played
*   frames, and the adapter is read-only with a no-op confirm and the patient monitor only with reported SpO2; v1.1:
*   inside a recording gap the console shows "sin datos" (S1) and the default clock is performance.now (S2). Depends
*   on Vitest, Testing Library and the hooks.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ConsoleSample } from "@shared/ventilator-console";
import { indexRecording } from "../entities/recording-index";
import type { RecordedFrame, RecordingSource } from "../entities/recording-index";
import { PLAYBACK_GAP_MESSAGE, PLAYBACK_READ_ONLY_REASON, PREROLL_MS, useRecordingPlayback } from "./use-recording-playback";
import { useRecording } from "./use-recordings";

const T0 = 1_760_097_600_000;
const HZ = 20;
const PERIOD_MS = 1000 / HZ;

/** Single-compartment lung at 20 Hz: VCV 30 L/min for 1 s every 4 s, passive exponential expiration. */
function lungFrames(seconds: number, spo2: number | null = null): RecordedFrame[] {
  const frames: RecordedFrame[] = [];
  const peep = 5;
  const compliance = 50;
  const resistance = 10;
  const tau = 0.4;

  for (let at = 0; at <= seconds * 1000; at += PERIOD_MS) {
    const inCycle = (at % 4000) / 1000;
    let volume: number;
    let flow: number;

    if (inCycle < 1) {
      flow = 30;
      volume = 500 * inCycle;
    } else {
      volume = 500 * Math.exp(-(inCycle - 1) / tau);
      flow = -(volume / tau) * (60 / 1000);
    }

    const pressure = peep + volume / compliance + resistance * (flow / 60);
    frames.push({ serverTs: T0 + at, deviceTs: null, seq: null, pressure, flow, volume, spo2, pco2: null });
  }

  return frames;
}

const recording = (frames: RecordedFrame[]): RecordingSource => ({ reservationId: "r1", sampleRateHz: HZ, chunkCount: 1, frames });

afterEach(() => {
  vi.useRealTimers();
});

describe("useRecording (T11 review fix W1/W2)", () => {
  type Load = (reservationId: string, signal: AbortSignal) => Promise<RecordingSource>;

  it("indexes the download in chunks with a progress and keeps only the index", async() => {
    const source = recording(lungFrames(10));
    const load = vi.fn<Load>(() => Promise.resolve(source));
    const seen: string[] = [];
    const { result } = renderHook(() => {
      const value = useRecording("r1", { load, chunkSize: 50 });

      seen.push(value.state.status);

      return value;
    });

    expect(result.current.state).toEqual({ status: "loading" });
    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(seen.filter((status) => status === "indexing").length).toBeGreaterThan(2);
    const state = result.current.state;
    expect(state.status === "ready" ? state.index.count : 0).toBe(source.frames.length);
    // The raw frames are not kept by the hook: only the index (W2).
    expect(Object.keys(state)).toEqual(["status", "index"]);
    expect(state.status === "ready" && "frames" in state.index).toBe(false);
    expect(load).toHaveBeenCalledWith("r1", expect.any(AbortSignal));
  });

  it("aborts the download on unmount and indexes nothing", async() => {
    let signal: AbortSignal | null = null;
    const load = vi.fn<Load>((_id, received) => {
      signal = received;

      return new Promise<RecordingSource>(() => undefined);
    });
    const { result, unmount } = renderHook(() => useRecording("r1", { load }));

    expect(result.current.state).toEqual({ status: "loading" });
    unmount();
    expect((signal as AbortSignal | null)?.aborted).toBe(true);
  });

  it("downloads again on every visit (no cache: a recording opened while in progress is never served truncated)", async() => {
    const load = vi.fn<Load>(() => Promise.resolve(recording(lungFrames(1))));
    const first = renderHook(() => useRecording("r1", { load }));
    await waitFor(() => expect(first.result.current.state.status).toBe("ready"));
    first.unmount();

    const second = renderHook(() => useRecording("r1", { load }));
    await waitFor(() => expect(second.result.current.state.status).toBe("ready"));
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("gives the error and downloads again on reload, aborting nothing that finished", async() => {
    const load = vi.fn<Load>()
      .mockRejectedValueOnce(Object.assign(new Error("boom"), { status: 500 }))
      .mockResolvedValueOnce(recording(lungFrames(1)));
    const { result } = renderHook(() => useRecording("r1", { load }));

    await waitFor(() => expect(result.current.state.status).toBe("error"));
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(load).toHaveBeenCalledTimes(2);
  });
});

describe("useRecordingPlayback", () => {
  function setup(seconds = 60, spo2: number | null = null) {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    const index = indexRecording(recording(lungFrames(seconds, spo2)));
    let wall = 1_000_000;
    const clock = { advance: (ms: number) => { wall += ms; } };
    const hook = renderHook(() => useRecordingPlayback(index, { now: () => wall }));
    const received: ConsoleSample[] = [];
    const subscribe = () => hook.result.current.adapter.frames.subscribe((batch) => received.push(...batch.samples));

    const tick = (ms: number) => act(() => {
      clock.advance(ms);
      vi.advanceTimersByTime(ms);
    });

    return { hook, index, received, subscribe, tick };
  }

  it("delivers the frames as the position advances, ×1 then ×4, and nothing while paused", () => {
    const { hook, received, subscribe, tick } = setup();
    subscribe();

    // Paused at 0: only the first frame (the subscriber gets the delivered history).
    expect(received.map((sample) => sample.tMs)).toEqual([0]);
    expect(hook.result.current).toMatchObject({ positionMs: 0, playing: false, speed: 1, durationMs: 60_000 });

    act(() => hook.result.current.play());
    tick(1000);
    expect(received[received.length - 1]?.tMs).toBe(1000);
    expect(received).toHaveLength(21);
    expect(hook.result.current.positionMs).toBe(1000);

    act(() => hook.result.current.setSpeed(4));
    tick(1000);
    expect(received[received.length - 1]?.tMs).toBe(5000);

    act(() => hook.result.current.pause());
    const delivered = received.length;
    tick(5000);
    expect(received).toHaveLength(delivered);
    expect(hook.result.current).toMatchObject({ playing: false, positionMs: 5000 });
  });

  it("seeks to a new frame source whose late subscriber gets the preroll", () => {
    const { hook, received, subscribe } = setup();
    const firstSource = hook.result.current.adapter.frames.sourceId;

    act(() => hook.result.current.seek(30_000));

    expect(hook.result.current.positionMs).toBe(30_000);
    expect(hook.result.current.adapter.frames.sourceId).toBe("r1:recording:1");
    expect(firstSource).toBe("r1:recording:0");
    subscribe();
    expect(received[0]?.tMs).toBe(30_000 - PREROLL_MS + PERIOD_MS);
    expect(received[received.length - 1]?.tMs).toBe(30_000);
  });

  it("pauses at the end and plays again from 0 on a new source", () => {
    const { hook, tick } = setup(10);

    act(() => hook.result.current.play());
    act(() => hook.result.current.setSpeed(4));
    tick(3000);

    expect(hook.result.current).toMatchObject({ playing: false, positionMs: 10_000 });
    act(() => hook.result.current.play());
    expect(hook.result.current.adapter.frames.sourceId).toBe("r1:recording:1");
    expect(hook.result.current.positionMs).toBe(0);
  });

  it("derives the metrics from the played frames with the breath detection", () => {
    const { hook, tick } = setup();

    act(() => hook.result.current.play());
    act(() => hook.result.current.setSpeed(4));
    for (let step = 0; step < 6; step += 1) {
      tick(1000);
    }

    const peak = hook.result.current.adapter.metrics.peakPressure;
    const value = typeof peak === "object" && peak !== null ? peak.value : peak;
    expect(value).not.toBeNull();
    expect(value).toBeGreaterThan(18);
    expect(value).toBeLessThan(22);
  });

  it("shows 'sin datos' while the position is inside a recording gap (S1)", () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    const before = lungFrames(5);
    const after = lungFrames(5).map((item) => ({ ...item, serverTs: item.serverTs + 20_000 }));
    const index = indexRecording(recording([...before, ...after]));
    const wall = 1_000_000;
    const { result } = renderHook(() => useRecordingPlayback(index, { now: () => wall }));

    expect(index.gaps).toEqual([{ startMs: 5_000, endMs: 20_000 }]);
    expect(result.current.durationMs).toBe(25_000);
    expect(result.current.adapter.frames.status).toBe("live");

    act(() => result.current.seek(12_000));
    expect(result.current.adapter.frames).toMatchObject({ status: "no-data", statusMessage: PLAYBACK_GAP_MESSAGE });
    expect(result.current.inGap).toBe(true);

    act(() => result.current.seek(21_000));
    expect(result.current.adapter.frames.status).toBe("live");
    expect(result.current.inGap).toBe(false);
  });

  it("runs on performance.now by default, not on the adjustable wall clock (S2)", () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    let monotonic = 5_000;
    const spy = vi.spyOn(performance, "now").mockImplementation(() => monotonic);
    const index = indexRecording(recording(lungFrames(10)));
    const { result } = renderHook(() => useRecordingPlayback(index));

    act(() => result.current.play());
    act(() => {
      monotonic += 1_000;
      vi.advanceTimersByTime(1_000);
    });

    expect(result.current.positionMs).toBe(1_000);
    spy.mockRestore();
  });

  it("is read-only with a no-op confirm and shows the patient monitor only with reported vitals", () => {
    const silent = setup();
    const adapter = silent.hook.result.current.adapter;

    expect(adapter.permissions).toMatchObject({ canControl: false, readOnlyReason: PLAYBACK_READ_ONLY_REASON });
    expect(() => adapter.onConfirm({ changes: {} } as never)).not.toThrow();
    expect(adapter.capabilities?.patientMonitor).toBe(false);
    expect(adapter.settings.current).toEqual({});
    silent.hook.unmount();

    const withVitals = setup(10, 96);
    expect(withVitals.hook.result.current.adapter.capabilities?.patientMonitor).toBe(true);
    expect(withVitals.hook.result.current.adapter.patient.values).toEqual({ spo2: 96 });
  });
});
