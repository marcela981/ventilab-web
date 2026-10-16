/*
* Funcionalidad: Waveform geometry tests
* Descripción: Covers the pure drawing math of the canvas renderers without a real canvas: sweep position, value/time to pixel mapping, pixel to time (sweep and scroll), nearest-sample lookup, auto-range, ticks, lanes, loop extraction and the cursor readout text. Depends on Vitest and the ring buffer.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import {
  computeAutoRange,
  computeLanes,
  eraseSpans,
  extractLoop,
  findNearestIndex,
  formatCursorReadout,
  niceTicks,
  pixelToTime,
  scrollX,
  sweepRatio,
  sweepX,
  valueToX,
  valueToY,
} from "./waveform-geometry";
import { WaveformRingBuffer } from "./waveform-ring-buffer";

const PLOT = { x: 40, width: 400 };

describe("sweep position", () => {
  it("wraps time into the window as a 0..1 ratio", () => {
    expect(sweepRatio(0, 10_000)).toBe(0);
    expect(sweepRatio(2_500, 10_000)).toBe(0.25);
    expect(sweepRatio(12_500, 10_000)).toBe(0.25);
    expect(sweepRatio(-2_500, 10_000)).toBe(0.75);
  });

  it("maps a sweep time into the plot area", () => {
    expect(sweepX(15_000, 10_000, PLOT)).toBe(240);
  });

  it("maps a scroll time so the latest sample sits on the right edge", () => {
    expect(scrollX(20_000, 20_000, 10_000, PLOT)).toBe(440);
    expect(scrollX(10_000, 20_000, 10_000, PLOT)).toBe(40);
    expect(scrollX(15_000, 20_000, 10_000, PLOT)).toBe(240);
  });
});

describe("valueToY", () => {
  const lane = { y: 100, height: 200 };

  it("maps the range bottom to the lane bottom and the top to the lane top", () => {
    expect(valueToY(0, { min: 0, max: 40 }, lane)).toBe(300);
    expect(valueToY(40, { min: 0, max: 40 }, lane)).toBe(100);
    expect(valueToY(10, { min: 0, max: 40 }, lane)).toBe(250);
  });

  it("centers a flat range instead of dividing by zero", () => {
    expect(valueToY(5, { min: 5, max: 5 }, lane)).toBe(200);
  });
});

describe("valueToX", () => {
  it("maps the range onto the plot width", () => {
    expect(valueToX(250, { min: 0, max: 500 }, PLOT)).toBe(240);
    expect(valueToX(3, { min: 3, max: 3 }, PLOT)).toBe(240);
  });
});

describe("eraseSpans", () => {
  it("clears from the previous head to the new head plus the gap", () => {
    expect(eraseSpans(100, 120, 10, PLOT)).toEqual([[100, 130]]);
  });

  it("splits at the right edge when the head wraps", () => {
    expect(eraseSpans(430, 50, 10, PLOT)).toEqual([[430, 440], [40, 60]]);
  });

  it("wraps the erase gap ahead of a head close to the right edge", () => {
    expect(eraseSpans(420, 435, 10, PLOT)).toEqual([[420, 440], [40, 45]]);
  });
});

describe("pixelToTime", () => {
  it("inverts scrollX", () => {
    expect(pixelToTime(240, PLOT, 10_000, 20_000, "scroll")).toBe(15_000);
  });

  it("resolves sweep pixels left of the head to the current cycle", () => {
    expect(pixelToTime(140, PLOT, 10_000, 25_000, "sweep")).toBe(22_500);
  });

  it("resolves sweep pixels right of the head to the previous cycle", () => {
    expect(pixelToTime(340, PLOT, 10_000, 25_000, "sweep")).toBe(17_500);
  });

  it("clamps pixels outside the plot", () => {
    expect(pixelToTime(0, PLOT, 10_000, 20_000, "scroll")).toBe(10_000);
    expect(pixelToTime(999, PLOT, 10_000, 20_000, "scroll")).toBe(20_000);
  });
});

describe("findNearestIndex", () => {
  const times = new Float64Array([0, 10, 20, 30, 40]);

  it("returns the closest sample index", () => {
    expect(findNearestIndex(times, times.length, 12)).toBe(1);
    expect(findNearestIndex(times, times.length, 16)).toBe(2);
    expect(findNearestIndex(times, times.length, 40)).toBe(4);
  });

  it("clamps to the ends and handles empty input", () => {
    expect(findNearestIndex(times, times.length, -50)).toBe(0);
    expect(findNearestIndex(times, times.length, 500)).toBe(4);
    expect(findNearestIndex(times, 0, 5)).toBe(-1);
  });
});

describe("computeAutoRange", () => {
  it("pads the min/max of the finite values", () => {
    expect(computeAutoRange(new Float32Array([0, 10, Number.NaN, 5]), 4, { min: -1, max: 1 }, 0.1)).toEqual({ min: -1, max: 11 });
  });

  it("falls back when there are no finite values", () => {
    expect(computeAutoRange(new Float32Array([Number.NaN]), 1, { min: -1, max: 1 })).toEqual({ min: -1, max: 1 });
  });

  it("widens a flat signal around its value", () => {
    expect(computeAutoRange(new Float32Array([5, 5]), 2, { min: 0, max: 1 }, 0)).toEqual({ min: 4, max: 6 });
  });
});

describe("niceTicks", () => {
  it("returns round steps inside the range", () => {
    expect(niceTicks({ min: 0, max: 40 }, 5)).toEqual([0, 10, 20, 30, 40]);
    expect(niceTicks({ min: -60, max: 60 }, 4)).toEqual([-50, 0, 50]);
  });
});

describe("computeLanes", () => {
  it("splits the height into equal lanes separated by a gap", () => {
    expect(computeLanes(320, 3, 10)).toEqual([
      { y: 0, height: 100 },
      { y: 110, height: 100 },
      { y: 220, height: 100 },
    ]);
  });
});

describe("extractLoop", () => {
  it("pairs x and y channels of a window and skips non-finite samples", () => {
    const buffer = new WaveformRingBuffer<"volume" | "pressure">({ channels: ["volume", "pressure"], capacity: 8 });
    buffer.pushBatch([
      { tMs: 0, values: { volume: 0, pressure: 5 } },
      { tMs: 10, values: { volume: 100, pressure: Number.NaN } },
      { tMs: 20, values: { volume: 200, pressure: 15 } },
    ]);

    const loop = extractLoop(buffer.readAll(), "volume", "pressure");

    expect(loop.length).toBe(2);
    expect(Array.from(loop.x)).toEqual([0, 200]);
    expect(Array.from(loop.y)).toEqual([5, 15]);
  });
});

describe("formatCursorReadout", () => {
  it("lists the time and every channel value with units", () => {
    expect(formatCursorReadout(3_420, [
      { label: "Presión", unit: "cmH2O", value: 12.345 },
      { label: "Flujo", unit: "L/min", value: Number.NaN },
    ])).toBe("t = 3.42 s · Presión 12.3 cmH2O · Flujo — L/min");
  });
});
