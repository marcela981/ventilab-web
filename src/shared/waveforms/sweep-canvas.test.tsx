/*
* Funcionalidad: SweepCanvas and LoopCanvas tests
* Descripción: Covers the canvas renderers in jsdom: accessible names, freeze snapshot with the measurement cursor (pointer, arrow keys, PageUp/PageDown, Home/End) and its readout (described, not aria-live), unfreeze, and the paint loop with a mocked 2D context and a manual requestAnimationFrame (DPR-scaled backing store, colors read from CSS custom properties, incremental sweep frames that copy only the erase spans from the chrome layer, two spans across the wrap, palette re-read only on full repaints and theme changes, sweep snapshot after the erase gap, unmount cleanup, 30 fps throttle, loop polyline with pen lifts). Depends on Vitest and Testing Library.
*   v1.2 (W3, Bloque 1): with a playback delay and the display frame rate the live trace is drawn on (almost) every
*   frame between data batches.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoopCanvas } from "./loop-canvas";
import { SweepCanvas } from "./sweep-canvas";
import { DISPLAY_REFRESH_FPS } from "./use-waveform-renderer";
import type { SweepChannel } from "./sweep-painter";
import { WaveformRingBuffer } from "./waveform-ring-buffer";

type Channel = "pressure" | "flow" | "volume";
type Call = { name: string, args: unknown[] };

const CHANNELS: readonly SweepChannel<Channel>[] = [
  { key: "pressure", label: "Presión", unit: "cmH2O", colorVar: "--vl-console-curve-pressure", range: { min: 0, max: 100 } },
  { key: "flow", label: "Flujo", unit: "L/min", colorVar: "--vl-console-curve-flow", range: { min: -100, max: 100 } },
];

function makeBuffer(lastMs = 9_900): WaveformRingBuffer<Channel> {
  const buffer = new WaveformRingBuffer<Channel>({ channels: ["pressure", "flow", "volume"], capacity: 1_000 });

  for (let t = 0; t <= lastMs; t += 100) {
    buffer.push({ tMs: t, values: { pressure: t / 100, flow: -t / 100, volume: t / 10 } });
  }

  return buffer;
}

function createFakeContext(): { ctx: CanvasRenderingContext2D, calls: Call[] } {
  const calls: Call[] = [];
  const props: Record<string, unknown> = {};
  const proxy = new Proxy({}, {
    get: (_target, key: string) => key in props
      ? props[key]
      : (...args: unknown[]) => {
        calls.push({ name: key, args });
      },
    set: (_target, key: string, value: unknown) => {
      props[key] = value;
      calls.push({ name: `set:${key}`, args: [value] });

      return true;
    },
  });

  return { ctx: proxy as CanvasRenderingContext2D, calls };
}

let frames: FrameRequestCallback[] = [];
let cancelFrame = vi.fn();

function runFrame(now: number): void {
  const pending = frames;
  frames = [];
  pending.forEach((callback) => callback(now));
}

/** drawImage calls with the 9-argument (source rectangle) form, i.e. the span copies of the chrome layer. */
function spanCopies(calls: Call[]): Call[] {
  return calls.filter((call) => call.name === "drawImage" && call.args.length === 9);
}

