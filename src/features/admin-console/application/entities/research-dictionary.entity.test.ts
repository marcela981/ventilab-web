/*
* Funcionalidad: Research dictionary tests
* Descripción: The CSV of the research export data dictionary: Spanish header, one quoted row per column in file order, doubled inner quotes, an empty example for a null one, and a leading =, +, - or @ neutralised so a spreadsheet never evaluates it. Depends on vitest and the research dictionary entity.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { csvCell, researchDictionaryCsv } from "./research-dictionary.entity";

describe("research dictionary CSV", () => {
  it("writes the header and one quoted row per column", () => {
    expect(researchDictionaryCsv([
      { column: "participant", type: "string", description: "Seudónimo", example: "a1" },
      { column: "value", type: "number", description: "Valor \"medido\"", example: null },
    ])).toBe("\"columna\",\"tipo\",\"descripcion\",\"ejemplo\"\r\n\"participant\",\"string\",\"Seudónimo\",\"a1\"\r\n\"value\",\"number\",\"Valor \"\"medido\"\"\",\"\"\r\n");
  });

  it("neutralises values that a spreadsheet would read as a formula", () => {
    expect(csvCell("=SUM(A1)")).toBe("\"'=SUM(A1)\"");
    expect(csvCell("-3")).toBe("\"'-3\"");
    expect(csvCell("normal")).toBe("\"normal\"");
  });
});
