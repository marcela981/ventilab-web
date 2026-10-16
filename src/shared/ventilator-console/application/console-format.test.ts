/*
* Funcionalidad: Console format tests
* Descripción: Covers the pure helpers of the ventilator console: value formatting with decimals, the I:E ratio and the "—" placeholder for missing values, out-of-range detection against partial ranges, range overrides (default, replaced, disabled with null) and the sparkline path with gaps. Depends on Vitest.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { CONSOLE_METRICS, PATIENT_VITALS } from "./config/console.config";
import { evaluateRange, formatConsoleValue, MISSING_VALUE, resolveNormalRange, sparklinePath } from "./console-format";

describe("formatConsoleValue", () => {
  it("rounds to the configured decimals", () => {
    expect(formatConsoleValue(27.6, CONSOLE_METRICS.peakPressure)).toBe("28");
    expect(formatConsoleValue(6.04, CONSOLE_METRICS.tidalVolumePerKg)).toBe("6.0");
    expect(formatConsoleValue(7.391, PATIENT_VITALS.ph)).toBe("7.39");
  });

  it("shows I:E as 1:x from a Ti/Te ratio", () => {
    expect(formatConsoleValue(0.5, CONSOLE_METRICS.ieRatio)).toBe("1:2.0");
    expect(formatConsoleValue(0.4, CONSOLE_METRICS.ieRatio)).toBe("1:2.5");
    expect(formatConsoleValue(0, CONSOLE_METRICS.ieRatio)).toBe(MISSING_VALUE);
  });

  it("shows a dash when the source does not provide the value", () => {
    expect(MISSING_VALUE).toBe("—");
    expect(formatConsoleValue(null, CONSOLE_METRICS.autoPeep)).toBe("—");
    expect(formatConsoleValue(undefined, CONSOLE_METRICS.autoPeep)).toBe("—");
    expect(formatConsoleValue(Number.NaN, CONSOLE_METRICS.autoPeep)).toBe("—");
  });
});

describe("evaluateRange", () => {
  it("flags values below or above the range and accepts the bounds", () => {
    expect(evaluateRange(3, { min: 4, max: 8 })).toBe("low");
    expect(evaluateRange(9, { min: 4, max: 8 })).toBe("high");
    expect(evaluateRange(4, { min: 4, max: 8 })).toBe("normal");
    expect(evaluateRange(8, { min: 4, max: 8 })).toBe("normal");
  });

  it("checks only the bounds that exist", () => {
    expect(evaluateRange(36, { max: 35 })).toBe("high");
    expect(evaluateRange(-100, { max: 35 })).toBe("normal");
  });

  it("is unknown without a value and normal without a range", () => {
    expect(evaluateRange(null, { max: 35 })).toBe("unknown");
    expect(evaluateRange(Number.POSITIVE_INFINITY, { max: 35 })).toBe("unknown");
    expect(evaluateRange(50, null)).toBe("normal");
  });
});

describe("resolveNormalRange", () => {
  it("uses the default, an override, or none when the override is null", () => {
    expect(resolveNormalRange("plateauPressure", CONSOLE_METRICS, undefined)).toEqual({ max: 30 });
    expect(resolveNormalRange("plateauPressure", CONSOLE_METRICS, { plateauPressure: { max: 28 } })).toEqual({ max: 28 });
    expect(resolveNormalRange("plateauPressure", CONSOLE_METRICS, { plateauPressure: null })).toBeNull();
  });
});

describe("sparklinePath", () => {
  it("maps values to a path scaled to the box with the top for the maximum", () => {
    expect(sparklinePath([0, 5, 10], 100, 20)).toBe("M0.0 20.0 L50.0 10.0 L100.0 0.0");
  });

  it("starts a new subpath after a gap and draws a flat line mid-height", () => {
    expect(sparklinePath([1, Number.NaN, 1], 10, 10)).toBe("M0.0 5.0 M10.0 5.0");
  });

  it("is empty with fewer than two finite points", () => {
    expect(sparklinePath([], 100, 20)).toBe("");
    expect(sparklinePath([3], 100, 20)).toBe("");
  });
});
