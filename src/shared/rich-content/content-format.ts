/*
* Funcionalidad: Rich content format detection
* Descripción: Pure helper that classifies lesson content as empty, plain markdown or markdown with math. Math uses the legacy rule (remark-math only recognizes `$`/`$$` delimiters), so content without `$` never downloads KaTeX. No dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export type ContentFormat = "empty" | "markdown" | "markdown-math";

export function detectContentFormat(content: unknown): ContentFormat {
  if (typeof content !== "string" || content.trim() === "") {
    return "empty";
  }

  return content.includes("$") ? "markdown-math" : "markdown";
}
