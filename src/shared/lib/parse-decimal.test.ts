/*
* Funcionalidad: es-CO decimal parsing tests
* Descripción: Exhaustive cases of the shared numeric input parser: "," and "." are both the decimal separator ("1.125" and "1,125" are 1.125), thousands separators (several separators, spaces or apostrophes between digits) are rejected, the text is trimmed, an empty text is null, every other text is a typed error (invalid, thousandsSeparator, negative, tooManyDecimals, notInteger) with its Spanish message; the NaN variant for the form models and the es-CO display formatter. Depends on vitest and the parse-decimal module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import {
  DECIMAL_ERROR_MESSAGES,
  DECIMAL_HELPER_TEXT,
  formatDecimal,
  INTEGER_HELPER_TEXT,
  parseDecimal,
  parseDecimalOrNaN,
} from "./parse-decimal";

describe("parseDecimal", () => {
  it.each([
    ["0", 0],
    ["5", 5],
    ["42", 42],
    ["1.5", 1.5],
    ["1,5", 1.5],
    ["1.125", 1.125],
    ["1,125", 1.125],
    ["0,125", 0.125],
    ["1.000", 1],
    ["1,000", 1],
    ["007", 7],
    ["-3", -3],
    ["-0,5", -0.5],
    ["  2,25  ", 2.25],
    ["\t10\n", 10],
  ])("reads %j as %d", (text, value) => {
    expect(parseDecimal(text)).toEqual({ ok: true, value });
  });

  it.each(["", "   ", "\t"])("reads the empty text %j as null", (text) => {
    expect(parseDecimal(text)).toEqual({ ok: true, value: null });
  });

  it.each([
    "1.000.000",
    "1,000,000",
    "1.000,5",
    "1,000.5",
    "1 000",
    "1 000",
    "1 000",
    "1'000",
    "12 345,6",
    "1..5",
    "1,,5",
  ])("rejects the thousands grouping %j", (text) => {
    expect(parseDecimal(text)).toEqual({ ok: false, error: "thousandsSeparator" });
  });

  it.each([
    "abc",
    "1e3",
    "0x10",
    "Infinity",
    "NaN",
    ".5",
    ",5",
    "5.",
    "5,",
    "+5",
    "--5",
    "5-",
    "1,5 kg",
    "½",
    "٣",
  ])("rejects the non-number %j as invalid", (text) => {
    expect(parseDecimal(text)).toEqual({ ok: false, error: "invalid" });
  });

  it("rejects negatives when they are not allowed", () => {
    expect(parseDecimal("-1", { allowNegative: false })).toEqual({ ok: false, error: "negative" });
    expect(parseDecimal("1", { allowNegative: false })).toEqual({ ok: true, value: 1 });
    expect(parseDecimal("-0", { allowNegative: false })).toEqual({ ok: false, error: "negative" });
  });

  it("limits the decimals when asked", () => {
    expect(parseDecimal("2,25", { maxFractionDigits: 2 })).toEqual({ ok: true, value: 2.25 });
    expect(parseDecimal("2.125", { maxFractionDigits: 2 })).toEqual({ ok: false, error: "tooManyDecimals" });
    expect(parseDecimal("2", { maxFractionDigits: 2 })).toEqual({ ok: true, value: 2 });
  });

  it("accepts only whole numbers in integer mode, so a grouped \"1.000\" is never read as 1", () => {
    expect(parseDecimal("300", { integer: true })).toEqual({ ok: true, value: 300 });
    expect(parseDecimal("1.000", { integer: true })).toEqual({ ok: false, error: "notInteger" });
    expect(parseDecimal("1,5", { integer: true })).toEqual({ ok: false, error: "notInteger" });
    expect(parseDecimal("1.000.000", { integer: true })).toEqual({ ok: false, error: "thousandsSeparator" });
    expect(parseDecimal("", { integer: true })).toEqual({ ok: true, value: null });
  });

  it("rejects integers beyond the safe range", () => {
    expect(parseDecimal("99999999999999999999")).toEqual({ ok: false, error: "invalid" });
  });

  it("gives a Spanish message for every error", () => {
    for (const message of Object.values(DECIMAL_ERROR_MESSAGES)) {
      expect(message).toMatch(/\.$/);
    }

    expect(Object.keys(DECIMAL_ERROR_MESSAGES).sort()).toEqual(["invalid", "negative", "notInteger", "thousandsSeparator", "tooManyDecimals"]);
  });
});

describe("parseDecimalOrNaN", () => {
  it("returns the number, or NaN for an empty or invalid text", () => {
    expect(parseDecimalOrNaN("1,125")).toBe(1.125);
    expect(parseDecimalOrNaN("")).toBeNaN();
    expect(parseDecimalOrNaN("1.000.000")).toBeNaN();
    expect(parseDecimalOrNaN("abc")).toBeNaN();
    expect(parseDecimalOrNaN("-2", { allowNegative: false })).toBeNaN();
  });
});

describe("formatDecimal", () => {
  it("writes es-CO decimals without grouping and without float noise", () => {
    expect(formatDecimal(1.5)).toBe("1,5");
    expect(formatDecimal(1234567.25)).toBe("1234567,25");
    expect(formatDecimal(0.7000000000000001)).toBe("0,7");
    expect(formatDecimal(-3)).toBe("-3");
    expect(formatDecimal(2.125, 2)).toBe("2,13");
  });

  it("writes an empty text for a missing value", () => {
    expect(formatDecimal(null)).toBe("");
    expect(formatDecimal(undefined)).toBe("");
    expect(formatDecimal(Number.NaN)).toBe("");
    expect(formatDecimal(Number.POSITIVE_INFINITY)).toBe("");
  });

  it("round trips through parseDecimal", () => {
    for (const value of [0, 1.125, -0.5, 42, 1000]) {
      expect(parseDecimal(formatDecimal(value))).toEqual({ ok: true, value });
    }
  });
});

describe("helper texts", () => {
  it("explains the accepted format in Spanish", () => {
    expect(DECIMAL_HELPER_TEXT).toBe("Usa coma o punto para decimales; sin separador de miles.");
    expect(INTEGER_HELPER_TEXT).toBe("Solo números enteros; sin separador de miles.");
  });
});
