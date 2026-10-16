/*
* Funcionalidad: SweepCanvas and LoopCanvas tests
* Descripción: Covers the canvas renderers in jsdom: accessible names, freeze snapshot with the measurement cursor (pointer, arrow keys, Home/End) and its aria-live readout, unfreeze, and the paint loop with a mocked 2D context and a manual requestAnimationFrame (DPR-scaled backing store, colors read from CSS custom properties, incremental sweep frames that clip to the erase spans, 30 fps throttle, loop polyline). Depends on Vitest and Testing Library.
* Versión: 1.0
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

function runFrame(now: number): void {
  const pending = frames;
  frames = [];
  pending.forEach((callback) => callback(now));
}

beforeEach(() => {
  frames = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => frames.push(callback));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
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
    expect(screen.getByText("t = 9.90 s · Presión 99.0 cmH2O · Flujo -99.0 L/min")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByText("Congelado")).toBeInTheDocument();
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

  it("paints only the erase spans for new samples and throttles to about 30 fps", () => {
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
    const rects = fake.calls.filter((call) => call.name === "rect");
    // Head moves from 4.0 s to 4.1 s: x 183.2 → 186.68 on a 348 px plot, plus the 12 px erase gap.
    expect(rects[0]?.args[0]).toBeCloseTo(183.2, 1);
    expect(rects[0]?.args[2]).toBeCloseTo(15.48, 1);
    expect(fake.calls.filter((call) => call.name === "clip").length).toBeGreaterThan(0);
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
