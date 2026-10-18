/*
* Funcionalidad: Page title helper tests
* Descripción: formatPageTitle appends the application name, joins several sections, skips empty or missing sections and returns the application name alone when nothing is given. Depends on vitest.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { APP_NAME, formatPageTitle } from "./page-title";

describe("formatPageTitle", () => {
  it("appends the application name to one section", () => {
    expect(formatPageTitle("Contenido")).toBe("Contenido | VentyLab");
  });

  it("joins several sections from the most specific to the least", () => {
    expect(formatPageTitle("Ana", "Grupos")).toBe("Ana | Grupos | VentyLab");
  });

  it("skips empty, blank and missing sections and trims the rest", () => {
    expect(formatPageTitle("  Editor de página ", "", null, undefined, "   ")).toBe("Editor de página | VentyLab");
  });

  it("returns the application name alone without sections", () => {
    expect(formatPageTitle()).toBe(APP_NAME);
  });
});