beforeEach(() => {
  frames = [];
  cancelFrame = vi.fn();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => frames.push(callback));
  vi.stubGlobal("cancelAnimationFrame", cancelFrame);
  vi.spyOn(HTMLCanvasElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0, y: 0, left: 0, top: 0, right: 400, bottom: 200, width: 400, height: 200, toJSON: () => ({}),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("SweepCanvas without a 2D context", () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });

  it("renders a labelled image while live", () => {
    render(<SweepCanvas buffer={makeBuffer()} channels={CHANNELS} label="Curvas" />);

    expect(screen.getByRole("img", { name: "Curvas" })).toBeInTheDocument();
    expect(screen.queryByText("Congelado")).not.toBeInTheDocument();
  });

  it("freezes a snapshot and reads the last sample at the cursor", () => {
    const buffer = makeBuffer();
    const { rerender } = render(<SweepCanvas buffer={buffer} channels={CHANNELS} label="Curvas" />);

    rerender(<SweepCanvas buffer={buffer} channels={CHANNELS} label="Curvas" frozen />);
    buffer.push({ tMs: 10_000, values: { pressure: 500, flow: 0 } });

    const slider = screen.getByRole("slider", { name: "Curvas (congelado): cursor de medición" });
    expect(slider).toHaveAttribute("aria-valuetext", "t = 9.90 s · Presión 99.0 cmH2O · Flujo -99.0 L/min");
    const readout = screen.getByText("t = 9.90 s · Presión 99.0 cmH2O · Flujo -99.0 L/min");
    // The slider announces the value; a live region would duplicate it and flood on pointermove.
    expect(readout).not.toHaveAttribute("aria-live");
    expect(slider).toHaveAttribute("aria-describedby", readout.id);
    expect(screen.getByText("Congelado")).toBeInTheDocument();
  });

  it("moves the cursor by a tenth of the window with PageUp and PageDown", () => {
    render(<SweepCanvas buffer={makeBuffer()} channels={CHANNELS} label="Curvas" frozen />);
    const slider = screen.getByRole("slider");

    fireEvent.keyDown(slider, { key: "PageDown" });
    expect(slider).toHaveAttribute("aria-valuenow", "89");

    fireEvent.keyDown(slider, { key: "PageUp" });
    fireEvent.keyDown(slider, { key: "PageUp" });
    expect(slider).toHaveAttribute("aria-valuenow", "99");
  });

  it("moves the cursor with the arrow keys, Shift, Home and End", () => {
    render(<SweepCanvas buffer={makeBuffer()} channels={CHANNELS} label="Curvas" frozen />);
    const slider = screen.getByRole("slider");

    fireEvent.keyDown(slider, { key: "ArrowLeft" });
    expect(slider).toHaveAttribute("aria-valuenow", "98");

    fireEvent.keyDown(slider, { key: "ArrowLeft", shiftKey: true });
    expect(slider).toHaveAttribute("aria-valuetext", expect.stringContaining("t = 8.80 s"));

    fireEvent.keyDown(slider, { key: "Home" });
    expect(slider).toHaveAttribute("aria-valuenow", "0");

    fireEvent.keyDown(slider, { key: "ArrowLeft" });
    expect(slider).toHaveAttribute("aria-valuenow", "0");

    fireEvent.keyDown(slider, { key: "End" });
    expect(slider).toHaveAttribute("aria-valuenow", "99");
  });

  it("follows the pointer on the frozen trace (scroll layout)", () => {
    render(<SweepCanvas buffer={makeBuffer()} channels={CHANNELS} label="Curvas" mode="scroll" frozen />);
    const slider = screen.getByRole("slider");

    // Plot spans x 44..392 (400 - 44 - 8); its middle is t = 4.9 s.
    // jsdom has no PointerEvent; React handles any event typed "pointermove".
    fireEvent(slider, new MouseEvent("pointermove", { bubbles: true, clientX: 218 }));

    expect(slider).toHaveAttribute("aria-valuetext", "t = 4.90 s · Presión 49.0 cmH2O · Flujo -49.0 L/min");
  });

  it("drops the snapshot when unfrozen", () => {
    const buffer = makeBuffer();
    const { rerender } = render(<SweepCanvas buffer={buffer} channels={CHANNELS} label="Curvas" frozen />);

    rerender(<SweepCanvas buffer={buffer} channels={CHANNELS} label="Curvas" />);

    expect(screen.getByRole("img", { name: "Curvas" })).toBeInTheDocument();
    expect(screen.queryByText(/t = /)).not.toBeInTheDocument();
  });
});

