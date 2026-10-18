/*
* Funcionalidad: Research export data dictionary
* Descripción: Column model of the research export data dictionary (`GET /api/analytics/research/export/dictionary`: column name, value type, Spanish description and an example, in file order) and its CSV form for "Descargar diccionario de datos": a header row (columna, tipo, descripcion, ejemplo) and one row per column, every cell quoted with doubled inner quotes and a leading =, +, - or @ neutralised with an apostrophe so a spreadsheet never runs it as a formula. No dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export type ResearchColumn = {
  column: string
  type: "string" | "number"
  description: string
  example: string | null
};

export const RESEARCH_DICTIONARY_HEADER = ["columna", "tipo", "descripcion", "ejemplo"] as const;

const FORMULA_START = /^[=+\-@]/;

export function csvCell(value: string): string {
  const safe = FORMULA_START.test(value) ? `'${value}` : value;

  return `"${safe.replace(/"/g, "\"\"")}"`;
}

export function researchDictionaryCsv(columns: readonly ResearchColumn[]): string {
  const rows = [
    RESEARCH_DICTIONARY_HEADER.map(csvCell).join(","),
    ...columns.map((item) => [item.column, item.type, item.description, item.example ?? ""].map(csvCell).join(",")),
  ];

  return `${rows.join("\r\n")}\r\n`;
}
