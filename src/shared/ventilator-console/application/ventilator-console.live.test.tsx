/*
* Funcionalidad: VentilatorConsole live-data tests
* Descripción: Streams frame batches into a rendered console through the captured frame listener and checks that the samples land in the ring buffer the curves zone reads, that the console does not re-render for live data (React Profiler commit count), and that rebuilding the adapter object for the same source keeps the buffered curves. The curves zone is replaced by a probe that records the buffer it receives. Depends on Vitest and Testing Library.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { Profiler } from "react";
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WaveformRingBuffer } from "@shared/waveforms";
import type { CurveId } from "./config/console.config";
import { VentilatorConsole } from "./ventilator-console";
import type { ConsoleFrameListener, VentilatorConsoleAdapter } from "./ventilator-console.entity";

const probe = vi.hoisted(() => ({ buffers: [] as unknown[] }));

vi.mock("./curves-zone", () => ({
  CurvesZone: ({ buffer }: { buffer: unknown }) => {
    probe.buffers.push(buffer);

    return null;
  },
}));

function lastBuffer(): WaveformRingBuffer<CurveId> {
  const buffer = probe.buffers.at(-1);

  if (!buffer) {
    throw new Error("The curves zone was not rendered");
  }

  return buffer as WaveformRingBuffer<CurveId>;
}

function makeAdapter(): { adapter: VentilatorConsoleAdapter, subscribe: ReturnType<typeof vi.fn>, emit: ConsoleFrameListener } {
  let listener: ConsoleFrameListener | null = null;
  const subscribe = vi.fn((next: ConsoleFrameListener) => {
    listener = next;

    return () => {
      listener = null;
    };
  });
  const adapter: VentilatorConsoleAdapter = {
    frames: { subscribe, sourceId: "session-1" },
    settings: { current: {}, applied: {} },
    mode: { current: "VCV", options: [{ id: "VCV", label: "VCV" }] },
    metrics: {},
    patient: { values: {} },
    alarms: [],
    permissions: { canControl: false },
    limits: {},
    onConfirm: vi.fn(),
  };

  return { adapter, subscribe, emit: (batch) => listener?.(batch) };
}

beforeEach(() => {
  probe.buffers = [];
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("VentilatorConsole live data", () => {
  it("pushes emitted batches into the curves buffer without re-rendering the console", () => {
    const fake = makeAdapter();
    const onRender = vi.fn();
    render(
      <Profiler id="console" onRender={onRender}>
        <VentilatorConsole adapter={fake.adapter} alarmsSlot={null} controlsSlot={null} />
      </Profiler>,
    );
    const commits = onRender.mock.calls.length;
    const renders = probe.buffers.length;

    act(() => {
      fake.emit({ samples: [{ tMs: 0, pressure: 5, flow: 30, volume: 0 }, { tMs: 20, pressure: 12, flow: 28, volume: 10 }] });
      fake.emit({ samples: [{ tMs: 40, pressure: 14, flow: 20, volume: 18 }] });
    });

    const window = lastBuffer().readAll();
    expect(Array.from(window.t)).toEqual([0, 20, 40]);
    expect(Array.from(window.values.pressure)).toEqual([5, 12, 14]);
    expect(onRender.mock.calls.length).toBe(commits);
    expect(probe.buffers.length).toBe(renders);
  });

  it("keeps the buffered curves when the consumer rebuilds the adapter for the same source", () => {
    const fake = makeAdapter();
    const { rerender } = render(<VentilatorConsole adapter={fake.adapter} alarmsSlot={null} controlsSlot={null} />);

    act(() => fake.emit({ samples: [{ tMs: 0, pressure: 5, flow: 30, volume: 0 }] }));
    rerender(<VentilatorConsole adapter={{ ...fake.adapter, frames: { ...fake.adapter.frames } }} alarmsSlot={null} controlsSlot={null} />);
    act(() => fake.emit({ samples: [{ tMs: 20, pressure: 6, flow: 25, volume: 5 }] }));

    expect(fake.subscribe).toHaveBeenCalledTimes(1);
    expect(Array.from(lastBuffer().readAll().t)).toEqual([0, 20]);
  });
});
