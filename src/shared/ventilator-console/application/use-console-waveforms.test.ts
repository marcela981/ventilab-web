/*
* Funcionalidad: useConsoleWaveforms tests
* Descripción: Covers the frame-source subscription of the console curves: a new frame source object for the same `sourceId` keeps the subscription and the buffered curves, a new `sourceId` clears the ring and resubscribes, without `sourceId` the identity of `subscribe` decides, and the ring capacity follows the declared sample rate (default 50 Hz) and is recreated when it changes. Depends on Vitest and Testing Library.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CONSOLE_WINDOW_SECONDS, consoleBufferCapacity } from "./config/console.config";
import { useConsoleWaveforms } from "./use-console-waveforms";
import type { ConsoleFrameListener, ConsoleFrameSource } from "./ventilator-console.entity";

type FakeSource = {
  frames: ConsoleFrameSource
  subscribe: ReturnType<typeof vi.fn>
  unsubscribe: ReturnType<typeof vi.fn>
  emit: ConsoleFrameListener
};

function makeSource(extra: Partial<ConsoleFrameSource> = {}): FakeSource {
  const listeners: ConsoleFrameListener[] = [];
  const unsubscribe = vi.fn();
  const subscribe = vi.fn((listener: ConsoleFrameListener) => {
    listeners.push(listener);

    return unsubscribe;
  });

  return {
    frames: { subscribe, ...extra },
    subscribe,
    unsubscribe,
    emit: (batch) => listeners.forEach((listener) => listener(batch)),
  };
}

const BATCH = { samples: [{ tMs: 0, pressure: 5, flow: 30, volume: 0 }, { tMs: 20, pressure: 12, flow: 28, volume: 10 }] };

describe("useConsoleWaveforms", () => {
  it("keeps the subscription and the curves when a new frame source object has the same sourceId", () => {
    const source = makeSource({ sourceId: "session-1" });
    const { result, rerender } = renderHook(({ frames }) => useConsoleWaveforms(frames), { initialProps: { frames: source.frames } });

    act(() => source.emit(BATCH));
    const buffer = result.current;
    const generation = buffer.generation;

    // A consumer that rebuilds its adapter every render: new object, new subscribe function, same source.
    const rebuilt = makeSource({ sourceId: "session-1" });
    rerender({ frames: rebuilt.frames });
    rerender({ frames: { ...source.frames } });

    expect(source.subscribe).toHaveBeenCalledTimes(1);
    expect(rebuilt.subscribe).not.toHaveBeenCalled();
    expect(source.unsubscribe).not.toHaveBeenCalled();
    expect(result.current).toBe(buffer);
    expect(buffer.generation).toBe(generation);
    expect(buffer.size).toBe(2);
  });

  it("clears the curves and resubscribes when the sourceId changes", () => {
    const first = makeSource({ sourceId: "session-1" });
    const { result, rerender } = renderHook(({ frames }) => useConsoleWaveforms(frames), { initialProps: { frames: first.frames } });

    act(() => first.emit(BATCH));
    const second = makeSource({ sourceId: "session-2" });
    rerender({ frames: second.frames });

    expect(first.unsubscribe).toHaveBeenCalledTimes(1);
    expect(second.subscribe).toHaveBeenCalledTimes(1);
    expect(result.current.size).toBe(0);
  });

  it("falls back to the identity of subscribe when no sourceId is given", () => {
    const source = makeSource();
    const { result, rerender } = renderHook(({ frames }) => useConsoleWaveforms(frames), { initialProps: { frames: source.frames } });

    act(() => source.emit(BATCH));
    rerender({ frames: { subscribe: source.subscribe } });

    expect(source.subscribe).toHaveBeenCalledTimes(1);
    expect(result.current.size).toBe(2);

    const other = makeSource();
    rerender({ frames: other.frames });

    expect(source.unsubscribe).toHaveBeenCalledTimes(1);
    expect(other.subscribe).toHaveBeenCalledTimes(1);
    expect(result.current.size).toBe(0);
  });

  it("sizes the ring for twice the largest window at the declared sample rate and recreates it when the rate changes", () => {
    const largest = Math.max(...CONSOLE_WINDOW_SECONDS);
    const source = makeSource({ sourceId: "replay" });
    const { result, rerender } = renderHook(({ frames }) => useConsoleWaveforms(frames), { initialProps: { frames: source.frames } });

    expect(result.current.capacity).toBe(Math.ceil(50 * largest * 2));
    const first = result.current;

    rerender({ frames: { ...source.frames, sampleRateHz: 100 } });

    expect(result.current).not.toBe(first);
    expect(result.current.capacity).toBe(Math.ceil(100 * largest * 2));
    act(() => source.emit(BATCH));
    expect(result.current.size).toBe(2);
    expect(source.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("computes the capacity with ceil and falls back to 50 Hz for a missing or invalid rate", () => {
    expect(consoleBufferCapacity(12.5)).toBe(Math.ceil(12.5 * Math.max(...CONSOLE_WINDOW_SECONDS) * 2));
    expect(consoleBufferCapacity(undefined)).toBe(consoleBufferCapacity(50));
    expect(consoleBufferCapacity(0)).toBe(consoleBufferCapacity(50));
    expect(consoleBufferCapacity(Number.NaN)).toBe(consoleBufferCapacity(50));
  });
});
