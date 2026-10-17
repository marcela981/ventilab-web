/*
* Funcionalidad: parseNumberInput tests
* Descripción: The number inputs of the settings form accept one decimal separator ("." or ",") and reject several separators, mixed "."/"," and a comma used as thousands grouping ("1,000") instead of coercing them to another number. Depends on vitest and the setting field editor.
* Versión: 1.0
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
  });

  it("rejects empty text, several separators, mixed separators and thousands grouping", () => {
    expect(parseNumberInput("")).toBeNaN();
    expect(parseNumberInput("1.000.000")).toBeNaN();
    expect(parseNumberInput("1,000,000")).toBeNaN();
    expect(parseNumberInput("1.000,5")).toBeNaN();
    expect(parseNumberInput("1,000.5")).toBeNaN();
    expect(parseNumberInput("1,000")).toBeNaN();
    expect(parseNumberInput("12,500")).toBeNaN();
    expect(parseNumberInput("abc")).toBeNaN();
  });
});