describe("SweepCanvas paint loop", () => {
  it("scales the backing store by devicePixelRatio and reads curve colors from CSS variables", () => {
    const fake = createFakeContext();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(fake.ctx as never);
    vi.stubGlobal("devicePixelRatio", 2);

    render(<SweepCanvas buffer={makeBuffer()} channels={CHANNELS} label="Curvas" />);
    const canvas = screen.getByRole<HTMLCanvasElement>("img");
    canvas.style.setProperty("--vl-console-curve-pressure", "orange");
    runFrame(1_000);

    expect(canvas.width).toBe(800);
    expect(canvas.height).toBe(400);
    expect(fake.calls).toContainEqual({ name: "setTransform", args: [2, 0, 0, 2, 0, 0] });
    expect(fake.calls).toContainEqual({ name: "set:strokeStyle", args: ["orange"] });
    expect(fake.calls.some((call) => call.name === "stroke")).toBe(true);
  });

  it("copies only the erase spans from the chrome layer for new samples and throttles to about 30 fps", () => {
    const fake = createFakeContext();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(fake.ctx as never);
    const buffer = makeBuffer(4_000);

    render(<SweepCanvas buffer={buffer} channels={CHANNELS} label="Curvas" />);
    runFrame(1_000);
    fake.calls.length = 0;

    buffer.push({ tMs: 4_100, values: { pressure: 41, flow: -41 } });
    runFrame(1_010);
    expect(fake.calls).toHaveLength(0);

    runFrame(1_040);
    const copies = spanCopies(fake.calls);
    // Head moves from 4.0 s to 4.1 s: x 183.2 → 186.68 on a 348 px plot, plus the 12 px erase gap.
    expect(copies).toHaveLength(1);
    expect(copies[0]?.args[5]).toBeCloseTo(183.2, 1);
    expect(copies[0]?.args[7]).toBeCloseTo(15.48, 1);
    // The chrome is not redrawn: no grid text or background fill on an incremental frame.
    expect(fake.calls.some((call) => call.name === "fillText" || call.name === "fillRect")).toBe(false);
  });

  it("copies two spans when the sweep head wraps around the right edge", () => {
    const fake = createFakeContext();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(fake.ctx as never);
    const buffer = makeBuffer(9_900);

    render(<SweepCanvas buffer={buffer} channels={CHANNELS} label="Curvas" />);
    runFrame(1_000);
    fake.calls.length = 0;

    buffer.push({ tMs: 10_000, values: { pressure: 1, flow: -1 } });
    runFrame(1_040);
    const copies = spanCopies(fake.calls);

    // 9.9 s sits at x 388.52; 10.0 s wraps to the left edge (x 44) plus the 12 px gap.
    expect(copies).toHaveLength(2);
    expect(copies[0]?.args[5]).toBeCloseTo(388.52, 1);
    expect(copies[0]?.args[7]).toBeCloseTo(3.48, 1);
    expect(copies[1]?.args[5]).toBeCloseTo(44, 1);
    expect(copies[1]?.args[7]).toBeCloseTo(12, 1);
  });

  it("re-reads the palette only on a full repaint, including after a theme change", async () => {
    const fake = createFakeContext();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(fake.ctx as never);
    const styles = vi.spyOn(globalThis, "getComputedStyle");
    const buffer = makeBuffer(4_000);

    render(<SweepCanvas buffer={buffer} channels={CHANNELS} label="Curvas" />);
    runFrame(1_000);
    const afterFirst = styles.mock.calls.length;
    expect(afterFirst).toBeGreaterThan(0);

    buffer.push({ tMs: 4_100, values: { pressure: 41, flow: -41 } });
    runFrame(1_040);
    expect(styles.mock.calls.length).toBe(afterFirst);

    document.documentElement.setAttribute("data-theme", "dark");
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    runFrame(1_080);
    document.documentElement.removeAttribute("data-theme");

    expect(styles.mock.calls.length).toBeGreaterThan(afterFirst);
  });

  it("starts a sweep-mode snapshot after the erase gap so the cursor stays on drawn samples", () => {
    const fake = createFakeContext();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(fake.ctx as never);
    const buffer = makeBuffer();
    const { rerender } = render(<SweepCanvas buffer={buffer} channels={CHANNELS} label="Curvas" />);

    rerender(<SweepCanvas buffer={buffer} channels={CHANNELS} label="Curvas" frozen />);
    const slider = screen.getByRole("slider");
    fireEvent.keyDown(slider, { key: "Home" });

    // The 12 px gap on a 348 px plot hides 344.8 ms of a 10 s window: the oldest drawn sample is 0.3 s.
    expect(slider).toHaveAttribute("aria-valuetext", expect.stringContaining("t = 0.30 s"));
  });

  it("draws by time on every display frame between 30 Hz batches when a playback delay is set", () => {
    const fake = createFakeContext();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(fake.ctx as never);
    const buffer = new WaveformRingBuffer<Channel>({ channels: ["pressure", "flow", "volume"], capacity: 1_000 });
    const push = (tMs: number) => buffer.push({ tMs, values: { pressure: tMs / 100, flow: 0, volume: 0 } });

    render(<SweepCanvas buffer={buffer} channels={CHANNELS} label="Curvas" fps={DISPLAY_REFRESH_FPS} playbackDelayMs={50} />);

    let drawnFrames = 0;
    let sample = 0;
    let nextBatch = 0;

    // 2 s at 60 Hz; a batch of 50 Hz samples lands every 33.3 ms (wall time = source time).
    for (let frame = 0; frame < 120; frame += 1) {
      const now = 1_000 + frame * (1000 / 60);

      while (nextBatch <= now - 1_000) {
        for (; sample <= nextBatch; sample += 20) {
          push(sample);
        }

        nextBatch += 1000 / 30;
      }

      fake.calls.length = 0;
      runFrame(now);

      if (fake.calls.some((call) => call.name === "stroke")) {
        drawnFrames += 1;
      }
    }

    // Once the source rate is learnt the trace moves on (almost) every frame, not only when a batch lands (~30/s).
    expect(drawnFrames).toBeGreaterThan(100);
  });

  it("cancels the animation frame and disconnects the ResizeObserver on unmount", () => {
    const fake = createFakeContext();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(fake.ctx as never);
    const observe = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal("ResizeObserver", class {
      public observe = observe;
      public disconnect = disconnect;
      public unobserve = vi.fn();
    });

    const { unmount } = render(<SweepCanvas buffer={makeBuffer()} channels={CHANNELS} label="Curvas" />);
    runFrame(1_000);
    expect(observe).toHaveBeenCalledTimes(1);

    unmount();

    // The fake rAF returns the queue length as its handle; the pending tick holds handle 1.
    expect(cancelFrame).toHaveBeenCalledExactlyOnceWith(1);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});

describe("LoopCanvas", () => {
  it("draws the x/y loop of the last window", () => {
    const fake = createFakeContext();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(fake.ctx as never);

    render(
      <LoopCanvas
        buffer={makeBuffer()}
        x={{ key: "volume", label: "Volumen", unit: "mL" }}
        y={{ key: "pressure", label: "Presión", unit: "cmH2O" }}
        colorVar="--vl-console-curve-pressure"
        label="Bucle presión-volumen"
        windowSeconds={1}
      />,
    );
    runFrame(1_000);

    expect(screen.getByRole("img", { name: "Bucle presión-volumen" })).toBeInTheDocument();
    // 1 s window at 100 ms → 11 samples → 1 moveTo + 10 lineTo on the loop path (after the grid stroke).
    const lastBegin = fake.calls.map((call) => call.name).lastIndexOf("beginPath");
    const loopCalls = fake.calls.slice(lastBegin);
    expect(loopCalls.filter((call) => call.name === "lineTo")).toHaveLength(10);
    expect(fake.calls).toContainEqual({ name: "fillText", args: ["Volumen (mL)", 392, 198] });
  });

  it("lifts the pen across a gap of missing samples instead of drawing a chord", () => {
    const fake = createFakeContext();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(fake.ctx as never);
    const buffer = new WaveformRingBuffer<Channel>({ channels: ["pressure", "flow", "volume"], capacity: 16 });
    buffer.pushBatch([
      { tMs: 0, values: { pressure: 5, volume: 0 } },
      { tMs: 100, values: { pressure: 10, volume: 100 } },
      { tMs: 200, values: { pressure: Number.NaN, volume: Number.NaN } },
      { tMs: 300, values: { pressure: 8, volume: 300 } },
      { tMs: 400, values: { pressure: 6, volume: 200 } },
    ]);

    render(
      <LoopCanvas
        buffer={buffer}
        x={{ key: "volume", label: "Volumen", unit: "mL", range: { min: 0, max: 400 } }}
        y={{ key: "pressure", label: "Presión", unit: "cmH2O", range: { min: 0, max: 20 } }}
        colorVar="--vl-console-curve-pressure"
        label="Bucle presión-volumen"
      />,
    );
    runFrame(1_000);

    const lastBegin = fake.calls.map((call) => call.name).lastIndexOf("beginPath");
    const loopCalls = fake.calls.slice(lastBegin);
    expect(loopCalls.filter((call) => call.name === "moveTo")).toHaveLength(2);
    expect(loopCalls.filter((call) => call.name === "lineTo")).toHaveLength(2);
  });

  it("labels a frozen loop", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);

    render(
      <LoopCanvas
        buffer={makeBuffer()}
        x={{ key: "volume", label: "Volumen", unit: "mL" }}
        y={{ key: "flow", label: "Flujo", unit: "L/min" }}
        colorVar="--vl-console-curve-flow"
        label="Bucle flujo-volumen"
        frozen
      />,
    );

    expect(screen.getByRole("img", { name: "Bucle flujo-volumen (congelado)" })).toBeInTheDocument();
  });
});
