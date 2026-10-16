/*
* Funcionalidad: WaveformRingBuffer tests
* Descripción: Covers the fixed-capacity Float32 ring: single and batch push, wrap-around ordering after overflow, time-window reads, sequence-based incremental reads, clear/generation and snapshot copies. Depends on Vitest only.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { WaveformRingBuffer } from "./waveform-ring-buffer";

type Channel = "pressure" | "flow";

function makeBuffer(capacity: number): WaveformRingBuffer<Channel> {
  return new WaveformRingBuffer<Channel>({ channels: ["pressure", "flow"], capacity });
}

function pushRange(buffer: WaveformRingBuffer<Channel>, from: number, to: number): void {
  for (let i = from; i <= to; i += 1) {
    buffer.push({ tMs: i * 10, values: { pressure: i, flow: -i } });
  }
}

describe("WaveformRingBuffer", () => {
  it("rejects a non-positive capacity", () => {
    expect(() => makeBuffer(0)).toThrow();
  });

  it("stores samples in order before it is full", () => {
    const buffer = makeBuffer(5);
    pushRange(buffer, 1, 3);

    const window = buffer.readAll();

    expect(buffer.size).toBe(3);
    expect(Array.from(window.t)).toEqual([10, 20, 30]);
    expect(Array.from(window.values.pressure)).toEqual([1, 2, 3]);
    expect(Array.from(window.values.flow)).toEqual([-1, -2, -3]);
    expect(buffer.latestTime).toBe(30);
  });

  it("keeps the newest samples in chronological order after wrapping", () => {
    const buffer = makeBuffer(4);
    pushRange(buffer, 1, 7);

    const window = buffer.readAll();

    expect(buffer.size).toBe(4);
    expect(buffer.writeCount).toBe(7);
    expect(Array.from(window.t)).toEqual([40, 50, 60, 70]);
    expect(Array.from(window.values.pressure)).toEqual([4, 5, 6, 7]);
    expect(window.firstSequence).toBe(3);
  });

  it("pushes a batch in one call", () => {
    const buffer = makeBuffer(3);
    buffer.pushBatch([
      { tMs: 0, values: { pressure: 1, flow: 1 } },
      { tMs: 10, values: { pressure: 2, flow: 2 } },
      { tMs: 20, values: { pressure: 3, flow: 3 } },
      { tMs: 30, values: { pressure: 4, flow: 4 } },
    ]);

    expect(Array.from(buffer.readAll().values.pressure)).toEqual([2, 3, 4]);
  });

  it("treats a missing channel value as NaN", () => {
    const buffer = makeBuffer(2);
    buffer.push({ tMs: 0, values: { pressure: 1 } });

    expect(Number.isNaN(buffer.readAll().values.flow[0])).toBe(true);
  });

  it("reads an inclusive time window across the wrap point", () => {
    const buffer = makeBuffer(4);
    pushRange(buffer, 1, 6);

    const window = buffer.readWindow(40, 50);

    expect(Array.from(window.t)).toEqual([40, 50]);
    expect(Array.from(window.values.flow)).toEqual([-4, -5]);
    expect(window.firstSequence).toBe(3);
  });

  it("returns an empty window when nothing matches", () => {
    const buffer = makeBuffer(4);
    pushRange(buffer, 1, 2);

    expect(buffer.readWindow(100).length).toBe(0);
    expect(makeBuffer(2).readAll().length).toBe(0);
  });

  it("reads incrementally from a sequence and clamps to the oldest sample kept", () => {
    const buffer = makeBuffer(4);
    pushRange(buffer, 1, 3);
    const seen = buffer.writeCount;
    pushRange(buffer, 4, 5);

    expect(Array.from(buffer.readSince(seen).t)).toEqual([40, 50]);
    expect(Array.from(buffer.readSince(0).t)).toEqual([20, 30, 40, 50]);
    expect(buffer.readSince(buffer.writeCount).length).toBe(0);
  });

  it("clears the ring and bumps the generation", () => {
    const buffer = makeBuffer(4);
    pushRange(buffer, 1, 3);
    const generation = buffer.generation;

    buffer.clear();

    expect(buffer.size).toBe(0);
    expect(buffer.writeCount).toBe(0);
    expect(buffer.latestTime).toBeNull();
    expect(buffer.generation).toBe(generation + 1);
  });

  it("returns copies that do not change when more data arrives", () => {
    const buffer = makeBuffer(2);
    pushRange(buffer, 1, 2);
    const snapshot = buffer.readAll();

    pushRange(buffer, 3, 4);

    expect(Array.from(snapshot.values.pressure)).toEqual([1, 2]);
  });
});
