/*
* Funcionalidad: Class name joiner tests
* Descripción: Unit tests for cx() from class-names.ts. Depends on Vitest.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { cx } from "./class-names";

describe("cx", () => {
  it("joins every truthy class name with a single space", () => {
    expect(cx("card", "card--active")).toBe("card card--active");
  });

  it("skips false, null, undefined and empty strings", () => {
    const isActive = false;

    expect(cx("card", isActive && "card--active", null, undefined, "", "card--wide")).toBe("card card--wide");
  });

  it("returns an empty string when nothing is truthy", () => {
    expect(cx(false, null, undefined)).toBe("");
  });
});
