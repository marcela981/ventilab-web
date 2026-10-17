/*
* Funcionalidad: parseNumberInput tests
* Descripción: The number inputs of the settings form accept one decimal separator ("." or ",") and reject several separators, mixed "."/"," and a comma used as thousands grouping ("1,000") instead of coercing them to another number. Depends on vitest and the setting field editor. v1.1 (review): dot thousands grouping ("1.000", "12.500") is rejected too, while "1.5", "1,5", "0.125" and "0,125" stay valid decimals.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { parseNumberInput } from "./setting-field-editor";

describe("parseNumberInput", () => {
  it("reads integers and one decimal separator, dot or comma", () => {
    expect(parseNumberInput("42")).toBe(42);
    expect(parseNumberInput(" 0.7 ")).toBe(0.7);
    expect(parseNumberInput("0,7")).toBe(0.7);
    expect(parseNumberInput("0,125")).toBe(0.125);
    expect(parseNumberInput("-1,5")).toBe(-1.5);
    expect(parseNumberInput("1.5")).toBe(1.5);
    expect(parseNumberInput("1,5")).toBe(1.5);
    expect(parseNumberInput("0.125")).toBe(0.125);
    expect(parseNumberInput("12.25")).toBe(12.25);
  });

  it("rejects empty text, several separators, mixed separators and thousands grouping", () => {
    expect(parseNumberInput("")).toBeNaN();
    expect(parseNumberInput("1.000.000")).toBeNaN();
    expect(parseNumberInput("1,000,000")).toBeNaN();
    expect(parseNumberInput("1.000,5")).toBeNaN();
    expect(parseNumberInput("1,000.5")).toBeNaN();
    expect(parseNumberInput("1,000")).toBeNaN();
    expect(parseNumberInput("12,500")).toBeNaN();
    expect(parseNumberInput("1.000")).toBeNaN();
    expect(parseNumberInput("12.500")).toBeNaN();
    expect(parseNumberInput("-1.000")).toBeNaN();
    expect(parseNumberInput("abc")).toBeNaN();
  });
});
